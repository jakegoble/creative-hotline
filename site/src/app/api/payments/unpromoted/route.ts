/**
 * GET /api/payments/unpromoted
 *
 * Returns Payment rows that don't yet have a corresponding Session. Powers
 * the Morning Prep dashboard's admin "Promote to Session" form so Jake can
 * see which paid clients are ready to be scheduled.
 *
 * Caps to the most recent 25 payments to keep the request light.
 *
 * V2 Batch 3b.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _client: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_client) _client = new NotionClient({ auth: config.notion.apiKey });
  return _client;
}

function getTitle(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "title" ? v.title.map((t) => t.plain_text).join("") : "";
}
function getEmail(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "email" && v.email ? v.email : "";
}
function getSelect(p: PageObjectResponse["properties"], key: string): string {
  const v = p[key];
  return v?.type === "select" && v.select ? v.select.name : "";
}
function getDate(p: PageObjectResponse["properties"], key: string): string | undefined {
  const v = p[key];
  return v?.type === "date" && v.date?.start ? v.date.start : undefined;
}

export async function GET() {
  try {
    const client = getNotion();

    // Pull most recent 25 payments.
    const paymentsResp = await client.dataSources.query({
      data_source_id: config.notion.paymentsDbId,
      sorts: [{ property: "Payment Date", direction: "descending" }],
      page_size: 25,
    });

    // Pull all Sessions to get the set of already-promoted Payment IDs.
    // (Sessions volume is small at this stage; full scan is fine.)
    const sessionsResp = await client.dataSources.query({
      data_source_id: config.notion.sessionsDbId,
      page_size: 100,
    });

    const promotedPaymentIds = new Set<string>();
    for (const s of sessionsResp.results) {
      if (!("properties" in s)) continue;
      const linked = (s as PageObjectResponse).properties["Linked Payment"];
      if (linked?.type === "relation") {
        for (const r of linked.relation) promotedPaymentIds.add(r.id);
      }
    }

    const unpromoted = paymentsResp.results
      .filter((page): page is PageObjectResponse => "properties" in page)
      .filter((page) => !promotedPaymentIds.has(page.id))
      .map((page) => {
        const p = page.properties;
        return {
          id: page.id,
          clientName: getTitle(p, "Client Name"),
          email: getEmail(p, "Email"),
          product: getSelect(p, "Product Purchased"),
          status: getSelect(p, "Status"),
          paymentDate: getDate(p, "Payment Date"),
        };
      });

    return NextResponse.json({ count: unpromoted.length, payments: unpromoted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "query_failed";
    return NextResponse.json({ error: "query_failed", message }, { status: 500 });
  }
}
