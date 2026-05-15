/**
 * Calendly webhook — signature verification + event parsing.
 *
 * Calendly signs webhooks with HMAC-SHA256 (same algorithm Stripe uses) using
 * the signing key returned when you create the webhook subscription. The
 * signature lives in the `Calendly-Webhook-Signature` header in the format
 *   t=<unix_seconds>,v1=<hex_digest>
 *
 * Signed payload format: `${timestamp}.${rawBody}` — body must be the raw
 * request bytes, NOT JSON.parse'd.
 *
 * Tolerance: 3 minutes (180s) past the signed timestamp before we reject as
 * replay. Calendly's own docs recommend 3-5 min.
 *
 * Used by: `app/api/calendly/webhook/route.ts`.
 *
 * Webhook subscription setup:
 *   POST https://api.calendly.com/webhook_subscriptions
 *   Body: {
 *     url: "https://<deployed-domain>/api/calendly/webhook",
 *     events: ["invitee.created", "invitee.canceled"],
 *     organization: <CALENDLY_ORG_URI>,
 *     scope: "organization",
 *     signing_key: "<arbitrary string we choose, becomes CALENDLY_WEBHOOK_SECRET>"
 *   }
 *   The `signing_key` we provide is what Calendly will use to sign every
 *   inbound webhook. Save the same value to CALENDLY_WEBHOOK_SECRET in Vercel.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config";
import type { SessionCreateInput } from "./notion-sessions-write";

const SIGNATURE_TOLERANCE_SECONDS = 180;

/** Shape of the Calendly invitee.created payload (the fields we actually use). */
export interface CalendlyInviteeCreatedPayload {
  event: "invitee.created";
  created_at: string;
  payload: {
    uri: string;
    email: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    rescheduled?: boolean;
    cancel_url?: string;
    reschedule_url?: string;
    /**
     * Custom questions Megha can configure on the booking page (e.g., "Phone
     * number for SMS updates?"). We scan this for phone-shaped answers so we
     * can connect a booking back to its originating SMS subscriber.
     */
    questions_and_answers?: Array<{
      question: string;
      answer: string;
      position?: number;
    }>;
    scheduled_event: {
      uri: string;
      name: string;
      start_time: string;
      end_time: string;
      status: string;
    };
  };
}

/**
 * Shape of the Calendly invitee.canceled payload. Calendly fires this when
 * an invitee cancels their booking — and ALSO when they reschedule (on the
 * OLD booking; the NEW booking comes through as a separate invitee.created
 * event with rescheduled=true on its payload).
 *
 * `cancellation.canceler_type` is "invitee" / "host" depending on who
 * initiated the cancel.
 */
export interface CalendlyInviteeCanceledPayload {
  event: "invitee.canceled";
  created_at: string;
  payload: {
    uri: string;
    email: string;
    name?: string;
    rescheduled?: boolean;
    cancellation?: {
      canceled_by?: string;
      reason?: string;
      canceler_type?: string;
    };
    scheduled_event: {
      uri: string;
      name: string;
      start_time: string;
      end_time: string;
      status: string;
    };
  };
}

/** Union of all Calendly events we care about. Anything else gets ack-ignored. */
export type CalendlyEvent =
  | CalendlyInviteeCreatedPayload
  | CalendlyInviteeCanceledPayload
  | { event: string; created_at: string; payload?: unknown };

/**
 * Best-effort phone extraction from Calendly's custom questions. Megha may or
 * may not have a phone-capture question on the event; if she does, the answer
 * shows up here. We match on common phrasings ("phone", "mobile", "cell",
 * "sms") and return the first answer that looks like a number.
 *
 * Returns the raw answer string (not E.164-normalized — caller should pass
 * through normalizePhoneE164). Returns "" if nothing matched.
 */
export function extractPhoneFromQA(
  payload: CalendlyInviteeCreatedPayload["payload"],
): string {
  const qa = payload.questions_and_answers;
  if (!qa || qa.length === 0) return "";
  for (const item of qa) {
    if (!item?.question || !item?.answer) continue;
    const q = item.question.toLowerCase();
    if (
      q.includes("phone") ||
      q.includes("mobile") ||
      q.includes("cell") ||
      q.includes("sms") ||
      q.includes("text")
    ) {
      // Cheap shape check — answer contains at least 7 digits.
      const digits = item.answer.replace(/\D/g, "");
      if (digits.length >= 7) return item.answer;
    }
  }
  return "";
}

/**
 * Verify the Calendly-Webhook-Signature header against the raw body.
 * Throws on signature mismatch, malformed header, or stale timestamp.
 *
 * Returns the parsed JSON event on success.
 */
export function constructCalendlyEvent(
  rawBody: string,
  signatureHeader: string | null,
): CalendlyEvent {
  if (!config.calendly.webhookSecret) {
    throw new Error("CALENDLY_WEBHOOK_SECRET is not configured");
  }
  if (!signatureHeader) {
    throw new Error("Missing Calendly-Webhook-Signature header");
  }

  // Header format: t=<seconds>,v1=<hex>
  const parts = signatureHeader.split(",").reduce<Record<string, string>>(
    (acc, part) => {
      const [k, v] = part.split("=");
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    },
    {},
  );
  const timestamp = parts.t;
  const provided = parts.v1;
  if (!timestamp || !provided) {
    throw new Error("Calendly signature header is missing t or v1 component");
  }

  const tsSeconds = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(tsSeconds)) {
    throw new Error("Calendly signature timestamp is not a number");
  }
  const ageSeconds = Math.floor(Date.now() / 1000) - tsSeconds;
  if (Math.abs(ageSeconds) > SIGNATURE_TOLERANCE_SECONDS) {
    throw new Error(
      `Calendly signature timestamp out of tolerance (age=${ageSeconds}s, max=${SIGNATURE_TOLERANCE_SECONDS}s)`,
    );
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", config.calendly.webhookSecret)
    .update(signedPayload)
    .digest("hex");

  // Constant-time comparison to dodge timing attacks.
  const providedBuf = Buffer.from(provided, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    throw new Error("Calendly signature mismatch");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error("Calendly webhook body is not valid JSON");
  }

  // Return as the discriminated CalendlyEvent union. The route handler
  // narrows on `event.event` to pick the right code path. Unknown event
  // types pass through (matching the third arm of the union) so the route
  // can ack-and-ignore them.
  return parsed as CalendlyEvent;
}

/**
 * Convert a Calendly invitee.created payload into the shape our Notion
 * Sessions writer accepts. Tolerant of missing fields — partial data is
 * better than dropping the booking on the floor.
 *
 * `paymentPageId` and (optionally) `intakePageId` are looked up by the route
 * handler before this — they're passed in here so the mapping stays pure.
 */
export function inviteeCreatedToSessionInput(
  event: CalendlyInviteeCreatedPayload,
  paymentPageId: string,
  intakePageId?: string,
): SessionCreateInput {
  const inv = event.payload;
  const sched = inv.scheduled_event;

  // Title format follows the existing manual-promote convention used in
  // /api/sessions/from-payment: "<Client Name> — <Product>".
  const productOrEventName = sched.name ?? "Workshop";
  const clientName =
    inv.name ??
    ([inv.first_name, inv.last_name].filter(Boolean).join(" ") ||
      inv.email.split("@")[0]);

  return {
    clientName: `${clientName} — ${productOrEventName}`,
    scheduledAt: sched.start_time,
    paymentPageId,
    intakePageId,
    state: "Prep",
    // Stable per-booking URI — used later by the invitee.canceled handler
    // to look up THIS Session row and transition State→Canceled. Calendly's
    // scheduled_event.uri is shared by the invitee.created and invitee.canceled
    // payloads for the same booking.
    calendlyEventUri: sched.uri,
  };
}
