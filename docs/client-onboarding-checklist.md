# Client Onboarding Checklist — The Creative Hotline

**Date:** 2026-02-24 (updated)
**Purpose:** Step-by-step verification that a new client flows correctly through the full automation stack.

---

## Pre-Flight: Before the Client Arrives

- [ ] n8n instance is active and all 5 workflows are running (WF1-4 + Daily Follow-Up Engine)
- [ ] SMTP credentials are valid (test send from hello@creativehotline.com)
- [ ] Notion API integration is connected to both databases
- [ ] Stripe webhook is configured and pointing to WF1 production URL
- [ ] Calendly webhook is configured and pointing to WF2 production URL
- [ ] Tally webhook is configured and pointing to WF3 production URL

---

## Stage 1: Payment (WF1 — Stripe → Calendly Link)

**Trigger:** Customer completes Stripe checkout

- [ ] Stripe `checkout.session.completed` webhook fires
- [ ] WF1 receives webhook at `/webhook/stripe-checkout`
- [ ] Extract Data node pulls: name, email, phone, amount, session ID
- [ ] Notion record created in Payments DB:
  - [ ] Client Name populated
  - [ ] Email populated
  - [ ] Phone populated (if provided)
  - [ ] Payment Amount correct
  - [ ] Status = "Paid - Needs Booking"
  - [ ] Payment Date set
  - [ ] Stripe Session ID set
- [ ] Calendly booking link email sent to customer
- [ ] Team notification email sent to jake@, megha@, soscreativehotline@

**Verify in:** Notion Payments DB, email inboxes (customer + team)

---

## Stage 2: Booking (WF2 — Calendly → Payments Update)

**Trigger:** Customer books via Calendly link

- [ ] Calendly `invitee.created` webhook fires
- [ ] WF2 receives webhook at `/webhook/calendly-payments-update`
- [ ] Find Payment by Email matches the correct Notion record
- [ ] Notion record updated:
  - [ ] Status → "Booked - Needs Intake"
  - [ ] Call Date set
  - [ ] Calendly Link set
- [ ] Team notification email sent

**Verify in:** Notion Payments DB (status + call date), team email

**If email mismatch:** Customer used different email for Stripe vs Calendly. WF2 silently fails — manually link the records in Notion.

---

## Stage 3: Intake (WF3 — Tally → Claude Analysis)

**Trigger:** Customer submits Tally intake form

- [ ] Tally webhook fires to `/webhook/tally-intake`
- [ ] WF3 Extract Tally Data node parses all form fields
- [ ] Notion Intake DB record created:
  - [ ] Client Name populated
  - [ ] Email populated
  - [ ] Role populated (as rich_text)
  - [ ] Brand populated
  - [ ] Website / IG populated
  - [ ] Creative Emergency populated
  - [ ] Desired Outcome populated (as multi_select)
  - [ ] What They've Tried populated
  - [ ] Deadline populated
  - [ ] Constraints / Avoid populated
  - [ ] Intake Status = "Submitted"
- [ ] Claude AI analysis runs:
  - [ ] AI Intake Summary written to Intake record
  - [ ] Upsell detection flag checked
- [ ] Payments DB record updated:
  - [ ] Linked Intake relation set
  - [ ] Status → "Intake Complete"
- [ ] Team briefing email sent (includes AI summary)
- [ ] If upsell detected: separate upsell alert sent to team

**Verify in:** Notion Intake DB (all fields), Notion Payments DB (status + relation), team email

---

## Stage 4: Pre-Call Prep

**Manual steps (not automated):**

- [ ] Review AI Intake Summary in Notion
- [ ] Read full intake form responses
- [ ] Note any upsell opportunities flagged by Claude
- [ ] Prepare call agenda / talking points
- [ ] Update Notion status → "Ready for Call" (manual)

---

## Stage 5: The Call

**Manual steps:**

- [ ] Conduct 45-minute call via Calendly event
- [ ] Take notes during call
- [ ] Update Notion status → "Call Complete" (manual)

---

## Stage 6: Post-Call Delivery

**Currently manual (WF9 rebuild pending):**

- [ ] Write action plan based on call notes + intake
- [ ] Send action plan to client via email
- [ ] Mark "Action Plan Sent" checkbox in Notion Intake DB
- [ ] Update Notion status → "Follow-Up Sent" (future: automated by WF9)

---

## Follow-Up Automations (Daily Checks)

These run automatically. Verify they fire correctly:

### Daily Follow-Up Engine (consolidated WF5+6+7, live Feb 23)

**Paid But Never Booked:**
- [ ] Fires if status = "Paid - Needs Booking" AND record is 48+ hours old
- [ ] Sends booking reminder email to customer
- [ ] Sends stale-booking alert to team
- [ ] Booking Reminder Sent checkbox gets set (prevents repeat)

**Booked But No Intake:**
- [ ] Fires if status = "Booked - Needs Intake" AND call within 24 hours
- [ ] Sends intake reminder email with Tally link (https://tally.so/r/b5W1JE)
- [ ] Sends missing-intake alert to team
- [ ] Intake Reminder Sent checkbox gets set (prevents repeat)

**Lead Nurture:**
- [ ] Fires if status = "Lead - Laylo" AND record is 3-7 days old
- [ ] Sends nurture email to lead
- [ ] Sends nurture alert to team
- [ ] **Note:** Nurture Email Sent dedup not yet wired — may send duplicates

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No Notion record after payment | Stripe webhook not firing or wrong URL | Check Stripe Dashboard → Webhooks → Events |
| Record created but status wrong | WF1 node config issue | Check n8n execution log for WF1 |
| Booking doesn't update record | Email mismatch between Stripe and Calendly | Manually update in Notion |
| Intake fields blank | Tally field label matching failed | Check WF3 Code node, compare Tally field labels |
| AI summary empty | Claude API key expired or rate limited | Check n8n execution log for WF3 HTTP node |
| No follow-up email sent | Record doesn't match filter criteria | Check status + age in Notion, verify workflow ran |
| Duplicate follow-up emails | Dedup checkbox not set | Manually check checkbox, verify "Mark Sent" node exists |

---

## Contacts

| Role | Name | Email |
|------|------|-------|
| Co-founder | Jake Goble | jake@radanimal.co |
| Co-founder | Megha | megha@theanecdote.co |
| Shared inbox | — | soscreativehotline@gmail.com |
| Customer-facing | Frankie (brand persona) | hello@creativehotline.com |
| Team notifications | — | notifications@creativehotline.com |
