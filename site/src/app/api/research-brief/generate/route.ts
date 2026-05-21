/**
 * POST /api/research-brief/generate
 *
 * Body: { intakeId: string }
 *
 * Thin wrapper over the shared orchestrator `runResearchBriefGeneration`. The
 * orchestrator is idempotent + self-healing: it skips when a brief is already
 * Ready or a fresh run is in-flight, and regenerates a stale/failed run.
 *
 * Generation is normally kicked off automatically by the Tally webhook (via
 * `after()`), per Megha's flow: Tally intake → brief auto-generates → Morning
 * Prep consumes it. This route stays available as an explicit/UI safety-net
 * trigger (the Hub auto-fires it on load when a brief is missing/stale).
 *
 * The Morning Prep dashboard reads `Research Brief JSON` via
 * /api/research-brief/get — no need to round-trip through this route to read.
 *
 * V2 Batch 3 · self-healing rework 2026-05-21.
 */

import { NextResponse } from "next/server";
import { runResearchBriefGeneration } from "@/lib/services/run-research-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Research brief generation can take 8-15s — give it room.
export const maxDuration = 60;

export async function POST(request: Request) {
  let intakeId: string;
  try {
    const body = (await request.json()) as { intakeId?: string };
    if (!body.intakeId) {
      return NextResponse.json({ error: "missing_intakeId" }, { status: 400 });
    }
    intakeId = body.intakeId;
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  const result = await runResearchBriefGeneration(intakeId);

  if (!result.ok) {
    return NextResponse.json(
      { error: "generation_failed", message: result.error },
      { status: 500 },
    );
  }

  // Ready (freshly generated or already-ready) or in-flight → 200.
  return NextResponse.json(result);
}
