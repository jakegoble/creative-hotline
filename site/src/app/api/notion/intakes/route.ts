import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { queryIntakeDb } from "@/lib/services/notion";

export async function GET() {
  // Debug info
  const keyExists = !!process.env.NOTION_API_KEY;
  const keyPrefix = process.env.NOTION_API_KEY?.substring(0, 10) || "none";
  const keyLength = process.env.NOTION_API_KEY?.length || 0;

  if (!isConfigured("notion")) {
    return NextResponse.json({
      error: "Notion API key not configured",
      debug: { keyExists, keyPrefix, keyLength },
    }, { status: 503 });
  }

  try {
    const intakes = await queryIntakeDb();
    return NextResponse.json(intakes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const fullKey = process.env.NOTION_API_KEY || "NOT SET";
    return NextResponse.json({
      error: message,
      debug: {
        keyExists,
        keyPrefix,
        keyLength,
        fullKeyForDebug: fullKey === "NOT SET" ? "NOT SET" : (fullKey.length > 50 ? fullKey.substring(0, 20) + "..." + fullKey.substring(fullKey.length - 20) : fullKey),
        isConfigured: isConfigured("notion"),
      },
    }, { status: 500 });
  }
}
