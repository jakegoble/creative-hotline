/**
 * GET /api/notion/pipeline/funnel — micro-funnel from real client statuses.
 * Live: reached/completed counts derived from where each client sits in the
 * Notion Payments pipeline. Stage timing benchmarks aren't tracked, so
 * avg_time_hours / benchmark_rate are 0 (not faked).
 */
import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import { queryPaymentsDb } from "@/lib/services/notion";
import type { Client, MicroFunnel } from "@/lib/types";

// Ordered pipeline: a client at rank i has necessarily passed ranks < i.
const STAGE_ORDER: { label: string; match: (s: string) => boolean }[] = [
  { label: "Lead", match: (s) => /lead/i.test(s) },
  { label: "Paid", match: (s) => /paid/i.test(s) },
  { label: "Booked", match: (s) => /booked/i.test(s) },
  { label: "Intake", match: (s) => /intake/i.test(s) },
  { label: "Ready for Call", match: (s) => /ready/i.test(s) },
  { label: "Call Complete", match: (s) => /call complete|complete/i.test(s) },
  { label: "Follow-Up", match: (s) => /follow/i.test(s) },
];

function rankOf(status: string): number {
  let rank = 0;
  STAGE_ORDER.forEach((st, i) => {
    if (st.match(status)) rank = i;
  });
  return rank;
}

function computeFunnel(clients: Client[]): MicroFunnel {
  const ranks = clients.map((c) => rankOf(c.status));
  // reached[i] = how many clients got to stage i or beyond.
  const reached = STAGE_ORDER.map((_, i) => ranks.filter((r) => r >= i).length);

  const stages = STAGE_ORDER.map((st, i) => {
    const entered = reached[i];
    const completed = i + 1 < reached.length ? reached[i + 1] : entered;
    return {
      stage: st.label,
      entered,
      completed,
      drop_off_rate: entered ? Math.round(((entered - completed) / entered) * 100) / 100 : 0,
      avg_time_hours: 0,
      benchmark_rate: 0,
    };
  });

  const converts = clients.map((c) => c.days_to_convert).filter((d): d is number => typeof d === "number");
  const avg_days_to_convert = converts.length
    ? Math.round((converts.reduce((s, d) => s + d, 0) / converts.length) * 10) / 10
    : 0;

  const bottleneck = stages.reduce(
    (worst, s) => (s.drop_off_rate > worst.drop_off_rate ? s : worst),
    stages[0] ?? { stage: "—", drop_off_rate: 0 },
  ).stage;

  return { stages, avg_days_to_convert, bottleneck };
}

export const dynamic = "force-dynamic";

export async function GET() {
  if (config.demoMode) return NextResponse.json(demoData.getMicroFunnel());
  if (!isConfigured("notion")) {
    return NextResponse.json({ error: "Notion API key not configured" }, { status: 503 });
  }
  try {
    const clients = await queryPaymentsDb();
    return NextResponse.json(computeFunnel(clients));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
