/**
 * POST /api/pov/chat — public conversational endpoint for the free POV tool.
 *
 * PUBLIC + UNAUTHENTICATED (whitelisted in middleware), so this route is the
 * wallet-protection layer:
 *   - Per-IP token bucket (best-effort, in-memory per lambda instance — the
 *     hard backstops are the turn/size caps, which are stateless).
 *   - MAX_TURNS conversation cap, MAX_USER_CHARS per message, payload cap.
 *   - Same-origin check when an Origin header is present.
 *
 * Body:   { messages: [{role:'user'|'assistant', content:string}, ...] }
 * Result: { reply: string, done: boolean, pov: object|null }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  povChatTurn,
  MAX_TURNS,
  MAX_USER_CHARS,
  type ChatMessage,
} from "@/lib/services/pov-chat";

export const maxDuration = 60;

/* ---------- best-effort per-IP rate limit ---------- */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20; // one chat turn every 3s sustained — humans never hit this
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  if (buckets.size > 5000) buckets.clear(); // memory guard
  return b.count > MAX_PER_WINDOW;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Reject cross-site browser calls; non-browser callers (no Origin) pass and
 *  hit the rate limit + caps instead. */
function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return (
      host === "localhost" ||
      host.endsWith(".vercel.app") ||
      host === "thecreativehotline.com" ||
      host.endsWith(".thecreativehotline.com")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  if (raw.length > MAX_TURNS) {
    return NextResponse.json({ error: "conversation_over_limit" }, { status: 400 });
  }

  const messages: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") {
      return NextResponse.json({ error: "bad_message" }, { status: 400 });
    }
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return NextResponse.json({ error: "bad_message" }, { status: 400 });
    }
    const cap = role === "user" ? MAX_USER_CHARS : 4000;
    if (content.length === 0 || content.length > cap) {
      return NextResponse.json({ error: "message_too_long" }, { status: 400 });
    }
    messages.push({ role, content });
  }

  try {
    const result = await povChatTurn(messages);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POV chat error", err);
    return NextResponse.json({ error: "chat_failed" }, { status: 502 });
  }
}
