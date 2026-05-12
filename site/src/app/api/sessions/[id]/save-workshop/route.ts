/**
 * POST /api/sessions/[id]/save-workshop
 *
 * Persists the live workshop JSON blob to the Session row's
 * "Workshop Session JSON" rich_text field. On the FIRST save of a Session
 * (state === "Prep"), implicitly advances state to "Session". Subsequent
 * saves leave the state alone — they're just autosave updates.
 *
 * Idempotent: safe to call repeatedly with the same blob.
 *
 * Body: { workshopJson: string }   // serialized JSON blob (see schema below)
 *
 * Response: { ok: true, state: SessionState, advanced: boolean }
 *
 * Workshop JSON schema (v1):
 *   {
 *     version: 1,
 *     northStar: string,
 *     ideas: [
 *       {
 *         id: string,
 *         text: string,
 *         quadrant: "quick_wins" | "big_bets" | "fill_ins" | "time_sinks" | null,
 *         pathA: string,    // DIY notes
 *         pathB: string,    // Level Up notes
 *         createdAt: string  // ISO timestamp
 *       }
 *     ],
 *     updatedAt: string
 *   }
 *
 * V2 Batch 4 — Live Workshop screen.
 */

import { NextResponse } from "next/server";
import {
  getSessionById,
} from "@/lib/services/notion-sessions-read";
import {
  updateSessionFields,
  type SessionState,
} from "@/lib/services/notion-sessions-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveBody {
  workshopJson?: string;
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

  if (typeof body.workshopJson !== "string") {
    return NextResponse.json(
      { error: "missing_workshopJson" },
      { status: 400 },
    );
  }

  // Validate the blob is parseable JSON — protects against corrupted writes.
  try {
    JSON.parse(body.workshopJson);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid_blob_json";
    return NextResponse.json(
      { error: "workshopJson_not_parseable", message },
      { status: 400 },
    );
  }

  // Look up the current state so we know whether to auto-advance Prep → Session.
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

  const shouldAdvance = currentState === "Prep";

  try {
    await updateSessionFields(id, {
      workshopJson: body.workshopJson,
      // Only patch state when actually advancing — avoids unnecessary writes.
      state: shouldAdvance ? "Session" : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "save_failed";
    console.error(
      `[sessions/${id}/save-workshop] failed: ${message}`,
    );
    return NextResponse.json(
      { error: "save_failed", message },
      { status: 500 },
    );
  }

  // Return what the state IS after the save (post-advance if applicable).
  const newState: SessionState | "Unknown" = shouldAdvance
    ? "Session"
    : currentState;

  return NextResponse.json({
    ok: true,
    state: newState,
    advanced: shouldAdvance,
  });
}
