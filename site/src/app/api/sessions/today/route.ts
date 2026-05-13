/**
 * GET /api/sessions/today
 *
 * Returns today's sessions enriched with linked Payment + Intake summaries
 * and research-brief status. The Morning Prep dashboard polls this on load.
 *
 * Query params:
 *   ?date=YYYY-MM-DD  override "today" (useful for testing). Defaults to UTC today.
 *
 * Response shape:
 *   {
 *     date: "2026-05-12",
 *     sessions: [
 *       {
 *         id, sessionId, clientName, state, scheduledAt,
 *         payment: { id, email, amount, product, status } | null,
 *         intake: { id, status, briefStatus, briefGeneratedAt } | null,
 *         hasBrief: boolean
 *       },
 *       ...
 *     ]
 *   }
 *
 * V2 Batch 3b.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import { getSessionsForDate } from "@/lib/services/notion-sessions-read";
import { findIntakeIdByEmail } from "@/lib/services/notion-intake-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _client: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_client) _client = new NotionClient({ auth: config.notion.apiKey });
  return _client;
}

// Lightweight property extractors for inline payment/intake fetches.
function getTitle(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "title" ? v.title.map((t) => t.plain_text).join("") : "";
}
function getEmail(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "email" && v.email ? v.email : "";
}
function getNumber(p: PageObjectResponse["properties"], key: string): number {
  const v = p[key];
  return v?.type === "number" && v.number !== null ? v.number : 0;
}
function getSelect(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "select" && v.select ? v.select.name : "";
}
function getDate(p: PageObjectResponse["properties"], key: string): string | undefined {
  const v = p[key];
  return v?.type === "date" && v.date?.start ? v.date.start : undefined;
}

interface PaymentSummary {
  id: string;
  clientName: string;
  email: string;
  amount: number;
  product: string;
  status: string;
}

interface IntakeSummary {
  id: string;
  status: string;
  briefStatus: string;
  briefGeneratedAt?: string;
}

async function fetchPayment(id: string): Promise<PaymentSummary | null> {
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: id,
    })) as PageObjectResponse;
    const p = page.properties;
    return {
      id: page.id,
      clientName: getTitle(p, "Client Name"),
      email: getEmail(p, "Email"),
      amount: getNumber(p, "Payment Amount"),
      product: getSelect(p, "Product Purchased"),
      status: getSelect(p, "Status"),
    };
  } catch {
    return null;
  }
}

async function fetchIntake(id: string): Promise<IntakeSummary | null> {
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: id,
    })) as PageObjectResponse;
    const p = page.properties;
    return {
      id: page.id,
      status: getSelect(p, "Intake Status"),
      briefStatus: getSelect(p, "Research Brief Status") || "Not Generated",
      briefGeneratedAt: getDate(p, "Research Brief Generated At"),
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date") ?? undefined;
  // tz offset in minutes west of UTC (matches JS `Date.getTimezoneOffset()`).
  // PT = +420, ET = +240. Defaults to 0 (interpret date as UTC) for callers
  // that don't send it.
  const tzParam = url.searchParams.get("tz");
  const tzOffsetMinutes = tzParam ? Number(tzParam) : 0;

  let sessions;
  try {
    sessions = await getSessionsForDate(
      dateParam,
      Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "sessions_query_failed";
    return NextResponse.json({ error: "sessions_query_failed", message }, { status: 500 });
  }

  // Enrich each session with payment + intake summaries (parallel per-session).
  // When no Intake is linked, attempt an email-based auto-detect against the
  // payment's email — surfaces as `suggestedIntakeId` so the dashboard can
  // offer a one-click "Link Intake" button.
  const enriched = await Promise.all(
    sessions.map(async (s) => {
      const [payment, intake] = await Promise.all([
        s.linkedPaymentIds[0] ? fetchPayment(s.linkedPaymentIds[0]) : null,
        s.linkedIntakeIds[0] ? fetchIntake(s.linkedIntakeIds[0]) : null,
      ]);

      let suggestedIntakeId: string | null = null;
      if (!intake && payment?.email) {
        try {
          suggestedIntakeId = await findIntakeIdByEmail(payment.email);
        } catch {
          suggestedIntakeId = null;
        }
      }

      const briefStatus = intake?.briefStatus ?? "Not Generated";
      return {
        id: s.id,
        sessionId: s.sessionId,
        clientName: s.clientName,
        state: s.state,
        scheduledAt: s.scheduledAt,
        // Surface debrief / action-plan presence so Morning Prep can show
        // state-aware nav buttons without a second round-trip per row.
        hasDebrief: s.debriefJson.length > 0,
        actionPlanUrl: s.actionPlanUrl ?? null,
        payment,
        intake,
        suggestedIntakeId,
        hasBrief: briefStatus === "Ready",
        briefStatus,
      };
    }),
  );

  return NextResponse.json({
    date: dateParam ?? new Date().toISOString().slice(0, 10),
    count: enriched.length,
    sessions: enriched,
  });
}
