/**
 * POST /api/stripe/webhook
 *
 * Stripe → here on payment events. Signature-verified, idempotent.
 * Handles: checkout.session.completed
 *
 * On success: lands a Payments DB row in Notion with status
 * "Paid - Needs Booking", including any redeemed promo code (referral tracking).
 *
 * Stripe webhook setup:
 *   1. Stripe Dashboard → Developers → Webhooks → Add endpoint
 *   2. URL: https://<deployed-domain>/api/stripe/webhook
 *   3. Events: checkout.session.completed
 *   4. Copy signing secret → STRIPE_WEBHOOK_SECRET env var in Vercel
 *
 * V2 Batch 1.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  checkoutSessionToPaymentInput,
  constructWebhookEvent,
} from "@/lib/services/stripe-webhook";
import { createPaymentRecord } from "@/lib/services/notion-payments-write";
import { sendConfirmationFromStripeSession } from "@/lib/email/send-frankie";

// Stripe needs the raw, un-parsed body to verify the signature.
// Next.js App Router gives us `request.text()` which preserves the raw bytes.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown signature error";
    // 400 → Stripe will retry, but only for transient errors. Signature
    // mismatches won't auto-resolve, so this is fine for visibility.
    return NextResponse.json(
      { error: "signature_verification_failed", message },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const input = await checkoutSessionToPaymentInput(session);
        if (!input.email) {
          // Without an email we can't create a usable Payments row. Log and ack
          // — no point in Stripe retrying.
          console.warn(
            `[stripe-webhook] checkout.session.completed missing email; session=${session.id}`,
          );
          return NextResponse.json({ received: true, skipped: "no_email" });
        }
        const result = await createPaymentRecord(input);
        console.log(
          `[stripe-webhook] checkout.session.completed → notion ${result.created ? "created" : "deduped"} ${result.pageId} for ${input.email}`,
        );

        // Frankie confirmation email — fire-and-log only on NEW payments
        // (don't re-email on retries that hit the idempotency dedup path).
        // Gated by ENABLE_FRANKIE_EMAILS env var. Never throws.
        let emailStatus: { ok: boolean; reason?: string } = { ok: false, reason: "skipped_dedup" };
        if (result.created) {
          emailStatus = await sendConfirmationFromStripeSession(session, input.product);
          console.log(
            `[stripe-webhook] frankie confirmation: ok=${emailStatus.ok}${emailStatus.reason ? ` reason=${emailStatus.reason}` : ""}`,
          );
        }

        return NextResponse.json({
          received: true,
          notion_page_id: result.pageId,
          created: result.created,
          email_sent: emailStatus.ok,
          email_reason: emailStatus.reason,
        });
      }

      default:
        // Acknowledge unhandled events so Stripe stops retrying.
        return NextResponse.json({ received: true, ignored: event.type });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown handler error";
    console.error(`[stripe-webhook] handler error: ${message}`);
    // 500 → Stripe will retry with exponential backoff. Use this for transient
    // failures (Notion API blip, etc.) so we don't lose the event.
    return NextResponse.json(
      { error: "handler_failed", message },
      { status: 500 },
    );
  }
}
