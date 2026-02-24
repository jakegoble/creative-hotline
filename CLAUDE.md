# The Creative Hotline — Claude Code Project Context

## Business
The Creative Hotline is a creative consultancy run by Jake Goble and Megha. Clients book 45-minute creative direction calls, receive an AI-analyzed pre-call briefing, and get a custom action plan within 24 hours. Brand persona is "Frankie" — warm, witty, confident, zero buzzwords.

**Team:** Jake Goble (jake@radanimal.co), Megha (megha@theanecdote.co), shared inbox (soscreativehotline@gmail.com)
**Other business:** Enjune Music (Jake's music business)

## Tech Stack

| Tool | Purpose | Access |
|------|---------|--------|
| **n8n** (Cloud, upgraded) | All workflow automation (5 active workflows) | https://creativehotline.app.n8n.cloud |
| **Notion** | CRM — 2 databases (Payments DB + Intake DB) | MCP: `claude mcp add --transport http notion https://mcp.notion.com/mcp` |
| **Stripe** | Payment processing | Webhook → n8n |
| **Calendly** | Call booking | https://calendly.com/soscreativehotline/creative-hotline-call |
| **Tally** | Pre-call intake forms | https://tally.so/r/b5W1JE |
| **ManyChat** | Instagram DM automation (PRO, $44/mo) | https://app.manychat.com/fb4352208/dashboard |
| **Laylo** | IG keyword drops (BOOK, PRICING, HELP) | Webhook → n8n |
| **Webflow** | Website | https://www.thecreativehotline.com |
| **Claude API** | Intake analysis + upsell detection | Model: claude-sonnet-4-5-20250929 |

## Notion Structure

### Payments Database (Master CRM)
**ID:** `3030e73ffadc80bcb9dde15f51a9caf2`
Every customer and lead gets a record here. Pipeline source of truth.

**Key properties:** Client Name (title), Email, Phone, Payment Amount, Product Purchased (select), Payment Date, Stripe Session ID, Status (select), Call Date, Calendly Link, Linked Intake (relation), Lead Source (select), Booking Reminder Sent (checkbox), Intake Reminder Sent (checkbox), Nurture Email Sent (checkbox), Thank You Sent (checkbox)

**Product Purchased options:** "First Call", "Single Call", "3-Pack Sprint", "3-Session Clarity Sprint"

**Pipeline statuses:**
- `Lead - Laylo` → Signed up via IG keyword, hasn't paid
- `Paid - Needs Booking` → Payment received, Calendly link sent
- `Booked - Needs Intake` → Call booked, waiting for intake form
- `Intake Complete` → All prep done, ready for call
- `Ready for Call` → Intake reviewed, call is imminent
- `Call Complete` → Call finished, action plan pending or delivered
- `Follow-Up Sent` → Post-call follow-up delivered

### Intake Database
**ID:** `2f60e73ffadc806bbf5ddca2f5c256a3`
Pre-call questionnaire responses + AI analysis.

**Key properties:** Client Name, Email, Role, Brand, Website/IG, Creative Emergency, Desired Outcome, What They've Tried, Deadline, Constraints, Intake Status, AI Intake Summary, Action Plan Sent (checkbox), Linked Payment (relation)

### Notion Space & Key Pages
- **Space ID:** `0f4e4f76-f116-4626-a1b9-9d4e980c97b3`
- **Launch Page (parent):** `2bab6814-bb03-8022-9be4-fcaf7b2f2351`
- **Strategic Playbook:** `b9fce2c8-eb1d-4407-8db2-58d0a87eaf39`

## Stripe Products (Live)

| Product | Price | Payment Link |
|---------|-------|-------------|
| First Call | $499 | `https://buy.stripe.com/14AaEQcDDaY43eFdT59ws00` |
| Single Call | $699 | `https://buy.stripe.com/eVqbIUeLL1nu02t16j9ws02` |
| 3-Session Clarity Sprint | $1,495 | `https://buy.stripe.com/4gMcMY9rr2rycPfdT59ws03` |

Webhook registered for `checkout.session.completed` → n8n. Signing secret stored in Stripe Dashboard.

## n8n Workflows (5 Active)

### Core Pipeline (4)
| Workflow | ID | Trigger |
|----------|----|---------|
| WF1: Stripe Purchase → Calendly | `AMSvlokEAFKvF_rncAFte` | Stripe webhook (checkout.session.completed) |
| WF2: Calendly Booking → Payments Update | `Wt7paQoH2EICMtUG` | Calendly webhook (invitee.created) |
| WF3: Tally Intake → Claude Analysis | `ETKIfWOX-eciSJQQF7XX5` | Tally webhook |
| WF4: Laylo Subscriber → Notion | `MfbV3-F5GiMwDs1KD5AoK` | Laylo webhook |

### Automated Follow-Ups (1 — consolidated)
| Workflow | ID | Schedule |
|----------|----|----------|
| Daily Follow-Up Engine | `fAZErNZBQSWlnHgRPq4c2` | Daily (consolidated WF5+6+7, LIVE as of Feb 24) |

Handles: Paid But Never Booked (48hr+), Booked But No Intake (call within 24hrs), Laylo Lead Nurture (3-7 days). All 5 workflows branded with Frankie templates.

### Deactivated/Deleted
- ~~WF5: Paid But Never Booked~~ (`clCnlUW1zjatRHXE`) — consolidated into Daily Follow-Up Engine
- ~~WF6: Booked But No Intake~~ (`Esq2SMGEy6LVHdIQ`) — consolidated into Daily Follow-Up Engine
- ~~WF7: Laylo Lead Nurture~~ (`VYCokTqWGAFCa1j0`) — consolidated into Daily Follow-Up Engine
- ~~WF8: Calendly Booking → Tally~~ (`3ONZZbLdprx4nxGK7eEom`) — broken scaffolding, deleted Feb 20
- ~~WF9: Post-Call Follow-Up~~ (`9mct9GBz3R-EjTgQOZcPt`) — broken scaffolding, deleted Feb 20

### n8n IF Node Pattern (Standardized Feb 21)
All follow-up workflow IF nodes now use the robust pattern:
```json
{ "leftValue": "={{ $json.email }}", "operator": { "type": "string", "operation": "exists", "singleValue": true } }
```
Do NOT use the old `!$json._empty` boolean pattern. See `docs/postmortems/empty-if-condition-bug.md`.

### n8n Credentials
| Credential | ID |
|------------|-----|
| SMTP (Email) | `yJP76JoIqqqEPbQ9` |
| Notion API | `rzufpLxiRLvvNq4Z` |

## Email System

| Purpose | From | To |
|---------|------|----|
| Customer emails | hello@creativehotline.com | Customer |
| Team notifications | notifications@creativehotline.com | jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com |

## ManyChat Configuration
- **Platform:** Instagram (@creative.hotline)
- **AI Replies:** ON — responds to DMs using Knowledge Base
- **AI Comments:** OFF (ManyChat UI bug — Comment-to-DM workaround active)
- **AI Goals:** 2 live (Share Booking Link + Capture Email)
- **Automations:** 4 live (Welcome DM, Comment-to-DM, Story Mention Reply, Ice Breaker Menu)
- **Knowledge Base:** 5 entries (business info, pricing, Frankie persona, booking process, FAQ/objections)

## Customer Pipeline Flow
```
Discovery (IG/Website/Referral)
  → Laylo Capture (IG DM keyword) OR Stripe Payment (direct purchase)
  → Payments DB record created
  → Calendly link emailed (if paid)
  → Customer books call
  → Tally intake form submitted
  → Claude AI analyzes intake (flags upsells)
  → Call happens
  → Action plan delivered within 24hrs
  → Post-call follow-up
```

## Priorities & Known Issues

### Launch Blockers (P1)
1. **hello@creativehotline.com has NO MX records** — domain on GoDaddy, no email forwarding. Customer replies bounce. See `docs/email-forwarding-gap.md`
2. **Laylo disconnected from Instagram** — DM keyword triggers won't fire. Reconnect in Laylo dashboard
3. **Webflow landing pages missing** — /strategy-call + /premium-sprint must be built before paid traffic. See DECISIONS.md #11

### Open (P2)
4. WF1 bugs: customer email broken (wrong vars + data flow), no Lead Source — see `docs/workflow-audit-2026-02-24.md`
5. WF2 bugs: client_name ref wrong, team email sender wrong
6. WF3 bugs: Client Name title empty, rich_text fields need live verification, Claude uses httpHeaderAuth
7. WF4 bug: Lead Source says "Direct" (should be "IG DM")
8. Team notification senders wrong across WF1-4 (should be notifications@creativehotline.com)
9. Website contact form dead end — see `docs/contact-form-webhook-spec.md`
10. Website pricing: "Save $400" badge (should be $602), $1,100 (no Stripe product), $1,497→$1,495 — see `docs/website-pricing-audit.md`
11. /pricing page 404, pricing page title still "Marketio"
12. Frankie email templates written (18 total) but not deployed to n8n — see `docs/email-deployment-guide.md`
13. Notion test records need cleanup — see `docs/notion-test-records-cleanup.md`

### Resolved
- ~~Daily Follow-Up Engine missing~~ Built by Conductor, LIVE as of Feb 24. All 5 workflows active + branded
- ~~Stripe "Standard Call" rename~~ Already renamed to "Single Call" + metadata applied (product_name, product_tier, notion_status)
- ~~n8n trial expiring~~ Upgraded (confirmed Feb 21). WF5+6+7 consolidated into Daily Follow-Up Engine (Feb 23)
- ~~WF7 dead domain URL~~ Fixed by Cowork (Feb 21) — now `thecreativehotline.com`
- ~~WF5/WF6/WF7 IF node bugs~~ All 3 fixed by Cowork (Feb 20-21) — now use `$json.email` exists pattern
- ~~WF8/WF9 broken scaffolding~~ Deleted from n8n (Feb 20). WF8 rebuilt with Notion filter + Thank You email
- ~~Tally form URL in WF6 is placeholder~~ Fixed to `b5W1JE` (verified Feb 20)
- ~~"Book a Call" buttons link to contact page~~ Now link to Calendly
- ~~Footer has placeholder Dubai address~~ Now "Based in Venice, CA"
- ~~Browser tab titles show "Marketio"~~ Fixed on homepage/contact

## Rules
- Always use Frankie's voice for customer-facing copy: warm, witty, confident, zero buzzwords, no motivational language
- Never expose internal workflow IDs or API keys to customers
- All n8n workflow changes should be tested in n8n's test mode before activating
- When building new workflows, include error handling on every node that calls an external service
- Prefer Code node filtering over Notion API filters (more reliable in n8n)
- For detailed workflow specs, database schemas, and email templates, see `docs/system-reference.md`
- For n8n node-level fix instructions, see `docs/n8n-fix-configs.md` and `docs/n8n-node-fix-specs.md`
- For email template deployment, see `docs/email-deployment-guide.md`
- For end-to-end testing, see `docs/e2e-test-plan.md`

---

## Command Center — Code Standards

### Python & Compatibility
- **Python 3.9** — all files use `from __future__ import annotations` for modern type hint syntax
- Type hints on all function signatures (params + return)
- Docstrings on public functions (one-liner for simple, Google-style for complex)
- Max function length: ~50 lines. Extract helpers when exceeding this
- Use `@dataclass` for structured data (see `config.py:Settings`)

### Project Structure
```
app/
├── main.py                  # Entry point — page config, CSS, sidebar, routing
├── config.py                # Settings dataclass, load_settings(), validate_settings()
├── pages/                   # Streamlit pages — one file per nav item (13 pages)
│   ├── dashboard.py         # KPI overview
│   ├── clients.py           # Client detail + timeline
│   ├── pipeline.py          # Pipeline kanban view
│   ├── action_plans.py      # Action Plan Studio (transcript + manual)
│   ├── lead_scoring.py      # ICP scoring + tier breakdown
│   ├── channel_performance.py
│   ├── retargeting.py       # Re-engagement campaigns
│   ├── conversion_paths.py  # Attribution + Sankey
│   ├── revenue_goals.py     # $800K path + scenario modeling
│   ├── funnel_analytics.py  # Micro-conversion funnel + A/B log
│   ├── outcomes.py          # LTV, NPS, testimonials, referrals
│   ├── health.py            # System health checks
│   └── settings.py          # Config + demo mode toggle
├── components/              # Reusable Plotly/Streamlit chart components (12)
├── services/                # API clients + business logic
│   ├── notion_client.py     # Notion API wrapper
│   ├── stripe_client.py     # Stripe API wrapper
│   ├── calendly_client.py   # Calendly API wrapper
│   ├── claude_client.py     # Anthropic API wrapper
│   ├── manychat_client.py   # ManyChat API wrapper
│   ├── fireflies_client.py  # Fireflies AI transcript API
│   ├── n8n_client.py        # n8n health check + workflow listing
│   ├── health_checker.py    # Multi-service health checks
│   ├── cache_manager.py     # st.session_state caching
│   └── demo_service.py      # Drop-in demo mode replacements
├── utils/                   # Pure functions, no API calls
│   ├── demo_data.py         # 15 demo clients + helpers
│   ├── design_tokens.py     # Centralized color/spacing/typography tokens
│   ├── theme.py             # Global CSS injection (uses design_tokens)
│   ├── ui.py                # Shared UI component library (section_header, metric_card, etc.)
│   ├── plotly_theme.py      # Registered "hotline" Plotly template
│   ├── formatters.py        # Currency, date, percentage formatting
│   ├── lead_scorer.py       # ICP scoring algorithm
│   ├── segment_builder.py   # Client segmentation rules
│   ├── attribution.py       # Channel attribution logic
│   ├── keyword_extractor.py # Text analysis
│   ├── ltv_calculator.py    # LTV + cohort analysis
│   ├── revenue_modeler.py   # Scenario builder + projections
│   ├── sequence_tracker.py  # Email sequence position mapping
│   ├── referral_tracker.py  # Referral analytics
│   ├── frankie_prompts.py   # Claude prompt templates
│   ├── exporters.py         # PDF generation (reportlab)
│   ├── plan_delivery.py     # Client HTML action plan pages
│   └── transcript_processor.py  # Fireflies transcript parsing
└── templates/               # HTML/email templates
tests/
├── conftest.py              # Shared fixtures (hot_payment, sample_payments, etc.)
├── test_smoke.py            # Import smoke tests for all modules
├── test_demo_data.py        # Demo data integrity tests
├── test_*.py                # Unit tests per module (~400 tests total)
docs/                        # Specs, postmortems, guides (40+ files)
.streamlit/
├── config.toml              # Theme config (warm bg + orange accent)
└── secrets.toml.example     # Streamlit Cloud secrets template
```

### Architecture Rules
- **Pages are thin** — pages call services and render components. No raw API calls in page files
- **Services own API calls** — each external service has one client in `app/services/`
- **Utils are pure** — `app/utils/` functions take data in, return data out. No `st.*` calls, no API calls
- **Components are reusable** — `app/components/` render Plotly/Streamlit UI. Accept data as params
- **Demo mode is transparent** — `demo_service.py` classes implement the same interface as real services. Pages don't know the difference
- **Config via `_get_secret()`** — reads env vars first (local), then `st.secrets` (Cloud). Never hardcode keys
- **Caching** — use `@st.cache_data(ttl=300)` for expensive computations. Use `st.session_state` for cross-page state
- **CSS injection** — all styling goes through `app/utils/theme.py`. No inline `st.markdown("<style>...")` in pages

### Testing Requirements
- **Framework:** pytest with `tests/conftest.py` shared fixtures
- **Run tests:** `python3 -m pytest tests/ -v`
- **Mock external services** — never call real APIs in tests. Use `unittest.mock.patch` or fixture data
- **Test file naming:** `tests/test_{module_name}.py`
- **Import smoke tests** — `test_smoke.py` verifies all modules import without error
- **Demo data tests** — `test_demo_data.py` validates data integrity (status coverage, email uniqueness, join correctness)
- **Target:** maintain passing test suite. Run tests after any code change before committing

### Git Workflow
- **Branch naming:** `feature/short-description`, `fix/short-description`, `chore/short-description`
- **Commits:** atomic, focused. One logical change per commit
- **Message format:** imperative mood, lowercase start. Examples:
  - `add transcript processing to Action Plan Studio`
  - `fix pipeline stats calculation for demo mode`
  - `update theme CSS for mobile sidebar`
- **Never commit:** `.env`, `.streamlit/secrets.toml`, `__pycache__/`, `.DS_Store`
- **Always run tests before committing**

### Deploy Checklist (Streamlit Cloud)
1. All tests pass locally (`python3 -m pytest tests/ -v`)
2. `requirements.txt` is up to date
3. `.streamlit/secrets.toml.example` documents all required secrets
4. `streamlit_app.py` exists as Cloud entry point (imports `app.main`)
5. No hardcoded API keys — all via `_get_secret()`
6. Demo mode works without any API keys configured
7. Mobile-responsive (test at 375px width)

### Agent Coordination Protocol

**All 10 agents (4 Cowork + 6 Claude Code) MUST follow this protocol every session.**
Full role definitions, prompts, and launch sequence: `docs/agent-roles.md`

#### The Ten Roles
| Platform | Role | Codename | Domain |
|----------|------|----------|--------|
| Cowork | Chief of Staff | COS | Strategic coordination, DECISIONS.md, research |
| Cowork | The Conductor | COND | n8n browser UI — implements fixes, tests, publishes |
| Cowork | The Amplifier | AMP | Ad platform UIs — Meta, LinkedIn, Google, GTM, pixels |
| Cowork | The Builder | BUILD | Webflow — landing pages, tracking installs, forms |
| Claude Code | Automation Architect | AUTO | n8n workflow specs (READ-ONLY MCP), fix docs |
| Claude Code | Command Center Engineer | ARCH | Streamlit app, services, components, design system |
| Claude Code | Growth Intelligence | GROWTH | Attribution, lead scoring, LTV, revenue modeling |
| Claude Code | Creative Director (Frankie) | FRANK | Brand voice, email copy, action plans, deliverables |
| Claude Code | Platform Reliability | SRE | Testing, deployment, health checks, monitoring |
| Claude Code | CRM & Data Ops | DATA | Notion databases, data integrity, pipeline management |

#### Session Start (MANDATORY)
1. Read `STATUS_BOARD.md` — understand what all roles have done since your last session
2. Read `CLAUDE.md` — check for rule changes or updated project state
3. Read `DECISIONS.md` — check for new business decisions
4. Check "Notes Between Agents" for messages addressed to your role
5. If STATUS_BOARD.md "Last updated" is >48 hours old, flag staleness to the user

#### During Session
6. Update your "Completed" list in STATUS_BOARD.md as you finish each task
7. If you discover something another role needs to know, add it to "Notes Between Agents" or create a file in `handoffs/`

#### Session End (MANDATORY)
8. Update STATUS_BOARD.md:
   - Set "Last active" date on your section
   - Move completed items from "Pending" to "Completed"
   - Update "Pending" with any new work
   - Add notes for other roles if applicable
9. Update "Current State" table if metrics changed (test count, module count, workflow count, etc.)
10. Update CLAUDE.md "Priorities & Known Issues" if items were resolved or new blockers found

#### Ownership Boundaries
- **Cowork** owns: n8n browser UI (Conductor), Webflow (Builder), ad platforms (Amplifier), strategic coordination (Chief of Staff)
- **Claude Code** owns: Command Center app (Engineer), workflow specs (Auto Architect), analytics (Growth), content (Frankie), testing (SRE), data (CRM)
- **Both** own: STATUS_BOARD.md, DECISIONS.md, launch readiness scorecard, e2e test plan
- n8n MCP tools are read-only — Auto Architect specs fixes, Conductor implements in browser
- Handoff files in `handoffs/` for role-to-role requests: `{from}-to-{to}-{YYYYMMDD}-{topic}.md`

#### Key Shared Files
| File | Read By | Updated By |
|------|---------|------------|
| `STATUS_BOARD.md` | All 10 roles | All 10 roles (every session) |
| `CLAUDE.md` | All 10 roles | Command Center Engineer |
| `DECISIONS.md` | All 10 roles | Chief of Staff only |
| `docs/agent-roles.md` | All 10 roles | Command Center Engineer |
| `handoffs/` | Targeted roles | Any role |
| `docs/workflow-audit-2026-02-24.md` | Auto Architect, Conductor | Auto Architect |
| `docs/specs/workflow-consolidation-spec.md` | Auto Architect, Conductor | Auto Architect |
| `docs/email-deployment-guide.md` | Conductor, Frankie | Frankie |
| `docs/launch-readiness-scorecard.md` | All | All |

## Cross Reference Search Rule
When asked for a "cross reference search," run 4 parallel web searches comparing Claude/Anthropic, ChatGPT/OpenAI, Perplexity AI, and Gemini/Google AI perspectives, then synthesize consensus, differences, unique insights, and a best combined approach.
