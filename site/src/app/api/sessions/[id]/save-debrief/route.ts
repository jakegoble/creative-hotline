/**
 * POST /api/sessions/[id]/save-debrief
 *
 * Persists the post-call debrief form to the Session row's "Debrief JSON"
 * rich_text field, and optionally updates the Fireflies Transcript URL.
 * On the FIRST save of a debrief (state === "Session"), implicitly advances
 * state to "Debrief". Subsequent saves leave the state alone — they're just
 * autosave updates.
 *
 * Idempotent: safe to call repeatedly with the same blob.
 *
 * Body: {
 *   debriefJson: string,       // serialized JSON blob (see schema below)
 *   firefliesUrl?: string|null // optional update to firefliesUrl
 * }
 *
 * Response: { ok: true, state: SessionState, advanced: boolean }
 *
 * Debrief JSON schema (v1):
 *   {
 *     version: 1,
 *     topWins: string,                // top 2-3 quick wins to prioritize
 *     bigBetPick: string,             // big bet pick + rationale
 *     openQuestions: string,          // what's still unclear
 *     meghaRecommendation: string,    // 1-2 sentence final rec
 *     firefliesUrl: string,           // mirror of Notion field for client-side convenience
 *     updatedAt: string
 *   }
 *
 * V2 Batch 5 — Debrief screen.
 */

import { NextResponse } from "next/server";
import { getSessionById } from "@/lib/services/notion-sessions-read";
import {
  updateSessionFields,
  type SessionState,
} from "@/lib/services/notion-sessions-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveBody {
  debriefJson?: string;
  firefliesUrl?: string | null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  if (typeof body.debriefJson !== "string") {
    return NextResponse.json(
      { error: "missing_debriefJson" },
      { status: 400 },
    );
  }

  // Validate the blob is parseable JSON — protects against corrupted writes.
  try {
    JSON.parse(body.debriefJson);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid_blob_json";
    return NextResponse.json(
      { error: "debriefJson_not_parseable", message },
      { status: 400 },
    );
  }

  // Look up the current state so we know whether to auto-advance Session → Debrief.
  let currentState: SessionState | "Unknown" = "Unknown";
  try {
    const session = await getSessionById(id);
    if (!session) {
      return NextResponse.json(
        { error: "session_not_found" },
        { status: 404 },
      );
    }
    currentState = session.state;
  } catch (err) {
    const message = err instanceof Error ? err.message : "session_fetch_failed";
    return NextResponse.json(
      { error: "session_fetch_failed", message },
      { status: 500 },
    );
  }

  // Advance from Session → Debrief on first save. Also advance from Prep if
  // somehow we skipped the workshop (rare but valid — short calls, follow-ups).
  const shouldAdvance =
    currentState === "Session" || currentState === "Prep";

  try {
    await updateSessionFields(id, {
      debriefJson: body.debriefJson,
      // Only patch firefliesUrl if it was explicitly provided.
      firefliesUrl:
        typeof body.firefliesUrl === "string" && body.firefliesUrl.length > 0
          ? body.firefliesUrl
          : undefined,
      state: shouldAdvance ? "Debrief" : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "save_failed";
    console.error(`[sessions/${id}/save-debrief] failed: ${message}`);
    return NextResponse.json(
      { error: "save_failed", message },
      { status: 500 },
    );
  }

  const newState: SessionState | "Unknown" = shouldAdvance
    ? "Debrief"
    : currentState;

  return NextResponse.json({
    ok: true,
    state: newState,
    advanced: shouldAdvance,
  });
}
