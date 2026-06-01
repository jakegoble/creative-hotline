/**
 * V2 Action Plan generator — Megha's 11-section schema.
 *
 * Takes the Workshop JSON (from the live session), the Debrief JSON (Megha's
 * structured post-call form), and an optional Fireflies transcript, and asks
 * Claude to produce the canonical $499 deliverable structured per Megha's spec.
 *
 * Per TCH-Workshop-V2-SPEC.md Doc 05 + TCH-V2-JAKE-IMPLEMENTATION-GUIDE.md:
 * the action plan has 11 distinct sections. Each renders as an approve-able
 * card in the Review Dashboard and appears in the client-facing deliverable.
 *
 * Output JSON is the source of truth — stored on the Session row's
 * "Action Plan JSON" rich_text field. The public action-plan.html template
 * renders directly from this JSON, so any future re-renders, edits, or
 * exports key off this schema.
 *
 * V2 Batch 6 → V2.1 (Megha 11-section schema, 2026-05-14).
 */

import { config } from "@/lib/config";

const BASE = "https://api.anthropic.com/v1";

/** The 4 pillars of the Creative Authority Read audit. */
export type AuthorityPillar =
  | "Positioning"
  | "Messaging"
  | "Execution"
  | "Distribution";

export interface AuthorityPillarScore {
  pillar: AuthorityPillar;
  /** 1-5. 1 = needs major work, 5 = strong. */
  score: number;
  /** 1-2 sentences capturing the read on this pillar. */
  read: string;
}

/** A single action move (used inside actionPlan + can appear standalone). */
export interface ActionMove {
  /** Short imperative title, fits on one line. */
  title: string;
  /** 1-3 sentence rationale + concrete first step. */
  detail: string;
  /** DIY version — what the client does alone. */
  pathA?: string;
  /** Level Up version — what's possible with TCH/external help. */
  pathB?: string;
  /** "client" = customer; "tch" = Megha/Jake. Most should be client. */
  owner: "client" | "tch";
}

/** A single 7/30/90-day benchmark: a concrete goal + how you'll know you hit it. */
export interface Benchmark {
  /** The measurable goal for this horizon. 1 sentence. */
  goal: string;
  /** How the client will know they hit it (the signal). 1 sentence. */
  signal: string;
}

/** A move placed on the Effort/Impact matrix. */
export interface EffortImpactItem {
  title: string;
  quadrant:
    | "high_impact_low_effort" // Do Now (DIY territory)
    | "high_impact_high_effort" // Big Bet (Level Up territory)
    | "low_impact_low_effort" // Fill-in
    | "low_impact_high_effort"; // Time-sink (avoid)
  /** Which path did the client lock on this move? */
  path?: "A" | "B" | null;
}

/**
 * Megha's 11-section action plan schema.
 * Renders both in the Review Dashboard (approve-able cards) and the
 * client-facing action-plan.html deliverable.
 */
export interface ActionPlanV2 {
  version: 2;
  generatedAt: string;
  model: string;
  clientName: string;

  // ---------- Section 1: North Star ----------
  /** Single sentence — the client's compass. Captured verbatim during workshop. */
  northStar: string;

  // ---------- Section 2: Diagnosis / What We Learned ----------
  /** 3-5 sentence read on the real problem beneath the symptom. */
  whatWeLearned: string;

  // ---------- Section 3: Creative Authority Read (the audit) ----------
  authorityRead: {
    /** 4-pillar scores: Positioning / Messaging / Execution / Distribution. */
    pillars: AuthorityPillarScore[];
    /** 2-3 sentence synthesis tying the 4 scores into a narrative. */
    summary: string;
  };

  // ---------- Section 4: What We Love ----------
  /** 2-4 things that are working — strengths to lean into. */
  whatWeLove: string[];

  // ---------- Section 5: Things You Said That Matter (Key Quotes) ----------
  /** 2-5 verbatim quotes from the transcript, attributed to client. */
  thingsYouSaid: string[];

  // ---------- Section 6: What We're Not Doing ----------
  /** 2-5 deliberate exclusions — what to STOP or leave alone. */
  notDoing: string[];

  // ---------- Section 7: Action Plan (72hr / 1wk / 1mo) ----------
  actionPlan: {
    win72hr: ActionMove;
    move1week: ActionMove;
    build1month: ActionMove;
  };

  // ---------- Section 8: Effort/Impact Matrix ----------
  /** 4-8 items placed on the 2×2. */
  effortImpact: EffortImpactItem[];

  // ---------- Section 9: Tools ----------
  /** 2-6 tool recommendations. Specific products + why. */
  tools: string[];

  // ---------- Section 10: What Success Looks Like ----------
  /** 2-3 sentence definition of success at 30/60/90. Kept as a narrative
   *  fallback; the structured `benchmarks` below drive the visual grid. */
  success: string;
  /** Structured 7/30/90-day benchmarks — each a goal + the signal that you
   *  hit it. Rendered as the visual grid in action-plan.html (not buried prose). */
  benchmarks: {
    sevenDay: Benchmark;
    thirtyDay: Benchmark;
    ninetyDay: Benchmark;
  };

  // ---------- Section 11: Continue the Conversation ----------
  /** 1-2 sentence pitch on next step — usually an upsell hook. */
  continueConversation: string;
}

interface GenerateInput {
  clientName: string;
  workshopJson: string;
  debriefJson: string;
  /** Plain-text Fireflies transcript. May be empty if not available. */
  transcript: string;
  /** Research Brief JSON (Claude's pre-call read) from the linked Intake.
   *  Optional — empty string when no brief is on file. Grounds the plan in
   *  the voice / audience / authority-baseline / Unlock established pre-call. */
  researchBriefJson?: string;
}

interface MessagesResponse {
  content: { type: string; text: string }[];
  model?: string;
}

function buildPrompt(input: GenerateInput): { system: string; user: string } {
  const workshopBlock = input.workshopJson
    ? `WORKSHOP JSON (live session output — north star + sorted ideas + Path A/B notes):\n${input.workshopJson}`
    : "WORKSHOP JSON: (none on file)";

  const debriefBlock = input.debriefJson
    ? `DEBRIEF JSON (Megha's structured post-call form):\n${input.debriefJson}`
    : "DEBRIEF JSON: (none on file)";

  const transcriptBlock = input.transcript
    ? `CALL TRANSCRIPT (Fireflies, plain text — use this to ground specifics):\n${input.transcript.slice(0, 60000)}`
    : "CALL TRANSCRIPT: (no transcript linked — work from the workshop + debrief)";

  const researchBriefBlock = input.researchBriefJson
    ? `RESEARCH BRIEF JSON (Claude's pre-call read — voice, audience, authority pillar baselines, the Unlock, things-to-not-do):\n${input.researchBriefJson}`
    : "";

  const system = `You are Frankie, the AI strategist for The Creative Hotline.

Voice: warm, direct, witty, zero buzzwords. You write like a senior creative friend, not a McKinsey consultant. No "synergies", no "leverage", no "drive value". Use plain English. Short sentences. Specific verbs.

You are producing a client-facing action plan — the $499 deliverable. The client just spent that money on a Creative Hotline Call. They want clarity and concrete next moves — not a strategy deck.

The plan has ELEVEN sections, all of which must be filled:

1. **North Star** — single sentence the client said in the workshop. Capture verbatim.
2. **What We Learned (Diagnosis)** — 3-5 sentences naming the REAL problem beneath the symptom.
3. **Creative Authority Read** — score 4 pillars (Positioning / Messaging / Execution / Distribution) on a 1-5 scale + 1-2 sentence read per pillar + 2-3 sentence synthesis.
4. **What We Love** — 2-4 strengths to lean into.
5. **Things You Said That Matter** — 2-5 verbatim quotes from the client (from transcript), attributed to them.
6. **What We're Not Doing** — 2-5 deliberate exclusions (what to STOP, what to leave alone).
7. **Action Plan** — three moves (72-hour win, 1-week move, 1-month build), each with DIY (Path A) AND Level Up (Path B) options.
8. **Effort/Impact Matrix** — 4-8 items placed on the 2×2 (high/low impact × high/low effort).
9. **Tools** — 2-6 specific product recommendations with reasoning.
10. **What Success Looks Like** — 2-3 sentence definition of success at 30/60/90.
11. **Continue the Conversation** — the closing pitch. Use Megha's EXACT line, verbatim, no paraphrasing: "If you want the Creative Hotline to build it with you rather than figure it out alone, we can do that."

Rules:
- ALWAYS reference specifics from the workshop or transcript by name (client's actual brand, product, channel) — never generic placeholders.
- "owner: tch" only when the action genuinely depends on Megha/Jake doing something on TCH's side. Default to "owner: client".
- Quotes in section 5 must be REAL quotes from the transcript. If transcript is empty, pull from workshop JSON ideas/notes. Never fabricate.
- Effort/Impact quadrants: high-impact + low-effort → "high_impact_low_effort" (Do Now / DIY); high-impact + high-effort → "high_impact_high_effort" (Big Bet / Level Up); low-impact + low-effort → "low_impact_low_effort" (Fill-in); low-impact + high-effort → "low_impact_high_effort" (avoid).
- Authority Read pillars use score 1-5. Be honest. A 5 means "strong, no work needed"; a 2 means "needs major work."

PRICING & SCOPE GUARDRAILS (NON-NEGOTIABLE):
- NEVER invent prices or quote a dollar figure for any TCH service. If a move references a paid TCH engagement, say it is "priced separately" rather than naming a number.
- NEVER recommend that The Creative Hotline do copywriting — TCH is NOT a copywriting shop. When copywriting is the need, tell the client to "hire a copywriter."
- NEVER offer "90-minute implementation calls" or invent any TCH service/package/SKU that wasn't established in the workshop. Do not make up offers.
- For DIY tool recommendations (section 9 + the pathA / DIY paths), prefer best-in-class tools, and INCLUDE AI tools where they genuinely help (e.g., Wispr for voice capture, etc.). Recommend the right tool for the job, not a TCH service.

STAND-ALONE RULE (sections 10 & 11): The action plan must make complete sense on its own, without any follow-up call. The "What Success Looks Like" / benchmarks section must NOT introduce new concepts, frameworks, or ideas that weren't discussed in the workshop — only restate and sharpen what's already in the plan. Do not gate value behind a future conversation.

- Output ONLY valid JSON. No markdown, no commentary, no code fences.`;

  const user = `Generate the Creative Hotline Action Plan (11 sections) for ${input.clientName}.
${researchBriefBlock ? `\n${researchBriefBlock}\n` : ""}
${workshopBlock}

${debriefBlock}

${transcriptBlock}

Return JSON matching exactly this shape:
{
  "northStar": "string (single sentence — client's compass, verbatim)",
  "whatWeLearned": "string (3-5 sentences naming the real problem)",
  "authorityRead": {
    "pillars": [
      { "pillar": "Positioning", "score": 1-5, "read": "string (1-2 sentences)" },
      { "pillar": "Messaging", "score": 1-5, "read": "string" },
      { "pillar": "Execution", "score": 1-5, "read": "string" },
      { "pillar": "Distribution", "score": 1-5, "read": "string" }
    ],
    "summary": "string (2-3 sentence synthesis)"
  },
  "whatWeLove": ["string", "string", ...],
  "thingsYouSaid": ["string (quote)", ...],
  "notDoing": ["string", ...],
  "actionPlan": {
    "win72hr":   { "title": "string", "detail": "string", "pathA": "string (DIY)", "pathB": "string (Level Up)", "owner": "client"|"tch" },
    "move1week": { "title": "string", "detail": "string", "pathA": "string", "pathB": "string", "owner": "client"|"tch" },
    "build1month": { "title": "string", "detail": "string", "pathA": "string", "pathB": "string", "owner": "client"|"tch" }
  },
  "effortImpact": [
    { "title": "string", "quadrant": "high_impact_low_effort"|"high_impact_high_effort"|"low_impact_low_effort"|"low_impact_high_effort", "path": "A"|"B"|null }
  ],
  "tools": ["string (best-in-class tool name — why; include AI tools like Wispr where they help; NEVER a TCH service)", ...],
  "success": "string (2-3 sentences defining 30/60/90 success — narrative; restate the plan, introduce NO new concepts)",
  "benchmarks": {
    "sevenDay":  { "goal": "string (concrete, measurable 7-day goal)", "signal": "string (how they'll know they hit it)" },
    "thirtyDay": { "goal": "string (30-day goal)", "signal": "string (the signal)" },
    "ninetyDay": { "goal": "string (90-day goal)", "signal": "string (the signal)" }
  },
  "continueConversation": "If you want the Creative Hotline to build it with you rather than figure it out alone, we can do that."
}

The "benchmarks" must be specific and measurable (not aspirational fluff) — they render as a visual 7/30/90 grid the client tracks against. Benchmarks and "success" must NOT introduce concepts that weren't discussed; the plan stands alone without a follow-up call.

For "continueConversation", use Megha's exact line VERBATIM: "If you want the Creative Hotline to build it with you rather than figure it out alone, we can do that." Do not paraphrase, do not add a price, do not invent an offer.

Pricing/scope: never quote a price (say "priced separately"), never have TCH do copywriting (say "hire a copywriter"), never offer "90-minute implementation calls" or invent TCH packages.

JSON ONLY. No prose around it.`;

  return { system, user };
}

function extractJson(raw: string): string {
  // Defensive: model might wrap in fences despite instructions.
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) return fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

/**
 * Transient errors worth retrying once: HTTP 408 (timeout), 425 (too early),
 * 429 (rate limit), 500-599 (server error). Anthropic occasionally returns
 * 529 (overloaded) and 503 (service unavailable) under load — both retry-safe.
 */
function isTransientStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

interface ClaudeFetchResult {
  res: Response;
  attempt: number;
}

/**
 * Single-retry wrapper around the Claude Messages API call.
 *
 * Retries ONCE on transient HTTP status or network throw. Backoff: 1.5s
 * (Anthropic's overloaded responses typically clear within a couple seconds).
 * Total worst case: ~original + 1.5s + retry latency. Well inside the
 * action-plan generation budget (~30-60s expected).
 *
 * Non-transient errors (400/401/403/404 etc.) fail-fast on first attempt.
 */
async function fetchClaudeWithRetry(body: object): Promise<ClaudeFetchResult> {
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropic.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  };

  // Attempt 1
  let lastErr: unknown = null;
  try {
    const res = await fetch(`${BASE}/messages`, init);
    if (res.ok || !isTransientStatus(res.status)) {
      return { res, attempt: 1 };
    }
    // Transient HTTP — drain body so it doesn't leak, then fall through to retry.
    await res.text().catch(() => "");
    console.warn(
      `[action-plan] Claude ${res.status} on attempt 1 — retrying once after 1.5s`,
    );
  } catch (err) {
    // Network-level failure (DNS, connect, abort, etc.) — also retry-safe.
    lastErr = err;
    const message = err instanceof Error ? err.message : "unknown_fetch_error";
    console.warn(
      `[action-plan] Claude fetch threw on attempt 1 (${message}) — retrying once after 1.5s`,
    );
  }

  await new Promise((r) => setTimeout(r, 1500));

  // Attempt 2 — let any thrown error propagate (no more retries).
  try {
    const res = await fetch(`${BASE}/messages`, init);
    return { res, attempt: 2 };
  } catch (err) {
    const wrapped =
      err instanceof Error
        ? err
        : new Error(
            typeof err === "string" ? err : "Claude fetch failed after retry",
          );
    // Preserve the first-attempt error context if useful.
    if (lastErr && lastErr !== wrapped) {
      const orig = lastErr instanceof Error ? lastErr.message : String(lastErr);
      wrapped.message = `${wrapped.message} (initial: ${orig})`;
    }
    throw wrapped;
  }
}

export async function generateActionPlanV2(
  input: GenerateInput,
): Promise<ActionPlanV2> {
  if (!config.anthropic.apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const { system, user } = buildPrompt(input);

  const { res, attempt } = await fetchClaudeWithRetry({
    model: config.anthropic.model,
    // 11-section plan is bigger output — bump from 4096 to give Claude room.
    max_tokens: 6144,
    system,
    messages: [{ role: "user", content: user }],
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Claude API ${res.status} (attempt ${attempt}): ${errText.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as MessagesResponse;
  const raw = data.content[0]?.text ?? "";
  if (!raw) throw new Error("Claude returned empty content");
  if (attempt > 1) {
    console.info(`[action-plan] succeeded on attempt ${attempt}`);
  }

  let parsed: Partial<ActionPlanV2> & Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unparseable_json";
    throw new Error(`Action plan JSON parse failed: ${message}. Raw head: ${raw.slice(0, 300)}`);
  }

  const now = new Date().toISOString();
  const plan: ActionPlanV2 = {
    version: 2,
    generatedAt: now,
    model: data.model || config.anthropic.model,
    clientName: input.clientName,
    northStar:
      typeof parsed.northStar === "string" ? parsed.northStar.trim() : "",
    whatWeLearned:
      typeof parsed.whatWeLearned === "string"
        ? parsed.whatWeLearned.trim()
        : "",
    authorityRead: normalizeAuthorityRead(parsed.authorityRead),
    whatWeLove: normalizeStringArray(parsed.whatWeLove),
    thingsYouSaid: normalizeStringArray(parsed.thingsYouSaid),
    notDoing: normalizeStringArray(parsed.notDoing),
    actionPlan: normalizeActionPlan(parsed.actionPlan),
    effortImpact: normalizeEffortImpact(parsed.effortImpact),
    tools: normalizeStringArray(parsed.tools),
    success: typeof parsed.success === "string" ? parsed.success.trim() : "",
    benchmarks: normalizeBenchmarks(parsed.benchmarks),
    continueConversation:
      typeof parsed.continueConversation === "string"
        ? parsed.continueConversation.trim()
        : "",
  };

  return plan;
}

// ---------- Normalizers ----------

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeMove(raw: unknown): ActionMove {
  if (!raw || typeof raw !== "object") {
    return { title: "", detail: "", owner: "client" };
  }
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title.trim() : "";
  const detail = typeof r.detail === "string" ? r.detail.trim() : "";
  const pathA = typeof r.pathA === "string" ? r.pathA.trim() : undefined;
  const pathB = typeof r.pathB === "string" ? r.pathB.trim() : undefined;
  const ownerRaw =
    typeof r.owner === "string" ? r.owner.trim().toLowerCase() : "client";
  const owner: "client" | "tch" = ownerRaw === "tch" ? "tch" : "client";
  return {
    title,
    detail,
    ...(pathA ? { pathA } : {}),
    ...(pathB ? { pathB } : {}),
    owner,
  };
}

function normalizeActionPlan(raw: unknown): ActionPlanV2["actionPlan"] {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    win72hr: normalizeMove(r.win72hr),
    move1week: normalizeMove(r.move1week),
    build1month: normalizeMove(r.build1month),
  };
}

function normalizeBenchmark(raw: unknown): Benchmark {
  if (!raw || typeof raw !== "object") return { goal: "", signal: "" };
  const r = raw as Record<string, unknown>;
  return {
    goal: typeof r.goal === "string" ? r.goal.trim() : "",
    signal: typeof r.signal === "string" ? r.signal.trim() : "",
  };
}

function normalizeBenchmarks(raw: unknown): ActionPlanV2["benchmarks"] {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    sevenDay: normalizeBenchmark(r.sevenDay),
    thirtyDay: normalizeBenchmark(r.thirtyDay),
    ninetyDay: normalizeBenchmark(r.ninetyDay),
  };
}

function normalizeAuthorityRead(
  raw: unknown,
): ActionPlanV2["authorityRead"] {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pillars = Array.isArray(r.pillars)
    ? r.pillars
        .map((p): AuthorityPillarScore | null => {
          if (!p || typeof p !== "object") return null;
          const o = p as Record<string, unknown>;
          const pillarRaw =
            typeof o.pillar === "string" ? o.pillar.trim() : "";
          const validPillars: AuthorityPillar[] = [
            "Positioning",
            "Messaging",
            "Execution",
            "Distribution",
          ];
          const pillar = validPillars.find(
            (vp) => vp.toLowerCase() === pillarRaw.toLowerCase(),
          );
          if (!pillar) return null;
          const scoreNum = typeof o.score === "number" ? o.score : Number(o.score);
          const score = Number.isFinite(scoreNum)
            ? Math.max(1, Math.min(5, Math.round(scoreNum)))
            : 3;
          const read = typeof o.read === "string" ? o.read.trim() : "";
          return { pillar, score, read };
        })
        .filter((x): x is AuthorityPillarScore => x !== null)
    : [];
  const summary = typeof r.summary === "string" ? r.summary.trim() : "";
  return { pillars, summary };
}

function normalizeEffortImpact(raw: unknown): EffortImpactItem[] {
  if (!Array.isArray(raw)) return [];
  const validQuadrants: EffortImpactItem["quadrant"][] = [
    "high_impact_low_effort",
    "high_impact_high_effort",
    "low_impact_low_effort",
    "low_impact_high_effort",
  ];
  return raw
    .map((item): EffortImpactItem | null => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title.trim() : "";
      if (!title) return null;
      const qRaw =
        typeof o.quadrant === "string" ? o.quadrant.trim() : "";
      const quadrant = validQuadrants.find((q) => q === qRaw) ||
        "high_impact_low_effort";
      const pRaw = typeof o.path === "string" ? o.path.trim().toUpperCase() : null;
      const path: "A" | "B" | null = pRaw === "A" ? "A" : pRaw === "B" ? "B" : null;
      return { title, quadrant, path };
    })
    .filter((x): x is EffortImpactItem => x !== null);
}
