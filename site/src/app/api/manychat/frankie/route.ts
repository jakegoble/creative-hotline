/**
 * POST /api/manychat/frankie
 *
 * The Instagram counterpart to the Twilio SMS webhook. ManyChat calls this from
 * an "External Request" step whenever a DM doesn't match a keyword/quick-reply,
 * and renders the response. This gives Instagram the SAME Claude-powered Frankie
 * brain as SMS (lib/sms/frankie-ai.ts) — one source of truth for voice + facts
 * across both channels — so a free-form DM gets a real answer that drives to
 * booking, instead of stalling on a menu.
 *
 * Why the same brain (vs. ManyChat's native AI): consistent voice/pricing across
 * channels, our guardrails (never invent pricing/claims, always push to book,
 * length cap) enforced in code, and one place to update.
 *
 * RESPONSE SHAPE — we return BOTH:
 *   - top-level `reply` + `booking_url` (for ManyChat "External Request" field
 *     mapping: map `reply` → a text block, `booking_url` → a button), AND
 *   - a ManyChat v2 Dynamic Block (`version` + `content.messages`) so the same
 *     endpoint can be wired as a Dynamic Block that renders the text + a
 *     "Book Your Call" URL button with zero extra ManyChat config.
 * Pick whichever you set up in ManyChat — extra keys are ignored.
 *
 * AUTH: optional shared secret. If MANYCHAT_WEBHOOK_SECRET is set, the caller
 * must send it (header `x-manychat-secret` or body `secret`); otherwise 401.
 * If unset, all callers are allowed (set it in prod to stop token abuse).
 *
 * Always returns 200 with a usable Frankie message on the happy path (AI failure
 * falls back to a canned reply) so ManyChat's flow never breaks.
 */

import { NextResponse } from "next/server";
import { frankieSmsReply, type FrankieContext } from "@/lib/sms/frankie-ai";
import { BOOKING_URL } from "@/lib/sms/keywords";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** BOOKING_URL is scheme-less for SMS copy; ManyChat buttons need a full URL. */
const BOOK_URL = `https://${BOOKING_URL}`;

/** Canned reply when Claude is unavailable — always usable, always books. */
const FALLBACK_REPLY =
  "Frankie here — tell me what you're stuck on (a brand, a launch, a campaign that's not landing) and I'll point you the right way. Or tap below to grab a call.";

const EMPTY_REPLY =
  "Hey — Frankie here, front desk of The Creative Hotline. What are you working on? Tell me the creative problem, or tap below to book a 60-min call.";

/**
 * Build the response body: a simple {reply, booking_url} for field-mapping AND
 * a ManyChat v2 Dynamic Block (text + Book button) for direct rendering.
 */
function manychatResponse(reply: string) {
  return {
    reply,
    booking_url: BOOK_URL,
    version: "v2",
    content: {
      messages: [
        {
          type: "text",
          text: reply,
          buttons: [{ type: "url", caption: "Book Your Call", url: BOOK_URL }],
        },
      ],
    },
  };
}

function asBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // Tolerate empty/non-JSON bodies — we just won't have a message.
  }

  // ---- Auth gate -------------------------------------------------------
  const secret = config.manychat.webhookSecret;
  if (secret) {
    const provided =
      request.headers.get("x-manychat-secret") ??
      (typeof body.secret === "string" ? body.secret : "");
    if (provided !== secret) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401 },
      );
    }
  }

  // ManyChat sends whatever fields you map. Accept the common ones for the
  // user's text; first non-empty wins.
  const message = String(
    body.message ?? body.text ?? body.last_input_text ?? body.last_text ?? "",
  ).trim();

  if (!message) {
    return NextResponse.json(manychatResponse(EMPTY_REPLY), { status: 200 });
  }

  const ctx: FrankieContext = {
    channel: "Instagram",
    hasBooked: asBool(body.has_booked),
    hasEmail: asBool(body.has_email) || Boolean(body.email),
  };

  let reply: string | null = null;
  try {
    reply = await frankieSmsReply(message, ctx);
  } catch (err) {
    console.error("[manychat/frankie] reply threw:", err);
  }

  console.log("[manychat/frankie]", {
    len: message.length,
    usedAI: Boolean(reply),
    hasBooked: ctx.hasBooked,
  });

  return NextResponse.json(manychatResponse(reply ?? FALLBACK_REPLY), {
    status: 200,
  });
}

/** GET health check — confirms the route is deployed without a real DM. */
export async function GET(): Promise<Response> {
  return NextResponse.json({
    ok: true,
    route: "/api/manychat/frankie",
    method: "POST",
    description:
      "ManyChat External Request → Claude-powered Frankie reply for Instagram DMs. POST JSON {message, first_name?, has_booked?, has_email?, secret?}.",
  });
}
