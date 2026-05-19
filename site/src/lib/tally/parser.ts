/**
 * Tally payload parsing + HMAC signature verification.
 *
 * Two responsibilities:
 *   1. verifyTallySignature(rawBody, header, secret) — constant-time check
 *      of the HMAC-SHA256 signature Tally attaches as `tally-signature`.
 *   2. parseTallyIntake(payload) — label-based extraction of all known
 *      Creative Hotline Intake form fields (form `b5W1JE`).
 *
 * **Architecture note (2026-05-18):** the parser matches fields by
 * Tally's `label` property (case-insensitive, trimmed). This replaces
 * the original positional index map (fields[0]..fields[20]), which broke
 * every time Megha added or reordered a field. The label match makes the
 * parser survive future form changes — adding "LinkedIn" as field 5.5
 * doesn't shift Email from position 4 to 5 anymore, because we look up
 * each known field by name.
 *
 * Backward compatibility: each FieldDef can carry alias labels. If Tally
 * ever renames a field, we add the new label to the same FieldDef without
 * touching anything else.
 *
 * Unknown fields (anything not in FIELD_MAP) are ignored silently — the
 * route still returns 200 and the row still creates. We log unknown
 * labels for ops visibility.
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
 * Returns:
 *   - true if the signature matches
 *   - false on any mismatch, malformed signature, or missing secret
 *
 * Uses timingSafeEqual to avoid timing-channel attacks on the comparison.
 */
export function verifyTallySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------- Value extractors ----------

type ExtractFn = (field: TallyField) => unknown;

function safeString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Plain text fields (INPUT_TEXT, TEXTAREA, INPUT_EMAIL, INPUT_PHONE_NUMBER, INPUT_LINK). */
const extractString: ExtractFn = (field) => safeString(field.value);

/** Tally checkbox / boolean. */
const extractBool: ExtractFn = (field) => Boolean(field.value);

/**
 * Resolve a DROPDOWN / MULTIPLE_CHOICE field's selected UUIDs into the
 * human-readable option texts. Tally sends `value: ["<uuid>", ...]` and
 * `options: [{id, text}, ...]`; we look up each selected UUID.
 */
function resolveSelectedTexts(field: TallyField): string[] {
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

/** First-selected text from a single-select dropdown. */
const extractSelectFirst: ExtractFn = (field) =>
  resolveSelectedTexts(field)[0] ?? "";

/** All selected texts from a multi-select / checkboxes. */
const extractSelectMany: ExtractFn = (field) => resolveSelectedTexts(field);

/** File upload list — parse the file objects out of `value`. */
const extractFiles: ExtractFn = (field) => {
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
};

// ---------- Field map (label → ParsedIntake key) ----------

interface FieldDef {
  /**
   * Canonical label(s) to match against `field.label`. Case-insensitive
   * trim-equality, in order. First match wins. Add aliases when Tally
   * labels get reworded so old + new submissions both parse.
   */
  labels: string[];
  /** Target key on the ParsedIntake output. */
  key: keyof ParsedIntake;
  /** How to read the value from the matched TallyField. */
  extract: ExtractFn;
}

/**
 * Canonical Creative Hotline Intake field map. Keep in sync with the
 * Tally form `b5W1JE`. When Megha adds a field, append a FieldDef here
 * and ParsedIntake (in types.ts) — no positional index updates needed.
 */
const FIELD_MAP: FieldDef[] = [
  // The original 21 fields, in form order
  { labels: ["Full Name", "Name"], key: "fullName", extract: extractString },
  { labels: ["Role"], key: "role", extract: extractString },
  { labels: ["Brand / Company", "Brand/Company", "Brand", "Company"], key: "brand", extract: extractString },
  { labels: ["Phone Number", "Phone"], key: "phone", extract: extractString },
  { labels: ["E-mail Address", "Email Address", "E-mail", "Email"], key: "email", extract: extractString },
  { labels: ["Instagram", "Instagram URL"], key: "instagram", extract: extractString },
  { labels: ["Website", "Primary Website"], key: "website", extract: extractString },
  { labels: ["What's the creative emergency?", "Creative emergency"], key: "creativeEmergency", extract: extractString },
  { labels: ["What do you actually want out of this call?", "What do you want out of this call?", "Goal"], key: "desiredOutcomes", extract: extractSelectMany },
  { labels: ["What have you already tried?", "What have you tried?"], key: "whatTried", extract: extractString },
  { labels: ["Any deadlines or fires we should know about?", "Deadlines", "Deadline"], key: "deadline", extract: extractString },
  { labels: ["Anything we should avoid?", "Avoid", "Constraints"], key: "constraintsAvoid", extract: extractString },
  { labels: ["What's your price range of offering?", "Price range", "Price Range"], key: "priceRange", extract: extractSelectFirst },
  { labels: ["What's your approximate monthly revenue?", "Monthly revenue", "Monthly Revenue"], key: "monthlyRevenue", extract: extractSelectFirst },
  { labels: ["Who's on your team?", "Team", "Team Size"], key: "teamSize", extract: extractSelectFirst },
  { labels: ["How many hours/week do you spend on your business?", "Hours per week", "Hours/week"], key: "hoursPerWeek", extract: extractSelectFirst },
  { labels: ["Monthly budget for tools and outside help?", "Monthly budget", "Monthly Budget"], key: "monthlyBudget", extract: extractSelectFirst },
  { labels: ["If you could wave a magic wand and fix ONE thing about your business right now, what would it be?", "Magic wand", "Magic Wand"], key: "magicWand", extract: extractString },
  { labels: ["Where do you spend most of your creative energy right now?", "Primary platform", "Primary Platform"], key: "primaryPlatform", extract: extractSelectFirst },
  { labels: ["Who or what inspires you / your brand right now?", "Inspiration"], key: "inspiration", extract: extractString },
  // File upload label varies between "Drop anything we should see" and
  // Tally's auto-label "Untitled file upload field" — match on either.
  { labels: ["Drop anything we should see.", "Drop anything we should see", "Brand Files", "Files", "Untitled file upload field"], key: "brandFiles", extract: extractFiles },

  // ---------- New fields (added 2026-05-18 per Megha's edits) ----------
  { labels: ["LinkedIn", "LinkedIn URL"], key: "linkedin", extract: extractString },
  { labels: ["X / Twitter", "X/Twitter", "Twitter", "X"], key: "twitter", extract: extractString },
  { labels: ["TikTok"], key: "tiktok", extract: extractString },
  { labels: ["YouTube"], key: "youtube", extract: extractString },
  { labels: ["Website 2", "Additional website", "Other website", "Secondary website", "Portfolio Website", "Portfolio website"], key: "website2", extract: extractString },
  { labels: ["I agree to the Terms & Conditions", "Terms & Conditions", "Terms and Conditions", "T&C", "Agree to terms"], key: "tcsAgreed", extract: extractBool },
  { labels: ["AI Overview", "Project overview (AI-generated)", "AI-generated overview", "AI overview from your LLM"], key: "aiOverview", extract: extractString },

  // ---------- Megha V2 spec additions (TCH-V2-TALLY-FORM-SPEC.md) ----------
  { labels: ["What does 90-day success look like?", "90-day success", "Success definition"], key: "successDefinition", extract: extractString },
  { labels: ["How do you make money? (Select all that apply.)", "How do you make money?", "Revenue model"], key: "revenueModel", extract: extractSelectMany },
  { labels: ["Who are you trying to reach?", "Target audience"], key: "targetAudience", extract: extractString },
  { labels: ["Where do you live online? (Select all that apply.)", "Where do you live online?", "Platforms", "Current platforms"], key: "platforms", extract: extractSelectMany },
  { labels: ["Drop your links.", "Drop your links", "Brand links"], key: "brandLinks", extract: extractString },
];

/**
 * Build a lookup map from normalized label → FieldDef.
 *
 * Normalization handles real-world label drift we've observed in Tally:
 *   - "(optional ...)" parenthetical suffix Megha adds to non-required fields
 *     ("LinkedIn (optional — leave blank if you don't have one)" → "LinkedIn")
 *   - Helper / description text after an em-dash or en-dash
 *     ('AI Overview (optional) — drop in a quick brief...' → 'AI Overview')
 *   - Smart vs straight quotes ("Who's" with ' vs ')
 *   - Multi-whitespace collapse + trim + lowercase
 *
 * The Cutover Test on 2026-05-18 worked because Megha hadn't added the
 * "(optional)" suffix yet. After her 2026-05-19 form edits, raw label
 * compare against FIELD_MAP started failing silently. Stripping these
 * variations is the surgical fix.
 */
function normalizeLabel(s: string): string {
  return s
    // Strip "(optional ...)" parenthetical anywhere in the label.
    // Matches "(optional)", "(optional — leave blank if you don't have one)", etc.
    .replace(/\s*\(optional\b[^)]*\)\s*/gi, " ")
    // Strip helper text after a hyphen/en-dash/em-dash that's preceded by whitespace.
    // The dash must have whitespace before it so we don't strip hyphenated words
    // like "90-day". Matches " — drop in a quick brief", " - leave blank", etc.
    .replace(/\s+[—–-]\s.*$/, "")
    // Normalize smart quotes → straight quotes. Tally's editor sometimes
    // auto-replaces ' with ' (U+2019). String compare considers them different.
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // Collapse whitespace runs into a single space.
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const LABEL_INDEX: Map<string, FieldDef> = (() => {
  const m = new Map<string, FieldDef>();
  for (const def of FIELD_MAP) {
    for (const label of def.labels) {
      m.set(normalizeLabel(label), def);
    }
  }
  return m;
})();

/**
 * Canonical position → ParsedIntake key map.
 *
 * Used as a POSITIONAL FALLBACK when label-based matching fails. Tally
 * occasionally rebuilds a field (e.g. converting a TextBlock heading
 * into a Question Block) and the resulting webhook label drifts away
 * from what FIELD_MAP knows. Position in the field array is more stable
 * than the label string in those cases.
 *
 * Index = position among INPUT fields only (section banners filtered out).
 * Keep this in sync with the Tally form `b5W1JE` layout.
 */
const CANONICAL_FIELD_ORDER: (keyof ParsedIntake | null)[] = [
  "fullName",          // 0  — Full Name
  "role",              // 1  — Role
  "brand",             // 2  — Brand / Company
  "phone",             // 3  — Phone Number
  "email",             // 4  — E-mail Address
  "instagram",         // 5  — Instagram
  "website",           // 6  — Website
  "linkedin",          // 7  — LinkedIn
  "twitter",           // 8  — X / Twitter
  "tiktok",            // 9  — TikTok
  "youtube",           // 10 — YouTube
  "aiOverview",        // 11 — AI Overview
  "creativeEmergency", // 12 — What's the creative emergency?
  "desiredOutcomes",   // 13 — What do you actually want out of this call?
  "whatTried",         // 14 — What have you already tried?
  "deadline",          // 15 — Any deadlines or fires we should know about?
  "constraintsAvoid",  // 16 — Anything we should avoid?
  "priceRange",        // 17 — What's your price range of offering?
  "monthlyRevenue",    // 18 — What's your approximate monthly revenue?
  "teamSize",          // 19 — Who's on your team?
  "hoursPerWeek",      // 20 — How many hours/week do you spend on your business?
  "monthlyBudget",     // 21 — Monthly budget for tools and outside help?
  "magicWand",         // 22 — If you could wave a magic wand...
  "primaryPlatform",   // 23 — Where do you spend most of your creative energy right now?
  "inspiration",       // 24 — Who or what inspires you / your brand right now?
  "brandFiles",        // 25 — Drop anything we should see / Brand files
];

/** Reverse map: ParsedIntake key → ExtractFn (derived from FIELD_MAP). */
const KEY_TO_EXTRACT: Map<string, ExtractFn> = (() => {
  const m = new Map<string, ExtractFn>();
  for (const def of FIELD_MAP) {
    m.set(def.key as string, def.extract);
  }
  return m;
})();

/**
 * Is this Tally field an INPUT field (vs. a section banner / LABEL block)?
 * Section banners arrive in the payload with type="LABEL" and no value;
 * we skip them when counting positions.
 */
function isInputField(f: TallyField | undefined | null): boolean {
  if (!f) return false;
  if (f.type === "LABEL") return false;
  return true;
}

// ---------- Main parser ----------

/**
 * Sensible empty defaults so ParsedIntake is always fully populated
 * (TypeScript-wise) even if a submission is missing fields. Optional
 * fields stay `undefined` rather than getting empty defaults — that way
 * downstream code can distinguish "field not on form" from "field empty".
 */
function emptyIntake(): ParsedIntake {
  return {
    fullName: "",
    role: "",
    brand: "",
    phone: "",
    email: "",
    instagram: "",
    website: "",
    creativeEmergency: "",
    desiredOutcomes: [],
    whatTried: "",
    deadline: "",
    constraintsAvoid: "",
    priceRange: "",
    monthlyRevenue: "",
    teamSize: "",
    hoursPerWeek: "",
    monthlyBudget: "",
    magicWand: "",
    primaryPlatform: "",
    inspiration: "",
    brandFiles: [],
  };
}

/**
 * Extract a typed ParsedIntake from a Tally webhook payload.
 *
 * Iterates the form's `fields` array, matches each by label against
 * FIELD_MAP, and writes the extracted value to the corresponding key
 * on the output object. Fields not in FIELD_MAP are logged + ignored.
 *
 * Order-independent: works whether the form is laid out 0,1,2,…,20 or
 * 0,1,2,99,3,… so long as the labels are stable.
 */
export function parseTallyIntake(payload: TallyWebhookPayload): ParsedIntake {
  const out = emptyIntake();
  const fields = payload?.data?.fields ?? [];
  const unknownLabels: string[] = [];
  const matchedKeys = new Set<string>();

  // ----- Pass 1: label-based matching (preferred) -----
  for (const field of fields) {
    if (!field || typeof field.label !== "string") continue;
    const def = LABEL_INDEX.get(normalizeLabel(field.label));
    if (!def) {
      unknownLabels.push(field.label);
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out as any)[def.key] = def.extract(field);
    matchedKeys.add(def.key as string);
  }

  // ----- Pass 2: positional fallback for unmatched keys -----
  // Catches fields whose webhook label drifted away from FIELD_MAP (e.g.
  // after a Tally form rebuild) but whose POSITION in the form is intact.
  // Only fills a key if label-pass didn't already match it — so label match
  // wins when both succeed and we never overwrite a valid label-derived value.
  const inputFields = fields.filter(isInputField);
  inputFields.forEach((field, idx) => {
    if (idx >= CANONICAL_FIELD_ORDER.length) return;
    const key = CANONICAL_FIELD_ORDER[idx];
    if (!key) return;
    if (matchedKeys.has(key as string)) return;
    const extract = KEY_TO_EXTRACT.get(key as string);
    if (!extract) return;
    const value = extract(field);
    // Only write a non-empty value — empty string / empty array means
    // the field was on the form but the respondent left it blank, and
    // we'd rather leave the parsed key empty than commit to nothing.
    if (
      (typeof value === "string" && value !== "") ||
      (Array.isArray(value) && value.length > 0) ||
      (typeof value === "boolean") ||
      (typeof value === "number")
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[key] = value;
      matchedKeys.add(key as string);
      console.log(
        `[tally/parser] positional fallback → ${key} (idx=${idx}, label="${(field.label || "").slice(0, 60)}")`,
      );
    }
  });

  // ---------------------------------------------------------------------
  // Fallback: route "Untitled link field" type INPUT_LINK by URL hostname.
  //
  // Tally has a quirk where Link fields added in certain layouts don't
  // inherit a typed-question as their `label` in the webhook payload —
  // they stay as the default "Untitled link field" even when the visible
  // form heading reads "LinkedIn" / "X / Twitter" / "TikTok" / "YouTube".
  // Multiple unlabeled Link fields then arrive in the payload all with
  // the same label, indistinguishable by the FIELD_MAP lookup above.
  //
  // We pattern-match the URL hostname to route to the right ParsedIntake
  // key. Only fires for fields the main loop didn't already populate, and
  // only writes to keys that aren't already set — defensive both ways.
  //
  // Discovered 2026-05-19 during the Quiet Town retest: 4 social URLs
  // were captured by Tally but landed empty in Notion because all 4 had
  // label "Untitled link field" in the payload.
  // ---------------------------------------------------------------------
  /** Pull the hostname out of a URL string. Tolerates missing scheme. */
  function urlHostname(raw: string): string {
    try {
      const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return new URL(withScheme).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return "";
    }
  }
  /** Best-effort string extraction — handles string, number, [string], object. */
  function extractRawValue(v: unknown): string {
    if (typeof v === "string") return v.trim();
    if (typeof v === "number") return String(v);
    if (Array.isArray(v) && v.length > 0) return extractRawValue(v[0]);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.url === "string") return o.url.trim();
      if (typeof o.value === "string") return o.value.trim();
    }
    return "";
  }
  // PERMISSIVE fallback: scan EVERY field's value for known social URL hosts.
  // We don't check field.type or field.label — Tally's webhook payload for
  // Link fields with the default "Untitled link field" question doesn't
  // promote the typed heading into the label, and we've seen the type
  // attribute also be unreliable depending on how the field was inserted.
  // The simplest, most robust fix is: if any field's value is a recognizable
  // social URL, route it to the corresponding ParsedIntake key.
  //
  // Safe because: keys are only set if currently empty (defensive), and
  // hostnames are checked against an explicit allowlist (linkedin/x/twitter/
  // tiktok/youtube/youtu.be). Random URLs go nowhere.
  const debugFieldTypes: Array<{label: string; type: string; hasValue: boolean}> = [];
  for (const field of fields) {
    if (!field) continue;
    debugFieldTypes.push({
      label: (field.label || "").slice(0, 60),
      type: field.type || "",
      hasValue: Boolean(field.value),
    });
    const rawValue = extractRawValue(field.value);
    if (!rawValue) continue;
    const host = urlHostname(rawValue);
    if (!host) continue;
    if (/(?:^|\.)linkedin\.com$/.test(host) && !out.linkedin) {
      out.linkedin = rawValue;
    } else if (
      /(?:^|\.)(?:x|twitter)\.com$/.test(host) &&
      !out.twitter
    ) {
      out.twitter = rawValue;
    } else if (/(?:^|\.)tiktok\.com$/.test(host) && !out.tiktok) {
      out.tiktok = rawValue;
    } else if (
      /(?:^|\.)(?:youtube\.com|youtu\.be)$/.test(host) &&
      !out.youtube
    ) {
      out.youtube = rawValue;
    }
  }
  // Diagnostic: log the field-shape inventory so we can see what Tally
  // actually sends for these Link fields. Helps debug future label/type
  // surprises.
  console.log(
    "[tally/parser] field shape inventory:",
    JSON.stringify(debugFieldTypes),
  );

  if (unknownLabels.length > 0) {
    console.log("[tally/parser] unknown labels (ignored):", unknownLabels);
  }

  return out;
}

/**
 * Short multi-line summary of an intake — used for the "AI Intake
 * Summary" property so the human-readable highlights are visible at a
 * glance in Notion without opening the page.
 *
 * Phone goes here since the Notion schema has no Phone property.
 * Additional socials beyond Instagram/Website also surface here so they
 * aren't dropped if a new platform field hasn't been added to Notion
 * yet.
 */
export function buildIntakeSummary(intake: ParsedIntake): string {
  const lines: string[] = [];
  if (intake.phone) lines.push(`Phone: ${intake.phone}`);
  if (intake.instagram) lines.push(`Instagram: ${intake.instagram}`);
  if (intake.website && intake.website !== intake.instagram) {
    lines.push(`Website: ${intake.website}`);
  }
  if (intake.linkedin) lines.push(`LinkedIn: ${intake.linkedin}`);
  if (intake.twitter) lines.push(`X / Twitter: ${intake.twitter}`);
  if (intake.tiktok) lines.push(`TikTok: ${intake.tiktok}`);
  if (intake.youtube) lines.push(`YouTube: ${intake.youtube}`);
  if (intake.website2) lines.push(`Additional website: ${intake.website2}`);
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
 * Prefers explicit Website over Instagram. The other socials surface
 * via buildIntakeSummary + dedicated Notion properties once added.
 */
export function preferredWebsiteUrl(intake: ParsedIntake): string {
  return intake.website || intake.instagram || "";
}
