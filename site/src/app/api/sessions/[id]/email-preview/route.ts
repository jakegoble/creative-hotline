/**
 * GET /api/sessions/[id]/email-preview?template=<key>
 *
 * Renders one of the Frankie email templates against the loaded session so
 * Megha + Jake can preview the exact copy a client received (or will receive)
 * without digging through SendGrid Activity Feed.
 *
 * Supported template keys:
 *   - "confirmation"     → confirmationEmail (initial booking)
 *   - "calendly"         → calendlyConfirmationEmail (Calendly-paid path)
 *   - "intake-nudge"     → intakeNudgeEmail (24h before, intake missing)
 *   - "caller-prep"      → callerPrepEmail (night-before one-pager)
 *   - "action-plan"      → actionPlanDeliveredEmail (Day 0 send)
 *
 * Response shape (matches FrankieEmail):
 *   {
 *     subject: string,
 *     previewText: string,
 *     bodyMarkdown: string,
 *     categories: string[],
 *     to: string,          // recipient that would actually have been used
 *     template: string,    // echoed back for debug
 *   }
 *
 * V2 (Hub command-center) 2026-05-15 evening.
 */

import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getSessionById } from "@/lib/services/notion-sessions-read";
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import {
  confirmationEmail,
  calendlyConfirmationEmail,
  intakeNudgeEmail,
  callerPrepEmail,
  actionPlanDeliveredEmail,
} from "@/lib/email/templates/frankie";
import { buildReferralCode } from "@/lib/services/referral-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const SUPPORTED = new Set([
  "confirmation",
  "calendly",
  "intake-nudge",
  "caller-prep",
  "action-plan",
]);

let _notion: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_notion) _notion = new NotionClient({ auth: config.notion.apiKey });
  return _notion;
}

async function fetchPaymentEmail(paymentId: string): Promise<string> {
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: paymentId,
    })) as PageObjectResponse;
    const p = page.properties;
    if (p["Email"]?.type === "email") return p["Email"].email ?? "";
  } catch {}
  return "";
}

function firstNameFrom(clientName: string | undefined | null): string {
  if (!clientName) return "there";
  const first = clientName.trim().split(/\s+/)[0] || "there";
  return first;
}

function sessionTimeFrom(iso: string | null | undefined): string {
  if (!iso) return "your scheduled time";
  try {
    const d = new Date(iso);
    const day = d.toLocaleDateString("en-US", { weekday: "long" });
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
    });
    return `${day} at ${time} PT`;
  } catch {
    return "your scheduled time";
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const template = (url.searchParams.get("template") || "").trim();
  if (!SUPPORTED.has(template)) {
    return NextResponse.json(
      {
        error: "invalid_template",
        message: `template must be one of: ${Array.from(SUPPORTED).join(", ")}`,
      },
      { status: 400 },
    );
  }

  let session;
  try {
    session = await getSessionById(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "session_fetch_failed";
    return NextResponse.json(
      { error: "session_fetch_failed", message },
      { status: 500 },
    );
  }
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const firstName = firstNameFrom(session.clientName);
  const sessionTime = sessionTimeFrom(session.scheduledAt);
  const paymentId = session.linkedPaymentIds[0] || "";
  const to = paymentId ? await fetchPaymentEmail(paymentId) : "";

  const calendlyUrl =
    config.frankieEmails.calendlyUrls.firstCall ||
    config.frankieEmails.calendlyUrls.singleCall ||
    "https://calendly.com/thecreativehotline";
  const tallyUrl = config.frankieEmails.tallyUrl;
  const serviceAgreementUrl = config.frankieEmails.serviceAgreementUrl;
  const callerPrepUrl = `${config.frankieEmails.callerPrepBaseUrl}?sessionId=${encodeURIComponent(session.id)}`;

  let rendered;
  switch (template) {
    case "confirmation":
      rendered = confirmationEmail({
        firstName,
        calendlyUrl,
        tallyUrl,
        serviceAgreementUrl,
      });
      break;
    case "calendly":
      rendered = calendlyConfirmationEmail({
        firstName,
        tallyUrl,
        serviceAgreementUrl,
      });
      break;
    case "intake-nudge":
      rendered = intakeNudgeEmail({
        firstName,
        sessionTime,
        tallyUrl,
      });
      break;
    case "caller-prep":
      rendered = callerPrepEmail({
        firstName,
        sessionTime,
        callerPrepUrl,
      });
      break;
    case "action-plan": {
      const actionPlanUrl =
        session.actionPlanUrl ||
        `https://api.thecreativehotline.com/templates-v2/action-plan.html?sessionId=${encodeURIComponent(session.id)}`;
      const referralCode = session.referralCode || buildReferralCode(firstName);
      rendered = actionPlanDeliveredEmail({
        firstName,
        actionPlanUrl,
        referralCode,
      });
      break;
    }
    default:
      // Already validated above — keep TS happy.
      return NextResponse.json(
        { error: "invalid_template" },
        { status: 400 },
      );
  }

  return NextResponse.json({
    template,
    to,
    subject: rendered.subject,
    previewText: rendered.previewText,
    bodyMarkdown: rendered.bodyMarkdown,
    categories: rendered.categories,
  });
}
