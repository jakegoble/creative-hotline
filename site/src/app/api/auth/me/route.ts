/**
 * GET /api/auth/me — who is logged in.
 * 200 { user: { id, email, name, color } } | 401 { error: "unauthenticated" }
 * Templates use this to render the identity chip (blue=Jake, red=Megha).
 */

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
