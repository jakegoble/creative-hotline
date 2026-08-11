/**
 * GET /api/ai/brand-audit — brand audit scoring.
 * Not yet wired to a real audit source, so live mode returns an honest empty
 * state (zero score, no dimensions, a prompt to connect a source) rather than
 * a fabricated grade. Demo mode still shows a sample audit.
 */
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import type { BrandAuditResult } from "@/lib/types";

const EMPTY: BrandAuditResult = {
  overall_score: 0,
  tier: "Needs Work",
  dimensions: [],
  priority_actions: ["No brand audit has been run yet. Connect a data source to generate a live audit."],
  percentile: 0,
};

export async function GET() {
  return NextResponse.json(config.demoMode ? demoData.getBrandAudit() : EMPTY);
}
