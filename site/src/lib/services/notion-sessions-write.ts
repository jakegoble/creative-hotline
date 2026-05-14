/**
 * Notion Sessions DB — write operations.
 *
 * Sessions are the unit of work in V2. One Session per booked workshop call,
 * progressing through 5 states: Prep → Session → Debrief → Review → Sent.
 *
 * Sessions are created when a Payment row is "promoted" to a Session — either
 * (a) manually via the Morning Prep dashboard's admin form, or (b) automatically
 * when Calendly fires a `invitee.created` webhook (Batch 4+ wire-up).
 *
 * Used by: /api/sessions/from-payment (manual promote), Calendly webhook (later),
 * the live workshop screen (state transitions), the debrief pipeline, the send
 * pipeline, and the follow-up engine.
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
  // Notion rich_text caps at 2000 chars per block. Chunk if needed.
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

export type SessionState = "Prep" | "Session" | "Debrief" | "Review" | "Sent";

export interface SessionCreateInput {
  /** Title displayed in Notion — usually "Client Name — Product". */
  clientName: string;
  /** ISO date or datetime for when the workshop is scheduled. */
  scheduledAt: string;
  /** Notion page ID of the Payment row this Session was promoted from. */
  paymentPageId: string;
  /** Optional Notion page ID of the linked Intake row, if known. */
  intakePageId?: string;
  /** Optional snapshot blob — frozen intake + research brief at promote time. */
  snapshotJson?: string;
  /** Initial state. Defaults to "Prep". */
  state?: SessionState;
}

/**
 * Find an existing Session row by linked Payment page ID.
 * Used for idempotency — a Payment should only ever map to one Session.
 */
export async function findSessionByPaymentId(
  paymentPageId: string,
): Promise<string | null> {
  const client = getClient();
  const response = await client.dataSources.query({
    data_source_id: config.notion.sessionsDbId,
    filter: {
      property: "Linked Payment",
      relation: { contains: paymentPageId },
    },
    page_size: 1,
  });
  const first = response.results[0];
  return first ? first.id : null;
}

/**
 * Create a Session row. Idempotent on Linked Payment — if a Session already
 * exists for this Payment, returns the existing page ID.
 */
export async function createSession(
  input: SessionCreateInput,
): Promise<{ pageId: string; created: boolean }> {
  const existing = await findSessionByPaymentId(input.paymentPageId);
  if (existing) {
    return { pageId: existing, created: false };
  }

  const client = getClient();
  const properties: Record<string, unknown> = {
    "Client Name": {
      title: [{ type: "text", text: { content: input.clientName } }],
    },
    "Session Date": { date: { start: input.scheduledAt } },
    State: { select: { name: input.state ?? "Prep" } },
    "Linked Payment": { relation: [{ id: input.paymentPageId }] },
  };

  if (input.intakePageId) {
    properties["Linked Intake"] = { relation: [{ id: input.intakePageId }] };
  }
  if (input.snapshotJson) {
    properties["Snapshot JSON"] = richText(input.snapshotJson);
  }

  const page = await client.pages.create({
    parent: {
      type: "data_source_id",
      data_source_id: config.notion.sessionsDbId,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: properties as any,
  });

  return { pageId: page.id, created: true };
}

/**
 * Move a Session through its 5-state lifecycle.
 */
export async function updateSessionState(
  pageId: string,
  state: SessionState,
): Promise<void> {
  const client = getClient();
  await client.pages.update({
    page_id: pageId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: { State: { select: { name: state } } } as any,
  });
}

/**
 * Update arbitrary Session fields. All fields optional — pass only what you
 * want to change. Used by debrief, review, and send pipelines in later batches.
 */
export async function updateSessionFields(
  pageId: string,
  updates: {
    state?: SessionState;
    workshopJson?: string;
    debriefJson?: string;
    actionPlanJson?: string;
    actionPlanUrl?: string;
    firefliesUrl?: string;
    referralCode?: string;
    emailSent?: boolean;
    smsSent?: boolean;
    sentAt?: string;
    // V2 Round B — Frankie #2 / #3 idempotency flags.
    intakeNudgeSent?: boolean;
    callerPrepSent?: boolean;
  },
): Promise<void> {
  const client = getClient();
  const properties: Record<string, unknown> = {};

  if (updates.state) properties["State"] = { select: { name: updates.state } };
  if (typeof updates.workshopJson === "string") {
    properties["Workshop Session JSON"] = richText(updates.workshopJson);
  }
  if (typeof updates.debriefJson === "string") {
    properties["Debrief JSON"] = richText(updates.debriefJson);
  }
  if (typeof updates.actionPlanJson === "string") {
    properties["Action Plan JSON"] = richText(updates.actionPlanJson);
  }
  if (updates.actionPlanUrl) {
    properties["Action Plan URL"] = { url: updates.actionPlanUrl };
  }
  if (updates.firefliesUrl) {
    properties["Fireflies Transcript URL"] = { url: updates.firefliesUrl };
  }
  if (typeof updates.referralCode === "string") {
    properties["Referral Code Issued"] = richText(updates.referralCode);
  }
  if (typeof updates.emailSent === "boolean") {
    properties["Email Sent"] = { checkbox: updates.emailSent };
  }
  if (typeof updates.smsSent === "boolean") {
    properties["SMS Sent"] = { checkbox: updates.smsSent };
  }
  if (updates.sentAt) {
    properties["Sent At"] = { date: { start: updates.sentAt } };
  }
  if (typeof updates.intakeNudgeSent === "boolean") {
    properties["Intake Nudge Sent"] = { checkbox: updates.intakeNudgeSent };
  }
  if (typeof updates.callerPrepSent === "boolean") {
    properties["Caller Prep Sent"] = { checkbox: updates.callerPrepSent };
  }

  if (Object.keys(properties).length === 0) return;

  await client.pages.update({
    page_id: pageId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: properties as any,
  });
}
