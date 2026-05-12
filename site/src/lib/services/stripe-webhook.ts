/**
 * Stripe webhook — signature verification + event parsing.
 *
 * The signature check uses the raw request body (NOT JSON.parse'd) and the
 * STRIPE_WEBHOOK_SECRET env var. This is non-negotiable — Stripe rejects events
 * if the body has been re-serialized.
 *
 * Used by: `app/api/stripe/webhook/route.ts`.
 */

import Stripe from "stripe";
import { config } from "../config";
import type {
  PaymentCreateInput,
  ProductPurchased,
} from "../v2-types";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!config.stripe.secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(config.stripe.secretKey);
  }
  return _stripe;
}

/**
 * Verify the Stripe-Signature header against the raw body.
 * Throws on signature mismatch or expired timestamp.
 */
export function constructWebhookEvent(
  rawBody: string,
  signatureHeader: string | null,
): Stripe.Event {
  if (!config.stripe.webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  if (!signatureHeader) {
    throw new Error("Missing Stripe-Signature header");
  }
  return getStripe().webhooks.constructEvent(
    rawBody,
    signatureHeader,
    config.stripe.webhookSecret,
  );
}

/**
 * Map a Stripe product name (or metadata.product_key) to one of the Payments DB
 * Product Purchased options. V2 may add "Clarity Bundle" later — for now we
 * fall back to the closest existing option.
 */
function mapProductName(input: string | undefined): ProductPurchased | undefined {
  if (!input) return undefined;
  const normalized = input.trim().toLowerCase();
  if (normalized.includes("first call")) return "First Call";
  if (normalized.includes("single call")) return "Single Call";
  if (normalized.includes("3-pack") || normalized.includes("3 pack")) return "3-Pack Sprint";
  if (normalized.includes("clarity")) return "3-Session Clarity Sprint";
  if (normalized.includes("standard")) return "Standard Call";
  return undefined;
}

/**
 * Pull the first redeemed promo code off a checkout session. Stripe attaches
 * promotion codes via `total_details.breakdown.discounts`. Returns the code
 * string (e.g., "JANE-DIAL-100") or undefined.
 */
async function readRedeemedPromoCode(
  session: Stripe.Checkout.Session,
): Promise<string | undefined> {
  const discounts = session.total_details?.breakdown?.discounts ?? [];
  if (discounts.length === 0) return undefined;
  const first = discounts[0];

  // The Discount object's shape varies by Stripe SDK version. We narrow at
  // runtime: prefer the human-readable promotion_code string, fall back to
  // the coupon id, then the bare discount id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = first.discount as any;

  const promoRef = d?.promotion_code;
  if (typeof promoRef === "string" && promoRef) {
    try {
      const promo = await getStripe().promotionCodes.retrieve(promoRef);
      return promo.code;
    } catch {
      // fall through
    }
  }
  if (promoRef && typeof promoRef === "object" && typeof promoRef.code === "string") {
    return promoRef.code;
  }
  if (d?.coupon?.id) return d.coupon.id as string;
  if (typeof d?.id === "string") return d.id;
  return undefined;
}

/**
 * Convert a Stripe checkout.session.completed event into the shape our Notion
 * write helper accepts. Tolerant of missing fields — partial data is better
 * than dropping the row.
 */
export async function checkoutSessionToPaymentInput(
  session: Stripe.Checkout.Session,
): Promise<PaymentCreateInput> {
  // Email: prefer customer_details.email, fall back to customer_email.
  const email =
    session.customer_details?.email ?? session.customer_email ?? "";

  // Client name: customer_details.name, fall back to email-prefix.
  const clientName =
    session.customer_details?.name ??
    (email ? email.split("@")[0] : undefined);

  // Phone: only customer_details.phone is reliable (auto-collected).
  const phone = session.customer_details?.phone ?? undefined;

  // Amount: Stripe gives cents; we store dollars.
  const amount =
    typeof session.amount_total === "number"
      ? session.amount_total / 100
      : undefined;

  const paymentDate = session.created
    ? new Date(session.created * 1000).toISOString()
    : new Date().toISOString();

  // Product: prefer explicit metadata key, fall back to line items.
  let productName: string | undefined = session.metadata?.product;
  if (!productName) {
    try {
      const stripe = getStripe();
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        { limit: 1, expand: ["data.price.product"] },
      );
      const first = lineItems.data[0];
      const product = first?.price?.product;
      if (product && typeof product !== "string" && "name" in product) {
        productName = product.name;
      } else {
        productName = first?.description ?? undefined;
      }
    } catch {
      // Don't fail the whole webhook because line items couldn't be fetched.
    }
  }
  const product = mapProductName(productName);

  const redeemedCode = await readRedeemedPromoCode(session);

  return {
    stripeSessionId: session.id,
    email,
    clientName,
    phone,
    amount,
    paymentDate,
    product,
    redeemedCode,
    leadSource: "Website",
  };
}
