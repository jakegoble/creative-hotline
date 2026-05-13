/**
 * V2 Action Plan generator.
 *
 * Takes the Workshop JSON (from the live session), the Debrief JSON (Megha's
 * structured post-call form), and an optional Fireflies transcript, and asks
 * Claude to produce a structured client-facing action plan.
 *
 * Output JSON is the source of truth — stored on the Session row's
 * "Action Plan JSON" rich_text field. The public action-plan.html template
 * renders directly from that JSON, so any future re-renders, edits, or
 * exports key off this schema.
 *
 * V2 Batch 6.
 */

import { config } from "@/lib/config";

const BASE = "https://api.anthropic.com/v1";

export interface ActionPlanItem {
  /** Short imperative title — fits on one line. */
  title: string;
  /** 1-3 sentence rationale + concrete first step. */
  detail: string;
  /** Who's responsible. "client" = the customer; "tch" = Megha/Jake. */
  owner: "client" | "tch";
}

export interface ActionPlanV2 {
  version: 1;
  generatedAt: string;
  model: string;
  clientName: string;
  /** 1-line punchy summary. The first thing the client reads. */
  headline: string;
  /** 2-3 sentence overview tying the workshop and debrief together. */
  summary: string;
  /** The "do this now" list — 3-5 items the client should start this week. */
  immediateNextSteps: ActionPlanItem[];
  /** The "next 30 days" list — 3-5 bigger moves to set up. */
  thirtyDayMoves: ActionPlanItem[];
  /** 2-4 open questions for the client to think about / answer back. */
  openQuestions: string[];
  /** Optional links / resource recommendations. May be empty. */
  resources: string[];
  /** Optional closing note from Megha — pulled from her recommendation field. */
  closingNote: string;
}

interface GenerateInput {
  clientName: string;
  workshopJson: string;
  debriefJson: string;
  /** Plain-text Fireflies transcript. May be empty if not available. */
  transcript: string;
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

  const system = `You are Frankie, the AI strategist for The Creative Hotline.

Voice: warm, direct, witty, zero buzzwords. You write like a senior creative friend, not a McKinsey consultant. No "synergies", no "leverage", no "drive value". Use plain English. Short sentences. Specific verbs.

You are producing a client-facing action plan. The client just spent $499 on a Creative Hotline Call. They want clarity and concrete next moves — not a strategy deck.

Rules:
- ALWAYS reference specifics from the workshop or transcript by name (e.g., the client's actual brand, product, channel) — never generic placeholders.
- "owner: tch" only when the action genuinely depends on Megha/Jake doing something on TCH's side (most actions should be owner: client).
- 3-5 items in each of immediateNextSteps and thirtyDayMoves. Not more, not fewer.
- 2-4 open questions, phrased so the client can answer in a quick email.
- 0-4 resources. Skip the section entirely if nothing is genuinely useful — empty array, not filler.
- Headline: max 12 words. Should land like a verdict.
- Summary: 2-3 sentences. Connects the dots between what came up in the workshop and what to do about it.
- Closing note: use Megha's recommendation verbatim if it's good. If empty or weak, write a 1-2 sentence sign-off in her voice.
- Output ONLY valid JSON. No markdown, no commentary, no code fences.`;

  const user = `Generate a Creative Hotline Action Plan for ${input.clientName}.

${workshopBlock}

${debriefBlock}

${transcriptBlock}

Return JSON matching exactly this shape:
{
  "headline": "string (<= 12 words, lands like a verdict)",
  "summary": "string (2-3 sentences)",
  "immediateNextSteps": [
    { "title": "string", "detail": "string (1-3 sentences with a concrete first step)", "owner": "client" | "tch" }
  ],
  "thirtyDayMoves": [
    { "title": "string", "detail": "string", "owner": "client" | "tch" }
  ],
  "openQuestions": ["string", "string"],
  "resources": ["string", ...] or [],
  "closingNote": "string (1-2 sentences in Megha's voice)"
}

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

export async function generateActionPlanV2(
  input: GenerateInput,
): Promise<ActionPlanV2> {
  if (!config.anthropic.apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const { system, user } = buildPrompt(input);

  const res = await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropic.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as MessagesResponse;
  const raw = data.content[0]?.text ?? "";
  if (!raw) throw new Error("Claude returned empty content");

  let parsed: Partial<ActionPlanV2>;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unparseable_json";
    throw new Error(`Action plan JSON parse failed: ${message}. Raw head: ${raw.slice(0, 300)}`);
  }

  // Normalize + defend against missing fields.
  const now = new Date().toISOString();
  const plan: ActionPlanV2 = {
    version: 1,
    generatedAt: now,
    model: data.model || config.anthropic.model,
    clientName: input.clientName,
    headline: typeof parsed.headline === "string" ? parsed.headline.trim() : "Your action plan",
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    immediateNextSteps: Array.isArray(parsed.immediateNextSteps)
      ? parsed.immediateNextSteps.map(normalizeItem).filter((i): i is ActionPlanItem => i !== null)
      : [],
    thirtyDayMoves: Array.isArray(parsed.thirtyDayMoves)
      ? parsed.thirtyDayMoves.map(normalizeItem).filter((i): i is ActionPlanItem => i !== null)
      : [],
    openQuestions: Array.isArray(parsed.openQuestions)
      ? parsed.openQuestions
          .filter((q): q is string => typeof q === "string")
          .map((q) => q.trim())
          .filter(Boolean)
      : [],
    resources: Array.isArray(parsed.resources)
      ? parsed.resources
          .filter((r): r is string => typeof r === "string")
          .map((r) => r.trim())
          .filter(Boolean)
      : [],
    closingNote: typeof parsed.closingNote === "string" ? parsed.closingNote.trim() : "",
  };

  return plan;
}

function normalizeItem(raw: unknown): ActionPlanItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title.trim() : "";
  const detail = typeof r.detail === "string" ? r.detail.trim() : "";
  if (!title && !detail) return null;
  const ownerRaw = typeof r.owner === "string" ? r.owner.trim().toLowerCase() : "client";
  const owner: "client" | "tch" = ownerRaw === "tch" ? "tch" : "client";
  return { title, detail, owner };
}
