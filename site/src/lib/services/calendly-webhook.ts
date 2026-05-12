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
 * Verify the Calendly-Webhook-Signature header against the raw body.
 * Throws on signature mismatch, malformed header, or stale timestamp.
 *
 * Returns the parsed JSON event on success.
 */
export function constructCalendlyEvent(
  rawBody: string,
  signatureHeader: string | null,
): CalendlyInviteeCreatedPayload {
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

  // We only handle invitee.created in V2 Batch 4. Other event types are
  // returned as-is so the route can ack-and-ignore them.
  return parsed as CalendlyInviteeCreatedPayload;
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
  };
}
