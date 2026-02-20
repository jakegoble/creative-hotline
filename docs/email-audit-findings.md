# Creative Hotline — Email Audit Findings

**Date:** February 20, 2026

---

## Overview

This document catalogs every email sent across the Creative Hotline n8n workflows (9 total), identifies sender configuration bugs, and flags a critical issue with the `hello@creativehotline.com` mailbox.

---

## Customer-Facing Emails (4)

| # | Workflow | Node Name | Subject Line (Current) | Subject Line (Frankie Template) | From | To |
|---|----------|-----------|----------------------|-------------------------------|------|-----|
| 1 | WF1 (Stripe → Calendly) | Send Calendly Link | `Your Creative Hotline Call — Book Your Session Now!` | `Let's get your call on the books` | `jake@radanimal.co` **(BUG)** | Customer email |
| 2 | WF5 (Paid No Booking) | Send Booking Reminder | `Your Creative Hotline call is waiting!` | `Your call's waiting on you` | `hello@creativehotline.com` | Customer email |
| 3 | WF6 (Booked No Intake) | Send Intake Reminder | `Quick prep before your Creative Hotline call!` | `Quick thing before our call` | `hello@creativehotline.com` | Customer email |
| 4 | WF7 (Lead Nurture) | Send Nurture Email | `Ready to solve your creative challenge?` | `Still thinking about it?` | `hello@creativehotline.com` | Lead email |

---

## Team Notification Emails (8)

| # | Workflow | Node Name | Subject Line | From | To |
|---|----------|-----------|-------------|------|-----|
| 5 | WF1 (Stripe → Calendly) | Send an Email (team) | `New Creative Hotline Purchase!` | `notifications@creativehotline.com` | jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com |
| 6 | WF2 (Calendly → Payments) | Send an Email (team) | `New Creative Hotline Booking!` | `notifications@creativehotline.com` | jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com |
| 7 | WF3 (Tally → Claude) | Send Intake Notification | `New Intake Submitted: [name]` | `notifications@creativehotline.com` | jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com |
| 8 | WF3 (Tally → Claude) | Send Upsell Alert | `Upsell Opportunity: [name]` | `soscreativehotline@gmail.com` **(BUG)** | jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com |
| 9 | WF4 (Laylo → Notion) | Send an Email (team) | `New Laylo Subscriber!` | `notifications@creativehotline.com` | jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com |
| 10 | WF5 (Paid No Booking) | Alert Team | `Stale Booking Alert: [name]` | `notifications@creativehotline.com` | jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com |
| 11 | WF6 (Booked No Intake) | Alert Team | `Missing Intake: [name]` | `notifications@creativehotline.com` | jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com |
| 12 | WF7 (Lead Nurture) | Alert Team | `Lead Nurture Sent: [name]` | `notifications@creativehotline.com` | jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com |

---

## Critical Finding: hello@creativehotline.com Mailbox

`hello@creativehotline.com` is the "From" address on emails #2, #3, and #4 (and will be #1 after the sender bug is fixed). This is correct for branding, but raises an urgent question:

**Does this address actually have a mailbox?**

If a customer hits "Reply" to any of these emails and `hello@creativehotline.com` does not have a mailbox or forwarding rule configured:

- The reply bounces with a delivery failure
- The customer thinks the business ghosted them
- Repeated bounces risk spam flags on future emails from the entire `creativehotline.com` domain

### Action Needed

1. **Check** whether `hello@creativehotline.com` has a forwarding rule or mailbox (Google Workspace, Zoho, etc.)
2. **If no mailbox exists**, set up forwarding to `soscreativehotline@gmail.com` at minimum
3. **Alternatively**, add a `Reply-To: soscreativehotline@gmail.com` header to all customer-facing email nodes in n8n

The same concern applies to `notifications@creativehotline.com`, though team members are less likely to reply to those alerts directly.

---

## Sender Issues Summary

| Issue | Current | Should Be | Workflow | Node |
|-------|---------|-----------|----------|------|
| Wrong sender (customer email) | `jake@radanimal.co` | `hello@creativehotline.com` | WF1 | Send Calendly Link |
| Wrong sender (team alert) | `soscreativehotline@gmail.com` | `notifications@creativehotline.com` | WF3 | Send Upsell Alert |

Both fixes are manual changes in the n8n Cloud UI (the n8n MCP does not support workflow editing).

---

## SMTP Configuration

All email nodes use the same SMTP credential: **ID `yJP76JoIqqqEPbQ9`**

This means `hello@` and `notifications@` are configured as aliases on the same SMTP server. The SMTP server accepts sending from both addresses. However, this does **not** mean either address can receive mail -- that depends entirely on the domain's MX records and mailbox configuration, which is separate from SMTP sending.

---

## Frankie Template Deployment Status

| Email | Current Template | Frankie Template Ready? | Deployed? |
|-------|-----------------|------------------------|-----------|
| #1 Calendly Link | Generic + emoji | Yes (Template #1) | No |
| #2 Booking Reminder | Generic | Yes (Template #2) | No |
| #3 Intake Reminder | Generic | Yes (Template #3) | No |
| #4 Nurture Email | Generic + dead URL | Yes (Template #4) | No |
| Team notifications (#5-#12) | Generic + emoji | Yes (Template #7) | No |

All 7 Frankie-voice templates are written and production-ready in `docs/email-templates-frankie.md`. Step-by-step deployment instructions are in `docs/email-deployment-guide.md`.

---

## Related Documents

- `docs/email-templates-frankie.md` -- 7 HTML email templates in Frankie's voice
- `docs/email-deployment-guide.md` -- Node-by-node deployment instructions
- `docs/email-sequence-map.md` -- Full customer journey email timeline and gap analysis
- `docs/n8n-workflow-audit.md` -- Complete 30-issue workflow audit
- `docs/n8n-fix-configs.md` -- Copy-paste fix configurations for all n8n issues
