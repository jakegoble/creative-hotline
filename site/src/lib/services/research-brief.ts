/**
 * V2 Batch 3 — Research Brief auto-generation.
 *
 * Reads intake answers (+ brand links + uploaded files), asks Claude to produce
 * a structured Research Brief: Content Health Score, voice analysis, visual ID,
 * audience read, top posts, content gaps, story hooks, "The Unlock" hypothesis.
 *
 * Output is JSON stored on the Intake DB row in `Research Brief JSON` (rich
 * text). The Morning Prep dashboard reads this on session-prep load.
 *
 * Scope note (V2 launch): research is text-only — Claude reasons from intake
 * + brand_links text + Tally file metadata. Real IG/TikTok scraping (Apify
 * actor wiring) is a Phase 2 follow-up. The prompt is designed so the same
 * brief shape works whether the inputs include scraped post data or not.
 *
 * Cost: each call is ~3-5K tokens of context + ~2-3K tokens of output =
 * roughly $0.20-$0.40 with Sonnet. Auto-reload threshold ($10) gives us
 * 25-50 briefs of headroom between reloads.
 */

import { config } from "../config";
import type { IntakeRecord } from "./notion";

// ---------------------------------------------------------------------------
// Output shape — what the brief contains
// ---------------------------------------------------------------------------

export interface ResearchBrief {
  /** One-line orienting summary of who this client is. 1 sentence. */
  clientSnapshot: string;
  /** Morning Prep Section 01 (Brand & Positioning, M lead). Claude's read on
   *  voice, visual identity, and brand-promise gaps. 3-5 short bullets. */
  brandPositioning: string[];
  /** Morning Prep Section 02 (Distribution & Systems, J lead). SEO /
   *  conversion-path / owned-audience reads + the core systems gap. 3-5 bullets. */
  distributionSystems: string[];
  /** Morning Prep Section 03 (Audience, shared). Who they actually reach vs.
   *  who they want + reference brands worth naming. 3-5 short bullets. */
  audience: string[];
  /** Morning Prep Section 04 (Creative Authority Audit). Claude's baseline
   *  score (1-5, integer) + one-line read for each of the four pillars. */
  authorityBaseline: {
    positioning: { score: number; note: string };
    messaging: { score: number; note: string };
    execution: { score: number; note: string };
    distribution: { score: number; note: string };
  };
  /** "The Unlock" — the single biggest hypothesis + the question that tests it. */
  unlock: {
    /** WHAT WE SEE (Workshop §04) — the surface-level pattern/symptom we
     *  observe in their brand. Distinct from `hypothesis`: this is the
     *  observable thing, the hypothesis is the underlying cause. 1-2 sentences. */
    observation: string;
    hypothesis: string; // 2-3 sentences — the one thread to pull on the call (the GAP / underlying cause)
    testQuestion: string; // 1 sentence M+J can literally ask
  };
  /** Hard "do not" guardrails for the session. 2-4 short bullets. */
  thingsToNotDo: string[];
  /** Key unknowns M+J should resolve live. 2-4 short bullets. */
  openQuestions: string[];

  // --- V2 workshop-facing fields (added 2026-05-27 for Megha's edit-pass) ---
  /** Workshop §01 "What's actually happening" — a CLEANED, clarified 1-2
   *  sentence read-back of the client's own story (fix spelling/grammar,
   *  de-jargon, keep their meaning). Written TO the client (2nd person). */
  intakeReadback: string;
  /** Workshop §02 "What we love" — GENUINE positives about their brand.
   *  brand = Megha's read, systems = Jake's read. 2-3 bullets each, 2nd person. */
  whatsWorking: { brand: string[]; systems: string[] };
  /** Workshop §04 "What we'd push on" — CONSTRUCTIVE client-facing feedback
   *  (not internal notes). brand = Megha, systems = Jake. 2-3 bullets each,
   *  2nd person, specific and kind-but-honest. */
  whatToPushOn: { brand: string[]; systems: string[] };
  /** Workshop §05 "Here's the play" — three pre-drafted moves. For each
   *  horizon, a DIY version (they do it themselves) AND a Level-Up version
   *  (the same move done with help / better tools), plus WHY it matters.
   *  All 2nd person, editable live by M+J. */
  moves: Array<{
    horizon: "72-hour" | "1-week" | "1-month";
    diy: string;
    levelUp: string;
    why: string;
  }>;

  // --- V2 richer social/creative analysis (added 2026-06-01, Megha edit-pass) ---
  //
  // PHASE NOTE: These sections deepen the *qualitative* read of the client's
  // brand and content, modeled on the original V1 brief template's richer
  // sections. In Phase 1 (now) they are written from the intake TEXT alone —
  // the generator must NEVER invent follower counts, engagement %, or post
  // metrics it cannot actually see. Any numeric dimension that genuinely needs
  // the live feed is flagged "needs live audit" (score: null).
  //
  // PHASE 2 (future): real engagement metrics + content-health scoring computed
  // from the actual feed will arrive via client OAuth social connectors. These
  // same fields will then be populated with live data instead of "needs live
  // audit" placeholders. All fields below are OPTIONAL so old briefs without
  // them still parse and render.

  /** Six-dimension content health scorecard. Each sub-score is 1-5 ONLY where
   *  judgable from intake text; dimensions requiring the live feed (esp.
   *  visualQuality, engagement) are set to score: null + note "needs live audit". */
  contentHealth?: {
    visualQuality: { score: number | null; note: string };
    brandCohesion: { score: number | null; note: string };
    copyCaptions: { score: number | null; note: string };
    engagement: { score: number | null; note: string };
    storytelling: { score: number | null; note: string };
    conversionPath: { score: number | null; note: string };
  };
  /** Brand voice assessment — INTERNAL Research Brief, THIRD person
   *  analytical ("Their voice is…"), never "your". */
  brandVoice?: string;
  /** Visual identity read — THIRD person; if the feed isn't visible, say so
   *  plainly ("the studio's feed needs a live look"). */
  visualIdentity?: string;
  /** Where they sit vs competitors — qualitative, third-person bullets. */
  competitivePosition?: string[];
  /** The story they tell now vs the one they should tell — THIRD person. */
  storyTelling?: { current: string; shouldBe: string };
  /** 3-6 specific, concrete content ideas (third-person/neutral framing). */
  storyHooks?: string[];
  /** 2-4 levers that could make content hit (third-person/neutral). */
  viralityLevers?: string[];
  /** The hard truth, named directly but kindly — THIRD person analytical. */
  elephant?: string;
  /** Brands worth name-dropping as north stars. */
  referenceBrands?: string[];
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return `You are the strategic research engine for The Creative Hotline, a high-ticket creative consultancy ($499–$1,500/session) co-run by Megha Kraft and Jake Goble. You produce 5-minute pre-call research briefs that give Megha and Jake everything they need to walk into a 45-minute workshop session knowing the client's situation cold.

Be specific, not generic. Brutal honesty is the brand — soft praise is worse than useful critique. If the intake is thin, say so in the field; do NOT invent data you don't have (e.g., if you can't see their feed, say the audit needs a live check rather than guessing a visual-identity verdict).

Voice: Frankie-adjacent — warm, sharp, decisive, zero buzzwords. Talk like someone who has seen 200 creative founders, not like a marketing textbook.

Return ONLY valid JSON matching EXACTLY this schema (no prose preamble, no markdown fences, no extra keys, no trailing commas):

{
  "clientSnapshot": "one sentence on who this client is",
  "brandPositioning": ["3-5 bullets: Claude's read on their voice, visual identity, and brand-promise gaps"],
  "distributionSystems": ["3-5 bullets: distribution / SEO / conversion-path / owned-audience reads + the core systems gap"],
  "audience": ["3-5 bullets: who they actually reach vs who they want + reference brands worth naming"],
  "authorityBaseline": {
    "positioning": { "score": 3, "note": "one-line read; score is an integer 1-5" },
    "messaging": { "score": 3, "note": "one-line read; integer 1-5" },
    "execution": { "score": 3, "note": "one-line read; integer 1-5" },
    "distribution": { "score": 3, "note": "one-line read; integer 1-5" }
  },
  "unlock": {
    "observation": "1-2 sentences, THIRD person — the surface PATTERN observed in the client (what we SEE). This is the symptom, not the cause. Describe the client neutrally, not as 'you'.",
    "hypothesis": "2-3 sentences — the underlying GAP beneath the observation (the single biggest thread to pull). Must be DISTINCT from observation.",
    "testQuestion": "one sentence M+J can literally ask to test the hypothesis"
  },
  "thingsToNotDo": ["2-4 bullets: hard 'do not' guardrails for this session"],
  "openQuestions": ["2-4 bullets: key unknowns M+J should resolve live"],
  "intakeReadback": "1-2 sentences, written TO the client (2nd person), cleanly summarizing their own story back to them — fix spelling/grammar, drop jargon, keep their meaning. e.g. 'You're a ceramics studio that blew up on TikTok, and now you're not sure how to turn that attention into steady wholesale orders.'",
  "whatsWorking": {
    "brand": ["2-3 bullets — GENUINE positives about their brand/positioning, 2nd person ('Your voice is unmistakably yours…')"],
    "systems": ["2-3 bullets — GENUINE positives about their distribution/systems, 2nd person"]
  },
  "whatToPushOn": {
    "brand": ["2-3 bullets — CONSTRUCTIVE, client-facing feedback on brand/positioning, 2nd person, specific and kind-but-honest"],
    "systems": ["2-3 bullets — CONSTRUCTIVE, client-facing feedback on distribution/systems, 2nd person"]
  },
  "moves": [
    { "horizon": "72-hour", "diy": "the specific action they can do themselves in 72 hours, 2nd person", "levelUp": "the same move done with help / better tools", "why": "1 sentence — why this matters, tied to the diagnosis" },
    { "horizon": "1-week", "diy": "…", "levelUp": "…", "why": "…" },
    { "horizon": "1-month", "diy": "…", "levelUp": "…", "why": "…" }
  ],
  "contentHealth": {
    "visualQuality": { "score": null, "note": "needs live audit" },
    "brandCohesion": { "score": 3, "note": "1-line read; integer 1-5 if judgable from intake text, else null + 'needs live audit'" },
    "copyCaptions": { "score": 3, "note": "1-line read; 1-5 if judgable, else null" },
    "engagement": { "score": null, "note": "needs live audit" },
    "storytelling": { "score": 3, "note": "1-line read; 1-5 if judgable, else null" },
    "conversionPath": { "score": 3, "note": "1-line read; 1-5 if judgable, else null" }
  },
  "brandVoice": "2-3 sentences, THIRD person analytical — the read on the client's voice and tone (warm, sharp, on-brand?). e.g. 'Their voice is warm but inconsistent…' — NEVER 'your'.",
  "visualIdentity": "2-3 sentences, THIRD person — read on their visual identity; if you can't see the feed, say so plainly ('this needs a live look at their feed'). NEVER 'your'.",
  "competitivePosition": ["2-4 bullets, THIRD person — where the client sits vs competitors, qualitative (no invented market-share numbers). NEVER 'you'."],
  "storyTelling": {
    "current": "1-2 sentences, THIRD person — the story the client is telling right now ('Right now they're telling a story about…'). NEVER 'you'.",
    "shouldBe": "1-2 sentences, THIRD person — the sharper story they should be telling. NEVER 'you'."
  },
  "storyHooks": ["3-6 specific, concrete content ideas tailored to THIS client (third-person/neutral framing, not 'you')"],
  "viralityLevers": ["2-4 levers that could make their content actually hit (third-person/neutral, not 'you')"],
  "elephant": "1-2 sentences, THIRD person — the hard truth to name directly, kindly. The thing nobody's said out loud yet (e.g. 'The studio is hiding behind…'). NEVER 'you'.",
  "referenceBrands": ["1-4 brands worth name-dropping as north stars for this client"]
}

PHASE 1 — TEXT-ONLY ANALYSIS (CRITICAL): You are working from the intake TEXT and brand-link text ONLY. You can NOT see the client's live feed. Do NOT invent follower counts, engagement rates, post metrics, view counts, or any number you cannot derive from the intake. For contentHealth, score a dimension 1-5 ONLY when the intake text genuinely supports a judgment; for any dimension that requires seeing the live feed (especially "visualQuality" and "engagement"), set "score": null and "note": "needs live audit". When in doubt, flag what needs a live audit rather than guessing. (Phase 2 will supply real social data via client OAuth connectors — until then, honesty about what you can't see is the rule.)

Every authorityBaseline score MUST be an integer from 1 to 5. When the intake is too thin to judge a pillar, score it conservatively (low) and say so in the note. The "unlock" is the most important field — make the hypothesis a clear, single-thread thesis, and keep "observation" (what we SEE on the surface) DISTINCT from "hypothesis" (the GAP underneath).

POINT OF VIEW — IMPORTANT (two distinct voices, do not mix them up):

(1) CLIENT-FACING fields — SECOND PERSON ("you", "your"): intakeReadback, whatsWorking, whatToPushOn, and moves. ONLY these four. They are read aloud / shown on screen to the client during the workshop, prep, and action-plan, so address the client directly ("You're a ceramics studio that…", "Your voice is unmistakably yours…"). Never third person here.

(2) INTERNAL RESEARCH-BRIEF analysis fields — THIRD PERSON, neutral analytical ("Their…", "The studio's…", "<Brand> is…"): brandVoice, visualIdentity, storyTelling (current + shouldBe), elephant, competitivePosition, storyHooks, viralityLevers — PLUS the already-neutral clientSnapshot, brandPositioning, distributionSystems, audience, authorityBaseline notes, contentHealth notes, thingsToNotDo, openQuestions, and unlock (observation/hypothesis/testQuestion). These render in the INTERNAL pre-call Research Brief that only Megha & Jake read. Write Claude's neutral read — NEVER address the client as "you"/"your" in any of these. Our point of view ("what we love / what we'd push on") lives in Morning Prep, not in this brief.`;
}

function buildUserPrompt(intake: IntakeRecord, extras: { priceRange?: string; monthlyRevenue?: string; teamSize?: string; primaryPlatform?: string; magicWand?: string; inspiration?: string; extraContext?: string }): string {
  const links = intake.website_ig ? `Brand link: ${intake.website_ig}` : "No brand link provided";
  const deltaBlock = extras.extraContext && extras.extraContext.trim()
    ? `\nNEW SINCE THE LAST BRIEF (regeneration delta — weigh this heavily)\n================================================================\n${extras.extraContext.trim()}\n`
    : "";
  return `Generate the Research Brief for this client.
${deltaBlock}
CLIENT INTAKE
=============
Name: ${intake.client_name || "Unknown"}
Brand: ${intake.brand || "(not specified)"}
Role: ${intake.role || "(not specified)"}
${links}

Creative challenge they wrote: "${intake.creative_emergency || "(blank)"}"
What they've already tried: "${intake.what_theyve_tried || "(blank)"}"
Desired outcome: ${intake.desired_outcome.join(", ") || "(none selected)"}
Constraints / what to avoid: "${intake.constraints || "(blank)"}"
Deadline: "${intake.deadline || "(blank)"}"

OPERATIONAL REALITY (V2 Q10–Q17)
=================================
Price range: ${extras.priceRange || "(unknown)"}
Monthly revenue: ${extras.monthlyRevenue || "(unknown)"}
Team size: ${extras.teamSize || "(unknown)"}
Primary platform: ${extras.primaryPlatform || "(unknown)"}
Magic wand answer: "${extras.magicWand || "(blank)"}"
Inspirations they cited: "${extras.inspiration || "(blank)"}"

YOUR TASK
=========
Produce the Research Brief as JSON matching the schema in the system prompt EXACTLY. Be specific to THIS client. Where the intake is thin, score authority pillars conservatively and note that a live audit is needed rather than inventing a verdict. The "unlock" hypothesis is the most important field — give M+J one clear thread to pull on the call.

Return ONLY the JSON object.`;
}

// ---------------------------------------------------------------------------
// Claude call
// ---------------------------------------------------------------------------

const ANTHROPIC_BASE = "https://api.anthropic.com/v1";

interface MessagesResponse {
  content: { type: string; text: string }[];
}

/**
 * Generate a Research Brief from an Intake record + V2 extras.
 * Returns the parsed brief + the raw JSON string we should persist.
 */
export async function generateResearchBrief(
  intake: IntakeRecord,
  extras: {
    priceRange?: string;
    monthlyRevenue?: string;
    teamSize?: string;
    primaryPlatform?: string;
    magicWand?: string;
    inspiration?: string;
    extraContext?: string;
  } = {},
): Promise<{ brief: ResearchBrief; rawJson: string }> {
  if (!config.anthropic.apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropic.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      max_tokens: 8192,
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(intake, extras),
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as MessagesResponse;
  const text = data.content[0]?.text ?? "";

  // Strip optional ```json fences if Claude includes them despite instructions.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let brief: ResearchBrief;
  try {
    brief = JSON.parse(cleaned) as ResearchBrief;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown parse error";
    throw new Error(
      `Research Brief JSON parse failed: ${message}. Raw response (first 500 chars): ${cleaned.slice(0, 500)}`,
    );
  }

  return { brief, rawJson: cleaned };
}
