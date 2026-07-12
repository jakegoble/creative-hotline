/**
 * POST /api/pov/capture — end-of-exercise email capture for the free POV tool.
 *
 * PUBLIC + UNAUTHENTICATED (whitelisted in middleware). Writes the lead into
 * the shared Messaging Contacts CRM (source "pov_tool") — same DB as SMS +
 * Instagram leads, so Megha sees every channel in one view.
 *
 * All writes are AWAITED before the response returns (Vercel terminates the
 * function on return — fire-and-forget writes silently die).
 *
 * Body:   { email: string, name?, brand?, pov?: object|string }
 * Result: { ok: true } (also on CRM failure — never punish the user for our
 *          plumbing; failures are logged for the health sweep)
 *
 * PHASE 2 (before launch): trigger the Frankie report-card email from here.
 */

import { NextRequest, NextResponse } from "next/server";
import { upsertPovLead } from "@/lib/services/notion-messaging";

export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  if (buckets.size > 5000) buckets.clear();
  return b.count > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: {
    email?: unknown;
    name?: unknown;
    brand?: unknown;
    pov?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.slice(0, 120) : "";
  const brand = typeof body.brand === "string" ? body.brand.slice(0, 160) : "";
  let pov = "";
  if (typeof body.pov === "string") pov = body.pov;
  else if (body.pov && typeof body.pov === "object") {
    const p = body.pov as { pov?: unknown };
    if (typeof p.pov === "string") pov = p.pov;
  }
  pov = pov.slice(0, 1200);

  try {
    await upsertPovLead({ email, name, brand, pov });
  } catch (err) {
    // Log loudly, respond kindly — the lead typed a real email; don't show an
    // error over our own plumbing. The health sweep watches these logs.
    console.error("POV capture CRM write failed", err);
  }

  return NextResponse.json({ ok: true });
}
