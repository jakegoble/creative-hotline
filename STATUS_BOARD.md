# Creative Hotline — Shared Status Board
Last updated: 2026-02-21 15:00 PST

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

## Claude Code Session (Repo Tasks)
- [x] Task 1: STATUS_BOARD.md — DONE
- [x] Task 2: README.md — DONE (commit fd8286c)
- [x] Task 3: .env.example — DONE (commit fd8286c)
- [x] Task 4: n8n failure triage runbook — DONE (commit fd8286c)
- [x] Task 5: Laylo migration plan — DONE (commit fd8286c)
- [x] Task 6: Notion database schemas — DONE (commit fd8286c)
- [x] Task 7: Tech stack integration map — DONE (commit fd8286c)
- [x] Task 8: Workflow backup audit table — DONE (commit fd8286c)
- [x] Task 9: Frankie email templates — DONE (commit fd8286c)
- [x] Task 10: Client onboarding checklist — DONE (commit 0d36566)
- [x] Task 11: Automation health dashboard spec — DONE (commit 0d36566)

## Action Items

### URGENT
- **n8n trial expires ~Feb 23** — Jake must upgrade to Starter plan (€24/mo) ASAP. Community reports workflow loss after expiration. See docs/n8n-migration-guide.md for steps.

### NEEDS PLANNING
- **Starter plan limits to 5 active workflows** (currently 7). Need to consolidate WF5+WF6+WF7 into single "Daily Follow-Ups" workflow, or upgrade to Pro. Spec exists at docs/specs/workflow-consolidation-spec.md.

## Notes Between Sessions

### From Cowork → Claude Code (latest)
- WF5/WF6/WF7 dedup and IF node fixes were all completed in prior browser sessions — Claude Code's earlier notes were stale
- WF8 Notion filter and Send Thank You email node are fixed and published
- WF8 Mark Action Plan Sent node is actively being fixed right now
- Email forwarding is delegated to Megha (not blocked — PDF instructions already sent)

### From Claude Code → Cowork
- Laylo migration plan recommends Option B (replace with ManyChat → n8n) — see docs/laylo-migration-plan.md
- Launch readiness scorecard was corrected: n8n is NOT on Pro plan, still on expiring trial

## Files Created Across Sessions
| File | Description |
|------|-------------|
| STATUS_BOARD.md | This coordination file |
| README.md | Comprehensive repo overview |
| .env.example | Credential placeholders with comments |
| scripts/health-check.sh | Service health checker |
| docs/n8n-workflow-audit-summary.md | Audit tables for all 7 workflows |
| docs/tech-stack-integration-map.md | Tool-to-tool data flow diagram |
| docs/n8n-failure-triage-runbook.md | 7-step failure diagnosis guide |
| docs/client-lifecycle-automation.md | Full customer journey map |
| docs/notion-database-schemas.md | Both DB schemas with types and options |
| docs/laylo-migration-plan.md | Laylo status + 3 migration options |
| docs/email-templates-frankie.md | 3 new templates added (#8-10) |
| docs/client-onboarding-checklist.md | New client onboarding steps |
| docs/automation-health-dashboard-spec.md | Monitoring dashboard spec |
