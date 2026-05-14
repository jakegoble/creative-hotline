/**
 * GET/POST /api/cron/frankie-followups
 *
 * Nightly cron that fires Frankie #2 (Intake Nudge) + Frankie #3 (Caller Prep)
 * for sessions that are coming up. Scheduled via vercel.json cron at 23:00 UTC
 * (16:00 PT) so the night-before caller-prep email lands during the evening.
 *
 * For every Session row in state "Prep":
 *   • If scheduledAt is within (now, now + 30h] AND intake has not been
 *     submitted AND intakeNudgeSent === false → send Intake Nudge.
 *   • If scheduledAt is within (now, now + 30h] AND callerPrepSent === false
 *     → send Caller Prep one-pager.
 *
 * Idempotency: writes Intake Nudge Sent / Caller Prep Sent checkboxes back to
 * Notion after a successful send. Re-runs are safe.
 *
 * Auth: Vercel attaches `Authorization: Bearer <CRON_SECRET>` to cron requests.
 *       Manual hits must include the same header. 401 otherwise.
 *
 * Response shape:
 *   {
 *     ok: true,
 *     processed: number,
 *     results: [
 *       { sessionId, clientName, intakeNudge?: {ok,reason}, callerPrep?: {ok,reason} }
 *     ],
 *     skipped: [{sessionId, reason}]
 *   }
 *
 * V2 Round B — Frankie followups scheduling.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import {
  getSessionsByState,
  type SessionRecord,
} from "@/lib/services/notion-sessions-read";
import { updateSessionFields } from "@/lib/services/notion-sessions-write";
import { findIntakeIdByEmail } from "@/lib/services/notion-intake-read";
import {
  sendIntakeNudge,
  sendCallerPrep,
} from "@/lib/email/send-frankie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

let _notion: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_notion) _notion = new NotionClient({ auth: config.notion.apiKey });
  return _notion;
}

interface PaymentLite {
  email: string;
  clientName: string;
}

async function fetchPaymentLite(id: string): Promise<PaymentLite | null> {
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: id,
    })) as PageObjectResponse;
    const p = page.properties;
    const email = p["Email"]?.type === "email" ? p["Email"].email ?? "" : "";
    const clientName =
      p["Client Name"]?.type === "title"
        ? p["Client Name"].title.map((t) => t.plain_text).join("")
        : "";
    return { email, clientName };
  } catch {
    return null;
  }
}

async function fetchIntakeStatus(id: string): Promise<string | null> {
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: id,
    })) as PageObjectResponse;
    const p = page.properties;
    const status =
      p["Intake Status"]?.type === "select" && p["Intake Status"].select
        ? p["Intake Status"].select.name
        : null;
    return status;
  } catch {
    return null;
  }
}

/**
 * Whether the intake has been submitted. Returns true ONLY when we can prove
 * a submission exists. Missing intake / missing status / explicit "Pending"
 * all return false → nudge will fire.
 */
async function isIntakeSubmitted(
  session: SessionRecord,
  paymentEmail: string,
): Promise<boolean> {
  let intakeId: string | null = session.linkedIntakeIds[0] ?? null;
  if (!intakeId && paymentEmail) {
    intakeId = await findIntakeIdByEmail(paymentEmail).catch(() => null);
  }
  if (!intakeId) return false;
  const status = await fetchIntakeStatus(intakeId);
  if (!status) return false;
  // "Submitted" / "Complete" / "Reviewed" — anything past raw submission counts.
  return /submitted|complete|reviewed|done/i.test(status);
}

function formatSessionTime(iso?: string): string {
  if (!iso) return "soon";
  try {
    const d = new Date(iso);
    // Pacific Time pretty-print: "Wednesday at 10:00 AM PT"
    const day = d.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "America/Los_Angeles",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
    });
    return `${day} at ${time} PT`;
  } catch {
    return iso;
  }
}

/**
 * Check whether a session falls within the followup window.
 *   Window: now < scheduledAt <= now + 30h
 * 30h is wide enough to catch sessions across the daily cron run + slop.
 */
function inFollowupWindow(scheduledAt: string | undefined, now: Date): boolean {
  if (!scheduledAt) return false;
  const t = new Date(scheduledAt).getTime();
  const nowMs = now.getTime();
  const HOUR_MS = 60 * 60 * 1000;
  return t > nowMs && t <= nowMs + 30 * HOUR_MS;
}

interface SessionResult {
  sessionId: string;
  clientName: string;
  intakeNudge?: { ok: boolean; reason?: string };
  callerPrep?: { ok: boolean; reason?: string };
}

interface Skipped {
  sessionId: string;
  reason: string;
}

async function processSession(
  session: SessionRecord,
  now: Date,
): Promise<{ result?: SessionResult; skipped?: Skipped }> {
  // Only Prep state — once the workshop has started we don't pre-nudge anymore.
  if (session.state !== "Prep") {
    return { skipped: { sessionId: session.id, reason: `state_${session.state}` } };
  }
  if (!inFollowupWindow(session.scheduledAt, now)) {
    return {
      skipped: { sessionId: session.id, reason: "outside_window" },
    };
  }
  // Need a Payment row for email + name.
  const paymentId = session.linkedPaymentIds[0];
  if (!paymentId) {
    return { skipped: { sessionId: session.id, reason: "no_payment" } };
  }
  const payment = await fetchPaymentLite(paymentId);
  if (!payment || !payment.email) {
    return { skipped: { sessionId: session.id, reason: "no_payment_email" } };
  }

  const firstName =
    (payment.clientName.split(/\s+/)[0] || "").trim() ||
    payment.email.split("@")[0];
  const sessionTime = formatSessionTime(session.scheduledAt);

  const result: SessionResult = {
    sessionId: session.id,
    clientName: payment.clientName || session.clientName,
  };

  // -------- Intake Nudge --------
  if (!session.intakeNudgeSent) {
    const submitted = await isIntakeSubmitted(session, payment.email);
    if (!submitted) {
      const sent = await sendIntakeNudge({
        email: payment.email,
        firstName,
        sessionTime,
        tallyUrl: config.frankieEmails.tallyUrl,
      });
      result.intakeNudge = sent;
      if (sent.ok) {
        try {
          await updateSessionFields(session.id, { intakeNudgeSent: true });
        } catch (err) {
          console.error(
            `[cron/frankie-followups] failed to mark intakeNudgeSent on ${session.id}: ${err instanceof Error ? err.message : "unknown"}`,
          );
        }
      }
    } else {
      result.intakeNudge = { ok: false, reason: "intake_submitted" };
    }
  } else {
    result.intakeNudge = { ok: false, reason: "already_sent" };
  }

  // -------- Caller Prep --------
  if (!session.callerPrepSent) {
    const sent = await sendCallerPrep({
      email: payment.email,
      firstName,
      sessionTime,
    });
    result.callerPrep = sent;
    if (sent.ok) {
      try {
        await updateSessionFields(session.id, { callerPrepSent: true });
      } catch (err) {
        console.error(
          `[cron/frankie-followups] failed to mark callerPrepSent on ${session.id}: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }
  } else {
    result.callerPrep = { ok: false, reason: "already_sent" };
  }

  return { result };
}

function checkAuth(request: Request): boolean {
  const expected = process.env.CRON_SECRET || "";
  if (!expected) return false; // refuse if unconfigured — never run in the open
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${expected}`;
}

async function handle(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json(
      { error: "unauthorized", message: "Missing or invalid Bearer CRON_SECRET." },
      { status: 401 },
    );
  }

  const now = new Date();
  let sessions: SessionRecord[];
  try {
    sessions = await getSessionsByState("Prep");
  } catch (err) {
    const message = err instanceof Error ? err.message : "sessions_query_failed";
    return NextResponse.json({ error: "sessions_query_failed", message }, { status: 500 });
  }

  const results: SessionResult[] = [];
  const skipped: Skipped[] = [];
  for (const session of sessions) {
    const { result, skipped: skip } = await processSession(session, now);
    if (result) results.push(result);
    if (skip) skipped.push(skip);
  }

  console.log(
    `[cron/frankie-followups] scanned=${sessions.length} processed=${results.length} skipped=${skipped.length}`,
  );

  return NextResponse.json({
    ok: true,
    now: now.toISOString(),
    scanned: sessions.length,
    processed: results.length,
    results,
    skipped,
  });
}

export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}
