/**
 * POST /api/research-brief/set-live
 *
 * Body: { intakeId: string, version: number }
 *
 * Makes an archived Research Brief version the LIVE one (non-destructive: no
 * version is deleted; we just repoint `current` and mirror that version's json
 * into the "Research Brief JSON" field every reader uses). This is the "show
 * which is live" / restore control behind the version switcher.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import { updateIntakeResearchBrief } from "@/lib/services/notion-intake-write";
import { parseVersions, setLive } from "@/lib/services/versioning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _client: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_client) _client = new NotionClient({ auth: config.notion.apiKey });
  return _client;
}
function getText(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "rich_text" ? v.rich_text.map((t) => t.plain_text).join("") : "";
}

export async function POST(request: Request) {
  let intakeId: string;
  let version: number;
  try {
    const body = (await request.json()) as { intakeId?: string; version?: number };
    if (!body.intakeId || body.version == null) {
      return NextResponse.json({ error: "missing_intakeId_or_version" }, { status: 400 });
    }
    intakeId = body.intakeId;
    version = Number(body.version);
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  let page: PageObjectResponse;
  try {
    page = (await getNotion().pages.retrieve({ page_id: intakeId })) as PageObjectResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : "intake_fetch_failed";
    return NextResponse.json({ error: "intake_fetch_failed", message }, { status: 404 });
  }

  const blob = parseVersions(getText(page.properties, "Research Brief Versions JSON"));
  const { blob: nextBlob, json } = setLive(blob, version);
  if (json == null) {
    return NextResponse.json({ error: "version_not_found", version }, { status: 404 });
  }

  try {
    await updateIntakeResearchBrief(intakeId, {
      status: "Ready",
      json,
      versionsJson: JSON.stringify(nextBlob),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "set_live_failed";
    return NextResponse.json({ error: "set_live_failed", message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, liveVersion: version });
}
