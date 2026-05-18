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
  intakeNudgeEmail,
  callerPrepEmail,
} from "./templates/frankie";
import { sendEmail, type SendAttachment } from "../services/email";
import { sendSms } from "../services/twilio";
import type { PaymentCreateInput, ProductPurchased } from "../v2-types";

/**
 * Service-agreement PDF attachment loader.
 *
 * Per Megha's V2 spec, the confirmation email attaches the service agreement
 * as a PDF. The PDF lives at /public/legal/service-agreement.pdf — served
 * statically by Vercel's CDN — so we fetch it at runtime from the deploy URL
 * rather than wrestling with serverless file-system tracing.
 *
 * Cached per function-instance (module-level) so subsequent sends don't refetch.
 * Fail-soft: if the fetch errors, sends still go out without the attachment
 * (logged + flagged via `attachmentError`) rather than dropping the email.
 */
let cachedAgreementPdf: Buffer | null = null;
let agreementFetchError: string | null = null;

async function loadServiceAgreementAttachment(): Promise<{
  attachment?: SendAttachment;
  error?: string;
}> {
  if (cachedAgreementPdf) {
    return {
      attachment: {
        content: cachedAgreementPdf,
        filename: "service-agreement.pdf",
        type: "application/pdf",
      },
    };
  }
  if (agreementFetchError) {
    // Already tried + failed this instance — don't retry on every send.
    return { error: agreementFetchError };
  }
  try {
    // Use the configured service-agreement URL — same source the email links to,
    // ensuring attachment + link stay in lockstep. Swap to the .pdf variant.
    const base = config.frankieEmails.serviceAgreementUrl.replace(
      /\.html?$/i,
      ".pdf",
    );
    const res = await fetch(base, { cache: "no-store" });
    if (!res.ok) {
      agreementFetchError = `agreement_fetch_status_${res.status}`;
      return { error: agreementFetchError };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    cachedAgreementPdf = buf;
    return {
      attachment: {
        content: buf,
        filename: "service-agreement.pdf",
        type: "application/pdf",
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    agreementFetchError = `agreement_fetch_threw: ${msg}`;
    return { error: agreementFetchError };
  }
}

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
    const agreement = await loadServiceAgreementAttachment();
    if (agreement.error) {
      console.warn(
        `[frankie] confirmation (checkout) sending without agreement attachment: ${agreement.error}`,
      );
    }
    const result = await sendEmail({
      to: email,
      subject: tmpl.subject,
      bodyMarkdown: tmpl.bodyMarkdown,
      previewText: tmpl.previewText,
      categories: tmpl.categories,
      attachments: agreement.attachment ? [agreement.attachment] : undefined,
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
    const agreement = await loadServiceAgreementAttachment();
    if (agreement.error) {
      console.warn(
        `[frankie] confirmation (calendly) sending without agreement attachment: ${agreement.error}`,
      );
    }
    const result = await sendEmail({
      to: input.email,
      subject: tmpl.subject,
      bodyMarkdown: tmpl.bodyMarkdown,
      previewText: tmpl.previewText,
      categories: tmpl.categories,
      attachments: agreement.attachment ? [agreement.attachment] : undefined,
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

// ---------------------------------------------------------------------------
// Followups — Frankie #2 (Intake Nudge) + Frankie #3 (Caller Prep)
//   Fired by the nightly cron at /api/cron/frankie-followups.
//   Idempotency is handled by the caller writing intakeNudgeSent /
//   callerPrepSent back to Notion after success.
// ---------------------------------------------------------------------------

export interface FollowupSendInput {
  email: string;
  firstName: string;
  /** Pretty-printed time the call is on, e.g. "Wednesday at 10:00 AM PT". */
  sessionTime: string;
}

export interface FollowupSendResult {
  ok: boolean;
  reason?: string;
}

/**
 * Send Frankie #2 — fires 24h pre-session when intake has not been submitted.
 * Caller is responsible for the intake-not-submitted gate; this function does
 * not re-check (lets the cron batch the lookup).
 */
export async function sendIntakeNudge(
  input: FollowupSendInput & { tallyUrl: string },
): Promise<FollowupSendResult> {
  if (!config.frankieEmails.enabled) {
    return { ok: false, reason: "frankie_disabled" };
  }
  if (!input.email) return { ok: false, reason: "no_recipient_email" };
  try {
    const tmpl = intakeNudgeEmail({
      firstName: input.firstName,
      sessionTime: input.sessionTime,
      tallyUrl: input.tallyUrl,
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

/**
 * Send Frankie #3 — the night-before caller-prep one-pager. Fired the day
 * before the session at the cron's run time (target 4 PM PT).
 */
export async function sendCallerPrep(
  input: FollowupSendInput & { callerPrepUrl?: string },
): Promise<FollowupSendResult> {
  if (!config.frankieEmails.enabled) {
    return { ok: false, reason: "frankie_disabled" };
  }
  if (!input.email) return { ok: false, reason: "no_recipient_email" };
  try {
    const tmpl = callerPrepEmail({
      firstName: input.firstName,
      sessionTime: input.sessionTime,
      callerPrepUrl: input.callerPrepUrl,
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
