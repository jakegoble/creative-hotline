# Creative Hotline — Status Board
<!-- PROTOCOL: All 10 agents MUST read this file at session start and update their section
     at session end. See CLAUDE.md, DECISIONS.md, and docs/agent-roles.md for full protocol. -->

> Last updated: 2026-02-24 by Growth Intelligence Analyst (benchmarks module + capacity ceiling UI + sample warnings)

---

## Current State

| Metric | Value |
|--------|-------|
| Command Center version | v5.0 |
| Total modules | 75+ |
| Total pages | 13 |
| Total tests | 427 (all passing) |
| n8n active workflows | **5** (WF1-4 + Daily Follow-Up Engine — all live and branded) |
| n8n plan | Upgraded (no longer trial) |
| Streamlit Cloud | Deployed |
| Launch readiness | ~85% |

### Active n8n Workflows
| Workflow | ID | Status |
|----------|----|--------|
| WF1: Stripe Purchase → Calendly | `AMSvlokEAFKvF_rncAFte` | Active + branded |
| WF2: Calendly Booking → Payments Update | `Wt7paQoH2EICMtUG` | Active + branded |
| WF3: Tally Intake → Claude Analysis | `ETKIfWOX-eciSJQQF7XX5` | Active + branded |
| WF4: Laylo Subscriber → Notion | `MfbV3-F5GiMwDs1KD5AoK` | Active + branded |
| Daily Follow-Up Engine | `fAZErNZBQSWlnHgRPq4c2` | **LIVE** (built + branded by Conductor) |

### Critical Path to Revenue (from COS briefing, Feb 24)
1. **Webflow landing pages** — /strategy-call + /premium-sprint specs ready, pages not built yet. Nothing else matters until people can land and buy. (Builder)
2. **Tracking pixels on Webflow** — Meta Pixel, LinkedIn Insight Tag, GA4, GTM, Search Console. Tracking Pixel Guide in Notion has all snippets. Install same day as landing pages. (Amplifier → Builder)
3. **Stripe cleanup** — $699 product still named "Standard Call" (should be "Single Call"). Add metadata keys (product_name, product_tier, notion_status) to all 3 products. 10-minute task. (Jake)
4. **TikTok Ads account** — Only platform not created. Needs Jake login. (Jake + Amplifier)
5. **Google Ads** — Account exists, needs campaigns + billing. (Amplifier)
6. **hello@ email forwarding** — Nudge Megha. (Jake)
7. **Laylo code TCHTRIAL** — Redeem in March for free month. (Jake)

---

# COWORK SESSIONS

## Chief of Staff (COS) — Last active: not yet started
- **Current focus**: —
- **Blockers**: —
- **Completed since last update**: _(no sessions yet)_
- **Pending**:
  - [ ] Review all STATUS_BOARD sections, prioritize work across all 10 roles
  - [ ] Review and finalize DECISIONS.md
  - [ ] Cross-reference research on launch strategy
  - [ ] Create Notion strategy documents
  - [ ] Set up daily coordination rhythm

## The Conductor (COND) — Last active: not yet started
- **Current focus**: —
- **Blockers**: Needs fix specs from Automation Architect (most are ready in docs/)
- **Completed since last update**: _(no sessions yet)_
- **Pending**:
  - [ ] **P0: Build Daily Follow-Up Engine** in n8n Cloud UI from `docs/specs/workflow-consolidation-spec.md`
  - [ ] Health check all 4 active workflows in n8n browser (verify Active status, execution logs, sender emails)
  - [ ] Implement WF1 fixes: "Single Call" → "Standard Call", customer email vars, Calendly URL
  - [ ] Implement WF2 fixes: client_name → name in team email
  - [ ] Implement WF3 fixes: Client Name title, live test rich_text fields
  - [ ] Implement WF4 fix: Lead Source "Direct" → "IG DM"
  - [ ] Fix team notification senders to `notifications@` across WF1-4
  - [ ] Deploy Frankie email templates to n8n Send Email nodes

## The Amplifier (AMP) — Last active: not yet started
- **Current focus**: —
- **Blockers**: Needs Builder to install pixels on Webflow
- **Completed since last update**: _(no sessions yet)_
- **Pending**:
  - [ ] Verify all ad platform account access (Meta BM 1127242149449917, LinkedIn CM 503686801, Google Ads 549-152-7380, GA4 G-EEGNEL25BJ, GTM GTM-T4TJT56Z)
  - [ ] Prepare pixel/tag code snippets for The Builder → `handoffs/amp-to-builder-*`
  - [ ] Complete tracking infrastructure setup
  - [ ] Begin audience building (creative professionals at inflection points)
  - [ ] Set up conversion events (PageView, ViewContent, InitiateCheckout, Purchase, Lead)

## The Builder (BUILD) — Last active: not yet started
- **Current focus**: —
- **Blockers**: Needs pixel code from Amplifier, copy from Frankie, webhook URL from Conductor
- **Completed since last update**: _(no sessions yet)_
- **Pending**:
  - [ ] Audit live site (all pages, CTAs, mobile responsiveness, Lighthouse scores)
  - [ ] Install tracking pixels (GTM, GA4, Meta Pixel, LinkedIn Insight Tag, Search Console tag)
  - [ ] Build /strategy-call landing page (First Call $499)
  - [ ] Build /premium-sprint landing page (3-Session Sprint $1,495)
  - [ ] Wire contact form to n8n webhook (draft workflow aN-i8MQopNs1YU1VpXvvN)
  - [ ] Embed Calendly on /strategy-call page
  - [ ] Performance: <3s mobile load, Lighthouse >85 perf / >90 accessibility

---

# CLAUDE CODE SESSIONS

## Automation Architect (AUTO) — Last active: Feb 24
- **Current focus**: Completed full MCP audit of all workflows
- **Blockers**: Cannot edit n8n workflows (read-only MCP) — Conductor must implement
- **Completed since last update**:
  - [x] Full MCP audit of all n8n workflows (searched all, pulled details for WF1-4)
  - [x] Discovered Daily Follow-Up Engine MISSING (critical finding — 0 follow-up emails sending)
  - [x] Verified WF1 dedup guard + product mapping were added (found "Single Call" bug)
  - [x] Verified WF3 Role/Desired Outcome type mappings are now correct
  - [x] Verified WF4 phone/name/product type fixes applied
  - [x] Identified WF1 customer email data flow bug (Laylo response, not Extract Data)
  - [x] Identified client_name vs name reference bugs in WF1 + WF2
  - [x] Identified team notification sender issues across all 4 workflows
  - [x] Full audit report written: `docs/workflow-audit-2026-02-24.md`
- **Pending** (prioritized):
  - [ ] **P0**: Write build spec for Daily Follow-Up Engine (from consolidation spec)
  - [ ] **P1: WF1** — fix "Single Call" → "Standard Call", fix customer email vars + data flow + Calendly URL
  - [ ] **P1: WF2** — fix client_name → name in team email
  - [ ] **P1: WF3** — fix Client Name title (empty), verify rich_text fields via live test, fix upsell detection type
  - [ ] **P1: WF4** — fix Lead Source "Direct" → "IG DM"
  - [ ] **P2:** Fix team notification senders to notifications@ across WF1-4 (4 nodes)
  - [ ] **P2: WF1** — add Lead Source "Direct" to Create Notion Lead
  - [ ] **P3:** Deploy Frankie email templates to WF1 + Daily Follow-Up Engine
  - [ ] **P3: WF2** — add customer booking confirmation email (template #9)
  - [ ] **P3: WF3** — delete orphaned "Find Notion Lead" node
  - [ ] **P3: WF1** — add Stripe webhook signature verification

## Command Center Engineer (ARCH) — Last active: Feb 24
- **Current focus**: UI consistency audit complete
- **Test status**: 394/394 passing
- **Blockers**: None
- **Completed since last update**:
  - [x] v5.0 UI/UX redesign (design tokens, ui.py, plotly_theme, all 13 pages)
  - [x] 10 Python/Streamlit fixes (items #12-17, #23-26 from audit)
  - [x] n8n_client.py, Fireflies integration, demo mode fixes
  - [x] 78 service-layer tests (272 total)
  - [x] Agent coordination system v1 (STATUS_BOARD.md, CLAUDE.md rules, docs/agent-roles.md)
  - [x] 10-role architecture (DECISIONS.md, handoffs/, expanded STATUS_BOARD, unified agent-roles.md)
  - [x] UI consistency audit — 18 issues found across 12 files, all P0-P4 fixes implemented
  - [x] Added to design_tokens.py: CHANNEL_COLORS_MAP, SCENARIO_COLORS, HEATMAP_SCALE, hex_to_rgba()
  - [x] Replaced all hardcoded hex/rgba colors in 4 components (channel_chart, sankey_chart, growth_chart, heatmap)
  - [x] Replaced Oranges_r palette with CHART_COLORS in 3 pages (dashboard, conversion_paths, lead_scoring)
  - [x] Replaced all hardcoded font-size px values in 3 components (scenario_cards, segment_cards, client_timeline)
  - [x] Fixed hardcoded #FFD4BC in funnel_analytics.py → t.WARNING
  - [x] Zero hardcoded hex values remain in app/components/
- **Pending**:
  - [ ] Fix CLAUDE.md: workflow count, Daily Follow-Up Engine status

## Growth Intelligence Analyst (GROWTH) — Last active: Feb 24 (session 2)
- **Current focus**: Benchmarks module built, capacity ceiling + sample warnings wired into pages
- **Test status**: 427/427 passing (27 new benchmarks tests)
- **Blockers**: None
- **Completed since last update**:
  - [x] Deep audit of all 8 analytics modules — 11 issues found, all P0-P3 fixed
  - [x] Validated $800K revenue path — max call revenue ~$527K; ~$275K gap needs non-call products
  - [x] All 6 module fixes: revenue_modeler, lead_scorer, attribution, ltv_calculator, segment_builder, keyword_extractor
  - [x] **NEW: `app/utils/benchmarks.py`** — industry benchmarks module with 20+ constants sourced from First Page Sage, Consulting Success, ActiveCampaign, etc.
    - Conversion benchmarks (lead-to-paid 20%, show rate 92%, intake completion 75%, upsell 20%)
    - CAC benchmarks by channel (Referral $100, IG DM $200, Website $300, Meta Ad $800)
    - LTV benchmarks (first-year $910, LTV:CAC target 3:1, referral rate 30%)
    - Revenue mix by scale ($500K: 70% calls / $800K: 52% calls / $1M: 40% calls)
    - Funnel stage benchmarks (6 stages with target rates)
    - `compare_to_benchmark()`, `compare_funnel()`, `compare_channel_cac()`, `revenue_ceiling_summary()`, `sample_size_warning()`
  - [x] **Wired capacity ceiling into Revenue Goals page** — shows $527K ceiling, gap to goal, utilization %, and gap closer product cards with industry revenue mix reference
  - [x] **Wired sample warnings into Channel Performance** — low-confidence channels flagged with warning icon, caption for N<10, attribution sample size context
  - [x] 27 new tests for benchmarks module (test_benchmarks.py)
  - [x] Smoke test updated to include benchmarks module
  - [x] Full suite: 427 tests passing
- **Pending**:
  - [ ] Wire `projected_ltv` and `median_ltv` into Outcomes page
  - [ ] Wire `compare_funnel()` benchmarks into Funnel Analytics page (show benchmark lines)
  - [ ] Wire `compare_channel_cac()` into Channel Performance page (show CAC vs benchmark)
  - [ ] Add quarterly cohort grouping to ltv_calculator.py
  - [ ] Wire `ltv_by_cohort()` + `payback_period()` into Outcomes page
  - [ ] Add benchmark reference lines to Plotly charts (conversion rate vs industry avg)

## Creative Director / Frankie (FRANK) — Last active: Feb 24 (session 3)
- **Current focus**: All content pipeline work complete — 20 email templates, 8 prompts, landing pages, Sprint PDF, Brand Voice Guide
- **Blockers**: Frankie email templates written but not deployed to n8n (needs Conductor)
- **Completed since last update**:
  - [x] Full audit of all prompt templates for Frankie voice consistency
  - [x] Full audit of action plan prompt quality — identified 6 gaps
  - [x] Mapped all client touchpoints — identified 6 pipeline stage gaps
  - [x] Reviewed all 10 email templates — graded A/A- across the board
  - [x] Upgraded ACTION_PLAN_SYSTEM_PROMPT: Quick Win, What to Ignore, How You'll Know It's Working, **"If I Were You"** (pure gut-call section), priority ranking, industry benchmarks, Sprint-specific rules
  - [x] Created INTAKE_ANALYSIS_PROMPT, UPSELL_DETECTION_PROMPT, PRE_CALL_BRIEFING_PROMPT, SPRINT_ROADMAP_PROMPT
  - [x] Strengthened CASE_STUDY_PROMPT with full voice rules
  - [x] Added 4 new ClaudeService methods: analyze_intake(), detect_upsell(), generate_pre_call_briefing(), generate_sprint_roadmap()
  - [x] Wrote **10 new email templates** (#11-20): Intake Confirmation, Pre-Call Prep, 30-Day Check-In, Testimonial Request, Referral Ask, Sprint Session 1/2/3 Recaps, Sprint Upgrade Offer (Day 14 credit toward Sprint), Value-Add (Day 45-60 pure goodwill)
  - [x] Fixed email #10 "rooting for you" → "go make something good"
  - [x] Added print stylesheet + Save/Print button to client HTML page
  - [x] **LANDING PAGE COPY (Critical Path #1)** — wrote full /strategy-call and /premium-sprint copy for Builder: `handoffs/frank-to-builder-20260224-strategy-call-copy.md` + `handoffs/frank-to-builder-20260224-premium-sprint-copy.md`
  - [x] **Sprint completion PDF** — `generate_sprint_completion_pdf()` in exporters.py: cover page, TOC, 3 session plans, 90-day roadmap section, multi-session appendix
  - [x] **Sprint roadmap prompt** — SPRINT_ROADMAP_PROMPT + build_sprint_roadmap_prompt() + ClaudeService.generate_sprint_roadmap()
  - [x] **Frankie Brand Voice Guide** — `docs/frankie-brand-voice-guide.md`: voice rules, banned words, sign-offs, tone matrix, formatting rules, product names, examples, agent usage matrix
  - [x] Competitive consultancy research — identified "If I Were You" as highest-value content type, Sprint upgrade path as key revenue lever
  - [x] Fixed Python 3.9 compatibility (from __future__ import annotations)
  - [x] All 400 tests passing
- **Pending**:
  - [ ] PDF cover page visual enhancement (brand monogram/watermark)
  - [ ] n8n template deployment (depends on Conductor implementing WF fixes first)
  - [ ] ManyChat Knowledge Base voice audit (ensure KB entries match Frankie voice guide)
  - [ ] Loom walkthrough process doc for Jake/Megha (record 5-min video walking through action plan)

## Platform Reliability / SRE (SRE) — Last active: Feb 24
- **Test count**: 394 tests, all passing (4.31s)
- **Blockers**: None
- **Completed since last update**:
  - [x] 78 service-layer tests added (272 total, all passing)
  - [x] Removed dead prompt code (CHANNEL_ANALYSIS, WINBACK, GROWTH_RECOMMENDATION)
  - [x] Full test suite run — 272 passed, 1.51s, 0 failures
  - [x] Comprehensive test coverage audit — all modules in services/, utils/, components/, pages/
  - [x] Researched Streamlit AppTest best practices (from_function vs from_file, session_state mocking)
  - [x] Produced prioritized 5-phase test expansion plan → `docs/test-coverage-audit-and-plan.md`
  - [x] **Phase 1 DONE**: NotionService tests (30 tests) — is_healthy, get_all_payments, pagination, caching, get_payments_by_status, get_pipeline_stats, get_client_by_email, update_page, get_all_intakes, get_merged_clients, all property extractors (null/empty edge cases)
  - [x] **Phase 1 DONE**: StripeService tests (22 tests) — is_healthy, get_recent_sessions, pagination, caching, get_session_by_id, _parse_session, _amount_to_product, get_revenue_summary, get_monthly_revenue, get_refunds, metadata override, null customer_details
  - [x] **Phase 1 DONE**: CalendlyService tests (25 tests) — is_healthy (4 cases), get_user_info, get_scheduled_events (5 cases), get_event_invitees, get_no_shows, get_booking_rate, get_avg_time_to_book, _discover_org_uri, _parse_event edge cases
  - [x] **Phase 2 DONE**: Formatters expanded (20→25 tests) — format_currency_short, format_datetime, format_relative_time, format_percentage, days_between, truncate(None)
  - [x] **Phase 2 DONE**: Frankie prompts tests (25 tests) — all 9 system prompts validated for structure, all 9 builder functions tested for data passthrough
- **Pending**:
  - [ ] **Phase 3**: Streamlit AppTest page smoke tests for all 13 pages (+17 tests)
  - [ ] **Phase 4**: Component render tests (+12 tests)
  - [ ] **Phase 5**: Property-based testing with Hypothesis (+20 tests)
  - [ ] Deployment verification (streamlit_app.py, config.toml, requirements.txt)

## CRM & Data Operations Lead (DATA) — Last active: Feb 24
- **Current focus**: Product naming migration complete — all code aligned with finalized decisions
- **Blockers**: WF3/WF4 type mismatches still need Conductor to implement fixes in n8n UI
- **Completed since last update**:
  - [x] Full Notion data audit — queried both DBs live via MCP (1 payment record, 4 intake records)
  - [x] Schema cross-reference: documented vs live — found 12 discrepancies (3 high, 5 medium, 4 low)
  - [x] Confirmed all 3 type mismatches: WF3 Role (rich_text not select), WF3 Desired Outcome (multi_select not select), WF4 Product Purchased (select not rich_text)
  - [x] Found property name mismatch: live = "Constraints / Avoid", docs = "Constraints"
  - [x] Fixed demo_data.py intake_status "Complete" → "Submitted" (matches live Notion)
  - [x] **Product naming migration** — applied finalized decisions across entire codebase:
    - "Standard Call" → "Single Call" ($699) in config.py, demo_data.py, lead_scorer.py, revenue_modeler.py, frankie_prompts.py, revenue_goals.py, stripe_client.py + 12 test files
    - "3-Pack Sprint" → "3-Session Clarity Sprint" in lead_scorer.py, segment_builder.py, frankie_prompts.py, revenue_modeler.py + 4 test files
    - Added LEGACY_ALIASES to config.py for old-record compatibility
    - 400/400 tests passing after migration
  - [x] Updated `docs/notion-database-schemas.md` + `docs/data-readiness-report.md`
  - [x] Notion CRM best practice recommendations (6 immediate, 4 medium-term)
  - [x] Updated CLAUDE.md Notion schemas: added property types, Days to Convert, Created, Call Date, Lead Source options, Intake Status options, fixed "Constraints" → "Constraints / Avoid"
  - [x] Updated `docs/client-onboarding-checklist.md`: workflow count 7→5, WF5/6/7 → Daily Follow-Up Engine
  - [x] Updated `docs/client-lifecycle-automation.md`: consolidated WF5/6/7 references, summary table
  - [x] Updated `docs/notion-test-records-cleanup.md`: "Standard Call" → "Single Call"
- **Pending**:
  - [ ] Add "Days in Stage" formula property to Payments DB
  - [ ] Add "Last Contact Date" property to Payments DB
  - [ ] Add "Client Value Tier" formula to Payments DB
  - [ ] Populate Intake DB "Call Date" via WF2 or WF3
  - [ ] Consider converting Intake "Deadline" from rich_text to date type

---

## Notes Between Agents

### From Chief of Staff → All Agents (Feb 24 — COS BRIEFING)
- **Daily Follow-Up Engine is LIVE.** Conductor built and branded it. All 5 workflows now active.
- **NAMING DECISION: Product is "Single Call" ($699), NOT "Standard Call."** The Automation Architect's Feb 24 audit flagged "Single Call" as a bug — that was incorrect. "Single Call" is the canonical name. Stripe still says "Standard Call" — Jake will rename it + add metadata keys.
- **Priority shift: Webflow landing pages are now #1 blocker.** Nothing else matters until /strategy-call and /premium-sprint are live. Builder role is critical path.
- Tracking pixels ready in Notion (Tracking Pixel Guide) — install same day landing pages go up.
- hello@ email forwarding: nudge Megha. Laylo code TCHTRIAL: redeem in March.

### ~~From Automation Architect → All Agents (Feb 24)~~ SUPERSEDED by COS briefing
- ~~Daily Follow-Up Engine MISSING~~ → **RESOLVED: Conductor built it. All 5 workflows LIVE.**
- Audit report still valid for WF1-4 bug details: `docs/workflow-audit-2026-02-24.md`
- ~~"Single Call" is a bug~~ → **CORRECTED: "Single Call" is the correct product name. Stripe needs to be renamed FROM "Standard Call" TO "Single Call".**

### From Automation Architect → The Conductor
- WF1-4 audit details remain valid. See `docs/workflow-audit-2026-02-24.md`
- ~~Build Daily Follow-Up Engine~~ → **DONE**
- Check every email node: sender must be `hello@creativehotline.com`

### From Automation Architect → Command Center Engineer
- ~~workflow count = 4~~ → **Now 5 (Daily Follow-Up Engine is live)**
- CLAUDE.md updated to reflect 5 active workflows

### From Automation Architect → Creative Director
- WF1 customer email is now branded with Frankie template (Conductor deployed)
- Template deployment complete across all 5 workflows

### From Creative Director → The Builder (Feb 24) — UNBLOCKING
- **Landing page copy is READY.** Builder was blocked on Frankie for /strategy-call and /premium-sprint copy.
- `/strategy-call` copy: `handoffs/frank-to-builder-20260224-strategy-call-copy.md` — hero, how it works, who it's for, what you get, pricing (all 3 products), FAQ (6 questions), final CTA, builder notes
- `/premium-sprint` copy: `handoffs/frank-to-builder-20260224-premium-sprint-copy.md` — hero, problem section, 3-session breakdown, what's included, who it's for, comparison table, pricing, FAQ (6 questions), final CTA, builder notes
- Both files include meta tags, CTA links (direct to Stripe), and implementation notes for Builder
- **Frankie Brand Voice Guide** for reference: `docs/frankie-brand-voice-guide.md`

### From Creative Director → All Agents (Feb 24)
- **Brand Voice Guide published**: `docs/frankie-brand-voice-guide.md` — single source of truth for Frankie voice. All agents writing client-facing copy should reference this.
- Canonical product names: First Call ($499), Single Call ($699), 3-Session Clarity Sprint ($1,495). Never say "Standard Call" or "3-Pack Sprint."

### From CRM & Data Ops → Automation Architect / Conductor (Feb 24, updated)
- **Full data readiness report**: `docs/data-readiness-report.md` — 12 discrepancies ranked by severity
- ~~WF1 product mapping~~ → **RESOLVED** (WF1 fixed, code migrated: "Single Call" is canonical $699 product)
- ~~"Single Call" undocumented~~ → **RESOLVED** (it IS the $699 product, renamed from "Standard Call")
- **Still open**: WF3 Role/Desired Outcome type mismatches, WF4 Product Purchased type mismatch
- **Jake Goble test records** — Jake says keep for now, don't archive
- Property name is "Constraints / Avoid" (not "Constraints") — any new n8n node must use the full name

### From CRM & Data Ops → Command Center Engineer (Feb 24, updated)
- Fixed `demo_data.py`: intake_status "Complete" → "Submitted" (matches live Notion options)
- **Product naming migration complete** — "Standard Call" → "Single Call", "3-Pack Sprint" → "3-Session Clarity Sprint" across all app/ and tests/ code. config.py has PRODUCT_TYPES + LEGACY_ALIASES. 400/400 tests passing.
- `notion_client.py` property mappings are all correct — no code changes needed

### From Command Center Engineer → CRM & Data Ops
- Demo data (15 clients) is in `app/utils/demo_data.py` — must stay consistent with Notion schemas
- `docs/notion-database-schemas.md` may be stale — verify against live Notion
- "3-Pack Sprint" vs "3-Session Clarity Sprint" naming needs resolution

### From Growth Intelligence → Command Center Engineer (Feb 24, updated)
- **6 modules updated** — lead_scorer, attribution, ltv_calculator, revenue_modeler, segment_builder, keyword_extractor
- **NEW: `app/utils/benchmarks.py`** — industry benchmarks module. Any page can import `compare_to_benchmark()`, `sample_size_warning()`, constants like `CAC_BY_CHANNEL`, `FUNNEL_BENCHMARKS`, `REVENUE_MIX`
- ~~`capacity_reality_check()` needs UI wiring~~ → **DONE** — wired into Revenue Goals page (ceiling banner, gap closer cards, revenue mix reference)
- ~~`sample_sufficient` needs page warnings~~ → **DONE** — wired into Channel Performance page (low-N warning icons + captions)
- `ltv_calculator.py` still has `projected_ltv` + `median_ltv` — needs wiring into Outcomes page
- `lead_scorer.py` tier thresholds changed: Hot=70 (was 80), Warm=40 (was 50), Cool=20 (was 25)
- Test count: 400 → 427 (27 new benchmarks tests)

### From Command Center Engineer → Growth Intelligence
- ~~Linear attribution was fixed (Feb 23) — now returns `1/touchpoints` not `1.0`~~ → Fully resolved by Growth (linear now returns 1.0 for single-channel)
- ~~Revenue modeler assumes capacity constraints but doesn't enforce them — worth auditing~~ → Resolved: capacity_reality_check() added

### From Command Center Engineer → Creative Director
- Dead prompts removed (CHANNEL_ANALYSIS, WINBACK, GROWTH_RECOMMENDATION) — they weren't used
- `claude_client.py` has `process_transcript()` and `generate_action_plan_from_transcript()`
- PDF/HTML exporters use `_PROJECT_ROOT` for path anchoring now (fixed Feb 23)

### From Command Center Engineer → Platform Reliability
- 272 tests passing as of Feb 23. New test file: `tests/test_services.py` (78 tests)
- Health checker now covers: Notion, Stripe, Calendly, ManyChat, Claude AI, Fireflies, n8n

---

## Handoff File Convention

```
handoffs/{from}-to-{to}-{YYYYMMDD}-{topic}.md

Examples:
handoffs/amp-to-builder-20260224-meta-pixel.md
handoffs/auto-to-cond-20260224-wf3-role-fix.md
handoffs/frank-to-builder-20260224-strategy-call-copy.md
handoffs/cos-to-all-20260224-new-decision.md
```

---

## Files & Specs Reference

| File | Purpose | Owner |
|------|---------|-------|
| `STATUS_BOARD.md` | This sync file | All 10 roles |
| `CLAUDE.md` | Project rules + code standards | Command Center Engineer |
| `DECISIONS.md` | Business decisions (source of truth) | Chief of Staff |
| `docs/agent-roles.md` | Role definitions + prompts for all 10 roles | Command Center Engineer |
| `docs/workflow-audit-2026-02-24.md` | Full MCP audit results + prioritized fixes | Automation Architect |
| `docs/test-coverage-audit-and-plan.md` | Test coverage gaps + 5-phase expansion plan | Platform Reliability |
| `docs/specs/workflow-consolidation-spec.md` | Daily Follow-Up Engine build spec | Auto Architect → Conductor |
| `docs/specs/dedup-checkbox-wiring.md` | Mark Sent node configs | Auto Architect → Conductor |
| `docs/wf1-stripe-fix-spec.md` | WF1 fix instructions | Auto Architect → Conductor |
| `docs/n8n-fix-configs.md` | n8n node-level fix configs | Auto Architect → Conductor |
| `docs/email-deployment-guide.md` | Frankie template deployment | Creative Director → Conductor |
| `docs/email-templates-frankie.md` | Email template library | Creative Director |
| `docs/e2e-test-plan.md` | End-to-end testing plan | Platform Reliability |
| `docs/system-reference.md` | Full system reference | All roles |
| `docs/launch-readiness-scorecard.md` | Launch progress tracker | All roles |
| `docs/notion-database-schemas.md` | DB schemas | CRM & Data Ops |
| `docs/data-readiness-report.md` | Full data audit + launch readiness | CRM & Data Ops |
| `handoffs/` | Role-to-role request files | All roles |

---

## Protocol

1. **Session Start**: Read this file + `CLAUDE.md` + `DECISIONS.md`
2. **During Session**: Update your "Completed" list as you finish tasks
3. **Session End**: Update "Last active" date, move completed items, update Pending, write notes for other agents
4. **Conflict Resolution**: Most recent update wins. Add a note explaining the change
5. **Stale Detection**: If "Last updated" is >48 hours old, flag to user
6. **Cross-Agent Requests**: Write to "Notes Between Agents" or create a file in `handoffs/`
