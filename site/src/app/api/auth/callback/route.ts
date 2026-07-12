/**
 * GET /api/auth/callback — Google OAuth redirect target.
 *
 * Verifies state (CSRF), exchanges the code for tokens directly with Google
 * over TLS, reads the id_token payload, and only mints a TCH session if the
 * verified email is on the two-person allowlist (jake@radanimal.co /
 * megha@theanecdote.co). Everyone else gets a polite 403.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET
 */

import { NextResponse } from "next/server";
import {
  ALLOWED_USERS,
  sessionCookie,
  signSessionToken,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "tch_oauth_state";

function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Decode a JWT payload without signature verification — safe here because
 *  the id_token arrives directly from Google's token endpoint over TLS. */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    const pad = parts[1].length % 4 === 0 ? "" : "=".repeat(4 - (parts[1].length % 4));
    const json = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/") + pad,
      "base64",
    ).toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "auth_not_configured", message: "Google OAuth env vars missing" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const cookieState = readCookie(request, STATE_COOKIE);

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${url.origin}/login?error=state`, 302);
  }
  const nextPath = state.split("|").slice(1).join("|") || "/templates-v2/hub.html";

  // Exchange code → tokens.
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${url.origin}/api/auth/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${url.origin}/login?error=exchange`, 302);
  }

  const tokens = (await tokenRes.json()) as { id_token?: string };
  const claims = tokens.id_token ? decodeJwtPayload(tokens.id_token) : null;
  const email = typeof claims?.email === "string" ? claims.email.toLowerCase() : null;
  const emailVerified = claims?.email_verified === true || claims?.email_verified === "true";

  if (!email || !emailVerified || !ALLOWED_USERS[email]) {
    return NextResponse.redirect(`${url.origin}/login?error=not_allowed`, 302);
  }

  const token = await signSessionToken(email);
  const res = NextResponse.redirect(`${url.origin}${nextPath}`, 302);
  res.headers.append("Set-Cookie", sessionCookie(token));
  res.headers.append(
    "Set-Cookie",
    `${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  );
  return res;
}
