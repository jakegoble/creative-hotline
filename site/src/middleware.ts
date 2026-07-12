/**
 * TCH auth middleware — default-deny for the internal operating system.
 *
 * PUBLIC (no login):
 *   /login, /api/auth/*                          — the door itself
 *   /templates-v2/action-plan.html               — client deliverable (link from Frankie email)
 *   /templates-v2/caller-prep.html               — client pre-call one-pager
 *   /templates-v2/tch-brand.css                  — stylesheet those two need
 *   /legal/*                                     — service agreement (linked in Frankie email #1)
 *   /api/health                                  — uptime checks
 *   webhooks: /api/stripe/webhook, /api/calendly/webhook, /api/tally/webhook,
 *             /api/twilio/inbound, /api/manychat/frankie
 *             (each verifies its own signature — must stay reachable)
 *   /api/cron/*                                  — Vercel cron (CRON_SECRET-guarded)
 *   GET /api/sessions/:id (exact, GET only)      — data for the two public pages
 *
 * EVERYTHING ELSE requires the tch_session cookie (Jake or Megha via Google).
 * Pages redirect to /login?next=…; API calls get 401 JSON.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth/",
  "/legal/",
  "/api/cron/",
  "/_next/",
  "/pov", // free POV tool — page + its static assets (public/pov/*)
];

const PUBLIC_EXACT = new Set([
  "/api/health",
  "/api/stripe/webhook",
  "/api/calendly/webhook",
  "/api/tally/webhook",
  "/api/twilio/inbound",
  "/api/manychat/frankie",
  "/api/pov/chat", // free POV tool — rate-limited + turn-capped in-route
  "/api/pov/capture", // free POV tool — email capture, rate-limited in-route
  "/templates-v2/action-plan.html",
  "/templates-v2/caller-prep.html",
  "/templates-v2/tch-brand.css",
  "/favicon.ico",
]);

/** GET /api/sessions/<id> only — no subpaths, no writes. */
const PUBLIC_SESSION_GET = /^\/api\/sessions\/[^/]+$/;

function isPublic(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // Static assets at the public root (svg/png/jpg used by pages/emails).
  if (/^\/[^/]+\.(svg|png|jpg|jpeg|ico|webp)$/.test(pathname)) return true;
  if (req.method === "GET" && PUBLIC_SESSION_GET.test(pathname)) return true;
  return false;
}

/**
 * FAIL-OPEN UNTIL CONFIGURED: if the auth env vars aren't set in Vercel yet
 * (GOOGLE_CLIENT_ID + AUTH_SECRET — see SHIP-AUTH-2026-07-12.md steps 1-2),
 * the gate passes everything through, matching the pre-auth production
 * posture. The moment both vars exist, default-deny activates automatically.
 * Decision: Jake, 2026-07-12 — unblocks the POV tool deploy without forcing
 * the OAuth setup first.
 */
const AUTH_CONFIGURED = Boolean(
  process.env.AUTH_SECRET && process.env.GOOGLE_CLIENT_ID,
);
let warnedUnconfigured = false;

export async function middleware(req: NextRequest) {
  if (!AUTH_CONFIGURED) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn(
        "[auth] AUTH_SECRET / GOOGLE_CLIENT_ID not set — middleware is FAIL-OPEN. " +
          "Set both in Vercel to activate the login gate (SHIP-AUTH-2026-07-12.md).",
      );
    }
    return NextResponse.next();
  }

  if (isPublic(req)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = await verifySessionToken(token);
  if (user) return NextResponse.next();

  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except Next internals + metadata files.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
