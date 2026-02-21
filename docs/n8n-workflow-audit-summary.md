# n8n Workflow Audit Summary

**Date:** 2026-02-21
**Source:** `docs/n8n-workflow-backup.md` + live n8n MCP pulls
**Total Active Workflows:** 7 (WF8 + WF9 deleted)

---

## Workflow Summary Table

| Workflow | ID | Nodes | Trigger Type | Active | Last Modified (UTC) | Issues |
|----------|----|-------|-------------|--------|-------------------|--------|
| WF1: Stripe → Calendly | `AMSvlokEAFKvF_rncAFte` | 9 | Webhook (`checkout.session.completed`) | Yes | 2026-02-20T14:20:34 | 6 (2 critical) |
| WF2: Calendly → Payments | `Wt7paQoH2EICMtUG` | 5 | Webhook (`invitee.created`) | Yes | 2026-02-20T08:02:09 | 2 (1 critical) |
| WF3: Tally → Claude AI | `ETKIfWOX-eciSJQQF7XX5` | 12 (11+1 orphan) | Webhook (form submission) | Yes | 2026-02-20T14:31:15 | 7 (3 critical) |
| WF4: Laylo → Notion | `MfbV3-F5GiMwDs1KD5AoK` | 4 | Webhook (subscriber) | Yes | 2026-02-20T14:39:59 | 5 (1 critical) |
| WF5: Paid No Booking | `clCnlUW1zjatRHXE` | 6 | Schedule (daily 9am) | Yes | 2026-02-21T00:31:36 | 2 (0 critical) |
| WF6: Booked No Intake | `Esq2SMGEy6LVHdIQ` | 6 | Schedule (daily 8am) | Yes | 2026-02-21T00:34:42 | 5 (0 critical) |
| WF7: Lead Nurture | `VYCokTqWGAFCa1j0` | 6 | Schedule (daily 10am) | Yes | 2026-02-21T00:28:13 | 3 (0 critical) |
| ~~WF8: Calendly → Tally~~ | `3ONZZbLdprx4nxGK7eEom` | — | — | Deleted | — | — |
| ~~WF9: Post-Call Follow-Up~~ | `9mct9GBz3R-EjTgQOZcPt` | — | — | Deleted | — | — |

**Totals:** 48 nodes across 7 workflows, 30 documented issues (7 critical)

---

## Nodes with Empty/Missing Configurations

| Workflow | Node | Problem | Severity |
|----------|------|---------|----------|
| WF1 | Extract Data | `product_name` always null — `line_items` not in Stripe webhook payload | CRITICAL |
| WF1 | Laylo Subscribe (SMS) | `productId` = `"YOUR_LAYLO_PRODUCT_ID"` (placeholder) | HIGH |
| WF1 | Send Calendly Link | `fromEmail` = `jake@radanimal.co` (wrong sender) | MEDIUM |
| WF2 | Team Email | References `event_type` and `start_time` — fields don't exist in upstream data | MEDIUM |
| WF3 | Create Intake Record | `Role` mapped as `select` — Notion type is `rich_text` | CRITICAL |
| WF3 | Create Intake Record | `Desired Outcome` mapped as `select` — Notion type is `multi_select` | CRITICAL |
| WF3 | Claude Generate Summary | API key hardcoded in HTTP headers (not in n8n credentials) | LOW |
| WF3 | Send Upsell Alert | `fromEmail` = `soscreativehotline@gmail.com` (wrong sender) | MEDIUM |
| WF3 | Find Notion Lead | **ORPHANED** — exists in workflow but not connected to anything | MEDIUM |
| WF4 | Create Subscriber Lead | `title` = `""` (Client Name always blank) | HIGH |
| WF4 | Create Subscriber Lead | `phoneValue` = `""` (phone extracted but not mapped) | HIGH |
| WF4 | Create Subscriber Lead | `Product Purchased` mapped as `rich_text` — Notion type is `select` | CRITICAL |
| WF5 | (missing node) | No "Mark Booking Reminder Sent" Notion Update after email | HIGH |
| WF6 | (missing node) | No "Mark Intake Reminder Sent" Notion Update after email | HIGH |
| WF7 | Filter Code | No `Nurture Email Sent` dedup checkbox check | HIGH |
| WF7 | (missing node) | No "Mark Nurture Email Sent" Notion Update after email | HIGH |

---

## Issue Distribution by Severity

| Severity | Count | Workflows Affected |
|----------|-------|--------------------|
| CRITICAL | 7 | WF1 (2), WF2 (1), WF3 (3), WF4 (1) |
| HIGH | 8 | WF4 (2), WF5 (1), WF6 (2), WF7 (2), WF3 (1) |
| MEDIUM | 8 | WF1 (2), WF2 (1), WF3 (2), WF4 (2), WF6 (1) |
| LOW | 7 | WF1 (2), WF3 (2), WF5 (1), WF6 (2) |

---

## Credential Usage

| Credential | Type | ID | Used By |
|------------|------|----|---------|
| SMTP | Email | `yJP76JoIqqqEPbQ9` | All 7 workflows (14 emailSend nodes) |
| Notion API | Integration | `rzufpLxiRLvvNq4Z` | WF1-WF7 (all Notion nodes) |
| HTTP Header Auth (Laylo) | HTTP Auth | unknown | WF1 (2 httpRequest nodes) |
| Claude API | **HARDCODED** | N/A | WF3 (1 httpRequest node) |

---

## Dedup Status

| Workflow | Filter Check | "Mark Sent" Node | Status |
|----------|-------------|-----------------|--------|
| WF5 | `Booking Reminder Sent` checkbox checked | Missing | Partial |
| WF6 | `Intake Reminder Sent` checkbox checked | Missing | Partial |
| WF7 | Not wired | Missing | Not started |

---

## Error Handling Coverage

| Workflow | Nodes with `continueRegularOutput` | Unprotected External Nodes |
|----------|------------------------------------|---------------------------|
| WF1 | 4 (Notion, Laylo SMS, Laylo Email, Wait) | 2 (Send Calendly Link, Team Email) |
| WF2 | 2 (Find Payment, Update Status) | 1 (Team Email) |
| WF3 | 4 (Create Intake, Claude, Update Summary, Link Intake) | 3 (Upsell Alert, Intake Notification, Find Payment) |
| WF4 | 1 (Create Lead) | 1 (Team Email) |
| WF5 | 0 | 2 (Customer Email, Team Email) |
| WF6 | 0 | 2 (Customer Email, Team Email) |
| WF7 | 0 | 2 (Customer Email, Team Email) |

**Note:** Follow-up workflows (WF5-7) have zero error handling. If SMTP or Notion fails, the workflow stops silently.
