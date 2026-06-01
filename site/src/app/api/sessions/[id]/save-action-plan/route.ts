/**
 * POST /api/sessions/[id]/save-action-plan
 *
 * Persists Review Dashboard inline EDITS to the action plan using a safe
 * OVERRIDE model. Megha + Jake can edit section text on the dashboard
 * (feedback #4 — "we can approve but cannot edit, and that's critical").
 *
 * To protect the structured action-plan JSON that the public render
 * (action-plan.html) and the Frankie send pipeline depend on, edits are NOT
 * written back into the structured fields. Instead they're merged into a
 * top-level `editedSections` map keyed by the dashboard section key
 * (northStar, whatWeLearned, whatWeLove, …). Renderers check that map FIRST
 * and fall back to the structured render when no override exists.
 *
 * Body: {
 *   editedSections: { [sectionKey: string]: string }  // plain-text overrides
 * }
 *
 * The route reads the current actionPlanJson, sets parsed.editedSections to
 * the merged map (existing overrides ∪ incoming), and writes the whole blob
 * back. It NEVER overwrites the structured section fields. Empty-string
 * overrides delete that key (so an operator can revert to the structured copy).
 *
 * Response: { ok: true, keys: string[] }
 *
 * Modeled on approvals/route.ts (validation + Notion write) and
 * save-debrief/route.ts (read-current-then-write pattern).
 *
 * V2 — added 2026-06-01 for the editable Review Dashboard.
 */

import { NextResponse } from "next/server";
import { getSessionById } from "@/lib/services/notion-sessions-read";
import { updateSessionFields } from "@/lib/services/notion-sessions-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

interface Body {
  editedSections?: unknown;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  // Validate the override map: must be an object of string → string.
  const incoming = body.editedSections;
  if (incoming === null || typeof incoming !== "object" || Array.isArray(incoming)) {
    return NextResponse.json(
      {
        error: "invalid_editedSections",
        message: "editedSections must be an object of { sectionKey: string }",
      },
      { status: 400 },
    );
  }
  const incomingMap = incoming as Record<string, unknown>;
  for (const [k, v] of Object.entries(incomingMap)) {
    if (typeof v !== "string") {
      return NextResponse.json(
        {
          error: "invalid_editedSections_value",
          message: `editedSections["${k}"] must be a string`,
        },
        { status: 400 },
      );
    }
  }

  // Read the current action plan so we MERGE overrides rather than clobbering
  // the structured fields (Send + public render depend on them).
  let session;
  try {
    session = await getSessionById(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "session_fetch_failed";
    return NextResponse.json(
      { error: "session_fetch_failed", message },
      { status: 500 },
    );
  }
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  // Parse the existing structured plan. If there's no plan yet there's nothing
  // to override — refuse rather than create a phantom plan.
  let parsed: Record<string, unknown>;
  if (!session.actionPlanJson) {
    return NextResponse.json(
      { error: "no_action_plan", message: "Generate the action plan before editing." },
      { status: 409 },
    );
  }
  try {
    const p = JSON.parse(session.actionPlanJson);
    if (p === null || typeof p !== "object" || Array.isArray(p)) {
      throw new Error("not_an_object");
    }
    parsed = p as Record<string, unknown>;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "actionPlanJson_not_parseable";
    return NextResponse.json(
      { error: "invalid_actionPlanJson", message },
      { status: 500 },
    );
  }

  // Merge: start from existing overrides, apply incoming. An empty-string
  // value REMOVES the override (revert to structured copy).
  const existing =
    parsed.editedSections && typeof parsed.editedSections === "object" && !Array.isArray(parsed.editedSections)
      ? (parsed.editedSections as Record<string, string>)
      : {};
  const merged: Record<string, string> = { ...existing };
  for (const [k, v] of Object.entries(incomingMap)) {
    const text = v as string;
    if (text.trim() === "") {
      delete merged[k];
    } else {
      merged[k] = text;
    }
  }
  parsed.editedSections = merged;

  const nextJson = JSON.stringify(parsed);
  // richText() chunks at 2000 chars, so large plans are fine. Guard against a
  // pathological blob that would blow past Notion's per-property limits.
  if (nextJson.length > 90000) {
    return NextResponse.json(
      { error: "actionPlanJson_too_large", message: `${nextJson.length} chars` },
      { status: 413 },
    );
  }

  try {
    await updateSessionFields(id, { actionPlanJson: nextJson });
  } catch (err) {
    const message = err instanceof Error ? err.message : "notion_write_failed";
    console.error(`[sessions/${id}/save-action-plan] failed: ${message}`);
    return NextResponse.json(
      { error: "notion_write_failed", message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, keys: Object.keys(merged) });
}
