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
// Research brief generation: the V2 brief schema (cleaned read-back, distinct
// see/gap, what's-working, push-on, structured moves) ~doubled the output, so a
// real Claude call now runs ~40-90s. 60s was getting killed mid-flight and
// leaving the row stuck on "Generating". Give it real headroom.
// 2026-06-15: round-3 delta/library context pushed real regens past 120s →
// 504 Vercel Runtime Timeout, re-wedging the row on "Generating". Bumped to
// the Vercel Pro ceiling (300s). The route already self-heals status on error.
export const maxDuration = 300;

export async function POST(request: Request) {
  let intakeId: string;
  let force = false;
  let extraContext: string | undefined;
  let note: string | undefined;
  let libraryDocs: { label?: string; url?: string; source?: string }[] | undefined;
  try {
    const body = (await request.json()) as {
      intakeId?: string;
      regenerate?: boolean;
      force?: boolean;
      extraContext?: string;
      note?: string;
      libraryDocs?: { label?: string; url?: string; source?: string }[];
    };
    if (!body.intakeId) {
      return NextResponse.json({ error: "missing_intakeId" }, { status: 400 });
    }
    intakeId = body.intakeId;
    // Either flag forces a fresh, non-destructive regeneration (the prior brief
    // is archived as a version first). Without it the call stays idempotent.
    force = !!(body.regenerate || body.force);
    extraContext = typeof body.extraContext === "string" ? body.extraContext : undefined;
    note = typeof body.note === "string" ? body.note : undefined;
    libraryDocs = Array.isArray(body.libraryDocs) ? body.libraryDocs : undefined;
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  const result = await runResearchBriefGeneration(intakeId, { force, extraContext, note, libraryDocs });

  if (!result.ok) {
    return NextResponse.json(
      { error: "generation_failed", message: result.error },
      { status: 500 },
    );
  }

  // Ready (freshly generated or already-ready) or in-flight → 200.
  return NextResponse.json(result);
}
