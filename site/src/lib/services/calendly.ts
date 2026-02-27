/**
 * Calendly API service.
 * Simple fetch-based wrapper for the Calendly REST API v2.
 */

import { config } from "../config";

const BASE = "https://api.calendly.com";

async function calendlyFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  if (!config.calendly.apiKey) {
    throw new Error("CALENDLY_API_KEY is not configured");
  }

  const url = new URL(path, BASE);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${config.calendly.apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Calendly API ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

export interface CalendlyEvent {
  uri: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  event_type: string;
  invitees_counter: { total: number; active: number };
}

interface EventsResponse {
  collection: CalendlyEvent[];
  pagination: { count: number; next_page_token?: string };
}

/** Fetch scheduled events within a date range. */
export async function getScheduledEvents(
  minStartTime?: string,
  maxStartTime?: string,
): Promise<CalendlyEvent[]> {
  if (!config.calendly.userUri) {
    throw new Error("CALENDLY_USER_URI is not configured");
  }

  const params: Record<string, string> = {
    user: config.calendly.userUri,
    status: "active",
    count: "100",
  };
  if (minStartTime) params.min_start_time = minStartTime;
  if (maxStartTime) params.max_start_time = maxStartTime;

  const data = await calendlyFetch<EventsResponse>("/scheduled_events", params);
  return data.collection;
}

/** Fetch upcoming events (next 30 days). */
export async function getUpcomingEvents(): Promise<CalendlyEvent[]> {
  const now = new Date().toISOString();
  const thirtyDays = new Date(Date.now() + 30 * 86_400_000).toISOString();
  return getScheduledEvents(now, thirtyDays);
}

/** Health check — fetch current user profile. */
export async function ping(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    await calendlyFetch<unknown>("/users/me");
    return { ok: true, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}
