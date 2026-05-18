/**
 * GET /api/sessions/[id]
 *
 * Returns a single Session row enriched with a lightweight Payment summary so
 * the Live Workshop screen can show client name / product / scheduled-at in
 * its header. Includes the existing `workshopJson` blob so the screen can
 * resume mid-workshop if reloaded.
 *
 * Response shape:
 *   {
 *     id, sessionId, clientName, state, scheduledAt,
 *     workshopJson: string,      // empty string if never saved
 *     debriefJson: string,       // empty string if never saved
 *     actionPlanJson: string,    // empty string if never generated
 *     actionPlanUrl: string|null,
 *     firefliesUrl: string|null,
 *     payment: { id, email, product, amount } | null
 *   }
 *
 * PATCH /api/sessions/[id]
 *
 * Partial-update for the small set of single-string fields the Hub needs to
 * write inline (Fireflies transcript URL today; room for actionPlanUrl etc.
 * later). Body shape:
 *   { firefliesUrl?: string, actionPlanUrl?: string }
 *
 * Only the listed keys are written; anything else is dropped. Useful for the
 * Review-state Fireflies input on the Hub so Megha can paste a transcript
 * link without leaving the page.
 *
 * V2 Batch 4 — Live Workshop screen.
 * V2 Batch 5 — added debriefJson + firefliesUrl in response.
 * V2 Batch 6 — added actionPlanJson + actionPlanUrl in response.
 * V2 (Hub command-center) 2026-05-15 evening — added PATCH for inline Fireflies URL save.
 */

import { NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from "@/lib/config";
import { getSessionById } from "@/lib/services/notion-sessions-read";
import { updateSessionFields } from "@/lib/services/notion-sessions-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _client: NotionClient | null = null;
function getNotion(): NotionClient {
  if (!_client) _client = new NotionClient({ auth: config.notion.apiKey });
  return _client;
}

interface PaymentSummary {
  id: string;
  email: string;
  product: string;
  amount: number;
}

interface IntakeFile {
  name: string;
  url: string;
}
interface IntakeSummary {
  id: string;
  status: string;
  briefStatus: string;
  briefGeneratedAt?: string;
  files: IntakeFile[];
}

async function fetchPaymentSummary(id: string): Promise<PaymentSummary | null> {
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: id,
    })) as PageObjectResponse;
    const p = page.properties;
    const email = p["Email"]?.type === "email" ? p["Email"].email ?? "" : "";
    const product =
      p["Product Purchased"]?.type === "select" && p["Product Purchased"].select
        ? p["Product Purchased"].select.name
        : "";
    const amount =
      p["Payment Amount"]?.type === "number" && p["Payment Amount"].number !== null
        ? p["Payment Amount"].number
        : 0;
    return { id: page.id, email, product, amount };
  } catch {
    return null;
  }
}

/**
 * Fetch a lightweight Intake summary so the Hub can render intake-aware
 * panels (status, research brief, client-library file uploads). Returns
 * null on any failure — the Hub gracefully handles a missing intake.
 *
 * "Brand Files" is the Notion files property where Tally Q8 uploads land
 * once the Tally → n8n → Notion mapping is in place. Until then, this
 * returns an empty array so the Hub renders "no files yet" cleanly.
 */
async function fetchIntakeSummary(id: string): Promise<IntakeSummary | null> {
  try {
    const page = (await getNotion().pages.retrieve({
      page_id: id,
    })) as PageObjectResponse;
    const p = page.properties;
    const status =
      p["Intake Status"]?.type === "select" && p["Intake Status"].select
        ? p["Intake Status"].select.name
        : "";
    const briefStatus =
      p["Research Brief Status"]?.type === "select" &&
      p["Research Brief Status"].select
        ? p["Research Brief Status"].select.name
        : "Not Generated";
    const briefGeneratedAt =
      p["Research Brief Generated At"]?.type === "date" &&
      p["Research Brief Generated At"].date?.start
        ? p["Research Brief Generated At"].date.start
        : undefined;
    const filesProp = p["Brand Files"];
    const files: IntakeFile[] =
      filesProp?.type === "files"
        ? filesProp.files
            .map((f) => {
              const url =
                f.type === "external" && f.external
                  ? f.external.url
                  : f.type === "file" && f.file
                    ? f.file.url
                    : "";
              return { name: f.name || "file", url };
            })
            .filter((f) => f.url)
        : [];
    return { id: page.id, status, briefStatus, briefGeneratedAt, files };
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
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

  const paymentId = session.linkedPaymentIds[0];
  const intakeId = session.linkedIntakeIds[0];
  const [payment, intake] = await Promise.all([
    paymentId ? fetchPaymentSummary(paymentId) : Promise.resolve(null),
    intakeId ? fetchIntakeSummary(intakeId) : Promise.resolve(null),
  ]);

  // Tier-aware booking URLs for the Hub's Sent panel CTAs ("Book Follow-Up
  // Session", "Pitch Clarity Bundle"). Prefer the per-tier env-driven values
  // when configured; fall back to the universal "creative-hotline-call"
  // event so the buttons never go to a dead URL. The fallback matches the
  // SMS keyword router's BOOKING_URL (src/lib/sms/keywords.ts) so messaging
  // stays consistent across channels.
  const UNIVERSAL_BOOKING_URL =
    "https://calendly.com/soscreativehotline/creative-hotline-call";
  const bookingUrls = {
    firstCall:
      config.frankieEmails.calendlyUrls.firstCall || UNIVERSAL_BOOKING_URL,
    singleCall:
      config.frankieEmails.calendlyUrls.singleCall || UNIVERSAL_BOOKING_URL,
    clarityBundle:
      config.frankieEmails.calendlyUrls.clarityBundle || UNIVERSAL_BOOKING_URL,
  };

  return NextResponse.json({
    id: session.id,
    sessionId: session.sessionId,
    clientName: session.clientName,
    state: session.state,
    scheduledAt: session.scheduledAt,
    workshopJson: session.workshopJson,
    debriefJson: session.debriefJson,
    actionPlanJson: session.actionPlanJson,
    /** M+J review approval + sign-off state, synced across browsers via Notion.
     *  Empty string when no review activity yet. */
    approvalsJson: session.approvalsJson || "",
    actionPlanUrl: session.actionPlanUrl ?? null,
    firefliesUrl: session.firefliesUrl ?? null,
    // Send-pipeline state — surfaced for the Hub's Sent panel + downstream UI.
    // Added 2026-05-15 alongside the Hub dynamic-panel wiring.
    referralCode: session.referralCode || null,
    emailSent: !!session.emailSent,
    smsSent: !!session.smsSent,
    sentAt: session.sentAt ?? null,
    payment,
    // Intake summary — added 2026-05-15 (Hub command-center). Includes
    // Brand Files (Tally Q8 uploads) once the Tally→n8n→Notion mapping
    // is in place; empty array until then. Null when no intake linked.
    intake,
    // Tier-aware booking URLs — Sent panel CTAs read these and degrade
    // gracefully to the universal booking URL when env vars aren't set.
    bookingUrls,
  });
}

// ---------------------------------------------------------------------------
// PATCH — inline field updates (Hub command-center inputs)
// ---------------------------------------------------------------------------

interface PatchBody {
  firefliesUrl?: string;
  actionPlanUrl?: string;
}

function isValidUrl(u: unknown): u is string {
  if (typeof u !== "string") return false;
  const s = u.trim();
  if (!s) return false;
  // Accept http(s) URLs; reject anything else to avoid junk in Notion.
  return /^https?:\/\//i.test(s);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  const updates: { firefliesUrl?: string; actionPlanUrl?: string } = {};

  if (body.firefliesUrl !== undefined) {
    if (!isValidUrl(body.firefliesUrl)) {
      return NextResponse.json(
        { error: "invalid_firefliesUrl", message: "Must be an http(s) URL" },
        { status: 400 },
      );
    }
    updates.firefliesUrl = body.firefliesUrl.trim();
  }

  if (body.actionPlanUrl !== undefined) {
    if (!isValidUrl(body.actionPlanUrl)) {
      return NextResponse.json(
        { error: "invalid_actionPlanUrl", message: "Must be an http(s) URL" },
        { status: 400 },
      );
    }
    updates.actionPlanUrl = body.actionPlanUrl.trim();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "no_updates", message: "No supported fields provided" },
      { status: 400 },
    );
  }

  try {
    await updateSessionFields(id, updates);
  } catch (err) {
    const message = err instanceof Error ? err.message : "notion_write_failed";
    return NextResponse.json(
      { error: "notion_write_failed", message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, updated: Object.keys(updates) });
}
