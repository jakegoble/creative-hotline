/**
 * Non-destructive versioning for generated artifacts (research brief, action
 * plan). Megha's requirement (2026-06-08): "regen = v2, keep v1, show which is
 * live." Every regenerate archives the prior output instead of overwriting it.
 *
 * Storage model: a single rich_text field per artifact holds a VersionBlob:
 *   {
 *     current: 2,                       // version number that is LIVE
 *     versions: [
 *       { n: 1, at: ISO, json: "..." }, // older
 *       { n: 2, at: ISO, json: "..." }, // newest / live
 *     ]
 *   }
 * The existing "<Artifact> JSON" field always mirrors versions[current].json so
 * every current reader keeps working with zero changes. To "restore" an older
 * version you copy its json back into the live field and point current at it.
 */

export interface ArtifactVersion {
  n: number;
  at: string; // ISO timestamp
  json: string; // serialized artifact
  /** Optional short note on what triggered this version (e.g. "added Brand guide"). */
  note?: string;
}

export interface VersionBlob {
  current: number;
  versions: ArtifactVersion[];
}

/** Keep the field from growing unbounded — retain the most recent N versions. */
const MAX_VERSIONS = 12;

export function parseVersions(raw: string | null | undefined): VersionBlob {
  if (raw && raw.trim()) {
    try {
      const b = JSON.parse(raw);
      if (b && Array.isArray(b.versions)) {
        return { current: Number(b.current) || 0, versions: b.versions };
      }
    } catch {
      /* fall through to empty */
    }
  }
  return { current: 0, versions: [] };
}

function nextN(blob: VersionBlob): number {
  return blob.versions.reduce((mx, v) => Math.max(mx, Number(v.n) || 0), 0) + 1;
}

/**
 * Archive the current live json (if it isn't already the latest stored version)
 * and append a brand-new version. Returns the updated blob + the new version
 * number. Trims to the most recent MAX_VERSIONS.
 */
export function addVersion(
  blob: VersionBlob,
  currentLiveJson: string,
  newJson: string,
  note?: string,
): { blob: VersionBlob; n: number } {
  const versions = [...blob.versions];

  // Seed v1 from the existing live artifact if we've never versioned before, so
  // the first regen genuinely keeps the pre-existing output as v1.
  if (versions.length === 0 && currentLiveJson && currentLiveJson.trim()) {
    versions.push({ n: 1, at: new Date().toISOString(), json: currentLiveJson });
  }

  const n = versions.reduce((mx, v) => Math.max(mx, Number(v.n) || 0), 0) + 1;
  versions.push({ n, at: new Date().toISOString(), json: newJson, note });

  const trimmed = versions.slice(-MAX_VERSIONS);
  return { blob: { current: n, versions: trimmed }, n };
}

/** Point `current` at an existing version. Returns the blob + that version's json. */
export function setLive(
  blob: VersionBlob,
  n: number,
): { blob: VersionBlob; json: string | null } {
  const target = blob.versions.find((v) => Number(v.n) === Number(n));
  if (!target) return { blob, json: null };
  return { blob: { ...blob, current: Number(n) }, json: target.json };
}

/** A compact list for UI switchers — newest first, no heavy json payloads. */
export function versionSummaries(
  blob: VersionBlob,
): { n: number; at: string; note?: string; live: boolean }[] {
  return [...blob.versions]
    .sort((a, b) => Number(b.n) - Number(a.n))
    .map((v) => ({ n: v.n, at: v.at, note: v.note, live: Number(v.n) === Number(blob.current) }));
}

export { nextN, MAX_VERSIONS };
