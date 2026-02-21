# The Creative Hotline

Operations repo for The Creative Hotline — a creative consultancy where clients book 45-minute creative direction calls, receive an AI-analyzed pre-call briefing, and get a custom action plan within 24 hours.

**Team:** Jake Goble (jake@radanimal.co) · Megha (megha@theanecdote.co)
**Website:** https://www.thecreativehotline.com
**Instagram:** @creative.hotline

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
| Claude API | Intake analysis + upsell detection |

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

## Repo Structure

```
creative-hotline/
├── CLAUDE.md                  # Claude Code project context
├── .env.example               # Environment variable template
├── .gitignore
│
├── scripts/
│   └── health-check.sh        # Service health checker (website, n8n, webhooks, APIs)
│
└── docs/
    ├── system-reference.md            # Master technical reference (workflow specs, schemas, email map)
    ├── morning-report.md              # Daily summary with prioritized actions
    ├── launch-readiness-scorecard.md  # Launch checklist with readiness scores
    │
    ├── n8n Workflows
    │   ├── n8n-workflow-audit.md          # Full 30-issue audit with node maps
    │   ├── n8n-workflow-audit-summary.md  # Condensed audit summary tables
    │   ├── n8n-workflow-backup.md         # Full workflow JSON exports
    │   ├── n8n-fix-configs.md             # Copy-paste fix instructions
    │   ├── n8n-node-fix-specs.md          # Per-node fix specifications
    │   ├── n8n-failure-triage-runbook.md  # 7-step failure diagnosis guide
    │   ├── n8n-migration-guide.md         # Trial → Starter upgrade steps
    │   └── workflow-testing-checklist.md  # Per-workflow test plan with payloads
    │
    ├── Architecture
    │   ├── tech-stack-integration-map.md  # How every tool connects
    │   ├── client-lifecycle-automation.md # Full client journey automation map
    │   ├── email-sequence-map.md          # Customer journey email timeline
    │   └── workflow-health-check.md       # Workflow health status
    │
    ├── Notion
    │   ├── notion-database-schemas.md     # Full DB schemas with types + options
    │   ├── notion-audit.md                # Notion configuration audit
    │   ├── notion-data-quality-report.md  # Test records + cleanup steps
    │   └── notion-test-records-cleanup.md # Test data removal guide
    │
    ├── Email
    │   ├── email-templates-frankie.md     # 10 HTML email templates (Frankie voice)
    │   ├── email-audit-findings.md        # Email configuration issues
    │   ├── email-deployment-guide.md      # Email setup instructions
    │   └── email-forwarding-gap.md        # MX record / forwarding issues
    │
    ├── Stripe
    │   ├── stripe-product-setup-guide.md  # Product/price/link configuration
    │   ├── stripe-product-mapping.md      # Stripe → Notion product mapping
    │   ├── stripe-launch-checklist.md     # Stripe go-live checklist
    │   └── wf1-stripe-fix-spec.md         # WF1 Stripe webhook fixes
    │
    ├── Website
    │   ├── webflow-dev-handoff.md         # 8 items for Webflow dev
    │   ├── seo-recommendations.md         # SEO audit + fix instructions
    │   ├── website-pricing-audit.md       # Pricing inconsistency findings
    │   └── cowork-browser-audit.md        # Browser verification results
    │
    ├── Integrations
    │   ├── manychat-n8n-integration.md    # ManyChat → n8n webhook spec
    │   ├── manychat-kb-entries.md         # ManyChat knowledge base content
    │   └── contact-form-webhook-spec.md   # Webflow contact form → n8n spec
    │
    ├── AI
    │   └── claude-prompt-optimized.md     # Improved WF3 Claude prompt
    │
    ├── Specs
    │   ├── workflow-consolidation-spec.md # WF5+6+7 consolidation plan
    │   ├── dedup-checkbox-wiring.md       # Dedup flag implementation
    │   └── n8n-error-handler-spec.md      # Error handling patterns
    │
    ├── Rebuild Specs
    │   ├── workflow-rebuild-specs.md       # WF8 + WF9 rebuild specs
    │   ├── wf8-rebuild-spec.md            # Calendly → Tally rebuild
    │   ├── wf9-rebuild-spec.md            # Post-Call Follow-Up rebuild
    │   └── wf567-consolidated-spec.md     # Daily Follow-Ups consolidation
    │
    ├── Launch
    │   ├── launch-runbook.md              # Step-by-step launch procedure
    │   ├── e2e-test-plan.md               # End-to-end testing plan
    │   └── test-payloads.md               # Sample webhook payloads
    │
    ├── Diagrams
    │   ├── diagram-customer-journey.mermaid
    │   ├── diagram-data-flow.mermaid
    │   └── diagram-failure-states.mermaid
    │
    ├── Session Logs
    │   └── cowork-session-2026-02-21.md   # Cowork pair-programming log
    │
    ├── Postmortems
    │   └── (incident reports as needed)
    │
    └── Coordination
        ├── overnight-coordination.md      # Async handoff notes
        └── overnight-team-log.md          # Team activity log
```

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in credentials:
   ```bash
   cp .env.example .env
   ```
3. Key credentials needed:
   - **n8n API key** — Settings → API in n8n Cloud
   - **Notion integration token** — Settings → Integrations in Notion
   - **SMTP credentials** — For email sending via n8n
   - **Anthropic API key** — For Claude AI intake analysis

## Health Check

Run the service health checker to verify all integrations:

```bash
# Basic check (no API keys needed)
./scripts/health-check.sh

# Full check with n8n API
N8N_API_KEY=your_key ./scripts/health-check.sh
```

Checks: website availability, MX records, n8n instance, webhook endpoints, Calendly, Tally, Stripe API, Claude API, Notion API.

## Key Docs

| Need to... | Read this |
|------------|-----------|
| Understand the full system | [system-reference.md](docs/system-reference.md) |
| See what's broken and prioritized | [morning-report.md](docs/morning-report.md) |
| Fix an n8n workflow failure | [n8n-failure-triage-runbook.md](docs/n8n-failure-triage-runbook.md) |
| See all n8n issues | [n8n-workflow-audit.md](docs/n8n-workflow-audit.md) |
| Understand the customer journey | [client-lifecycle-automation.md](docs/client-lifecycle-automation.md) |
| Check launch readiness | [launch-readiness-scorecard.md](docs/launch-readiness-scorecard.md) |
| Get email templates | [email-templates-frankie.md](docs/email-templates-frankie.md) |
| Upgrade n8n from trial | [n8n-migration-guide.md](docs/n8n-migration-guide.md) |

## Known Priorities

1. **n8n trial expires ~Feb 23, 2026** — Upgrade to Starter plan (€24/mo)
2. **Starter plan limits to 5 active workflows** — Consolidate WF5+WF6+WF7 into single Daily Follow-Ups
3. **hello@creativehotline.com has no MX records** — Customer replies bounce
4. **3 Notion type mismatches** in WF3 and WF4 — See [n8n-fix-configs.md](docs/n8n-fix-configs.md)
5. **Dedup flags partially wired** — WF5/WF6 filters done, WF7 + all "Mark Sent" nodes still needed
6. **Website contact form** not connected to pipeline
7. **Laylo disconnected from Instagram** — Keyword drops non-functional

## Brand Voice

All customer-facing copy uses the **Frankie** persona: warm, witty, confident, zero buzzwords, no motivational language. See [email-templates-frankie.md](docs/email-templates-frankie.md) for examples.
