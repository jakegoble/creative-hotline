/**
 * POST /api/sessions/link-intake
 *
 * Link an Intake row to a Session row. Used by the Morning Prep dashboard's
 * "Link Intake" button, which fires when the API has auto-detected an Intake
 * by email match against the session's payment.
 *
 * Body: { sessionId: string, intakeId: string }
 *
 * V2 Batch 3b — auto-link extension.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _client: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_client) _client = new NotionClient({ auth: config.notion.apiKey });
  return _client;
}

interface LinkBody {
  sessionId?: string;
  intakeId?: string;
}

export async function POST(request: Request) {
  let body: LinkBody;
  try {
    body = (await request.json()) as LinkBody;
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }
  if (!body.sessionId) {
    return NextResponse.json({ error: "missing_sessionId" }, { status: 400 });
  }
  if (!body.intakeId) {
    return NextResponse.json({ error: "missing_intakeId" }, { status: 400 });
  }

  try {
    await getNotion().pages.update({
      page_id: body.sessionId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      properties: {
        "Linked Intake": { relation: [{ id: body.intakeId }] },
      } as any,
    });
    return NextResponse.json({
      ok: true,
      sessionId: body.sessionId,
      intakeId: body.intakeId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "link_failed";
    console.error(`[sessions/link-intake] failed for session ${body.sessionId}: ${message}`);
    return NextResponse.json({ error: "link_failed", message }, { status: 500 });
  }
}
