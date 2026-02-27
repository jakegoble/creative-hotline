/**
 * Stripe API service.
 * Fetches payment sessions, revenue summaries, and product info.
 */

import Stripe from "stripe";
import { config } from "../config";
import type { MonthlyRevenue } from "../types";

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

export interface PaymentSession {
  id: string;
  customer_email: string | null;
  amount_total: number;
  currency: string;
  payment_status: string;
  created: number;
  metadata: Record<string, string>;
}

/** Fetch completed checkout sessions from the last N days. */
export async function getRecentPayments(days = 90): Promise<PaymentSession[]> {
  const stripe = getStripe();
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const sessions: PaymentSession[] = [];

  for await (const session of stripe.checkout.sessions.list({
    status: "complete",
    created: { gte: since },
    limit: 100,
    expand: ["data.line_items"],
  })) {
    sessions.push({
      id: session.id,
      customer_email: session.customer_email,
      amount_total: (session.amount_total ?? 0) / 100,
      currency: session.currency ?? "usd",
      payment_status: session.payment_status ?? "unknown",
      created: session.created,
      metadata: (session.metadata as Record<string, string>) ?? {},
    });
  }

  return sessions;
}

/** Aggregate revenue by month from Stripe sessions. */
export async function getMonthlyRevenue(days = 365): Promise<MonthlyRevenue[]> {
  const sessions = await getRecentPayments(days);
  const byMonth = new Map<string, number>();

  for (const s of sessions) {
    const date = new Date(s.created * 1000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + s.amount_total);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue }));
}

/** Get total revenue and session count. */
export async function getRevenueSummary(days = 365) {
  const sessions = await getRecentPayments(days);
  const total = sessions.reduce((sum, s) => sum + s.amount_total, 0);
  return { total, count: sessions.length, sessions };
}

/** List active products from Stripe. */
export async function getProducts() {
  const stripe = getStripe();
  const products = await stripe.products.list({ active: true, limit: 20 });
  return products.data.map((p) => ({
    id: p.id,
    name: p.name,
    metadata: p.metadata,
  }));
}

/** Health check — retrieve balance to verify connectivity. */
export async function ping(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    const stripe = getStripe();
    await stripe.balance.retrieve();
    return { ok: true, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}
