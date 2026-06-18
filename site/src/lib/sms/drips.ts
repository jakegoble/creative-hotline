/**
 * SMS Drip Sequence — 4-step Frankie nurture
 *
 * Fires after an SMS subscriber opts in (HOTLINE/START/JOIN keyword). Mirrors
 * the ManyChat re-engagement sequence pattern: warm reintroduction → value →
 * direct CTA → final nudge. All four messages drive to the same Calendly URL.
 *
 * Scheduling: the daily /api/cron/sms-drips route runs at 17:00 UTC (10am PT,
 * 1pm ET — peak SMS engagement windows for B2B audiences). For each active
 * subscriber, it computes days-since-opt-in and dispatches the next stage if
 * the contact hasn't already advanced past it.
 *
 * State machine:
 *   step_1 (Day 0, immediate)   — handled inline by inbound handler (opt-in TwiML)
 *   step_2 (Day 1)              — social proof + first-call testimonial frame
 *   step_3 (Day 3)              — "what to bring" objection-handler
 *   step_4 (Day 7)              — direct CTA, price anchor, urgency
 *   completed (Day 14+)         — final nudge, then exit the sequence
 *
 * Opt-out: any STOP keyword sets Status=opted_out. The drip cron filters those
 * out, so re-enrollment requires START.
 */

import { BOOKING_URL } from "./keywords";

/** Drip stage names — match the Notion Messaging Contacts Drip Stage select options. */
export type DripStage =
  | "none"
  | "step_1"
  | "step_2"
  | "step_3"
  | "step_4"
  | "completed";

interface DripStep {
  /** The stage value to set on the contact after this step is sent. */
  nextStage: DripStage;
  /** Days since Opt-In Date required before this step fires. */
  daysSinceOptIn: number;
  /** The SMS body. Must end with " Reply STOP to opt out." for CAN-SPAM. */
  body: string;
}

/**
 * The sequence, keyed by the CURRENT stage of the contact when the cron runs.
 * The cron looks up `DRIP_SEQUENCE[contact.dripStage]` to find the next step.
 *
 * Note: "step_1" is set by the inbound handler at opt-in time (since the welcome
 * reply IS step 1). The cron's job is to advance through step_2 → step_4 →
 * completed.
 */
export const DRIP_SEQUENCE: Record<DripStage, DripStep | null> = {
  none: null, // contact opted in but stage wasn't set — shouldn't happen, but safe
  step_1: {
    nextStage: "step_2",
    daysSinceOptIn: 1,
    body:
      "Frankie checking in. Most callers walk out of their first Hotline session saying 'why didn't I do this sooner?' " +
      `Ready when you are: ${BOOKING_URL} · Reply STOP to opt out.`,
  },
  step_2: {
    nextStage: "step_3",
    daysSinceOptIn: 3,
    body:
      "Stuck on what to bring to a call? Just the mess. The brief that's not landing. The launch that needs structure. " +
      `We build the plan together. ${BOOKING_URL} · Reply STOP to opt out.`,
  },
  step_3: {
    nextStage: "step_4",
    daysSinceOptIn: 7,
    body:
      "Quick reminder from Frankie: $499 First Call, 45 min, action plan in 24 hrs. " +
      `Grab a slot before the week's gone: ${BOOKING_URL} · Reply STOP to opt out.`,
  },
  step_4: {
    nextStage: "completed",
    daysSinceOptIn: 14,
    body:
      "Last nudge from Frankie. If the timing's not right, no hard feelings — we'll be here. " +
      `If it IS the right time: ${BOOKING_URL} · Reply STOP to opt out.`,
  },
  completed: null, // end of sequence — cron skips these contacts
};

/**
 * BETA launch nurture — fires ONLY for contacts tagged "beta-call" (i.e. they
 * texted/DM'd the BETA-CALL keyword). The cron selects this sequence instead of
 * the generic one for those leads, so the follow-ups reinforce the exact promo
 * the ad sold: $299 with code BETA-CALL (reg $499), money-back guarantee,
 * limited spots. Same DripStage keys as DRIP_SEQUENCE so the existing stage
 * machine + advanceDripStage() work unchanged — only the copy and the (tighter)
 * cadence differ. Step 1 (the immediate promo reply) is sent inline by the
 * inbound handler; this drives steps 2→final.
 *
 * Cadence is deliberately punchier than the evergreen drip (Day 1/2/4/6 vs
 * 1/3/7/14) because the beta is explicitly time-limited.
 *
 * To retire the promo: stop tagging "beta-call" (remove the keyword triggers)
 * and these contacts naturally fall back to nothing new; or delete this block.
 */
export const BETA_DRIP_SEQUENCE: Record<DripStage, DripStep | null> = {
  none: null,
  step_1: {
    nextStage: "step_2",
    daysSinceOptIn: 1,
    body:
      "Frankie again — your BETA spot's still open. A senior creative director on the phone in under 24 hrs for $299 (code BETA-CALL, normally $499). " +
      `Grab it: ${BOOKING_URL} · Reply STOP to opt out.`,
  },
  step_2: {
    nextStage: "step_3",
    daysSinceOptIn: 2,
    body:
      "Beta spots are limited and they're going. Fuzzy brand, a launch that's not landing, a campaign that's flat — that's the call. $299 with code BETA-CALL. " +
      `${BOOKING_URL} · Reply STOP to opt out.`,
  },
  step_3: {
    nextStage: "step_4",
    daysSinceOptIn: 4,
    body:
      "Still holding a beta slot for you. 45 min, 1-on-1, action plan in 24 hrs, money-back guarantee — keep the session either way. $299, code BETA-CALL: " +
      `${BOOKING_URL} · Reply STOP to opt out.`,
  },
  step_4: {
    nextStage: "completed",
    daysSinceOptIn: 6,
    body:
      "Last call on the beta from Frankie. Once these spots fill it's back to $499. If now's the time, lock it in with code BETA-CALL: " +
      `${BOOKING_URL} · Reply STOP to opt out.`,
  },
  completed: null,
};

/**
 * Decide whether a contact is due for their next drip message.
 *
 * Returns the next step + the new stage to write, or null if the contact is
 * not yet eligible (still inside the wait window) or already completed.
 *
 * `sequence` defaults to the evergreen DRIP_SEQUENCE. The cron passes
 * BETA_DRIP_SEQUENCE for contacts tagged "beta-call" so the BETA promo gets its
 * own copy + cadence without touching the generic nurture.
 */
export function nextDripStep(
  currentStage: DripStage,
  optInDate: Date | null,
  now: Date = new Date(),
  sequence: Record<DripStage, DripStep | null> = DRIP_SEQUENCE,
): { step: DripStep; nextStage: DripStage } | null {
  if (!optInDate) return null;
  const step = sequence[currentStage];
  if (!step) return null;
  const daysSince = Math.floor(
    (now.getTime() - optInDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSince < step.daysSinceOptIn) return null;
  return { step, nextStage: step.nextStage };
}
