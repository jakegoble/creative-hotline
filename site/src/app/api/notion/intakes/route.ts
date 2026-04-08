import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { queryIntakeDb } from "@/lib/services/notion";

export async function GET() {
  if (!isConfigured("notion")) {
    return NextResponse.json({ error: "Notion API key not configured" }, { status: 503 });
  }

  try {
    const intakes = await queryIntakeDb();
    return NextResponse.json(intakes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Notion API Error:", message);
    console.error("API Key configured:", !!process.env.NOTION_API_KEY);
    console.error("API Key starts with:", process.env.NOTION_API_KEY?.substring(0, 10));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
