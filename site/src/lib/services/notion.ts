/**
 * Notion API service.
 * Fetches and parses records from the Payments and Intake databases.
 */

import { Client as NotionClient } from "@notionhq/client";
import type {
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { config } from "../config";
import type { Client } from "../types";
import { PRODUCT_PRICES } from "../constants";

type Properties = PageObjectResponse["properties"];
type PropertyValue = Properties[string];

// ---------------------------------------------------------------------------
// Property extractors
// ---------------------------------------------------------------------------

function getTitle(props: Properties, key: string): string {
  const p = props[key];
  if (p?.type === "title") return p.title.map((t) => t.plain_text).join("");
  return "";
}

function getText(props: Properties, key: string): string {
  const p = props[key];
  if (p?.type === "rich_text") return p.rich_text.map((t) => t.plain_text).join("");
  return "";
}

function getNumber(props: Properties, key: string): number {
  const p = props[key];
  if (p?.type === "number" && p.number !== null) return p.number;
  return 0;
}

function getSelect(props: Properties, key: string): string {
  const p = props[key];
  if (p?.type === "select" && p.select) return p.select.name;
  return "";
}

function getMultiSelect(props: Properties, key: string): string[] {
  const p = props[key];
  if (p?.type === "multi_select") return p.multi_select.map((s) => s.name);
  return [];
}

function getCheckbox(props: Properties, key: string): boolean {
  const p = props[key];
  if (p?.type === "checkbox") return p.checkbox;
  return false;
}

function getDate(props: Properties, key: string): string | undefined {
  const p = props[key];
  if (p?.type === "date" && p.date?.start) return p.date.start;
  return undefined;
}

function getEmail(props: Properties, key: string): string {
  const p = props[key];
  if (p?.type === "email" && p.email) return p.email;
  return "";
}

function getPhone(props: Properties, key: string): string | undefined {
  const p = props[key];
  if (p?.type === "phone_number" && p.phone_number) return p.phone_number;
  return undefined;
}

function getUrl(props: Properties, key: string): string | undefined {
  const p = props[key];
  if (p?.type === "url" && p.url) return p.url;
  return undefined;
}

function getRelation(props: Properties, key: string): string[] {
  const p = props[key];
  if (p?.type === "relation") return p.relation.map((r) => r.id);
  return [];
}

function getCreatedTime(props: Properties, key: string): string {
  const p = props[key];
  if (p?.type === "created_time") return p.created_time;
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Singleton Notion client
// ---------------------------------------------------------------------------

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
// Auto-paginating query
// ---------------------------------------------------------------------------

async function queryAll(databaseId: string): Promise<PageObjectResponse[]> {
  const client = getClient();
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.dataSources.query({
      data_source_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const page of response.results) {
      if ("properties" in page) pages.push(page as PageObjectResponse);
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

// ---------------------------------------------------------------------------
// Parse Notion page → Client
// ---------------------------------------------------------------------------

function parsePayment(page: PageObjectResponse): Client {
  const p = page.properties;
  const product = getSelect(p, "Product Purchased");
  const amount = getNumber(p, "Payment Amount") || PRODUCT_PRICES[product] || 0;

  return {
    id: page.id,
    name: getTitle(p, "Client Name"),
    email: getEmail(p, "Email"),
    phone: getPhone(p, "Phone"),
    status: getSelect(p, "Status"),
    product,
    amount,
    payment_date: getDate(p, "Payment Date"),
    call_date: getDate(p, "Call Date"),
    lead_source: getSelect(p, "Lead Source"),
    days_to_convert: getNumber(p, "Days to Convert") || undefined,
    created: getCreatedTime(p, "Created"),
  };
}

// ---------------------------------------------------------------------------
// Intake record type
// ---------------------------------------------------------------------------

export interface IntakeRecord {
  id: string;
  client_name: string;
  email: string;
  role: string;
  brand: string;
  website_ig?: string;
  creative_emergency: string;
  desired_outcome: string[];
  what_theyve_tried: string;
  deadline: string;
  constraints: string;
  intake_status: string;
  ai_summary: string;
  call_date?: string;
  action_plan_sent: boolean;
  linked_payment_ids: string[];
}

function parseIntake(page: PageObjectResponse): IntakeRecord {
  const p = page.properties;
  return {
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
    intake_status: getSelect(p, "Intake Status"),
    ai_summary: getText(p, "AI Intake Summary"),
    call_date: getDate(p, "Call Date"),
    action_plan_sent: getCheckbox(p, "Action Plan Sent"),
    linked_payment_ids: getRelation(p, "Linked Payment"),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function queryPaymentsDb(): Promise<Client[]> {
  const pages = await queryAll(config.notion.paymentsDbId);
  return pages.map(parsePayment);
}

export async function queryIntakeDb(): Promise<IntakeRecord[]> {
  const pages = await queryAll(config.notion.intakeDbId);
  return pages.map(parseIntake);
}

export async function ping(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    const client = getClient();
    await client.databases.retrieve({ database_id: config.notion.paymentsDbId });
    return { ok: true, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}
