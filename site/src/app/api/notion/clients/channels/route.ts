/**
 * GET /api/notion/clients/channels — per-channel performance.
 * Live: grouped from the Notion Payments DB by lead_source. CAC/ROI/benchmark
 * need ad-spend data we don't track yet, so they're returned as 0 (not faked).
 */
import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import { queryPaymentsDb } from "@/lib/services/notion";
import type { Client, ChannelPerformance } from "@/lib/types";

function ym(date?: string): string | null {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function computeChannels(clients: Client[]): ChannelPerformance[] {
  const groups = new Map<string, Client[]>();
  for (const c of clients) {
    const key = c.lead_source?.trim() || "Unknown";
    const bucket = groups.get(key) ?? [];
    bucket.push(c);
    groups.set(key, bucket);
  }

  const out: ChannelPerformance[] = [];
  for (const [channel, list] of groups) {
    const conversionsList = list.filter((c) => c.amount > 0);
    const leads = list.length;
    const conversions = conversionsList.length;
    const revenue = conversionsList.reduce((s, c) => s + c.amount, 0);

    const monthMap = new Map<string, { leads: number; revenue: number }>();
    for (const c of list) {
      const m = ym(c.created) ?? ym(c.payment_date);
      if (!m) continue;
      const cur = monthMap.get(m) ?? { leads: 0, revenue: 0 };
      cur.leads += 1;
      cur.revenue += c.amount > 0 ? c.amount : 0;
      monthMap.set(m, cur);
    }
    const monthly = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, leads: v.leads, revenue: v.revenue }));

    out.push({
      channel,
      leads,
      conversions,
      revenue,
      conversion_rate: leads ? Math.round((conversions / leads) * 100) / 100 : 0,
      avg_deal_size: conversions ? Math.round(revenue / conversions) : 0,
      cac: 0,
      roi: 0,
      benchmark_cac: 0,
      trend: 0,
      monthly,
    });
  }
  return out.sort((a, b) => b.revenue - a.revenue);
}

export const dynamic = "force-dynamic";

export async function GET() {
  if (config.demoMode) return NextResponse.json(demoData.getChannelPerformance());
  if (!isConfigured("notion")) {
    return NextResponse.json({ error: "Notion API key not configured" }, { status: 503 });
  }
  try {
    const clients = await queryPaymentsDb();
    return NextResponse.json(computeChannels(clients));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
