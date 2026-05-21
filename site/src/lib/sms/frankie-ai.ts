/**
 * Frankie AI — Claude-powered SMS fallback.
 *
 * When the deterministic keyword router (lib/sms/keywords.ts) can't classify an
 * inbound text (intent === "fallback"), the inbound route hands the raw message
 * here. Claude replies AS Frankie: warm, specific, honest, and always nudging
 * toward booking — so a real human sentence ("where are you based?", "can you
 * help me rename my company?") gets a real answer instead of "didn't catch
 * that," which was the biggest lead-gen leak in the v1 keyword-only bot.
 *
 * SAFETY MODEL — this is the only place an LLM speaks to a paying-funnel lead,
 * so the guardrails are strict:
 *   - The system prompt hard-codes the ONLY facts Frankie may state (pricing,
 *     what the call is, remote, booking URL). It is told never to invent
 *     prices, discounts, guarantees, or services.
 *   - Output is sanitized + hard-capped to 320 chars (2 SMS segments) before it
 *     ever reaches the user.
 *   - The call is time-boxed (AbortController) well inside Twilio's 15s webhook
 *     window, and FAILS SOFT: any error / timeout / empty result returns null,
 *     and the caller falls back to the canned Frankie menu. The user always
 *     gets a reply.
 *
 * Cost/latency: SMS replies are short, so we cap max_tokens low and default to
 * a fast model. Override the model per-environment with FRANKIE_SMS_MODEL
 * (e.g. a Haiku-class model) without touching code.
 */

import { config } from "../config";
import { BOOKING_URL } from "./keywords";

const ANTHROPIC_BASE = "https://api.anthropic.com/v1";

/** Hard cap so a runaway generation never blows past 2 SMS segments. */
const MAX_SMS_CHARS = 320;

/** Time-box the Claude call so we always answer inside Twilio's 15s window. */
const CLAUDE_TIMEOUT_MS = 9000;

/**
 * Pick the model. FRANKIE_SMS_MODEL lets ops choose a fast/cheap model for the
 * high-volume SMS path independent of the heavier action-plan model in
 * config.anthropic.model. Falls back to the shared model, then a sane default.
 */
function frankieModel(): string {
  return (
    process.env.FRANKIE_SMS_MODEL ||
    config.anthropic.model ||
    "claude-haiku-4-5-20251001"
  );
}

/**
 * Optional context the route can pass so Frankie tailors the reply without a
 * full conversation history (SMS webhooks are stateless per message).
 */
export interface FrankieContext {
  /** True if we already have this contact's email on file. */
  hasEmail?: boolean;
  /** True if this contact has already booked a call (tagged "booked"). */
  hasBooked?: boolean;
  /** "SMS" | "WhatsApp" — only changes a word or two of framing. */
  channel?: string;
}

/**
 * Build Frankie's system prompt. Pure + exported so a test can snapshot it and
 * assert the guardrails (pricing facts, no-invention rule, length limit) are
 * present without making a network call.
 */
export function buildFrankieSystemPrompt(ctx: FrankieContext = {}): string {
  const contextLines: string[] = [];
  if (ctx.hasBooked) {
    contextLines.push(
      "- This person has ALREADY booked a call. Don't push them to book again — help with their question and tell them you'll see them on the call.",
    );
  } else {
    contextLines.push(
      "- This person has NOT booked yet. Your job is to move them toward booking.",
    );
  }
  if (ctx.hasEmail === false) {
    contextLines.push(
      "- We do NOT have their email yet. If it feels natural, invite them to reply with their email so we can send booking details — but never demand it.",
    );
  }

  return [
    "You are Frankie, the voice of The Creative Hotline, replying to an inbound TEXT MESSAGE.",
    "",
    "WHO FRANKIE IS:",
    "A personality, not a person — the friend who happens to be a sharp creative strategist. You tell the truth, give the plan, and don't waste anyone's time. Jake and Megha are the humans who run the actual calls; you're the front desk.",
    "",
    "WHAT THE CREATIVE HOTLINE IS (the only facts you may state):",
    "- A 60-minute, 1-on-1 creative strategy call. The client brings the mess — fuzzy brand direction, messaging that's off, a campaign that's not landing, a launch that needs structure, pricing/positioning problems — and you build a clear action plan together.",
    "- They get a written action plan in their inbox within 24 hours of the call.",
    "- It's for founders, creatives, and marketers who feel stuck.",
    "- 100% remote. Every call is over Zoom, so it works for clients anywhere.",
    "- PRICING (never invent others, never invent discounts): First Call $499 for new clients (60 min). Single Call $699 for returning clients (60 min). 3-Session Clarity Sprint $1,495 (three sessions over about two weeks). There is no active promo or discount right now.",
    `- To book: ${BOOKING_URL} — or they can just reply BOOK.`,
    "- They can text these keywords: BOOK, PRICING, INFO, DEALS, STOP.",
    "",
    "HOW TO WRITE (this is a TEXT, not an email):",
    "- ONE short reply, 320 characters MAX. Plain text only: no markdown, no asterisks, no bullet points, no line breaks, no headers.",
    "- Voice: warm, direct, specific, honest, human. Sound like a smart friend texting back.",
    "- Banned: buzzwords (synergy, leverage, optimize, unlock, empower, streamline, ecosystem, holistic, scalable, game-changer, move the needle, circle back, align, pivot). No motivational fluff ('you've got this'). No emoji. No 'As an AI'.",
    "- Lead with the answer, then nudge toward booking. End most replies with a soft CTA to book or text BOOK (unless they're opting out or upset).",
    "- Ask at most ONE question.",
    "- Don't sign off with '—Frankie' on every text; it's a thread, keep it natural.",
    "",
    "HARD RULES:",
    "- NEVER invent prices, discounts, guarantees, deadlines, refund/contract terms, or services beyond the facts above. If you don't know something specific (exact availability, custom scope, refunds, legal), say a human (Jake or Megha) will follow up, or invite them to book — do not make it up.",
    "- NEVER promise specific results or outcomes.",
    "- Do NOT include opt-out text like 'Reply STOP' — the carrier adds that automatically.",
    "- If the message is off-topic, inappropriate, or spam, briefly + kindly steer back to what the Hotline does. Don't engage with anything inappropriate.",
    "",
    "CONTEXT FOR THIS MESSAGE:",
    ...contextLines,
  ].join("\n");
}

/**
 * Sanitize a raw model reply into a safe single SMS. Pure + exported for tests.
 *   - Collapse all whitespace/newlines to single spaces (SMS is one line).
 *   - Strip leftover markdown emphasis + wrapping quotes.
 *   - Remove any "Reply STOP ..." the model added (carrier handles compliance).
 *   - Hard-cap at 320 chars, trimming at a word boundary with an ellipsis.
 */
export function sanitizeSmsReply(raw: string): string {
  let s = (raw ?? "").trim();
  if (!s) return "";
  // Strip markdown emphasis markers the model might emit.
  s = s.replace(/[*_`#>]+/g, "");
  // Collapse newlines + repeated whitespace into single spaces.
  s = s.replace(/\s+/g, " ").trim();
  // Drop a wrapping pair of quotes if the whole thing is quoted.
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  // Remove any compliance tail the model added — the carrier appends it.
  // Only consume a leading dash/separator (not the sentence's own period) so
  // "Grab a slot now. Reply STOP to opt out." -> "Grab a slot now."
  s = s.replace(/\s*(?:[-—·|]\s*)?reply\s+stop[^.]*\.?\s*$/i, "").trim();
  // Hard cap to 2 SMS segments, trimming at a word boundary.
  if (s.length > MAX_SMS_CHARS) {
    s = s.slice(0, MAX_SMS_CHARS);
    const lastSpace = s.lastIndexOf(" ");
    if (lastSpace > MAX_SMS_CHARS - 40) s = s.slice(0, lastSpace);
    s = s.replace(/[\s,;:.\-—]+$/, "") + "…";
  }
  return s;
}

interface MessagesResponse {
  content?: { type: string; text?: string }[];
}

/**
 * Generate a Frankie reply to an off-keyword inbound message.
 *
 * Returns the sanitized SMS string on success, or null on ANY failure
 * (no API key, timeout, non-2xx, empty/blank output). The caller MUST treat
 * null as "use the canned fallback menu" so the user always gets a reply.
 */
export async function frankieSmsReply(
  userMessage: string,
  ctx: FrankieContext = {},
): Promise<string | null> {
  const apiKey = config.anthropic.apiKey;
  if (!apiKey) {
    console.warn("[frankie-ai] ANTHROPIC_API_KEY not configured — skipping AI reply");
    return null;
  }
  const body = (userMessage ?? "").trim();
  if (!body) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: frankieModel(),
        max_tokens: 220,
        temperature: 0.7,
        system: buildFrankieSystemPrompt(ctx),
        messages: [{ role: "user", content: body }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(
        `[frankie-ai] Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`,
      );
      return null;
    }

    const data = (await res.json()) as MessagesResponse;
    const raw =
      data.content?.find((c) => c.type === "text")?.text ??
      data.content?.[0]?.text ??
      "";
    const reply = sanitizeSmsReply(raw);
    return reply.length > 0 ? reply : null;
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error(
      `[frankie-ai] reply failed (${aborted ? "timeout" : "error"}):`,
      err,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}
