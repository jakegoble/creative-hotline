/**
 * GET /api/notion/clients/paths — multi-touch conversion paths + attribution.
 * No cross-channel touchpoint tracking exists in the stack, so live mode
 * returns an honest empty state. Demo mode still shows sample paths.
 */
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import type { ConversionPath, AttributionSummary } from "@/lib/types";

const EMPTY: { paths: ConversionPath[]; attribution: AttributionSummary[] } = {
  paths: [],
  attribution: [],
};

export async function GET() {
  return NextResponse.json(config.demoMode ? demoData.getConversionPaths() : EMPTY);
}
