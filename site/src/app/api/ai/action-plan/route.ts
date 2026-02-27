import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { generateActionPlan } from "@/lib/services/claude";

export async function POST(request: Request) {
  if (config.demoMode) {
    return NextResponse.json({ error: "Action plan generation requires live mode" }, { status: 400 });
  }

  if (!isConfigured("anthropic")) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    if (!body.clientName) {
      return NextResponse.json({ error: "clientName is required" }, { status: 400 });
    }
    const plan = await generateActionPlan(body);
    return NextResponse.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
