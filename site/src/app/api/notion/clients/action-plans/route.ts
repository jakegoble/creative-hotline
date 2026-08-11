/**
 * GET /api/notion/clients/action-plans — action plans from real Notion sessions.
 * Live: one ActionPlan per session that has an action plan. Items are parsed
 * defensively from the stored actionPlanJson (shape varies across versions);
 * unparseable plans still list with an empty item set rather than crashing.
 */
import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import { getSessionsInRange } from "@/lib/services/notion-sessions-read";
import type { ActionPlan, ActionPlanItem } from "@/lib/types";
import type { SessionRecord } from "@/lib/services/notion-sessions-read";

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

/** Best-effort extraction of checklist items from a stored action-plan blob. */
function parseItems(json: string): ActionPlanItem[] {
  if (!json) return [];
  try {
    const blob = JSON.parse(json) as Record<string, unknown>;
    const raw =
      (Array.isArray(blob.items) && blob.items) ||
      (Array.isArray(blob.moves) && blob.moves) ||
      (Array.isArray(blob.actions) && blob.actions) ||
      [];
    return (raw as unknown[]).slice(0, 50).map((it, i) => {
      const obj = (typeof it === "object" && it ? it : {}) as Record<string, unknown>;
      const text =
        typeof obj.text === "string" ? obj.text :
        typeof obj.title === "string" ? obj.title :
        typeof it === "string" ? it : "Action item";
      const priority = obj.priority === "high" || obj.priority === "low" ? obj.priority : "medium";
      return {
        id: `${i}`,
        text,
        completed: obj.completed === true,
        category: typeof obj.category === "string" ? obj.category : "General",
        priority,
      };
    });
  } catch {
    return [];
  }
}

function toActionPlan(s: SessionRecord): ActionPlan {
  const status: ActionPlan["status"] = s.emailSent ? "sent" : "draft";
  return {
    id: s.id,
    client_name: s.clientName || "Unknown",
    type: "transcript",
    status,
    created: s.created,
    updated: s.updated,
    items: parseItems(s.actionPlanJson),
    summary: "",
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  if (config.demoMode) return NextResponse.json(demoData.getActionPlans());
  if (!isConfigured("notion")) {
    return NextResponse.json({ error: "Notion API key not configured" }, { status: 503 });
  }
  try {
    const sessions = await getSessionsInRange(isoDaysFromNow(-730), isoDaysFromNow(90));
    const plans = sessions
      .filter((s) => s.actionPlanJson || s.actionPlanUrl)
      .map(toActionPlan)
      .sort((a, b) => b.updated.localeCompare(a.updated));
    return NextResponse.json(plans);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
