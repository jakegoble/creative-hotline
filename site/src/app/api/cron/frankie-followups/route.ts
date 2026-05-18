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
 * Late-booking edge case: anyone who books <23h before their call would
 * otherwise miss this cron entirely (next run is after the call). The
 * Calendly webhook now fires the same processSession() inline for those
 * cases — see /api/calendly/webhook. This cron remains the safety net.
 *
 * Idempotency: writes Intake Nudge Sent / Caller Prep Sent checkboxes back to
 * Notion after a successful send. Re-runs are safe — already-sent guards
 * short-circuit. The inline-fire and the nightly sweep cooperate cleanly.
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
import {
  getSessionsByState,
  type SessionRecord,
} from "@/lib/services/notion-sessions-read";
import {
  processSession,
  type SessionResult,
  type Skipped,
} from "@/lib/email/frankie-followups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Bearer-token auth check. Trims both the env value and the header token
 * before compare to defend against copy-paste whitespace mishaps. Refuses if
 * the env var is unset — we never run open.
 */
function checkAuth(request: Request): boolean {
  const expected = (process.env.CRON_SECRET ?? "").trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!/^Bearer\s+/i.test(header)) return false;
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token === expected;
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
