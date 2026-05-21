/**
 * Tally webhook payload types.
 *
 * Tally posts to a configured webhook URL whenever a form is submitted.
 * The payload shape (as observed in production execution #793 of the
 * legacy n8n workflow on 2026-05-17) is:
 *
 *   {
 *     "eventId": "...",
 *     "eventType": "FORM_RESPONSE",
 *     "createdAt": "2026-05-17T18:43:57.123Z",
 *     "data": {
 *       "responseId": "...",
 *       "submissionId": "...",
 *       "respondentId": "...",
 *       "formId": "b5W1JE",
 *       "formName": "Creative Hotline Intake",
 *       "createdAt": "...",
 *       "fields": [
 *         { "key": "...", "label": "Full Name", "type": "INPUT_TEXT",
 *           "value": "Jane Doe" },
 *         { "key": "...", "label": "...", "type": "DROPDOWN",
 *           "value": ["<option-uuid>"],
 *           "options": [{ "id": "<option-uuid>", "text": "Instagram" }] },
 *         { "key": "...", "label": "...", "type": "FILE_UPLOAD",
 *           "value": [{ "id": "...", "name": "deck.pdf", "url": "https://..." }] },
 *         ...
 *       ]
 *     }
 *   }
 *
 * The legacy n8n workflow was hitting `body.fields[N].answer` (the old
 * Tally payload shape) and silently falling through to empty strings for
 * months. The correct path on the current Tally version is `body.data.fields[N].value`.
 */

/** A single option in a DROPDOWN, MULTIPLE_CHOICE, or CHECKBOXES field. */
export interface TallyFieldOption {
  id: string;
  text: string;
}

/** A single uploaded file in a FILE_UPLOAD field. */
export interface TallyFileUpload {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}

/**
 * A single Tally field as it appears in the webhook payload.
 *
 * The `value` shape depends on `type`:
 *   - INPUT_TEXT / TEXTAREA / INPUT_EMAIL / INPUT_PHONE_NUMBER / INPUT_LINK → string
 *   - DROPDOWN → string[] (array of selected option UUIDs)
 *   - MULTIPLE_CHOICE → string[] (single or multi-select)
 *   - CHECKBOXES → string[]
 *   - FILE_UPLOAD → TallyFileUpload[]
 *   - INPUT_DATE → string (ISO date)
 *   - INPUT_NUMBER → number
 *   - CHECKBOX → boolean
 *
 * We accept `unknown` and narrow in the parser.
 */
export interface TallyField {
  key: string;
  label: string;
  type: string;
  value: unknown;
  options?: TallyFieldOption[];
}

export interface TallyFormData {
  responseId: string;
  submissionId: string;
  respondentId: string;
  formId: string;
  formName: string;
  createdAt: string;
  fields: TallyField[];
}

export interface TallyWebhookPayload {
  eventId: string;
  eventType: string;
  createdAt: string;
  data: TallyFormData;
}

/**
 * The parsed, typed shape of a Creative Hotline Intake submission.
 *
 * The parser matches fields by Tally's `label` (with a positional-index
 * fallback for backwards compatibility), so this shape is stable even
 * when Megha reorders the form. See parser.ts FIELD_MAP for the canonical
 * label → output-key bindings.
 *
 * Fields added after the initial 21 (LinkedIn, X/Twitter, TikTok, YouTube,
 * Website 2, T&C, AI Overview) are optional — they may not be present on
 * older submissions before the form was extended.
 */
export interface ParsedIntake {
  // ---------- Core 21 fields (original Tally form b5W1JE) ----------

  /** "Full Name" — INPUT_TEXT */
  fullName: string;
  /** "Role" — INPUT_TEXT */
  role: string;
  /** "Brand / Company" — INPUT_TEXT */
  brand: string;
  /** "Phone Number" — INPUT_PHONE_NUMBER (no Notion field; goes into AI Intake Summary) */
  phone: string;
  /** "E-mail Address" — INPUT_EMAIL */
  email: string;
  /** "Instagram" — INPUT_LINK */
  instagram: string;
  /** "Website" — INPUT_LINK */
  website: string;
  /** "What's the creative emergency?" — TEXTAREA */
  creativeEmergency: string;
  /** "What do you actually want out of this call?" — MULTIPLE_CHOICE → Notion multi_select */
  desiredOutcomes: string[];
  /** "What have you already tried?" — TEXTAREA */
  whatTried: string;
  /** "Any deadlines or fires we should know about?" — TEXTAREA */
  deadline: string;
  /** "Anything we should avoid?" — TEXTAREA */
  constraintsAvoid: string;
  /** "What's your price range of offering?" — DROPDOWN */
  priceRange: string;
  /** "What's your approximate monthly revenue?" — DROPDOWN */
  monthlyRevenue: string;
  /** "Who's on your team?" — DROPDOWN */
  teamSize: string;
  /** "How many hours/week do you spend on your business?" — DROPDOWN */
  hoursPerWeek: string;
  /** "Monthly budget for tools and outside help?" — DROPDOWN */
  monthlyBudget: string;
  /** "If you could wave a magic wand..." — INPUT_TEXT */
  magicWand: string;
  /** "Where do you spend most of your creative energy right now?" — DROPDOWN */
  primaryPlatform: string;
  /** "Who or what inspires you / your brand right now?" — TEXTAREA */
  inspiration: string;
  /** Brand-files upload — FILE_UPLOAD */
  brandFiles: TallyFileUpload[];

  // ---------- New fields (added 2026-05-18 per Megha's edits) ----------

  /** "LinkedIn" — INPUT_LINK (optional) */
  linkedin?: string;
  /** "X / Twitter" — INPUT_LINK (optional) */
  twitter?: string;
  /** "TikTok" — INPUT_LINK (optional) */
  tiktok?: string;
  /** "YouTube" — INPUT_LINK (optional) */
  youtube?: string;
  /** "Website 2" or "Additional website" — INPUT_LINK (optional). Maps to
   *  Notion "Portfolio Website" property; the primary `website` field
   *  maps to "Brand Website". */
  website2?: string;
  /** Terms & Conditions agreement checkbox — required. CHECKBOX → boolean */
  tcsAgreed?: boolean;
  /** Optional AI overview the client pasted from their LLM — TEXTAREA */
  aiOverview?: string;

  // ---------- Megha V2 spec additions (TCH-V2-TALLY-FORM-SPEC.md) ----------

  /** Q2 "What does 90-day success look like?" — TEXTAREA */
  successDefinition?: string;
  /** Q3 "How do you make money?" — MULTIPLE_CHOICE multi → string[] */
  revenueModel?: string[];
  /** Q4 "Who are you trying to reach?" — TEXTAREA */
  targetAudience?: string;
  /** Q5 "Where do you live online?" — MULTIPLE_CHOICE multi → string[] */
  platforms?: string[];
  /** Q7 "Drop your links." — Tally repeating URL field, joined as newline-separated string */
  brandLinks?: string;
  /** Catch-all "Is there anything else we should know?" — TEXTAREA (added 2026-05-20 per Megha) */
  anythingElse?: string;
}
