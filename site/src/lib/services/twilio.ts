/**
 * Twilio SMS service — fetch-based, no SDK dependency.
 *
 * Used by the Send pipeline (V2 Batch 7) to fire the action-plan SMS in
 * parallel with the SendGrid email. Also used by the Day 1 "I liked / I
 * wished / I wondered" follow-up SMS (Phase 2).
 *
 * Auth: HTTP Basic with Account SID + Auth Token.
 * A2P 10DLC status: APPROVED per memory (2026-05-11 by Peter K).
 *
 * Env vars expected:
 *   TWILIO_ACCOUNT_SID    — starts with `AC...`
 *   TWILIO_AUTH_TOKEN     — 32-char hex
 *   TWILIO_FROM_NUMBER    — E.164 format, e.g. `+14137674332`
 */

import { config } from "../config";

const TWILIO_API = "https://api.twilio.com/2010-04-01";

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
  if (!config.twilio?.accountSid || !config.twilio?.authToken) {
    return { ok: false, error: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured" };
  }
  if (!config.twilio?.fromNumber) {
    return { ok: false, error: "TWILIO_FROM_NUMBER not configured" };
  }
  if (!opts.to) return { ok: false, error: "Missing `to` number" };
  if (!opts.body) return { ok: false, error: "Missing SMS body" };

  const url = `${TWILIO_API}/Accounts/${config.twilio.accountSid}/Messages.json`;
  const params = new URLSearchParams();
  params.append("To", opts.to);
  params.append("From", config.twilio.fromNumber);
  params.append("Body", opts.body);

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
    // Success — parse the JSON to get the message SID + status
    let parsed: { sid?: string; status?: string; to?: string } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      // Body wasn't JSON for some reason; still treat as success since HTTP 2xx
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
