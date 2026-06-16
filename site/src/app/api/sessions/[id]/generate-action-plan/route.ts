/**
 * POST /api/sessions/[id]/generate-action-plan
 *
 * Pulls the session's Workshop JSON + Debrief JSON, fetches the linked Fireflies
 * transcript if one is on file, and asks Claude (via /lib/services/action-plan)
 * to produce a structured client-facing Action Plan.
 *
 * Persists:
 *   - Action Plan JSON  (rich_text) — the full structured plan
 *   - Action Plan URL   (url)       — public render URL for the client
 *   - State              → "Review" (advanced from Debrief or earlier)
 *
 * Response:
 *   {
 *     ok: true,
 *     state: "Review",
 *     actionPlanUrl: string,
 *     plan: ActionPlanV2,
 *     transcript: { used: boolean, reason?: string }
 *   }
 *
 * Action plan generation calls Claude (8-15s typical). maxDuration = 60.
 *
 * V2 Batch 6 — Action Plan generator.
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
import { generateActionPlanV2 } from "@/lib/services/action-plan";
import { fetchTranscriptText } from "@/lib/services/fireflies";
import { parseVersions, addVersion } from "@/lib/services/versioning";

/**
 * Fetch the persisted Research Brief JSON from the linked Intake page. Mirrors
 * how /api/research-brief/get reads it: retrieve the page, read the "Research
 * Brief JSON" rich_text property. Returns "" when there's no intake linked or
 * the brief isn't on file — the action plan generator treats it as optional.
 */
async function fetchResearchBriefJson(intakeId: string | undefined): Promise<string> {
  if (!intakeId) return "";
  try {
    const notion = new NotionClient({ auth: config.notion.apiKey });
    const page = (await notion.pages.retrieve({
      page_id: intakeId,
    })) as PageObjectResponse;
    const v = page.properties["Research Brief JSON"];
    return v?.type === "rich_text"
      ? v.rich_text.map((t) => t.plain_text).join("")
      : "";
  } catch {
    return "";
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 11-section plan + transcript-grounded specifics can push Claude past 60s.
// Bumped to 90 (Vercel Pro allows up to 300) to keep the function from 504'ing
// on dense-input sessions. Action plan service caps tokens to keep total bounded.
export const maxDuration = 90;

function publicActionPlanUrl(sessionId: string, request: Request): string {
  // Prefer the request's own origin so behavior is correct in preview deploys,
  // localhost, AND production without any env coupling.
  try {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}/templates-v2/action-plan.html?sessionId=${encodeURIComponent(sessionId)}`;
  } catch {
    return `/templates-v2/action-plan.html?sessionId=${encodeURIComponent(sessionId)}`;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  // Pull the session.
  const session = await getSessionById(id).catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  // Hard requirement: at least a debrief must exist. Workshop alone isn't
  // enough — the debrief carries Megha's recommendation, which is what
  // makes the action plan feel hand-crafted.
  if (!session.debriefJson) {
    return NextResponse.json(
      {
        error: "missing_debrief",
        message: "Save the debrief before generating an action plan.",
      },
      { status: 400 },
    );
  }

  // Optional: pull the Fireflies transcript if a URL is on file.
  let transcript = "";
  let transcriptInfo: { used: boolean; reason?: string } = { used: false };
  if (session.firefliesUrl) {
    const fetched = await fetchTranscriptText(session.firefliesUrl);
    if (fetched.ok) {
      transcript = fetched.text;
      transcriptInfo = { used: true };
    } else {
      // Don't fail the whole generation — just log and continue without it.
      transcriptInfo = { used: false, reason: fetched.reason };
      console.warn(
        `[generate-action-plan/${id}] fireflies transcript skipped: ${fetched.reason}`,
      );
    }
  }

  // Optional: pull the Research Brief JSON off the first linked Intake so the
  // action plan is grounded in Claude's pre-call read (voice, audience,
  // authority baselines, the Unlock, things-to-not-do).
  const researchBriefJson = await fetchResearchBriefJson(
    session.linkedIntakeIds[0],
  );

  // Generate the plan.
  let plan;
  try {
    plan = await generateActionPlanV2({
      clientName: session.clientName,
      workshopJson: session.workshopJson || "",
      debriefJson: session.debriefJson || "",
      transcript,
      researchBriefJson,
      // Merge contract: M+J's prep edits outrank the raw brief in the plan too.
      prepJson: session.prepJson || "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "generation_failed";
    console.error(`[generate-action-plan/${id}] ${message}`);
    return NextResponse.json(
      { error: "generation_failed", message },
      { status: 500 },
    );
  }

  // Persist.
  const actionPlanUrl = publicActionPlanUrl(id, request);
  const planJson = JSON.stringify(plan);

  // State transition: advance to Review unless we're already past it.
  // (Don't accidentally walk a Sent session back to Review on regeneration.)
  const shouldAdvance: boolean =
    session.state === "Prep" ||
    session.state === "Session" ||
    session.state === "Debrief";
  const newState: SessionState | undefined = shouldAdvance ? "Review" : undefined;

  // Non-destructive versioning: archive the prior action plan as a version and
  // record this one as live. Computed here so a missing "Action Plan Versions
  // JSON" property only drops versioning (caught below), never the core save.
  let actionPlanVersionsJson: string | undefined;
  try {
    const { blob } = addVersion(
      parseVersions(session.actionPlanVersionsJson),
      session.actionPlanJson || "",
      planJson,
    );
    actionPlanVersionsJson = JSON.stringify(blob);
  } catch {
    actionPlanVersionsJson = undefined;
  }

  try {
    await updateSessionFields(id, {
      actionPlanJson: planJson,
      actionPlanUrl,
      state: newState,
    });
    // Separate, fail-soft write so an absent versions property can't fail the
    // generation persist above.
    if (actionPlanVersionsJson) {
      await updateSessionFields(id, { actionPlanVersionsJson }).catch((verr) => {
        console.warn(
          `[generate-action-plan/${id}] version archive skipped (add "Action Plan Versions JSON" property): ${verr instanceof Error ? verr.message : verr}`,
        );
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "save_failed";
    console.error(`[generate-action-plan/${id}] persist failed: ${message}`);
    // Still return the plan so the caller can see what was generated.
    return NextResponse.json(
      {
        error: "save_failed",
        message,
        plan,
        actionPlanUrl,
        transcript: transcriptInfo,
      },
      { status: 500 },
    );
  }

  const resolvedState: SessionState | "Unknown" =
    newState ?? (session.state as SessionState | "Unknown");

  return NextResponse.json({
    ok: true,
    state: resolvedState,
    actionPlanUrl,
    plan,
    transcript: transcriptInfo,
  });
}
