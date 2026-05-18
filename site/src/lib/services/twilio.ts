/**
 * Twilio messaging service — fetch-based, no SDK dependency.
 *
 * Supports three send modes:
 *   1. sendSms()              — plain SMS, body up to 1600 chars
 *   2. sendWhatsApp()         — freeform WhatsApp, ONLY valid within the
 *                                24-hour customer service window (since the
 *                                user's last inbound message). Outside that
 *                                window, Meta rejects freeform — use a template.
 *   3. sendWhatsAppTemplate() — pre-approved Content template by Content SID
 *                                with optional `{{1}}`-style variables. Required
 *                                for the Day 1/3/7/14 drip messages.
 *
 * Auth: HTTP Basic with Account SID + Auth Token (one set covers SMS + WA).
 * A2P 10DLC status: APPROVED per memory (2026-05-11 by Peter K). WhatsApp
 * Sender approval is a separate Meta review; templates are reviewed per-message.
 *
 * Env vars expected:
 *   TWILIO_ACCOUNT_SID         — starts with `AC...`
 *   TWILIO_AUTH_TOKEN          — 32-char hex
 *   TWILIO_FROM_NUMBER         — SMS sender E.164, e.g. `+14137674332`
 *   TWILIO_WHATSAPP_FROM       — WhatsApp sender E.164 (same number, different
 *                                Twilio Sender). Defaults to TWILIO_FROM_NUMBER
 *                                if a single number serves both channels.
 */

import { config } from "../config";

const TWILIO_API = "https://api.twilio.com/2010-04-01";

/**
 * Strip the `whatsapp:` prefix if present, return a plain E.164 phone.
 * Twilio prefixes both From and To with `whatsapp:` on WhatsApp messages —
 * inbound webhooks see `whatsapp:+15551234567`, and outbound must use the
 * same format. We normalize for storage but re-add the prefix for sends.
 */
export function stripWhatsappPrefix(phone: string): {
  e164: string;
  isWhatsApp: boolean;
} {
  if (!phone) return { e164: "", isWhatsApp: false };
  if (phone.startsWith("whatsapp:")) {
    return { e164: phone.slice("whatsapp:".length), isWhatsApp: true };
  }
  return { e164: phone, isWhatsApp: false };
}

export interface SmsResult {
  ok: boolean;
  sid?: string;
  status?: string;
  to?: string;
  error?: string;
  rawStatus?: number;
}

/**
 * Send an SMS via Twilio. Returns a normalized result.
 *
 * On success: { ok: true, sid, status, to }
 * On failure: { ok: false, error, rawStatus }
 *
 * NEVER throws — the caller (Send route) catches and continues even if SMS
 * fails, so email can still go out. Failed sends are logged for retry.
 */
export async function sendSms(opts: {
  to: string;
  body: string;
}): Promise<SmsResult> {
  if (!config.twilio?.fromNumber) {
    return { ok: false, error: "TWILIO_FROM_NUMBER not configured" };
  }
  if (!opts.to) return { ok: false, error: "Missing `to` number" };
  if (!opts.body) return { ok: false, error: "Missing SMS body" };

  const params = new URLSearchParams();
  params.append("To", opts.to);
  params.append("From", config.twilio.fromNumber);
  params.append("Body", opts.body);

  return postMessage(params);
}

/**
 * Shared Twilio Messages POST. SMS and WhatsApp use the same endpoint, just
 * different params (From/To prefix + optional ContentSid/ContentVariables).
 */
async function postMessage(params: URLSearchParams): Promise<SmsResult> {
  if (!config.twilio?.accountSid || !config.twilio?.authToken) {
    return {
      ok: false,
      error: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured",
    };
  }
  const url = `${TWILIO_API}/Accounts/${config.twilio.accountSid}/Messages.json`;
  const basic = Buffer.from(
    `${config.twilio.accountSid}:${config.twilio.authToken}`,
  ).toString("base64");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `Twilio API ${res.status}: ${text.slice(0, 400)}`,
        rawStatus: res.status,
      };
    }
    let parsed: { sid?: string; status?: string; to?: string } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      /* non-JSON on 2xx is still a success */
    }
    return {
      ok: true,
      sid: parsed.sid,
      status: parsed.status,
      to: parsed.to,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "twilio_fetch_failed";
    return { ok: false, error: message };
  }
}

/**
 * Health check — verify Twilio credentials are reachable + valid.
 * Hits GET /Accounts/{AccountSid}.json which is the canonical "is auth
 * working" endpoint (free, no side effects). Used by /api/health.
 */
export async function ping(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  if (!config.twilio?.accountSid || !config.twilio?.authToken) {
    return { ok: false, latency: 0 };
  }
  const url = `${TWILIO_API}/Accounts/${config.twilio.accountSid}.json`;
  const basic = Buffer.from(
    `${config.twilio.accountSid}:${config.twilio.authToken}`,
  ).toString("base64");
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${basic}`, Accept: "application/json" },
    });
    return { ok: res.ok, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}

/**
 * Resolve the WhatsApp From number. Falls back to TWILIO_FROM_NUMBER so a
 * single Twilio Sender (the same +14137674332 enabled for both SMS + WA)
 * doesn't require duplicate env vars.
 */
function whatsappFrom(): string {
  return (
    process.env.TWILIO_WHATSAPP_FROM ?? config.twilio?.fromNumber ?? ""
  );
}

/**
 * Send a freeform WhatsApp message. ONLY valid inside the 24-hour customer
 * service window (since the user's last inbound). Outside that window, Meta
 * rejects with a non-2xx and the result is { ok:false, error }.
 *
 * For drips and any time-delayed outbound, use sendWhatsAppTemplate() with
 * a pre-approved Content SID instead.
 */
export async function sendWhatsApp(opts: {
  to: string;
  body: string;
}): Promise<SmsResult> {
  const from = whatsappFrom();
  if (!from) return { ok: false, error: "TWILIO_WHATSAPP_FROM not configured" };
  if (!opts.to) return { ok: false, error: "Missing `to` number" };
  if (!opts.body) return { ok: false, error: "Missing message body" };

  const toWhatsApp = opts.to.startsWith("whatsapp:")
    ? opts.to
    : `whatsapp:${opts.to}`;
  const fromWhatsApp = from.startsWith("whatsapp:")
    ? from
    : `whatsapp:${from}`;

  const params = new URLSearchParams();
  params.append("To", toWhatsApp);
  params.append("From", fromWhatsApp);
  params.append("Body", opts.body);

  return postMessage(params);
}

/**
 * Send a Meta-approved WhatsApp template by Content SID. Variables map by
 * 1-indexed key to template placeholders (`{{1}}`, `{{2}}`, etc.).
 *
 * Required for messages outside the 24-hour customer service window —
 * which is most of the drip sequence. Each template must be submitted to
 * Meta via Twilio's Content Editor and approved before use; the SID is the
 * `HX...` returned after approval.
 *
 * @example
 *   sendWhatsAppTemplate({
 *     to: "+15551234567",
 *     contentSid: "HXabc123...",
 *     variables: { "1": "Jake", "2": "calendly.com/sos..." },
 *   });
 */
export async function sendWhatsAppTemplate(opts: {
  to: string;
  contentSid: string;
  variables?: Record<string, string>;
}): Promise<SmsResult> {
  const from = whatsappFrom();
  if (!from) return { ok: false, error: "TWILIO_WHATSAPP_FROM not configured" };
  if (!opts.to) return { ok: false, error: "Missing `to` number" };
  if (!opts.contentSid) return { ok: false, error: "Missing ContentSid" };

  const toWhatsApp = opts.to.startsWith("whatsapp:")
    ? opts.to
    : `whatsapp:${opts.to}`;
  const fromWhatsApp = from.startsWith("whatsapp:")
    ? from
    : `whatsapp:${from}`;

  const params = new URLSearchParams();
  params.append("To", toWhatsApp);
  params.append("From", fromWhatsApp);
  params.append("ContentSid", opts.contentSid);
  if (opts.variables && Object.keys(opts.variables).length > 0) {
    params.append("ContentVariables", JSON.stringify(opts.variables));
  }

  return postMessage(params);
}
