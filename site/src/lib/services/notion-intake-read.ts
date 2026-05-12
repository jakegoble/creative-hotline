/**
 * Notion Intake DB — focused read helpers.
 *
 * The existing notion.ts already exports queryIntakeDb() (full table scan).
 * This file adds targeted lookups used by the Sessions auto-link flow.
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

/**
 * Find a single Intake page by email (case-insensitive comparison done
 * server-side by Notion). Returns the most recently created match or null.
 */
export async function findIntakeIdByEmail(
  email: string,
): Promise<string | null> {
  if (!email) return null;
  const client = getClient();
  const response = await client.dataSources.query({
    data_source_id: config.notion.intakeDbId,
    filter: {
      property: "Email",
      email: { equals: email },
    },
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 1,
  });
  const first = response.results[0];
  return first ? first.id : null;
}
