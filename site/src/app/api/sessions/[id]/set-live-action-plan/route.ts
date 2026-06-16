/**
 * POST /api/sessions/[id]/set-live-action-plan
 *
 * Body: { version: number }
 *
 * Makes an archived Action Plan version the LIVE one (non-destructive). Repoints
 * `current` and mirrors that version's json into "Action Plan JSON" (the field
 * the public action-plan page renders). Behind the version switcher / restore.
 */

import { NextResponse } from "next/server";
import { getSessionById } from "@/lib/services/notion-sessions-read";
import { updateSessionFields } from "@/lib/services/notion-sessions-write";
import { parseVersions, setLive } from "@/lib/services/versioning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  let version: number;
  try {
    const body = (await request.json()) as { version?: number };
    if (body.version == null) {
      return NextResponse.json({ error: "missing_version" }, { status: 400 });
    }
    version = Number(body.version);
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  const session = await getSessionById(id).catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const blob = parseVersions(session.actionPlanVersionsJson);
  const { blob: nextBlob, json } = setLive(blob, version);
  if (json == null) {
    return NextResponse.json({ error: "version_not_found", version }, { status: 404 });
  }

  try {
    await updateSessionFields(id, {
      actionPlanJson: json,
      actionPlanVersionsJson: JSON.stringify(nextBlob),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "set_live_failed";
    return NextResponse.json({ error: "set_live_failed", message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, liveVersion: version });
}
