/**
 * GET /api/notion/clients/kpis — dashboard KPI summary.
 * Live: computed from the Notion Payments DB (real clients). Demo: sample data.
 */
import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import { queryPaymentsDb } from "@/lib/services/notion";
import type { Client, KpiSummary } from "@/lib/types";

const ACTIVE_STATUSES = [
  "Paid - Needs Booking",
  "Booked - Needs Intake",
  "Intake Complete",
  "Ready for Call",
];

function ym(date?: string): string | null {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function computeKpis(clients: Client[]): KpiSummary {
  const paid = clients.filter((c) => c.amount > 0);
  const total_revenue = paid.reduce((s, c) => s + c.amount, 0);

  const booked = clients.filter(
    (c) => c.call_date || /booked|intake|ready|call/i.test(c.status),
  ).length;

  // revenue by month from payment_date
  const byMonth = new Map<string, number>();
  for (const c of paid) {
    const m = ym(c.payment_date) ?? ym(c.created);
    if (m) byMonth.set(m, (byMonth.get(m) ?? 0) + c.amount);
  }
  const months = [...byMonth.keys()].sort();
  const thisMonth = months.length ? byMonth.get(months[months.length - 1]) ?? 0 : 0;
  const lastMonth = months.length > 1 ? byMonth.get(months[months.length - 2]) ?? 0 : 0;

  return {
    total_revenue,
    total_clients: clients.length,
    active_pipeline: clients.filter((c) => ACTIVE_STATUSES.includes(c.status)).length,
    booking_rate: paid.length ? Math.round((booked / paid.length) * 100) / 100 : 0,
    avg_deal_size: paid.length ? Math.round(total_revenue / paid.length) : 0,
    monthly_revenue: thisMonth,
    revenue_trend: lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) / 100 : 0,
    conversion_rate: clients.length ? Math.round((paid.length / clients.length) * 100) / 100 : 0,
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  if (config.demoMode) return NextResponse.json(demoData.getKpis());
  if (!isConfigured("notion")) {
    return NextResponse.json({ error: "Notion API key not configured" }, { status: 503 });
  }
  try {
    const clients = await queryPaymentsDb();
    return NextResponse.json(computeKpis(clients));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
