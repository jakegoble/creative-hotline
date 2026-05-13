/**
 * POST /api/calendly/webhook
 *
 * Calendly → here on booking events. Signature-verified, idempotent.
 * Handles: invitee.created
 *
 * On invitee.created we:
 *   1. Look up the Payment row by invitee email (stable cross-source key)
 *   2. Look up the Intake row by the same email (best-effort)
 *   3. Create a Session row in "Prep" state, linked to the Payment + Intake
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
 * creating a second row.
 *
 * Webhook setup:
 *   1. POST https://api.calendly.com/webhook_subscriptions with:
 *        url: https://<deployed-domain>/api/calendly/webhook
 *        events: ["invitee.created"]
 *        signing_key: <choose a string, mirror to CALENDLY_WEBHOOK_SECRET>
 *   2. Add CALENDLY_WEBHOOK_SECRET to Vercel project env (same value).
 *
 * V2 Batch 3c (Calendly auto-link).
 */

import { NextResponse } from "next/server";
import {
  constructCalendlyEvent,
  inviteeCreatedToSessionInput,
} from "@/lib/services/calendly-webhook";
import { findPaymentByEmail } from "@/lib/services/notion-payments-write";
import { findIntakeIdByEmail } from "@/lib/services/notion-intake-read";
import { createSession } from "@/lib/services/notion-sessions-write";

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
    if (event.event !== "invitee.created") {
      // Ack other event types so Calendly stops retrying.
      return NextResponse.json({ received: true, ignored: event.event });
    }

    const inv = event.payload;
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
      event,
      paymentPageId,
      intakePageId,
    );
    const result = await createSession(sessionInput);

    console.log(
      `[calendly-webhook] invitee.created → notion ${result.created ? "created" : "deduped"} session ${result.pageId} for ${email}` +
        (intakePageId ? ` (intake linked)` : ` (no intake)`),
    );

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
