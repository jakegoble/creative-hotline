import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/workshop/fireflies
 * Webhook receiver for Fireflies transcription data after workshop calls
 * Stores transcription and triggers outcome analysis via Claude
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, clientId, transcriptionId, callUrl, duration, speakers } = body;

    if (!sessionId || !clientId || !transcriptionId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, clientId, transcriptionId" },
        { status: 400 }
      );
    }

    const firefliesApiKey = process.env.FIREFLIES_API_KEY;
    if (!firefliesApiKey) {
      console.error("FIREFLIES_API_KEY not configured");
      return NextResponse.json(
        { error: "Fireflies integration not configured" },
        { status: 500 }
      );
    }

    // Store transcription reference in database (future: save to Notion)
    const workshopRecord = {
      sessionId,
      clientId,
      transcriptionId,
      callUrl,
      duration,
      speakers,
      receivedAt: new Date().toISOString(),
    };

    // TODO: Save to Notion database or local storage
    // await saveWorkshopTranscription(workshopRecord);

    // TODO: Fetch full transcription from Fireflies and analyze with Claude
    // This would extract key insights, decisions, and action items

    return NextResponse.json({
      success: true,
      message: "Transcription captured",
      workshopRecord,
    });
  } catch (error) {
    console.error("Error processing Fireflies webhook:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process transcription",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workshop/fireflies
 * Retrieve transcription details for a specific workshop session
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId parameter" },
        { status: 400 }
      );
    }

    // TODO: Fetch transcription from Notion or database
    // const transcription = await getWorkshopTranscription(sessionId);

    return NextResponse.json({
      message: "Transcription retrieval not yet implemented",
      sessionId,
    });
  } catch (error) {
    console.error("Error retrieving transcription:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to retrieve transcription",
      },
      { status: 500 }
    );
  }
}
