/**
 * TCH Workshop V2 — shared types for the V2 build.
 *
 * Kept separate from `types.ts` to avoid churning that file while V1 dashboards
 * still depend on it. Once V2 stabilizes we can fold these back in.
 */

/** Lead-source enum on the Payments DB. Default for Stripe-driven creates. */
export type LeadSource =
  | "IG DM"
  | "IG Comment"
  | "IG Story"
  | "Meta Ad"
  | "LinkedIn"
  | "Website"
  | "Referral"
  | "Direct"
  | "Laylo";

/** Status enum on the Payments DB. Stripe webhook lands rows in "Paid - Needs Booking". */
export type PaymentStatus =
  | "Lead - Laylo"
  | "Lead - Website"
  | "Paid - Needs Booking"
  | "Booked - Needs Intake"
  | "Intake Complete"
  | "Ready for Call"
  | "Call Complete"
  | "Follow-Up Sent";

/** Product Purchased enum on the Payments DB. */
export type ProductPurchased =
  | "First Call"
  | "Single Call"
  | "Standard Call"
  | "3-Pack Sprint"
  | "3-Session Clarity Sprint";

/**
 * Input shape for creating a Payments row from a Stripe checkout session.
 * All fields optional except `stripeSessionId` + `email` so we can land partial
 * records when Stripe metadata is sparse.
 */
export interface PaymentCreateInput {
  /** Stripe checkout session ID — used as dedup key. */
  stripeSessionId: string;
  email: string;
  clientName?: string;
  phone?: string;
  amount?: number;
  paymentDate?: string; // ISO-8601
  product?: ProductPurchased;
  leadSource?: LeadSource;
  /** Promo code redeemed at checkout (referrer's code). */
  redeemedCode?: string;
}
