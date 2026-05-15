/**
 * POST /api/calendly/webhook
 *
 * Calendly → here on booking events. Signature-verified, idempotent.
 * Handles: invitee.created, invitee.canceled
 *
 * On invitee.created we:
 *   1. Look up the Payment row by invitee email (stable cross-source key)
 *   2. Look up the Intake row by the same email (best-effort)
 *   3. Create a Session row in "Prep" state, linked to the Payment + Intake,
 *      with the Calendly event URI stored for later cancellation lookups.
 *
 * On invitee.canceled we:
 *   1. Look up the Session row by stored Calendly Event URI
 *   2. Decide Canceled vs. Rescheduled based on payload.rescheduled (Calendly
 *      sends invitee.canceled on the OLD booking when someone reschedules)
 *   3. Transition the Session's State accordingly. Sessions already in "Sent"
 *      state are left alone — once delivered, the relationship outcome is
 *      orthogonal to a calendar event change.
 *
 * Race condition with Stripe: Calendly fires invitee.created and Stripe fires
 * payment_intent.succeeded roughly in parallel. If Calendly hits this handler
 * before Stripe has finished writing the Payment row, the lookup misses. To
 * handle that, we retry the Payment lookup once after a short delay (well
 * inside Calendly's 30s webhook timeout). If still no Payment after the retry,
 * we ack-and-skip — manual Promote from the Morning Prep dashboard remains the
 * fallback.
 *
 * Idempotency: createSession dedupes on Linked Payment relation, so retries
 * or duplicate Calendly deliveries return the existing Session page id without
 * creating a second row. Canceled handler is idempotent because writing the
 * same State value twice is a no-op.
 *
 * Webhook setup:
 *   1. POST https://api.calendly.com/webhook_subscriptions with:
 *        url: https://<deployed-domain>/api/calendly/webhook
 *        events: ["invitee.created", "invitee.canceled"]
 *        signing_key: <choose a string, mirror to CALENDLY_WEBHOOK_SECRET>
 *   2. Add CALENDLY_WEBHOOK_SECRET to Vercel project env (same value).
 *
 * V2 Batch 3c (Calendly auto-link).
 * V2 cancel-handler — added 2026-05-15 evening.
 */

import { NextResponse } from "next/server";
import {
  constructCalendlyEvent,
  extractPhoneFromQA,
  inviteeCreatedToSessionInput,
  type CalendlyInviteeCreatedPayload,
  type CalendlyInviteeCanceledPayload,
} from "@/lib/services/calendly-webhook";
import { findPaymentByEmail } from "@/lib/services/notion-payments-write";
import { findIntakeIdByEmail } from "@/lib/services/notion-intake-read";
import {
  createSession,
  updateSessionState,
} from "@/lib/services/notion-sessions-write";
import { findSessionByCalendlyEventUri } from "@/lib/services/notion-sessions-read";
import {
  findContactByEmail,
  findContactByPhone,
  normalizePhoneE164,
  upsertContactByPhone,
} from "@/lib/services/notion-messaging";

// Calendly needs the raw, un-parsed body to verify the signature.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("calendly-webhook-signature");

  let event;
  try {
    event = constructCalendlyEvent(rawBody, signature);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown signature error";
    // 400 → Calendly will not retry signature failures (correct behavior;
    // signature mismatches don't auto-resolve). Logged for visibility.
    console.warn(`[calendly-webhook] signature failure: ${message}`);
    return NextResponse.json(
      { error: "signature_verification_failed", message },
      { status: 400 },
    );
  }

  try {
    // -------- invitee.canceled --------
    // Calendly fires this on real cancellations AND on the OLD booking when
    // an invitee reschedules (the NEW booking arrives separately as
    // invitee.created with rescheduled=true on the payload).
    if (event.event === "invitee.canceled") {
      const canceled = event as CalendlyInviteeCanceledPayload;
      const eventUri = canceled.payload?.scheduled_event?.uri ?? "";
      if (!eventUri) {
        console.warn(
          `[calendly-webhook] invitee.canceled missing scheduled_event.uri`,
        );
        return NextResponse.json({
          received: true,
          skipped: "no_event_uri",
        });
      }
      const session = await findSessionByCalendlyEventUri(eventUri);
      if (!session) {
        // No Session has this URI — likely a booking that pre-dates the
        // Calendly Event URI field, or one promoted manually without it.
        console.warn(
          `[calendly-webhook] invitee.canceled: no Session row with Calendly Event URI=${eventUri}`,
        );
        return NextResponse.json({
          received: true,
          skipped: "no_session_for_event_uri",
          event_uri: eventUri,
        });
      }
      // Once the action plan has been delivered, the calendar state is no
      // longer relevant — leave Sent alone.
      if (session.state === "Sent") {
        console.log(
          `[calendly-webhook] invitee.canceled: session ${session.id} already Sent — not transitioning`,
        );
        return NextResponse.json({
          received: true,
          session_page_id: session.id,
          skipped: "already_sent",
        });
      }
      const newState = canceled.payload?.rescheduled
        ? "Rescheduled"
        : "Canceled";
      await updateSessionState(session.id, newState);
      console.log(
        `[calendly-webhook] invitee.canceled → session ${session.id} → ${newState}`,
      );
      return NextResponse.json({
        received: true,
        session_page_id: session.id,
        previous_state: session.state,
        new_state: newState,
      });
    }

    if (event.event !== "invitee.created") {
      // Ack other event types so Calendly stops retrying.
      return NextResponse.json({ received: true, ignored: event.event });
    }

    // After the early-return above we know event.event === "invitee.created",
    // but the union type from constructCalendlyEvent doesn't narrow cleanly
    // because it has a catchall member. Cast to the specific shape — the
    // discriminant check is what makes it safe.
    const inviteeEvent = event as CalendlyInviteeCreatedPayload;
    const inv = inviteeEvent.payload;
    // Note: don't normalize case here — match existing findIntakeIdByEmail
    // and Stripe write paths (both pass the raw email to Notion). Notion's
    // email-property equals filter is case-insensitive server-side, so this
    // stays consistent with the rest of the V2 pipeline.
    const email = inv.email?.trim() ?? "";
    if (!email) {
      console.warn(
        `[calendly-webhook] invitee.created missing email; uri=${inv.uri}`,
      );
      return NextResponse.json({ received: true, skipped: "no_email" });
    }

    // First lookup. If Stripe's webhook has already landed (typical case),
    // this returns the Payment page ID and we proceed immediately.
    let paymentPageId = await findPaymentByEmail(email);
    if (!paymentPageId) {
      // Race-window retry. Wait briefly to give Stripe's payment_intent.succeeded
      // handler time to write the Payment row, then try once more. Worst-case
      // adds ~3s of latency on the rare miss; well inside Calendly's 30s
      // webhook timeout.
      await new Promise((r) => setTimeout(r, 3000));
      paymentPageId = await findPaymentByEmail(email);
    }
    if (!paymentPageId) {
      // Still no Payment after retry. Likely an org-internal booking with no
      // Stripe payment, OR the Stripe path is broken/lagging. Ack so Calendly
      // doesn't retry — manual Promote from Morning Prep is the fallback.
      console.warn(
        `[calendly-webhook] no Payment row for email=${email} after retry; will not auto-create Session`,
      );
      return NextResponse.json({
        received: true,
        skipped: "no_payment_for_email",
        email,
      });
    }

    // Best-effort Intake link. Missing Intake is fine — Sessions writer
    // accepts undefined.
    const intakePageId = (await findIntakeIdByEmail(email)) ?? undefined;

    const sessionInput = inviteeCreatedToSessionInput(
      inviteeEvent,
      paymentPageId,
      intakePageId,
    );
    const result = await createSession(sessionInput);

    console.log(
      `[calendly-webhook] invitee.created → notion ${result.created ? "created" : "deduped"} session ${result.pageId} for ${email}` +
        (intakePageId ? ` (intake linked)` : ` (no intake)`),
    );

    // Cross-flow connection: mark the Messaging Contact (if any) as booked.
    // This closes the loop between SMS marketing → actual booking. The contact
    // gets "booked" tag + Drip Stage = "completed", so the drip cron stops
    // nudging them.
    //
    // AWAITED, not fire-and-forget — Vercel serverless terminates the
    // invocation when the response returns, killing any pending promises.
    // CRM failure still doesn't block the response: we catch and log.
    try {
      const rawPhone = extractPhoneFromQA(inv);
      const phoneE164 = normalizePhoneE164(rawPhone);
      // Try phone first (most reliable connector if Calendly captured it),
      // then fall back to email.
      let contact = phoneE164 ? await findContactByPhone(phoneE164) : null;
      if (!contact) {
        contact = await findContactByEmail(email);
      }
      if (contact) {
        await upsertContactByPhone({
          phone: contact.phone,
          email,
          addTags: ["booked"],
          dripStage: "completed",
          complianceNote: `Booked via Calendly (session ${result.pageId})`,
        });
        console.log(
          `[calendly-webhook] linked Messaging Contact ${contact.id} as booked`,
        );
      } else if (phoneE164) {
        // No existing contact but Calendly captured a phone — create one so
        // future SMS touchpoints find them. Skip drip enrollment (they're
        // already paid customers).
        await upsertContactByPhone({
          phone: phoneE164,
          email,
          status: "active",
          dripStage: "completed",
          source: "referral", // booked without inbound SMS — likely web/email
          addTags: ["booked"],
          complianceNote: `Created from Calendly booking (session ${result.pageId})`,
        });
        console.log(
          `[calendly-webhook] created Messaging Contact for ${phoneE164}`,
        );
      }
    } catch (err) {
      // CRM sync failure must NEVER block the booking flow.
      console.warn("[calendly-webhook] Messaging Contact sync failed:", err);
    }

    return NextResponse.json({
      received: true,
      session_page_id: result.pageId,
      created: result.created,
      payment_page_id: paymentPageId,
      intake_page_id: intakePageId ?? null,
      scheduled_at: sessionInput.scheduledAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown handler error";
    console.error(`[calendly-webhook] handler error: ${message}`);
    // 500 → Calendly retries with backoff. Use this for transient failures
    // (Notion API blip) so we don't lose the booking event.
    return NextResponse.json(
      { error: "handler_failed", message },
      { status: 500 },
    );
  }
}
