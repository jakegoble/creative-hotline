# Creative Hotline — Detailed System Reference

## Workflow: Stripe Purchase → Calendly
**ID:** `AMSvlokEAFKvF_rncAFte`
**Trigger:** Stripe webhook (checkout.session.completed)
**Webhook URL:** `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout`

Flow: Stripe Webhook → Extract Data → Create Notion Lead (Payments DB) → Has Phone? → Laylo Subscribe (SMS or Email) → Wait 10s → Send Calendly Link → Team Notification

Extract Data pulls: name, email, phone, product_name, amount, stripe_session_id from Stripe payload.
Create Notion Lead: Status = "Paid - Needs Booking".
Error Handling: Laylo and Notion nodes use continueRegularOutput so customer email always fires.

**Known issues:**
- product_name maps from `line_items.data[0].description` but Stripe webhook does NOT include line_items. Value is always null. Fix spec: `wf1-stripe-fix-spec.md` Problem 1.
- ~~Product Purchased options need "3-Session Clarity Sprint"~~ ADDED by Cowork (Feb 20).
- ~~Customer email sent from `jake@radanimal.co`~~ FIXED — now `hello@creativehotline.com`.
- No duplicate-payment guard (Stripe webhook retries create duplicate records). Fix spec: `wf1-stripe-fix-spec.md` Problem 2.
- Lead Source property not set. Fix spec: `wf1-stripe-fix-spec.md` Problem 3.
- Webhook has no Stripe signature verification. Stripe webhook is registered with a signing secret (stored in Stripe Dashboard). Fix spec: `wf1-stripe-fix-spec.md` Problem 5.
- Price-based fallback mapping updated in fix spec for live prices: $499=First Call, $699=Standard Call, $1495=3-Session Clarity Sprint.

## Workflow: Calendly Booking → Payments Update
**ID:** `Wt7paQoH2EICMtUG`
**Trigger:** Calendly webhook (invitee.created)
**Webhook URL:** `https://creativehotline.app.n8n.cloud/webhook/calendly-payments-update`

Flow: Calendly Webhook → Extract Booking Data → Find Payment by Email → Update Status (→ Booked - Needs Intake) → Team Notification

Extract Booking Data pulls: email, name, call_date, calendly_link from Calendly payload.
Update: Sets Call Date, Calendly Link, Status.

**Known issues:**
- If customer used different email for Stripe vs Calendly, Find Payment returns 0 results and silently fails. Needs fallback notification.
- Team notification email references `event_type` and `start_time` which don't exist in extracted data (should be `call_date`).

## Workflow: Tally Intake → Claude Analysis
**ID:** `ETKIfWOX-eciSJQQF7XX5`
**Trigger:** Tally webhook (form submission)
**Webhook URL:** `https://creativehotline.app.n8n.cloud/webhook/tally-intake`

Flow: Tally Webhook → Extract Tally Data (Code Node) → Create Intake Record → Claude API Call → Update Notion with AI Summary → Upsell check → Find Payment by Email → Link Intake & Update Status → Team Notification

Extract Tally Data: JavaScript code node, label-based fuzzy matching against data.fields array.
Claude API: POST api.anthropic.com/v1/messages, model claude-sonnet-4-5-20250929, max 1024 tokens. Returns ai_summary + upsell_detected (boolean).

**Known issues:**
- Multiple rich_text fields (Brand, Creative Emergency, What They've Tried, Deadline, Constraints, Client Name) have empty textContent in node config — intake records may be created with blank fields. Needs live verification.
- AI Intake Summary update also has empty textContent — summary may not persist.
- ~~Role mapped as `select`~~ Verified Feb 20: WF3 maps Role as `rich_text` — correct.
- ~~Desired Outcome mapped as `select`~~ Verified Feb 20: WF3 maps Desired Outcome as `multi_select` — correct.
- Same email-mismatch silent failure as Calendly workflow.
- ~~Upsell alert sent from `soscreativehotline@gmail.com`~~ FIXED — now `notifications@creativehotline.com`.
- Orphaned "Find Notion Lead" node not connected to any other node.
- Claude API key hardcoded in HTTP Request headers (should use n8n credential).

## Workflow: Laylo Subscriber → Notion
**ID:** `MfbV3-F5GiMwDs1KD5AoK`
**Trigger:** Laylo webhook
**Webhook URL:** https://creativehotline.app.n8n.cloud/webhook/8e422442-519e-4d42-8cb4-372d26b89edc

Flow: Laylo Webhook → Extract Subscriber Data → Create Lead (Status = "Lead - Laylo", Amount = 0) → Team Notification

**Known issues:**
- Product Purchased mapped as `rich_text` but Notion type is `select` — type mismatch.
- Phone number extracted from webhook but phoneValue not mapped in Notion node — phone is lost.
- Client Name always blank (Laylo doesn't provide name; should fallback to email).
- Lead Source not set (should be "IG DM").
- No duplicate check — multiple IG keywords create duplicate records.

## Follow-Up Workflows (All 3 share this pattern)
Schedule Trigger (Daily) → Get All Payments from Notion → Filter in Code Node (status + age) → Matches? → Customer Reminder + Team Alert

Design decision: Uses Notion getAll + Code node filtering (more reliable than Notion API filters for date math).

### Follow-Up 1: Paid But Never Booked
ID: clCnlUW1zjatRHXE | Daily 9am | Filter: Status = "Paid - Needs Booking" AND 48hrs+ old
Status: **Working correctly.** No issues found.

### Follow-Up 2: Booked But No Intake
ID: Esq2SMGEy6LVHdIQ | Daily 8am | Filter: Status = "Booked - Needs Intake" AND call within 24hrs
~~**CRITICAL:** Tally form URL is placeholder~~ FIXED — now `b5W1JE` (verified Feb 20).

### Follow-Up 3: Laylo Lead Nurture
ID: VYCokTqWGAFCa1j0 | Daily 10am | Filter: Status = "Lead - Laylo" AND 3-7 days old
**Issue:** "Learn More" button links to `soscreativehotline.com` (doesn't exist) — should be `www.thecreativehotline.com`.

## Utility Workflows (Both need rebuild)

### Calendly Booking → Tally
**ID:** `3ONZZbLdprx4nxGK7eEom` | **Status: DELETED from n8n (Feb 20)**
**Webhook URL:** `https://creativehotline.app.n8n.cloud/webhook/calendly-booking`

Intended flow: Calendly booking → send Tally form link → wait 24hrs → check if intake submitted → send reminder if not.

**Why it's broken:** Queries wrong DB (Intake instead of Payments). Update node has empty properties. "Send Tally Intake" and "Send Intake Reminder" nodes call Laylo messaging API (`api.laylo.com/v1/messages/send`) with empty bodies instead of sending email. All filter/body values are empty. Also conflicts with WF2 which handles the same Calendly webhook event.

### Post-Call Follow-Up
**ID:** `9mct9GBz3R-EjTgQOZcPt` | **Status: DELETED from n8n (Feb 20)**

Intended flow: Check hourly → find completed calls without action plans → send thank you → mark action plan sent.

**Why it's broken:** Notion filter conditions have empty values (returns ALL Intake DB records). "Send Thank You" calls Laylo messaging API with empty body instead of sending email. "Mark Action Plan Sent" update node has no properties mapped.

## Notion Database Schemas (Verified 2026-02-20)

### Payments Database (`3030e73ffadc80bcb9dde15f51a9caf2`)
| Property | Type | Options/Notes |
|----------|------|--------------|
| Client Name | title | — |
| Email | email | — |
| Phone | phone_number | — |
| Payment Amount | number (dollar) | — |
| Product Purchased | **select** | "3-Pack Sprint", "Standard Call", "First Call", "3-Session Clarity Sprint" |
| Payment Date | date | — |
| Stripe Session ID | text (rich_text) | — |
| Status | select | "Lead - Laylo", "Paid - Needs Booking", "Booked - Needs Intake", "Intake Complete", "Ready for Call", "Call Complete", "Follow-Up Sent" |
| Call Date | date | — |
| Calendly Link | url | — |
| Linked Intake | relation → Intake DB | — |
| Lead Source | select | "IG DM", "IG Comment", "IG Story", "Meta Ad", "LinkedIn", "Website", "Referral", "Direct" |
| Booking Reminder Sent | checkbox | For WF5 dedup |
| Intake Reminder Sent | checkbox | For WF6 dedup |
| Nurture Email Sent | checkbox | For WF7 dedup |
| Thank You Sent | checkbox | For WF9 dedup |
| Days to Convert | formula | — |
| Created | created_time | — |

### Intake Database (`2f60e73ffadc806bbf5ddca2f5c256a3`)
| Property | Type | Options/Notes |
|----------|------|--------------|
| Client Name | title | — |
| Email | email | — |
| Role | **text** (rich_text) | Not select |
| Brand | text (rich_text) | — |
| Website / IG | url | — |
| Creative Emergency | text (rich_text) | — |
| Desired Outcome | **multi_select** | "A clear decision", "Direction I can trust", "A short action plan", "Stronger positioning", "Someone to tell me the truth" |
| What They've Tried | text (rich_text) | — |
| Deadline | text (rich_text) | — |
| Constraints / Avoid | text (rich_text) | — |
| Intake Status | select | "Not Started", "Submitted" |
| AI Intake Summary | text (rich_text) | — |
| Action Plan Sent | **checkbox** | — |
| Call Date | date | — |
| Linked Payment | relation → Payments DB | — |

## Complete Email Map
Customer-facing (from hello@creativehotline.com): Calendly link, booking reminder, intake reminder, lead nurture
Team notifications (from notifications@creativehotline.com → jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com): payment alert, booking alert, intake notification, upsell alert, subscriber alert, stale booking alert, missing intake alert, lead nurture alert

**Email sender audit (all verified correct Feb 20):**
- All 12 email nodes across 7 workflows use correct senders
- Customer-facing: `hello@creativehotline.com`
- Team notifications: `notifications@creativehotline.com`
- No personal addresses (`jake@radanimal.co`, `soscreativehotline@gmail.com`) used as senders

## Webhook URL Reference
| Workflow | Path | Full Production URL |
|----------|------|-------------------|
| WF1: Stripe → Calendly | `/webhook/stripe-checkout` | `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout` |
| WF2: Calendly → Payments | `/webhook/calendly-payments-update` | `https://creativehotline.app.n8n.cloud/webhook/calendly-payments-update` |
| WF3: Tally → Claude | `/webhook/tally-intake` | `https://creativehotline.app.n8n.cloud/webhook/tally-intake` |
| WF4: Laylo → Notion | `/webhook/8e422442-...` | `https://creativehotline.app.n8n.cloud/webhook/8e422442-519e-4d42-8cb4-372d26b89edc` |
| WF8: Cal → Tally (BROKEN) | `/webhook/calendly-booking` | `https://creativehotline.app.n8n.cloud/webhook/calendly-booking` |

## n8n Credentials
| Credential | ID | Used By |
|------------|-----|---------|
| SMTP (Email) | `yJP76JoIqqqEPbQ9` | All emailSend nodes |
| Notion API | `rzufpLxiRLvvNq4Z` | All Notion nodes |
| HTTP Header Auth (Laylo) | — | WF1 Laylo Subscribe nodes |
| Claude API | **hardcoded** (not in credentials) | WF3 Claude Generate Summary |

## Stripe Products (Live — Updated Feb 20, 2026)

### Payment Links (LIVE Mode)

| Product | Price | Payment Link URL |
|---------|-------|-----------------|
| First Call | $499 | `https://buy.stripe.com/14AaEQcDDaY43eFdT59ws00` |
| Standard Call | $699 | `https://buy.stripe.com/eVqbIUeLL1nu02t16j9ws02` |
| 3-Session Clarity Sprint | $1,495 | `https://buy.stripe.com/4gMcMY9rr2rycPfdT59ws03` |

### Calendly Payment Gate (Separate Stripe Connection)
- Calendly has its own Stripe integration for the $499 First Call payment gate
- This is a SEPARATE Stripe connection from the n8n webhook flow
- When a customer pays via Calendly, WF2 fires on the booking event (not WF1)
- The payment links above are for direct-purchase flows (website CTAs, DMs, email links, Laylo drops)

### Which Workflows Interact with Stripe
- **WF1** (Stripe Purchase → Calendly): Triggered by Stripe `checkout.session.completed` webhook. Receives payments from the direct payment links above. Currently has product mapping bug (always null).
- **WF2** (Calendly → Payments): Indirectly — Calendly collects payment via its own Stripe connection, then fires a webhook to WF2. WF2 does not interact with Stripe directly.

### Notion Product Purchased Options (Updated Feb 20)
Current options: "Standard Call", "3-Pack Sprint", "First Call", "3-Session Clarity Sprint"
**Note:** "3-Pack Sprint" is the old name — consider removing it after confirming no records use it.

### Metadata Requirements for WF1
Each payment link should have metadata key `product_name` set to the exact Notion select value:
- First Call link → `product_name` = `First Call`
- Standard Call link → `product_name` = `Standard Call`
- 3-Session Clarity Sprint link → `product_name` = `3-Session Clarity Sprint`

---

## Frankie Brand Voice
Personality: Warm, approachable, witty, confident, human-centered. Virtual hotline operator.
Tone: Calm, confident, clear. Conversational not robotic. Zero buzzwords. No motivational language. Lead with problem/solution. One decision at a time.
Use first person: "I," "Frankie"

## Website Issues (Feb 2026 — Updated after Webflow publish)

### Fixed by Dev
- ~~Book a Call buttons → contact page~~ NOW link to Calendly
- ~~Footer: placeholder Dubai address~~ NOW "Based in Venice, CA"
- ~~Tab titles: "Marketio"~~ FIXED on homepage + contact page
- ~~Template pages in footer~~ REMOVED
- ~~Pricing page empty~~ NOW has pricing content
- ~~Social links unverified~~ NOW LinkedIn, Instagram, Facebook present

### Still Open
1. Contact form not connected to pipeline (Webflow form → dead end)
2. Pricing page title still shows "Marketio - Webflow Ecommerce Website Template"
3. Some nav links still broken (# anchors in some instances)
4. Pricing inconsistency: homepage $499 vs pricing page $500/$599
5. No Tally form embed on contact page (clients discover it only via email)
6. No Calendly embed (external links work but no embedded widget)
7. Footer email signup destination unclear

### Recommendation
Embed Calendly widget + Tally form on contact page. Fix pricing page title. Align pricing amounts across site and Stripe. Connect contact form to n8n webhook or redirect to Calendly.
