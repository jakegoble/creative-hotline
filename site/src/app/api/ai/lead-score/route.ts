import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import { queryPaymentsDb } from "@/lib/services/notion";
import { scoreClients } from "@/lib/data-transforms";

export async function GET() {
  if (config.demoMode) {
    return NextResponse.json(demoData.getScoredClients());
  }

  if (!isConfigured("notion")) {
    return NextResponse.json({ error: "Notion API key not configured" }, { status: 503 });
  }

  try {
    const clients = await queryPaymentsDb();
    const scored = scoreClients(clients);
    return NextResponse.json(scored);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
