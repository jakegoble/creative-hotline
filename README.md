# The Creative Hotline

Operations repo + Command Center for The Creative Hotline — a creative consultancy where clients book 45-minute creative direction calls, receive an AI-analyzed pre-call briefing, and get a custom action plan within 24 hours.

**Team:** Jake Goble (jake@radanimal.co) · Megha (megha@theanecdote.co)
**Website:** https://www.thecreativehotline.com
**Instagram:** @creative.hotline

---

## Command Center (Streamlit App)

A full-stack internal dashboard for managing clients, revenue, lead intelligence, and AI-generated action plans.

### Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Fill in: NOTION_API_KEY, STRIPE_SECRET_KEY, CALENDLY_API_KEY, ANTHROPIC_API_KEY

# 3. Launch
streamlit run app/main.py
```

### Pages

| Page | What It Does |
|------|-------------|
| **Dashboard** | 6 KPI cards + revenue trend, pipeline funnel, lead source, conversion metrics |
| **Clients** | Client list with search/filter + full detail view with journey timeline |
| **Pipeline** | Funnel visualization, drop-off analysis, cohort tracking |
| **Action Plans** | Select client → enter call notes → Claude generates Frankie-voiced plan → PDF download |
| **Lead Scoring** | 5-category scoring (Engagement/Velocity/Urgency/Source/Upsell), attribution charts, ICP analysis |
| **System Health** | Service status for all integrations, cache stats |
| **Settings** | API connection status, database IDs, cache management |

### Architecture

```
app/
├── main.py                      # Entry point, page router, sidebar
├── config.py                    # Env vars, constants, feature flags
├── services/
│   ├── notion_client.py         # Notion API (Payments + Intake DBs)
│   ├── stripe_client.py         # Stripe API (revenue source of truth)
│   ├── calendly_client.py       # Calendly API (bookings, no-shows)
│   ├── manychat_client.py       # ManyChat API (DM stats, keywords)
│   ├── claude_client.py         # Anthropic API (action plan generation)
│   ├── cache_manager.py         # 3-tier TTL cache + webhook invalidation
│   └── health_checker.py        # Per-service health monitoring
├── pages/
│   ├── dashboard.py             # Main KPI dashboard
│   ├── clients.py               # Client list + detail + journey timeline
│   ├── pipeline.py              # Funnel + cohort view
│   ├── action_plans.py          # AI action plan generator + PDF export
│   ├── lead_scoring.py          # Lead intelligence panel
│   ├── health.py                # System health panel
│   └── settings.py              # Configuration
├── components/
│   ├── client_timeline.py       # Visual vertical timeline
│   ├── kpi_cards.py             # Metric card components
│   ├── funnel_chart.py          # Plotly funnel
│   ├── cohort_table.py          # Cohort analysis
│   └── revenue_forecast.py      # Revenue projection
└── utils/
    ├── lead_scorer.py           # 5-category scoring algorithm
    ├── frankie_prompts.py       # Frankie voice prompts for Claude
    ├── formatters.py            # Date, currency, text formatters
    └── exporters.py             # PDF generation (ReportLab) + plan versioning
```

### Tests

```bash
python3 -m pytest tests/ -v
# 37 tests: lead scorer, cache manager, formatters, PDF export
```

### Deploy to Streamlit Cloud

1. Push repo to GitHub
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Connect the repo, set main file to `streamlit_app.py`
4. Add environment variables (Notion, Stripe, Calendly, Anthropic API keys)
5. Deploy

### Webhook Receiver (Optional)

For real-time cache invalidation when n8n workflows fire:

```bash
python webhook_receiver.py
# Listens on port 8765
# Add HTTP Request nodes to WF1-WF4 in n8n pointing to /webhook
```

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| [n8n Cloud](https://creativehotline.app.n8n.cloud) | Workflow automation (7 active workflows) |
| [Notion](https://notion.so) | CRM — Payments DB + Intake DB |
| [Stripe](https://stripe.com) | Payment processing ($499 / $699 / $1,495) |
| [Calendly](https://calendly.com/soscreativehotline/creative-hotline-call) | Call booking (45-min sessions) |
| [Tally](https://tally.so/r/b5W1JE) | Pre-call intake form |
| [ManyChat](https://app.manychat.com) | Instagram DM automation |
| Laylo | IG keyword drops (currently disconnected) |
| [Webflow](https://www.thecreativehotline.com) | Marketing website |
| Claude API | Intake analysis + action plan generation |

## Customer Pipeline

```
Instagram / Website / Referral
  → Stripe payment (or Laylo keyword capture)
  → Notion record created (Payments DB)
  → Calendly booking link emailed
  → Customer books 45-min call
  → Tally intake form submitted
  → Claude AI analyzes intake, flags upsells
  → Call happens
  → Action plan delivered within 24hrs
```

## n8n Workflows

| # | Workflow | Trigger | Schedule |
|---|----------|---------|----------|
| WF1 | Stripe Purchase → Calendly Link | Stripe webhook | On event |
| WF2 | Calendly Booking → Payments Update | Calendly webhook | On event |
| WF3 | Tally Intake → Claude Analysis | Tally webhook | On event |
| WF4 | Laylo Subscriber → Notion Lead | Laylo webhook | On event |
| WF5 | Paid But Never Booked Reminder | Schedule | Daily 9am |
| WF6 | Booked But No Intake Reminder | Schedule | Daily 8am |
| WF7 | Laylo Lead Nurture | Schedule | Daily 10am |

## Notion Databases

**Payments DB** (`3030e73ffadc80bcb9dde15f51a9caf2`) — Master CRM. Every customer and lead gets a record here.

Pipeline statuses: `Lead - Laylo` → `Paid - Needs Booking` → `Booked - Needs Intake` → `Intake Complete` → `Ready for Call` → `Call Complete`

**Intake DB** (`2f60e73ffadc806bbf5ddca2f5c256a3`) — Pre-call questionnaire responses + AI analysis.

See [docs/notion-database-schemas.md](docs/notion-database-schemas.md) for full property schemas.

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in credentials:
   ```bash
   cp .env.example .env
   ```
3. Key credentials needed:
   - **Notion integration token** — Settings → Integrations in Notion
   - **Stripe secret key** — Developers → API keys in Stripe
   - **Calendly API key** — Integrations → API in Calendly
   - **Anthropic API key** — For Claude action plan generation
   - **n8n API key** (optional) — Settings → API in n8n Cloud
   - **ManyChat API key** (optional) — Settings → API in ManyChat

## Health Check

```bash
# Basic check (no API keys needed)
./scripts/health-check.sh

# Full check with n8n API
N8N_API_KEY=your_key ./scripts/health-check.sh
```

## Key Docs

| Need to... | Read this |
|------------|-----------|
| Understand the full system | [system-reference.md](docs/system-reference.md) |
| See what's broken and prioritized | [launch-readiness-scorecard.md](docs/launch-readiness-scorecard.md) |
| Fix an n8n workflow failure | [n8n-failure-triage-runbook.md](docs/n8n-failure-triage-runbook.md) |
| See all n8n issues | [n8n-workflow-audit.md](docs/n8n-workflow-audit.md) |
| Understand the customer journey | [client-lifecycle-automation.md](docs/client-lifecycle-automation.md) |
| Get email templates | [email-templates-frankie.md](docs/email-templates-frankie.md) |
| Consolidate follow-up workflows | [workflow-consolidation-spec.md](docs/specs/workflow-consolidation-spec.md) |
| Check coordination status | [STATUS_BOARD.md](STATUS_BOARD.md) |

## Known Priorities

1. **Consolidate WF5+WF6+WF7** into single Daily Follow-Ups — fits 5-workflow limit. Spec ready.
2. **hello@creativehotline.com has no MX records** — Customer replies bounce. Delegated to Megha.
3. **3 Notion type mismatches** in WF3 and WF4 — See [n8n-fix-configs.md](docs/n8n-fix-configs.md)
4. **Dedup "Mark Sent" nodes** still needed in WF5/WF6/WF7 — See [dedup-checkbox-wiring.md](docs/specs/dedup-checkbox-wiring.md)
5. **Website contact form** not connected to pipeline
6. **Laylo disconnected from Instagram** — Keyword drops non-functional

## Brand Voice

All customer-facing copy uses the **Frankie** persona: warm, witty, confident, zero buzzwords, no motivational language. See [email-templates-frankie.md](docs/email-templates-frankie.md) for examples.
