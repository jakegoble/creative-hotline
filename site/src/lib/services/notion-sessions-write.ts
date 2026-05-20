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
import { findPaymentByEmail } from "./notion-payments-write";

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

/**
 * Session states.
 *
 * Active workflow: Prep → Session → Debrief → Review → Sent
 * Terminal-canceled: Canceled (set by Calendly invitee.canceled webhook
 *   when the client cancels without rebooking, so the session stops showing
 *   up in today's queue + frankie-followups doesn't fire for it)
 * Stale-rescheduled: Rescheduled (set on the OLD session when the client
 *   reschedules; the NEW booking creates a fresh Prep session via the normal
 *   invitee.created flow)
 */
export type SessionState =
  | "Prep"
  | "Session"
  | "Debrief"
  | "Review"
  | "Sent"
  | "Canceled"
  | "Rescheduled";

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
  /** Calendly event URI (stable per booking). Used to look up the Session
   *  later when a cancellation webhook arrives. Empty for manually-promoted
   *  sessions. */
  calendlyEventUri?: string;
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
  if (input.calendlyEventUri) {
    properties["Calendly Event URI"] = { url: input.calendlyEventUri };
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
 * Reverse-link a Session's `Linked Intake` to a fresh Intake row.
 *
 * Solves a race condition in the V2 booking pipeline:
 *
 *   t=0    Stripe → Payment row created
 *   t=0    Calendly invitee.created → Session row created. `findIntakeIdByEmail`
 *          runs and either finds an EXISTING (possibly stale/partial) intake or
 *          finds nothing; Session.Linked Intake gets set accordingly.
 *   t=+5m  User finishes Tally form → Intake row created with full V2 data.
 *
 * Before this helper, the Session stayed linked to whatever existed at Calendly
 * time — including stale partial rows from the legacy Tally→Notion-native
 * integration. The hub UI reads via Session.Linked Intake, so it rendered the
 * partial row even when the fresh full intake was sitting right next to it.
 *
 * Strategy: when Tally creates a new Intake, find the Payment that came from
 * Stripe for the same email in the same booking window (default 30 min),
 * locate the Session that was created off that Payment, and overwrite its
 * Linked Intake to point at the new intake. Idempotent — re-linking to the
 * same intake is a no-op on Notion's side.
 *
 * Returns the session ID that was relinked, or null if no eligible Session was
 * found (e.g. user filled the Tally form without booking, or webhooks fired
 * far apart). Non-fatal: the Tally route logs failures but keeps the 200.
 */
export async function relinkSessionIntakeByEmail(
  email: string,
  newIntakePageId: string,
  windowMinutes: number = 30,
): Promise<{ sessionId: string | null; relinked: boolean }> {
  if (!email || !newIntakePageId) {
    return { sessionId: null, relinked: false };
  }

  // 1. Find the recent Payment for this email (Stripe webhook target).
  const paymentId = await findPaymentByEmail(email, windowMinutes);
  if (!paymentId) {
    return { sessionId: null, relinked: false };
  }

  // 2. Find the Session created off that Payment (Calendly webhook target).
  const sessionId = await findSessionByPaymentId(paymentId);
  if (!sessionId) {
    return { sessionId: null, relinked: false };
  }

  // 3. Overwrite Linked Intake. Notion silently no-ops if already correct.
  const client = getClient();
  await client.pages.update({
    page_id: sessionId,
    properties: {
      "Linked Intake": { relation: [{ id: newIntakePageId }] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });

  return { sessionId, relinked: true };
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
    /** Synced M+J review approvals + sign-off state. Schema:
     *  { approvals: { [idx]: { m?, j? } }, signoff: { m?, j? } } */
    approvalsJson?: string;
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
  if (typeof updates.approvalsJson === "string") {
    properties["Approvals JSON"] = richText(updates.approvalsJson);
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
