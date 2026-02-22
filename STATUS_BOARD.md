# Creative Hotline — Shared Status Board
Last updated: 2026-02-21 (evening)

## Cowork Session (Browser Tasks)
- [x] WF5 dedup filter wired — DONE (prior session)
- [x] WF6 dedup filter wired — DONE (prior session)
- [x] WF7 IF node fixed — DONE (prior session)
- [x] WF8 Notion filter + Send Thank You email — DONE and PUBLISHED
- [ ] WF8 Mark Action Plan Sent node — IN PROGRESS (Cowork actively fixing in browser)
- [ ] Add Tally link to Calendly confirmation — PENDING (browser task)
- [x] Email forwarding PDF for Megha — DELEGATED (PDF instructions sent, Megha to configure GoDaddy MX records)
- [x] Client lifecycle automation map — DONE
- [x] 4-way cross reference (intake form delivery) — DONE
- [x] Frankie email template library PDF — DONE
- [x] Monitoring script — DONE
- [x] Delete WF8 + WF9 from n8n — DONE (Feb 21)
- [ ] Consolidate WF5+WF6+WF7 into Daily Follow-Ups — PENDING (spec ready at docs/specs/workflow-consolidation-spec.md)
- [ ] Add "Mark Sent" nodes to WF5/WF6/WF7 — PENDING (spec at docs/specs/dedup-checkbox-wiring.md)
- [ ] Reconnect Laylo to Instagram — PENDING
- [ ] WF1 sender email fix (jake@radanimal.co → hello@creativehotline.com) — PENDING
- [ ] WF4 phone/name/product type fixes — PENDING

## Claude Code Session (Repo Tasks)

### Documentation (Complete)
- [x] STATUS_BOARD.md — DONE
- [x] README.md — DONE (commit fd8286c)
- [x] .env.example — DONE (commit fd8286c)
- [x] n8n failure triage runbook — DONE (commit fd8286c)
- [x] Laylo migration plan — DONE (commit fd8286c)
- [x] Notion database schemas — DONE (commit fd8286c)
- [x] Tech stack integration map — DONE (commit fd8286c)
- [x] Workflow backup audit table — DONE (commit fd8286c)
- [x] Frankie email templates — DONE (commit fd8286c)
- [x] Client onboarding checklist — DONE (commit 0d36566)
- [x] Automation health dashboard spec — DONE (commit 0d36566)

### Command Center App (Complete)
- [x] Full Streamlit platform — 25 modules, 7 pages (commit 9f9f175)
- [x] Services: Notion, Stripe, Calendly, ManyChat, Claude, Cache, Health
- [x] Pages: Dashboard, Clients, Pipeline, Action Plans, Lead Scoring, Health, Settings
- [x] Components: Timeline, KPI Cards, Funnel Chart, Cohort Table, Revenue Forecast
- [x] Utils: Lead Scorer, Frankie Prompts, Exporters, Formatters
- [x] Webhook receiver for n8n cache invalidation
- [x] Python 3.9 compatibility (from __future__ import annotations)
- [x] Test suite: 37 tests, all passing

## Resolved Items

### n8n Trial — UPGRADED
~~n8n trial expires ~Feb 23~~ — **UPGRADED** (confirmed Feb 21). No longer a blocker.

## Next Actions

### Cowork (Browser)
1. Consolidate WF5+WF6+WF7 into "Daily Follow-Ups" (spec ready) — needed if on Starter plan (5 active limit)
2. Add "Mark Sent" nodes (dedup) — spec has exact node configs
3. Fix WF1 sender email
4. Fix WF4 phone/name/product mappings
5. Reconnect Laylo to Instagram
6. Add Tally link to Calendly confirmation page

### Jake/Megha
1. Populate `.env` with real API keys (Notion, Stripe, Calendly, Anthropic)
2. Run `pip install -r requirements.txt && streamlit run app/main.py` to launch Command Center
3. Deploy to Streamlit Cloud when ready
4. Fix website pricing page (Marketio title, $499/$500/$599 inconsistency)
5. Megha: configure hello@ email forwarding via GoDaddy MX records

## Notes Between Sessions

### From Cowork → Claude Code (latest)
- WF5/WF6/WF7 dedup and IF node fixes were all completed in prior browser sessions
- WF8 Notion filter and Send Thank You email node are fixed and published
- WF8 Mark Action Plan Sent node is actively being fixed

### From Claude Code → Cowork
- Command Center app is fully built and tested — ready for API keys
- Consolidation spec at `docs/specs/workflow-consolidation-spec.md` has exact node configs for n8n UI
- Dedup wiring spec at `docs/specs/dedup-checkbox-wiring.md` has exact Notion Update configs
- n8n upgrade confirmed — update scorecard accordingly

## Files Created Across Sessions
| File | Description |
|------|-------------|
| STATUS_BOARD.md | This coordination file |
| README.md | Comprehensive repo overview |
| .env.example | Credential placeholders with comments |
| scripts/health-check.sh | Service health checker |
| app/ (25 modules) | Command Center Streamlit platform |
| tests/ (4 test files) | 37 tests for scorer, cache, formatters, exporters |
| webhook_receiver.py | n8n cache invalidation endpoint |
| requirements.txt | Python dependencies |
| .streamlit/config.toml | Brand theme config |
| docs/n8n-workflow-audit-summary.md | Audit tables for all 7 workflows |
| docs/tech-stack-integration-map.md | Tool-to-tool data flow diagram |
| docs/n8n-failure-triage-runbook.md | 7-step failure diagnosis guide |
| docs/client-lifecycle-automation.md | Full customer journey map |
| docs/notion-database-schemas.md | Both DB schemas with types and options |
| docs/laylo-migration-plan.md | Laylo status + 3 migration options |
| docs/email-templates-frankie.md | 3 new templates added (#8-10) |
| docs/client-onboarding-checklist.md | New client onboarding steps |
| docs/automation-health-dashboard-spec.md | Monitoring dashboard spec |
| docs/specs/workflow-consolidation-spec.md | WF5+6+7 merge spec |
| docs/specs/dedup-checkbox-wiring.md | Mark Sent node configs |
| docs/wf567-consolidated-spec.md | Consolidated workflow detail |
| docs/launch-readiness-scorecard.md | Launch readiness (78%) |
