/**
 * Notion Sessions DB — read operations.
 *
 * Used by: Morning Prep dashboard (today's sessions), Live Workshop screen
 * (single session by ID), Debrief & Send pipelines (state queries).
 *
 * Note: parses raw Notion pages into a typed SessionRecord — keep this in sync
 * with notion-sessions-write.ts whenever the DB schema changes.
 */

import { Client as NotionClient } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDataSourceParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { config } from "../config";
import type { SessionState } from "./notion-sessions-write";

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

// ---------------------------------------------------------------------------
// Property extractors
// ---------------------------------------------------------------------------

type Properties = PageObjectResponse["properties"];

function getTitle(p: Properties, key: string): string {
  const v = p[key];
  return v?.type === "title" ? v.title.map((t) => t.plain_text).join("") : "";
}
function getText(p: Properties, key: string): string {
  const v = p[key];
  return v?.type === "rich_text" ? v.rich_text.map((t) => t.plain_text).join("") : "";
}
function getDate(p: Properties, key: string): string | undefined {
  const v = p[key];
  return v?.type === "date" && v.date?.start ? v.date.start : undefined;
}
function getSelect(p: Properties, key: string): string | undefined {
  const v = p[key];
  return v?.type === "select" && v.select ? v.select.name : undefined;
}
function getCheckbox(p: Properties, key: string): boolean {
  const v = p[key];
  return v?.type === "checkbox" ? v.checkbox : false;
}
function getUrl(p: Properties, key: string): string | undefined {
  const v = p[key];
  return v?.type === "url" && v.url ? v.url : undefined;
}
function getRelation(p: Properties, key: string): string[] {
  const v = p[key];
  return v?.type === "relation" ? v.relation.map((r) => r.id) : [];
}
function getNumber(p: Properties, key: string): number | undefined {
  const v = p[key];
  if (v?.type === "unique_id") return v.unique_id.number ?? undefined;
  return undefined;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SessionRecord {
  id: string;
  sessionId?: number;
  clientName: string;
  state: SessionState | "Unknown";
  scheduledAt?: string;
  linkedPaymentIds: string[];
  linkedIntakeIds: string[];
  snapshotJson: string;
  workshopJson: string;
  debriefJson: string;
  actionPlanJson: string;
  actionPlanUrl?: string;
  firefliesUrl?: string;
  referralCode: string;
  emailSent: boolean;
  smsSent: boolean;
  sentAt?: string;
  created: string;
  updated: string;
}

function parseSession(page: PageObjectResponse): SessionRecord {
  const p = page.properties;
  const stateRaw = getSelect(p, "State");
  const state: SessionRecord["state"] =
    stateRaw === "Prep" ||
    stateRaw === "Session" ||
    stateRaw === "Debrief" ||
    stateRaw === "Review" ||
    stateRaw === "Sent"
      ? stateRaw
      : "Unknown";

  return {
    id: page.id,
    sessionId: getNumber(p, "Session ID"),
    clientName: getTitle(p, "Client Name"),
    state,
    scheduledAt: getDate(p, "Session Date"),
    linkedPaymentIds: getRelation(p, "Linked Payment"),
    linkedIntakeIds: getRelation(p, "Linked Intake"),
    snapshotJson: getText(p, "Snapshot JSON"),
    workshopJson: getText(p, "Workshop Session JSON"),
    debriefJson: getText(p, "Debrief JSON"),
    actionPlanJson: getText(p, "Action Plan JSON"),
    actionPlanUrl: getUrl(p, "Action Plan URL"),
    firefliesUrl: getUrl(p, "Fireflies Transcript URL"),
    referralCode: getText(p, "Referral Code Issued"),
    emailSent: getCheckbox(p, "Email Sent"),
    smsSent: getCheckbox(p, "SMS Sent"),
    sentAt: getDate(p, "Sent At"),
    created: page.created_time,
    updated: page.last_edited_time,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get all sessions whose Session Date falls on the given calendar date
 * (interpreted in the date's local TZ — we filter on the date string).
 *
 * @param dateISO YYYY-MM-DD. Defaults to today (server's UTC date).
 */
export async function getSessionsForDate(
  dateISO?: string,
): Promise<SessionRecord[]> {
  const date = dateISO ?? new Date().toISOString().slice(0, 10);
  const client = getClient();

  const filter: QueryDataSourceParameters["filter"] = {
    and: [
      { property: "Session Date", date: { on_or_after: date } },
      { property: "Session Date", date: { on_or_before: date } },
    ],
  };

  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.dataSources.query({
      data_source_id: config.notion.sessionsDbId,
      filter,
      sorts: [{ property: "Session Date", direction: "ascending" }],
      start_cursor: cursor,
      page_size: 100,
    });
    for (const page of response.results) {
      if ("properties" in page) pages.push(page as PageObjectResponse);
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages.map(parseSession);
}

/**
 * Get a single Session by Notion page ID.
 */
export async function getSessionById(
  pageId: string,
): Promise<SessionRecord | null> {
  try {
    const page = (await getClient().pages.retrieve({
      page_id: pageId,
    })) as PageObjectResponse;
    return parseSession(page);
  } catch {
    return null;
  }
}

/**
 * Get all sessions in a given state. Used by Review dashboard, send pipeline.
 */
export async function getSessionsByState(
  state: SessionState,
): Promise<SessionRecord[]> {
  const client = getClient();
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.dataSources.query({
      data_source_id: config.notion.sessionsDbId,
      filter: { property: "State", select: { equals: state } },
      sorts: [{ property: "Session Date", direction: "ascending" }],
      start_cursor: cursor,
      page_size: 100,
    });
    for (const page of response.results) {
      if ("properties" in page) pages.push(page as PageObjectResponse);
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages.map(parseSession);
}
