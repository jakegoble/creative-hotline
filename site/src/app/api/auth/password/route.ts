/**
 * POST /api/auth/password — simple email + password sign-in.
 *
 * Fallback door that does NOT depend on Google. The SOS Google account that
 * owned the OAuth client was disabled (2026-07-15), taking Google sign-in down
 * with it. This mints the SAME tch_session cookie as the OAuth callback, so the
 * rest of the app is unchanged — only the way we prove identity differs.
 *
 * Identity: email must be on the two-person allowlist (Jake / Megha) AND the
 * password must match the configured secret.
 *
 * Env (set one in Vercel — Jake picks the value; Claude never sees it):
 *   SITE_PASSWORD_HASH  — sha256 hex of the shared password (preferred)
 *   SITE_PASSWORD       — plaintext shared password (simplest; used if no hash)
 *   AUTH_SECRET         — existing; signs the session cookie
 */

import { NextResponse } from "next/server";
import {
  ALLOWED_USERS,
  sessionCookie,
  signSessionToken,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Best-effort per-instance throttle. Serverless instances are ephemeral, so
// this is a speed bump against casual guessing, not a hard limit.
const ATTEMPTS = new Map<string, { n: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = ATTEMPTS.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    ATTEMPTS.set(ip, { n: 1, first: now });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_ATTEMPTS;
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  // Compare over the max length so the loop count doesn't leak which is longer.
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function passwordMatches(submitted: string): Promise<boolean> {
  const hash = process.env.SITE_PASSWORD_HASH?.trim();
  if (hash) {
    const submittedHash = await sha256Hex(submitted);
    return timingSafeEqual(submittedHash, hash.toLowerCase());
  }
  const plain = process.env.SITE_PASSWORD;
  if (plain) return timingSafeEqual(submitted, plain);
  return false;
}

function safeNext(next: unknown): string {
  const fallback = "/templates-v2/hub.html";
  if (typeof next !== "string") return fallback;
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function POST(request: Request) {
  if (!process.env.SITE_PASSWORD_HASH && !process.env.SITE_PASSWORD) {
    return NextResponse.json(
      { error: "not_configured", message: "No site password is set" },
      { status: 500 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts. Wait a few minutes." },
      { status: 429 },
    );
  }

  let body: { email?: string; password?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const user = ALLOWED_USERS[email];

  // Always run the password check even for unknown emails to blunt user
  // enumeration via response timing.
  const pwOk = await passwordMatches(password);

  if (!user || !pwOk) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const token = await signSessionToken(email);
  const res = NextResponse.json({ ok: true, next: safeNext(body.next) });
  res.headers.append("Set-Cookie", sessionCookie(token));
  return res;
}
