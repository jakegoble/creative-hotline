import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { getUpcomingEvents } from "@/lib/services/calendly";

export async function GET() {
  if (config.demoMode) {
    return NextResponse.json([]);
  }

  if (!isConfigured("calendly")) {
    return NextResponse.json({ error: "Calendly API key not configured" }, { status: 503 });
  }

  try {
    const events = await getUpcomingEvents();
    return NextResponse.json(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
