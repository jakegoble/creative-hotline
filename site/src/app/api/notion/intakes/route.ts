import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/config";
import { queryIntakeDb } from "@/lib/services/notion";

export async function GET() {
  if (!isConfigured("notion")) {
    return NextResponse.json(
      { error: "Notion API key not configured" },
      { status: 503 },
    );
  }

  try {
    const intakes = await queryIntakeDb();
    return NextResponse.json(intakes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
