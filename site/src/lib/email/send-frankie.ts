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
import {
  confirmationEmail,
  type ConfirmationInput,
  calendlyConfirmationEmail,
  actionPlanDeliveredEmail,
  actionPlanDeliveredSms,
} from "./templates/frankie";
import { sendEmail } from "../services/email";
import { sendSms } from "../services/twilio";
import type { PaymentCreateInput, ProductPurchased } from "../v2-types";

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

/**
 * Build the confirmation email for the Calendly-paid path and send it.
 *
 * Used by the `payment_intent.succeeded` branch of the Stripe webhook. The
 * customer paid inside Calendly's checkout, so they already have their meeting
 * time. This template skips the "BOOK YOUR CALL" CTA from the Checkout flow.
 *
 * Returns ok=true on send, or with a reason describing why we skipped.
 * Never throws.
 */
export async function sendConfirmationFromCalendlyPayment(
  input: PaymentCreateInput,
): Promise<{ ok: boolean; reason?: string }> {
  // Hard gate — don't even attempt sends until explicitly enabled.
  if (!config.frankieEmails.enabled) {
    return { ok: false, reason: "frankie_disabled" };
  }

  if (!input.email) {
    return { ok: false, reason: "no_recipient_email" };
  }

  // First name — prefer the parsed clientName from the PaymentIntent
  // description, fall back to email-prefix.
  const fullName = input.clientName ?? "";
  const firstName =
    fullName.split(/\s+/)[0] || input.email.split("@")[0];

  // Tally URL — prefill the email so the client doesn't re-type it.
  const tallyUrl = (() => {
    const base = config.frankieEmails.tallyUrl;
    if (!base) return "";
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}email=${encodeURIComponent(input.email)}`;
  })();

  // Product label for subject-line personalization. Only included if mapped
  // cleanly — synthetic / test events may have undefined product.
  const productLabel = input.product ?? undefined;

  try {
    const tmpl = calendlyConfirmationEmail({
      firstName,
      tallyUrl,
      serviceAgreementUrl: config.frankieEmails.serviceAgreementUrl,
      productLabel,
    });
    const result = await sendEmail({
      to: input.email,
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

// ---------------------------------------------------------------------------
// Send pipeline — Day 0 action plan delivery (V2 Batch 7)
// ---------------------------------------------------------------------------

export interface ActionPlanDeliveryInput {
  /** Recipient email — from Payment row. */
  email: string;
  /** Recipient phone in E.164 format — from Payment row (may be missing). */
  phone?: string | null;
  /** Client first name — for personalization. */
  firstName: string;
  /** Public action plan URL. */
  actionPlanUrl: string;
  /** Generated referral code, e.g. JAKE-DIAL-100. */
  referralCode: string;
}

export interface ActionPlanDeliveryResult {
  email: { ok: boolean; reason?: string };
  sms: { ok: boolean; reason?: string; sid?: string };
}

/**
 * Fire the Day 0 action plan email + SMS in parallel via Frankie.
 *
 * Email is always attempted (gated by ENABLE_FRANKIE_EMAILS). SMS is attempted
 * only if a phone number is on file AND Twilio is configured. Either failure
 * does not block the other — we return both results so the caller can mark
 * partial-success on the Session row.
 *
 * Never throws.
 */
export async function sendActionPlanDelivery(
  input: ActionPlanDeliveryInput,
): Promise<ActionPlanDeliveryResult> {
  // ---- Email half --------------------------------------------------------
  const emailResultP: Promise<{ ok: boolean; reason?: string }> = (async () => {
    if (!config.frankieEmails.enabled) {
      return { ok: false, reason: "frankie_disabled" };
    }
    if (!input.email) {
      return { ok: false, reason: "no_recipient_email" };
    }
    try {
      const tmpl = actionPlanDeliveredEmail({
        firstName: input.firstName,
        actionPlanUrl: input.actionPlanUrl,
        referralCode: input.referralCode,
      });
      const result = await sendEmail({
        to: input.email,
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
      return { ok: false, reason: `email_threw: ${message}` };
    }
  })();

  // ---- SMS half ----------------------------------------------------------
  const smsResultP: Promise<{ ok: boolean; reason?: string; sid?: string }> =
    (async () => {
      if (!input.phone) {
        return { ok: false, reason: "no_phone_on_file" };
      }
      if (!config.twilio.accountSid || !config.twilio.authToken) {
        return { ok: false, reason: "twilio_not_configured" };
      }
      try {
        const smsBody = actionPlanDeliveredSms({
          firstName: input.firstName,
          actionPlanUrl: input.actionPlanUrl,
          referralCode: input.referralCode,
        });
        const result = await sendSms({
          to: input.phone,
          body: smsBody,
        });
        return result.ok
          ? { ok: true, sid: result.sid }
          : { ok: false, reason: result.error ?? "sms_send_failed" };
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        return { ok: false, reason: `sms_threw: ${message}` };
      }
    })();

  // Fire in parallel — independent failure modes.
  const [emailRes, smsRes] = await Promise.all([emailResultP, smsResultP]);
  return { email: emailRes, sms: smsRes };
}
