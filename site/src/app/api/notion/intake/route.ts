import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { queryIntakeDb } from "@/lib/services/notion";

export async function GET() {
  if (config.demoMode) {
    return NextResponse.json([]);
  }

  if (!isConfigured("notion")) {
    return NextResponse.json({ error: "Notion API key not configured" }, { status: 503 });
  }

  try {
    const intake = await queryIntakeDb();
    return NextResponse.json(intake);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
