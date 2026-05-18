/**
 * Tally payload parsing + HMAC signature verification.
 *
 * Two responsibilities:
 *   1. verifyTallySignature(rawBody, header, secret) — constant-time check
 *      of the HMAC-SHA256 signature Tally attaches as `tally-signature`.
 *   2. parseTallyIntake(payload) — strict-by-index extraction of the 21
 *      Creative Hotline Intake form fields (form `b5W1JE`).
 *
 * Field indices are baked into the form. If Megha reorders or adds fields
 * in Tally, this parser must be updated in lockstep — see ParsedIntake in
 * types.ts for the canonical index map.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type {
  ParsedIntake,
  TallyField,
  TallyFileUpload,
  TallyWebhookPayload,
} from "./types";

// ---------- HMAC verification ----------

/**
 * Verify a Tally webhook signature.
 *
 * Tally signs the raw request body with HMAC-SHA256 using the signing
 * secret you set when configuring the webhook in Tally's Integrations
 * panel. The signature is sent in the `tally-signature` header as a
 * base64-encoded digest.
 *
 * Tally docs: https://tally.so/help/webhooks
 *
 * Returns:
 *   - true if the signature matches (or if no secret is configured —
 *     we don't fail-closed in dev, but we log a warning at the call site)
 *   - false on any mismatch or malformed signature
 *
 * Use timingSafeEqual to avoid timing-channel attacks on the comparison.
 */
export function verifyTallySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  if (!secret) {
    // No secret configured. Caller decides whether to fail open or closed.
    return false;
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  // Buffers must be same length for timingSafeEqual; if Tally ever changes
  // encoding we'll trip this and fall through to false.
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------- Helpers ----------

function safeString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/**
 * Resolve a DROPDOWN / MULTIPLE_CHOICE field's selected UUIDs into the
 * human-readable option text(s). Returns first match for single-value
 * dropdowns, or the full list for multi-select.
 *
 * Tally sends `value: ["<uuid>", ...]` and `options: [{id, text}, ...]`.
 * We look up each selected UUID in the options table.
 */
function resolveSelectedTexts(field: TallyField | undefined): string[] {
  if (!field) return [];
  const selectedIds = asArray(field.value).filter(
    (x): x is string => typeof x === "string",
  );
  if (selectedIds.length === 0) return [];
  const options = field.options ?? [];
  const out: string[] = [];
  for (const id of selectedIds) {
    const match = options.find((o) => o.id === id);
    if (match?.text) out.push(match.text.trim());
  }
  return out;
}

function firstSelectedText(field: TallyField | undefined): string {
  const texts = resolveSelectedTexts(field);
  return texts[0] ?? "";
}

function parseFiles(field: TallyField | undefined): TallyFileUpload[] {
  if (!field) return [];
  const raw = asArray(field.value);
  const out: TallyFileUpload[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = safeString(o.name);
    const url = safeString(o.url);
    if (!name || !url) continue;
    out.push({
      id: safeString(o.id),
      name,
      url,
      mimeType: safeString(o.mimeType) || undefined,
      size: typeof o.size === "number" ? o.size : undefined,
    });
  }
  return out;
}

// ---------- Main parser ----------

/**
 * Extract a typed ParsedIntake from a Tally webhook payload.
 *
 * Index-based — relies on form field order in Tally form `b5W1JE`.
 * Fields outside the expected count (>21) are ignored; missing fields
 * resolve to empty strings / empty arrays without throwing, so this
 * function never crashes on malformed input.
 */
export function parseTallyIntake(payload: TallyWebhookPayload): ParsedIntake {
  const fields = payload?.data?.fields ?? [];
  // Build positional accessor — safe on undefined.
  const at = (i: number): TallyField | undefined => fields[i];

  return {
    fullName: safeString(at(0)?.value),
    role: safeString(at(1)?.value),
    brand: safeString(at(2)?.value),
    phone: safeString(at(3)?.value),
    email: safeString(at(4)?.value),
    instagram: safeString(at(5)?.value),
    website: safeString(at(6)?.value),
    creativeEmergency: safeString(at(7)?.value),
    desiredOutcomes: resolveSelectedTexts(at(8)),
    whatTried: safeString(at(9)?.value),
    deadline: safeString(at(10)?.value),
    constraintsAvoid: safeString(at(11)?.value),
    priceRange: firstSelectedText(at(12)),
    monthlyRevenue: firstSelectedText(at(13)),
    teamSize: firstSelectedText(at(14)),
    hoursPerWeek: firstSelectedText(at(15)),
    monthlyBudget: firstSelectedText(at(16)),
    magicWand: safeString(at(17)?.value),
    primaryPlatform: firstSelectedText(at(18)),
    inspiration: safeString(at(19)?.value),
    brandFiles: parseFiles(at(20)),
  };
}

/**
 * Build a short multi-line summary of an intake — used for the
 * "AI Intake Summary" property so the human-readable highlights are
 * visible at a glance in Notion without opening the page.
 *
 * Phone goes here since the Notion schema has no Phone property.
 */
export function buildIntakeSummary(intake: ParsedIntake): string {
  const lines: string[] = [];
  if (intake.phone) lines.push(`Phone: ${intake.phone}`);
  if (intake.instagram) lines.push(`Instagram: ${intake.instagram}`);
  if (intake.website && intake.website !== intake.instagram) {
    lines.push(`Website: ${intake.website}`);
  }
  if (intake.desiredOutcomes.length > 0) {
    lines.push(`Goal: ${intake.desiredOutcomes.join(", ")}`);
  }
  if (intake.creativeEmergency) {
    lines.push(`Emergency: ${intake.creativeEmergency.slice(0, 240)}`);
  }
  return lines.join("\n");
}

/**
 * Pick the best URL for the single Notion "Website / IG" property.
 * Prefers explicit Website over Instagram (Instagram is also captured
 * in AI Intake Summary). Returns empty string if neither is present.
 */
export function preferredWebsiteUrl(intake: ParsedIntake): string {
  return intake.website || intake.instagram || "";
}
