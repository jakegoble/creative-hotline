/**
 * GET /api/auth/login?next=/templates-v2/hub.html
 *
 * Kicks off Google OAuth. Sets a short-lived state cookie (CSRF) that also
 * carries the post-login destination, then redirects to Google's consent screen.
 *
 * Env: GOOGLE_CLIENT_ID
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "tch_oauth_state";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "auth_not_configured", message: "GOOGLE_CLIENT_ID is not set" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/templates-v2/hub.html";
  // Only allow same-site relative redirects.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/templates-v2/hub.html";

  const nonce = crypto.randomUUID();
  const state = `${nonce}|${safeNext}`;

  const redirectUri = `${url.origin}/api/auth/callback`;
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authorize.toString(), 302);
  res.headers.append(
    "Set-Cookie",
    `${STATE_COOKIE}=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );
  return res;
}
