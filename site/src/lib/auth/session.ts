/**
 * TCH internal auth — session token + allowlist.
 *
 * Two users only (Jake + Megha). Google OAuth proves the email; this module
 * mints/verifies a signed session token stored in an HttpOnly cookie.
 *
 * Token format: base64url(payloadJson) + "." + base64url(HMAC-SHA256(payload))
 * Uses Web Crypto only, so it runs in BOTH edge middleware and node routes.
 *
 * Env: AUTH_SECRET (required — any long random string).
 */

export const SESSION_COOKIE = "tch_session";
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

export interface TchUser {
  /** stable id used for attribution + UI color */
  id: "jake" | "megha";
  email: string;
  name: string;
  /** brand convention: blue = Jake, red = Megha */
  color: "blue" | "red";
}

export const ALLOWED_USERS: Record<string, TchUser> = {
  "jake@radanimal.co": {
    id: "jake",
    email: "jake@radanimal.co",
    name: "Jake",
    color: "blue",
  },
  "megha@theanecdote.co": {
    id: "megha",
    email: "megha@theanecdote.co",
    name: "Megha",
    color: "red",
  },
};

interface TokenPayload {
  email: string;
  exp: number; // unix seconds
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET env var is not set");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSessionToken(email: string): Promise<string> {
  const payload: TokenPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_S,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), payloadBytes as BufferSource);
  return `${b64url(payloadBytes)}.${b64url(new Uint8Array(sig))}`;
}

/** Returns the user if the token is valid, unexpired, and allowlisted. */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<TchUser | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  try {
    const payloadBytes = b64urlDecode(token.slice(0, dot));
    const sigBytes = b64urlDecode(token.slice(dot + 1));
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      sigBytes as BufferSource,
      payloadBytes as BufferSource,
    );
    if (!ok) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(payloadBytes),
    ) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
      return null;
    }
    return ALLOWED_USERS[payload.email?.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

/** Extract + verify the session cookie from any Request. */
export async function getUserFromRequest(req: Request): Promise<TchUser | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return verifySessionToken(match ? match[1] : null);
}

/** Serialized Set-Cookie value for a fresh session. */
export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_S}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
