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
  /** 0-100 — overall content health score with breakdown. */
  contentHealth: {
    score: number;
    breakdown: {
      consistency: number; // 0-25
      clarity: number; // 0-25
      audienceFit: number; // 0-25
      momentum: number; // 0-25
    };
    rationale: string; // 1-2 sentences
  };
  /** Brand voice — adjectives + 1-sentence read of the current voice. */
  voice: {
    descriptors: string[]; // 3-5 single-word adjectives
    currentRead: string; // 2-3 sentences
    aspirational: string; // what the voice WANTS to be — 1-2 sentences
  };
  /** Visual identity — current state read. */
  visualIdentity: {
    descriptors: string[];
    consistency: "high" | "medium" | "low" | "absent";
    notes: string; // 1-2 sentences
  };
  /** Audience read — who they're actually reaching vs who they want. */
  audience: {
    actualRead: string; // 1-2 sentences — who's engaging
    targetMatch: "strong" | "partial" | "weak" | "unknown"; // vs intake target_audience
    gapNotes: string; // 1-2 sentences
  };
  /** Top posts / content callouts (best-guess based on intake links). */
  topContentSignals: string[]; // 3-5 short bullets
  /** Where their content is missing. */
  contentGaps: string[]; // 3-5 short bullets
  /** Story hooks — angles M+J should explore on the call. */
  storyHooks: string[]; // 3-5 hooks, each 1 sentence
  /** "The Unlock" — single biggest hypothesis for what would change everything. */
  unlock: {
    hypothesis: string; // 2-3 sentences
    confidence: "high" | "medium" | "low";
    testable: boolean; // can be validated within 7 days?
  };
  /** Raw notes Claude wants to flag for M+J prep — anything not in structured fields. */
  facilitatorNotes: string; // 2-4 sentences
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return `You are the strategic research engine for The Creative Hotline, a high-ticket creative consultancy ($499–$1,500/session) co-run by Megha Kraft and Jake Goble. You produce 5-minute pre-call research briefs that give Megha and Jake everything they need to walk into a 45-minute workshop session knowing the client's situation cold.

Your output is a structured JSON Research Brief. Be specific, not generic. Brutal honesty is the brand — soft praise is worse than useful critique. If the intake is thin, say so in the field; do NOT invent data you don't have.

Voice: Frankie-adjacent — warm, sharp, decisive, zero buzzwords. Talk like someone who has seen 200 creative founders, not like a marketing textbook.

Return ONLY valid JSON matching the schema. No prose preamble, no markdown fences, no trailing commas.`;
}

function buildUserPrompt(intake: IntakeRecord, extras: { priceRange?: string; monthlyRevenue?: string; teamSize?: string; primaryPlatform?: string; magicWand?: string; inspiration?: string }): string {
  const links = intake.website_ig ? `Brand link: ${intake.website_ig}` : "No brand link provided";
  return `Generate the Research Brief for this client.

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
Produce a Research Brief using the JSON schema described in the system prompt. Be specific to THIS client. Where the intake is thin, mark fields conservatively (e.g., visualIdentity.consistency = "absent", audience.targetMatch = "unknown") rather than guessing. The "Unlock" hypothesis is the most important field — it should give M+J a clear, single-thread thesis to test on the call.

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
      max_tokens: 4096,
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
