/** GET or POST /api/auth/logout — clears the session cookie. */

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function logout(request: Request) {
  const url = new URL(request.url);
  const res = NextResponse.redirect(`${url.origin}/login`, 302);
  res.headers.append("Set-Cookie", clearSessionCookie());
  return res;
}

export async function GET(request: Request) {
  return logout(request);
}

export async function POST(request: Request) {
  return logout(request);
}
