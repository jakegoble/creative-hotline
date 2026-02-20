# n8n Workflow Audit — Creative Hotline

**Date:** 2026-02-20 (overnight session)
**Method:** Full node-level MCP pull of all 9 workflows + Notion schema verification via Notion MCP
**Auditor:** Claude Code agent (code-level auditing)
**Cowork:** Browser agent (live app testing, running in parallel)

---

## Executive Summary

9 workflows audited at full node depth. **27 issues found** across 5 severity levels. The two "utility" workflows (WF8, WF9) are essentially non-functional scaffolding. Several workflows write to Notion with wrong field types or empty values.

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 5 | Broken functionality, data loss, wrong field types |
| HIGH | 7 | Significant logic errors, empty node configurations, duplicate emails |
| MEDIUM | 8 | Wrong URLs, missing error handling, broken email refs |
| LOW | 5 | Cleanup, orphaned nodes, security |
| INFO | 5 | Design decisions, verified-working items, resolved items |

### Key Limitation

The n8n MCP server exposes `search_workflows`, `get_workflow_details`, and `execute_workflow` only. **There is no update/edit workflow tool.** All fixes must be made manually in the [n8n Cloud editor](https://creativehotline.app.n8n.cloud).

---

## Notion Schema Reference (Verified via Notion MCP)

### Payments Database (`3030e73ffadc80bcb9dde15f51a9caf2`)

| Property | Notion Type | Select Options |
|----------|-------------|----------------|
| Client Name | **title** | — |
| Email | **email** | — |
| Phone | **phone_number** | — |
| Payment Amount | **number** (dollar) | — |
| Product Purchased | **select** | "3-Pack Sprint", "Standard Call", "First Call" |
| Payment Date | **date** | — |
| Stripe Session ID | **text** (rich_text) | — |
| Status | **select** | "Lead - Laylo", "Paid - Needs Booking", "Booked - Needs Intake", "Intake Complete", "Ready for Call", "Call Complete" |
| Call Date | **date** | — |
| Calendly Link | **url** | — |
| Linked Intake | **relation** → Intake DB | — |
| Lead Source | **select** | "IG DM", "IG Comment", "IG Story", "Meta Ad", "LinkedIn", "Website", "Referral", "Direct" |
| Days to Convert | **formula** | — |
| Created | **created_time** | — |

### Intake Database (`2f60e73ffadc806bbf5ddca2f5c256a3`)

| Property | Notion Type | Select/Multi-Select Options |
|----------|-------------|----------------------------|
| Client Name | **title** | — |
| Email | **email** | — |
| Role | **text** (rich_text) | — |
| Brand | **text** (rich_text) | — |
| Website / IG | **url** | — |
| Creative Emergency | **text** (rich_text) | — |
| Desired Outcome | **multi_select** | "A clear decision", "Direction I can trust", "A short action plan", "Stronger positioning", "Someone to tell me the truth" |
| What They've Tried | **text** (rich_text) | — |
| Deadline | **text** (rich_text) | — |
| Constraints / Avoid | **text** (rich_text) | — |
| Intake Status | **select** | "Not Started", "Submitted" |
| AI Intake Summary | **text** (rich_text) | — |
| Action Plan Sent | **checkbox** | — |
| Call Date | **date** | — |
| Linked Payment | **relation** → Payments DB | — |

---

## WF1: Stripe Purchase → Calendly Link

**ID:** `AMSvlokEAFKvF_rncAFte` | **Active:** Yes | **Trigger:** Stripe webhook (POST `/webhook/stripe-checkout`)

### Node Map

| # | Node | Type | Key Settings |
|---|------|------|-------------|
| 1 | Webhook | webhook v2.1 | POST `/webhook/stripe-checkout`, no auth, responds immediately |
| 2 | Extract Data | set v1 | Extracts: `name` (customer_details.name), `email` (customer_details.email), `phone` (customer_details.phone), `product_name` (line_items.data[0].description), `amount` (amount_total / 100), `stripe_session_id` (object.id) |
| 3 | Create Notion Lead | notion v2 | Creates in Payments DB. **onError: continueRegularOutput** |
| 4 | Has Phone Number? | if v1 | Checks `$json.phone` isNotEmpty |
| 5 | Laylo Subscribe (SMS) | httpRequest v4 | POST `https://laylo.com/api/graphql`, GraphQL mutation with email + phone. **onError: continueRegularOutput** |
| 6 | Laylo Subscribe (Email Only) | httpRequest v4 | POST `https://laylo.com/api/graphql`, GraphQL mutation with email only. **onError: continueRegularOutput** |
| 7 | Wait 10 Seconds | wait v1 | 10s interval |
| 8 | Send Calendly Link | emailSend v2.1 | **From:** `jake@radanimal.co` (WRONG — see issue), **To:** customer email, Calendly link: `https://calendly.com/soscreativehotline/creative-hotline-call` |
| 9 | Send an Email (Team) | emailSend v2.1 | From: `notifications@creativehotline.com`, To: all three team emails |

### Notion Field Mapping (Create Notion Lead → Payments DB)

| n8n Key | n8n Type | Value Expression | Notion Actual Type | Match? |
|---------|----------|-----------------|-------------------|--------|
| `Client Name` | title | `={{ $json.name }}` | title | ✅ |
| `Email\|email` | email | `={{ $json.email }}` | email | ✅ |
| `Phone\|phone_number` | phone_number | `={{ $json.phone }}` | phone_number | ✅ |
| `Payment Amount\|number` | number | `={{ $json.amount }}` | number | ✅ |
| `Product Purchased\|select` | select | `={{ $json.product_name }}` | select | ✅ type, ❌ value (see issue #1) |
| `Stripe Session ID\|rich_text` | rich_text | `={{ $json.stripe_session_id }}` | text (rich_text) | ✅ |
| `Status\|select` | select | `"Paid - Needs Booking"` | select | ✅ |
| `Payment Date\|date` | date | `={{ $now.toISO() }}` | date | ✅ |

### Issues

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | **CRITICAL** | **Product Purchased will be null/empty.** `product_name` maps from `$json.body.data.object.line_items.data[0].description` but Stripe's `checkout.session.completed` webhook does NOT include `line_items` by default. They must be expanded via API. Even if expanded, Stripe's description ("Creative Hotline Call - 45 min") won't match Notion's select options ("3-Pack Sprint", "Standard Call", "First Call"). | Either: (A) Add HTTP Request before Extract Data to call `GET /v1/checkout/sessions/{id}?expand[]=line_items` and map the product name to a Notion select option, or (B) use `metadata` field on the Stripe product/price to store the Notion-friendly name. |
| 2 | **CRITICAL** | **No duplicate-payment guard.** Stripe can retry webhooks. If fired twice, a duplicate Notion record is created. No dedup on Stripe Session ID. | Add a Notion query before Create to check if `Stripe Session ID` already exists. If found, skip creation. |
| 3 | **MEDIUM** | **Customer email sent from `jake@radanimal.co`** instead of `hello@creativehotline.com` per the email map. | Change `fromEmail` in "Send Calendly Link" to `hello@creativehotline.com`. |
| 4 | **MEDIUM** | **Lead Source not set.** The Payments DB has a `Lead Source` select property but no workflow sets it. Stripe purchases should set it to "Website" or "Direct". | Add `Lead Source|select` → "Direct" (or derive from Stripe referrer if available). |
| 5 | **LOW** | If Notion create fails, `continueRegularOutput` masks it. Customer gets Calendly link but has no CRM record. | Consider adding a team notification on Notion failure path. |

---

## WF2: Calendly Booking → Payments Update

**ID:** `Wt7paQoH2EICMtUG` | **Active:** Yes | **Trigger:** Calendly webhook (POST `/webhook/calendly-payments-update`)

### Node Map

| # | Node | Type | Key Settings |
|---|------|------|-------------|
| 1 | Calendly Webhook | webhook v2 | POST `/webhook/calendly-payments-update`, no auth |
| 2 | Extract Booking Data | set v3.4 | Extracts: `email` (payload.email), `name` (payload.name), `call_date` (payload.scheduled_event.start_time), `calendly_link` (payload.uri) |
| 3 | Find Payment by Email | notion v2.2 | Queries Payments DB, filter Email = extracted email, limit 1. **onError: continueRegularOutput** |
| 4 | Update Payment Status | notion v2.2 | Updates: Call Date, Calendly Link, Status → "Booked - Needs Intake". **onError: continueRegularOutput** |
| 5 | Send an Email (Team) | emailSend v2.1 | From: `notifications@creativehotline.com`, To: team |

### Notion Field Mapping (Update Payment Status → Payments DB)

| n8n Key | n8n Type | Value Expression | Notion Actual Type | Match? |
|---------|----------|-----------------|-------------------|--------|
| `Call Date\|date` | date | `={{ $('Extract Booking Data').item.json.call_date }}` | date | ✅ |
| `Calendly Link\|url` | url | `={{ $('Extract Booking Data').item.json.calendly_link }}` | url | ✅ |
| `Status\|select` | select | `"Booked - Needs Intake"` | select | ✅ |

### Issues

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 6 | **CRITICAL** | **Email mismatch = silent failure.** If customer used different email for Stripe vs Calendly, Find Payment returns 0 results. `continueRegularOutput` swallows the error. Status never updates. No team notification. | Add IF node after Find Payment: if no results, send team alert email "Calendly booking for [name/email] could not be matched to a payment record." |
| 7 | **MEDIUM** | **Team notification references non-existent fields.** Email template uses `event_type` and `start_time` but Extract Booking Data creates `call_date` and `calendly_link` (no `event_type` or `start_time`). | Replace `event_type` with static "Creative Hotline Call". Replace `start_time` with `call_date`. |

---

## WF3: Tally Intake → Claude Analysis

**ID:** `ETKIfWOX-eciSJQQF7XX5` | **Active:** Yes | **Trigger:** Tally webhook (POST `/webhook/tally-intake`)

### Node Map

| # | Node | Type | Key Settings |
|---|------|------|-------------|
| 1 | Tally Webhook | webhook v1 | POST `/webhook/tally-intake`, no auth |
| 2 | Extract Tally Data | code v2 | JavaScript: fuzzy label matching on `data.fields` array. Extracts: name, email, role, brand, website, creative_emergency, desired_outcome, what_they_tried, deadline, constraints |
| 3 | Find Notion Lead | notion v2 | **ORPHANED NODE** — exists at position [-544,224] but NOT in connections graph. Never executes. |
| 4 | Create Intake Record | notion v2 | Creates in Intake DB. **onError: continueRegularOutput** |
| 5 | Claude Generate Summary | httpRequest v4 | POST `https://api.anthropic.com/v1/messages`, model: claude-sonnet-4-5-20250929, max_tokens: 1024. **onError: continueRegularOutput**. API key hardcoded in headers. |
| 6 | Extract Claude Response | set v1 | Extracts: `ai_summary` (content[0].text), `upsell_detected` (text.includes('Upsell: Yes')) |
| 7 | Update Notion with AI Summary | notion v2 | Updates Intake record. **onError: continueRegularOutput** |
| 8 | Upsell Detected? | if v1 | Checks upsell_detected boolean |
| 9 | Send Upsell Alert | emailSend v2 | From: `soscreativehotline@gmail.com` (WRONG — see issue), To: team |
| 10 | Find Payment by Email | notion v2.2 | Queries Payments DB by email, limit 1. **onError: continueRegularOutput** |
| 11 | Link Intake & Update Status | notion v2.2 | Updates Payment record: links Intake, sets Status → "Intake Complete". **onError: continueRegularOutput** |
| 12 | Send Intake Notification | emailSend v2.1 | From: `notifications@creativehotline.com`, To: team |

### Notion Field Mapping (Create Intake Record → Intake DB)

| n8n Key | n8n Type | Value Expression | Notion Actual Type | Match? |
|---------|----------|-----------------|-------------------|--------|
| `Client Name\|title` | title | `""` (EMPTY) | title | ❌ **Blank title** |
| `Email\|email` | email | `={{ $('Extract Tally Data').item.json.email }}` | email | ✅ |
| `Role\|select` | select | `={{ $('Extract Tally Data').item.json.role }}` | **text** (rich_text) | ❌ **TYPE MISMATCH** |
| `Brand\|rich_text` | rich_text | `""` (EMPTY textContent) | text (rich_text) | ✅ type, ❌ **empty value** |
| `Website / IG\|url` | url | `={{ $('Extract Tally Data').item.json.website }}` | url | ✅ |
| `Creative Emergency\|rich_text` | rich_text | `""` (EMPTY textContent) | text (rich_text) | ✅ type, ❌ **empty value** |
| `Desired Outcome\|select` | select | `={{ $('Extract Tally Data').item.json.desired_outcome }}` | **multi_select** | ❌ **TYPE MISMATCH** |
| `What They've Tried\|rich_text` | rich_text | `""` (EMPTY textContent) | text (rich_text) | ✅ type, ❌ **empty value** |
| `Deadline\|rich_text` | rich_text | `""` (EMPTY textContent) | text (rich_text) | ✅ type, ❌ **empty value** |
| `Constraints / Avoid\|rich_text` | rich_text | `""` (EMPTY textContent) | text (rich_text) | ✅ type, ❌ **empty value** |
| `Intake Status\|select` | select | `"Submitted"` | select | ✅ |

### Notion Field Mapping (Update Notion with AI Summary → Intake DB)

| n8n Key | n8n Type | Value Expression | Notion Actual Type | Match? |
|---------|----------|-----------------|-------------------|--------|
| `AI Intake Summary\|rich_text` | rich_text | `""` (EMPTY textContent) | text (rich_text) | ✅ type, ❌ **empty value** |

**Note:** The `textContent` field for all rich_text properties shows as `""` (empty string) in the MCP-returned node config. **VERIFIED 2026-02-20:** This is an MCP serialization artifact, NOT a runtime bug. Checked 2 Intake records (Sarah Chen, Marcus Thompson) — all fields are fully populated at runtime. The n8n expression engine evaluates the bound expressions at runtime even though the static `textContent` value appears empty in the MCP export. The expressions (`={{ $('Extract Tally Data').item.json.brand }}`, etc.) are working correctly.

### Notion Field Mapping (Link Intake & Update Status → Payments DB)

| n8n Key | n8n Type | Value Expression | Notion Actual Type | Match? |
|---------|----------|-----------------|-------------------|--------|
| `Linked Intake\|relation` | relation | `={{ $('Create Intake Record').item.json.id }}` | relation | ✅ |
| `Status\|select` | select | `"Intake Complete"` | select | ✅ |

### Issues

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 8 | **INFO** | ~~**Intake record fields may be blank.**~~ **VERIFIED WORKING.** The empty `textContent` in MCP export is a serialization artifact. Live Notion records (Sarah Chen, Marcus Thompson) have all fields populated. Expressions evaluate correctly at runtime. | No fix needed. |
| 9 | **INFO** | ~~**AI Summary may not persist.**~~ **VERIFIED WORKING.** AI Summary field is populated in live records (e.g. Sarah Chen: "Boutique agency struggling with positioning clarity..."). | No fix needed. |
| 10 | **CRITICAL** | **Role mapped as `select` but Notion type is `text`.** Will silently fail or error. | Change to `Role\|rich_text` and set `textContent`. |
| 11 | **CRITICAL** | **Desired Outcome mapped as `select` but Notion type is `multi_select`.** Single select write to multi_select field. | Change to `Desired Outcome\|multiSelect` and pass as array. |
| 12 | **HIGH** | **Email mismatch silent failure** (same as WF2). Find Payment by Email returns 0 if Tally email differs from Stripe. Intake record orphaned. | Add IF node + team notification on 0 results. |
| 13 | **MEDIUM** | **Upsell Alert sent from wrong email** (`soscreativehotline@gmail.com`). Should be `notifications@creativehotline.com`. | Change `fromEmail`. |
| 14 | **MEDIUM** | **Orphaned node.** "Find Notion Lead" exists but is not connected. Dead weight. | Delete the node. |
| 15 | **LOW** | **Claude API key hardcoded** in HTTP Request headers (`sk-ant-api03-...`). Should use n8n credential. | Create HTTP Header Auth credential in n8n and reference it. |
| 16 | **LOW** | **Claude API failure silent.** `continueRegularOutput` masks 429/500/timeout. Intake exists but no AI summary and status may not advance. | Add error notification branch. |

---

## WF4: Laylo New Subscriber → Notion

**ID:** `MfbV3-F5GiMwDs1KD5AoK` | **Active:** Yes | **Trigger:** Laylo webhook (POST `/webhook/8e422442-519e-4d42-8cb4-372d26b89edc`)

### Node Map

| # | Node | Type | Key Settings |
|---|------|------|-------------|
| 1 | Webhook | webhook v2.1 | POST path: `8e422442-519e-4d42-8cb4-372d26b89edc`, no auth |
| 2 | Extract Subscriber Data | set v3.4 | Extracts: `email` (body.email), `phone` (body.phoneNumber), `product_id` (body.productId), `source` ("Laylo - IG DM"), `subscribed_at` (new Date().toISOString()) |
| 3 | Create Subscriber Lead | notion v2.2 | Creates in Payments DB. **onError: continueRegularOutput** |
| 4 | Send an Email (Team) | emailSend v2.1 | From: `notifications@creativehotline.com`, To: team |

### Notion Field Mapping (Create Subscriber Lead → Payments DB)

| n8n Key | n8n Type | Value Expression | Notion Actual Type | Match? |
|---------|----------|-----------------|-------------------|--------|
| `Client Name\|title` | title | `""` (EMPTY) | title | ❌ **Blank — Laylo doesn't provide name** |
| `Email\|email` | email | `={{ $json.email }}` | email | ✅ |
| `Phone\|phone_number` | phone_number | `""` (EMPTY phoneValue) | phone_number | ❌ **Phone extracted but not written** |
| `Status\|select` | select | `"Lead - Laylo"` | select | ✅ |
| `Payment Amount\|number` | number | `0` (default) | number | ✅ |
| `Product Purchased\|rich_text` | rich_text | `""` (EMPTY textContent) | **select** | ❌ **TYPE MISMATCH** |

### Issues

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 17 | **CRITICAL** | **Product Purchased type mismatch.** n8n writes as `rich_text`, Notion expects `select`. Will silently fail. | Change to `Product Purchased\|select` and set `selectValue` to derive from `product_id` or hardcode appropriate option. |
| 18 | **HIGH** | **Phone number extracted but not written.** Extract node gets `phone` from `body.phoneNumber` but Create node has empty `phoneValue`. | Map `phoneValue` → `={{ $json.phone }}` |
| 19 | **HIGH** | **Client Name always blank.** Laylo doesn't provide a name, so title is empty. | Consider setting title to email address as fallback: `={{ $json.email }}` |
| 20 | **MEDIUM** | **Lead Source not set.** Should be set to "IG DM" for Laylo subscribers. | Add `Lead Source\|select` → "IG DM" |
| 21 | **MEDIUM** | **No duplicate check.** Multiple IG keyword triggers create duplicate records. | Query Payments DB by email before creating. If exists, skip or update. |

---

## WF5: Follow Up — Paid But Never Booked

**ID:** `clCnlUW1zjatRHXE` | **Active:** Yes | **Trigger:** Schedule (cron `0 9 * * *` — daily 9am)

### Node Map

| # | Node | Type | Key Settings |
|---|------|------|-------------|
| 1 | Daily 9am Check | scheduleTrigger v1.2 | Cron: `0 9 * * *` |
| 2 | Get All Payments | notion v2.2 | getAll from Payments DB, returnAll: true |
| 3 | Filter Stale Unbookeds | code v2 | JS: filters Status = "Paid - Needs Booking" AND Payment Date > 48hrs ago |
| 4 | Any Results? | if v2 | Checks `!$json._empty` |
| 5 | Send Booking Reminder | emailSend v2.1 | From: `hello@creativehotline.com`, To: customer, CTA: Calendly link |
| 6 | Alert Team | emailSend v2.1 | From: `notifications@creativehotline.com`, To: team |

### Issues

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| — | **LOW** | Customer email signs off as "The Creative Hotline Team" rather than Frankie. Minor brand voice inconsistency. | Update to Frankie-voice sign-off using templates from [email-templates-frankie.md](email-templates-frankie.md). |

**Overall assessment:** Clean workflow. Correct email senders, correct Calendly URL, proper Code node filtering pattern, clean empty-result sentinel.

---

## WF6: Follow Up — Booked But No Intake

**ID:** `Esq2SMGEy6LVHdIQ` | **Active:** Yes | **Trigger:** Schedule (cron `0 8 * * *` — daily 8am)

### Node Map

| # | Node | Type | Key Settings |
|---|------|------|-------------|
| 1 | Daily 8am Check | scheduleTrigger v1.2 | Cron: `0 8 * * *` |
| 2 | Get All Payments | notion v2.2 | getAll from Payments DB, returnAll: true |
| 3 | Filter Needs Intake | code v2 | JS: filters Status = "Booked - Needs Intake" AND Call Date within 24hrs (or past due) |
| 4 | Any Results? | if v2 | Checks `!$json._empty` |
| 5 | Send Intake Reminder | emailSend v2.1 | From: `hello@creativehotline.com`, To: customer |
| 6 | Alert Team | emailSend v2.1 | From: `notifications@creativehotline.com`, To: team |

### Issues

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 22 | **INFO** | ~~**Tally URL is placeholder.**~~ **RESOLVED.** Deep inspection on 2026-02-20 confirmed the URL is now `https://tally.so/r/b5W1JE` (correct). Workflow was last updated 2026-02-20T14:15:41Z. | No fix needed. |
| 26 | **MEDIUM** | **Past-due reminders fire indefinitely.** When `hoursUntilCall < 0` (call already happened) and status stays "Booked - Needs Intake", this workflow sends the customer a reminder email every day forever. No lower bound cutoff. | Add cutoff: skip if call was more than 48 hours ago (`hoursUntilCall < -48`). Or update status to "Call Complete" after call. |
| 27 | **LOW** | **Negative hours in team alert subject.** When call is past due, subject reads "Missing Intake: Jane (-12hrs)" which looks odd. | Add conditional: use "PAST DUE" instead of negative hours. |
| 28 | **LOW** | **Stale webhookId artifacts on email nodes.** Both email nodes have non-functional `webhookId` properties. Harmless but confusing during debugging. | Remove the `webhookId` fields from both email nodes. |

---

## WF7: Follow Up — Laylo Lead Nurture

**ID:** `VYCokTqWGAFCa1j0` | **Active:** Yes | **Trigger:** Schedule (cron `0 10 * * *` — daily 10am)

### Node Map

| # | Node | Type | Key Settings |
|---|------|------|-------------|
| 1 | Daily 10am Check | scheduleTrigger v1.2 | Cron: `0 10 * * *` |
| 2 | Get All Leads | notion v2.2 | getAll from Payments DB, returnAll: true |
| 3 | Filter 3-Day Old Laylo Leads | code v2 | JS: filters Status = "Lead - Laylo" AND created_time between 3-7 days ago |
| 4 | Any Leads to Nurture? | if v2 | Checks `!$json._empty` |
| 5 | Send Nurture Email | emailSend v2.1 | From: `hello@creativehotline.com`, To: lead |
| 6 | Alert Team | emailSend v2.1 | From: `notifications@creativehotline.com`, To: team |

### Issues

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 23 | **MEDIUM** | **Wrong website URL in nurture email.** Links to `https://soscreativehotline.com` — domain doesn't exist. Should be `https://www.thecreativehotline.com`. | Change href in "Learn More & Book" button. |
| 29 | **HIGH** | **Same lead gets duplicate nurture emails for 5 days straight.** Filter window is 3-7 days old, workflow runs daily. No dedup flag. A lead created on Day 0 gets the identical email on Day 3, 4, 5, 6, and 7. This is spammy and unprofessional. | Add a "Nurture Sent" checkbox to Payments DB. Filter out leads where checkbox = true. Set checkbox = true after sending. |
| 30 | **LOW** | **CTA links to homepage instead of direct purchase/booking.** Nurture email "Learn More & Book" links to homepage rather than Calendly or Stripe checkout. Conversion-focused nurture should link directly to action. | Change CTA href to `https://calendly.com/soscreativehotline/creative-hotline-call` or Stripe payment link. |

---

## WF8: Calendly Booking → Tally (Utility — NEEDS REBUILD)

**ID:** `3ONZZbLdprx4nxGK7eEom` | **Active:** Yes (SHOULD BE DEACTIVATED) | **Trigger:** Calendly webhook (POST `/webhook/calendly-booking`)

### Node Map

| # | Node | Type | Key Settings | Status |
|---|------|------|-------------|--------|
| 1 | Calendly Webhook | webhook v1 | POST `/webhook/calendly-booking` | ✅ |
| 2 | Extract Calendly Data | set v1 | Extracts: name, email, event_start, event_uri, reschedule_url, cancel_url | ✅ |
| 3 | Find Notion Lead | notion v2 | Queries **Intake DB** (WRONG DB) with empty email filter | ❌ |
| 4 | Update Notion - Booked | notion v2 | Update with EMPTY properties `[{}]` | ❌ |
| 5 | Send Tally Intake | httpRequest v4 | POST `https://api.laylo.com/v1/messages/send` with empty body | ❌ |
| 6 | Wait 24 Hours | wait v1 | 24 hours | ✅ |
| 7 | Check Intake Status | notion v2 | Queries Intake DB with empty Email + Intake Status filters | ❌ |
| 8 | Intake Not Submitted? | if v1 | Checks `$json.results.length == 0` | ⚠️ |
| 9 | Send Intake Reminder | httpRequest v4 | POST `https://api.laylo.com/v1/messages/send` with empty body | ❌ |

### Issues

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 24 | **CRITICAL** | **Entire workflow is non-functional scaffolding.** Find Notion Lead queries wrong DB (Intake instead of Payments). Update node has empty properties. Both "Send" nodes call Laylo messaging API instead of sending email. All filter/body values are empty. | **Deactivate immediately.** It also conflicts with WF2 (same Calendly trigger). Rebuild only if the "send Tally link + 24hr reminder" flow is needed beyond what WF6 provides. |

### Overlap Warning

This workflow fires on Calendly booking (same event as WF2). Having two workflows on the same Calendly webhook can cause unpredictable behavior. WF2 handles the Payments DB update correctly. This workflow should be deactivated.

---

## WF9: Post-Call Follow-Up (Utility — NEEDS REBUILD)

**ID:** `9mct9GBz3R-EjTgQOZcPt` | **Active:** Yes (SHOULD BE DEACTIVATED) | **Trigger:** Schedule (every hour)

### Node Map

| # | Node | Type | Key Settings | Status |
|---|------|------|-------------|--------|
| 1 | Check Every Hour | scheduleTrigger v1 | Every 1 hour | ✅ |
| 2 | Find Completed Calls | notion v2 | Queries Intake DB with EMPTY filter values for Status and Action Plan Sent | ❌ |
| 3 | Send Thank You | httpRequest v4 | POST `https://api.laylo.com/v1/messages/send` with empty body | ❌ |
| 4 | Mark Action Plan Sent | notion v2 | Update with NO properties specified | ❌ |

### Issues

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 25 | **CRITICAL** | **Entire workflow is non-functional scaffolding.** Notion filter has empty conditions (returns ALL Intake records). "Send Thank You" calls Laylo API with empty body (should be email). "Mark Action Plan Sent" updates nothing (no properties mapped). | **Deactivate immediately.** Rebuild: Filter should match `Intake Status = "Submitted"` AND `Action Plan Sent = false`. Replace HTTP Request with emailSend (from: `hello@creativehotline.com`). Map `Action Plan Sent` → checkbox true. |

---

## Tally URL Audit

| Workflow | Location | Current Value | Correct? |
|----------|----------|---------------|----------|
| WF6 (Booked But No Intake) | Send Intake Reminder → HTML href | `https://tally.so/r/b5W1JE` | ✅ **FIXED** (verified 2026-02-20) |
| WF3 (Tally → Claude) | Tally Webhook path | `/webhook/tally-intake` | ✅ (receiving end) |
| WF8 (Calendly → Tally) | "Send Tally Intake" node | Calls `https://api.laylo.com/v1/messages/send` (no Tally URL at all) | ❌ **Wrong API entirely** |
| CLAUDE.md | Reference | `https://tally.so/r/b5W1JE` | ✅ source of truth |

---

## Product Purchased Mapping Audit

| Workflow | n8n Type Used | Value Source | Notion Actual Type | Valid Options | Issue |
|----------|--------------|-------------|-------------------|---------------|-------|
| WF1 (Stripe) | `select` | `line_items.data[0].description` (null — not in webhook) | select | "3-Pack Sprint", "Standard Call", "First Call" | Value will be null; even if available, Stripe description won't match options |
| WF4 (Laylo) | `rich_text` | `""` (empty) | select | "3-Pack Sprint", "Standard Call", "First Call" | Wrong type AND empty value |

**Recommendation:** For WF1, hardcode `"Standard Call"` (or determine from Stripe price ID via a lookup). For WF4, change type to `select` and either leave empty (Laylo leads haven't purchased) or omit the property entirely.

---

## Laylo vs Calendly Reference Audit

| Workflow | Node | Uses Laylo For | Correct Usage? |
|----------|------|---------------|---------------|
| WF1 (Stripe) | Laylo Subscribe (SMS/Email) | Subscribing paid customer to Laylo SMS/email list | ✅ Correct — Laylo = marketing subscription |
| WF4 (Laylo) | Webhook receiver | Receiving Laylo subscriber webhook | ✅ Correct — Laylo = lead capture |
| WF7 (Nurture) | Email body | Links to `soscreativehotline.com` (wrong domain) | ⚠️ Wrong URL but not a Laylo/Calendly confusion |
| WF8 (Cal→Tally) | Send Tally Intake | Calls Laylo messaging API to "send" Tally form | ❌ **Laylo used incorrectly** — should be emailSend |
| WF8 (Cal→Tally) | Send Intake Reminder | Calls Laylo messaging API for reminder | ❌ **Laylo used incorrectly** — should be emailSend |
| WF9 (Post-Call) | Send Thank You | Calls Laylo messaging API for thank-you | ❌ **Laylo used incorrectly** — should be emailSend |

No workflows call Laylo a "payment page." The confusion is **Laylo messaging API being used where SMTP email should be used** in the two unfinished utility workflows.

---

## Email Sender Audit

| Workflow | Node | Current From | Expected From | Match? |
|----------|------|-------------|--------------|--------|
| WF1 | Send Calendly Link (customer) | `jake@radanimal.co` | `hello@creativehotline.com` | ❌ |
| WF1 | Team Notification | `notifications@creativehotline.com` | `notifications@creativehotline.com` | ✅ |
| WF2 | Team Notification | `notifications@creativehotline.com` | `notifications@creativehotline.com` | ✅ |
| WF3 | Send Upsell Alert | `soscreativehotline@gmail.com` | `notifications@creativehotline.com` | ❌ |
| WF3 | Send Intake Notification | `notifications@creativehotline.com` | `notifications@creativehotline.com` | ✅ |
| WF4 | Team Notification | `notifications@creativehotline.com` | `notifications@creativehotline.com` | ✅ |
| WF5 | Booking Reminder (customer) | `hello@creativehotline.com` | `hello@creativehotline.com` | ✅ |
| WF5 | Alert Team | `notifications@creativehotline.com` | `notifications@creativehotline.com` | ✅ |
| WF6 | Intake Reminder (customer) | `hello@creativehotline.com` | `hello@creativehotline.com` | ✅ |
| WF6 | Alert Team | `notifications@creativehotline.com` | `notifications@creativehotline.com` | ✅ |
| WF7 | Nurture Email (customer) | `hello@creativehotline.com` | `hello@creativehotline.com` | ✅ |
| WF7 | Alert Team | `notifications@creativehotline.com` | `notifications@creativehotline.com` | ✅ |

---

## Priority Fix List

### Immediate (deactivate/fix today)

1. **Deactivate WF8** (`3ONZZbLdprx4nxGK7eEom`) — completely broken, conflicts with WF2
2. **Deactivate WF9** (`9mct9GBz3R-EjTgQOZcPt`) — completely broken, running every hour for nothing
3. ~~**Fix Tally URL in WF6**~~ **RESOLVED** — already fixed to `b5W1JE` (verified 2026-02-20)
4. **Fix sender email in WF1** — change `jake@radanimal.co` → `hello@creativehotline.com`
5. **Fix sender email in WF3** — change upsell alert from `soscreativehotline@gmail.com` → `notifications@creativehotline.com`

### This Week (data integrity)

6. ~~**Verify WF3 Intake field values**~~ **VERIFIED — fields populate correctly at runtime** (MCP textContent="" is serialization artifact)
7. **Fix WF3 Role type** — change from `select` to `rich_text`
8. **Fix WF3 Desired Outcome type** — change from `select` to `multiSelect`
9. **Fix WF4 Product Purchased type** — change from `rich_text` to `select`
10. **Fix WF4 Phone mapping** — set phoneValue expression
11. **Fix WF1 Product Purchased** — resolve line_items unavailability

### This Week (data integrity + dedup)

12. **Fix WF7 duplicate nurture emails** — add "Nurture Sent" checkbox to Payments DB, filter+set in WF7
13. **Fix WF6 infinite past-due reminders** — add 48hr lower bound cutoff
14. **Fix WF7 website URL** — change `soscreativehotline.com` → `www.thecreativehotline.com`
15. Add email-mismatch fallback notifications to WF2 and WF3
16. Add Stripe Session ID dedup guard to WF1
17. Add duplicate-subscriber check to WF4
18. Set Lead Source in WF1 and WF4
19. Fix WF2 team notification field references

### Next Sprint (robustness)

20. Move Claude API key to n8n credential
21. Rebuild WF8 or merge Tally-sending into WF2
22. Rebuild WF9 for post-call follow-up
23. Update all customer emails to Frankie voice (WF5, WF6, WF7)
24. Fix WF7 CTA to link directly to Calendly instead of homepage

---

## Webhook URL Reference

| Workflow | Path | Full Production URL |
|----------|------|-------------------|
| WF1 | `/webhook/stripe-checkout` | `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout` |
| WF2 | `/webhook/calendly-payments-update` | `https://creativehotline.app.n8n.cloud/webhook/calendly-payments-update` |
| WF3 | `/webhook/tally-intake` | `https://creativehotline.app.n8n.cloud/webhook/tally-intake` |
| WF4 | `/webhook/8e422442-...` | `https://creativehotline.app.n8n.cloud/webhook/8e422442-519e-4d42-8cb4-372d26b89edc` |
| WF8 | `/webhook/calendly-booking` | `https://creativehotline.app.n8n.cloud/webhook/calendly-booking` |

---

## n8n Credential Reference

| Credential | ID | Used By |
|------------|-----|---------|
| SMTP (Email) | `yJP76JoIqqqEPbQ9` | All emailSend nodes |
| Notion API | `rzufpLxiRLvvNq4Z` | All Notion nodes |
| HTTP Header Auth (Laylo) | unknown | WF1 Laylo Subscribe, WF8/WF9 (incorrectly) |
| HTTP Header Auth (Claude) | hardcoded | WF3 Claude Generate Summary |
