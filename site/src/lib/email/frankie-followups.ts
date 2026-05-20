/**
 * Shared Frankie #2 (Intake Nudge) + Frankie #3 (Caller Prep) processor.
 *
 * Single source of truth for the per-session followup logic. Used by:
 *
 *   1. /api/cron/frankie-followups (nightly 23:00 UTC sweep) — fires for
 *      every Prep-state Session whose scheduledAt is within the next 30h.
 *
 *   2. /api/calendly/webhook (invitee.created) — fires INLINE for late
 *      bookings (<23h before the call) because those would otherwise miss
 *      the nightly cron window entirely.
 *
 * Edge case this fixes: someone books at 09:00 UTC for a 14:00 UTC same-day
 * call. The next cron run is 23:00 UTC (after the call). Without inline fire
 * from the webhook, Frankie #2 + #3 silently skip — client gets no intake
 * nudge, no caller-prep one-pager, then shows up to the call cold.
 *
 * Idempotency: each send writes its checkbox (intakeNudgeSent / callerPrepSent)
 * back to Notion on success. Re-runs (cron after webhook fired inline) are
 * no-ops because the checkbox guard short-circuits.
 */
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import type { SessionRecord } from "@/lib/services/notion-sessions-read";
import { updateSessionFields } from "@/lib/services/notion-sessions-write";
import { findIntakeIdByEmail } from "@/lib/services/notion-intake-read";
import { sendIntakeNudge, sendCallerPrep } from "@/lib/email/send-frankie";

let _notion: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_notion) _notion = new NotionClient({ auth: config.notion.apiKey });
  return _notion;
}

export interface PaymentLite {
  email: string;
  clientName: string;
}

async function fetchPaymentLite(id: string): Promise<PaymentLite | null> {
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: id,
    })) as PageObjectResponse;
    const p = page.properties;
    const email = p["Email"]?.type === "email" ? p["Email"].email ?? "" : "";
    const clientName =
      p["Client Name"]?.type === "title"
        ? p["Client Name"].title.map((t) => t.plain_text).join("")
        : "";
    return { email, clientName };
  } catch {
    return null;
  }
}

async function fetchIntakeStatus(id: string): Promise<string | null> {
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: id,
    })) as PageObjectResponse;
    const p = page.properties;
    const status =
      p["Intake Status"]?.type === "select" && p["Intake Status"].select
        ? p["Intake Status"].select.name
        : null;
    return status;
  } catch {
    return null;
  }
}

/**
 * Whether the intake has been submitted. Returns true ONLY when we can prove
 * a submission exists. Missing intake / missing status / explicit "Pending"
 * all return false → nudge will fire.
 */
async function isIntakeSubmitted(
  session: SessionRecord,
  paymentEmail: string,
): Promise<boolean> {
  let intakeId: string | null = session.linkedIntakeIds[0] ?? null;
  if (!intakeId && paymentEmail) {
    intakeId = await findIntakeIdByEmail(paymentEmail).catch(() => null);
  }
  if (!intakeId) return false;
  const status = await fetchIntakeStatus(intakeId);
  if (!status) return false;
  // "Submitted" / "Complete" / "Reviewed" — anything past raw submission counts.
  return /submitted|complete|reviewed|done/i.test(status);
}

/**
 * Format a session's scheduled time for the Frankie email templates.
 * Returns time only — e.g. "11:00 AM PT" — because:
 *   - Frankie #2 body reads "Your call ... is tomorrow at [time]"
 *   - Frankie #3 subject reads "Tomorrow at [time] · Here's how we make it count"
 * Day-of-week is implied by "tomorrow" since both emails fire 24h pre-call.
 * Per Megha's V2 spec (TCH-V2-CLIENT-ONBOARDING-EMAILS.md), [SESSION_TIME] is
 * the time portion only — adding the weekday led to "tomorrow at Wednesday at
 * 11:00 AM PT" double-stamping.
 */
function formatSessionTime(iso?: string): string {
  if (!iso) return "soon";
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
    });
    return `${time} PT`;
  } catch {
    return iso;
  }
}

/**
 * Default Frankie followup window: now < scheduledAt <= now + 30h.
 * Wide enough to catch sessions across the daily cron run + slop.
 */
export function inFollowupWindow(
  scheduledAt: string | undefined,
  now: Date,
  windowHours: number = 30,
): boolean {
  if (!scheduledAt) return false;
  const t = new Date(scheduledAt).getTime();
  const nowMs = now.getTime();
  const HOUR_MS = 60 * 60 * 1000;
  return t > nowMs && t <= nowMs + windowHours * HOUR_MS;
}

/**
 * Whether a session is a "late booking" — scheduled inside the cron's miss
 * window. A booking made at 09:00 UTC for the same day's 14:00 UTC call
 * would have to wait until 23:00 UTC for the cron, by which point the call
 * has already happened. Anything under 23h is late.
 */
export function isLateBooking(
  scheduledAt: string | undefined,
  now: Date,
  lateHours: number = 23,
): boolean {
  if (!scheduledAt) return false;
  const t = new Date(scheduledAt).getTime();
  const nowMs = now.getTime();
  if (t <= nowMs) return false; // in the past — not late, just gone
  const HOUR_MS = 60 * 60 * 1000;
  return t - nowMs < lateHours * HOUR_MS;
}

export interface SessionResult {
  sessionId: string;
  clientName: string;
  intakeNudge?: { ok: boolean; reason?: string };
  callerPrep?: { ok: boolean; reason?: string };
}

export interface Skipped {
  sessionId: string;
  reason: string;
}

/**
 * Run the Frankie #2 + #3 logic for a single session. Returns either a
 * SessionResult (work was attempted) or a Skipped reason. Never throws —
 * email failures surface in the SessionResult.intakeNudge / .callerPrep
 * fields.
 *
 * Caller is responsible for filtering by state ("Prep" only) and window
 * (inFollowupWindow). This function trusts that gate and proceeds.
 */
export async function processSession(
  session: SessionRecord,
  now: Date,
): Promise<{ result?: SessionResult; skipped?: Skipped }> {
  // Defensive: still check state in case caller forgot.
  if (session.state !== "Prep") {
    return {
      skipped: { sessionId: session.id, reason: `state_${session.state}` },
    };
  }
  if (!inFollowupWindow(session.scheduledAt, now)) {
    return {
      skipped: { sessionId: session.id, reason: "outside_window" },
    };
  }
  const paymentId = session.linkedPaymentIds[0];
  if (!paymentId) {
    return { skipped: { sessionId: session.id, reason: "no_payment" } };
  }
  const payment = await fetchPaymentLite(paymentId);
  if (!payment || !payment.email) {
    return { skipped: { sessionId: session.id, reason: "no_payment_email" } };
  }

  const firstName =
    (payment.clientName.split(/\s+/)[0] || "").trim() ||
    payment.email.split("@")[0];
  const sessionTime = formatSessionTime(session.scheduledAt);

  const result: SessionResult = {
    sessionId: session.id,
    clientName: payment.clientName || session.clientName,
  };

  // -------- Intake Nudge --------
  if (!session.intakeNudgeSent) {
    const submitted = await isIntakeSubmitted(session, payment.email);
    if (!submitted) {
      const sent = await sendIntakeNudge({
        email: payment.email,
        firstName,
        sessionTime,
        tallyUrl: config.frankieEmails.tallyUrl,
      });
      result.intakeNudge = sent;
      if (sent.ok) {
        try {
          await updateSessionFields(session.id, { intakeNudgeSent: true });
        } catch (err) {
          console.error(
            `[frankie-followups] failed to mark intakeNudgeSent on ${session.id}: ${err instanceof Error ? err.message : "unknown"}`,
          );
        }
      }
    } else {
      result.intakeNudge = { ok: false, reason: "intake_submitted" };
    }
  } else {
    result.intakeNudge = { ok: false, reason: "already_sent" };
  }

  // -------- Caller Prep --------
  if (!session.callerPrepSent) {
    const callerPrepUrl = `${config.frankieEmails.callerPrepBaseUrl}?sessionId=${encodeURIComponent(session.id)}`;
    const sent = await sendCallerPrep({
      email: payment.email,
      firstName,
      sessionTime,
      callerPrepUrl,
    });
    result.callerPrep = sent;
    if (sent.ok) {
      try {
        await updateSessionFields(session.id, { callerPrepSent: true });
      } catch (err) {
        console.error(
          `[frankie-followups] failed to mark callerPrepSent on ${session.id}: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }
  } else {
    result.callerPrep = { ok: false, reason: "already_sent" };
  }

  return { result };
}
