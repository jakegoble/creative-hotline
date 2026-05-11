/**
 * POST /api/research-brief/generate
 *
 * Body: { intakeId: string }
 *
 * Reads the Intake DB row, asks Claude to produce a Research Brief, persists
 * the JSON onto the row, returns the brief.
 *
 * Status flow:
 *   1. Mark row "Generating"
 *   2. Pull intake + V2 extras
 *   3. Call Claude (~$0.20-$0.40, ~10s)
 *   4. Persist JSON, mark "Ready"
 *   5. On any failure, mark "Failed" + return 500 with reason
 *
 * The Morning Prep dashboard reads `Research Brief JSON` directly — no need
 * for callers to round-trip through this route to read the brief.
 *
 * V2 Batch 3.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import type {
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import { generateResearchBrief } from "@/lib/services/research-brief";
import { updateIntakeResearchBrief } from "@/lib/services/notion-intake-write";
import type { IntakeRecord } from "@/lib/services/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Research brief generation can take 8-15s — give it room.
export const maxDuration = 60;

let _client: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_client) _client = new NotionClient({ auth: config.notion.apiKey });
  return _client;
}

// Lightweight property extractors — duplicated here to avoid coupling to
// the read service (which only exports queryIntakeDb, not parseIntake).
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

export async function POST(request: Request) {
  let intakeId: string;
  try {
    const body = (await request.json()) as { intakeId?: string };
    if (!body.intakeId) {
      return NextResponse.json({ error: "missing_intakeId" }, { status: 400 });
    }
    intakeId = body.intakeId;
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  // Mark generating up-front so the dashboard can show a spinner.
  try {
    await updateIntakeResearchBrief(intakeId, { status: "Generating" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "notion_status_update_failed";
    return NextResponse.json({ error: "intake_not_found_or_unwritable", message }, { status: 404 });
  }

  // Pull the intake page.
  let intake: IntakeRecord;
  let extras: Parameters<typeof generateResearchBrief>[1];
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: intakeId,
    })) as PageObjectResponse;
    const p = page.properties;

    intake = {
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

    extras = {
      priceRange: getSelect(p, "Price Range"),
      monthlyRevenue: getSelect(p, "Monthly Revenue"),
      teamSize: getSelect(p, "Team Size"),
      primaryPlatform: getSelect(p, "Primary Platform"),
      magicWand: getText(p, "Magic Wand"),
      inspiration: getText(p, "Inspiration"),
    };
  } catch (err) {
    await updateIntakeResearchBrief(intakeId, { status: "Failed" }).catch(() => {});
    const message = err instanceof Error ? err.message : "intake_fetch_failed";
    return NextResponse.json({ error: "intake_fetch_failed", message }, { status: 500 });
  }

  // Claude call.
  try {
    const { brief, rawJson } = await generateResearchBrief(intake, extras);
    await updateIntakeResearchBrief(intakeId, {
      status: "Ready",
      json: rawJson,
    });
    return NextResponse.json({ ok: true, intakeId, brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : "generation_failed";
    await updateIntakeResearchBrief(intakeId, { status: "Failed" }).catch(() => {});
    console.error(`[research-brief] generation failed for ${intakeId}: ${message}`);
    return NextResponse.json({ error: "generation_failed", message }, { status: 500 });
  }
}
