/**
 * GET /api/stripe/revenue/goals — revenue goal tracking.
 * Live: monthly actuals + run-rate come from real Stripe revenue. The annual
 * target and the product-mix scenarios are planning inputs (projections, not
 * fabricated results) — target is a constant Jake can adjust below.
 */
import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import { getMonthlyRevenue } from "@/lib/services/stripe";
import type { RevenueGoalData } from "@/lib/types";

const ANNUAL_TARGET = 800_000;
const CAPACITY_CEILING = 527_000; // ~20 calls/week ceiling

export const dynamic = "force-dynamic";

export async function GET() {
  if (config.demoMode) return NextResponse.json(demoData.getRevenueGoals());
  if (!isConfigured("stripe")) {
    return NextResponse.json({ error: "Stripe secret key not configured" }, { status: 503 });
  }
  try {
    const monthly = await getMonthlyRevenue();
    const monthlyTarget = Math.round(ANNUAL_TARGET / 12);
    const monthly_actuals = monthly.map((m) => ({
      month: m.month,
      actual: m.revenue,
      target: monthlyTarget,
    }));

    // Run rate = average of the last up-to-3 months, annualized.
    const recent = monthly.slice(-3);
    const avgRecent = recent.length ? recent.reduce((s, m) => s + m.revenue, 0) / recent.length : 0;
    const current_annual_run_rate = Math.round(avgRecent * 12);

    // Scenarios are product-mix planning calculators (projections), reused as-is.
    const scenarios = demoData.getRevenueGoals().scenarios;

    const data: RevenueGoalData = {
      annual_target: ANNUAL_TARGET,
      current_annual_run_rate,
      gap: ANNUAL_TARGET - current_annual_run_rate,
      monthly_actuals,
      scenarios,
      capacity_ceiling: CAPACITY_CEILING,
    };
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
