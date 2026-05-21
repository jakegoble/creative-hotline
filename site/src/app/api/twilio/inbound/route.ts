/**
 * POST /api/twilio/inbound
 *
 * Twilio's inbound SMS webhook. Receives a `application/x-www-form-urlencoded`
 * POST whenever someone texts +1 (413) 767-4332 (or any number on the
 * Creative Hotline messaging service), and returns TwiML that Twilio uses as
 * the auto-reply.
 *
 * Replaces the n8n workflow `NJM68opylsfTuv0l` at creativehotline.app.n8n.cloud.
 * The migration consolidates SMS onto the same Vercel app as the rest of TCH V2
 * (booking, action plan, send pipeline) so there's one infrastructure to debug.
 *
 * Flow:
 *   1. Parse Twilio form fields (Body, From, To, MessageSid)
 *   2. Route the keyword to a Frankie persona reply
 *   3. Upsert Notion Messaging Contact (CRM side-effect)
 *      - opt_in:  Status=active, Drip Stage=step_1 (only if NEW), Opt-In Date=now
 *      - opt_out: Status=opted_out, Drip Stage=none, Opt-Out Date=now
 *      - info/book/deals/fallback: just bump Last Interaction
 *   4. Return TwiML <Response><Message>...</Message></Response>
 *
 * Idempotency: every Notion write goes through upsertContactByPhone() which
 * dedupes on the From number. Twilio retries on 5xx; we always return 200 with
 * a TwiML body to short-circuit retries (even on CRM failure — better to reply
 * to the user than to retry-loop).
 *
 * Twilio webhook setup (one-time):
 *   1. Twilio Console → Messaging → Services → Creative Hotline (MGe879f47d...)
 *   2. Integration → Inbound Settings → "Send a webhook"
 *   3. URL: https://api.thecreativehotline.com/api/twilio/inbound
 *   4. HTTP method: POST
 *   5. Save. The n8n webhook can be deleted after a successful test SMS.
 */

import { NextResponse } from "next/server";
import { routeKeyword, type KeywordIntent, BOOKING_URL } from "@/lib/sms/keywords";
import { frankieSmsReply, type FrankieContext } from "@/lib/sms/frankie-ai";
import { sendHumanHandoffAlert } from "@/lib/sms/handoff";
import {
  normalizePhoneE164,
  upsertContactByPhone,
  type Channel,
  type MessagingContact,
} from "@/lib/services/notion-messaging";
import { stripWhatsappPrefix } from "@/lib/services/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Escape XML special chars so a malicious or unexpected reply body can't
 * break the TwiML envelope. & < > all need escaping; quotes/apostrophes are
 * safe inside an element body but we escape them anyway for paranoia.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>${escapeXml(
    message,
  )}</Message>\n</Response>`;
}

function twimlResponse(message: string, status = 200): Response {
  return new NextResponse(buildTwiML(message), {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/**
 * Map a keyword intent to the Notion contact update for this hit.
 *
 * The `channel` arg comes from the From-field prefix detection — SMS or
 * WhatsApp. It controls (a) which channel gets added to Contact.Channel
 * multi-select and (b) the Source enum (keyword_sms vs keyword_whatsapp).
 */
function buildContactUpdate(
  intent: KeywordIntent,
  keyword: string,
  phone: string,
  channel: Channel,
) {
  const source =
    channel === "WhatsApp" ? ("keyword_whatsapp" as const) : ("keyword_sms" as const);
  const base = {
    phone,
    touchInteraction: true,
    complianceNote: `Inbound ${channel}: ${keyword} (${intent})`,
    source,
    addChannels: [channel],
  };
  switch (intent) {
    case "opt_in":
      return {
        ...base,
        status: "active" as const,
        // Note: dripStage = step_1 only takes effect on NEW contacts via the
        // isNew branch below. Existing active contacts who text HOTLINE again
        // don't restart their drip — we just bump Last Interaction.
        optInDate: new Date(),
        optOutDate: null,
      };
    case "opt_out":
      return {
        ...base,
        status: "opted_out" as const,
        dripStage: "none" as const,
        optOutDate: new Date(),
      };
    case "book":
      return { ...base, addTags: ["hot-lead"] };
    case "human":
      // Tag for triage + so a "needs-human" Notion view can surface them even
      // if the email alert fails to send.
      return { ...base, addTags: ["needs-human"] };
    case "info":
    case "deals":
    case "fallback":
    default:
      return base;
  }
}

/**
 * Pull the first email address out of an inbound message body. Used to capture
 * email straight from SMS (mirrors the ManyChat "drop your email" step) so an
 * SMS-only lead becomes reachable by email + linkable to a future booking.
 * Returns "" if none found. Conservative pattern — avoids matching @handles.
 */
function extractEmail(body: string): string {
  const m = (body || "").match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0].toLowerCase() : "";
}

/** Canned acknowledgement when someone texts us their email (AI unavailable). */
const EMAIL_ACK = `Got it — I'll make sure the good stuff lands there. Ready when you are: ${BOOKING_URL}`;

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    // If Twilio sent something we can't parse, log + return an empty TwiML so
    // the user at least gets no broken reply (vs. a 500 that Twilio retries).
    console.error("[twilio/inbound] formData parse failed:", err);
    return twimlResponse(
      "Sorry — something glitched on our end. Try again in a minute.",
    );
  }

  const rawBody = String(formData.get("Body") ?? "");
  const rawFrom = String(formData.get("From") ?? "");
  const rawTo = String(formData.get("To") ?? "");
  const messageSid = String(formData.get("MessageSid") ?? "");

  // Twilio prefixes WhatsApp From/To with `whatsapp:` — strip + remember.
  // The same Twilio Messaging Service handles both channels via this webhook,
  // so we detect once here and pass the channel into the CRM write.
  const { e164: fromE164, isWhatsApp } = stripWhatsappPrefix(rawFrom);
  const phone = normalizePhoneE164(fromE164);
  const channel: Channel = isWhatsApp ? "WhatsApp" : "SMS";
  const match = routeKeyword(rawBody);
  const capturedEmail = extractEmail(rawBody);

  console.log("[twilio/inbound]", {
    messageSid,
    from: phone || rawFrom,
    to: rawTo,
    channel,
    keyword: match.keyword,
    topic: match.topic,
    intent: match.intent,
    capturedEmail: capturedEmail || undefined,
  });

  // Fire the CRM write in the background — we don't block the reply on it. If
  // Notion is slow or down, the user still gets their Frankie reply on time.
  // Errors are caught and logged; we never throw out of this route.
  // CRM write is AWAITED, not fire-and-forget. In Vercel serverless, returning
  // the response terminates the invocation and kills any pending promises —
  // background writes silently drop. We pay ~1-2s of latency to guarantee the
  // Notion row lands, still well inside Twilio's 15s webhook timeout.
  // Tracks the post-write contact so we can tailor the AI fallback reply
  // (don't re-ask for email, don't push booking on someone who already booked).
  let contactForCtx: MessagingContact | null = null;
  let contactIsNew = false;

  if (phone) {
    const update = {
      ...buildContactUpdate(match.intent, match.keyword, phone, channel),
      // Capture an email straight off the text if they sent one. Only set when
      // present so we never clobber an existing email with a blank.
      ...(capturedEmail ? { email: capturedEmail } : {}),
    };
    try {
      const { isNew, contact } = await upsertContactByPhone(update);
      contactForCtx = contact;
      contactIsNew = isNew;
      // First-time opt-in → kick off drip step_1 so the cron picks them up
      // on Day 1. We do this in a SECOND update because we need `isNew` to
      // decide; baking it into the first update would race ahead of new
      // contacts who don't text HOTLINE (e.g., they text BOOK first).
      if (match.intent === "opt_in" && isNew) {
        await upsertContactByPhone({
          phone,
          dripStage: "step_1",
        });
      }
      // Re-opt-in path: an EXISTING contact who previously sent STOP
      // (status was opted_out, Drip Stage was none) texts HOTLINE/START again.
      // We need to fully reset their drip — otherwise they re-activate but
      // never re-enter the sequence. The base update already flipped Status
      // back to "active" + set Opt-In Date = now; this completes the cycle.
      else if (
        match.intent === "opt_in" &&
        !isNew &&
        contact.dripStage === "none"
      ) {
        await upsertContactByPhone({
          phone,
          dripStage: "step_1",
          complianceNote: `Re-opt-in via ${channel} ${match.keyword}; resetting drip from none → step_1`,
        });
      }
      // Auto-opt-in any first-time texter (even if they sent BOOK or INFO).
      // Inbound to a marketing number IS an opt-in signal per the A2P
      // campaign and Meta WhatsApp policy. Not capturing it would leak leads.
      else if (isNew && match.intent !== "opt_out") {
        await upsertContactByPhone({
          phone,
          status: "active",
          dripStage: "step_1",
          optInDate: new Date(),
          complianceNote: `Auto opt-in via first-touch ${channel} keyword ${match.keyword}`,
        });
      }
      console.log("[twilio/inbound] CRM:", {
        contactId: contact.id,
        isNew,
        channel,
        status: contact.status,
        dripStage: contact.dripStage,
        channels: contact.channels,
        tags: contact.tags,
      });
    } catch (err) {
      // Never propagate — the user still gets their Frankie reply even if
      // the CRM is down. We log loudly so ops sees it.
      console.error("[twilio/inbound] CRM write failed:", err);
    }
  } else {
    console.warn("[twilio/inbound] could not normalize From:", rawFrom);
  }

  // ---- Human handoff alert ----------------------------------------------
  // The texter asked for a real person. The contact is already tagged
  // "needs-human" above; now email the team inbox so someone picks it up.
  // Awaited (Vercel kills pending promises post-response) but fail-soft.
  if (match.intent === "human" && phone) {
    const alert = await sendHumanHandoffAlert({
      phone,
      message: rawBody,
      channel,
      contactId: contactForCtx?.id,
    });
    console.log("[twilio/inbound] human handoff alert:", alert);
  }

  // ---- Resolve the reply text -------------------------------------------
  // High-intent keywords (BOOK/PRICING/INFO/DEALS/STOP/HOTLINE) use the fast,
  // free, compliance-safe canned reply. Anything the router couldn't classify
  // ("fallback") is handed to the Claude-powered Frankie so a real human
  // sentence gets a real answer instead of "didn't catch that."
  let replyText = match.reply;

  if (match.intent === "fallback") {
    const ctx: FrankieContext = {
      channel,
      hasBooked: contactForCtx?.tags.includes("booked") ?? false,
      // If they just texted their email, treat it as on-file so Frankie won't
      // re-ask; otherwise reflect what's stored.
      hasEmail: Boolean(capturedEmail) || Boolean(contactForCtx?.email),
    };
    const aiReply = await frankieSmsReply(rawBody, ctx);
    if (aiReply) {
      replyText = aiReply;
    } else if (capturedEmail) {
      // AI unavailable but they handed us an email — acknowledge + nudge.
      replyText = EMAIL_ACK;
    }
    // else: keep the canned fallback menu (match.reply).
    console.log("[twilio/inbound] fallback reply:", {
      usedAI: Boolean(aiReply),
      capturedEmail: Boolean(capturedEmail),
      contactIsNew,
    });
  }

  return twimlResponse(replyText);
}

/**
 * GET handler for health checks. Returns a simple JSON ping so a curl from
 * the deploy verifier can confirm the route is up without sending a fake SMS.
 */
export async function GET(): Promise<Response> {
  return NextResponse.json({
    ok: true,
    route: "/api/twilio/inbound",
    method: "POST",
    description:
      "Twilio inbound SMS webhook. POST application/x-www-form-urlencoded with Body, From, To, MessageSid.",
  });
}
