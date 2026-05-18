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
 * Maps Tally field indices (0–20) onto domain-level fields. The index
 * positions are baked into the form `b5W1JE` and must stay in sync if
 * the form is reordered. See parser.ts for the actual index lookups.
 */
export interface ParsedIntake {
  /** Index 0 — INPUT_TEXT */
  fullName: string;
  /** Index 1 — INPUT_TEXT */
  role: string;
  /** Index 2 — INPUT_TEXT */
  brand: string;
  /** Index 3 — INPUT_PHONE_NUMBER (no Notion field; goes into AI Intake Summary) */
  phone: string;
  /** Index 4 — INPUT_EMAIL */
  email: string;
  /** Index 5 — INPUT_LINK (Instagram URL) */
  instagram: string;
  /** Index 6 — INPUT_LINK (Website URL) */
  website: string;
  /** Index 7 — TEXTAREA */
  creativeEmergency: string;
  /** Index 8 — MULTIPLE_CHOICE → Desired Outcome multi_select */
  desiredOutcomes: string[];
  /** Index 9 — TEXTAREA */
  whatTried: string;
  /** Index 10 — TEXTAREA */
  deadline: string;
  /** Index 11 — TEXTAREA */
  constraintsAvoid: string;
  /** Index 12 — DROPDOWN */
  priceRange: string;
  /** Index 13 — DROPDOWN */
  monthlyRevenue: string;
  /** Index 14 — DROPDOWN */
  teamSize: string;
  /** Index 15 — DROPDOWN */
  hoursPerWeek: string;
  /** Index 16 — DROPDOWN */
  monthlyBudget: string;
  /** Index 17 — INPUT_TEXT */
  magicWand: string;
  /** Index 18 — DROPDOWN — Primary Platform */
  primaryPlatform: string;
  /** Index 19 — TEXTAREA — Inspiration */
  inspiration: string;
  /** Index 20 — FILE_UPLOAD — Brand Files */
  brandFiles: TallyFileUpload[];
}
