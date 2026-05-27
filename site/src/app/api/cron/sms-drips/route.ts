/**
 * GET/POST /api/cron/sms-drips
 *
 * Daily cron that advances active SMS subscribers through the 4-step Frankie
 * nurture sequence. Schedule: 17:00 UTC = 10am PT / 1pm ET (B2B engagement
 * sweet spot). Wired in vercel.json next to the existing frankie-followups
 * cron.
 *
 * For every active SMS contact with Drip Stage in {step_1, step_2, step_3, step_4}:
 *   1. Compute days-since-opt-in
 *   2. Look up the next step in DRIP_SEQUENCE
 *   3. If `daysSinceOptIn >= step.daysSinceOptIn`, send the message via Twilio
 *      and advance the stage in Notion
 *   4. step_4 → completed (terminal — contact exits the sequence)
 *
 * Auth: Vercel attaches `Authorization: Bearer <CRON_SECRET>` to cron requests.
 *       Manual hits must include the same header. 401 otherwise.
 *
 * Idempotency: every send advances the stage in Notion *before* returning,
 * so a re-run on the same day won't re-send. The cron schedule is daily, so
 * even a Vercel-side retry within the same day is safe.
 *
 * Response shape:
 *   {
 *     ok: true,
 *     processed: number,         // contacts considered
 *     sent: number,              // messages actually fired
 *     skipped: number,           // contacts not yet eligible
 *     failed: number,            // Twilio send failures
 *     results: [{ contactId, phone, stage, action, error? }]
 *   }
 */

import { NextResponse } from "next/server";
import { sendSms, sendWhatsAppTemplate } from "@/lib/services/twilio";
import {
  findActiveDripContacts,
  advanceDripStage,
  preferredOutboundChannel,
  type MessagingContact,
} from "@/lib/services/notion-messaging";
import {
  nextDripStep,
  DRIP_SEQUENCE,
  BETA_DRIP_SEQUENCE,
  type DripStage,
} from "@/lib/sms/drips";
import { getWhatsAppTemplate } from "@/lib/sms/whatsapp-templates";
import type { SmsResult } from "@/lib/services/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DripResult {
  contactId: string;
  phone: string;
  stage: string;
  /** Which channel actually fired (or would have, on skipped). */
  channel: "SMS" | "WhatsApp";
  action: "sent" | "skipped" | "failed";
  newStage?: string;
  error?: string;
}

/**
 * Send one drip step to a contact, branching on preferred channel.
 *
 * - WhatsApp preferred + template available → sendWhatsAppTemplate
 * - WhatsApp preferred + template missing/null → fall back to SMS (if the
 *   contact also has SMS in Channel); else skip (logged so we know template
 *   approval is the blocker).
 * - SMS-only contact → sendSms with the plain drip body.
 *
 * Returning the channel used lets the result row reflect reality (not
 * intent) so the cron summary is honest.
 */
async function sendOneDrip(
  contact: MessagingContact,
  stage: DripStage,
  smsBody: string,
): Promise<{ result: SmsResult; channelUsed: "SMS" | "WhatsApp" }> {
  const preferred = preferredOutboundChannel(contact);

  if (preferred === "WhatsApp") {
    const template = getWhatsAppTemplate(stage);
    if (template) {
      const result = await sendWhatsAppTemplate({
        to: contact.phone,
        contentSid: template.contentSid!,
        variables: template.variables(),
      });
      return { result, channelUsed: "WhatsApp" };
    }
    // Template not yet approved. If the contact ALSO has SMS, fall back so
    // we don't lose the touchpoint while waiting on Meta review.
    if (contact.channels.includes("SMS")) {
      const result = await sendSms({ to: contact.phone, body: smsBody });
      return { result, channelUsed: "SMS" };
    }
    // WA-only contact with no approved template → can't send.
    return {
      result: {
        ok: false,
        error: `WhatsApp template for ${stage} not yet approved + contact is WA-only`,
      },
      channelUsed: "WhatsApp",
    };
  }

  // SMS path
  const result = await sendSms({ to: contact.phone, body: smsBody });
  return { result, channelUsed: "SMS" };
}

async function runDrips(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  results: DripResult[];
}> {
  const contacts = await findActiveDripContacts();
  const results: DripResult[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const contact of contacts) {
    const preferred = preferredOutboundChannel(contact);
    // BETA-CALL leads (tagged "beta-call" by the inbound "beta" intent) get the
    // promo-specific drip copy + tighter cadence; everyone else stays on the
    // evergreen nurture. Note: the WhatsApp path still uses the generic
    // stage template (no beta WA template approved) — fine, beta is SMS-driven.
    const isBeta = contact.tags.includes("beta-call");
    const sequence = isBeta ? BETA_DRIP_SEQUENCE : DRIP_SEQUENCE;
    const eligibility = nextDripStep(
      contact.dripStage,
      contact.optInDate,
      new Date(),
      sequence,
    );
    if (!eligibility) {
      skipped++;
      results.push({
        contactId: contact.id,
        phone: contact.phone,
        stage: contact.dripStage,
        channel: preferred,
        action: "skipped",
      });
      continue;
    }

    const { result: sendResult, channelUsed } = await sendOneDrip(
      contact,
      contact.dripStage,
      eligibility.step.body,
    );

    if (!sendResult.ok) {
      failed++;
      results.push({
        contactId: contact.id,
        phone: contact.phone,
        stage: contact.dripStage,
        channel: channelUsed,
        action: "failed",
        error: sendResult.error,
      });
      // Don't advance stage on send failure — next run will retry.
      continue;
    }

    try {
      await advanceDripStage(contact.id, eligibility.nextStage);
      sent++;
      results.push({
        contactId: contact.id,
        phone: contact.phone,
        stage: contact.dripStage,
        channel: channelUsed,
        action: "sent",
        newStage: eligibility.nextStage,
      });
    } catch (err) {
      // Twilio sent but Notion update failed — log loudly. Next run will
      // see the same stage and re-send. Cost is ~$0.01 of duplicate SMS, but
      // we shouldn't silently swallow it.
      failed++;
      results.push({
        contactId: contact.id,
        phone: contact.phone,
        stage: contact.dripStage,
        channel: channelUsed,
        action: "failed",
        error: `Notion advance failed AFTER successful Twilio send: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      });
    }
  }

  return { processed: contacts.length, sent, skipped, failed, results };
}

function checkAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev: no secret set → allow
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request): Promise<Response> {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runDrips();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[cron/sms-drips] failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  // Allow POST for manual testing via curl
  return GET(request);
}
