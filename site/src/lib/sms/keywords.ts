/**
 * SMS Keyword Router — Frankie Persona (v2)
 *
 * Mirrors the ManyChat Instagram Frankie voice (warm, witty, zero fluff) and
 * the 3-tier pricing canonicalized in the Notion ManyChat playbook + the
 * Frankie Brand Voice Guide (docs/frankie-brand-voice-guide.md).
 *
 * WHAT CHANGED IN v2 (2026-05-20):
 *   - Matches across the WHOLE message, not just the first word. "Where are
 *     you based?" / "how much for a rebrand" used to dead-end on the fallback
 *     menu — the #1 lead-gen leak. Now they route to a real topical reply.
 *   - INFO and PRICING are SPLIT. INFO now explains what the Hotline IS;
 *     PRICING shows the 3 tiers. (v1 mapped both to the price list, which
 *     answered the wrong question for anyone texting INFO.)
 *   - New deterministic topics: location/remote, services/"can you help with",
 *     and a proper HELP menu in Frankie voice.
 *   - Anything still unmatched returns intent "fallback" — the inbound route
 *     hands that to the Claude-powered Frankie (lib/sms/frankie-ai.ts), so a
 *     human sentence always gets a human-sounding reply, never "didn't catch
 *     that." The fallback reply here is only the safety net used when the AI
 *     call fails.
 *
 * Design rules (unchanged):
 *   - Every reply that drives action ends with the Calendly link or a BOOK CTA
 *   - Replies stay under 320 chars (2 SMS segments) — asserted in keywordSegments()
 *   - Compliance ("Reply STOP") only appears in the opt-in welcome + drip
 *     messages. For keyword replies, Twilio's Advanced Opt-Out appends it.
 *   - No emoji spam — one branded ☎️ in the welcome, otherwise plain text for
 *     max deliverability + character budget.
 *   - Do NOT instruct users to "Reply HELP" — until the Twilio Messaging
 *     Service Advanced Opt-Out config is fixed, HELP is intercepted by the
 *     carrier and never reaches this webhook. (See TWILIO-CONSOLE-FIX doc.)
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
  | "info" // INFO/PRICING/location/services/help — engagement, no status change
  | "book" // BOOK/SCHEDULE — engagement + add "hot-lead" tag
  | "deals" // DEALS/PROMO — engagement
  | "human" // explicit ask for a real person — tag "needs-human" + alert ops
  | "fallback"; // anything else — handed to the Claude-powered Frankie

/** Fine-grained topic for analytics/logging — narrower than KeywordIntent. */
export type KeywordTopic =
  | "opt_in"
  | "opt_out"
  | "book"
  | "pricing"
  | "info"
  | "services"
  | "location"
  | "help"
  | "human"
  | "deals"
  | "fallback";

export interface KeywordMatch {
  intent: KeywordIntent;
  /** Fine-grained topic (e.g. "pricing" vs "info") for logging/analytics. */
  topic: KeywordTopic;
  /** The reply text Twilio sends back as TwiML (safety-net text for fallback). */
  reply: string;
  /** Original (uppercase, trimmed) first keyword token for logging. */
  keyword: string;
}

/** Canonical replies, one per topic. All Frankie voice, all <320 chars. */
const REPLIES: Record<KeywordTopic, string> = {
  opt_in:
    "You just dialed The Creative Hotline ☎️ Frankie here. Tell me what you're stuck on — or text PRICING, INFO, or BOOK to get going. Reply STOP to opt out.",
  info:
    "The Creative Hotline is a 60-min 1-on-1 strategy call. You bring the mess — a brand that's fuzzy, a launch that needs structure, a campaign that's not landing — and we build a clear plan together. Action plan in your inbox within 24 hrs. Text PRICING for options or BOOK to grab a slot.",
  pricing:
    "Three options: First Call $499 (new clients) · Single Call $699 (returning) · 3-Session Clarity Sprint $1,495. All 60-min strategy calls, action plan in 24 hrs. Text BOOK to lock one in.",
  book: `Let's do it — grab a slot: ${BOOKING_URL}. 60-min call, action plan within 24 hrs. Want it sent to your email too? Just reply with your address.`,
  services:
    "Short answer: probably yes. The Hotline is for brand direction, messaging, content that's not landing, launches, pricing, positioning — the creative stuff that's got you stuck. Tell me your specific challenge, or text BOOK to talk it through on a 60-min call.",
  location: `We run 100% remote — every call's over Zoom, so it doesn't matter if you're in LA or London. You bring the creative problem, we build the plan. Text BOOK to grab a 60-min slot: ${BOOKING_URL}`,
  help:
    "Frankie here — your hotline operator. Just text me what you're stuck on, or use: BOOK (grab a call) · PRICING (see options) · INFO (how it works) · DEALS. Reply STOP to opt out.",
  human: `Got it — I'm looping in a real human. Jake or Megha will text you back shortly. Want to grab a call slot in the meantime? ${BOOKING_URL}`,
  deals: `No active promo right now — you'll be first to know when one drops. Best move: lock a First Call at $499 before prices climb. ${BOOKING_URL}`,
  opt_out: "You're unsubscribed. Reply START anytime to come back. — Frankie",
  fallback:
    "Frankie here — tell me what you're stuck on, or try BOOK, PRICING, INFO, or DEALS.",
};

/** Map each topic to the coarse CRM intent the route handler switches on. */
const TOPIC_INTENT: Record<KeywordTopic, KeywordIntent> = {
  opt_in: "opt_in",
  opt_out: "opt_out",
  book: "book",
  deals: "deals",
  pricing: "info",
  info: "info",
  services: "info",
  location: "info",
  help: "info",
  human: "human",
  fallback: "fallback",
};

/**
 * Exact single-token triggers. Preserves the classic one-word keyword UX
 * (text "BOOK", "PRICING", "STOP"). Checked against the FIRST word only, so a
 * lone keyword is unambiguous and instant.
 *
 * Order of insertion doesn't matter here — it's an exact map lookup.
 */
const EXACT_TRIGGERS: Record<string, KeywordTopic> = {
  // opt-out
  STOP: "opt_out",
  STOPALL: "opt_out",
  UNSUBSCRIBE: "opt_out",
  QUIT: "opt_out",
  EXIT: "opt_out",
  CANCEL: "opt_out",
  END: "opt_out",
  // opt-in
  HOTLINE: "opt_in",
  START: "opt_in",
  UNSTOP: "opt_in",
  JOIN: "opt_in",
  SUBSCRIBE: "opt_in",
  YES: "opt_in",
  // book — NOTE: "CALL" is intentionally NOT an exact trigger. It's ambiguous
  // ("book a call" vs "call me" = human handoff) and isn't an advertised
  // keyword, so it goes through the phrase scan / AI instead of short-circuiting.
  BOOK: "book",
  BOOKING: "book",
  SCHEDULE: "book",
  APPOINTMENT: "book",
  // pricing
  PRICING: "pricing",
  PRICE: "pricing",
  PRICES: "pricing",
  PLAN: "pricing",
  PLANS: "pricing",
  COST: "pricing",
  RATE: "pricing",
  RATES: "pricing",
  // info
  INFO: "info",
  INFORMATION: "info",
  ABOUT: "info",
  // help
  HELP: "help",
  MENU: "help",
  COMMANDS: "help",
  OPTIONS: "help",
  // deals
  DEALS: "deals",
  DEAL: "deals",
  OFFER: "deals",
  OFFERS: "deals",
  PROMO: "deals",
  DISCOUNT: "deals",
  COUPON: "deals",
  SPECIALS: "deals",
  // location / services single-word
  LOCATION: "location",
  REMOTE: "location",
  SERVICES: "services",
  // human handoff
  HUMAN: "human",
  AGENT: "human",
  PERSON: "human",
  REP: "human",
  REPRESENTATIVE: "human",
  OPERATOR: "human",
};

/**
 * Whole-message phrase patterns, scanned IN ORDER. First match wins, so the
 * list is ordered by priority: compliance (opt-out) first, then high-intent
 * (book), then pricing, then the softer informational topics.
 *
 * Patterns run against the message uppercased with punctuation stripped to
 * spaces (so "what's" -> "WHATS", "opt-out" -> "OPT OUT").
 */
const PHRASE_PATTERNS: { topic: KeywordTopic; re: RegExp }[] = [
  {
    topic: "opt_out",
    re: /\b(STOP (TEXT|MESSAG|SEND)|UNSUBSCRIBE|OPT ?OUT|REMOVE ME|LEAVE ME ALONE|DONT TEXT|DO NOT TEXT|TAKE ME OFF)\b/,
  },
  {
    topic: "opt_in",
    re: /\b(SIGN ME UP|OPT ?IN|COUNT ME IN|IM IN|I AM IN)\b/,
  },
  {
    // Explicit ask for a real person. Checked before "book" so "talk to a real
    // person" routes to handoff, while "talk to someone"/"book a call" stay book.
    topic: "human",
    re: /\b(REAL (PERSON|HUMAN)|TALK TO (A |AN )?(REAL )?(PERSON|HUMAN|AGENT|REP|OPERATOR)|SPEAK (TO|WITH) (A |AN )?(REAL )?(PERSON|HUMAN|AGENT|REP|OPERATOR)|IS THIS A (BOT|ROBOT|REAL PERSON|HUMAN)|ARE YOU (A |AN )?(BOT|ROBOT|REAL|HUMAN|AI)|HUMAN BEING|CUSTOMER (SERVICE|SUPPORT)|CALL ME)\b/,
  },
  {
    topic: "book",
    re: /\b(BOOK|SCHEDUL|APPOINTMENT|SET ?UP A (CALL|TIME|MEETING)|GET ON A CALL|GRAB A (CALL|SLOT|TIME|SPOT)|TALK TO (SOMEONE|YOU)|HOP ON A CALL|WANT A CALL)\b/,
  },
  {
    topic: "pricing",
    re: /\b(HOW MUCH|WHAT.{0,12}(COST|CHARGE|PRICE)|HOW.{0,8}EXPENSIVE|PRICE|PRICING|RATES?|COST|AFFORD|BUDGET|CHEAP|WORTH IT)\b/,
  },
  {
    topic: "location",
    re: /\b(WHERE.{0,18}(BASED|LOCATED|ARE YOU|YOU GUYS|YOU LOCATED)|YOUR LOCATION|IN ?PERSON|REMOTE|VIRTUAL|OVER ZOOM|ON ZOOM|NEAR ME|WHAT CITY|WHAT STATE|OFFICE)\b/,
  },
  {
    topic: "deals",
    re: /\b(DEALS?|DISCOUNTS?|PROMO|PROMOS|COUPONS?|SPECIALS?|ANY OFFERS?)\b/,
  },
  // INFO before SERVICES: "what do you do" is an explainer question (info),
  // while "do you do logos" is a services question. Checking info first stops
  // the services "DO YOU DO" matcher from swallowing the informational phrasing.
  {
    topic: "info",
    re: /\b(WHAT (IS|ARE)|WHATS THIS|WHAT DO YOU (DO|GUYS DO)|TELL ME MORE|MORE INFO|HOW.{0,8}(WORK|IT WORK)|EXPLAIN|WHO ARE YOU|WHATS THE (DEAL|HOTLINE))\b/,
  },
  {
    topic: "services",
    re: /\b(DO YOU (DO|OFFER|HELP|HANDLE)|CAN YOU (DO|HELP|HANDLE)|HELP (ME )?WITH|WORK ON|REBRAND|REBRANDING|BRANDING|BRAND IDENTITY|LOGO|WEBSITE|WEBSITES|MARKETING|SOCIAL MEDIA|CONTENT|STRATEGY|POSITIONING|MESSAGING|NAMING|COPYWRIT|LAUNCH|PRODUCT LAUNCH)\b/,
  },
  {
    topic: "help",
    re: /\b(HELP|MENU|COMMANDS|OPTIONS|WHAT CAN YOU DO|WHAT CAN I (TEXT|SAY))\b/,
  },
];

/**
 * Normalize raw SMS body to the FIRST word for exact-keyword matching:
 *   - Trim, uppercase, strip punctuation, take the first token.
 */
function firstToken(body: string): string {
  if (!body) return "";
  return body
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)[0]
    .trim();
}

/**
 * Normalize the WHOLE message for phrase scanning:
 *   - Uppercase, replace any run of non-alphanumerics with a single space,
 *     collapse + trim. Keeps word boundaries intact for the \b anchors.
 */
function normalizeWhole(body: string): string {
  if (!body) return "";
  return body
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/**
 * Match an inbound SMS body to a topic + intent + reply.
 *
 * Resolution order:
 *   1. Exact single-token match on the first word (classic keyword UX).
 *   2. Whole-message phrase scan (natural-language sentences).
 *   3. Fallback — the route hands this to the Claude-powered Frankie.
 *
 * Always returns a KeywordMatch; never throws.
 */
export function routeKeyword(body: string): KeywordMatch {
  const token = firstToken(body);

  // 1. Exact single-token (e.g. a lone "BOOK" / "PRICING" / "STOP").
  const exactTopic = EXACT_TRIGGERS[token];
  if (exactTopic) {
    return {
      intent: TOPIC_INTENT[exactTopic],
      topic: exactTopic,
      reply: REPLIES[exactTopic],
      keyword: token || "(empty)",
    };
  }

  // 2. Whole-message phrase scan (first match wins, ordered by priority).
  const whole = normalizeWhole(body);
  if (whole) {
    for (const { topic, re } of PHRASE_PATTERNS) {
      if (re.test(whole)) {
        return {
          intent: TOPIC_INTENT[topic],
          topic,
          reply: REPLIES[topic],
          keyword: token || "(empty)",
        };
      }
    }
  }

  // 3. Fallback — Claude-powered Frankie handles it in the route.
  return {
    intent: "fallback",
    topic: "fallback",
    reply: REPLIES.fallback,
    keyword: token || "(empty)",
  };
}

/**
 * Twilio Advanced Opt-Out (enabled on the Messaging Service 2026-05-20) OWNS
 * these STOP/START/HELP-family keywords: Twilio sends the (Frankie-toned)
 * compliance reply itself AND still forwards the inbound to this webhook. If we
 * also reply, the user gets TWO messages. So the inbound route returns empty
 * TwiML for these — Twilio's reply is the only one sent. The CRM opt-in/opt-out
 * write still runs. Must mirror the keyword lists in Twilio Console → Opt-Out
 * Management. NOTE: HOTLINE/JOIN/SUBSCRIBE are intentionally NOT here — Twilio
 * doesn't intercept them, so the webhook's Frankie welcome is the only reply.
 */
const TWILIO_MANAGED_KEYWORDS = new Set<string>([
  // opt-out
  "STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REVOKE", "OPTOUT",
  // opt-in (Twilio's set — note HOTLINE is ours, handled by the webhook)
  "START", "UNSTOP", "YES",
  // help
  "HELP",
]);

/** True if the FIRST token is a keyword Twilio's Opt-Out engine replies to. */
export function isTwilioManagedKeyword(body: string): boolean {
  return TWILIO_MANAGED_KEYWORDS.has(firstToken(body));
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

/** Exposed for tests: every canned reply, so a test can assert length bounds. */
export const ALL_REPLIES: ReadonlyArray<{ topic: KeywordTopic; reply: string }> =
  Object.entries(REPLIES).map(([topic, reply]) => ({
    topic: topic as KeywordTopic,
    reply,
  }));
