# Growth Action Plan — The Creative Hotline

**Date:** 2026-02-25
**Author:** Command Center Engineer (Claude Code)
**Source:** `docs/growth-intelligence-report.md` + STATUS_BOARD.md + DECISIONS.md
**Status:** ACTIVE — all roles should read this at session start

---

## How to Use This Document

This action plan maps 12 growth initiatives across 4 phases. Each initiative has:
- **What** it is and why it matters
- **Who** owns it (specific role)
- **Dependencies** on other roles
- **Step-by-step instructions** detailed enough to execute in one session
- **Definition of Done** so you know when to mark it complete

**Phases are sequential.** Don't start Phase 2 until Phase 1 is done. Within a phase, initiatives can run in parallel across different roles.

---

## Phase 0: Launch Foundation (CURRENT — must complete first)

> These are existing blockers from DECISIONS.md and CLAUDE.md. Nothing in Phases 1-3 matters until these are resolved. Most are already in progress.

### 0A. Webflow Landing Pages — /strategy-call + /premium-sprint
- **Owner:** The Builder (Cowork)
- **Dependencies:** Copy from Frankie (DONE — in `handoffs/`), pixels from Amplifier
- **Status:** NOT STARTED — #1 revenue blocker
- **Instructions:** See `handoffs/frank-to-builder-20260224-strategy-call-copy.md` and `handoffs/frank-to-builder-20260224-premium-sprint-copy.md`
- **Done when:** Both pages live, CTAs link to Stripe payment links, Calendly embedded on /strategy-call, mobile responsive, Lighthouse >85 perf

### 0B. Tracking Pixels on Webflow
- **Owner:** The Amplifier (Cowork) → The Builder (Cowork) installs
- **Dependencies:** Landing pages must exist first (0A)
- **Status:** NOT STARTED
- **Instructions:** Amplifier prepares code snippets in `handoffs/amp-to-builder-*`, Builder installs in Webflow custom code
- **Pixels:** Meta Pixel, LinkedIn Insight Tag, GA4 (G-EEGNEL25BJ), GTM (GTM-T4TJT56Z), Search Console
- **Done when:** All 5 tags firing, verified in each platform's tag debugger

### 0C. hello@ Email Forwarding
- **Owner:** Jake (nudge Megha)
- **Status:** DELEGATED — Megha has PDF instructions for GoDaddy DNS
- **Done when:** Email to hello@creativehotline.com arrives in soscreativehotline@gmail.com

### 0D. Laylo Reconnection
- **Owner:** Jake (Laylo dashboard)
- **Status:** NOT STARTED
- **Done when:** DM keyword "BOOK" triggers Laylo webhook → n8n WF4 creates Notion record

### 0E. WF1-4 Bug Fixes
- **Owner:** Automation Architect (specs) → Conductor (implements in n8n UI)
- **Status:** Specs written in `docs/workflow-audit-2026-02-24.md`, implementation pending
- **Done when:** All 4 workflows pass end-to-end test (see `docs/e2e-test-plan.md`)

---

## Phase 1: Revenue Engine (Week 1-2)

> Quick wins that generate revenue or capture leads using the existing tech stack. Each initiative is self-contained and can be built in a single agent session.

---

### Initiative 1: Referral Program
**Revenue impact:** High (3-5x conversion, 16% higher LTV)
**Effort:** Low (4-6 hours total across 3 roles)

#### CRM & Data Ops (Claude Code) — Notion Setup

**Session goal:** Add referral tracking fields to Notion + create referral tracking logic in the app.

**Step-by-step:**

1. **Add properties to Payments DB** (via Notion MCP or manual):
   - `Referred By` (rich_text) — email of the referrer
   - `Referral Code` (rich_text) — unique code for this client to share
   - `Referral Count` (number) — how many people they've referred
   - `Referral Credit` (number) — $ credit earned from referrals

2. **Update `app/services/notion_client.py`** — add property extraction for the 4 new fields in `_parse_payment()`:
   ```python
   "referred_by": self._get_rich_text(props, "Referred By"),
   "referral_code": self._get_rich_text(props, "Referral Code"),
   "referral_count": props.get("Referral Count", {}).get("number", 0),
   "referral_credit": props.get("Referral Credit", {}).get("number", 0),
   ```

3. **Update `app/utils/referral_tracker.py`** — the module already exists with mock logic. Wire it to read from the new Notion fields:
   - `get_referral_stats()` should query Payments DB for records where `Referred By` is not empty
   - `get_top_referrers()` should group by `Referred By` email and sum referral counts
   - `calculate_referral_revenue()` should sum Payment Amount where `Referred By` is not empty

4. **Update `app/utils/demo_data.py`** — add referral fields to 3-4 demo clients:
   ```python
   # On Sarah Chen's record:
   "referral_code": "SARAH2026",
   "referral_count": 2,
   "referral_credit": 200,
   # On Marcus Thompson's record:
   "referred_by": "sarah.chen@example.com",
   ```

5. **Update CLAUDE.md** — add the 4 new properties to the Payments DB key properties list.

6. **Run tests:** `python3 -m pytest tests/ -v` — all must pass.

7. **Handoff:** Write `handoffs/data-to-auto-20260225-referral-workflow.md` with the new Notion field names so Automation Architect can spec the n8n workflow.

**Done when:** Notion has 4 new fields, `notion_client.py` parses them, `referral_tracker.py` reads real data, demo data includes referral examples, all tests pass.

---

#### Creative Director / Frankie (Claude Code) — Referral Email

**Session goal:** Write the Frankie-voiced referral ask email + referral landing copy.

**Step-by-step:**

1. **Write referral ask email** (Email Template #21) in `docs/email-templates-frankie.md`:
   - Trigger: sent 7 days after "Call Complete" status
   - Subject line options: "Your friends could use this too" / "Know someone who's creatively stuck?"
   - Body: Frankie voice. NOT "refer a friend and get $$" vibes. Instead: "If you know someone who's stuck, send them this link. If they book, you both get a thank-you." Warm, personal, no MLM energy.
   - Include: unique referral link placeholder `{{referral_link}}`
   - Incentive copy: "If they book a call, you get $100 toward your next session. They get $50 off their first. No strings, no gimmicks."
   - CTA: "Share your link: {{referral_link}}"

2. **Write referral success notification** (Email Template #22):
   - Trigger: when someone books using a referral code
   - To: the referrer
   - Subject: "Someone you sent our way just booked"
   - Body: Frankie voice. "Your person booked a call. $100 credit is locked in for your next session."

3. **Write referred-client welcome email** (Email Template #23):
   - Trigger: when a referred client pays
   - To: the new client
   - Subject: "You were sent here by someone who gets it"
   - Body: Acknowledge the referral warmly. "$50 off already applied. Here's your Calendly link."

4. **Update `docs/email-deployment-guide.md`** — add templates #21-23 with trigger conditions, n8n node names, and Notion checkbox fields.

5. **Handoff:** Write `handoffs/frank-to-auto-20260225-referral-emails.md` with all 3 email templates formatted for n8n Send Email nodes (HTML body, subject, from: hello@creativehotline.com).

**Done when:** 3 referral email templates written in Frankie voice, deployment guide updated, handoff to Automation Architect ready.

---

#### Automation Architect (Claude Code) — Referral Workflow Spec

**Session goal:** Write the complete n8n workflow spec for referral tracking.

**Dependencies:** Needs Notion field names from CRM & Data Ops handoff, email templates from Frankie handoff.

**Step-by-step:**

1. **Read handoffs:**
   - `handoffs/data-to-auto-20260225-referral-workflow.md` (Notion fields)
   - `handoffs/frank-to-auto-20260225-referral-emails.md` (email templates)

2. **Write workflow spec** at `docs/specs/referral-workflow-spec.md`:

   **Workflow: "Referral Program" (new WF)**
   - **Trigger:** Schedule (daily at 10am CT)
   - **Node 1: Query Notion Payments DB** — filter: Status = "Call Complete" AND Thank You Sent = true AND Referral Code = empty AND Call Date < 7 days ago
   - **Node 2: Generate Referral Code** — Code node: `items.map(item => ({ ...item, referral_code: item.json.client_name.split(' ')[0].toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase() }))`
   - **Node 3: Update Notion** — set Referral Code on each record
   - **Node 4: Send Referral Ask Email** — template #21, from hello@, to client email, insert referral_code

   **Workflow: "Referral Redemption" (triggered by Stripe webhook)**
   - **Trigger:** Stripe webhook `checkout.session.completed` (existing WF1)
   - **Addition to WF1:** After creating Notion record, check if the Stripe session has a coupon code matching a referral code
   - **If match:** Update the referrer's Notion record (increment Referral Count, add $100 to Referral Credit), send email #22 to referrer, send email #23 to new client

3. **Include in spec:**
   - Stripe coupon creation instructions (Jake needs to create `REF50` coupon in Stripe dashboard — $50 off, single-use per customer, forever duration)
   - How to append `?prefilled_promo_code=REF50` to Stripe payment links for referral URLs
   - Exact Notion API property names and types for each update
   - n8n credential IDs: SMTP (`yJP76JoIqqqEPbQ9`), Notion (`rzufpLxiRLvvNq4Z`)
   - Error handling: what happens if referral code doesn't match any record

4. **Handoff:** The spec itself is the handoff to Conductor, who builds it in n8n UI.

**Done when:** Complete workflow spec with node-by-node configuration, Stripe coupon instructions for Jake, ready for Conductor to implement.

---

#### Chief of Staff (Cowork) — Referral Program Coordination

**Session goal:** Research referral program best practices, validate the incentive structure, ensure all pieces connect.

**Step-by-step:**

1. **Research:** Look up referral programs from similar high-ticket consultancies. Validate that $100/$50 incentive structure is competitive. Search for:
   - "high ticket coaching referral program examples"
   - "consulting referral incentive structure"
   - "two-sided referral program conversion rates"

2. **Validate the math:**
   - $100 referrer credit + $50 new client discount = $150 total cost per referral
   - If referred client books First Call ($499): $499 - $50 = $449 revenue, minus $100 credit = $349 net. Still profitable.
   - If referred client books Sprint ($1,495): $1,495 - $50 = $1,445 revenue, minus $100 credit = $1,345 net. Very profitable.
   - Average blended: ~$550 net per referral. CAC via referral = ~$150 vs $800 for Meta Ads. 5x more efficient.

3. **Decision needed:** Add to DECISIONS.md if approved:
   - Decision #12: "Referral program: $100 credit to referrer, $50 off for new client. Referral code generated 7 days post-call. Stripe coupon REF50."

4. **Track cross-role progress:**
   - [ ] CRM & Data Ops: Notion fields added
   - [ ] Frankie: Email templates written
   - [ ] Automation Architect: Workflow spec written
   - [ ] Conductor: Workflow built in n8n
   - [ ] Jake: Stripe coupon REF50 created

**Done when:** Decision documented, math validated, all 5 sub-tasks tracked, any blockers flagged.

---

### Initiative 2: AI Content Repurposing Pipeline
**Revenue impact:** Very High (marketing engine on autopilot)
**Effort:** Medium (6-8 hours across 3 roles)

#### Automation Architect (Claude Code) — Content Workflow Spec

**Session goal:** Write the n8n workflow spec that turns every Fireflies transcript into 10+ content pieces.

**Step-by-step:**

1. **Understand existing flow:** Read `app/services/fireflies_client.py` and `app/utils/transcript_processor.py` to understand what data the Fireflies integration already provides. Read `app/utils/frankie_prompts.py` for voice guidelines.

2. **Write workflow spec** at `docs/specs/content-repurposing-spec.md`:

   **Workflow: "Content Repurposing Engine" (new WF)**
   - **Trigger:** Webhook (called by n8n after Fireflies transcript is ready, or manual trigger with transcript_id)
   - **Node 1: Fetch Transcript** — HTTP Request to Fireflies API: `POST https://api.fireflies.ai/graphql` with query for transcript by ID. Returns `sentences[]` with speaker labels + timestamps.
   - **Node 2: Claude API — Content Generation** — HTTP Request node:
     ```
     POST https://api.anthropic.com/v1/messages
     Headers: x-api-key: {{$credentials.anthropicApi.apiKey}}, anthropic-version: 2023-06-01
     Body:
     {
       "model": "claude-sonnet-4-5-20250929",
       "max_tokens": 4000,
       "system": "You are Frankie, the creative director at The Creative Hotline. Voice rules: warm, witty, confident, zero buzzwords, no motivational fluff. You speak like a smart friend who happens to be great at branding.",
       "messages": [{
         "role": "user",
         "content": "Here is an anonymized transcript from a creative direction call. Extract content ideas from the themes discussed (do NOT use client names, brands, or identifying details).\n\nTranscript:\n{{$json.transcript_text}}\n\nGenerate exactly this JSON structure:\n{\n  \"ig_captions\": [5 Instagram caption drafts, each 100-200 words, with a hook line + insight + CTA to book a call],\n  \"blog_draft\": {\"title\": \"...\", \"outline\": [\"H2 sections...\"], \"intro_paragraph\": \"...\", \"key_insight\": \"...\"},\n  \"newsletter_topics\": [3 email newsletter topic ideas with subject line + 2-sentence pitch],\n  \"twitter_thread\": {\"hook\": \"tweet 1\", \"thread\": [\"tweet 2-7\"], \"closer\": \"final tweet with CTA\"}\n}"
       }]
     }
     ```
   - **Node 3: Parse JSON** — Code node to parse Claude's response into separate outputs
   - **Node 4: Create Notion Pages** — For each content piece, create a page in a new "Content Calendar" Notion database:
     - Properties: Title (title), Type (select: "IG Caption" / "Blog" / "Newsletter" / "Thread"), Status (select: "Draft" / "Scheduled" / "Published"), Source Call Date (date), Content (rich_text), Platform (select)
   - **Node 5: Error Handler** — if Claude API fails, log error and continue

3. **Specify the new Notion database:**
   - Database name: "Content Calendar"
   - Parent: Launch Page (`2bab6814-bb03-8022-9be4-fcaf7b2f2351`)
   - Properties: Title, Type (select), Status (select), Platform (select), Content Body (rich_text), Source Call Date (date), Created (created_time)

4. **Handoff:** Spec is the handoff to Conductor. Also write `handoffs/auto-to-data-20260225-content-calendar-db.md` for CRM & Data Ops to create the Notion database.

**Done when:** Complete workflow spec with Claude API prompt, Notion database schema, node-by-node config, error handling.

---

#### Creative Director / Frankie (Claude Code) — Content Prompts

**Session goal:** Write the Claude API prompts that generate on-brand content from call transcripts.

**Step-by-step:**

1. **Add to `app/utils/frankie_prompts.py`** — new prompt constants:

   ```python
   CONTENT_REPURPOSING_PROMPT = """You are Frankie..."""
   ```

   The prompt must:
   - Enforce anonymization (no client names, brands, or identifying details)
   - Generate content in Frankie's voice (reference `docs/frankie-brand-voice-guide.md`)
   - Each IG caption must have: hook line (first sentence grabs attention), insight (the actual value), CTA (soft — "If this hits home, DM us BOOK")
   - Blog draft must be thought-leadership, not a case study (no client details)
   - Newsletter topics should be curiosity-driven subject lines
   - Twitter thread should be opinionated and shareable

2. **Add helper function** to `app/services/claude_client.py`:
   ```python
   def generate_content_from_transcript(self, transcript_text: str) -> dict:
       """Generate marketing content from an anonymized call transcript."""
   ```

3. **Add to Action Plan Studio page** — optional "Generate Content Ideas" button that appears after transcript processing. Outputs the content pieces in expandable sections.

4. **Write tests** in `tests/test_claude_client.py` — mock the Claude API response, verify the function parses the JSON correctly.

**Done when:** Prompt constant added, ClaudeService method added, optional UI in Action Plan Studio, tests passing.

---

#### CRM & Data Ops (Claude Code) — Content Calendar Database

**Session goal:** Create the Content Calendar Notion database and wire it into the Command Center.

**Dependencies:** Database schema from Automation Architect handoff.

**Step-by-step:**

1. **Create Notion database** via MCP:
   - Name: "Content Calendar"
   - Parent: Launch Page
   - Properties: Title, Type (select: IG Caption, Blog, Newsletter, Thread), Status (select: Draft, Review, Scheduled, Published), Platform (select: Instagram, Website, Email, Twitter), Content Body (rich_text), Source Call Date (date), Created (created_time)

2. **Add database ID to CLAUDE.md** under Notion Structure:
   ```
   ### Content Calendar Database
   **ID:** `{new_id}`
   Content pieces generated from client call transcripts for marketing.
   ```

3. **Update `app/services/notion_client.py`** — add methods:
   ```python
   def get_content_calendar(self) -> list[dict]: ...
   def create_content_piece(self, title: str, content_type: str, body: str, source_date: str) -> dict: ...
   ```

4. **Update demo data** — add 5-6 sample content pieces to `demo_data.py` for the Content Calendar.

5. **Run tests** — all must pass.

**Done when:** Notion database exists, CLAUDE.md updated, notion_client.py has methods, demo data populated.

---

### Initiative 3: Reddit & Social Monitoring
**Revenue impact:** High (20-50 warm leads/week)
**Effort:** Low (2-3 hours)

#### Automation Architect (Claude Code) — Reddit Monitoring Spec

**Session goal:** Write the n8n workflow spec for Reddit keyword monitoring.

**Step-by-step:**

1. **Write workflow spec** at `docs/specs/reddit-monitoring-spec.md`:

   **Workflow: "Reddit Lead Monitor" (new WF)**
   - **Trigger:** Schedule — every 6 hours
   - **Node 1: HTTP Request (x5, parallel)** — one per subreddit:
     - `https://www.reddit.com/r/smallbusiness/search.json?q="creative+direction"+OR+"brand+strategy"+OR+"rebranding"+OR+"creative+consultant"&sort=new&t=day&limit=10`
     - `https://www.reddit.com/r/Entrepreneur/search.json?q="creative+direction"+OR+"brand+help"+OR+"rebrand"&sort=new&t=day&limit=10`
     - `https://www.reddit.com/r/graphic_design/search.json?q="creative+direction"+OR+"brand+strategy"+OR+"need+help"&sort=new&t=day&limit=10`
     - `https://www.reddit.com/r/startups/search.json?q="branding"+OR+"creative+direction"+OR+"brand+identity"&sort=new&t=day&limit=10`
     - `https://www.reddit.com/r/freelance/search.json?q="creative+direction"+OR+"brand+positioning"&sort=new&t=day&limit=10`
   - **Headers:** `User-Agent: CreativeHotlineBot/1.0`
   - **Node 2: Merge** — combine all 5 results
   - **Node 3: Code Node — Parse & Dedup**:
     ```javascript
     const seen = new Set();
     return items.flatMap(item => {
       const posts = item.json.data?.children || [];
       return posts
         .filter(p => {
           if (seen.has(p.data.id)) return false;
           seen.add(p.data.id);
           return p.data.score >= 3; // minimum engagement
         })
         .map(p => ({
           json: {
             title: p.data.title,
             url: `https://reddit.com${p.data.permalink}`,
             subreddit: p.data.subreddit,
             author: p.data.author,
             score: p.data.score,
             created: new Date(p.data.created_utc * 1000).toISOString(),
             selftext_preview: (p.data.selftext || '').substring(0, 500)
           }
         }));
     });
     ```
   - **Node 4: Notion Dedup Check** — query Payments DB for each post URL (avoid re-adding)
   - **Node 5: IF — New Posts Only**
   - **Node 6: Create Notion Record** — in a new "Social Leads" database or as a "Lead - Social" in Payments DB:
     - Client Name: Reddit post title (truncated to 50 chars)
     - Lead Source: "Reddit"
     - Notes: post URL + selftext preview
     - Status: "Lead - Social" (new status, or use existing "Lead - Laylo" and rename to "Lead - Organic")
   - **Node 7: Send Daily Digest** — if any new posts found, email team at notifications@creativehotline.com with a summary

2. **Keywords to monitor** (10 total):
   - "creative direction", "brand strategy", "rebranding", "creative consultant"
   - "brand identity help", "need a creative director", "brand feels off"
   - "stuck on branding", "creative strategy", "brand positioning"

3. **Include:** Reddit API rate limits (60 requests/minute for unauthenticated), User-Agent requirements, error handling for 429 responses.

**Done when:** Complete workflow spec ready for Conductor to build.

---

#### Chief of Staff (Cowork) — Social Monitoring Validation

**Session goal:** Research and validate the social monitoring strategy. Identify additional platforms and keywords.

**Step-by-step:**

1. **Research additional platforms:**
   - Twitter/X Advanced Search: test the query `"need creative help" OR "looking for creative director" OR "brand feels off" min_faves:5` — how many results per day?
   - LinkedIn: can we monitor posts with keywords? (LinkedIn doesn't have a public JSON API like Reddit — would need a tool like Phantom Buster or manual monitoring)
   - Quora: search for "creative direction" questions — lower volume but very high intent
   - Facebook Groups: "Creative Entrepreneurs", "Brand Strategy" groups — can't scrape, but can join and monitor manually

2. **Validate subreddit selection:** Check each subreddit's daily post volume and relevance:
   - r/smallbusiness (1.5M members) — high volume, moderate relevance
   - r/Entrepreneur (2.3M) — high volume, moderate relevance
   - r/graphic_design (1.5M) — high volume, high relevance
   - r/startups (1.2M) — moderate volume, moderate relevance
   - r/freelance (300K) — lower volume, high relevance
   - Consider adding: r/marketing, r/branding, r/design

3. **Decision needed:** Should Reddit leads go into the Payments DB (messy — mixes paying clients with cold leads) or a separate "Social Leads" Notion database? Recommendation: separate database to keep CRM clean. Add to DECISIONS.md.

4. **Track progress:**
   - [ ] Automation Architect: spec written
   - [ ] CRM & Data Ops: Notion database decision + setup
   - [ ] Conductor: workflow built
   - [ ] Amplifier: if we want to reply to Reddit posts (rules of engagement)

**Done when:** Platform selection validated, keyword list finalized, Notion database decision made, progress tracked.

---

### Initiative 4: Lead Enrichment (Apollo.io)
**Revenue impact:** High (better lead scoring = better conversion)
**Effort:** Low (2-3 hours)

#### CRM & Data Ops (Claude Code) — Apollo Integration

**Session goal:** Integrate Apollo.io free tier with the lead scoring system.

**Step-by-step:**

1. **Research Apollo.io free tier:**
   - 50 credits/month (1 credit = 1 person lookup)
   - Returns: name, title, company, company size, industry, LinkedIn URL, location
   - n8n has a native Apollo node (verify in n8n node library)

2. **Update `app/utils/lead_scorer.py`** — add enrichment-based scoring factors:
   ```python
   # New scoring factors (when enrichment data available):
   ENRICHMENT_SCORES = {
       "company_size_1_10": 15,    # Small business = ideal client
       "company_size_11_50": 10,
       "company_size_51_200": 5,
       "company_size_200+": 0,     # Too big for 1:1 consulting
       "title_founder": 20,        # Founders need creative direction most
       "title_creative_director": 15,
       "title_marketing": 10,
       "industry_creative": 15,
       "industry_tech": 10,
       "industry_ecommerce": 10,
   }
   ```

3. **Add enrichment fields to Payments DB** (via Notion MCP):
   - `Company` (rich_text)
   - `Company Size` (select: "1-10", "11-50", "51-200", "200+")
   - `Title` (rich_text)
   - `Industry` (select)
   - `LinkedIn URL` (url)
   - `Enriched` (checkbox) — prevents re-enrichment

4. **Update `notion_client.py`** — parse the 6 new fields.

5. **Update `demo_data.py`** — add enrichment data to 5-6 demo clients.

6. **Write tests** — verify lead scoring with and without enrichment data.

7. **Handoff:** Write `handoffs/data-to-auto-20260225-apollo-enrichment.md` with Notion field names and Apollo API field mappings for the Automation Architect to spec the n8n workflow.

**Done when:** Lead scorer uses enrichment data when available, Notion has 6 new fields, demo data populated, tests pass.

---

#### Automation Architect (Claude Code) — Enrichment Workflow Spec

**Session goal:** Spec the n8n workflow that auto-enriches new leads via Apollo.

**Step-by-step:**

1. **Write workflow spec** at `docs/specs/lead-enrichment-spec.md`:

   **Workflow: "Lead Enrichment" (new WF)**
   - **Trigger:** Webhook (called after any workflow creates a new Notion record), or Schedule (daily, process un-enriched records)
   - **Node 1: Query Notion** — filter: Enriched = false AND Email is not empty
   - **Node 2: Loop** — for each record (max 50/month on free tier, so add a counter)
   - **Node 3: Apollo People Search** — n8n Apollo node, search by email
   - **Node 4: Code Node — Map Fields**:
     ```javascript
     const person = $json;
     return {
       company: person.organization?.name || '',
       company_size: categorize(person.organization?.estimated_num_employees),
       title: person.title || '',
       industry: person.organization?.industry || '',
       linkedin_url: person.linkedin_url || '',
     };
     ```
   - **Node 5: Update Notion** — set enrichment fields + Enriched = true
   - **Node 6: Error Handler** — if Apollo returns no results, still set Enriched = true (prevent retry loop)

2. **Free tier budget management:**
   - 50 credits/month = ~12/week
   - Prioritize: enrich "Paid - Needs Booking" and "Booked - Needs Intake" records first (highest value)
   - Skip "Lead - Laylo" until they show purchase intent
   - Add a Code node counter that stops after 12 enrichments per run

3. **Handoff to Conductor** — spec is the handoff.

**Done when:** Complete spec with Apollo node config, field mappings, budget management, error handling.

---

### Initiative 5: VIP Implementation Day ($2,995)
**Revenue impact:** Medium (pricing anchor + new revenue)
**Effort:** Very Low (1-2 hours total)

#### Chief of Staff (Cowork) — Product Definition

**Session goal:** Define the VIP Implementation Day product and get Jake's approval.

**Step-by-step:**

1. **Define the product:**
   - **Name:** "VIP Implementation Day"
   - **Price:** $2,995
   - **What it includes:**
     - Full-day (6 hours) hands-on creative direction session with Jake
     - Real-time brand asset creation (mood boards, brand direction, content strategy)
     - Completed action plan delivered same day (not 24 hours later)
     - 30-day async follow-up via email (3 check-in emails)
     - Priority rebooking for future sessions
   - **Who it's for:** Clients who completed a First Call or Single Call and want hands-on implementation, not just direction

2. **Pricing psychology:**
   - Adding this tier makes the $1,495 Sprint look like a bargain
   - Even if 0 people buy it, it increases Sprint conversion by 15-25% (anchoring effect)
   - If 2 people/month buy it: $5,990/month = $71,880/year in new revenue

3. **Decision for DECISIONS.md:**
   - Decision #13: "VIP Implementation Day — $2,995, full-day session. Primary purpose is pricing anchor for Sprint. Secondary purpose is premium revenue."

4. **Action items for Jake:**
   - Create Stripe product: "VIP Implementation Day", $2,995
   - Add payment link to website pricing section (Builder)
   - Add to Calendly as a separate event type (6 hours, limited to 2/month)

5. **Handoff:** Write `handoffs/cos-to-frank-20260225-vip-day-copy.md` — Frankie needs to write the landing page copy and email template for VIP Day upsell.

**Done when:** Product defined, pricing approved by Jake, Stripe product creation assigned, handoff to Frankie ready.

---

## Phase 2: Growth Automation (Week 2-4)

> These initiatives build on Phase 1's infrastructure. They require the referral program, content pipeline, and lead enrichment to be operational.

---

### Initiative 6: Email Nurture Sequence (7-email)
**Revenue impact:** High (converts leads to buyers over 14 days)
**Effort:** Medium (content creation + workflow)

#### Creative Director / Frankie (Claude Code) — Sequence Content

**Session goal:** Write all 7 emails in the nurture sequence, fully in Frankie's voice.

**Step-by-step:**

1. **Write 7 emails** — add to `docs/email-templates-frankie.md` as Templates #24-30:

   | # | Day | Subject | Purpose | Key Content |
   |---|-----|---------|---------|-------------|
   | 24 | 0 | "Here's your [resource name]" | Deliver lead magnet + introduce Frankie | Resource link + "I'm Frankie. I give creative direction..." |
   | 25 | 1 | "The one thing most creatives get wrong" | Authority | Common mistake (overcomplicating, not committing to a direction) |
   | 26 | 3 | "What happened when [anonymized client] stopped guessing" | Social proof | Before/after transformation story (anonymized) |
   | 27 | 5 | "Creative confusion costs more than you think" | Pain agitation | Quantify the cost: lost time, inconsistent brand, missed opportunities |
   | 28 | 7 | "Here's what actually happens on a call" | Demystify | Walk through the 45-minute call format, what to expect |
   | 29 | 10 | "3 people booked this week (here's why)" | Social proof + scarcity | Show demand, limited weekly slots (real: max 20/week) |
   | 30 | 14 | "Last thing, then I'll shut up" | Direct CTA | Clear offer: First Call $499, link to /strategy-call, limited slots |

2. **For each email, include:**
   - Subject line (primary + 1 alternate for A/B testing)
   - Preview text (the snippet shown in inbox)
   - Full HTML body (Frankie voice, mobile-friendly, single CTA button)
   - Unsubscribe link placeholder

3. **Lead magnet options** (pick one for Jake to approve):
   - "The 5-Minute Brand Gut Check" — checklist PDF (is your brand confusing people?)
   - "Frankie's Creative Direction Playbook" — 3-page PDF with the framework used on calls
   - "The 'What Am I Even Doing?' Worksheet" — fillable PDF for creatives who feel stuck

4. **Handoff:** Write `handoffs/frank-to-auto-20260225-nurture-sequence.md` with all 7 emails formatted for n8n.

**Done when:** 7 emails written, lead magnet chosen, all formatted for n8n deployment.

---

#### Automation Architect (Claude Code) — Nurture Workflow Spec

**Session goal:** Spec the n8n workflow for the 7-email drip sequence.

**Step-by-step:**

1. **Write spec** at `docs/specs/nurture-sequence-spec.md`:

   **Workflow: "Nurture Sequence" (new WF)**
   - **Trigger:** Webhook from lead magnet form (new Tally form or Webflow form)
   - **Node 1: Create Notion Record** — Payments DB, Status = "Lead - Nurture", Lead Source = form source
   - **Node 2: Send Email #24** (Day 0) — immediate
   - **Node 3: Wait 1 day**
   - **Node 4: Check Notion** — has lead's status changed? (If they paid, stop the sequence)
   - **Node 5: Send Email #25** (Day 1)
   - **Continue pattern** through all 7 emails with Wait nodes + status checks between each
   - **Exit conditions:** Lead pays (status changes to "Paid - Needs Booking"), lead unsubscribes (add "Unsubscribed" checkbox to Payments DB), sequence completes

2. **Key design decisions:**
   - Use n8n's Wait node for delays (not separate scheduled workflows)
   - Check Notion status BEFORE each email (if they converted, stop)
   - Add "Nurture Step" (number) property to Payments DB for tracking position

3. **Handoff to Conductor** — spec is the handoff.

**Done when:** Complete spec with all 7 email triggers, wait timings, exit conditions, Notion checkpoints.

---

### Initiative 7: AI Brand Audit Product ($299)
**Revenue impact:** High ($90K/year at 300 sales)
**Effort:** Medium (mostly Claude API prompt engineering + payment flow)

#### Command Center Engineer (Claude Code) — Brand Audit Feature

**Session goal:** Build the AI Brand Audit as a new page in the Command Center + standalone product.

**Step-by-step:**

1. **Create `app/utils/brand_auditor.py`** (~150 lines):
   ```python
   BRAND_AUDIT_PROMPT = """You are Frankie, creative director at The Creative Hotline.

   Analyze this brand's online presence and generate a professional brand audit report.

   Inputs provided:
   - Instagram handle and recent post themes
   - Website URL and key pages
   - Industry/niche
   - Current brand description (from client)

   Generate a JSON response with these sections:
   {
     "brand_score": 0-100,
     "brand_personality": {"current": "...", "ideal": "...", "gap": "..."},
     "visual_identity": {"strengths": [...], "weaknesses": [...], "recommendations": [...]},
     "messaging": {"clarity_score": 0-10, "consistency_score": 0-10, "differentiation_score": 0-10, "recommendations": [...]},
     "content_strategy": {"posting_frequency": "...", "content_mix": "...", "engagement_quality": "...", "recommendations": [...]},
     "competitive_positioning": {"unique_angle": "...", "market_gap": "...", "threat": "..."},
     "quick_wins": ["3 things to fix this week"],
     "strategic_recommendations": ["3 longer-term moves"],
     "frankie_take": "2-3 sentences of Frankie's honest gut reaction to the brand"
   }"""
   ```

2. **Create `app/pages/brand_audit.py`** (new page):
   - Input form: Instagram handle, website URL, industry dropdown, brand description textarea
   - "Run Brand Audit" button → calls Claude API with the prompt
   - Results displayed in branded cards using `ui.py` components
   - "Download PDF Report" button → generates branded PDF via `exporters.py`
   - "Share Report Link" → generates hosted HTML page via `plan_delivery.py`

3. **Add to `app/main.py`** — new sidebar item "Brand Audit" (position after Action Plan Studio)

4. **Create PDF template** — extend `exporters.py` with `generate_brand_audit_pdf()`:
   - Cover page with Creative Hotline branding
   - Brand Score hero (large number + color)
   - Section-by-section breakdown
   - "Frankie's Take" callout box
   - CTA page: "Want to go deeper? Book a call" with Calendly link

5. **Write tests** — mock Claude API, verify parsing, test PDF generation.

6. **For the $299 automated product (future):**
   - Stripe product: "AI Brand Audit", $299
   - Tally form for brand info collection
   - n8n workflow: Stripe payment → Tally form link → form submission → Claude API → PDF generation → email delivery
   - This is a Phase 3 item (needs the Command Center feature first)

**Done when:** Brand Audit page working in Command Center, PDF export working, tests passing. Stripe product + automation is a separate Phase 3 task.

---

#### Growth Intelligence (Claude Code) — Audit Scoring Model

**Session goal:** Design the brand scoring algorithm that powers the audit.

**Step-by-step:**

1. **Define scoring rubric** — add to `app/utils/brand_auditor.py`:
   ```python
   SCORING_WEIGHTS = {
       "visual_identity": 0.20,
       "messaging_clarity": 0.20,
       "messaging_consistency": 0.15,
       "messaging_differentiation": 0.15,
       "content_strategy": 0.15,
       "competitive_positioning": 0.15,
   }
   ```

2. **Add benchmark comparisons** to `app/utils/benchmarks.py`:
   ```python
   BRAND_AUDIT_BENCHMARKS = {
       "avg_score_creative_services": 62,
       "avg_score_all_industries": 55,
       "top_quartile": 78,
       "bottom_quartile": 42,
   }
   ```

3. **Wire scoring into the audit results** — show percentile ranking and industry comparison.

**Done when:** Scoring algorithm defined, benchmarks added, percentile ranking works.

---

### Initiative 8: Instagram Carousel Ads
**Revenue impact:** High (direct paid acquisition)
**Effort:** Medium (creative + ad spend)

#### The Amplifier (Cowork) — Ad Campaign Setup

**Session goal:** Set up the first Instagram ad campaign targeting creative professionals.

**Step-by-step:**

1. **Audience setup in Meta Business Manager** (BM ID: 1127242149449917):
   - **Custom Audience 1:** Website visitors (needs Meta Pixel — depends on Phase 0B)
   - **Custom Audience 2:** Instagram engagers (people who interacted with @creative.hotline in last 90 days)
   - **Lookalike Audience:** 1% lookalike of IG engagers (US only)
   - **Interest targeting:** "Creative direction", "Brand strategy", "Graphic design", "Small business owner", "Entrepreneur"
   - **Exclusions:** Existing customers (upload customer email list from Notion)

2. **Campaign structure:**
   - Campaign: "CH — Strategy Call Acquisition"
   - Ad Set 1: Lookalike audience, $25/day
   - Ad Set 2: Interest targeting, $25/day
   - Total test budget: $50/day = $350/week

3. **Ad creative brief** — handoff to Frankie:
   - Need 3 carousel ads (5 slides each): Problem → Process → Product → Testimonial → CTA
   - Need 2 Reels ads (15 seconds): before/after brand transformation
   - All copy in Frankie's voice
   - CTA: "DM us TRANSFORM" (routes to ManyChat) or direct link to /strategy-call

4. **Conversion tracking:**
   - Pixel events: ViewContent (landing page), InitiateCheckout (Stripe link click), Purchase (Stripe success page)
   - Optimization: Optimize for Purchase, fallback to ViewContent if insufficient data

5. **Handoff:** Write `handoffs/amp-to-frank-20260225-ad-creative-brief.md` with creative specs.

**Done when:** Audiences built, campaign structure ready, creative brief sent to Frankie, pixel events configured.

---

#### Creative Director / Frankie (Claude Code) — Ad Copy

**Session goal:** Write ad copy for 3 carousel ads + 2 Reels scripts.

**Dependencies:** Creative brief from Amplifier handoff.

**Step-by-step:**

1. **Read** `handoffs/amp-to-frank-20260225-ad-creative-brief.md`

2. **Write 3 carousel ads** — add to `docs/ad-copy-frankie.md`:
   - **Carousel 1: "The Brand Confusion Tax"**
     - Slide 1: "You're losing money every day your brand confuses people."
     - Slide 2: "Here's what we do in 45 minutes."
     - Slide 3: "You get a custom action plan within 24 hours."
     - Slide 4: Client result (anonymized)
     - Slide 5: "DM us TRANSFORM or book at thecreativehotline.com/strategy-call"

   - **Carousel 2 & 3:** Different angles (social proof focused, process focused)

3. **Write 2 Reels scripts** (15 seconds each):
   - Script 1: "Before/after" — show a confused brand → clear direction
   - Script 2: "What a $499 creative direction call actually looks like"

4. **All copy rules:** Frankie voice, no buzzwords, no "unlock your potential", no emojis in ad copy.

**Done when:** 3 carousel ad copies + 2 Reels scripts written, all in Frankie voice, filed in `docs/ad-copy-frankie.md`.

---

## Phase 3: Scale & Diversify (Week 4-8)

> These initiatives require Phases 1-2 to be operational. They expand the business beyond 1:1 calls.

---

### Initiative 9: Automated Brand Audit Product (Stripe → PDF)
**Revenue impact:** High ($90K/year)
**Effort:** Medium

#### Automation Architect — Spec the end-to-end automation

**Step-by-step:**

1. **Write spec** at `docs/specs/brand-audit-product-spec.md`:
   - Stripe product: "AI Brand Audit", $299, one-time payment
   - Stripe webhook → n8n → Send Tally form link (brand info collection)
   - Tally submission → n8n → Claude API (brand audit prompt) → Generate PDF → Email to client
   - Total automation: payment to delivery in <5 minutes, zero human involvement

2. **Jake action:** Create Stripe product + payment link

3. **Builder action:** Add to /strategy-call page as an upsell: "Not ready for a call? Start with a $299 Brand Audit."

---

### Initiative 10: Community Membership ($49/month)
**Revenue impact:** Medium ($60K/year at 100 members)
**Effort:** High (ongoing moderation)

#### Chief of Staff — Platform Selection & Structure

**Step-by-step:**

1. **Research platforms:** Circle vs Discord vs Slack vs Mighty Networks
   - **Recommendation:** Circle ($39/month Starter) — built for paid communities, integrates with Stripe, has courses/events features
   - Discord is free but harder to monetize and less professional for $49/month price point

2. **Community structure:**
   - Channel 1: "Brand Direction Lounge" — weekly prompt from Frankie, members share brand work for feedback
   - Channel 2: "Ask Frankie" — async Q&A, Jake/Megha answer 3x/week
   - Channel 3: "Wins & Launches" — members share progress
   - Monthly: Live group call (1 hour, Jake leads, 20 person max per call)

3. **Decision needed:** Add to DECISIONS.md once Jake approves platform and structure.

---

### Initiative 11: Instagram Lead Scraping (Apify)
**Revenue impact:** Medium (qualified lead pipeline)
**Effort:** Medium

#### Automation Architect — Apify Integration Spec

1. Spec the n8n workflow: Apify Instagram Profile Scraper → filter business profiles → Apollo enrichment → Notion "Social Leads" DB
2. Include: Apify actor ID, webhook integration with n8n, field mapping, legal compliance notes
3. Budget: $5/month Apify credits = ~2,100 comment scrapes or ~5,000 profiles

---

### Initiative 12: Private Podcast Series
**Revenue impact:** Medium (extended sales letter as audio)
**Effort:** High (content creation)

#### Creative Director / Frankie — Script Writing

1. 5-episode private podcast series (15-20 min each):
   - Episode 1: "Why creative direction matters more than execution"
   - Episode 2: "The 3 brand mistakes that cost you $5K/month"
   - Episode 3: "What a creative direction call actually sounds like" (demo with consent)
   - Episode 4: "Client stories: before and after" (anonymized)
   - Episode 5: "Is this right for you?" (qualification + CTA)
2. Gate behind email capture (lead magnet for nurture sequence)
3. Host on Spotify for Podcasters (free) or Transistor ($19/month)

---

## Phase Summary & Role Workload

### Claude Code Roles — Session Priorities

| Role | Phase 1 (Week 1-2) | Phase 2 (Week 2-4) | Phase 3 (Week 4-8) |
|------|-------|-------|-------|
| **Automation Architect** | Referral spec, Reddit monitoring spec, Apollo enrichment spec | Nurture sequence spec, content repurposing spec | Brand audit product spec, Apify spec |
| **Command Center Engineer** | — | Brand Audit page + PDF export | Community dashboard page |
| **Growth Intelligence** | — | Brand audit scoring model | Cohort retention chart, payback period wiring |
| **Creative Director (Frankie)** | Referral emails (3), ad copy (5 pieces) | Nurture sequence (7 emails), content prompts | Private podcast scripts (5 episodes) |
| **CRM & Data Ops** | Referral Notion fields, Content Calendar DB, Apollo fields | Lead enrichment integration | Community member tracking |
| **Platform Reliability (SRE)** | — | Tests for new features | Load testing, deployment verification |

### Cowork Roles — Session Priorities

| Role | Phase 1 (Week 1-2) | Phase 2 (Week 2-4) | Phase 3 (Week 4-8) |
|------|-------|-------|-------|
| **Chief of Staff** | Referral program validation, Reddit platform decision, VIP Day definition | Nurture strategy review, community platform selection | Launch sequence coordination |
| **The Conductor** | Build referral workflow, build Reddit monitor workflow | Build nurture sequence workflow, build content repurposing workflow | Build brand audit automation |
| **The Amplifier** | IG carousel ad campaign setup, audience building | Retargeting campaigns, A/B testing | TikTok Ads, Google Ads expansion |
| **The Builder** | (Phase 0: landing pages first!) | Add Brand Audit upsell to /strategy-call | Community signup page |

---

## Chief of Staff — Master Coordination Checklist

Use this checklist to track all 12 initiatives across all roles:

### Phase 0 (Launch Foundation)
- [ ] 0A: Landing pages live (/strategy-call + /premium-sprint)
- [ ] 0B: All 5 tracking pixels firing
- [ ] 0C: hello@ email forwarding working
- [ ] 0D: Laylo reconnected to Instagram
- [ ] 0E: WF1-4 bugs fixed

### Phase 1 (Revenue Engine)
- [ ] 1: Referral program — Notion fields + emails + workflow + Stripe coupon
- [ ] 2: Content repurposing — spec + prompts + Notion DB + workflow
- [ ] 3: Reddit monitoring — spec + workflow + daily digest running
- [ ] 4: Lead enrichment — Apollo fields + scoring + workflow
- [ ] 5: VIP Implementation Day — product defined + Stripe + website

### Phase 2 (Growth Automation)
- [ ] 6: Nurture sequence — 7 emails + lead magnet + workflow
- [ ] 7: AI Brand Audit — Command Center page + PDF + scoring
- [ ] 8: Instagram carousel ads — audiences + creative + first campaign live

### Phase 3 (Scale & Diversify)
- [ ] 9: Automated Brand Audit product ($299 Stripe → PDF pipeline)
- [ ] 10: Community membership (platform + structure + first 10 members)
- [ ] 11: Instagram lead scraping (Apify + n8n + Notion)
- [ ] 12: Private podcast series (5 episodes recorded + hosted)

---

## Revenue Projection (If All 12 Initiatives Complete)

| Revenue Stream | Year 1 Target | Source Initiative |
|---------------|--------------|-------------------|
| 1:1 Calls (core) | $400,000 | Existing + Initiatives 3, 4, 6, 8 |
| AI Brand Audits | $90,000 | Initiative 7 → 9 |
| VIP Implementation Days | $72,000 | Initiative 5 (2/month) |
| Community Membership | $60,000 | Initiative 10 (100 members) |
| Referral Lift | $50,000 | Initiative 1 (incremental from referrals) |
| Sprint Upsell Lift | $45,000 | Initiative 5 anchoring effect |
| Templates/Course (future) | $83,000 | Not yet scoped |
| **Total** | **$800,000** | |

---

## Files Created by This Plan

| File | Purpose | Created By |
|------|---------|-----------|
| `docs/growth-action-plan.md` | This document | Command Center Engineer |
| `docs/growth-intelligence-report.md` | Research backing this plan | Growth Intelligence |
| `docs/specs/referral-workflow-spec.md` | Referral n8n workflow | Automation Architect |
| `docs/specs/content-repurposing-spec.md` | Content pipeline n8n workflow | Automation Architect |
| `docs/specs/reddit-monitoring-spec.md` | Reddit lead monitor n8n workflow | Automation Architect |
| `docs/specs/lead-enrichment-spec.md` | Apollo enrichment n8n workflow | Automation Architect |
| `docs/specs/nurture-sequence-spec.md` | 7-email drip n8n workflow | Automation Architect |
| `docs/specs/brand-audit-product-spec.md` | $299 product automation | Automation Architect |
| `docs/ad-copy-frankie.md` | Instagram ad copy | Creative Director |
| `app/utils/brand_auditor.py` | Brand audit logic | Command Center Engineer |
| `app/pages/brand_audit.py` | Brand Audit page | Command Center Engineer |
| `handoffs/data-to-auto-*` | Notion field specs | CRM & Data Ops |
| `handoffs/frank-to-auto-*` | Email templates for n8n | Creative Director |
| `handoffs/amp-to-frank-*` | Ad creative briefs | Amplifier |
| `handoffs/cos-to-frank-*` | Product copy briefs | Chief of Staff |
