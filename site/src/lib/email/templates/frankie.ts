/**
 * Frankie's onboarding email sequence.
 *
 * Three transactional sends triggered by the post-payment funnel:
 *   1. Confirmation — fires immediately on Stripe `checkout.session.completed`
 *   2. Intake nudge — fires 24h before booked session if intake not yet submitted
 *   3. Caller prep — fires 16:00 day before session
 *
 * Templates take a typed input and return SendInput-shaped {subject, bodyMarkdown,
 * previewText, categories}. Caller (n8n / cron / webhook) supplies recipient.
 *
 * Source: TCH-V2-CLIENT-ONBOARDING-EMAILS.md (Megha 2026-04-29).
 * Voice: Frankie — warm, hotline-operator, branded vocabulary.
 */

export interface FrankieEmail {
  subject: string;
  previewText: string;
  bodyMarkdown: string;
  categories: string[];
}

// ---------------------------------------------------------------------------
// EMAIL 1 · Confirmation
// ---------------------------------------------------------------------------

export interface ConfirmationInput {
  firstName: string;
  /** Calendly booking URL based on tier (First Call / Single Call / Clarity Bundle). */
  calendlyUrl: string;
  /** Tally intake URL prefilled with their email. */
  tallyUrl: string;
  /** Service agreement hosted URL or PDF link. */
  serviceAgreementUrl: string;
}

export function confirmationEmail(input: ConfirmationInput): FrankieEmail {
  return {
    subject: "You're on the line. ☎️ Here's what happens next.",
    previewText: "Welcome to The Creative Hotline. Pick your call time + tell us a bit.",
    categories: ["onboarding", "frankie", "confirmation"],
    bodyMarkdown: `Hey ${input.firstName} —

You just booked The Creative Hotline. Welcome.

I'm Frankie. I run the wires around here. Here's what happens next, in order:

**1 · Pick your call time.**
Use this Calendly link to grab a 45-minute slot with Megha + Jake. They run 3 calls a day, mornings PST. Sooner is better — fresh momentum.
[BOOK YOUR CALL →](${input.calendlyUrl})

**2 · Fill out your intake.**
Takes about 8 minutes. Be honest, not polished. The messier the better — that's where we find the real thing.
[START INTAKE →](${input.tallyUrl})

**3 · Show up ready.**
The night before your call, I'll send you a one-pager so you walk in dialed in. Until then, just keep doing what you're doing.

One thing to know: your action plan lands in your inbox **24 hours after the call**. We don't sit on it. That's the promise.

**Service agreement:** [Read it here](${input.serviceAgreementUrl})
**Receipt:** Stripe will email you a copy.

Questions? Hit reply or text the hotline at +1 (413) 767-4332.

Talk soon,
— F

☎️ The Creative Hotline · thecreativehotline.com
*Stop spiraling. Start creating.*`,
  };
}

// ---------------------------------------------------------------------------
// EMAIL 1b · Confirmation (Calendly-paid path)
// ---------------------------------------------------------------------------
//
// Variant of EMAIL 1 for clients who paid INSIDE the Calendly checkout flow
// (the production path: Calendly creates the Stripe PaymentIntent, captures,
// and we receive `payment_intent.succeeded`). At this point the customer has
// already locked their booking time, so the "BOOK YOUR CALL" CTA from EMAIL 1
// makes no sense. This template skips it and goes straight to intake + service
// agreement.
//
// Triggered from: stripe webhook route, case "payment_intent.succeeded".

export interface CalendlyConfirmationInput {
  firstName: string;
  /** Tally intake URL prefilled with their email. */
  tallyUrl: string;
  /** Service agreement hosted URL or PDF link. */
  serviceAgreementUrl: string;
  /** Optional — e.g. "Creative Hotline Call" for subject-line personalization. */
  productLabel?: string;
}

export function calendlyConfirmationEmail(
  input: CalendlyConfirmationInput,
): FrankieEmail {
  const productPhrase = input.productLabel
    ? ` for your ${input.productLabel}`
    : "";
  return {
    subject: "You're on the line. ☎️ One thing before we meet.",
    previewText:
      "Welcome to The Creative Hotline. Time's locked in — now tell us a bit about you.",
    categories: ["onboarding", "frankie", "confirmation_calendly"],
    bodyMarkdown: `Hey ${input.firstName} —

You're booked${productPhrase}. Welcome to The Creative Hotline.

I'm Frankie. I run the wires around here. Your call time is locked in — Calendly has your meeting details and a calendar invite is on its way. So here's what's left, in order:

**1 · Fill out your intake.**
Takes about 8 minutes. Be honest, not polished. The messier the better — that's where we find the real thing. We use it to prep the call so the 45 minutes actually count.
[START INTAKE →](${input.tallyUrl})

**2 · Show up ready.**
The night before your call, I'll send you a one-pager so you walk in dialed in. Until then, just keep doing what you're doing.

One thing to know: your action plan lands in your inbox **24 hours after the call**. We don't sit on it. That's the promise.

**Service agreement:** [Read it here](${input.serviceAgreementUrl})
**Receipt:** Stripe will email you a copy.

Questions? Hit reply or text the hotline at +1 (413) 767-4332.

Talk soon,
— F

☎️ The Creative Hotline · thecreativehotline.com
*Stop spiraling. Start creating.*`,
  };
}

// ---------------------------------------------------------------------------
// EMAIL 2 · Intake Nudge
// ---------------------------------------------------------------------------

export interface IntakeNudgeInput {
  firstName: string;
  /** Formatted session time, e.g. "Tuesday at 10am PST". */
  sessionTime: string;
  tallyUrl: string;
}

export function intakeNudgeEmail(input: IntakeNudgeInput): FrankieEmail {
  return {
    subject: "One thing before our call ☎️",
    previewText: "Need your intake before we can prep — takes 8 min.",
    categories: ["onboarding", "frankie", "intake_nudge"],
    bodyMarkdown: `Hey ${input.firstName} —

Your call with Megha + Jake is tomorrow at ${input.sessionTime}.

One thing left: we still need your intake. Without it, we can't do the prep work that makes the 45 minutes count.

[FINISH YOUR INTAKE →](${input.tallyUrl})

Takes about 8 minutes. Honestly is the move — the messy answers help us find the real problem, faster.

If something came up and you need to reschedule, hit reply or use the Calendly link.

— F

☎️ thecreativehotline.com`,
  };
}

// ---------------------------------------------------------------------------
// EMAIL 3 · Caller Prep (Night Before)
// ---------------------------------------------------------------------------

export interface CallerPrepInput {
  firstName: string;
  /** Formatted session time, e.g. "10am PST tomorrow". */
  sessionTime: string;
  /** URL to the hosted caller-prep doc for this client (or generic). */
  callerPrepUrl?: string;
}

export function callerPrepEmail(input: CallerPrepInput): FrankieEmail {
  return {
    subject: `Tomorrow at ${input.sessionTime} · Here's how we make it count`,
    previewText: "Your one-pager for the call. Read this, then forget about it.",
    categories: ["onboarding", "frankie", "caller_prep"],
    bodyMarkdown: `Hey ${input.firstName} —

24 hours from now you're on the line with Megha + Jake.

Read this once. Then forget about it. The point isn't to prepare — it's to show up open.

---

**Quick reminders. Cool down on the over-prep.**

The ones who get the most out of this show up with one real question — not ten. Pick the thing that's keeping you up. We'll handle the rest. — F

---

**What to expect (the 45):**
· 0–2 min · Quick intros
· 2–7 min · Your story · we read your intake back, you tell us what's actually going on
· 7–12 min · Dialing in · here's what we picked up before the call
· 12–15 min · North Star · one question, one answer
· 15–25 min · The diagnosis · we name the real problem together
· 25–35 min · The play · 72-hour, 1-week, 1-month moves
· 35–40 min · The map · DIY (Path A) vs Level Up (Path B) — you pick
· 40–42 min · Make the call · you do one tiny thing on the line
· 42–45 min · Land it · we summarize in one sentence

---

**What to have ready:**
✓ Quiet space + good wifi
✓ Your IG / website open on your screen
✓ Something to drink. This goes fast.
✓ One real question — not ten

---

**Some words you'll hear:**
· **The B-Side** — a panel where ideas that aren't today's focus get parked. Nothing gets lost.
· **Dialing In** — when we read what we picked up about your brand from research.
· **North Star** — the one thing you'd do if you could only do one.
· **Authority Read** — our 4-pillar honest read on where your brand stands today.
· **The Map** — the 2×2 grid where every move gets placed.
· **Creative File** — your folder where everything from today saves. You keep it forever.
· **Path A (DIY) / Path B (Level Up)** — every move comes with two paths.

---

**Heads up:** the call is recorded for the transcript that lands in your Creative File. No one watches but us.

Your action plan lands in your inbox **24 hours after the call**. Wall, matrix, B-Side — all folded in.

${input.callerPrepUrl ? `Full one-pager: [${input.callerPrepUrl}](${input.callerPrepUrl})\n\n` : ""}Talk soon.

— F

☎️ thecreativehotline.com
*Stop spiraling. Start creating.*`,
  };
}

// ---------------------------------------------------------------------------
// EMAIL 4 · Action Plan Delivered (Day 0)
// ---------------------------------------------------------------------------
//
// Fires from the Send pipeline (V2 Batch 7) after Megha + Jake approve the
// action plan in the Review Dashboard. SendGrid email goes out simultaneously
// with a Twilio SMS that links to the same hosted action-plan page.
//
// Promised in confirmation email: "your action plan lands in your inbox 24
// hours after the call." This is that email.

export interface ActionPlanDeliveredInput {
  firstName: string;
  /** Public URL to the hosted action plan, e.g.
   *  https://api.thecreativehotline.com/templates-v2/action-plan.html?sessionId=... */
  actionPlanUrl: string;
  /** Referral code in the form `<FIRST>-DIAL-100`. */
  referralCode: string;
}

export function actionPlanDeliveredEmail(
  input: ActionPlanDeliveredInput,
): FrankieEmail {
  return {
    subject: "Your plan is live ☎️",
    previewText:
      "Action plan from your Hotline call — and a $100 referral code to share.",
    categories: ["delivery", "frankie", "action_plan"],
    bodyMarkdown: `Hey ${input.firstName} —

Here's the playbook from your call. Wall, matrix, B-Side — all folded in.

[OPEN YOUR ACTION PLAN →](${input.actionPlanUrl})

A few notes before you dig in:

· **Save the link.** This is your Creative File. Everything we made together lives here.
· **One move first.** Pick the 72-hour win and start there. The rest waits.
· **Reply with reactions.** Tomorrow morning I'll text you with three quick prompts ("I liked / I wished / I wondered"). Don't overthink it — first instinct.

**Pay it forward.**
Your referral code: \`${input.referralCode}\`

Anyone you share it with gets $100 off their First Call. You get $100 off your next session when they use it.

Talk soon,
— F

☎️ thecreativehotline.com
*Stop spiraling. Start creating.*`,
  };
}

/**
 * SMS body for the Day 0 action plan delivery. Pairs with the email above —
 * fires from the same Send route via Twilio. Keep under 320 chars (2-segment
 * GSM-7) so we don't get billed as 3 messages.
 *
 * The hosted URL is short enough; we don't bother with link shortening.
 */
export function actionPlanDeliveredSms(
  input: ActionPlanDeliveredInput,
): string {
  return `☎️ ${input.firstName}, your Creative Hotline action plan is live: ${input.actionPlanUrl}

Share your code ${input.referralCode} — friends get $100 off, you get $100 off your next session. — F`;
}
