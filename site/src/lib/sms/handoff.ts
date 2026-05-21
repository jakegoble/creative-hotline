/**
 * SMS human-handoff alert.
 *
 * Fires when an inbound text is classified as intent "human" (the texter
 * explicitly asked for a real person — "talk to a human", "is this a bot",
 * "call me", etc.). Mirrors the ManyChat `needs_human` / Live Agent Handoff
 * pattern, which the SMS line previously had no equivalent for.
 *
 * Two side-effects, both owned by the inbound route:
 *   1. The contact is tagged `needs-human` in Notion (done in the route via
 *      upsertContactByPhone) — the durable record, survives even if email fails.
 *   2. This module emails an alert to the team inbox so someone actually picks
 *      it up. Sent via the existing SendGrid plumbing (from hello@…), and
 *      FAIL-SOFT: if SendGrid isn't configured/up, it returns ok:false and the
 *      Notion tag is still there to catch it.
 *
 * Recipient defaults to hello@thecreativehotline.com; override with
 * HANDOFF_ALERT_EMAIL without touching code.
 */

import { sendEmail } from "../services/email";

/** Where handoff alerts land. Jake chose the shared Hotline inbox. */
const HANDOFF_TO =
  process.env.HANDOFF_ALERT_EMAIL || "hello@thecreativehotline.com";

export interface HandoffInput {
  /** Texter's phone in E.164. */
  phone: string;
  /** The raw message they sent. */
  message: string;
  /** "SMS" | "WhatsApp". */
  channel: string;
  /** Notion Messaging Contact page ID, if the CRM write succeeded. */
  contactId?: string;
}

/**
 * Send the team an email alert that a texter wants a human. Never throws —
 * returns { ok, reason } so the route can log without affecting the reply.
 */
export async function sendHumanHandoffAlert(
  input: HandoffInput,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const notionUrl = input.contactId
      ? `https://www.notion.so/${input.contactId.replace(/-/g, "")}`
      : "";

    const bodyMarkdown = [
      "**A texter asked for a real person.** Frankie told them you'd follow up — please reach out.",
      "",
      `**From:** ${input.phone} (${input.channel})`,
      `**They said:** "${input.message.slice(0, 400)}"`,
      notionUrl ? `**CRM:** [Open contact in Notion](${notionUrl})` : "",
      "",
      "Reply to them from your phone or the Twilio console.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await sendEmail({
      to: HANDOFF_TO,
      subject: `☎️ Hotline handoff: ${input.phone} wants a human`,
      bodyMarkdown,
      previewText: `${input.phone} asked to talk to a person`,
      categories: ["sms-human-handoff"],
    });

    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return { ok: false, reason: `handoff_threw: ${message}` };
  }
}
