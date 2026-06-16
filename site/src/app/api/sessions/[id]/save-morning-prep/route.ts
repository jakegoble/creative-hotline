/**
 * POST /api/sessions/[id]/save-morning-prep
 *
 * Persists the Morning Prep blob (Megha + Jake's populated reads, edits, and
 * section locks) to the Session row's "Morning Prep JSON" rich_text field.
 * This is the write half of the "merge contract": the workshop + action-plan
 * read this back and render the merged Prep values OVER the raw Research Brief,
 * so M+J's prep work actually shows up live (Megha, 2026-06-08).
 *
 * Does NOT change Session state — prep is saved repeatedly during the morning,
 * before the session screen is generated. Idempotent.
 *
 * Body: { prepJson: string }   // serialized blob:
 *   {
 *     version: 2,
 *     fields: { [elementId]: string },   // textareas / inputs
 *     lists:  { [elementId]: string[] }, // draft lists (stop / leave)
 *     locks:  { [elementId]: boolean },  // approved/locked sections persist on regen
 *     updatedAt: string                  // ISO timestamp
 *   }
 *
 * Response: { ok: true } | { error, message }
 *
 * NOTE: requires a "Morning Prep JSON" rich_text property on the Sessions DB.
 * If that property doesn't exist yet, Notion rejects the write and this returns
 * 500 with a clear message — the prep page keeps its localStorage copy and the
 * workshop falls back to the localStorage bridge, so nothing breaks live.
 */

import { NextResponse } from "next/server";
import { getSessionById } from "@/lib/services/notion-sessions-read";
import { updateSessionFields } from "@/lib/services/notion-sessions-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveBody {
  prepJson?: string;
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

  if (typeof body.prepJson !== "string") {
    return NextResponse.json({ error: "missing_prepJson" }, { status: 400 });
  }

  // Guard against corrupted writes — the blob must be valid JSON.
  try {
    JSON.parse(body.prepJson);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid_blob_json";
    return NextResponse.json(
      { error: "prepJson_not_parseable", message },
      { status: 400 },
    );
  }

  // Confirm the session exists before writing (clear 404 vs. a Notion error).
  try {
    const session = await getSessionById(id);
    if (!session) {
      return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "session_fetch_failed";
    return NextResponse.json(
      { error: "session_fetch_failed", message },
      { status: 500 },
    );
  }

  try {
    await updateSessionFields(id, { prepJson: body.prepJson });
  } catch (err) {
    const message = err instanceof Error ? err.message : "save_failed";
    console.error(`[sessions/${id}/save-morning-prep] failed: ${message}`);
    return NextResponse.json(
      { error: "save_failed", message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
