# Email Template Deployment Guide

**Date:** February 20, 2026
**Source:** All Frankie-voice templates are in `docs/email-templates-frankie.md`

This guide maps each template to its exact n8n node and tells you what to change.

---

## Customer-Facing Emails (4 nodes to update)

### 1. WF1 — Send Calendly Link

**n8n path:** "Stripe Purchase to Calendly" → "Send Calendly Link" node

| Field | Current (Generic) | New (Frankie) |
|-------|-------------------|---------------|
| subject | `Your Creative Hotline Call — Book Your Session Now!` | `Let's get your call on the books` |
| html | Generic template with emoji heading | Frankie template #1 from `email-templates-frankie.md` |

**Steps:**
1. Open WF1 in n8n Cloud UI
2. Click "Send Calendly Link" node
3. Change `subject` to: `Let's get your call on the books`
4. Replace entire `html` field with Template #1 from `email-templates-frankie.md`
5. Save and publish

**Verify:** The template references `{{ $('Extract Data').item.json.name }}` and `{{ $('Extract Data').item.json.email }}` — these match the current Extract Data node output.

---

### 2. WF5 — Send Booking Reminder

**n8n path:** "Follow Up: Paid But Never Booked" → "Send Booking Reminder" node

| Field | Current (Generic) | New (Frankie) |
|-------|-------------------|---------------|
| subject | `Your Creative Hotline call is waiting!` | `Your call's waiting on you` |
| html | Generic template | Frankie template #2 from `email-templates-frankie.md` |

**Steps:**
1. Open WF5 in n8n Cloud UI
2. Click "Send Booking Reminder" node
3. Change `subject` to: `Your call's waiting on you`
4. Replace entire `html` field with Template #2
5. Save and publish

**Verify:** Template references `{{ $json.name }}`, `{{ $json.email }}`, `{{ $json.hours_ago }}` — all match the Filter Stale Unbookeds code node output.

---

### 3. WF6 — Send Intake Reminder

**n8n path:** "Follow Up: Booked But No Intake" → "Send Intake Reminder" node

| Field | Current (Generic) | New (Frankie) |
|-------|-------------------|---------------|
| subject | `Quick prep before your Creative Hotline call!` | `Quick thing before our call` |
| html | Generic template with Tally link | Frankie template #3 from `email-templates-frankie.md` |

**Steps:**
1. Open WF6 in n8n Cloud UI
2. Click "Send Intake Reminder" node
3. Change `subject` to: `Quick thing before our call`
4. Replace entire `html` field with Template #3
5. Save and publish

**Verify:** Template references `{{ $json.name }}`, `{{ $json.hours_until_call }}`. Tally URL is `https://tally.so/r/b5W1JE` (correct).

---

### 4. WF7 — Send Nurture Email

**n8n path:** "Follow Up: Laylo Lead Nurture" → "Send Nurture Email" node

| Field | Current (Generic) | New (Frankie) |
|-------|-------------------|---------------|
| subject | `Ready to solve your creative challenge?` | `Still thinking about it?` |
| html | Generic template with **dead URL** (`soscreativehotline.com`) | Frankie template #4 with correct URL (`www.thecreativehotline.com`) |

**Steps:**
1. Open WF7 in n8n Cloud UI
2. Click "Send Nurture Email" node
3. Change `subject` to: `Still thinking about it?`
4. Replace entire `html` field with Template #4
5. **CRITICAL: This also fixes the dead domain bug** — the new template uses `www.thecreativehotline.com`
6. Save and **publish** (the last fix attempt may not have been published)

**Verify:** Template references `{{ $json.name }}`, `{{ $json.email }}`. CTA links to `https://www.thecreativehotline.com`.

---

## Team Notification Emails (Optional Upgrade)

The team notifications work fine functionally — they just use generic HTML with emoji subjects. Template #7 in `email-templates-frankie.md` provides a cleaner, more scannable design. This is cosmetic and low priority.

If you want to upgrade them, replace the HTML in each team notification node with Template #7, customizing:
- `{{ EVENT_TYPE }}` → the event name for that workflow
- Data table rows → match the variables available from that workflow's extract node

| Workflow | Node Name | EVENT_TYPE | Key Variables |
|----------|-----------|------------|---------------|
| WF1 | Send an Email | New Payment Received | name, email, phone, product_name, amount |
| WF2 | Send an Email | New Call Booked | name, email, call_date, calendly_link |
| WF3 | Send Intake Notification | Intake Form Submitted | name, email |
| WF3 | Send Upsell Alert | Upsell Opportunity | name, email |
| WF4 | Send an Email | New IG Subscriber | email, phone, product_id |
| WF5 | Alert Team | Stale Booking Alert | name, email, hours_ago |
| WF6 | Alert Team | Missing Intake Alert | name, email, hours_until_call |
| WF7 | Alert Team | Lead Nurture Sent | name, email, days_old |

---

## Deployment Order

1. **WF7 first** — fixes the dead domain bug (customer-facing broken link)
2. WF1 — highest-traffic customer email
3. WF5, WF6 — follow-up emails (lower volume)
4. Team notifications — cosmetic, do last

## SMTP Credential

All emailSend nodes use SMTP credential ID `yJP76JoIqqqEPbQ9`. Do not change this.
