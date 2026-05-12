/**
 * POST /api/sessions/from-payment
 *
 * Manually promote a Payment row to a Session row. Used by the Morning Prep
 * dashboard's admin form until the Calendly webhook is wired (Batch 4+).
 *
 * Idempotent — if a Session already exists for this Payment, returns the
 * existing one (created: false).
 *
 * Body: {
 *   paymentId: string,         // Notion Payment page ID
 *   scheduledAt: string,       // ISO date or datetime
 *   intakeId?: string,         // Notion Intake page ID (if linked)
 *   state?: SessionState       // Defaults to "Prep"
 * }
 *
 * V2 Batch 3b.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import {
  createSession,
  type SessionState,
} from "@/lib/services/notion-sessions-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _client: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_client) _client = new NotionClient({ auth: config.notion.apiKey });
  return _client;
}

interface PromoteBody {
  paymentId?: string;
  scheduledAt?: string;
  intakeId?: string;
  state?: SessionState;
}

export async function POST(request: Request) {
  let body: PromoteBody;
  try {
    body = (await request.json()) as PromoteBody;
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  if (!body.paymentId) {
    return NextResponse.json({ error: "missing_paymentId" }, { status: 400 });
  }
  if (!body.scheduledAt) {
    return NextResponse.json({ error: "missing_scheduledAt" }, { status: 400 });
  }

  // Pull the payment to get the client name + product (used for Session title).
  let clientName = "Unknown Client";
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: body.paymentId,
    })) as PageObjectResponse;
    const p = page.properties;
    const titleProp = p["Client Name"];
    const titleValue =
      titleProp?.type === "title"
        ? titleProp.title.map((t) => t.plain_text).join("")
        : "";
    const productProp = p["Product Purchased"];
    const productValue =
      productProp?.type === "select" && productProp.select
        ? productProp.select.name
        : "";
    clientName =
      titleValue && productValue
        ? `${titleValue} — ${productValue}`
        : titleValue || clientName;
  } catch (err) {
    const message = err instanceof Error ? err.message : "payment_not_found";
    return NextResponse.json({ error: "payment_not_found", message }, { status: 404 });
  }

  try {
    const result = await createSession({
      clientName,
      scheduledAt: body.scheduledAt,
      paymentPageId: body.paymentId,
      intakePageId: body.intakeId,
      state: body.state ?? "Prep",
    });
    return NextResponse.json({
      ok: true,
      sessionId: result.pageId,
      created: result.created,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "session_create_failed";
    console.error(`[sessions/from-payment] failed for payment ${body.paymentId}: ${message}`);
    return NextResponse.json(
      { error: "session_create_failed", message },
      { status: 500 },
    );
  }
}
