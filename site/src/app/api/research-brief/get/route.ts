/**
 * GET /api/research-brief/get?intakeId=<page_id>
 *
 * Returns the persisted Research Brief JSON from a given Intake page. Used by
 * the Morning Prep dashboard's "View Brief" expander.
 *
 * Response:
 *   { intakeId, status, generatedAt?, json? }
 *
 * V2 Batch 3b.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import { parseVersions, versionSummaries } from "@/lib/services/versioning";

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
function getSelect(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "select" && v.select ? v.select.name : "";
}
function getDate(p: PageObjectResponse["properties"], key: string): string | undefined {
  const v = p[key];
  return v?.type === "date" && v.date?.start ? v.date.start : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const intakeId = url.searchParams.get("intakeId");
  if (!intakeId) {
    return NextResponse.json({ error: "missing_intakeId" }, { status: 400 });
  }

  try {
    const page = (await getNotion().pages.retrieve({
      page_id: intakeId,
    })) as PageObjectResponse;
    const p = page.properties;
    const blob = parseVersions(getText(p, "Research Brief Versions JSON"));
    const liveJson = getText(p, "Research Brief JSON") || null;
    // Optional ?version=N — return that archived version's json WITHOUT making
    // it live (lets the viewer preview an older version before restoring it).
    const wantVersion = url.searchParams.get("version");
    let json = liveJson;
    if (wantVersion) {
      const v = blob.versions.find((x) => String(x.n) === String(wantVersion));
      json = v ? v.json : liveJson;
    }
    return NextResponse.json({
      intakeId,
      status: getSelect(p, "Research Brief Status") || "Not Generated",
      generatedAt: getDate(p, "Research Brief Generated At"),
      json,
      // Version metadata for the viewer's badge + switcher (empty when never
      // regenerated, or when the "Research Brief Versions JSON" prop is absent).
      liveVersion: blob.current || null,
      viewingVersion: wantVersion ? Number(wantVersion) : (blob.current || null),
      versions: versionSummaries(blob),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "intake_fetch_failed";
    return NextResponse.json(
      { error: "intake_fetch_failed", message },
      { status: 404 },
    );
  }
}
