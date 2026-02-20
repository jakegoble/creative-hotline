# Morning Report — Creative Hotline

**Date:** 2026-02-20 (Updated — post-overnight session)
**For:** Jake Goble
**Read time:** 2 minutes

---

## TL;DR

- Launch readiness went from **52% to 73%** overnight
- Core pipeline works end-to-end (pay -> book -> intake -> AI analysis)
- **5 remaining blockers** before soft launch
- n8n upgraded to Pro (no more trial deadline)
- 10 total workflows found in n8n (not the 3 originally thought) -- 7 active, 2 deleted (broken), 1 unaccounted
- **99.4% failure rate** on n8n executions -- needs investigation

---

## What Got Done Overnight

- n8n upgraded from trial to Pro plan (no workflow limit)
- WF8 + WF9 (broken scaffolding) deleted from n8n
- WF6 Tally URL fixed (was placeholder, now correct)
- Website CTAs all fixed -- "Book a Call" buttons now link to Calendly (were linking to template pages)
- Website footer fixed -- "Based in Venice, CA" (was Dubai placeholder)
- Stripe: 3 live products created with correct prices ($499/$699/$1,495) and payment links
- Stripe webhook registered for live mode
- Laylo: test Stripe links swapped to live payment links
- Laylo: drop descriptions updated with correct product info
- Notion: 4 dedup checkboxes added (Booking/Intake/Nurture Reminder Sent, Thank You Sent)
- Notion: "Follow-Up Sent" status added to pipeline
- Notion: duplicate test records cleaned (Payments DB down to 1 keeper)
- Notion: "3-Session Clarity Sprint" added to Product Purchased options
- 30 documentation files created covering every system

---

## What Still Needs Fixing (5 Blockers)

### Do Right Now

| # | Action | Why |
|---|--------|-----|
| 1 | **Reconnect Laylo to Instagram** | Laylo got disconnected from IG during the session. DM keyword triggers (BOOK, PRICING, HELP) won't fire until reconnected. Do this in the Laylo dashboard. |
| 2 | **Investigate n8n 99.4% failure rate** | Found during audit. Check the n8n execution log at https://creativehotline.app.n8n.cloud to see if these are test failures or real problems. |
| 3 | **Verify hello@creativehotline.com has a mailbox** | This address is the "From" on 3 customer-facing emails. If customers reply and it bounces, that's a bad look. Check your DNS/email provider. |

### Do Today

| # | Action | Why |
|---|--------|-----|
| 4 | **Republish WF7 in n8n** | The "Learn More" button in the lead nurture email still links to `soscreativehotline.com` (dead domain). Should be `www.thecreativehotline.com`. Or deploy the new Frankie template which fixes this automatically. |
| 5 | **Tell Webflow dev: fix pricing badges** | The 3-pack has a "Save $400" badge (was "Save $300") — actual savings is $602 (3×$699−$1,495). Update to "Save $602". Also: $1,100 price has no Stripe product (remove or replace with $1,495), $1,497 should be $1,495, and /pricing returns 404. |

---

## Pricing Status

| Touchpoint | First Call | Standard Call | 3-Session Sprint |
|-----------|-----------|--------------|-----------------|
| **Stripe (truth)** | $499 | $699 | $1,495 |
| **Website section 1** | $499 | $699 | $1,497 ($2 off) |
| **Website section 2** | -- | -- | "Save $400" badge (should be $602), $1,100 (WRONG) |
| **Calendly gate** | $499 | -- | -- |
| **Laylo drops** | Updated | Updated | Updated |
| **ManyChat KB** | Needs check | Needs check | Needs check |

---

## n8n Workflow Health (7 Active)

| Workflow | Status | Key Issue |
|----------|--------|-----------|
| WF1: Stripe -> Calendly | YELLOW | Product name always null, sender wrong |
| WF2: Calendly -> Payments | YELLOW | Team notification has wrong variables |
| WF3: Tally -> Claude AI | GREEN | Working -- type mismatches are cosmetic |
| WF4: Laylo -> Notion | YELLOW | Phone lost, product type wrong |
| WF5: Paid No Booking | GREEN | Needs dedup checkbox wiring |
| WF6: Booked No Intake | GREEN | Tally URL fixed, needs dedup |
| WF7: Lead Nurture | YELLOW | Dead domain URL -- needs republish |

---

## Live Stripe Payment Links

- **First Call ($499):** `https://buy.stripe.com/14AaEQcDDaY43eFdT59ws00`
- **Standard Call ($699):** `https://buy.stripe.com/eVqbIUeLL1nu02t16j9ws02`
- **3-Session Clarity Sprint ($1,495):** `https://buy.stripe.com/4gMcMY9rr2rycPfdT59ws03`

---

## Key Docs to Read

- **Full scorecard:** [launch-readiness-scorecard.md](launch-readiness-scorecard.md) -- 73% ready, detailed breakdown
- **Webflow dev handoff:** [webflow-dev-handoff.md](webflow-dev-handoff.md) -- what to tell your developer
- **Email templates:** [email-templates-frankie.md](email-templates-frankie.md) -- 7 Frankie-voice templates ready to deploy
- **Email deployment guide:** [email-deployment-guide.md](email-deployment-guide.md) -- step-by-step for swapping templates in n8n
- **WF1 fix spec:** [wf1-stripe-fix-spec.md](wf1-stripe-fix-spec.md) -- product mapping + dedup + signature verification
- **Website pricing audit:** [website-pricing-audit.md](website-pricing-audit.md) -- all pricing mismatches documented

---

## What's Working Well

- **Core pipeline:** Customer can pay via Stripe -> get Calendly link -> book -> submit Tally intake -> Claude AI analyzes -> team gets briefing. End to end.
- **Calendly:** Fully operational with $499 payment gate
- **ManyChat:** 4 automations active, AI responding to DMs
- **Notion CRM:** Clean, dedup checkboxes ready, relations working
- **Tally:** Form + webhook working

---

**Bottom line:** You went from 52% to 73% launch-ready overnight. The core pipeline works. Fix the 5 blockers (Laylo IG reconnection, failure rate investigation, hello@ mailbox, WF7 URL, pricing badge fix) and you're ready for a soft launch.
