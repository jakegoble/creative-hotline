# Customer Journey Email Sequence Map

**Date:** 2026-02-20
**Purpose:** Complete map of every automated email a customer or lead can receive, in chronological order along each journey path.

---

## Journey 1: Direct Purchase (Website → Stripe)

```
Discovery (website, referral, etc.)
  │
  ▼
[STRIPE PAYMENT] ── checkout.session.completed webhook
  │
  ├─ CUSTOMER EMAIL #1: "Here's your Calendly link"
  │   From: hello@creativehotline.com (currently jake@radanimal.co — BUG)
  │   Workflow: WF1 (Stripe Purchase → Calendly)
  │   Trigger: Immediate after payment
  │   Content: Thank you + Calendly booking link
  │
  ├─ TEAM ALERT #1: "New purchase"
  │   From: notifications@creativehotline.com
  │   To: jake@, megha@, soscreativehotline@
  │   Workflow: WF1
  │
  ▼
[48 HOURS PASS — NO BOOKING]
  │
  ├─ CUSTOMER EMAIL #2: "Your Creative Hotline call is waiting!"
  │   From: hello@creativehotline.com
  │   Workflow: WF5 (Paid But Never Booked)
  │   Trigger: Daily 9am, if Status="Paid - Needs Booking" AND 48+ hrs since payment
  │   Content: Reminder + Calendly CTA
  │   ⚠️ Repeats daily until status changes (no dedup flag)
  │
  ├─ TEAM ALERT #2: "Unbooked client"
  │   From: notifications@creativehotline.com
  │   Workflow: WF5
  │
  ▼
[CALENDLY BOOKING] ── invitee.created webhook
  │
  ├─ TEAM ALERT #3: "New booking"
  │   From: notifications@creativehotline.com
  │   Workflow: WF2 (Calendly Booking → Payments Update)
  │   Trigger: Immediate after booking
  │   ⚠️ No customer confirmation email from n8n (Calendly sends its own)
  │
  ▼
[CALL WITHIN 24 HOURS — NO INTAKE]
  │
  ├─ CUSTOMER EMAIL #3: "Quick prep before your call!"
  │   From: hello@creativehotline.com
  │   Workflow: WF6 (Booked But No Intake)
  │   Trigger: Daily 8am, if Status="Booked - Needs Intake" AND call within 24hrs
  │   Content: Intake form reminder + Tally CTA
  │   ⚠️ Fires indefinitely for past-due calls (no lower cutoff — BUG)
  │
  ├─ TEAM ALERT #4: "Missing intake"
  │   From: notifications@creativehotline.com
  │   Workflow: WF6
  │
  ▼
[TALLY INTAKE SUBMITTED] ── Tally webhook
  │
  ├─ TEAM ALERT #5: "Intake submitted + AI analysis"
  │   From: notifications@creativehotline.com
  │   Workflow: WF3 (Tally → Claude Analysis)
  │   Trigger: Immediate after submission
  │   Content: Client info + AI summary
  │
  ├─ TEAM ALERT #5b (conditional): "Upsell detected!"
  │   From: notifications@creativehotline.com (currently soscreativehotline@gmail.com — BUG)
  │   Workflow: WF3
  │   Trigger: Only if Claude flags upsell opportunity
  │
  ▼
[CALL HAPPENS]
  │
  ├─ 🚫 NO POST-CALL EMAILS YET
  │   WF9 is broken and needs rebuild
  │   Planned: Thank-you email → 24hr action plan delivery notification
  │
  ▼
[ACTION PLAN DELIVERED]
  │
  └─ END OF JOURNEY (for now)
```

---

## Journey 2: Instagram → Laylo → Nurture → Purchase

```
Discovery (Instagram DM, Story, Comment)
  │
  ├─ ManyChat handles initial DM conversation
  │   AI Goals: Share Booking Link, Capture Email
  │   ⚠️ No direct connection to n8n (ManyChat is standalone)
  │
  ▼
[LAYLO KEYWORD] ── User texts BOOK, PRICING, or HELP
  │
  ├─ Laylo webhook → n8n
  │
  ├─ TEAM ALERT #1: "New Laylo subscriber"
  │   From: notifications@creativehotline.com
  │   Workflow: WF4 (Laylo → Notion)
  │   Trigger: Immediate
  │   ⚠️ No customer email (Laylo is SMS/phone-based)
  │
  ▼
[3-7 DAYS PASS — NO PURCHASE]
  │
  ├─ CUSTOMER EMAIL #1: "Ready to solve your creative challenge?"
  │   From: hello@creativehotline.com
  │   Workflow: WF7 (Laylo Lead Nurture)
  │   Trigger: Daily 10am, if Status="Lead - Laylo" AND 3-7 days old
  │   Content: Value prop + "Learn More" CTA
  │   ⚠️ Links to wrong domain (soscreativehotline.com — BUG)
  │   ⚠️ Sends SAME email daily for 5 days (no dedup — BUG)
  │
  ├─ TEAM ALERT #2: "Lead nurtured"
  │   From: notifications@creativehotline.com
  │   Workflow: WF7
  │
  ▼
[PURCHASE] → Joins Journey 1 at STRIPE PAYMENT
```

---

## Journey 3: Website Contact Form (Currently Dead End)

```
Visitor fills "General Inquiries" form on /contact
  │
  ├─ Webflow form submission (not connected to n8n or Notion)
  │
  └─ 🚫 DEAD END — No automated response, no CRM record
     ⚠️ HIGH priority fix needed
```

---

## Email Timing Summary

| Email | When | To | From | Workflow |
|-------|------|-----|------|----------|
| Calendly link | Immediate after payment | Customer | hello@ | WF1 |
| Booking reminder | Daily 9am (48hrs+ stale) | Customer | hello@ | WF5 |
| Calendly confirmation | Immediate after booking | Customer | Calendly (not n8n) | — |
| Intake reminder | Daily 8am (call within 24hrs) | Customer | hello@ | WF6 |
| Nurture email | Daily 10am (3-7 days old) | Lead | hello@ | WF7 |
| Thank you (planned) | ~30min after call | Customer | hello@ | WF9 (needs rebuild) |
| Action plan notice (planned) | When plan marked sent | Customer | hello@ | WF9 (needs rebuild) |

---

## Team Alert Summary

| Alert | When | Workflow |
|-------|------|----------|
| New purchase | Immediate | WF1 |
| New booking | Immediate | WF2 |
| Intake + AI analysis | Immediate | WF3 |
| Upsell detected | Immediate (conditional) | WF3 |
| New Laylo subscriber | Immediate | WF4 |
| Unbooked client (48hrs) | Daily 9am | WF5 |
| Missing intake (24hrs) | Daily 8am | WF6 |
| Lead nurtured | Daily 10am | WF7 |

---

## Gaps in the Journey

### Missing Emails (No Automation Exists)

| # | Gap | When | Impact | Solution |
|---|-----|------|--------|----------|
| 1 | **Welcome/confirmation after booking** | After Calendly booking | Customer gets Calendly confirmation but nothing from Creative Hotline itself | Add email node to WF2 (or merge WF8 into WF2) |
| 2 | **Tally link after booking** | Immediately after booking | Customer has to wait for WF6's daily check | Build into WF2 (see [workflow-rebuild-specs.md](workflow-rebuild-specs.md)) |
| 3 | **Post-call thank you** | 30min-2hrs after call | No follow-up after the call itself | Rebuild WF9 |
| 4 | **Action plan delivery** | When team marks "sent" | Customer doesn't know action plan arrived | Rebuild WF9 |
| 5 | **Contact form response** | After form submission | Complete dead end | Connect Webflow form to n8n or replace with Tally |
| 6 | **Referral/review ask** | 7 days after action plan | No post-delivery engagement | Build new workflow |
| 7 | **Re-engagement** | 30+ days after call | No long-term nurture | Build new workflow |

### Dedup Problems

| Workflow | Problem | Impact |
|----------|---------|--------|
| WF5 | Sends booking reminder every day indefinitely | Customer gets spammed until they book or you manually change status |
| WF6 | Sends intake reminder daily, including for past-due calls forever | Customer gets spammed even after call happened |
| WF7 | Sends same nurture email 5 days in a row | Lead gets 5 identical emails |

**Fix pattern:** Add a "Sent" checkbox field to the relevant Notion database. Filter out records where checkbox = true. Set checkbox = true after sending.

---

## Recommended Email Sequence (Ideal State)

### After Payment:
1. **Immediate:** "Thanks for booking! Here's your Calendly link" (WF1 — exists)
2. **After booking:** "You're on the calendar! Fill out this quick intake form" (WF2 + WF8 merge — needs build)
3. **24hr before call, no intake:** "Quick prep before your call" (WF6 — exists, needs dedup fix)
4. **48hr after payment, no booking:** "Your call is waiting" (WF5 — exists, needs dedup fix)

### After Call:
5. **30min post-call:** "Thanks for the call! Your action plan is on the way" (WF9 — needs rebuild)
6. **When plan sent:** "Your action plan just landed" (WF9 — needs rebuild)
7. **7 days after plan:** "How's it going? Any questions?" (new — not yet built)
8. **30 days:** "Ready for your next session?" (new — not yet built)

### Laylo Lead Path:
1. **Immediate:** Laylo auto-response via SMS (Laylo handles this)
2. **Day 3-7:** "Ready to solve your creative challenge?" (WF7 — exists, needs dedup + URL fix)
3. **Day 14+ (new):** Second nurture with social proof / case study (not yet built)
