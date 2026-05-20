/**
 * POST /api/tally/webhook
 *
 * Tally's form-submission webhook for the Creative Hotline Intake form
 * (`b5W1JE`). Receives JSON, verifies the HMAC signature in the
 * `tally-signature` header, parses the 21 fields by index, and creates
 * a row in the Notion Intake DB via `createIntakeFromTally`.
 *
 * Replaces the n8n workflow `U28IsefMfBMYvazv` ("Tally Form → Notion CRM")
 * whose Set-node expressions used the wrong payload path
 * (`body.fields[N].answer` vs. the actual `body.data.fields[N].value`) and
 * had been silently writing empty rows for months. See
 * `N8N-TALLY-FINDINGS-2026-05-17.md` for the forensic write-up.
 *
 * Tally webhook setup (one-time):
 *   1. Tally → form `b5W1JE` → Integrations → Webhooks → Add webhook
 *   2. URL: https://api.thecreativehotline.com/api/tally/webhook
 *   3. Signing secret: copy from Tally UI → set as TALLY_WEBHOOK_SECRET
 *      in Vercel project env (Production)
 *   4. Save + send a test submission to verify
 *   5. Leave the legacy n8n webhook subscription disabled for 1 week as
 *      fallback, then remove
 *
 * Auth: HMAC-SHA256 signature of the raw request body, base64-encoded,
 * in the `tally-signature` header (lowercase). See parser.ts.
 *
 * Idempotency: createIntakeFromTally dedupes against any Intake row with
 * the same email created in the last 5 minutes. Tally's retry policy is
 * short and bounded; the dedupe window protects us from the worst case.
 *
 * Response: always 200 + JSON. Returning non-2xx triggers Tally's retry
 * loop, which is undesirable for downstream Notion failures we can't fix
 * via retry. Errors are logged loudly but the route returns ok:false +
 * 200 so Tally moves on. (Stricter behavior — 401 on bad signature — is
 * one place we DO want a non-2xx, because that's a security concern.)
 */

import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import {
  parseTallyIntake,
  verifyTallySignature,
} from "@/lib/tally/parser";
import type { TallyWebhookPayload } from "@/lib/tally/types";
import { createIntakeFromTally } from "@/lib/services/notion-intake-create";
import { relinkSessionIntakeByEmail } from "@/lib/services/notion-sessions-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Form ID we expect — we only process the Creative Hotline Intake form. */
const EXPECTED_FORM_ID = "b5W1JE";

interface SuccessBody {
  ok: true;
  pageId: string;
  created: boolean;
  email: string;
  formId: string;
}

interface FailureBody {
  ok: false;
  error: string;
  detail?: string;
}

function jsonResponse(
  body: SuccessBody | FailureBody,
  status = 200,
): Response {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  // We need the RAW body string for HMAC verification — request.json()
  // would re-stringify with whitespace differences. Buffer the body once,
  // parse it as JSON ourselves.
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error("[tally/webhook] body read failed:", err);
    return jsonResponse(
      { ok: false, error: "body_read_failed" },
      400,
    );
  }

  // Signature verification — fail closed in production. The
  // `allowUnsigned` flag is only intended for local dev where you might
  // POST hand-crafted JSON without a signature.
  //
  // Tally normalizes the signature header to lowercase; accept both
  // forms defensively.
  const signature =
    request.headers.get("tally-signature") ??
    request.headers.get("Tally-Signature");
  const secret = config.tally.webhookSecret;

  if (!config.tally.allowUnsigned) {
    if (!secret) {
      console.error(
        "[tally/webhook] TALLY_WEBHOOK_SECRET not configured; refusing request",
      );
      return jsonResponse(
        { ok: false, error: "server_not_configured" },
        500,
      );
    }
    const ok = verifyTallySignature(rawBody, signature, secret);
    if (!ok) {
      console.warn("[tally/webhook] invalid signature", {
        hasSignatureHeader: Boolean(signature),
      });
      return jsonResponse(
        { ok: false, error: "invalid_signature" },
        401,
      );
    }
  } else {
    console.warn("[tally/webhook] HMAC verification disabled (dev mode)");
  }

  // Parse JSON body.
  let payload: TallyWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as TallyWebhookPayload;
  } catch (err) {
    console.error("[tally/webhook] JSON parse failed:", err);
    return jsonResponse(
      { ok: false, error: "invalid_json" },
      400,
    );
  }

  // Event-type sanity check. Tally fires FORM_RESPONSE on submission;
  // future event types (e.g. partial saves) should not be processed.
  if (payload?.eventType && payload.eventType !== "FORM_RESPONSE") {
    console.log(
      "[tally/webhook] ignoring non-FORM_RESPONSE event",
      payload.eventType,
    );
    return jsonResponse({
      ok: false,
      error: "unsupported_event",
      detail: payload.eventType,
    });
  }

  // Form-id sanity check. If Tally ever cross-posts another form to the
  // same webhook URL (e.g. a misconfigured second form), reject it
  // rather than write garbage into Intake.
  const formId = payload?.data?.formId ?? "";
  if (formId && formId !== EXPECTED_FORM_ID) {
    console.warn("[tally/webhook] unexpected formId, ignoring", {
      received: formId,
      expected: EXPECTED_FORM_ID,
    });
    return jsonResponse({
      ok: false,
      error: "unexpected_form_id",
      detail: formId,
    });
  }

  // Parse fields by index → typed ParsedIntake.
  const intake = parseTallyIntake(payload);
  console.log("[tally/webhook] parsed intake", {
    submissionId: payload?.data?.submissionId,
    fullName: intake.fullName,
    email: intake.email,
    primaryPlatform: intake.primaryPlatform,
    fileCount: intake.brandFiles.length,
    desiredOutcomeCount: intake.desiredOutcomes.length,
  });

  // Create the Notion row. Failures here we LOG but return 200 — Tally
  // retries are unhelpful for permanent Notion-side problems (bad
  // property name, missing select option, integration revoked). Better
  // to drop the retry loop and surface the failure in Vercel logs +
  // ops alerts.
  try {
    const result = await createIntakeFromTally(intake);
    console.log("[tally/webhook] notion result", {
      pageId: result.pageId,
      created: result.created,
      email: intake.email,
    });

    // Reverse-link any Session created by the Calendly webhook for the same
    // booking. Calendly fires ~5 min BEFORE Tally, so the Session was either
    // unlinked or linked to an older/stale Intake. Now that the fresh full
    // Intake exists, point the Session at it.
    //
    // Only runs when Tally actually created a new Intake (skips the dedupe
    // path). Failures are caught + logged but don't 4xx — the new Intake row
    // exists either way, and manual relink works as fallback.
    if (result.created && intake.email) {
      try {
        // 14-day window: clients often delay Tally for hours/days after paying.
        // Calendly's own use of findPaymentByEmail uses 30 min because it runs
        // ~1s after Stripe; Tally has no such tight coupling.
        const relink = await relinkSessionIntakeByEmail(
          intake.email,
          result.pageId,
          60 * 24 * 14,
        );
        console.log("[tally/webhook] session relink", {
          email: intake.email,
          newIntakeId: result.pageId,
          relinked: relink.relinked,
          sessionId: relink.sessionId,
        });
      } catch (relinkErr) {
        const detail =
          relinkErr instanceof Error
            ? relinkErr.message
            : String(relinkErr);
        console.error(
          "[tally/webhook] session relink failed:",
          detail,
          relinkErr,
        );
        // Non-fatal: keep the 200, Intake row was created successfully.
      }
    }

    return jsonResponse({
      ok: true,
      pageId: result.pageId,
      created: result.created,
      email: intake.email,
      formId,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[tally/webhook] notion create failed:", detail, err);
    return jsonResponse({
      ok: false,
      error: "notion_create_failed",
      detail,
    });
  }
}

/**
 * GET handler — health-check ping. Lets curl confirm the route is
 * deployed without firing a fake Tally payload.
 */
export async function GET(): Promise<Response> {
  return NextResponse.json({
    ok: true,
    route: "/api/tally/webhook",
    method: "POST",
    expectedFormId: EXPECTED_FORM_ID,
    signatureVerification: config.tally.allowUnsigned ? "disabled" : "enabled",
    description:
      "Tally form-submission webhook. POSTs application/json with TallyWebhookPayload shape. Replaces n8n workflow U28IsefMfBMYvazv.",
  });
}
