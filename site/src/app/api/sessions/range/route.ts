/**
 * GET /api/sessions/range
 *
 * Returns sessions whose Session Date falls within [start, end] (inclusive).
 * Powers the V2 side-nav (past / today / upcoming list + mini-calendar).
 *
 * Query params:
 *   ?start=YYYY-MM-DD  required, inclusive lower bound
 *   ?end=YYYY-MM-DD    required, inclusive upper bound (interpreted as end-of-day UTC)
 *
 * Response shape (lightweight — no payment/intake enrichment, the side-nav
 * doesn't need it and we want the round-trip cheap):
 *   {
 *     start, end, count,
 *     sessions: [
 *       { id, sessionId, clientName, state, scheduledAt }, ...
 *     ]
 *   }
 *
 * Side-nav infra · V2.
 */

import { NextResponse } from "next/server";
import { getSessionsInRange } from "@/lib/services/notion-sessions-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const start = url.searchParams.get("start") ?? "";
  const end = url.searchParams.get("end") ?? "";

  if (!isValidDate(start) || !isValidDate(end)) {
    return NextResponse.json(
      { error: "invalid_date_range", message: "start and end must be YYYY-MM-DD" },
      { status: 400 },
    );
  }
  if (start > end) {
    return NextResponse.json(
      { error: "invalid_date_range", message: "start must be <= end" },
      { status: 400 },
    );
  }

  // Treat range as UTC days: start at 00:00:00Z, end at 23:59:59Z.
  const startIso = `${start}T00:00:00.000Z`;
  const endIso = `${end}T23:59:59.999Z`;

  let sessions;
  try {
    sessions = await getSessionsInRange(startIso, endIso);
  } catch (err) {
    const message = err instanceof Error ? err.message : "sessions_query_failed";
    return NextResponse.json(
      { error: "sessions_query_failed", message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    start,
    end,
    count: sessions.length,
    sessions: sessions.map((s) => ({
      id: s.id,
      sessionId: s.sessionId,
      clientName: s.clientName,
      state: s.state,
      scheduledAt: s.scheduledAt,
    })),
  });
}
