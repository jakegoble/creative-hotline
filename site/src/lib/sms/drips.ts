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
      "Quick reminder from Frankie: $499 First Call, 60 min, action plan in 24 hrs. " +
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
 * Decide whether a contact is due for their next drip message.
 *
 * Returns the next step + the new stage to write, or null if the contact is
 * not yet eligible (still inside the wait window) or already completed.
 */
export function nextDripStep(
  currentStage: DripStage,
  optInDate: Date | null,
  now: Date = new Date(),
): { step: DripStep; nextStage: DripStage } | null {
  if (!optInDate) return null;
  const step = DRIP_SEQUENCE[currentStage];
  if (!step) return null;
  const daysSince = Math.floor(
    (now.getTime() - optInDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSince < step.daysSinceOptIn) return null;
  return { step, nextStage: step.nextStage };
}
