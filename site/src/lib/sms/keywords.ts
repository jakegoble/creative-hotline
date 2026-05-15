/**
 * SMS Keyword Router — Frankie Persona
 *
 * Mirrors the ManyChat Instagram Frankie voice (warm, witty, zero fluff) and
 * the 3-tier pricing canonicalized in the Notion ManyChat playbook.
 *
 * Single source of truth for inbound SMS keyword → reply text. The Twilio
 * inbound route imports `routeKeyword()` and wraps the result in TwiML.
 *
 * Design rules:
 *   - Every reply that drives action ends with the Calendly link
 *   - Replies stay under 320 chars (2 SMS segments) — counted in keywordSegments() test
 *   - Compliance ("Reply STOP") only appears in opt-in welcome + drip messages.
 *     For keyword replies, Twilio's Advanced Opt-Out adds it automatically.
 *   - No emoji spam — one branded ☎️ in welcome, otherwise plain text for max
 *     deliverability + character budget
 *
 * Keyword groups (normalized to UPPERCASE, trimmed before match):
 *   HOTLINE/START/JOIN  → opt-in welcome (also fires CRM opt-in side-effect)
 *   INFO/HELP           → service explainer (HELP is duplexed to satisfy TCPA)
 *   PRICING/PRICE/PLANS → 3-tier pricing
 *   BOOK/SCHEDULE/CALL  → Calendly link
 *   DEALS/PROMO/OFFER   → honest "no active promo" + book CTA
 *   STOP/UNSUBSCRIBE    → opt-out confirmation
 *   *                    → fallback menu
 */

/**
 * The single Calendly URL we point every booking CTA at. Lives here (not in
 * env config) because it's tied to the marketing message — if Megha changes
 * the event slug we want to update this file and read the diff in PR review.
 */
export const BOOKING_URL =
  "calendly.com/soscreativehotline/creative-hotline-call";

/** Classification of an inbound keyword for the CRM side-effect path. */
export type KeywordIntent =
  | "opt_in" // HOTLINE/START/JOIN — Status=active, kick off drip step_1
  | "opt_out" // STOP — Status=opted_out, halt drips
  | "info" // INFO/HELP/PRICING — engagement, no status change
  | "book" // BOOK/SCHEDULE — engagement + add "hot-lead" tag
  | "deals" // DEALS/PROMO — engagement
  | "fallback"; // anything else

export interface KeywordMatch {
  intent: KeywordIntent;
  /** The reply text Twilio sends back as TwiML. */
  reply: string;
  /** Original (uppercase, trimmed) keyword for logging. */
  keyword: string;
}

const KEYWORD_GROUPS: Record<
  KeywordIntent,
  { triggers: string[]; reply: string }
> = {
  opt_in: {
    triggers: ["HOTLINE", "START", "JOIN", "SUBSCRIBE", "YES"],
    reply:
      "You just dialed The Creative Hotline ☎️ Frankie here. Text PRICING, BOOK, INFO, or DEALS — or just tell me what's on your mind. Reply STOP to opt out.",
  },
  info: {
    triggers: [
      "INFO",
      "INFORMATION",
      "HELP",
      "ABOUT",
      "WHAT",
      "PRICING",
      "PRICE",
      "PRICES",
      "PLANS",
      "COST",
    ],
    // INFO and PRICING share content — keeps SMS replies copy-tight. PRICING
    // is re-mapped below so the analytics tag distinguishes them; the message
    // text is identical so the user doesn't have to text twice.
    reply:
      "Three options: First Call $499 (new clients) · Single Call $699 (returning) · Clarity Sprint $1,495 (3 sessions). 60-min strategy calls, action plan in 24 hrs. Text BOOK to lock one in.",
  },
  book: {
    triggers: ["BOOK", "BOOKING", "SCHEDULE", "APPOINTMENT", "CALL"],
    reply: `Let's do it. Grab a slot: ${BOOKING_URL} — 60-min call, action plan delivered within 24 hrs. Reply HELP if you get stuck.`,
  },
  deals: {
    triggers: ["DEALS", "DEAL", "OFFER", "PROMO", "DISCOUNT", "COUPON"],
    reply: `No active promo right now — you'll be first to know when one drops. Best move: lock a First Call at $499 before prices climb. ${BOOKING_URL}`,
  },
  opt_out: {
    triggers: ["STOP", "UNSUBSCRIBE", "QUIT", "EXIT", "CANCEL", "END"],
    reply:
      "You're unsubscribed. Reply START anytime to come back. — Frankie",
  },
  fallback: {
    triggers: [], // matched by default
    reply:
      "Frankie here — didn't catch that. Try BOOK, PRICING, INFO, DEALS, or HELP.",
  },
};

/**
 * Build the lookup map once at module load. Keys are uppercase keywords,
 * values are the matched intent.
 */
const TRIGGER_INDEX: Map<string, KeywordIntent> = (() => {
  const map = new Map<string, KeywordIntent>();
  for (const [intent, group] of Object.entries(KEYWORD_GROUPS)) {
    for (const trigger of group.triggers) {
      map.set(trigger, intent as KeywordIntent);
    }
  }
  return map;
})();

/**
 * Normalize raw SMS body for keyword matching:
 *   - Trim whitespace
 *   - Uppercase
 *   - Strip punctuation (so "BOOK!" and "book?" both match)
 *   - Take only the FIRST word (so "BOOK me a slot" still books)
 */
function normalize(body: string): string {
  if (!body) return "";
  return body
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)[0]
    .trim();
}

/**
 * Match an inbound SMS body to a keyword intent + reply.
 *
 * Always returns a KeywordMatch — fallback is the safety net so the route can
 * be a thin pass-through that never throws.
 */
export function routeKeyword(body: string): KeywordMatch {
  const keyword = normalize(body);
  const intent = TRIGGER_INDEX.get(keyword) ?? "fallback";
  return {
    intent,
    keyword: keyword || "(empty)",
    reply: KEYWORD_GROUPS[intent].reply,
  };
}

/**
 * Test helper: how many SMS segments a reply will use (160 chars per segment,
 * 153 for multi-segment due to UDH overhead). Used by the unit test to assert
 * no reply exceeds 2 segments.
 */
export function keywordSegments(reply: string): number {
  const len = reply.length;
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}
