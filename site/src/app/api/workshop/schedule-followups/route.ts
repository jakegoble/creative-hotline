import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/workshop/schedule-followups
 * Triggers n8n workflow to schedule follow-up emails after workshop completion
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, clientName, sessionId, dates } = body;

    if (!clientId || !clientName || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, clientName, sessionId" },
        { status: 400 }
      );
    }

    const n8nWebhookUrl = process.env.N8N_WORKSHOP_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      console.error("N8N_WORKSHOP_WEBHOOK_URL not configured");
      return NextResponse.json(
        { error: "Follow-up scheduling not configured" },
        { status: 500 }
      );
    }

    // Trigger n8n workflow
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        clientName,
        sessionId,
        followUpDates: {
          oneDay: dates?.oneDay || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          sevenDays: dates?.sevenDays || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          thirtyDays: dates?.thirtyDays || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n workflow failed: ${response.statusText}`);
    }

    return NextResponse.json({
      success: true,
      message: "Follow-up scheduling triggered",
      followUpDates: {
        oneDay: dates?.oneDay,
        sevenDays: dates?.sevenDays,
        thirtyDays: dates?.thirtyDays,
      },
    });
  } catch (error) {
    console.error("Error scheduling follow-ups:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to schedule follow-ups",
      },
      { status: 500 }
    );
  }
}
