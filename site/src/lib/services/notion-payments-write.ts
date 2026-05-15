/**
 * Notion Payments DB — write operations.
 *
 * Reads live in `notion.ts`. Writes live here so Batch 1 stays additive and
 * the existing read pipeline isn't disturbed. Both files share the same
 * NOTION_API_KEY via `config.notion`.
 *
 * Used by: Stripe webhook (creates Payments row on checkout.session.completed).
 * Will also be used by: review dashboard send (writes Referral Code Issued at
 * send time) and any manual-entry flows.
 */

import { Client as NotionClient } from "@notionhq/client";
import { config } from "../config";
import type { PaymentCreateInput } from "../v2-types";

let _client: NotionClient | null = null;

function getClient(): NotionClient {
  if (!_client) {
    if (!config.notion.apiKey) {
      throw new Error("NOTION_API_KEY is not configured");
    }
    _client = new NotionClient({ auth: config.notion.apiKey });
  }
  return _client;
}

/** Build a rich_text property value for a single string. */
function richText(value: string | undefined) {
  if (!value) return { rich_text: [] };
  return { rich_text: [{ type: "text" as const, text: { content: value } }] };
}

/**
 * Find an existing Payments row by Stripe Session ID.
 * Used for idempotency — Stripe can deliver the same event multiple times.
 */
export async function findPaymentByStripeSessionId(
  stripeSessionId: string,
): Promise<string | null> {
  const client = getClient();
  const response = await client.dataSources.query({
    data_source_id: config.notion.paymentsDbId,
    filter: {
      property: "Stripe Session ID",
      rich_text: { equals: stripeSessionId },
    },
    page_size: 1,
  });
  const first = response.results[0];
  return first ? first.id : null;
}

/**
 * Find a Payments page by email. Returns the most recently-created FRESH match
 * (default: created within the last 30 minutes) or null.
 *
 * Used by the Calendly webhook to auto-link a fresh booking back to the
 * Payment row that triggered it. The timeWindowMinutes constraint prevents the
 * race-condition bug where a returning client books a second session and the
 * webhook would otherwise dedupe against their OLD Payment + Session pair.
 *
 * Calendly fires `invitee.created` ~1s after Stripe's `payment_intent.succeeded`,
 * so the new Payment row is essentially always within the 30-min window. The
 * 30-min ceiling gives generous slack for Notion index lag on Stripe's side
 * while still excluding ALL prior bookings by the same email.
 *
 * Mirror of findIntakeIdByEmail in notion-intake-read.ts. Email is the only
 * stable cross-source key (Tally + Calendly + Stripe all collect it) — see
 * project_tch_v2_implementation.md.
 */
export async function findPaymentByEmail(
  email: string,
  timeWindowMinutes: number = 30,
): Promise<string | null> {
  if (!email) return null;
  const client = getClient();
  const cutoffIso = new Date(
    Date.now() - timeWindowMinutes * 60 * 1000,
  ).toISOString();
  const response = await client.dataSources.query({
    data_source_id: config.notion.paymentsDbId,
    filter: {
      and: [
        { property: "Email", email: { equals: email } },
        {
          timestamp: "created_time",
          created_time: { on_or_after: cutoffIso },
        },
      ],
    },
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 1,
  });
  const first = response.results[0];
  return first ? first.id : null;
}

/**
 * Create a Payments DB row from a Stripe checkout session.
 *
 * Idempotent: if a row already exists for the given Stripe Session ID, returns
 * the existing page ID without creating a duplicate.
 */
export async function createPaymentRecord(
  input: PaymentCreateInput,
): Promise<{ pageId: string; created: boolean }> {
  const existing = await findPaymentByStripeSessionId(input.stripeSessionId);
  if (existing) {
    return { pageId: existing, created: false };
  }

  const client = getClient();
  const properties: Record<string, unknown> = {
    "Client Name": {
      title: [
        {
          type: "text",
          text: { content: input.clientName ?? input.email ?? "Unknown" },
        },
      ],
    },
    Email: { email: input.email },
    "Stripe Session ID": richText(input.stripeSessionId),
    Status: { select: { name: "Paid - Needs Booking" } },
    "Lead Source": { select: { name: input.leadSource ?? "Website" } },
  };

  if (input.phone) {
    properties["Phone"] = { phone_number: input.phone };
  }
  if (typeof input.amount === "number") {
    properties["Payment Amount"] = { number: input.amount };
  }
  if (input.paymentDate) {
    properties["Payment Date"] = { date: { start: input.paymentDate } };
  }
  if (input.product) {
    properties["Product Purchased"] = { select: { name: input.product } };
  }
  if (input.redeemedCode) {
    properties["Redeemed Code"] = richText(input.redeemedCode);
  }

  const page = await client.pages.create({
    parent: {
      type: "data_source_id",
      data_source_id: config.notion.paymentsDbId,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: properties as any,
  });

  return { pageId: page.id, created: true };
}

/**
 * Write the Referral Code we issued to a client onto their Payments row.
 * Called at send time (Batch 6), after the action plan is delivered.
 */
export async function setReferralCodeIssued(
  pageId: string,
  code: string,
): Promise<void> {
  const client = getClient();
  await client.pages.update({
    page_id: pageId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: { "Referral Code Issued": richText(code) } as any,
  });
}
