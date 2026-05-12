/**
 * Wire-up: send Frankie's onboarding emails from Stripe webhook events.
 *
 * Gated by `ENABLE_FRANKIE_EMAILS` env var (off by default). When SendGrid
 * sender verification clears + sender is added in SendGrid, flip the env var
 * to "true" to start sending.
 *
 * The Stripe webhook calls `sendConfirmationFromStripeSession()` after the
 * Notion Payments row lands. Failures here NEVER bubble up — webhook always
 * 200s even if email send blows up, so Stripe doesn't retry the whole event.
 *
 * V2 Batch 2.
 */

import type Stripe from "stripe";
import { config } from "../config";
import { confirmationEmail, type ConfirmationInput } from "./templates/frankie";
import { sendEmail } from "../services/email";
import type { ProductPurchased } from "../v2-types";

/**
 * Build the per-client confirmation email inputs from a Stripe checkout session
 * + the mapped product, then send it via Frankie.
 *
 * Returns ok=true on send, or with a reason describing why we skipped.
 * Never throws.
 */
export async function sendConfirmationFromStripeSession(
  session: Stripe.Checkout.Session,
  mappedProduct: ProductPurchased | undefined,
): Promise<{ ok: boolean; reason?: string }> {
  // Hard gate — don't even attempt sends until explicitly enabled.
  if (!config.frankieEmails.enabled) {
    return { ok: false, reason: "frankie_disabled" };
  }

  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) {
    return { ok: false, reason: "no_recipient_email" };
  }

  // First name — prefer customer_details.name, fall back to email-prefix.
  const fullName = session.customer_details?.name ?? "";
  const firstName = fullName.split(/\s+/)[0] || email.split("@")[0];

  // Map product → Calendly product link. Unknown products get an empty string
  // and the email body will render "BOOK YOUR CALL" with no href — that's the
  // safer default than guessing wrong.
  const calendlyUrl = (() => {
    switch (mappedProduct) {
      case "First Call":
        return config.frankieEmails.calendlyUrls.firstCall;
      case "Single Call":
        return config.frankieEmails.calendlyUrls.singleCall;
      case "3-Session Clarity Sprint":
        return config.frankieEmails.calendlyUrls.clarityBundle;
      default:
        return config.frankieEmails.calendlyUrls.firstCall; // safe default
    }
  })();

  // Tally URL — prefill the email so the client doesn't re-type it.
  const tallyUrl = (() => {
    const base = config.frankieEmails.tallyUrl;
    if (!base) return "";
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}email=${encodeURIComponent(email)}`;
  })();

  const input: ConfirmationInput = {
    firstName,
    calendlyUrl,
    tallyUrl,
    serviceAgreementUrl: config.frankieEmails.serviceAgreementUrl,
  };

  try {
    const tmpl = confirmationEmail(input);
    const result = await sendEmail({
      to: email,
      subject: tmpl.subject,
      bodyMarkdown: tmpl.bodyMarkdown,
      previewText: tmpl.previewText,
      categories: tmpl.categories,
    });
    return result.ok
      ? { ok: true }
      : { ok: false, reason: result.reason ?? "send_failed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return { ok: false, reason: `template_or_send_threw: ${message}` };
  }
}
