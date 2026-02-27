/**
 * Anthropic Claude AI service.
 * Raw fetch-based wrapper for the Messages API.
 */

import { config } from "../config";
import type { Client, ScoredClient, ActionPlan } from "../types";

const BASE = "https://api.anthropic.com/v1";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MessagesResponse {
  content: { type: string; text: string }[];
}

async function callClaude(messages: Message[], system?: string): Promise<string> {
  if (!config.anthropic.apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const body: Record<string, unknown> = {
    model: config.anthropic.model,
    max_tokens: 4096,
    messages,
  };
  if (system) body.system = system;

  const res = await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropic.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as MessagesResponse;
  return data.content[0]?.text ?? "";
}

/** Score a lead using Claude AI for the Fit dimension. */
export async function scoreLead(client: Client): Promise<ScoredClient> {
  const prompt = `Score this client for a high-ticket creative consultancy ($499-$1,495 calls).
Return JSON only: { "score": 0-100, "tier": "Hot"|"Warm"|"Cool"|"Cold", "engagement": 0-25, "recency": 0-25, "value": 0-25, "fit": 0-25 }

Client:
- Name: ${client.name}
- Status: ${client.status}
- Product: ${client.product || "None"}
- Amount: $${client.amount}
- Lead Source: ${client.lead_source}
- Days to Convert: ${client.days_to_convert ?? "N/A"}
- Created: ${client.created}`;

  const text = await callClaude(
    [{ role: "user", content: prompt }],
    "You are an expert lead scoring AI for The Creative Hotline, a creative consultancy. Return valid JSON only, no markdown.",
  );

  try {
    const parsed = JSON.parse(text) as {
      score: number;
      tier: ScoredClient["tier"];
      engagement: number;
      recency: number;
      value: number;
      fit: number;
    };
    return { ...client, ...parsed };
  } catch {
    // Fallback: simple rule-based scoring
    const score = client.amount > 0 ? 60 : 20;
    return {
      ...client,
      score,
      tier: score >= 70 ? "Hot" : score >= 40 ? "Warm" : score >= 20 ? "Cool" : "Cold",
      engagement: Math.round(score * 0.25),
      recency: Math.round(score * 0.25),
      value: Math.round(score * 0.25),
      fit: Math.round(score * 0.25),
    };
  }
}

/** Generate business insights from client and channel data. */
export async function generateInsights(data: {
  totalRevenue: number;
  totalClients: number;
  topChannel: string;
  conversionRate: number;
}): Promise<string> {
  const prompt = `Analyze this business data for a high-ticket creative consultancy and provide 3 actionable insights.

Metrics:
- Total Revenue: $${data.totalRevenue}
- Total Clients: ${data.totalClients}
- Top Channel: ${data.topChannel}
- Conversion Rate: ${(data.conversionRate * 100).toFixed(1)}%
- Target: $800,000/year

Respond with 3 concise bullet points. No markdown, no headers. Each insight should include a specific action.`;

  return callClaude(
    [{ role: "user", content: prompt }],
    "You are Frankie, the AI strategist for The Creative Hotline. Warm, witty, confident, zero buzzwords.",
  );
}

/** Generate an action plan from a transcript or notes. */
export async function generateActionPlan(input: {
  clientName: string;
  transcript?: string;
  manualNotes?: string;
}): Promise<ActionPlan> {
  const source = input.transcript
    ? `Call Transcript:\n${input.transcript}`
    : `Manual Notes:\n${input.manualNotes ?? ""}`;

  const prompt = `Create a client action plan for ${input.clientName}.

${source}

Return JSON:
{
  "summary": "2 sentence summary",
  "items": [
    { "text": "action item", "category": "category", "priority": "high|medium|low" }
  ]
}

Include 4-6 specific, actionable items. Categories: Pricing, Content, Automation, Social Proof, Email, Visual Identity, Messaging, Website, Launch, SEO, Services, Growth, Operations, Marketing.`;

  const text = await callClaude(
    [{ role: "user", content: prompt }],
    "You are Frankie, the AI strategist. Return valid JSON only.",
  );

  try {
    const parsed = JSON.parse(text) as { summary: string; items: { text: string; category: string; priority: "high" | "medium" | "low" }[] };
    const now = new Date().toISOString().split("T")[0];
    return {
      id: `ap-${Date.now()}`,
      client_name: input.clientName,
      type: input.transcript ? "transcript" : "manual",
      status: "draft",
      created: now,
      updated: now,
      summary: parsed.summary,
      items: parsed.items.map((item, i) => ({
        id: `item-${Date.now()}-${i}`,
        text: item.text,
        completed: false,
        category: item.category,
        priority: item.priority,
      })),
    };
  } catch {
    return {
      id: `ap-${Date.now()}`,
      client_name: input.clientName,
      type: input.transcript ? "transcript" : "manual",
      status: "draft",
      created: new Date().toISOString().split("T")[0],
      updated: new Date().toISOString().split("T")[0],
      summary: "Action plan generation failed. Please try again.",
      items: [],
    };
  }
}

/** Health check. */
export async function ping(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    await callClaude([{ role: "user", content: "Reply with OK" }]);
    return { ok: true, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}
