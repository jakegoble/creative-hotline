/**
 * Notion Messaging Contacts DB — read + write helpers.
 *
 * Backs the SMS keyword router and drip cron. The DB has 18 fields; this
 * module only touches the ones the SMS pipeline actually owns (Phone, Status,
 * Drip Stage, Opt-In/Out Date, Compliance Log, Source, Channel, Last Interaction,
 * Last Broadcast). Email-side fields are reserved for a future SendGrid sync.
 *
 * Phone normalization: Twilio delivers `From` in strict E.164 (+1...). We
 * dedupe on that exact form. Anything else (national format, parens, dashes)
 * is normalized via `normalizePhoneE164()` before lookup or write.
 *
 * Idempotency: `upsertContactByPhone()` is the single entry point. It looks
 * up by Phone, creates if missing, updates if present, and returns the page
 * ID + whether-it-was-new so the caller can decide on side-effects (e.g.,
 * "first opt-in" should kick off drip step_1, but a returning opt-in shouldn't
 * restart from step_1).
 */

import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "../config";
import type { DripStage } from "../sms/drips";

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

export type ContactStatus = "active" | "opted_out" | "paused";
export type ContactSource =
  | "keyword_sms"
  | "keyword_whatsapp"
  | "manual"
  | "import"
  | "email_signup"
  | "ad_campaign"
  | "referral";
export type Channel = "SMS" | "WhatsApp" | "Email";

export interface MessagingContact {
  /** Notion page ID. */
  id: string;
  phone: string;
  /** Captured from booking/Send flows (Calendly + Stripe) — empty if SMS-only. */
  email: string;
  status: ContactStatus;
  dripStage: DripStage;
  optInDate: Date | null;
  optOutDate: Date | null;
  lastInteraction: Date | null;
  complianceLog: string;
  source: ContactSource | null;
  /** Multi-select: a contact can be reachable on multiple channels at once. */
  channels: Channel[];
  /** Lifecycle tags — "booked" + "paid-client" halt the drip cron. */
  tags: string[];
}

/**
 * Decide which channel to use for outbound drips when a contact is on both.
 * WhatsApp wins when present (richer media + link previews); SMS otherwise.
 * Return type is narrowed to messaging channels (no Email) since this is
 * specifically for drip routing.
 */
export function preferredOutboundChannel(
  contact: MessagingContact,
): "SMS" | "WhatsApp" {
  if (contact.channels.includes("WhatsApp")) return "WhatsApp";
  return "SMS";
}

/**
 * Normalize a phone string to strict E.164 (`+15551234567`).
 * Strips spaces, parens, dashes. Leaves the leading `+` if present, otherwise
 * assumes US (+1) for 10/11-digit bare numbers. Returns "" for unparseable input.
 */
export function normalizePhoneE164(raw: string): string {
  if (!raw) return "";
  const stripped = raw.replace(/[^\d+]/g, "");
  if (stripped.startsWith("+")) return stripped;
  // Bare 11-digit starting with 1 → +1XXXXXXXXXX
  if (/^1\d{10}$/.test(stripped)) return `+${stripped}`;
  // Bare 10-digit → assume US
  if (/^\d{10}$/.test(stripped)) return `+1${stripped}`;
  return "";
}

function parseDate(prop: unknown): Date | null {
  if (!prop || typeof prop !== "object") return null;
  const p = prop as { type?: string; date?: { start?: string } | null };
  if (p.type !== "date" || !p.date?.start) return null;
  const d = new Date(p.date.start);
  return isNaN(d.getTime()) ? null : d;
}

function parseText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as {
    type?: string;
    rich_text?: { plain_text: string }[];
  };
  if (p.type !== "rich_text" || !p.rich_text) return "";
  return p.rich_text.map((t) => t.plain_text).join("");
}

function parseSelect<T extends string>(prop: unknown): T | null {
  if (!prop || typeof prop !== "object") return null;
  const p = prop as { type?: string; select?: { name?: string } | null };
  if (p.type !== "select" || !p.select?.name) return null;
  return p.select.name as T;
}

function parseEmail(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as { type?: string; email?: string | null };
  if (p.type !== "email") return "";
  return p.email ?? "";
}

function parsePhone(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as { type?: string; phone_number?: string | null };
  if (p.type !== "phone_number") return "";
  return p.phone_number ?? "";
}

function parseMultiSelect<T extends string>(prop: unknown): T[] {
  if (!prop || typeof prop !== "object") return [];
  const p = prop as { type?: string; multi_select?: { name: string }[] };
  if (p.type !== "multi_select" || !p.multi_select) return [];
  return p.multi_select.map((o) => o.name) as T[];
}

function pageToContact(page: PageObjectResponse): MessagingContact {
  const props = page.properties as Record<string, unknown>;
  return {
    id: page.id,
    phone: parsePhone(props["Phone"]),
    email: parseEmail(props["Email"]),
    status: parseSelect<ContactStatus>(props["Status"]) ?? "active",
    dripStage: parseSelect<DripStage>(props["Drip Stage"]) ?? "none",
    optInDate: parseDate(props["Opt-In Date"]),
    optOutDate: parseDate(props["Opt-Out Date"]),
    lastInteraction: parseDate(props["Last Interaction"]),
    complianceLog: parseText(props["Compliance Log"]),
    source: parseSelect<ContactSource>(props["Source"]),
    channels: parseMultiSelect<Channel>(props["Channel"]),
    tags: parseMultiSelect<string>(props["Tags"]),
  };
}

/** Find a contact by phone (E.164). Returns null if no match. */
export async function findContactByPhone(
  phoneE164: string,
): Promise<MessagingContact | null> {
  if (!phoneE164) return null;
  const client = getClient();
  const response = await client.dataSources.query({
    data_source_id: config.notion.messagingDbId,
    filter: {
      property: "Phone",
      phone_number: { equals: phoneE164 },
    },
    page_size: 1,
  });
  const first = response.results[0];
  if (!first || !("properties" in first)) return null;
  return pageToContact(first as PageObjectResponse);
}

/**
 * Find a contact by email. Used by the Calendly + Send flows to connect a
 * booking back to its originating SMS subscriber — phone is the dedupe key
 * for new SMS contacts, but email is the universal cross-flow identifier
 * (Calendly always captures email; SMS contacts get email attached at
 * booking time via this lookup).
 *
 * Returns null if no match.
 */
export async function findContactByEmail(
  email: string,
): Promise<MessagingContact | null> {
  if (!email) return null;
  const client = getClient();
  const response = await client.dataSources.query({
    data_source_id: config.notion.messagingDbId,
    filter: {
      property: "Email",
      email: { equals: email },
    },
    page_size: 1,
  });
  const first = response.results[0];
  if (!first || !("properties" in first)) return null;
  return pageToContact(first as PageObjectResponse);
}

interface UpsertInput {
  phone: string;
  /**
   * Email to attach to the contact. Used by booking + Send flows to backfill
   * email onto SMS-originated contacts so they can be looked up either way.
   * Only written when provided (no clobber on subsequent writes that omit it).
   */
  email?: string;
  /** Free-form note appended to Compliance Log if provided. */
  complianceNote?: string;
  /** Set Status — usually "active" on opt-in or "opted_out" on STOP. */
  status?: ContactStatus;
  /** Set Drip Stage. Use "step_1" on first opt-in, "none" to halt. */
  dripStage?: DripStage;
  /** Set Opt-In Date (ISO date). Usually now() on a new opt-in. */
  optInDate?: Date | null;
  /** Set Opt-Out Date (ISO date). Usually now() on STOP. */
  optOutDate?: Date | null;
  /** Always bumped on inbound traffic. */
  touchInteraction?: boolean;
  /** First-time source (only set on create). */
  source?: ContactSource;
  /**
   * Tags to ADD to the multi_select. MERGED with existing tags (not replaced),
   * so adding "booked" to a contact with "VIP" yields ["VIP", "booked"].
   */
  addTags?: string[];
  /**
   * Channel(s) to ADD to the multi_select. Merges with existing channels —
   * a contact who first texted SMS and later WhatsApp'd ends up with both.
   * If omitted on create, defaults to ["SMS"] for backward compatibility.
   */
  addChannels?: Channel[];
}

/** Build a Notion property update payload from an UpsertInput. */
function buildProperties(
  input: UpsertInput,
  isNew: boolean,
  existingComplianceLog: string,
  existingChannels: Channel[] = [],
  existingTags: string[] = [],
): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Resolve the channels we want on this row after the upsert:
  //   - On create: union of input.addChannels + default ["SMS"]
  //   - On update: union of existing + input.addChannels (merge, no remove)
  const channelSet = new Set<Channel>(existingChannels);
  if (input.addChannels?.length) {
    for (const c of input.addChannels) channelSet.add(c);
  }
  if (isNew && channelSet.size === 0) channelSet.add("SMS");

  // Same merge for Tags so adding "booked" doesn't wipe "VIP".
  const tagSet = new Set<string>(existingTags);
  if (input.addTags?.length) {
    for (const t of input.addTags) tagSet.add(t);
  }

  if (isNew) {
    // Title = phone number (until we capture a name)
    props["Contact Name"] = {
      title: [{ type: "text", text: { content: input.phone } }],
    };
    props["Phone"] = { phone_number: input.phone };
    if (input.source) {
      props["Source"] = { select: { name: input.source } };
    }
  }
  // Email only gets written when explicitly provided — avoids clobbering on
  // routine touch-interaction writes that omit email.
  if (input.email) {
    props["Email"] = { email: input.email };
  }
  // Always write Channel when we have any to set — handles both create
  // (defaults to SMS) and update (merge new channel onto existing).
  if (channelSet.size > 0 && (isNew || input.addChannels?.length)) {
    props["Channel"] = {
      multi_select: [...channelSet].map((name) => ({ name })),
    };
  }

  if (input.status) {
    props["Status"] = { select: { name: input.status } };
  }
  if (input.dripStage) {
    props["Drip Stage"] = { select: { name: input.dripStage } };
  }
  if (input.optInDate !== undefined) {
    props["Opt-In Date"] = input.optInDate
      ? { date: { start: input.optInDate.toISOString() } }
      : { date: null };
  }
  if (input.optOutDate !== undefined) {
    props["Opt-Out Date"] = input.optOutDate
      ? { date: { start: input.optOutDate.toISOString() } }
      : { date: null };
  }
  if (input.touchInteraction) {
    props["Last Interaction"] = {
      date: { start: new Date().toISOString() },
    };
  }
  if (input.complianceNote) {
    // Append to existing log (Notion has no native append — read-modify-write)
    const stamp = new Date().toISOString();
    const newEntry = `[${stamp}] ${input.complianceNote}`;
    const merged = existingComplianceLog
      ? `${existingComplianceLog}\n${newEntry}`
      : newEntry;
    props["Compliance Log"] = {
      rich_text: [{ type: "text", text: { content: merged.slice(0, 1900) } }],
    };
  }
  if (input.addTags?.length && tagSet.size > 0) {
    // True merge: existing tags preserved, new ones added.
    props["Tags"] = {
      multi_select: [...tagSet].map((name) => ({ name })),
    };
  }
  return props;
}

/**
 * Upsert by phone. Returns the contact + a flag if it was newly created.
 *
 * The route handler uses `isNew` to decide whether to start the drip sequence
 * (only on first opt-in, not on every repeat opt-in keyword).
 */
export async function upsertContactByPhone(
  input: UpsertInput,
): Promise<{ contact: MessagingContact; isNew: boolean }> {
  const phone = normalizePhoneE164(input.phone);
  if (!phone) throw new Error(`Unparseable phone: ${input.phone}`);

  const client = getClient();
  const existing = await findContactByPhone(phone);

  if (existing) {
    const properties = buildProperties(
      { ...input, phone },
      false,
      existing.complianceLog,
      existing.channels,
      existing.tags,
    );
    if (Object.keys(properties).length > 0) {
      await client.pages.update({
        page_id: existing.id,
        properties: properties as Parameters<
          typeof client.pages.update
        >[0]["properties"],
      });
    }
    // Refetch to return the post-update state
    const refreshed = await findContactByPhone(phone);
    return { contact: refreshed ?? existing, isNew: false };
  }

  const properties = buildProperties({ ...input, phone }, true, "", [], []);
  const created = await client.pages.create({
    parent: { data_source_id: config.notion.messagingDbId } as Parameters<
      typeof client.pages.create
    >[0]["parent"],
    properties: properties as Parameters<
      typeof client.pages.create
    >[0]["properties"],
  });
  const contact = pageToContact(created as PageObjectResponse);
  return { contact, isNew: true };
}

/**
 * Query active SMS contacts that may be due for a drip step.
 *
 * Filters: Status=active AND Drip Stage NOT IN ("none", "completed") AND
 * Channel includes SMS. The cron then computes eligibility per-contact based
 * on Opt-In Date + current stage.
 */
export async function findActiveDripContacts(): Promise<MessagingContact[]> {
  const client = getClient();
  const results: MessagingContact[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await client.dataSources.query({
      data_source_id: config.notion.messagingDbId,
      filter: {
        and: [
          { property: "Status", select: { equals: "active" } },
          {
            // Either channel qualifies — drip cron picks the best send method
            // per contact via preferredOutboundChannel().
            or: [
              { property: "Channel", multi_select: { contains: "SMS" } },
              { property: "Channel", multi_select: { contains: "WhatsApp" } },
            ],
          },
          {
            or: [
              { property: "Drip Stage", select: { equals: "step_1" } },
              { property: "Drip Stage", select: { equals: "step_2" } },
              { property: "Drip Stage", select: { equals: "step_3" } },
              { property: "Drip Stage", select: { equals: "step_4" } },
            ],
          },
          // Belt + suspenders: contacts who already booked or paid are tagged
          // and we DON'T want to keep nudging them. The Calendly + Send flows
          // also advance Drip Stage to "completed", but tags are the source of
          // truth for lifecycle state.
          {
            and: [
              {
                property: "Tags",
                multi_select: { does_not_contain: "booked" },
              },
              {
                property: "Tags",
                multi_select: { does_not_contain: "paid-client" },
              },
            ],
          },
        ],
      },
      page_size: 100,
      start_cursor: cursor,
    });
    for (const page of response.results) {
      if (page && "properties" in page) {
        results.push(pageToContact(page as PageObjectResponse));
      }
    }
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return results;
}

/**
 * Advance a contact to the next drip stage + bump Last Broadcast.
 * Used by the drip cron after a successful Twilio send.
 */
export async function advanceDripStage(
  pageId: string,
  newStage: DripStage,
): Promise<void> {
  const client = getClient();
  await client.pages.update({
    page_id: pageId,
    properties: {
      "Drip Stage": { select: { name: newStage } },
      "Last Broadcast": {
        date: { start: new Date().toISOString() },
      },
    } as Parameters<typeof client.pages.update>[0]["properties"],
  });
}
