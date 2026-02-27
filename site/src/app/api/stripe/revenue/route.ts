import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import { getMonthlyRevenue, getRevenueSummary } from "@/lib/services/stripe";

export async function GET() {
  if (config.demoMode) {
    return NextResponse.json(demoData.getMonthlyRevenue());
  }

  if (!isConfigured("stripe")) {
    return NextResponse.json({ error: "Stripe secret key not configured" }, { status: 503 });
  }

  try {
    const [monthly, summary] = await Promise.all([
      getMonthlyRevenue(),
      getRevenueSummary(),
    ]);
    return NextResponse.json({ monthly, total: summary.total, count: summary.count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
