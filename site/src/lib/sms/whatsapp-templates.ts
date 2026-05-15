/**
 * WhatsApp Content Template Registry
 *
 * Maps drip steps + transactional events to Twilio Content SIDs (Meta-approved
 * templates). Templates are required for any outbound WhatsApp message sent
 * outside the 24-hour customer service window (i.e., the entire drip sequence).
 *
 * ## How to populate this registry
 *
 *   1. Twilio Console → Messaging → Content Editor → Create new template
 *   2. Submit each of the 4 drip templates (and the welcome template) for
 *      Meta approval. Use the body copy in `expectedBody` below as the
 *      submission text; Meta reviews each one (~1 day per template).
 *   3. After approval, Twilio assigns each template a Content SID
 *      starting with `HX`. Paste each SID below into the matching slot.
 *   4. Deploy. The drip cron auto-detects WA contacts and routes to the
 *      template; SMS-only contacts continue using plain bodies.
 *
 * ## Why this is a static registry (not env vars)
 *
 * Template SIDs are not secrets and they change very rarely (only when the
 * approved copy changes). Keeping them in code means a copy update is one
 * PR with the new body + new SID together, reviewable.
 *
 * ## Variable convention
 *
 * Every template that includes the booking URL exposes it as `{{1}}` so we
 * can change the Calendly link without re-submitting to Meta. The drip cron
 * passes `BOOKING_URL` as variable 1 at send time.
 */

import { BOOKING_URL } from "./keywords";
import type { DripStage } from "./drips";

export interface WhatsAppTemplate {
  /**
   * Twilio Content SID (`HX...`). `null` means not yet approved — the drip
   * cron will skip WA send for this stage and fall through to SMS if the
   * contact also has SMS in Channel, or skip entirely if WA-only.
   */
  contentSid: string | null;
  /**
   * The body submitted to Meta. Keep in sync with the actual approved template
   * so reviewers can diff. Variables use Meta's `{{1}}`, `{{2}}` syntax.
   */
  expectedBody: string;
  /**
   * Variables to inject at send time, keyed by Meta's 1-indexed placeholder.
   * Currently every drip uses `{{1}}` = booking URL.
   */
  variables: () => Record<string, string>;
  /**
   * Meta template category. MARKETING for promotional drips, UTILITY for
   * transactional (booking confirmations, etc.). All 4 drips are MARKETING.
   */
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
}

/**
 * Templates keyed by the drip stage the contact is IN (i.e., the message
 * that fires when they advance OUT of that stage). Matches DRIP_SEQUENCE
 * in drips.ts.
 */
export const WHATSAPP_DRIP_TEMPLATES: Partial<
  Record<DripStage, WhatsAppTemplate>
> = {
  step_1: {
    contentSid: null, // TODO: paste HX... after Meta approval
    expectedBody:
      "Frankie checking in. Most callers walk out of their first Hotline session saying 'why didn't I do this sooner?' Ready when you are: {{1}}",
    variables: () => ({ "1": BOOKING_URL }),
    category: "MARKETING",
  },
  step_2: {
    contentSid: null,
    expectedBody:
      "Stuck on what to bring to a call? Just the mess. The brief that's not landing. The launch that needs structure. We build the plan together. {{1}}",
    variables: () => ({ "1": BOOKING_URL }),
    category: "MARKETING",
  },
  step_3: {
    contentSid: null,
    expectedBody:
      "Quick reminder from Frankie: $499 First Call, 60 min, action plan in 24 hrs. Grab a slot before the week's gone: {{1}}",
    variables: () => ({ "1": BOOKING_URL }),
    category: "MARKETING",
  },
  step_4: {
    contentSid: null,
    expectedBody:
      "Last nudge from Frankie. If the timing's not right, no hard feelings — we'll be here. If it IS the right time: {{1}}",
    variables: () => ({ "1": BOOKING_URL }),
    category: "MARKETING",
  },
};

/**
 * Resolve the template for a given drip stage. Returns null if the SID
 * hasn't been wired yet (i.e., still awaiting Meta approval).
 */
export function getWhatsAppTemplate(stage: DripStage): WhatsAppTemplate | null {
  const t = WHATSAPP_DRIP_TEMPLATES[stage];
  if (!t || !t.contentSid) return null;
  return t;
}
