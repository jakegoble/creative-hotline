# Automation Health Dashboard — Spec

**Date:** 2026-02-21
**Status:** Specification only — not yet implemented
**Purpose:** Define what a monitoring dashboard for the Creative Hotline automation stack should track, alert on, and display.

---

## What to Track

### 1. n8n Workflow Execution Metrics

| Metric | Source | Check Frequency |
|--------|--------|----------------|
| Execution success rate (per workflow) | n8n Executions API | Hourly |
| Failed executions count (last 24h) | n8n Executions API | Hourly |
| Execution duration (p50, p95) | n8n Executions API | Daily |
| Active workflow count | n8n Workflows API | Daily |
| Workflow last-triggered timestamp | n8n Executions API | Daily |

**API endpoint:** `GET /executions` with `?status=error&limit=100`
**Auth:** n8n API key (Settings → API)

### 2. Notion Record Counts

| Metric | Source | Check Frequency |
|--------|--------|----------------|
| Total Payments DB records | Notion API query | Daily |
| Records by status (pipeline distribution) | Notion API query with filter | Daily |
| Records created in last 24h | Notion API query with date filter | Daily |
| Orphaned records (no email) | Notion API query | Weekly |
| Intake records without linked payment | Notion API query | Weekly |

**API endpoint:** `POST /databases/{id}/query` with filter body
**Auth:** Notion internal integration token

### 3. Email Delivery

| Metric | Source | Check Frequency |
|--------|--------|----------------|
| Emails sent (last 24h) | SMTP server logs or n8n execution count | Daily |
| Bounce rate | SMTP provider dashboard | Daily |
| Delivery failures | n8n execution errors on emailSend nodes | Hourly |

**Note:** Direct SMTP metrics depend on the email provider. If using a transactional service (Postmark, SendGrid, Mailgun), their API provides delivery/bounce/open stats. If using raw SMTP, metrics are limited to n8n execution success/failure.

### 4. Stripe Payment Status

| Metric | Source | Check Frequency |
|--------|--------|----------------|
| Successful payments (last 24h) | Stripe API or webhook event count | Daily |
| Failed/incomplete checkouts | Stripe Dashboard | Daily |
| Webhook delivery failures | Stripe Dashboard → Webhooks → Events | Daily |
| Payment amount distribution | Stripe API | Weekly |

**API endpoint:** `GET /v1/checkout/sessions?status=complete&created[gte]=...`
**Auth:** Stripe secret key

### 5. External Service Availability

| Service | Check | Frequency |
|---------|-------|-----------|
| Website (thecreativehotline.com) | HTTP 200 check | Every 15 min |
| n8n instance | HTTP check on base URL | Every 15 min |
| Calendly booking page | HTTP 200 check | Hourly |
| Tally form page | HTTP 200 check | Hourly |
| Stripe API | `GET /v1/balance` (lightweight) | Hourly |
| Claude API | `POST /v1/messages` (tiny prompt) | Hourly |
| Notion API | `GET /v1/users/me` | Hourly |

**Existing implementation:** `scripts/health-check.sh` covers most of these checks already.

---

## Alert Thresholds

### Critical (Page immediately)

| Condition | Action |
|-----------|--------|
| n8n instance unreachable for 15+ min | Alert team — all automation is down |
| 5+ consecutive execution failures on same workflow | Alert team — workflow likely broken |
| Stripe webhook returning 5xx for 30+ min | Alert team — payments not processing |
| Website down for 15+ min | Alert team — customers can't find us |

### Warning (Daily digest)

| Condition | Action |
|-----------|--------|
| Any workflow hasn't triggered in 48+ hours | Check if trigger is working |
| Execution success rate drops below 80% | Review failing executions |
| Notion record count didn't increase in 7 days | Check if pipeline is stalled |
| Email bounce rate exceeds 5% | Check SMTP config and sender reputation |
| MX records missing for creativehotline.com | Email replies are bouncing (known issue) |

### Info (Weekly report)

| Condition | Action |
|-----------|--------|
| Pipeline distribution (records per status) | Spot bottlenecks |
| Average time between stages | Identify slow points |
| Workflow execution duration trends | Catch degradation early |
| Active workflow count vs plan limit | Plan consolidation |

---

## Suggested Implementation Approaches

### Approach A: n8n Self-Monitoring Workflow (Recommended)

Build a monitoring workflow inside n8n itself:

```
Schedule Trigger (every hour)
  → HTTP Request: GET n8n /executions?status=error&limit=10
  → Code Node: Count errors per workflow, check thresholds
  → IF: Errors exceed threshold
    → True: Send alert email to team
    → False: No-op
  → (Daily branch): Query Notion for record counts
  → (Daily branch): Format daily digest email
```

**Pros:** No additional tools, runs inside existing n8n, free.
**Cons:** If n8n is down, the monitor is also down. Limited to n8n's capabilities.

### Approach B: External Health Check Script (Cron)

Expand `scripts/health-check.sh` into a full monitoring script. Run via cron on a separate machine or CI/CD schedule.

```bash
# Example crontab
*/15 * * * * /path/to/health-check.sh --quiet --alert-email team@...
0 9 * * * /path/to/health-check.sh --daily-report --alert-email team@...
```

**Pros:** Independent of n8n, catches n8n-down scenarios.
**Cons:** Requires a server or CI runner, more maintenance.

### Approach C: Third-Party Monitoring (UptimeRobot / Betterstack)

Use a free-tier uptime monitor for the critical HTTP checks:
- UptimeRobot (free: 50 monitors, 5-min intervals)
- Betterstack (free: 10 monitors, 3-min intervals)

Configure monitors for: website, n8n base URL, Calendly, Tally.
Set up alert channels: email to team, optional Slack/Discord webhook.

**Pros:** Always-on, independent, free tier sufficient, nice dashboards.
**Cons:** HTTP-only (can't check n8n execution logs or Notion records).

### Recommended: A + C Combined

1. **UptimeRobot** for external availability (website, n8n, Calendly, Tally) — catches downtime even if n8n is dead
2. **n8n self-monitoring workflow** for execution health, Notion record counts, and daily digests — leverages existing tool

---

## Dashboard Layout (If Building a UI)

```
┌────────────────────────────────────────────────┐
│  Creative Hotline — Automation Health          │
│  Last checked: [timestamp]                     │
├────────────────────────────────────────────────┤
│                                                │
│  SERVICE STATUS                                │
│  ● Website        ● n8n         ● Stripe      │
│  ● Calendly       ● Tally       ● Claude API  │
│  ● Notion         ● SMTP                      │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│  PIPELINE TODAY                                │
│  New payments: 2    New bookings: 1            │
│  Intakes: 1         Calls completed: 0         │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│  WORKFLOW HEALTH (Last 24h)                    │
│  WF1 Stripe→Calendly    3/3 ✓                 │
│  WF2 Calendly→Payments  1/1 ✓                 │
│  WF3 Tally→Claude       1/1 ✓                 │
│  WF4 Laylo→Notion       0/0 (no triggers)     │
│  WF5 Booking Reminder   1/1 ✓                 │
│  WF6 Intake Reminder    1/1 ✓                 │
│  WF7 Lead Nurture       1/1 ✓                 │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│  ALERTS                                        │
│  ⚠ MX records missing for creativehotline.com │
│  ⚠ n8n trial expires in 2 days                │
│  ⚠ WF7 dedup not wired — may send duplicates  │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Implementation Priority

| Priority | Item | Effort |
|----------|------|--------|
| P1 | Set up UptimeRobot for website + n8n (free) | 15 min |
| P2 | Build n8n self-monitoring workflow (execution errors) | 1 hour |
| P3 | Add daily digest email with pipeline stats | 30 min |
| P4 | Expand health-check.sh with alert thresholds | 30 min |
| P5 | Build full dashboard UI | 4+ hours (defer) |
