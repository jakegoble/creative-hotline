/**
 * Notion Intake DB — write operations for V2.
 *
 * Mirrors the pattern of notion-payments-write.ts. Used by the research brief
 * generator (Batch 3) to persist generated briefs onto the intake row.
 */

import { Client as NotionClient } from "@notionhq/client";
import { config } from "../config";

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

function richText(value: string | undefined) {
  if (!value) return { rich_text: [] };
  // Notion rich_text fields cap at 2000 chars per block. Chunk if needed.
  const CHUNK = 2000;
  if (value.length <= CHUNK) {
    return { rich_text: [{ type: "text" as const, text: { content: value } }] };
  }
  const chunks = [];
  for (let i = 0; i < value.length; i += CHUNK) {
    chunks.push({ type: "text" as const, text: { content: value.slice(i, i + CHUNK) } });
  }
  return { rich_text: chunks };
}

export type ResearchBriefStatus = "Not Generated" | "Generating" | "Ready" | "Failed";

/**
 * Update an Intake row with research brief state. All fields optional —
 * pass only what you want to change.
 */
export async function updateIntakeResearchBrief(
  pageId: string,
  updates: {
    status?: ResearchBriefStatus;
    json?: string;
    /** Serialized VersionBlob (see versioning.ts) → "Research Brief Versions
     *  JSON". Optional; only written on regenerate. Degrades gracefully if the
     *  property doesn't exist yet. */
    versionsJson?: string;
    generatedAt?: string; // ISO date — defaults to now if status is Ready
  },
): Promise<void> {
  const client = getClient();
  const properties: Record<string, unknown> = {};

  if (updates.status) {
    properties["Research Brief Status"] = { select: { name: updates.status } };
  }
  if (typeof updates.json === "string") {
    properties["Research Brief JSON"] = richText(updates.json);
  }
  if (typeof updates.versionsJson === "string") {
    properties["Research Brief Versions JSON"] = richText(updates.versionsJson);
  }
  if (updates.generatedAt || updates.status === "Ready") {
    const date = updates.generatedAt ?? new Date().toISOString().slice(0, 10);
    properties["Research Brief Generated At"] = { date: { start: date } };
  }

  if (Object.keys(properties).length === 0) return;

  await client.pages.update({
    page_id: pageId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: properties as any,
  });
}
