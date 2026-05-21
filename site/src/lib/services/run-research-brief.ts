/**
 * Research Brief orchestrator — the single source of truth for "generate the
 * brief for this intake and persist it."
 *
 * Used by BOTH:
 *   - POST /api/research-brief/generate   (explicit / UI safety-net trigger)
 *   - POST /api/tally/webhook             (background auto-trigger after intake)
 *
 * Why this exists: generation used to live inline in the generate route, so the
 * only way to kick it off was a manual "Generate" button on the Hub. Megha's
 * expectation (2026-05-21) is that the brief generates AUTOMATICALLY after the
 * Tally intake and is simply linked for review — no button. Extracting the flow
 * here lets the Tally webhook fire it in the background and lets any surface
 * (Hub / Morning Prep) safely re-trigger a stuck or failed run without a cron.
 *
 * SELF-HEALING / IDEMPOTENCY: this is safe to call repeatedly. It reads the
 * current state first and:
 *   - skips if a brief is already Ready (non-empty JSON),
 *   - skips if a *fresh* run is already in-flight (Generating < STALE_MS old),
 *   - otherwise proceeds (Not Generated, Failed, or a *stale* Generating whose
 *     function was killed mid-flight — e.g. a cold-start timeout — and left the
 *     row dangling on "Generating" with empty JSON forever).
 */

import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import { generateResearchBrief } from "@/lib/services/research-brief";
import { updateIntakeResearchBrief } from "@/lib/services/notion-intake-write";
import type { IntakeRecord } from "@/lib/services/notion";

/**
 * A "Generating" row older than this with no completion is treated as a dead
 * run and is eligible for re-generation. A real Claude call is ~10-15s, so 4
 * minutes is comfortably past any legitimate in-flight run.
 */
const STALE_GENERATING_MS = 4 * 60 * 1000;

let _client: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_client) _client = new NotionClient({ auth: config.notion.apiKey });
  return _client;
}

// --- Lightweight property extractors (kept local to avoid coupling) ---------
function getTitle(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "title" ? v.title.map((t) => t.plain_text).join("") : "";
}
function getText(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "rich_text" ? v.rich_text.map((t) => t.plain_text).join("") : "";
}
function getEmail(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "email" && v.email ? v.email : "";
}
function getUrl(p: PageObjectResponse["properties"], key: string): string | undefined {
  const v = p[key];
  return v?.type === "url" && v.url ? v.url : undefined;
}
function getMultiSelect(p: PageObjectResponse["properties"], key: string): string[] {
  const v = p[key];
  return v?.type === "multi_select" ? v.multi_select.map((s) => s.name) : [];
}
function getSelect(p: PageObjectResponse["properties"], key: string): string | undefined {
  const v = p[key];
  return v?.type === "select" && v.select ? v.select.name : undefined;
}
function getDateStart(p: PageObjectResponse["properties"], key: string): string | undefined {
  const v = p[key];
  return v?.type === "date" && v.date?.start ? v.date.start : undefined;
}

export type RunBriefResult =
  | { ok: true; intakeId: string; status: "Ready"; generated: true }
  | { ok: true; intakeId: string; status: "Ready" | "Generating"; skipped: "already_ready" | "in_flight" }
  | { ok: false; intakeId: string; status: "Failed"; error: string };

/**
 * Read intake, decide whether to (re)generate, and if so call Claude and
 * persist the result. Safe to call from anywhere, any number of times.
 */
export async function runResearchBriefGeneration(
  intakeId: string,
): Promise<RunBriefResult> {
  // 1. Read current state to decide whether to proceed (idempotency guard).
  let page: PageObjectResponse;
  try {
    page = (await getNotion().pages.retrieve({ page_id: intakeId })) as PageObjectResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : "intake_fetch_failed";
    return { ok: false, intakeId, status: "Failed", error: message };
  }
  const p = page.properties;

  const currentStatus = getSelect(p, "Research Brief Status") || "Not Generated";
  const currentJson = getText(p, "Research Brief JSON");
  const generatedAt = getDateStart(p, "Research Brief Generated At");

  if (currentStatus === "Ready" && currentJson.trim().length > 0) {
    return { ok: true, intakeId, status: "Ready", skipped: "already_ready" };
  }
  if (currentStatus === "Generating") {
    const startedMs = generatedAt ? Date.parse(generatedAt) : NaN;
    const fresh = Number.isFinite(startedMs) && Date.now() - startedMs < STALE_GENERATING_MS;
    if (fresh) {
      return { ok: true, intakeId, status: "Generating", skipped: "in_flight" };
    }
    // else: stale/dead run — fall through and regenerate.
  }

  // 2. Mark "Generating" with a precise start timestamp (full ISO) so a
  //    concurrent caller sees us as in-flight and a killed run is detectable.
  const startIso = new Date().toISOString();
  try {
    await updateIntakeResearchBrief(intakeId, { status: "Generating", generatedAt: startIso });
  } catch (err) {
    const message = err instanceof Error ? err.message : "notion_status_update_failed";
    return { ok: false, intakeId, status: "Failed", error: message };
  }

  // 3. Build the intake record + V2 extras from the page we already fetched.
  const intake: IntakeRecord = {
    id: page.id,
    client_name: getTitle(p, "Client Name"),
    email: getEmail(p, "Email"),
    role: getText(p, "Role"),
    brand: getText(p, "Brand"),
    website_ig: getUrl(p, "Website / IG"),
    creative_emergency: getText(p, "Creative Emergency"),
    desired_outcome: getMultiSelect(p, "Desired Outcome"),
    what_theyve_tried: getText(p, "What They've Tried"),
    deadline: getText(p, "Deadline"),
    constraints: getText(p, "Constraints / Avoid"),
    intake_status: getSelect(p, "Intake Status") ?? "",
    ai_summary: getText(p, "AI Intake Summary"),
    action_plan_sent: false,
    linked_payment_ids: [],
  };
  const extras = {
    priceRange: getSelect(p, "Price Range"),
    monthlyRevenue: getSelect(p, "Monthly Revenue"),
    teamSize: getSelect(p, "Team Size"),
    primaryPlatform: getSelect(p, "Primary Platform"),
    magicWand: getText(p, "Magic Wand"),
    inspiration: getText(p, "Inspiration"),
  };

  // 4. Call Claude, persist Ready (with a fresh completion timestamp) or Failed.
  try {
    const { rawJson } = await generateResearchBrief(intake, extras);
    await updateIntakeResearchBrief(intakeId, {
      status: "Ready",
      json: rawJson,
      generatedAt: new Date().toISOString(),
    });
    return { ok: true, intakeId, status: "Ready", generated: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "generation_failed";
    await updateIntakeResearchBrief(intakeId, { status: "Failed" }).catch(() => {});
    console.error(`[research-brief] generation failed for ${intakeId}: ${message}`);
    return { ok: false, intakeId, status: "Failed", error: message };
  }
}
