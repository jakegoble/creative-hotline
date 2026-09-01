/**
 * Cal.com webhook — signature verification + event parsing.
 *
 * Replaces Calendly (see `calendly-webhook.ts`, kept intact during the cutover
 * so a rollback is a routing change rather than a code revert).
 *
 * Cal.com signs webhooks with HMAC-SHA256 over the RAW request body using the
 * secret you set on the webhook in Cal.com's UI/API. The digest arrives as a
 * bare lowercase hex string in the `x-cal-signature-256` header:
 *
 *   x-cal-signature-256: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
 *
 * Two differences from Calendly worth knowing, because they change what this
 * file can defend against:
 *   1. NO timestamp component. Calendly signs `${t}.${rawBody}` and we reject
 *      anything older than 3 minutes as a replay. Cal.com signs the body alone,
 *      so there is nothing to anchor a freshness window to and no replay
 *      tolerance check here. Idempotency is what protects us instead:
 *      `createSession` dedupes on the Linked Payment relation, so a replayed
 *      BOOKING_PAID returns the existing Session page id.
 *   2. Envelope shape. Cal.com wraps every event as
 *        { triggerEvent, createdAt, payload: {...} }
 *      where `triggerEvent` is the SCREAMING_SNAKE discriminant (BOOKING_PAID,
 *      BOOKING_CREATED, BOOKING_CANCELLED, ...). Calendly used `event` +
 *      `created_at`. The route narrows on `triggerEvent`.
 *
 * Used by: `app/api/calcom/webhook/route.ts`.
 *
 * Webhook setup:
 *   Cal.com → Settings → Developer → Webhooks → New
 *     Subscriber URL: https://<deployed-domain>/api/calcom/webhook
 *     Event triggers: Booking Paid, Booking Created, Booking Cancelled
 *     Secret: <choose a string, mirror to CALCOM_WEBHOOK_SECRET in Vercel>
 *   The secret is ours to pick — Cal.com uses it verbatim as the HMAC key.
 *   If the secret field is left blank Cal.com sends NO signature header, and
 *   this module fails closed (constructCalcomEvent throws). That is deliberate:
 *   an unsigned booking webhook is an open door to forged Session rows.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config";
import type { PaymentCreateInput } from "../v2-types";
import type { SessionCreateInput } from "./notion-sessions-write";

/**
 * Attendee on a Cal.com booking. `attendees[0]` is the booker — the person who
 * filled the form — which is the one we treat as the client.
 */
export interface CalcomAttendee {
  name?: string;
  email?: string;
  timeZone?: string;
  /** Present when the booking form collected a phone field. */
  phoneNumber?: string;
  [key: string]: unknown;
}

/** The organizer (Megha / the TCH host) on the event type. */
export interface CalcomOrganizer {
  name?: string;
  email?: string;
  timeZone?: string;
  [key: string]: unknown;
}

/**
 * The `payload` object inside the Cal.com envelope, narrowed to the fields we
 * actually read. Cal.com sends considerably more (eventTypeId, bookingId,
 * customInputs, iCalUID, ...) and adds fields over time, so every interface
 * here carries an index-signature catchall rather than being exhaustive —
 * modelling fields we don't use would rot on Cal.com's release schedule.
 */
export interface CalcomBookingPayload {
  /** Event-type slug, e.g. "creative-hotline-call". */
  type?: string;
  /** Human title, e.g. "Creative Hotline Call between Megha and Jake". */
  title?: string;
  /** ISO 8601 UTC. This is what lands in Session Date. */
  startTime?: string;
  endTime?: string;
  description?: string;
  /** Either a location string ("integrations:daily") or a URL. */
  location?: string;
  organizer?: CalcomOrganizer;
  attendees?: CalcomAttendee[];
  /**
   * Stable per-booking identifier (e.g. "mQK8dJ2nA9vB3cX7"). This is the key we
   * persist so the BOOKING_CANCELLED handler can find its Session again. Cal.com
   * sends the SAME uid on the created/paid and cancelled events for one booking.
   */
  uid?: string;
  /**
   * Set on a booking that REPLACES an earlier one — carries the uid of the
   * booking being rescheduled away from. Presence of this (or of
   * `rescheduled: true`) on a cancellation is how we tell "moved" from "gone".
   */
  rescheduleUid?: string;
  rescheduled?: boolean;
  cancellationReason?: string;
  /**
   * Free-form bag. Cal.com puts `videoCallUrl` here for its built-in video
   * integrations; booking-form answers sometimes land here too depending on
   * how the event type is configured.
   */
  metadata?: {
    videoCallUrl?: string;
    [key: string]: unknown;
  };
  /**
   * Booking-form answers keyed by field name. On modern Cal.com this is where
   * a custom "phone" or "attendeePhoneNumber" field surfaces. Values may be
   * strings, arrays (multi-select), or objects — hence `unknown`.
   */
  responses?: Record<string, unknown>;
  /** Legacy pre-`responses` shape for custom booking questions. */
  customInputs?: Record<string, unknown>;
  /**
   * Top-level price on the booking. OBSERVED PRESENT in the key list on both
   * BOOKING_CREATED and BOOKING_PAID (2026-09-01). Units NOT yet confirmed —
   * see the probe in the route. Do not read this into an amount until a logged
   * value has settled whether it is cents or whole currency units.
   */
  price?: number;
  currency?: string;
  /**
   * DOCUMENTED but NOT SENT. The 2026-09-01 BOOKING_PAID delivery carried
   * `payment: null` and `paymentId: 289060`. Modelling this array and reading
   * `payment[0].externalId` as the Stripe id is what made the first two
   * versions of the self-heal fail. Kept typed because a future Cal.com release
   * may populate it, and `extractStripePaymentIntentId` still prefers it when
   * present — but nothing may DEPEND on it existing.
   */
  payment?: Array<{
    amount?: number;
    currency?: string;
    success?: boolean;
    externalId?: string;
    [key: string]: unknown;
  }>;
  paymentId?: number;
  [key: string]: unknown;
}

/** Cal.com's envelope. Every trigger shares this shape. */
export interface CalcomWebhookEvent {
  triggerEvent: string;
  createdAt: string;
  payload: CalcomBookingPayload;
}

/**
 * Best-effort phone extraction from a Cal.com booking.
 *
 * Same spirit as `extractPhoneFromQA` in the Calendly module: the phone is
 * optional, we scan the places it could plausibly be, and we return the raw
 * string (NOT E.164-normalized — the caller pipes it through
 * `normalizePhoneE164`). The difference is that Cal.com has three candidate
 * homes instead of one flat Q&A array, so we check them in confidence order:
 *
 *   1. `attendees[0].phoneNumber` — the first-class field, set when the event
 *      type enables the built-in phone question or SMS reminders.
 *   2. `responses` — custom booking-form answers, matched on key OR on a
 *      phone-shaped string value under a phone-ish key.
 *   3. `customInputs` — the legacy shape, same matching.
 *
 * Returns `null` (not "") so callers must think about the empty case; the
 * Calendly version returned "" and every call site had to remember that "" is
 * falsy. `normalizePhoneE164` rejects null via the `?? ""` at the call site.
 */
export function extractPhoneFromBooking(
  payload: CalcomBookingPayload,
): string | null {
  const looksLikePhone = (value: unknown): value is string => {
    if (typeof value !== "string") return false;
    // Cheap shape check, mirroring the Calendly heuristic: at least 7 digits.
    return value.replace(/\D/g, "").length >= 7;
  };

  // 1. First-class attendee phone.
  const attendeePhone = payload.attendees?.[0]?.phoneNumber;
  if (looksLikePhone(attendeePhone)) return attendeePhone;

  // 2 + 3. Booking-form answers, new shape then legacy shape.
  const bags: Array<Record<string, unknown> | undefined> = [
    payload.responses,
    payload.customInputs,
  ];
  for (const bag of bags) {
    if (!bag) continue;
    for (const [key, value] of Object.entries(bag)) {
      const k = key.toLowerCase();
      if (
        k.includes("phone") ||
        k.includes("mobile") ||
        k.includes("cell") ||
        k.includes("sms") ||
        k.includes("text")
      ) {
        // Cal.com sometimes wraps an answer as { label, value }.
        const raw =
          looksLikePhone(value)
            ? value
            : typeof value === "object" && value !== null
              ? (value as { value?: unknown }).value
              : undefined;
        if (looksLikePhone(raw)) return raw;
      }
    }
  }

  return null;
}

/**
 * Verify the `x-cal-signature-256` header against the raw body.
 * Throws on a missing secret, a missing header, or a digest mismatch.
 *
 * Returns the parsed JSON event on success. Mirrors `constructCalendlyEvent`:
 * throw-on-failure so the route can turn any failure into one 400 with the
 * thrown message, rather than threading a result type through the handler.
 */
export function constructCalcomEvent(
  rawBody: string,
  signature: string | null,
): CalcomWebhookEvent {
  if (!config.calcom.webhookSecret) {
    throw new Error("CALCOM_WEBHOOK_SECRET is not configured");
  }
  if (!signature) {
    // Cal.com omits the header entirely when the webhook has no secret set.
    // Fail closed — see the setup note in the file header.
    throw new Error("Missing x-cal-signature-256 header");
  }

  const provided = signature.trim().toLowerCase();
  const expected = createHmac("sha256", config.calcom.webhookSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  // Constant-time comparison to dodge timing attacks. timingSafeEqual throws
  // on length mismatch, so the length guard has to come first — a wrong-length
  // signature is a mismatch anyway, and leaking "wrong length" tells an
  // attacker nothing they didn't already know from the algorithm being SHA256.
  const providedBuf = Buffer.from(provided, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    throw new Error("Cal.com signature mismatch");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error("Cal.com webhook body is not valid JSON");
  }

  const event = parsed as Partial<CalcomWebhookEvent>;
  if (!event || typeof event.triggerEvent !== "string") {
    throw new Error("Cal.com webhook body has no triggerEvent discriminant");
  }

  return {
    triggerEvent: event.triggerEvent,
    createdAt: event.createdAt ?? "",
    // Cal.com always sends a payload for booking triggers; default to an empty
    // object so the route's optional-chaining reads don't have to guard `null`.
    payload: event.payload ?? {},
  };
}

/**
 * Pull the Stripe PaymentIntent id out of a BOOKING_PAID payload.
 *
 * Cal.com puts it in `payment[0].externalId`. This is the ONLY reliable join
 * key between a Cal.com booking and its Payments row, and it is the key the
 * Payments DB already dedupes on ("Stripe Session ID" holds `pi_…` for the
 * PaymentIntent path).
 *
 * WHY THIS EXISTS — read before "simplifying" back to an email match.
 * The original route matched Payment rows by attendee email. That worked under
 * Calendly only because Calendly's Stripe integration always set
 * `receipt_email` on the PaymentIntent, so a Payments row reliably existed with
 * that address. Cal.com's integration does NOT set `receipt_email`. On the
 * first real $1 Cal.com booking (2026-08-31, pi_3UAhuN6sEOcFCGXZ1GqCwG4y) the
 * Stripe handler logged `payment_intent.succeeded missing receipt_email` and
 * skipped the write; the Cal.com handler then retried an email lookup for ~17s,
 * found nothing, and dropped a genuinely paid booking. Both webhooks returned
 * 200. Nothing looked broken anywhere.
 *
 * Matching on the id Cal.com hands us removes the dependency on what Stripe
 * chooses to populate, and on two webhooks agreeing about an email address.
 *
 * Returns null for unpaid/free bookings (no payment array) and for anything
 * that doesn't look like a Stripe object id, so a malformed value can't be
 * written into the dedup key and quietly split one payment across two rows.
 */
export function extractStripePaymentIntentId(
  p: CalcomBookingPayload,
): string | null {
  const external = p.payment?.[0]?.externalId;
  if (typeof external !== "string") return null;
  const trimmed = external.trim();
  // Stripe object ids for the two shapes that can back a booking.
  if (!/^(pi|cs)_[A-Za-z0-9_]+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Map a Cal.com booking to the canonical Notion "Product Purchased" option.
 *
 * Deliberately separate from `mapProductName` in stripe-webhook.ts: that one
 * parses a Calendly-formatted PaymentIntent description, which Cal.com does not
 * produce. Matching on the event-type slug and title is the Cal.com equivalent.
 *
 * Returns undefined when nothing matches — Product is optional on the Payments
 * row, and a wrong enum value is worse than an empty one. The internal $1 test
 * event intentionally falls through to undefined.
 */
function mapCalcomProduct(
  p: CalcomBookingPayload,
): PaymentCreateInput["product"] {
  const haystack = `${p.type ?? ""} ${p.title ?? ""}`.toLowerCase();
  if (haystack.includes("clarity")) return "3-Session Clarity Sprint";
  if (haystack.includes("3-pack") || haystack.includes("3 pack"))
    return "3-Pack Sprint";
  if (haystack.includes("single call")) return "Single Call";
  if (haystack.includes("standard")) return "Standard Call";
  if (haystack.includes("first call")) return "First Call";
  // The $499 SKU's event type is "Creative Hotline Call" → canonical "First Call",
  // matching the Calendly-era mapping in stripe-webhook.ts.
  if (haystack.includes("creative hotline call")) return "First Call";
  return undefined;
}

/**
 * Build a Payments row from a BOOKING_PAID payload.
 *
 * The self-heal path: when the Stripe webhook did not (or could not) write the
 * Payments row, the Cal.com payload carries everything the row needs — the
 * attendee email and name, the amount, and the PaymentIntent id. BOOKING_PAID
 * is itself proof the charge succeeded, so creating the row here is not
 * inventing a payment, it is recording one Stripe already confirmed.
 *
 * Safe to call unconditionally: `createPaymentRecord` dedupes on
 * `stripeSessionId`, and Stripe's own handler uses the SAME `pi_…` value as its
 * dedup key. Whichever webhook lands first creates the row; the other finds it
 * and returns the existing page id. There is no duplicate-row race between them.
 *
 * Returns null when the payload lacks an email or a usable PaymentIntent id —
 * without both, a Payments row would be unmatched and undedupable.
 */
/**
 * The dedup key to store in the Payments row's "Stripe Session ID".
 *
 * PREFERRED: the real Stripe id from `payment[0].externalId`, because that is
 * the same key our Stripe handler writes — one booking, one row, whichever
 * webhook lands first.
 *
 * FALLBACK: `calcom_<uid>`. Cal.com's BOOKING_PAID payload does NOT reliably
 * carry externalId — observed absent on the 2026-09-01 booking, which is why
 * the first version of this self-heal produced nothing. The booking uid is
 * stable, unique, and present on every booking event, so it keeps the row
 * idempotent across retries and replays even with no Stripe id in hand.
 *
 * THE COST OF THE FALLBACK, stated plainly: if the Stripe handler ever starts
 * writing rows for these bookings (it currently cannot — Cal.com sets neither
 * receipt_email nor billing_details.email), its `pi_…` key won't match a
 * `calcom_…` key and you would get two Payments rows for one booking. The
 * route mitigates this by checking for an existing row by email before
 * creating one. If you fix the Stripe side, re-check this.
 */
export function paymentDedupKey(p: CalcomBookingPayload): string | null {
  const stripeId = extractStripePaymentIntentId(p);
  if (stripeId) return stripeId;
  const uid = p.uid?.trim();
  return uid ? `calcom_${uid}` : null;
}

export function bookingToPaymentInput(
  event: CalcomWebhookEvent,
): PaymentCreateInput | null {
  const p = event.payload;
  const email = p.attendees?.[0]?.email?.trim() ?? "";
  const stripeSessionId = paymentDedupKey(p);
  if (!email || !stripeSessionId) return null;

  const attendeeName = p.attendees?.[0]?.name?.trim();
  // Cal.com sends the amount in minor units (cents), like Stripe.
  const rawAmount = p.payment?.[0]?.amount;
  const amount =
    typeof rawAmount === "number" && Number.isFinite(rawAmount)
      ? rawAmount / 100
      : undefined;

  return {
    stripeSessionId,
    email,
    clientName: attendeeName || email.split("@")[0],
    phone: extractPhoneFromBooking(p) ?? undefined,
    amount,
    // The booking's own timestamp, not the slot time: this is a payment date.
    paymentDate: event.createdAt || new Date().toISOString(),
    product: mapCalcomProduct(p),
    redeemedCode: undefined,
    leadSource: "Website",
  };
}

/**
 * Convert a Cal.com booking event into the shape the Notion Sessions writer
 * accepts. Tolerant of missing fields — partial data beats dropping a paid
 * booking on the floor.
 *
 * `paymentPageId` and (optionally) `intakePageId` are looked up by the route
 * handler before this — passed in so the mapping stays pure.
 */
export function bookingToSessionInput(
  event: CalcomWebhookEvent,
  paymentPageId: string,
  intakePageId?: string,
): SessionCreateInput {
  const p = event.payload;
  const attendee = p.attendees?.[0];

  // Title format follows the existing convention from
  // inviteeCreatedToSessionInput / /api/sessions/from-payment:
  //   "<Client Name> — <Product>".
  /*
   * Cal.com titles bookings as "<Event Name> between <Organizer> and <Attendee>".
   * Calendly sent a bare event name, and the Notion title convention is
   * "<Client> — <Product>", so passing Cal.com's title through raw produces
   * "Jane Doe — Creative Hotline Call between The Creative Hotline and Jane".
   * Trim at " between " to recover just the product name. Falls back to the
   * event-type slug, then a constant, so a title format change degrades to
   * something readable rather than an empty dash.
   */
  const productOrEventName =
    p.title?.split(" between ")[0]?.trim() ||
    p.type ||
    "Creative Hotline Call";
  const attendeeEmail = attendee?.email ?? "";
  const clientName =
    attendee?.name?.trim() ||
    (attendeeEmail ? attendeeEmail.split("@")[0] : "Unknown");

  return {
    clientName: `${clientName} — ${productOrEventName}`,
    scheduledAt: p.startTime ?? "",
    paymentPageId,
    intakePageId,
    state: "Prep",
    /**
     * NAME IS HISTORICAL — this holds a Cal.com booking uid, not a Calendly URI.
     *
     * We deliberately reuse the existing Notion "Calendly Event URI" property
     * rather than adding a "Cal.com Booking UID" one. The field was only ever a
     * stable per-booking key: written on create, read back by the cancellation
     * handler via `findSessionByCalendlyEventUri`. Nothing renders it to a
     * customer and nothing parses it as a URL.
     *
     * Reusing it means the cancellation lookup, the Notion filter, and every
     * historical Session row keep working unchanged through the Cal.com cutover.
     * Adding a parallel property would have meant a schema migration, a second
     * lookup path, and two ways for a cancel to miss its Session.
     *
     * Rename the Notion property if you want; keep the code pointed at ONE key.
     */
    /*
     * Stored as a full booking URL, NOT the bare uid.
     *
     * The Notion property is typed `url`. Calendly wrote real URLs into it
     * (https://api.calendly.com/scheduled_events/<uuid>), so every existing row
     * holds a valid URL. Writing a bare uid like `mQK8dJ2nA9vB3cX7` would be the
     * first non-URL value in a url-typed property, and if Notion ever rejected or
     * normalised it the cancellation lookup would stop finding Sessions — silently,
     * because the create path would still succeed. That is the exact failure shape
     * this project keeps getting burned by.
     *
     * Wrapping the uid in Cal.com's real booking URL removes the question. It is a
     * genuine URL, it round-trips unchanged, `url.equals` still matches exactly, and
     * it has the bonus of being clickable from Notion straight to the booking.
     */
    /* Only set when Cal.com actually sent a uid. Writing
     * "https://cal.com/booking/undefined" would look like a real key, collide
     * across every booking missing a uid, and make the cancel lookup match the
     * WRONG Session. Absent is safe; a poisoned key is not. */
    calendlyEventUri: p.uid ? bookingKey(p.uid) : undefined,
  };
}

/**
 * The single source of truth for the per-booking key written to, and read from,
 * the Notion "Calendly Event URI" property.
 *
 * This exists because the create path and the cancel path MUST derive the key
 * identically. They live in different functions, and when the format changed
 * from a bare uid to a full URL only one side was updated — which produces a
 * cancellation that finds no Session, logs "no session for booking uid", and
 * returns 200. Nothing looks broken until someone notices Sessions never leave
 * the Prep state after a client cancels.
 *
 * Both sides now call this. Change the format here and both follow.
 */
export function bookingKey(uid: string): string {
  return `https://cal.com/booking/${uid}`;
}
