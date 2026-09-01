/**
 * POST /api/calcom/webhook
 *
 * Cal.com → here on booking events. Signature-verified, idempotent.
 * Handles: BOOKING_PAID, BOOKING_CREATED, BOOKING_CANCELLED
 *
 * This replaces /api/calendly/webhook. That route is left in place, untouched,
 * so the cutover is a Cal.com/Calendly webhook-subscription change rather than
 * a code revert if we have to fall back.
 *
 * On BOOKING_PAID we:
 *   1. Resolve the Payment row by the Stripe PaymentIntent id Cal.com sends in
 *      `payment[0].externalId` — the same value the Stripe handler stores as
 *      "Stripe Session ID". Falls back to an email match for bookings with no
 *      payment object, and self-heals by creating the row from this payload if
 *      the Stripe handler never wrote one.
 *   2. Look up the Intake row by attendee email (best-effort)
 *   3. Create a Session row in "Prep" state, linked to the Payment + Intake,
 *      with the Cal.com booking uid stored for later cancellation lookups.
 *
 * On BOOKING_CANCELLED we:
 *   1. Look up the Session row by that stored booking uid
 *   2. Decide Canceled vs. Rescheduled — Cal.com cancels the OLD booking when
 *      someone reschedules, same as Calendly did
 *   3. Transition the Session's State accordingly. Sessions already in "Sent"
 *      state are left alone — once delivered, the relationship outcome is
 *      orthogonal to a calendar event change.
 *
 * WHY BOOKING_PAID IS THE CREATE TRIGGER, NOT BOOKING_CREATED
 * Every TCH call is a paid event, and Cal.com fires BOTH triggers for one paid
 * booking: BOOKING_CREATED when the slot is held, BOOKING_PAID once Stripe
 * confirms. Acting on both would race two createSession calls against each
 * other for the same booking. `createSession` dedupes on the Linked Payment
 * relation so we'd probably survive it, but "probably" is not a booking
 * pipeline — so BOOKING_PAID is authoritative and BOOKING_CREATED is
 * ack-and-ignored. BOOKING_PAID also carries the guarantee we actually want:
 * money moved, therefore a Payment row exists (or is about to).
 *
 * RACE WITH STRIPE — and why this handler no longer depends on winning it.
 * Cal.com's BOOKING_PAID and our Stripe payment_intent.succeeded handler fire
 * roughly in parallel, and Notion takes a few seconds to make a brand-new page
 * queryable. The old design waited ~17s for Stripe's row to appear and gave up
 * if it never did. That turned any Stripe-side failure into a silently dropped
 * paid booking — which is exactly what happened on the first real Cal.com
 * booking (2026-08-31): Cal.com's Stripe integration does not set
 * `receipt_email`, our Stripe handler skipped the write for want of an address,
 * and this route then searched by that same address for 17s and found nothing.
 * Both webhooks returned 200. See extractStripePaymentIntentId for the detail.
 *
 * Now: match on the PaymentIntent id instead of an email, retry only ~5s for
 * Notion's index lag, then CREATE the Payments row from this payload if it is
 * still missing. Both handlers key on the same `pi_…` and createPaymentRecord
 * dedupes on it, so whoever lands second adopts the existing row. Neither
 * handler can lose a paid booking because the other one failed.
 *
 * Idempotency: createSession dedupes on the Linked Payment relation, so retries
 * or duplicate Cal.com deliveries return the existing Session page id without
 * creating a second row. The cancel handler is idempotent because writing the
 * same State value twice is a no-op. Note that Cal.com's signature has no
 * timestamp component (unlike Calendly's), so there is no replay window to
 * enforce — this idempotency is the only replay defense.
 *
 * Webhook setup:
 *   Cal.com → Settings → Developer → Webhooks → New
 *     Subscriber URL: https://<deployed-domain>/api/calcom/webhook
 *     Event triggers: Booking Paid, Booking Created, Booking Cancelled
 *     Secret: <choose a string, mirror to CALCOM_WEBHOOK_SECRET in Vercel>
 *
 * Calendly → Cal.com migration, 2026-08-31.
 */

import { NextResponse } from "next/server";
import {
  constructCalcomEvent,
  extractPhoneFromBooking,
  extractStripePaymentIntentId,
  bookingToPaymentInput,
  bookingToSessionInput,
  bookingKey,
} from "@/lib/services/calcom-webhook";
import {
  createPaymentRecord,
  findPaymentByEmail,
  findPaymentByStripeSessionId,
} from "@/lib/services/notion-payments-write";
import { findIntakeIdByEmail } from "@/lib/services/notion-intake-read";
import {
  createSession,
  updateSessionState,
} from "@/lib/services/notion-sessions-write";
import {
  findSessionByCalendlyEventUri,
  getSessionById,
} from "@/lib/services/notion-sessions-read";
import {
  findContactByEmail,
  findContactByPhone,
  normalizePhoneE164,
  upsertContactByPhone,
} from "@/lib/services/notion-messaging";
import {
  isLateBooking,
  processSession,
} from "@/lib/email/frankie-followups";
import { config } from "@/lib/config";
import { sendSms } from "@/lib/services/twilio";

// Cal.com needs the raw, un-parsed body to verify the signature.
export const runtime = "nodejs";
// The Payment-lookup retry loop can wait up to ~17s for Notion to make the
// freshly-created Payment row queryable; give the function room beyond that.
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Raw text BEFORE any parsing — the HMAC is over the exact bytes Cal.com
  // sent, and request.json() would discard them.
  const rawBody = await request.text();
  const signature = request.headers.get("x-cal-signature-256");

  let event;
  try {
    event = constructCalcomEvent(rawBody, signature);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown signature error";
    // 400 → Cal.com will not retry signature failures (correct behavior;
    // signature mismatches don't auto-resolve). Logged for visibility.
    console.warn(`[calcom-webhook] signature failure: ${message}`);
    return NextResponse.json(
      { error: "signature_verification_failed", message },
      { status: 400 },
    );
  }

  try {
    const p = event.payload;

    // -------- BOOKING_CANCELLED --------
    // Cal.com fires this on real cancellations AND on the OLD booking when an
    // attendee reschedules (the NEW booking arrives separately as its own
    // BOOKING_CREATED / BOOKING_PAID pair).
    if (event.triggerEvent === "BOOKING_CANCELLED") {
      const bookingUid = p.uid ?? "";
      if (!bookingUid) {
        console.warn(`[calcom-webhook] BOOKING_CANCELLED missing payload.uid`);
        return NextResponse.json({
          received: true,
          skipped: "no_booking_uid",
        });
      }
      // Reminder: the Notion property is still named "Calendly Event URI".
      // It's a stable per-booking key, and it now holds Cal.com uids. See the
      // comment on bookingToSessionInput.
      const session = await findSessionByCalendlyEventUri(bookingKey(bookingUid));
      if (!session) {
        // No Session has this uid — likely a Calendly-era booking, or one
        // promoted manually without a booking key.
        console.warn(
          `[calcom-webhook] BOOKING_CANCELLED: no Session row with booking uid=${bookingUid}`,
        );
        return NextResponse.json({
          received: true,
          skipped: "no_session_for_booking_uid",
          booking_uid: bookingUid,
        });
      }
      // Once the action plan has been delivered, the calendar state is no
      // longer relevant — leave Sent alone.
      if (session.state === "Sent") {
        console.log(
          `[calcom-webhook] BOOKING_CANCELLED: session ${session.id} already Sent — not transitioning`,
        );
        return NextResponse.json({
          received: true,
          session_page_id: session.id,
          skipped: "already_sent",
        });
      }
      // Cal.com signals a reschedule two ways depending on version/flow:
      // `rescheduled: true` on the cancelled booking, or a `rescheduleUid`
      // pointing at the replacement. Treat either as "moved, not gone" so the
      // old Session lands in Rescheduled and the new booking opens a fresh Prep.
      const isReschedule = Boolean(p.rescheduled || p.rescheduleUid);
      const newState = isReschedule ? "Rescheduled" : "Canceled";
      await updateSessionState(session.id, newState);
      console.log(
        `[calcom-webhook] BOOKING_CANCELLED → session ${session.id} → ${newState}` +
          (p.cancellationReason ? ` (reason: ${p.cancellationReason})` : ""),
      );
      return NextResponse.json({
        received: true,
        session_page_id: session.id,
        previous_state: session.state,
        new_state: newState,
      });
    }

    // -------- BOOKING_CREATED --------
    // Ack and ignore. Every TCH call is paid, so BOOKING_CREATED is always
    // followed by BOOKING_PAID for the same booking — acting on both would
    // double-create. BOOKING_PAID is the authoritative create trigger; see the
    // file header for the full reasoning. (If TCH ever adds a genuinely free
    // event type, THIS is the branch that has to grow a create path, gated on
    // the event-type slug — not a second handler.)
    if (event.triggerEvent === "BOOKING_CREATED") {
      console.log(
        `[calcom-webhook] BOOKING_CREATED acked and ignored (awaiting BOOKING_PAID); uid=${p.uid ?? "none"}`,
      );
      return NextResponse.json({
        received: true,
        ignored: "BOOKING_CREATED",
        reason: "awaiting_booking_paid",
      });
    }

    if (event.triggerEvent !== "BOOKING_PAID") {
      // Ack other trigger types so Cal.com stops retrying.
      return NextResponse.json({ received: true, ignored: event.triggerEvent });
    }

    // ---- BOOKING_PAID: the create path ----
    // Note: don't normalize case here — match the existing findIntakeIdByEmail
    // and Stripe write paths (both pass the raw email to Notion). Notion's
    // email-property equals filter is case-insensitive server-side, so this
    // stays consistent with the rest of the V2 pipeline.
    const email = p.attendees?.[0]?.email?.trim() ?? "";
    if (!email) {
      console.warn(
        `[calcom-webhook] BOOKING_PAID missing attendee email; uid=${p.uid ?? "none"}`,
      );
      return NextResponse.json({ received: true, skipped: "no_email" });
    }

    /*
     * Resolve the Payments row.
     *
     * PRIMARY: join on the Stripe PaymentIntent id that Cal.com hands us in
     * `payment[0].externalId`. That is the same value the Stripe handler writes
     * into "Stripe Session ID", so it is an exact key match rather than a guess.
     *
     * FALLBACK: match on email, for bookings with no payment object at all
     * (org-internal / free event types), preserving the old behaviour there.
     *
     * SELF-HEAL: if the row still isn't there, create it from this payload.
     * BOOKING_PAID is proof Stripe took the money, so a missing Payments row
     * means our Stripe handler failed or lagged — not that the booking is
     * unpaid. Dropping a paid booking because a sibling webhook misfired is the
     * failure this whole block exists to prevent.
     *
     * The short retry before self-healing is for Notion's index lag, not for
     * Stripe: a page created seconds ago isn't instantly queryable. It is ~5s
     * now rather than the old ~17s because we no longer need to WAIT for the
     * Stripe path to succeed — we can finish the job ourselves. Creating a row
     * Stripe also creates is harmless: both paths key on the same `pi_…` and
     * `createPaymentRecord` dedupes, so the loser of the race adopts the
     * winner's page rather than making a second one.
     */
    const stripePaymentIntentId = extractStripePaymentIntentId(p);

    const lookupPayment = async (): Promise<string | null> =>
      stripePaymentIntentId
        ? findPaymentByStripeSessionId(stripePaymentIntentId)
        : findPaymentByEmail(email);

    let paymentPageId = await lookupPayment();
    if (!paymentPageId) {
      for (const delay of [2000, 3000]) {
        await new Promise((r) => setTimeout(r, delay));
        paymentPageId = await lookupPayment();
        if (paymentPageId) break;
      }
    }

    let paymentSelfHealed = false;
    if (!paymentPageId) {
      const paymentInput = bookingToPaymentInput(event);
      if (paymentInput) {
        // Not wrapped in try/catch on purpose: if we cannot record the payment
        // we must not go on to create a Session that references nothing. Let it
        // fall through to the outer catch → 500 → Cal.com retries with backoff.
        const created = await createPaymentRecord(paymentInput);
        paymentPageId = created.pageId;
        paymentSelfHealed = created.created;
        console.warn(
          `[calcom-webhook] no Payments row for pi=${stripePaymentIntentId ?? "none"} ` +
            `email=${email}; self-healed from BOOKING_PAID → ${created.created ? "created" : "adopted"} ${created.pageId}. ` +
            `Check the Stripe handler — it should normally win this race.`,
        );
      }
    }

    if (!paymentPageId) {
      // No Payments row and not enough in the payload to build one — i.e. a
      // booking with no Stripe payment attached. Ack so Cal.com doesn't retry;
      // manual Promote from Morning Prep is the fallback.
      console.warn(
        `[calcom-webhook] no Payment row and no usable payment payload for email=${email}; ` +
          `will not auto-create Session`,
      );
      return NextResponse.json({
        received: true,
        skipped: "no_payment_for_booking",
        email,
      });
    }

    // Best-effort Intake link. Missing Intake is fine — the Sessions writer
    // accepts undefined.
    const intakePageId = (await findIntakeIdByEmail(email)) ?? undefined;

    const sessionInput = bookingToSessionInput(
      event,
      paymentPageId,
      intakePageId,
    );
    // Deliberately NOT wrapped in try/catch: a failed Session create is the one
    // failure in this handler that must surface. It falls through to the outer
    // catch → 500 → Cal.com retries with backoff, and the createSession dedupe
    // makes that retry safe. Swallowing it would silently lose a paid booking.
    const result = await createSession(sessionInput);

    console.log(
      `[calcom-webhook] BOOKING_PAID → notion ${result.created ? "created" : "deduped"} session ${result.pageId} for ${email}` +
        (intakePageId ? ` (intake linked)` : ` (no intake)`) +
        (paymentSelfHealed ? ` (payment self-healed)` : ``),
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
      const rawPhone = extractPhoneFromBooking(p);
      const phoneE164 = normalizePhoneE164(rawPhone ?? "");
      // Try phone first (most reliable connector if Cal.com captured it),
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
          complianceNote: `Booked via Cal.com (session ${result.pageId})`,
        });
        console.log(
          `[calcom-webhook] linked Messaging Contact ${contact.id} as booked`,
        );
      } else if (phoneE164) {
        // No existing contact but Cal.com captured a phone — create one so
        // future SMS touchpoints find them. Skip drip enrollment (they're
        // already paid customers).
        await upsertContactByPhone({
          phone: phoneE164,
          email,
          status: "active",
          dripStage: "completed",
          source: "referral", // booked without inbound SMS — likely web/email
          addTags: ["booked"],
          complianceNote: `Created from Cal.com booking (session ${result.pageId})`,
        });
        console.log(
          `[calcom-webhook] created Messaging Contact for ${phoneE164}`,
        );
      }

      // Intake-link SMS backup — the confirmation email can land in spam, so
      // text the intake link too (Megha 2026-05-21). Only fires when Cal.com
      // captured a phone (the consent-gated phone field on the booking form)
      // AND this is a freshly-created session, so webhook retries don't re-text.
      if (result.created && phoneE164) {
        const intakeUrl = config.frankieEmails.tallyUrl;
        const sms = await sendSms({
          to: phoneE164,
          body:
            "Frankie here from The Creative Hotline ☎️ Your call's booked. " +
            "One thing left — fill out your intake (about 8 min): " +
            `${intakeUrl} · Reply STOP to opt out.`,
        });
        console.log(
          `[calcom-webhook] intake-link SMS to ${phoneE164}: ${sms.ok ? "sent" : "skipped (" + sms.error + ")"}`,
        );
      }
    } catch (err) {
      // CRM sync failure / SMS must NEVER block the booking flow.
      console.warn("[calcom-webhook] Messaging Contact sync / intake SMS failed:", err);
    }

    // ---- Late-booking inline Frankie #2/#3 ----
    // The nightly cron at 23:00 UTC won't help anyone whose call lands inside
    // that window. Fire the intake-nudge + caller-prep here for late bookings
    // so a same-day booking still gets the prep emails. Idempotent — if the
    // cron then runs after the call, the checkbox guards short-circuit.
    //
    // AWAITED, not fire-and-forget — Vercel serverless terminates pending
    // promises on response return. Tested cost: ~2-4s for two SendGrid calls
    // + 2 Notion fetches + 2 checkbox writes. Still well inside the 30s webhook
    // timeout. Errors are caught and logged so a failed nudge doesn't 500 the
    // booking ack (Cal.com would otherwise retry, creating duplicates / triple-
    // firing emails).
    if (result.created && isLateBooking(sessionInput.scheduledAt, new Date())) {
      try {
        const sessionRecord = await getSessionById(result.pageId);
        if (sessionRecord) {
          const { result: fr, skipped: sk } = await processSession(
            sessionRecord,
            new Date(),
          );
          console.log(
            `[calcom-webhook] late-booking inline fire: session=${result.pageId} ${fr ? `intakeNudge=${fr.intakeNudge?.ok} callerPrep=${fr.callerPrep?.ok}` : `skipped=${sk?.reason}`}`,
          );
        } else {
          console.warn(
            `[calcom-webhook] late-booking inline fire: getSessionById returned null for ${result.pageId}`,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        console.error(
          `[calcom-webhook] late-booking inline fire failed: ${message}`,
        );
      }
    }

    return NextResponse.json({
      received: true,
      session_page_id: result.pageId,
      created: result.created,
      payment_page_id: paymentPageId,
      payment_self_healed: paymentSelfHealed,
      stripe_payment_intent_id: stripePaymentIntentId,
      intake_page_id: intakePageId ?? null,
      scheduled_at: sessionInput.scheduledAt,
      booking_uid: p.uid ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown handler error";
    console.error(`[calcom-webhook] handler error: ${message}`);
    // 500 → Cal.com retries with backoff. Use this for transient failures
    // (Notion API blip) so we don't lose the booking event.
    return NextResponse.json(
      { error: "handler_failed", message },
      { status: 500 },
    );
  }
}
