/**
 * GET /api/notion/clients/retargeting — ad-audience retargeting segments.
 * No ad-platform audience data is wired in, so live mode returns an honest
 * empty state (no fabricated segments). Demo mode still shows samples.
 */
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import type { RetargetingSegment } from "@/lib/types";

const EMPTY: RetargetingSegment[] = [];

export async function GET() {
  return NextResponse.json(config.demoMode ? demoData.getRetargetingSegments() : EMPTY);
}
