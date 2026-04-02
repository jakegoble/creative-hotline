/**
 * Workshop Service
 * Manages workshop sessions, outcomes, and follow-ups
 * Integrates with Notion CRM for data persistence
 */

export interface WorkshopSession {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  product: string;
  startedAt: string;
  completedAt?: string;
  status: "not_started" | "in_progress" | "completed";
  phase: number;
  duration?: number; // in minutes
  transcriptionId?: string; // Fireflies ID
  outcomes?: WorkshopOutcome[];
}

export interface WorkshopOutcome {
  id: string;
  category: "insight" | "decision" | "action_item" | "opportunity";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  capturedAt: string;
}

export interface WorkshopFollowUp {
  id: string;
  sessionId: string;
  clientId: string;
  type: "1_day" | "7_day" | "30_day";
  scheduledFor: string;
  emailSent: boolean;
  sentAt?: string;
  response?: string;
}

/**
 * Get clients ready for workshop (intake complete, status = Ready for Call)
 */
export async function getWorkshopReadyClients() {
  try {
    const response = await fetch("/api/notion/clients?filter=workshop-ready", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch clients: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching workshop-ready clients:", error);
    throw error;
  }
}

/**
 * Get client details for workshop
 */
export async function getClientForWorkshop(clientId: string) {
  try {
    const response = await fetch(`/api/notion/clients/${clientId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch client: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching client details:", error);
    throw error;
  }
}

/**
 * Get client's intake form responses
 */
export async function getClientIntakeData(clientId: string) {
  try {
    const response = await fetch(`/api/notion/intake?clientId=${clientId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch intake data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching intake data:", error);
    throw error;
  }
}

/**
 * Create a new workshop session
 */
export async function createWorkshopSession(session: Omit<WorkshopSession, "id">): Promise<WorkshopSession> {
  const sessionWithId: WorkshopSession = {
    ...session,
    id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  // TODO: Persist to Notion or database
  // For now, just return the session object
  return sessionWithId;
}

/**
 * Update workshop session status
 */
export async function updateWorkshopSession(sessionId: string, updates: Partial<WorkshopSession>) {
  try {
    const response = await fetch("/api/workshop/update-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, updates }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update session: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating workshop session:", error);
    throw error;
  }
}

/**
 * Add outcome to workshop session
 */
export async function addOutcome(
  sessionId: string,
  outcome: Omit<WorkshopOutcome, "id" | "capturedAt">
): Promise<WorkshopOutcome> {
  const outcomeWithMeta: WorkshopOutcome = {
    ...outcome,
    id: `outcome_${Date.now()}`,
    capturedAt: new Date().toISOString(),
  };

  // TODO: Persist to database
  // For now, return the outcome
  return outcomeWithMeta;
}

/**
 * Get workshop session details
 */
export async function getWorkshopSession(sessionId: string) {
  try {
    const response = await fetch(`/api/workshop/session?id=${sessionId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching workshop session:", error);
    throw error;
  }
}

/**
 * Save workshop session completion and trigger follow-ups
 */
export async function completeWorkshopSession(
  sessionId: string,
  clientId: string,
  clientName: string,
  outcomes: WorkshopOutcome[]
) {
  try {
    const response = await fetch("/api/workshop/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        clientId,
        clientName,
        outcomes,
        completedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to complete session: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error completing workshop session:", error);
    throw error;
  }
}

/**
 * Schedule workshop follow-ups
 */
export async function scheduleFollowUps(
  clientId: string,
  clientName: string,
  sessionId: string,
  followUpDates?: {
    oneDay?: string;
    sevenDays?: string;
    thirtyDays?: string;
  }
) {
  try {
    const dates = followUpDates || {
      oneDay: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      sevenDays: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      thirtyDays: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = await fetch("/api/workshop/schedule-followups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        clientName,
        sessionId,
        dates,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to schedule follow-ups: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error scheduling follow-ups:", error);
    throw error;
  }
}

/**
 * Get follow-up status for a client
 */
export async function getClientFollowUps(clientId: string): Promise<WorkshopFollowUp[]> {
  try {
    const response = await fetch(`/api/workshop/followups?clientId=${clientId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch follow-ups: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching follow-ups:", error);
    return [];
  }
}

/**
 * Store Fireflies transcription data
 */
export async function storeTranscription(
  sessionId: string,
  clientId: string,
  transcriptionId: string,
  callUrl: string,
  duration: number
) {
  try {
    const response = await fetch("/api/workshop/fireflies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        clientId,
        transcriptionId,
        callUrl,
        duration,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to store transcription: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error storing transcription:", error);
    throw error;
  }
}

/**
 * Generate action plan from workshop outcomes using Claude
 */
export async function generateActionPlan(
  sessionId: string,
  clientName: string,
  outcomes: WorkshopOutcome[]
) {
  try {
    const response = await fetch("/api/workshop/generate-action-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        clientName,
        outcomes,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate action plan: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating action plan:", error);
    throw error;
  }
}
