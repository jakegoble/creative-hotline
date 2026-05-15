/**
 * POST /api/sessions/[id]/send
 *
 * The Day-0 delivery step of the V2 pipeline. After Megha + Jake approve the
 * action plan in the Review Dashboard, this route:
 *
 *   0. **Approval gate** — body MUST include { approvedByMegha: true,
 *      approvedByJake: true }, or pass ?force=true&token=<SEND_FORCE_TOKEN>
 *      for ops bypass. Missing sign-off → 403.
 *   1. Fetches the Session + linked Payment from Notion
 *   2. Refuses to re-fire if state === Sent (use ?force=true to override)
 *   3. Generates the referral code `<FIRST>-DIAL-100` (deterministic — safe
 *      to call repeatedly; we always emit the same code for the same client)
 *   4. Stores the code on the Session row
 *   5. Fires SendGrid email + Twilio SMS in parallel via Frankie
 *   6. Marks Email Sent / SMS Sent / Sent At on the Session row
 *   7. Transitions State Review → Sent
 *
 * Body shape:
 *   { approvedByMegha: boolean, approvedByJake: boolean }
 *
 * Response shape:
 *   {
 *     ok: true,
 *     state: "Sent",
 *     referralCode: string,
 *     actionPlanUrl: string,
 *     delivery: {
 *       email: { ok: boolean, reason?: string },
 *       sms:   { ok: boolean, reason?: string, sid?: string }
 *     }
 *   }
 *
 * V2 Batch 7 — Send pipeline.
 * V2 Round A — added Megha+Jake approval gate + Sent-state refusal.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import { getSessionById } from "@/lib/services/notion-sessions-read";
import {
  updateSessionFields,
  type SessionState,
} from "@/lib/services/notion-sessions-write";
import { sendActionPlanDelivery } from "@/lib/email/send-frankie";
import {
  buildReferralCode,
  withDeterministicSuffix,
} from "@/lib/services/referral-code";
import {
  findContactByEmail,
  findContactByPhone,
  normalizePhoneE164,
  upsertContactByPhone,
} from "@/lib/services/notion-messaging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// SendGrid + Twilio in parallel — bounded by the slower one. ~10s in practice.
export const maxDuration = 30;

let _notion: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_notion) _notion = new NotionClient({ auth: config.notion.apiKey });
  return _notion;
}

interface PaymentSnapshot {
  pageId: string;
  email: string;
  phone: string;
  clientName: string;
}

async function fetchPaymentSnapshot(
  paymentPageId: string,
): Promise<PaymentSnapshot | null> {
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: paymentPageId,
    })) as PageObjectResponse;
    const p = page.properties;
    const email = p["Email"]?.type === "email" ? p["Email"].email ?? "" : "";
    const clientName =
      p["Client Name"]?.type === "title"
        ? p["Client Name"].title.map((t) => t.plain_text).join("")
        : "";
    const phone =
      p["Phone"]?.type === "phone_number" ? p["Phone"].phone_number ?? "" : "";
    return { pageId: page.id, email, phone, clientName };
  } catch {
    return null;
  }
}

function buildActionPlanUrl(sessionId: string, request: Request): string {
  try {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}/templates-v2/action-plan.html?sessionId=${encodeURIComponent(sessionId)}`;
  } catch {
    return `/templates-v2/action-plan.html?sessionId=${encodeURIComponent(sessionId)}`;
  }
}

/**
 * Parse the approval flags out of the request body. The Review Dashboard sends:
 *   { approvedByMegha: boolean, approvedByJake: boolean }
 * Missing body or non-true flags fail the gate. Bypass for legacy callers (e.g.
 * smoke tests) is allowed via `?force=true` query param when the server's
 * SEND_FORCE_TOKEN env matches `&token=...` — keeps the gate honest in prod but
 * gives ops an escape hatch during testing.
 */
async function checkApprovalGate(request: Request): Promise<
  | { ok: true; approvedByMegha: boolean; approvedByJake: boolean }
  | { ok: false; reason: string }
> {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";
  const token = url.searchParams.get("token") || "";

  if (force) {
    const expected = process.env.SEND_FORCE_TOKEN || "";
    if (!expected) {
      return { ok: false, reason: "force_disabled_no_token_configured" };
    }
    if (token !== expected) {
      return { ok: false, reason: "force_token_mismatch" };
    }
    // Force-allow; record sign-offs as system overrides.
    return { ok: true, approvedByMegha: true, approvedByJake: true };
  }

  let body: { approvedByMegha?: unknown; approvedByJake?: unknown } = {};
  try {
    body = await request.clone().json();
  } catch {
    return { ok: false, reason: "missing_or_invalid_json_body" };
  }
  const approvedByMegha = body.approvedByMegha === true;
  const approvedByJake = body.approvedByJake === true;
  if (!approvedByMegha) return { ok: false, reason: "megha_signoff_required" };
  if (!approvedByJake) return { ok: false, reason: "jake_signoff_required" };
  return { ok: true, approvedByMegha, approvedByJake };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  // 0. Gate: both reviewers must sign off (or force-token must match).
  const gate = await checkApprovalGate(request);
  if (!gate.ok) {
    return NextResponse.json(
      {
        error: "approval_gate_failed",
        reason: gate.reason,
        message:
          "Both Megha and Jake must sign off before sending. POST with " +
          "{ approvedByMegha: true, approvedByJake: true } in the body.",
      },
      { status: 403 },
    );
  }

  // 1. Fetch session
  const session = await getSessionById(id).catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  // Gate: don't allow re-sending sessions already in the Sent state. The
  // approval gate stops a fresh send, but if the Notion row is already Sent
  // we refuse before even hitting Frankie — keeps us from spamming the client.
  if (session.state === "Sent" && session.emailSent) {
    return NextResponse.json(
      {
        error: "already_sent",
        message:
          "Session is already in Sent state with Email Sent=true. Use ?force=true&token=... to re-fire deliberately.",
      },
      { status: 409 },
    );
  }

  // Gate: we don't allow sending if there's no action plan to deliver.
  if (!session.actionPlanJson) {
    return NextResponse.json(
      {
        error: "no_action_plan",
        message:
          "Generate the action plan before sending. POST /api/sessions/[id]/generate-action-plan first.",
      },
      { status: 400 },
    );
  }

  // 2. Fetch the linked Payment so we have email + phone + name.
  const paymentPageId = session.linkedPaymentIds[0];
  if (!paymentPageId) {
    return NextResponse.json(
      { error: "no_linked_payment", message: "Session has no linked Payment row." },
      { status: 400 },
    );
  }
  const payment = await fetchPaymentSnapshot(paymentPageId);
  if (!payment || !payment.email) {
    return NextResponse.json(
      {
        error: "payment_missing_contact",
        message: "Linked Payment row has no usable email address.",
      },
      { status: 400 },
    );
  }

  // 3. Generate (or reuse existing) referral code.
  // Format: <FIRST>-DIAL-100. If the Session already has one stored, reuse it
  // verbatim — that lets us re-send without changing the code the client saw.
  // Otherwise build a new one with a deterministic suffix seeded by sessionId
  // so retries always yield the same code per session.
  const firstName =
    (payment.clientName.split(/\s+/)[0] || "").trim() ||
    payment.email.split("@")[0];

  let referralCode = session.referralCode || "";
  if (!referralCode) {
    const base = buildReferralCode(firstName);
    // For now, no collision check across the codespace — `withDeterministicSuffix`
    // is here for future use if we hit duplicates. We start with the bare form
    // since collisions are extremely rare in early customer base.
    referralCode = base;
    // To opt into suffixed forms later, swap to:
    //   referralCode = withDeterministicSuffix(base, session.id);
  }

  // 4. Compute the public action-plan URL.
  const actionPlanUrl =
    session.actionPlanUrl || buildActionPlanUrl(session.id, request);

  // 5. Persist referral code + (already-set) action plan URL BEFORE firing the
  //    delivery. If the email/SMS land but the Notion write blows up after,
  //    we'd have orphaned messages. Setting Notion first means the worst case
  //    is "Notion shows code/URL, no delivery yet" — the operator can re-send.
  try {
    await updateSessionFields(id, {
      referralCode,
      actionPlanUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "notion_pre_write_failed";
    console.error(`[sessions/${id}/send] pre-write failed: ${message}`);
    return NextResponse.json(
      { error: "notion_write_failed", message },
      { status: 500 },
    );
  }

  // 6. Fire email + SMS in parallel via Frankie.
  const delivery = await sendActionPlanDelivery({
    email: payment.email,
    phone: payment.phone || undefined,
    firstName,
    actionPlanUrl,
    referralCode,
  });

  // 7. Mark Sent on the Session row. We advance state to "Sent" even if SMS
  //    failed (email is the load-bearing channel). If email failed too, we
  //    leave state at Review and surface the error to the caller — they can
  //    retry.
  const sentAt = new Date().toISOString();
  const shouldAdvance = delivery.email.ok;
  const newState: SessionState | undefined = shouldAdvance ? "Sent" : undefined;

  try {
    await updateSessionFields(id, {
      emailSent: delivery.email.ok,
      smsSent: delivery.sms.ok,
      sentAt: delivery.email.ok || delivery.sms.ok ? sentAt : undefined,
      state: newState,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "notion_post_write_failed";
    console.error(`[sessions/${id}/send] post-write failed: ${message}`);
    // Return delivery results even if the post-write blew up — the messages
    // DID fire, the caller should know that.
    return NextResponse.json(
      {
        error: "partial_send_notion_write_failed",
        message,
        delivery,
        referralCode,
        actionPlanUrl,
      },
      { status: 500 },
    );
  }

  // 8. Log the send for ops visibility.
  console.log(
    `[sessions/${id}/send] email.ok=${delivery.email.ok}` +
      (delivery.email.reason ? ` email.reason=${delivery.email.reason}` : "") +
      ` sms.ok=${delivery.sms.ok}` +
      (delivery.sms.reason ? ` sms.reason=${delivery.sms.reason}` : "") +
      ` code=${referralCode}` +
      ` approvals=M:${gate.approvedByMegha}|J:${gate.approvedByJake}`,
  );

  // 9. Cross-flow connection: mark the Messaging Contact as paid-client +
  //    halt their drip. Same dedupe rules as Calendly webhook — look up by
  //    phone first, fall back to email. If no contact exists and we have a
  //    phone (almost always true for paid clients), create one so future
  //    Day-N follow-up touchpoints find them.
  //
  //    AWAITED, not fire-and-forget — Vercel serverless terminates the
  //    invocation when the response returns, killing pending promises.
  //    CRM failure still doesn't fail the send: we catch and log.
  try {
    const phoneE164 = normalizePhoneE164(payment.phone);
    let contact = phoneE164 ? await findContactByPhone(phoneE164) : null;
    if (!contact) {
      contact = await findContactByEmail(payment.email);
    }
    if (contact) {
      await upsertContactByPhone({
        phone: contact.phone,
        email: payment.email,
        addTags: ["paid-client"],
        dripStage: "completed",
        complianceNote: `Action plan sent (session ${id}, code ${referralCode})`,
      });
      console.log(
        `[sessions/${id}/send] linked Messaging Contact ${contact.id} as paid-client`,
      );
    } else if (phoneE164) {
      await upsertContactByPhone({
        phone: phoneE164,
        email: payment.email,
        status: "active",
        dripStage: "completed",
        source: "referral",
        addTags: ["paid-client"],
        complianceNote: `Created from V2 Send (session ${id}, code ${referralCode})`,
      });
      console.log(
        `[sessions/${id}/send] created Messaging Contact for ${phoneE164}`,
      );
    }
  } catch (err) {
    console.warn(`[sessions/${id}/send] Messaging Contact sync failed:`, err);
  }

  return NextResponse.json({
    ok: delivery.email.ok,
    state: newState ?? session.state,
    referralCode,
    actionPlanUrl,
    delivery,
  });
}
