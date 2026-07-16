/**
 * TCH Frameworks Library — the front door for new ways of thinking.
 *
 * Reads the "TCH Frameworks Library" Notion DB (under Creative Hotline HQ).
 * Jake or Megha add a row (Name, Prompt, Applies To), flip Status to "Locked",
 * and the framework starts flowing into the matching generators on the next
 * run — no code change, no deploy.
 *
 * Consumed by: research-brief.ts, action-plan.ts (append getFrameworksBlock()
 * output to the user prompt). Workshop / POV Tool wiring can reuse the same
 * helper later.
 *
 * FAIL-SOFT: any Notion error returns "" — a generation must never fail
 * because the library was unreachable. Results are module-cached for 10 min
 * per surface, so bursts of generations don't hammer Notion.
 */

import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "../config";

/** Data source ID of "TCH Frameworks Library" (DB lives under CH HQ). */
const FRAMEWORKS_DATA_SOURCE_ID = "05823d14-587c-4eec-9cc8-e5abe4ea6b2b";

export type FrameworkSurface =
  | "Research Brief"
  | "Action Plan"
  | "Workshop"
  | "POV Tool";

export interface Framework {
  name: string;
  prompt: string;
  whenToUse: string;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<FrameworkSurface, { at: number; block: string }>();

let _client: NotionClient | null = null;
function getClient(): NotionClient {
  if (!_client) {
    if (!config.notion.apiKey) {
      throw new Error("NOTION_API_KEY is not configured");
    }
    _client = new NotionClient({ auth: config.notion.apiKey });
  }
  return _client;
}

function richText(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "rich_text"
    ? v.rich_text.map((t) => t.plain_text).join("")
    : "";
}

function title(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "title" ? v.title.map((t) => t.plain_text).join("") : "";
}

async function fetchLockedFrameworks(
  surface: FrameworkSurface,
): Promise<Framework[]> {
  const client = getClient();
  const response = await client.dataSources.query({
    data_source_id: FRAMEWORKS_DATA_SOURCE_ID,
    filter: {
      and: [
        { property: "Status", select: { equals: "Locked" } },
        { property: "Applies To", multi_select: { contains: surface } },
      ],
    },
    page_size: 25,
  });

  const frameworks: Framework[] = [];
  for (const page of response.results) {
    if (!("properties" in page)) continue;
    const p = (page as PageObjectResponse).properties;
    const name = title(p, "Name").trim();
    const prompt = richText(p, "Prompt").trim();
    if (!name || !prompt) continue; // a framework without a prompt is a note, not a directive
    frameworks.push({ name, prompt, whenToUse: richText(p, "When to Use").trim() });
  }
  return frameworks;
}

/**
 * Returns a ready-to-append prompt block of all Locked frameworks for the
 * given surface, or "" when none exist / Notion is unreachable.
 */
export async function getFrameworksBlock(
  surface: FrameworkSurface,
): Promise<string> {
  const hit = cache.get(surface);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.block;

  let block = "";
  try {
    const frameworks = await fetchLockedFrameworks(surface);
    if (frameworks.length > 0) {
      const lines = frameworks.map((f) => `- ${f.name}: ${f.prompt}`);
      block = [
        "FRAMEWORKS TO APPLY (locked TCH methodology from the Frameworks Library — apply each where relevant; these shape HOW you think, they never override the factual inputs above):",
        ...lines,
      ].join("\n");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[frameworks] library unreachable (fail-soft, continuing without): ${message}`);
    // Don't cache failures for the full TTL — retry sooner.
    cache.set(surface, { at: Date.now() - CACHE_TTL_MS + 60_000, block: "" });
    return "";
  }

  cache.set(surface, { at: Date.now(), block });
  return block;
}
