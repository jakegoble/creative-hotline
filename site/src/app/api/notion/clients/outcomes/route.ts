/**
 * GET /api/notion/clients/outcomes — NPS, testimonials, referrals, LTV.
 * No real data source in the stack yet, so live mode returns an honest empty
 * state (no fabricated testimonials/scores). Demo mode still shows samples.
 */
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import type { OutcomesData } from "@/lib/types";

const EMPTY: OutcomesData = {
  nps_score: 0,
  nps_responses: 0,
  nps_breakdown: { promoters: 0, passives: 0, detractors: 0 },
  testimonials: [],
  referrals: [],
  ltv_leaderboard: [],
  cohort_retention: [],
};

export async function GET() {
  return NextResponse.json(config.demoMode ? demoData.getOutcomes() : EMPTY);
}
