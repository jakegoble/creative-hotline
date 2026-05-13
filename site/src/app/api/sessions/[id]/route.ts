/**
 * GET /api/sessions/[id]
 *
 * Returns a single Session row enriched with a lightweight Payment summary so
 * the Live Workshop screen can show client name / product / scheduled-at in
 * its header. Includes the existing `workshopJson` blob so the screen can
 * resume mid-workshop if reloaded.
 *
 * Response shape:
 *   {
 *     id, sessionId, clientName, state, scheduledAt,
 *     workshopJson: string,      // empty string if never saved
 *     debriefJson: string,       // empty string if never saved
 *     actionPlanJson: string,    // empty string if never generated
 *     actionPlanUrl: string|null,
 *     firefliesUrl: string|null,
 *     payment: { id, email, product, amount } | null
 *   }
 *
 * V2 Batch 4 — Live Workshop screen.
 * V2 Batch 5 — added debriefJson + firefliesUrl in response.
 * V2 Batch 6 — added actionPlanJson + actionPlanUrl in response.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import { getSessionById } from "@/lib/services/notion-sessions-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _client: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_client) _client = new NotionClient({ auth: config.notion.apiKey });
  return _client;
}

interface PaymentSummary {
  id: string;
  email: string;
  product: string;
  amount: number;
}

async function fetchPaymentSummary(id: string): Promise<PaymentSummary | null> {
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: id,
    })) as PageObjectResponse;
    const p = page.properties;
    const email = p["Email"]?.type === "email" ? p["Email"].email ?? "" : "";
    const product =
      p["Product Purchased"]?.type === "select" && p["Product Purchased"].select
        ? p["Product Purchased"].select.name
        : "";
    const amount =
      p["Payment Amount"]?.type === "number" && p["Payment Amount"].number !== null
        ? p["Payment Amount"].number
        : 0;
    return { id: page.id, email, product, amount };
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

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

  const paymentId = session.linkedPaymentIds[0];
  const payment = paymentId ? await fetchPaymentSummary(paymentId) : null;

  return NextResponse.json({
    id: session.id,
    sessionId: session.sessionId,
    clientName: session.clientName,
    state: session.state,
    scheduledAt: session.scheduledAt,
    workshopJson: session.workshopJson,
    debriefJson: session.debriefJson,
    actionPlanJson: session.actionPlanJson,
    actionPlanUrl: session.actionPlanUrl ?? null,
    firefliesUrl: session.firefliesUrl ?? null,
    payment,
  });
}
