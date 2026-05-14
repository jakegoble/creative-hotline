/**
 * GET /api/sessions/in-review
 *
 * Returns all Sessions currently in the "Review" state, enriched with light
 * Payment + Intake summaries and a parsed `actionPlan` blob (if present).
 *
 * Powers the Review Dashboard sidebar queue + main panel header. Megha + Jake
 * approve sections here before the Send pipeline fires.
 *
 * Query params:
 *   ?includeSent=true   also include "Sent" sessions (defaults to false — Review only)
 *
 * Response shape:
 *   {
 *     count: number,
 *     sessions: [
 *       {
 *         id, sessionId, clientName, state, scheduledAt,
 *         actionPlanGeneratedAt: string|null,
 *         actionPlanSummary: string|null,  // first 200 chars of action-plan opening
 *         hasActionPlan: boolean,
 *         emailSent: boolean,
 *         smsSent: boolean,
 *         sentAt: string|null,
 *         payment: { id, email, product, amount, clientName } | null,
 *       },
 *       ...
 *     ]
 *   }
 *
 * V2 Round A — Review Dashboard live data.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import {
  getSessionsByState,
  type SessionRecord,
} from "@/lib/services/notion-sessions-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _client: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_client) _client = new NotionClient({ auth: config.notion.apiKey });
  return _client;
}

interface PaymentSummary {
  id: string;
  clientName: string;
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
    const clientName =
      p["Client Name"]?.type === "title"
        ? p["Client Name"].title.map((t) => t.plain_text).join("")
        : "";
    const email =
      p["Email"]?.type === "email" ? p["Email"].email ?? "" : "";
    const product =
      p["Product Purchased"]?.type === "select" && p["Product Purchased"].select
        ? p["Product Purchased"].select.name
        : "";
    const amount =
      p["Payment Amount"]?.type === "number" && p["Payment Amount"].number !== null
        ? p["Payment Amount"].number
        : 0;
    return { id: page.id, clientName, email, product, amount };
  } catch {
    return null;
  }
}

/**
 * Pull a 200-char preview out of the action-plan JSON if we can. Used for the
 * sidebar queue so reviewers can eyeball what's drafted without opening it.
 */
function summarizeActionPlan(actionPlanJson: string): {
  summary: string | null;
  generatedAt: string | null;
} {
  if (!actionPlanJson) return { summary: null, generatedAt: null };
  try {
    const parsed = JSON.parse(actionPlanJson);
    // Drafted action plans have either a top-level `northStar` or a
    // `sections[0]` opener. Try both, fall back to the raw first 200 chars.
    let summary: string | null = null;
    if (typeof parsed?.northStar === "string") summary = parsed.northStar;
    else if (Array.isArray(parsed?.sections) && parsed.sections[0]?.body) {
      summary = String(parsed.sections[0].body);
    } else if (parsed?.opening) {
      summary = String(parsed.opening);
    }
    summary = summary ? summary.slice(0, 200) : actionPlanJson.slice(0, 200);
    const generatedAt =
      typeof parsed?.generatedAt === "string" ? parsed.generatedAt : null;
    return { summary, generatedAt };
  } catch {
    return { summary: actionPlanJson.slice(0, 200), generatedAt: null };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeSent = url.searchParams.get("includeSent") === "true";

  let reviewSessions: SessionRecord[] = [];
  let sentSessions: SessionRecord[] = [];
  try {
    reviewSessions = await getSessionsByState("Review");
    if (includeSent) {
      sentSessions = await getSessionsByState("Sent");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "sessions_query_failed";
    return NextResponse.json(
      { error: "sessions_query_failed", message },
      { status: 500 },
    );
  }

  const all = [...reviewSessions, ...sentSessions];

  const enriched = await Promise.all(
    all.map(async (s) => {
      const payment = s.linkedPaymentIds[0]
        ? await fetchPaymentSummary(s.linkedPaymentIds[0])
        : null;
      const { summary, generatedAt } = summarizeActionPlan(s.actionPlanJson);
      return {
        id: s.id,
        sessionId: s.sessionId,
        clientName: s.clientName,
        state: s.state,
        scheduledAt: s.scheduledAt,
        actionPlanGeneratedAt: generatedAt,
        actionPlanSummary: summary,
        hasActionPlan: s.actionPlanJson.length > 0,
        emailSent: s.emailSent,
        smsSent: s.smsSent,
        sentAt: s.sentAt ?? null,
        referralCode: s.referralCode || null,
        payment,
      };
    }),
  );

  return NextResponse.json({ count: enriched.length, sessions: enriched });
}
