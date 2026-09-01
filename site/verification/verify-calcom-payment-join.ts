/**
 * Verification harness for the Cal.com → Payments join.
 *
 * Exercises the PURE mapping functions only — no Notion, no Stripe, no network.
 * Run:  npx tsx scripts/verify-calcom-payment-join.ts
 *
 * The BOOKING_PAID fixture below mirrors the real 2026-08-31 test booking
 * (uid qgd9pVfsNrxZQ6xVu7Paqt, pi_3UAhuN6sEOcFCGXZ1GqCwG4y) that exposed the
 * receipt_email assumption. Keep it in sync with reality — a fixture that has
 * drifted from the live payload proves nothing.
 */

import {
  extractStripePaymentIntentId,
  paymentDedupKey,
  bookingToPaymentInput,
} from "../src/lib/services/calcom-webhook";
import type { CalcomWebhookEvent } from "../src/lib/services/calcom-webhook";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        expected ${e}\n        actual   ${a}`}`);
}

const paidEvent: CalcomWebhookEvent = {
  triggerEvent: "BOOKING_PAID",
  createdAt: "2026-08-31T03:19:15.000Z",
  payload: {
    type: "internal-test-call",
    title: "Internal Test Call between The Creative Hotline and Cal.com Pipeline Test",
    startTime: "2026-09-01T16:00:00.000Z",
    endTime: "2026-09-01T16:15:00.000Z",
    uid: "qgd9pVfsNrxZQ6xVu7Paqt",
    attendees: [
      { name: "Cal.com Pipeline Test", email: "soscreativehotline@gmail.com" },
    ],
    payment: [
      {
        amount: 100,
        currency: "usd",
        success: true,
        externalId: "pi_3UAhuN6sEOcFCGXZ1GqCwG4y",
      },
    ],
  },
};

console.log("--- the booking that broke the old code ---");
check(
  "extracts the PaymentIntent id",
  extractStripePaymentIntentId(paidEvent.payload),
  "pi_3UAhuN6sEOcFCGXZ1GqCwG4y",
);

const input = bookingToPaymentInput(paidEvent);
check("builds a Payments input", input !== null, true);
check("dedup key is the PI id", input?.stripeSessionId, "pi_3UAhuN6sEOcFCGXZ1GqCwG4y");
check("email comes from the attendee", input?.email, "soscreativehotline@gmail.com");
check("name comes from the attendee", input?.clientName, "Cal.com Pipeline Test");
check("cents converted to dollars", input?.amount, 1);
check("payment date is the event time", input?.paymentDate, "2026-08-31T03:19:15.000Z");
check("internal test maps to no product", input?.product, undefined);

console.log("\n--- a real $499 booking ---");
const realEvent: CalcomWebhookEvent = {
  ...paidEvent,
  payload: {
    ...paidEvent.payload,
    type: "creative-hotline-call",
    title: "Creative Hotline Call between The Creative Hotline and Jane Doe",
    attendees: [{ name: "Jane Doe", email: "jane@example.com" }],
    payment: [
      { amount: 49900, currency: "usd", success: true, externalId: "pi_realBooking123" },
    ],
  },
};
const real = bookingToPaymentInput(realEvent);
check("maps the $499 SKU to First Call", real?.product, "First Call");
check("amount in dollars", real?.amount, 499);

console.log("\n--- externalId absent: the 2026-09-01 17:05 booking ---");
/*
 * The real second test booking. Cal.com sent a payment array with NO externalId
 * (uid dkwEvVjvNyJPQuN3Gaow7M, Stripe pi_3UAv746sEOcFCGXZ1bVaanfn). The first
 * version of the self-heal returned null here and logged
 * "no usable payment payload". It must now fall back to the booking uid.
 */
const noExternalId: CalcomWebhookEvent = {
  ...paidEvent,
  payload: {
    ...paidEvent.payload,
    uid: "dkwEvVjvNyJPQuN3Gaow7M",
    payment: [{ amount: 100, currency: "usd", success: true }],
  },
};
check(
  "no Stripe id to extract",
  extractStripePaymentIntentId(noExternalId.payload),
  null,
);
check(
  "falls back to the booking uid as dedup key",
  paymentDedupKey(noExternalId.payload),
  "calcom_dkwEvVjvNyJPQuN3Gaow7M",
);
const healed = bookingToPaymentInput(noExternalId);
check("still builds a Payments input", healed !== null, true);
check("keyed on the uid", healed?.stripeSessionId, "calcom_dkwEvVjvNyJPQuN3Gaow7M");
check("amount survives", healed?.amount, 1);
check(
  "a real Stripe id still wins over the uid fallback",
  paymentDedupKey(paidEvent.payload),
  "pi_3UAhuN6sEOcFCGXZ1GqCwG4y",
);

console.log("\n--- the cases that must NOT produce a row ---");
check(
  "no attendee email",
  bookingToPaymentInput({
    ...paidEvent,
    payload: { ...paidEvent.payload, attendees: [{ name: "No Email" }] },
  }),
  null,
);
check(
  "no uid and no Stripe id: nothing stable to key on",
  paymentDedupKey({ ...paidEvent.payload, uid: undefined, payment: [{}] }),
  null,
);
check(
  "junk externalId is rejected, not written into the dedup key",
  extractStripePaymentIntentId({
    ...paidEvent.payload,
    payment: [{ externalId: "not-a-stripe-id" }],
  }),
  null,
);
check(
  "empty externalId",
  extractStripePaymentIntentId({
    ...paidEvent.payload,
    payment: [{ externalId: "" }],
  }),
  null,
);
check(
  "a Checkout Session id is accepted too",
  extractStripePaymentIntentId({
    ...paidEvent.payload,
    payment: [{ externalId: "cs_test_a1B2c3" }],
  }),
  "cs_test_a1B2c3",
);

console.log(
  `\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`,
);
process.exit(failures === 0 ? 0 : 1);
