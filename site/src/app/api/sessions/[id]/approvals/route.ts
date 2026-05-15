/**
 * POST /api/sessions/[id]/approvals
 *
 * Persists Review Dashboard approval state to Notion so M and J can see each
 * other's progress across browsers. Previously approvals + sign-offs lived
 * in localStorage only, which meant if Megha approved sections on her
 * machine and Jake reviewed on his, neither saw the other's state.
 *
 * Body shape:
 *   {
 *     approvalsJson: string  // JSON stringified
 *       { approvals: { [idx]: { m?: boolean; j?: boolean } },
 *         signoff:   { m?: boolean; j?: boolean } }
 *   }
 *
 * The route validates that the payload is parseable JSON and writes the
 * full blob to the Session row's "Approvals JSON" property. Caller is
 * responsible for merge logic (the review dashboard always sends the full
 * blob).
 *
 * V2 — added 2026-05-15 alongside the cross-browser collab sync.
 */

import { NextResponse } from "next/server";
import { updateSessionFields } from "@/lib/services/notion-sessions-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

interface Body {
  approvalsJson?: unknown;
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
    return NextResponse.json(
      { error: "invalid_json_body" },
      { status: 400 },
    );
  }

  const json = body.approvalsJson;
  if (typeof json !== "string") {
    return NextResponse.json(
      { error: "missing_approvalsJson", message: "approvalsJson must be a string" },
      { status: 400 },
    );
  }

  // Validate the string is parseable JSON before we write it.
  try {
    const parsed = JSON.parse(json);
    if (parsed === null || typeof parsed !== "object") {
      throw new Error("not_an_object");
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "approvalsJson_not_parseable";
    return NextResponse.json(
      { error: "invalid_approvalsJson", message },
      { status: 400 },
    );
  }

  // Notion rich_text fields cap at 2000 chars. Approval blobs are tiny —
  // even 50 sections × 4 booleans is < 2KB. Bail loudly if we ever exceed.
  if (json.length > 2000) {
    return NextResponse.json(
      { error: "approvalsJson_too_large", message: `${json.length} > 2000` },
      { status: 413 },
    );
  }

  try {
    await updateSessionFields(id, { approvalsJson: json });
  } catch (err) {
    const message = err instanceof Error ? err.message : "notion_write_failed";
    return NextResponse.json(
      { error: "notion_write_failed", message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
