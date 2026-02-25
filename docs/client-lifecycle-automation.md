# Client Lifecycle Automation Map

**Date:** 2026-02-24 (updated)
**Purpose:** Documents the full client journey from first interaction through post-call follow-up, mapping which automations fire at each stage.

---

## Lifecycle Overview

```
 DISCOVER ──► CAPTURE ──► PAY ──► BOOK ──► PREP ──► CALL ──► DELIVER ──► RETAIN
    │            │         │       │        │        │          │           │
 ManyChat    Laylo     Stripe  Calendly  Tally   (Manual)   (Manual)   (Future)
   AI DM     WF4       WF1     WF2       WF3                WF9*
              │         │       │        │                    │
              ▼         ▼       ▼        ▼                    ▼
           Notion    Notion   Notion   Notion              Notion
           Lead-     Paid-    Booked-  Intake              Follow-Up
           Laylo     Needs    Needs    Complete            Sent
                     Booking  Intake

 Follow-up automations run daily (consolidated into Daily Follow-Up Engine):
   Paid no booking (48hrs) ─── Booked no intake (24hrs) ─── Lead nurture (3-7 days)
```

---

## Stage 1: Discovery

**Goal:** Prospect finds The Creative Hotline
**Channels:** Instagram, website, referrals

### Instagram Path
| Trigger | System | Action | Data Created |
|---------|--------|--------|-------------|
| User DMs @creative.hotline | ManyChat | AI responds using Knowledge Base, shares booking link, captures email | ManyChat subscriber (NOT synced to Notion) |
| User comments on post | ManyChat | Comment-to-DM automation sends DM | ManyChat subscriber |
| User mentions in story | ManyChat | Story mention auto-reply | ManyChat subscriber |

### Website Path
| Trigger | System | Action | Data Created |
|---------|--------|--------|-------------|
| User visits thecreativehotline.com | Webflow | Views pricing, CTAs link to Calendly | None |
| User fills contact form | Webflow | Form submitted to Webflow | Webflow form entry (DEAD END — not connected) |

**Gap:** ManyChat data does not flow to n8n or Notion. Contact form is a dead end.

---

## Stage 2: Lead Capture (Laylo)

**Goal:** Convert Instagram interest into CRM lead
**Automation:** WF4 (Laylo Subscriber → Notion)

| Step | System | Action | Notion Update |
|------|--------|--------|--------------|
| 1 | Instagram | User sends keyword (BOOK, PRICING, HELP) | — |
| 2 | Laylo | Captures email + phone, fires webhook | — |
| 3 | n8n (WF4) | Receives webhook, extracts subscriber data | Creates Payments DB record: Status = "Lead - Laylo" |
| 4 | n8n (WF4) | Sends team notification email | — |

**Emails sent:** 1 team alert
**Known issues:** Phone lost (not mapped to Notion), client name always blank, no dedup check
**Blocker:** Laylo disconnected from Instagram — keywords don't fire

### Follow-Up: Lead Nurture (WF7)
| Timing | Trigger | Action |
|--------|---------|--------|
| Days 3-7 after signup | WF7 daily 10am schedule | Sends nurture email to leads who haven't purchased |

**Email to customer:** "Ready to solve your creative challenge?" with website CTA
**Email to team:** "Laylo Lead Nurtured" alert
**Issue:** No dedup — sends same email up to 5 days straight

---

## Stage 3: Payment

**Goal:** Convert lead or visitor into paying customer
**Automation:** WF1 (Stripe Purchase → Calendly)

| Step | System | Action | Notion Update |
|------|--------|--------|--------------|
| 1 | Stripe | Customer pays via payment link ($499/$699/$1,495) | — |
| 2 | Stripe | Fires `checkout.session.completed` webhook | — |
| 3 | n8n (WF1) | Extracts payment data (name, email, phone, amount) | Creates Payments DB record: Status = "Paid - Needs Booking" |
| 4 | n8n (WF1) | Subscribes to Laylo (SMS if phone, email if not) | — |
| 5 | n8n (WF1) | Waits 10 seconds | — |
| 6 | n8n (WF1) | Sends Calendly link email to customer | — |
| 7 | n8n (WF1) | Sends team notification | — |

**Emails sent:** 1 customer (Calendly link) + 1 team alert
**Known issues:** Product name always null, wrong sender (jake@), no dedup guard

### Follow-Up: Unbooked Reminder (WF5)
| Timing | Trigger | Action |
|--------|---------|--------|
| 48+ hours after payment, no booking | WF5 daily 9am schedule | Sends booking reminder email |

**Email to customer:** "Your Creative Hotline call is waiting!"
**Email to team:** "Unbooked Client" alert with hours since payment
**Dedup:** Filter checks `Booking Reminder Sent` checkbox (wired). "Mark Sent" node not yet added.

---

## Stage 4: Booking

**Goal:** Customer books their 45-minute call
**Automation:** WF2 (Calendly Booking → Payments Update)

| Step | System | Action | Notion Update |
|------|--------|--------|--------------|
| 1 | Calendly | Customer books call at scheduled time | — |
| 2 | Calendly | Sends confirmation email (native Calendly) | — |
| 3 | Calendly | Fires `invitee.created` webhook | — |
| 4 | n8n (WF2) | Extracts booking data (email, name, call date, link) | Updates Payments DB: Status = "Booked - Needs Intake", Call Date, Calendly Link |
| 5 | n8n (WF2) | Sends team notification | — |

**Emails sent:** 1 team alert (no customer email from n8n — Calendly sends its own)
**Gap:** No booking confirmation email from The Creative Hotline brand. No immediate Tally form link sent.
**Known issue:** Email mismatch between Stripe and Calendly causes silent failure — record not updated.

### Follow-Up: Intake Reminder (WF6)
| Timing | Trigger | Action |
|--------|---------|--------|
| Call within 24 hours, no intake submitted | WF6 daily 8am schedule | Sends intake form reminder |

**Email to customer:** "Quick prep before your Creative Hotline call!" with Tally CTA
**Email to team:** "Missing Intake" alert with hours until call
**Dedup:** Filter checks `Intake Reminder Sent` checkbox (wired). "Mark Sent" node not yet added.
**Issue:** Past-due calls continue triggering forever (no lower cutoff).

---

## Stage 5: Pre-Call Prep (Intake)

**Goal:** Collect creative brief via intake form for AI analysis
**Automation:** WF3 (Tally Intake → Claude Analysis)

| Step | System | Action | Notion Update |
|------|--------|--------|--------------|
| 1 | Tally | Customer fills intake form | — |
| 2 | Tally | Fires webhook to n8n | — |
| 3 | n8n (WF3) | Extracts form data (fuzzy label matching) | Creates Intake DB record with all form fields |
| 4 | n8n (WF3) | Sends data to Claude API for analysis | — |
| 5 | Claude | Returns AI summary + upsell detection | — |
| 6 | n8n (WF3) | Saves AI summary to Intake record | Updates Intake DB: AI Intake Summary |
| 7 | n8n (WF3) | If upsell detected → sends upsell alert | — |
| 8 | n8n (WF3) | Finds matching Payment record by email | — |
| 9 | n8n (WF3) | Links Intake to Payment, updates status | Updates Payments DB: Status = "Intake Complete", Linked Intake |
| 10 | n8n (WF3) | Sends team notification with AI summary | — |

**Emails sent:** 1 team alert + 1 upsell alert (conditional)
**Known issues:** Role/Desired Outcome type mismatches, orphaned node, hardcoded API key

---

## Stage 6: The Call

**Goal:** 45-minute creative direction call
**Automation:** None (manual)

The call happens via Calendly's built-in video call link. Post-call, the team manually:
1. Reviews the AI summary and notes
2. Prepares the custom action plan
3. Updates status in Notion to "Call Complete"

**Gap:** No automated status change from "Intake Complete" to "Ready for Call" to "Call Complete". All manual.

---

## Stage 7: Post-Call Delivery

**Goal:** Deliver action plan within 24 hours
**Automation:** WF9 (deleted — rebuild in progress)

### Planned Flow (from rebuild spec)
| Step | System | Action | Notion Update |
|------|--------|--------|--------------|
| 1 | n8n | Schedule checks for "Call Complete" records without Action Plan Sent | — |
| 2 | n8n | Sends thank-you email to customer | — |
| 3 | (Manual) | Team sends action plan | Marks `Action Plan Sent` = true in Intake DB |
| 4 | n8n | Detects checkbox change, sends "Your plan just landed" email | Updates status to "Follow-Up Sent" |

**Status:** WF9 deleted, rebuild in progress. Pinia patches seen for "Mark Action Plan Sent" node.

---

## Stage 8: Retention (Future)

**Goal:** Re-engage after delivery
**Automation:** None (not yet built)

### Planned
- Day 7 post-plan: "How's it going?" check-in
- Day 30: "Ready for your next session?" re-engagement
- Referral/review ask email

---

## Automation Coverage Summary

| Stage | Automation | Status |
|-------|-----------|--------|
| Discovery (IG) | ManyChat AI | Active (standalone) |
| Lead Capture | WF4 (Laylo → Notion) | Active (Laylo IG disconnected) |
| Payment | WF1 (Stripe → Calendly) | Active (product name null) |
| Booking | WF2 (Calendly → Payments) | Active |
| Intake + AI | WF3 (Tally → Claude) | Active |
| Follow-up: All 3 | Daily Follow-Up Engine (consolidated WF5+6+7) | Active (dedup partial) |
| Post-Call | WF9 (deleted) | Rebuild pending |
| Retention | None | Not built |

**Automated touchpoints per customer:** Up to 5 emails + 5 team alerts across the lifecycle.
