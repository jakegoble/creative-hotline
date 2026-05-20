/**
 * GET /api/sessions/[id]/transcript
 *
 * Client-safe transcript delivery. Returns ONLY the plain-text transcript of
 * the session's call — never the Fireflies URL, meeting ID, or any other
 * tool/workspace surface. Powers the client-facing
 * /templates-v2/transcript.html view linked from the Action Plan, so a client
 * can read their own call transcript without being handed a raw Fireflies link
 * (which would expose the internal Fireflies workspace).
 *
 * Response shapes (always 200 unless the session itself can't be found):
 *   { ok: true,  title: string, text: string }
 *   { ok: false, reason: string }            // no transcript yet / not ready
 *   404 { ok: false, reason: "session_not_found" }
 */

import { NextResponse } from "next/server";
import { getSessionById } from "@/lib/services/notion-sessions-read";
import { fetchTranscriptText } from "@/lib/services/fireflies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });
  }

  const session = await getSessionById(id).catch(() => null);
  if (!session) {
    return NextResponse.json({ ok: false, reason: "session_not_found" }, { status: 404 });
  }

  // No Fireflies URL on the session → no transcript to show yet. Don't leak that
  // a URL is/ isn't present beyond a friendly message.
  if (!session.firefliesUrl) {
    return NextResponse.json({
      ok: false,
      reason: "No transcript is available for this session yet.",
    });
  }

  const fetched = await fetchTranscriptText(session.firefliesUrl);
  if (!fetched.ok) {
    // Could be "still processing" or a config issue — keep it client-friendly.
    return NextResponse.json({
      ok: false,
      reason: "Your transcript isn't ready yet. Check back a little later.",
    });
  }

  // Return ONLY the human-readable text + a title. Deliberately omit the
  // Fireflies id / transcript_url so nothing internal reaches the client.
  return NextResponse.json({ ok: true, title: fetched.title || "", text: fetched.text });
}
