import { config } from "@/lib/config";

const GRAPHQL_URL = "https://api.fireflies.ai/graphql";

export async function ping(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.fireflies.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "{ user { email } }",
      }),
    });
    const latency = Date.now() - start;
    const data = await res.json();
    return { ok: !data.errors, latency };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}

/**
 * Pull a Fireflies meeting ID out of any of the URL formats Fireflies hands
 * out: shareable view links, dashboard links, transcript links, or a raw ID.
 *
 * Examples:
 *   https://app.fireflies.ai/view/Meeting-Title::ABCDEFGH12345        → "ABCDEFGH12345"
 *   https://app.fireflies.ai/transcript/ABCDEFGH12345?foo=bar          → "ABCDEFGH12345"
 *   https://fireflies.ai/recording/ABCDEFGH12345                       → "ABCDEFGH12345"
 *   ABCDEFGH12345                                                       → "ABCDEFGH12345"
 *
 * Returns null if no plausible ID is found.
 */
export function extractFirefliesId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Raw IDs: alphanumeric, 10+ chars, no slashes/spaces.
  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) return trimmed;

  // URL form: prefer the ID after a `::` separator (Fireflies "view" links).
  const colonColon = trimmed.split("::").pop();
  if (colonColon && /^[A-Za-z0-9_-]{10,}/.test(colonColon)) {
    const m = colonColon.match(/^[A-Za-z0-9_-]+/);
    if (m) return m[0];
  }

  // Otherwise, take the last path segment, strip query/hash.
  try {
    const u = new URL(trimmed);
    const last = u.pathname.split("/").filter(Boolean).pop() || "";
    const id = last.split("::").pop() || last;
    if (/^[A-Za-z0-9_-]{10,}/.test(id)) {
      const m = id.match(/^[A-Za-z0-9_-]+/);
      if (m) return m[0];
    }
  } catch {
    // Not a URL — fall through.
  }

  return null;
}

interface TranscriptSentence {
  speaker_name?: string;
  text?: string;
  start_time?: number;
}

interface TranscriptResponse {
  data?: {
    transcript?: {
      id: string;
      title?: string;
      duration?: number;
      sentences?: TranscriptSentence[];
      transcript_url?: string;
    } | null;
  };
  errors?: { message: string }[];
}

/**
 * Fetch a Fireflies meeting transcript by ID or URL.
 * Returns a plain-text transcript with one line per sentence prefixed by
 * the speaker name, ready to drop into a Claude prompt. Returns null if
 * the ID can't be resolved or the API returns no transcript.
 *
 * Used by: action plan generator (Batch 6) to ground Claude in what was
 * actually said on the call.
 */
export async function fetchTranscriptText(
  input: string,
): Promise<{
  ok: true;
  id: string;
  title: string;
  duration: number;
  text: string;
} | {
  ok: false;
  reason: string;
}> {
  if (!config.fireflies.apiKey) {
    return { ok: false, reason: "FIREFLIES_API_KEY not configured" };
  }
  const id = extractFirefliesId(input);
  if (!id) {
    return { ok: false, reason: "could not parse a Fireflies meeting ID from the URL" };
  }

  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.fireflies.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query Transcript($id: String!) {
            transcript(id: $id) {
              id
              title
              duration
              transcript_url
              sentences {
                speaker_name
                text
                start_time
              }
            }
          }
        `,
        variables: { id },
      }),
    });
    if (!res.ok) {
      return { ok: false, reason: `Fireflies API HTTP ${res.status}` };
    }
    const data = (await res.json()) as TranscriptResponse;
    if (data.errors && data.errors.length > 0) {
      return { ok: false, reason: data.errors.map((e) => e.message).join("; ") };
    }
    const t = data.data?.transcript;
    if (!t) {
      return { ok: false, reason: "Fireflies returned no transcript for that ID" };
    }
    const sentences = t.sentences || [];
    if (sentences.length === 0) {
      return { ok: false, reason: "transcript exists but has no sentences yet (still processing?)" };
    }
    const text = sentences
      .map((s) => {
        const who = s.speaker_name?.trim() || "Speaker";
        const what = s.text?.trim() || "";
        return what ? `${who}: ${what}` : "";
      })
      .filter(Boolean)
      .join("\n");
    return {
      ok: true,
      id: t.id,
      title: t.title || "",
      duration: t.duration || 0,
      text,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "fireflies_fetch_failed";
    return { ok: false, reason: message };
  }
}
