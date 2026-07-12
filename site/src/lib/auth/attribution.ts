/**
 * Attribution stamping — every internal save records WHO made it.
 *
 * Server-side, sourced from the verified session cookie (never from client
 * payload), so the stamp can't be spoofed or forgotten by the UI. Replaces
 * the old manual Jake/Megha toggle as the source of truth.
 *
 * Fail-soft: if the blob doesn't parse or no user is present (shouldn't
 * happen behind middleware), the original string is returned untouched.
 */

import { getUserFromRequest, type TchUser } from "@/lib/auth/session";

export interface AttributionStamp {
  /** "jake" | "megha" */
  user: string;
  email: string;
  at: string; // ISO timestamp
}

export function makeStamp(user: TchUser): AttributionStamp {
  return { user: user.id, email: user.email, at: new Date().toISOString() };
}

/**
 * Inject `updatedBy` (and append to a capped `editLog`) into a serialized
 * JSON blob. Returns the re-serialized blob, or the input unchanged on error.
 */
export async function stampBlob(
  rawJson: string,
  request: Request,
): Promise<string> {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return rawJson;
    const blob = JSON.parse(rawJson) as Record<string, unknown>;
    const stamp = makeStamp(user);
    blob.updatedBy = stamp;
    const log = Array.isArray(blob.editLog)
      ? (blob.editLog as AttributionStamp[])
      : [];
    // Only append when the editor changed or >10 min since last entry —
    // autosave fires per keystroke, so raw appends would balloon the blob.
    const last = log[log.length - 1];
    const staleMs = 10 * 60 * 1000;
    if (
      !last ||
      last.user !== stamp.user ||
      Date.now() - Date.parse(last.at) > staleMs
    ) {
      log.push(stamp);
    } else {
      log[log.length - 1] = stamp; // refresh timestamp on same-user streak
    }
    blob.editLog = log.slice(-40); // hard cap
    return JSON.stringify(blob);
  } catch {
    return rawJson;
  }
}
