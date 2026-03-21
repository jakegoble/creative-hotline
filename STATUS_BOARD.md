# Creative Hotline — Status Board
<!-- PROTOCOL: All 10 agents MUST read this file at session start and update their section
     at session end. See CLAUDE.md, DECISIONS.md, and docs/agent-roles.md for full protocol. -->

> Last updated: 2026-02-25 by Command Center Engineer (session 3 — UI audit fixes, deployment verification, performance research, 505 tests)

---

## Current State

| Metric | Value |
|--------|-------|
| Command Center version | v5.1 |
| Total modules | 75+ |
| Total pages | 14 |
| Total tests | 505 (all passing) |
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
3. ~~**Stripe cleanup**~~ — DONE. Stripe already renamed to "Single Call" + metadata applied.
4. **TikTok Ads account** — Only platform not created. Needs Jake login. (Jake + Amplifier)
5. **Google Ads** — Account exists, needs campaigns + billing. (Amplifier)
6. **hello@ email forwarding** — Nudge Megha. (Jake)
7. **Laylo code TCHTRIAL** — Redeem in March for free month. (Jake)

### Growth Action Plan (Feb 25) — `docs/growth-action-plan.md`
12 initiatives across 4 phases. All roles have specific instructions. Phase 0 (launch foundation) must complete before Phase 1.
- **Phase 1 (Week 1-2):** Referral program, AI content repurposing, Reddit monitoring, lead enrichment (Apollo), VIP Day ($2,995)
- **Phase 2 (Week 2-4):** 7-email nurture sequence, AI Brand Audit page, Instagram carousel ads
- **Phase 3 (Week 4-8):** Automated $299 Brand Audit product, community membership, Apify lead scraping, private podcast

---

# COWORK SESSIONS

## Chief of Staff (COS) — Last active: not yet started
- **Current focus**: —
- **Blockers**: —
- **Completed since last update**: _(no sessions yet)_
- **Pending**:
  - [ ] **READ FIRST:** `docs/growth-action-plan.md` — 12 initiatives across 4 phases with master coordination checklist
  - [ ] Review all STATUS_BOARD sections, prioritize work across all 10 roles
  - [ ] Review and finalize DECISIONS.md
  - [ ] **Phase 1: Referral program validation** — research best practices, validate $100/$50 incentive math, add Decision #12 if approved (see growth-action-plan.md Initiative 1)
  - [ ] **Phase 1: Reddit monitoring decision** — should Reddit leads go into Payments DB or separate "Social Leads" DB? (see Initiative 3)
  - [ ] **Phase 1: VIP Implementation Day definition** — define $2,995 product, get Jake approval, add Decision #13, handoff copy brief to Frankie (see Initiative 5)
  - [ ] **Phase 2: Community platform selection** — Circle vs Discord vs Slack for $49/month membership (see Initiative 10)
  - [ ] Track all 12 initiatives using master checklist in growth-action-plan.md
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
  - [ ] ~~**P0**: Write build spec for Daily Follow-Up Engine~~ → DONE (Conductor built it)
  - [ ] **P1: WF1** — fix customer email vars + data flow + Calendly URL
  - [ ] **P1: WF2** — fix client_name → name in team email
  - [ ] **P1: WF3** — fix Client Name title (empty), verify rich_text fields via live test, fix upsell detection type
  - [ ] **P1: WF4** — fix Lead Source "Direct" → "IG DM"
  - [ ] **P2:** Fix team notification senders to notifications@ across WF1-4 (4 nodes)
  - [ ] **P2: WF1** — add Lead Source "Direct" to Create Notion Lead
  - [ ] **P3:** Deploy Frankie email templates to WF1 + Daily Follow-Up Engine
  - [ ] **P3: WF2** — add customer booking confirmation email (template #9)
  - [ ] **P3: WF3** — delete orphaned "Find Notion Lead" node
  - [ ] **P3: WF1** — add Stripe webhook signature verification
  - [ ] **GROWTH Phase 1:** Referral workflow spec → `docs/specs/referral-workflow-spec.md` (see growth-action-plan.md Initiative 1)
  - [ ] **GROWTH Phase 1:** Reddit monitoring workflow spec → `docs/specs/reddit-monitoring-spec.md` (Initiative 3)
  - [ ] **GROWTH Phase 1:** Apollo lead enrichment workflow spec → `docs/specs/lead-enrichment-spec.md` (Initiative 4)
  - [ ] **GROWTH Phase 2:** Content repurposing workflow spec → `docs/specs/content-repurposing-spec.md` (Initiative 2)
  - [ ] **GROWTH Phase 2:** 7-email nurture sequence workflow spec → `docs/specs/nurture-sequence-spec.md` (Initiative 6)
  - [ ] **GROWTH Phase 3:** Automated $299 Brand Audit product spec (Initiative 9)
  - [ ] **GROWTH Phase 3:** Apify Instagram scraping spec (Initiative 11)

## Command Center Engineer (ARCH) — Last active: Feb 25 (session 3)
- **Current focus**: UI consistency audit, deployment verification, Streamlit research
- **Test status**: 505/505 passing
- **Blockers**: None
- **Completed since last update**:
  - [x] v5.0 UI/UX redesign (design tokens, ui.py, plotly_theme, all 13 pages)
  - [x] 10 Python/Streamlit fixes (items #12-17, #23-26 from audit)
  - [x] n8n_client.py, Fireflies integration, demo mode fixes
  - [x] 78 service-layer tests (272 total)
  - [x] Agent coordination system v1 (STATUS_BOARD.md, CLAUDE.md rules, docs/agent-roles.md)
  - [x] 10-role architecture (DECISIONS.md, handoffs/, expanded STATUS_BOARD, unified agent-roles.md)
  - [x] UI consistency audit — 18 issues found across 12 files, all P0-P4 fixes implemented
  - [x] Design tokens cleanup (CHANNEL_COLORS_MAP, SCENARIO_COLORS, HEATMAP_SCALE, hex_to_rgba; zero hardcoded hex in components)
  - [x] Fixed CLAUDE.md, DECISIONS.md, MEMORY.md for product naming + workflow count
  - [x] **Growth Intelligence Report** + **Growth Action Plan** — 12 initiatives across 4 phases
  - [x] **Brand Audit page** — `app/pages/brand_audit.py`: 2 input modes, radar chart, benchmark comparison, multi-client scoring
  - [x] **Added Brand Audit to main.py sidebar** — Growth section, 14th page total
  - [x] **Session 3: Fixed sidebar DEMO MODE badge** — replaced 7 hardcoded values with design tokens
  - [x] **Session 3: Deployment verification** — confirmed streamlit_app.py, config.toml, requirements.txt, secrets.toml.example all correct
  - [x] **Session 3: Added FIREFLIES_API_KEY** to `.streamlit/secrets.toml.example` (was missing)
  - [x] **Session 3: Bumped `streamlit>=1.39.0`** in requirements.txt (was >=1.31.0) — required for st.navigation() + st.fragment
  - [x] **Session 3: Verified Growth Intelligence wiring** — all A1-A4 features already wired (capacity check, sample warnings, projected LTV, dynamic tiers)
  - [x] **Session 3: Performance research** — @st.fragment is highest-impact optimization (Revenue Goals 12 sliders, Lead Scoring filters, Channel Performance model selector). Findings in memory/streamlit-performance.md
  - [x] **Session 3: Navigation research** — deferred-import wrapper pattern confirmed best practice, session state architecture validated. Findings in memory/streamlit-navigation.md
- **Pending**:
  - [ ] **P0**: Apply `@st.fragment` to Revenue Goals (12 sliders), Lead Scoring (filter/sort), Channel Performance (model selector), Outcomes (cohort toggle)
  - [ ] **P1**: Add `key=` to all 30 `st.plotly_chart()` calls for efficient diffing
  - [ ] **P2**: Dark mode toggle `on_change` callback instead of `st.rerun()`
  - [ ] Add Content Calendar Notion DB ID to CLAUDE.md once CRM creates it

## Growth Intelligence Analyst (GROWTH) — Last active: Feb 25 (session 4)
- **Current focus**: Brand audit scoring model + payback analysis + retention tracking complete
- **Test status**: 505/505 passing (42 new tests this session)
- **Blockers**: None
- **Completed since last update**:
  - [x] Deep audit of all 8 analytics modules — 11 issues found, all P0-P3 fixed
  - [x] Validated $800K revenue path — max call revenue ~$527K; ~$275K gap needs non-call products
  - [x] All 6 module fixes: revenue_modeler, lead_scorer, attribution, ltv_calculator, segment_builder, keyword_extractor
  - [x] **`app/utils/benchmarks.py`** — industry benchmarks module with 20+ constants + BRAND_AUDIT_BENCHMARKS
  - [x] Wired capacity ceiling, sample warnings, projected LTV, cohort LTV, funnel benchmarks, CAC benchmarks (sessions 2-3)
  - [x] **Session 4: Created `app/utils/brand_auditor.py`** — brand audit scoring model (Phase 2 initiative)
    - 6 dimensions: visual_identity (20%), messaging_clarity (20%), messaging_consistency (15%), messaging_differentiation (15%), content_strategy (15%), competitive_positioning (15%)
    - Tiers: Strong (78+), Developing (55-77), Needs Work (35-54), Critical (<35)
    - Percentile ranking against BRAND_AUDIT_BENCHMARKS (top 25% = 78+, avg creative = 62, avg all = 55, bottom 25% = 42)
    - Per-dimension signals, recommendations, and priority actions
    - `score_brand()` returns BrandAuditResult with composite score, tier, percentile, 6 dimension breakdowns
    - `compare_brands()` for benchmarking across multiple audit results
  - [x] **Session 4: Added BRAND_AUDIT_BENCHMARKS** to benchmarks.py
  - [x] **Session 4: Wired payback_period() into Channel Performance** — uses benchmark CAC as defaults, shows immediate/delayed payback per channel with color-coded cards
  - [x] **Session 4: Added score distribution histogram to Lead Scoring page** — tier threshold lines (Hot 70+, Warm 40+, Cool 20+) + scoring confidence notes (directional vs predictive)
  - [x] **Session 4: Added tier reference lines to Avg Score by Lead Source chart** — Hot and Warm threshold lines
  - [x] **Session 4: Created `retention_by_cohort()` in ltv_calculator.py** — CohortRetention dataclass tracking repeat rate, avg purchases, avg days to repeat per cohort
  - [x] **Session 4: Wired retention chart into Outcomes page** — bar+line chart (repeat rate + avg purchases), 20% repeat benchmark line, retention detail expander
  - [x] 36 brand_auditor tests + 6 retention tests = 505 total passing
- **Pending**:
  - [ ] Wire brand_auditor scoring into Brand Audit page (depends on Command Center Engineer building the page)
  - [ ] Add brand audit demo data to demo_data.py
  - [ ] Add benchmark lines to conversion paths page (attribution model comparison)

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
  - [ ] **GROWTH Phase 1:** Referral emails — templates #21 (referral ask), #22 (referral success), #23 (referred welcome). Handoff to Auto Architect. (see growth-action-plan.md Initiative 1)
  - [ ] **GROWTH Phase 2:** Content repurposing prompts — CONTENT_REPURPOSING_PROMPT in frankie_prompts.py + ClaudeService method (Initiative 2)
  - [ ] **GROWTH Phase 2:** 7-email nurture sequence — templates #24-30, lead magnet options. Handoff to Auto Architect. (Initiative 6)
  - [ ] **GROWTH Phase 2:** Instagram ad copy — 3 carousel ads + 2 Reels scripts in `docs/ad-copy-frankie.md` (Initiative 8)
  - [ ] **GROWTH Phase 3:** Private podcast scripts — 5 episodes (Initiative 12)

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
  - [ ] **GROWTH Phase 1:** Referral Notion setup — 4 new fields (Referred By, Referral Code, Referral Count, Referral Credit) + update notion_client.py + demo_data.py + handoff to Auto Architect (see growth-action-plan.md Initiative 1)
  - [ ] **GROWTH Phase 1:** Content Calendar Notion DB — create database, add to CLAUDE.md, update notion_client.py (Initiative 2)
  - [ ] **GROWTH Phase 1:** Apollo enrichment fields — 6 new Payments DB fields (Company, Company Size, Title, Industry, LinkedIn URL, Enriched) + lead_scorer.py updates (Initiative 4)

---

## Notes Between Agents

### From Chief of Staff → All Agents (Feb 24 — COS BRIEFING)
- **Daily Follow-Up Engine is LIVE.** Conductor built and branded it. All 5 workflows now active.
- **NAMING DECISION: Product is "Single Call" ($699), NOT "Standard Call."** The Automation Architect's Feb 24 audit flagged "Single Call" as a bug — that was incorrect. "Single Call" is the canonical name. Stripe still says "Standard Call" — Jake will rename it + add metadata keys.
- **Priority shift: Webflow landing pages are now #1 blocker.** Nothing else matters until /strategy-call and /premium-sprint are live. Builder role is critical path.
- Tracking pixels ready in Notion (Tracking Pixel Guide) — install same day landing pages go up.
- hello@ email forwarding: nudge Megha. Laylo code TCHTRIAL: redeem in March.

### From Command Center Engineer → All Agents (Feb 25)
- **Growth Action Plan published:** `docs/growth-action-plan.md` — 12 initiatives across 4 phases (Phase 0: launch foundation → Phase 1: revenue engine → Phase 2: growth automation → Phase 3: scale & diversify)
- **Every role has specific step-by-step instructions.** Read the sections that apply to your role.
- **Research backing:** `docs/growth-intelligence-report.md` — competitive analysis, data sources, pricing psychology, AI growth techniques
- **Revenue target:** $800K blended (calls $400K + AI audits $90K + VIP days $72K + community $60K + referral lift $50K + Sprint lift $45K + templates $83K)
- **Chief of Staff:** Master coordination checklist is at the bottom of the growth action plan. Use it to track all 12 initiatives.

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

### From Growth Intelligence → Command Center Engineer (Feb 25, session 4 update)
- **All prior analytics wiring complete** — capacity ceiling, sample warnings, projected LTV, cohort LTV, funnel benchmarks, CAC benchmarks all done
- **NEW: `app/utils/brand_auditor.py`** — brand audit scoring model ready for Phase 2 Brand Audit page
  - `score_brand(data)` → BrandAuditResult with composite score, 6 dimension breakdowns, tier, percentile, priority actions
  - `compare_brands(results)` → aggregate stats across multiple audits
  - BRAND_AUDIT_BENCHMARKS added to benchmarks.py (top_quartile=78, avg_creative=62, avg_all=55, bottom_quartile=42)
  - 36 tests in test_brand_auditor.py
  - **Ready for you to build `app/pages/brand_audit.py`** — scoring model is complete, just needs a page to display it
- **NEW: `retention_by_cohort()`** in ltv_calculator.py — tracks repeat purchase rate per cohort, wired into Outcomes page
- **NEW: `payback_period()`** wired into Channel Performance — uses benchmark CAC defaults
- **NEW: Score distribution + tier thresholds** on Lead Scoring page — histogram with Hot/Warm/Cool lines
- `lead_scorer.py` tier thresholds: Hot=70, Warm=40, Cool=20
- Test count: 400 → 427 → 463 → 505 (all passing)

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
| **`docs/growth-action-plan.md`** | **12 initiatives, 4 phases, role-specific instructions** | **Command Center Engineer** |
| `docs/growth-intelligence-report.md` | Research backing the growth plan | Command Center Engineer |
| `handoffs/` | Role-to-role request files | All roles |

---

## Protocol

1. **Session Start**: Read this file + `CLAUDE.md` + `DECISIONS.md`
2. **During Session**: Update your "Completed" list as you finish tasks
3. **Session End**: Update "Last active" date, move completed items, update Pending, write notes for other agents
4. **Conflict Resolution**: Most recent update wins. Add a note explaining the change
5. **Stale Detection**: If "Last updated" is >48 hours old, flag to user
6. **Cross-Agent Requests**: Write to "Notes Between Agents" or create a file in `handoffs/`
