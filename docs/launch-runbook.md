# Creative Hotline — Launch Day Runbook

Ordered checklist of everything that needs to happen before the first real customer goes through the pipeline. Organized by priority and dependency.

**Date:** February 20, 2026

---

## Phase 0: Emergency — Do Today (Feb 20)

These must happen before the n8n trial expires (~Feb 23).

- [ ] **Upgrade n8n to Starter plan** ($20/mo)
  - Go to https://creativehotline.app.n8n.cloud → Settings → Subscription
  - Choose Starter plan
  - Starter limit: 5 active workflows

- [ ] **Export all workflow JSON backups**
  - In n8n: Settings → Export → Download all workflows
  - Store in `/docs/n8n-exports/` or Google Drive
  - Backup file also saved in `docs/n8n-workflow-backup.md` (pulled via MCP)

- [ ] **Deactivate WF8 + WF9** (if not already done)
  - WF8 (`3ONZZbLdprx4nxGK7eEom`) — appears already deleted
  - WF9 (`9mct9GBz3R-EjTgQOZcPt`) — appears already deleted
  - If still visible in n8n UI, deactivate them

---

## Phase 1: Notion Schema Updates

These are prerequisites for multiple workflow fixes. Do these first.

- [ ] **Payments DB — Add new properties:**
  - `Thank You Sent` (checkbox) — for WF9 dedup
  - `Booking Reminder Sent` (checkbox) — for consolidated follow-ups dedup
  - `Intake Reminder Sent` (checkbox) — for consolidated follow-ups dedup
  - `Nurture Email Sent` (checkbox) — for consolidated follow-ups dedup
  - `Follow-Up Sent` — add as new Status select option (after "Call Complete")

- [ ] **Clean up test data:**
  - Delete 3 duplicate Jake Goble payment records (keep `3040e73f-fadc-81d0`)
  - Update remaining Jake Goble payment: Product Purchased → "Standard Call", Amount → $499, Status → "Paid - Needs Booking", Lead Source → "Direct"
  - Set Jake Goble intake status to "Submitted"
  - Decide on Sarah/Marcus/Priya test records (delete or keep for reference)

---

## Phase 2: Stripe Setup

- [ ] **Create Stripe Products & Prices:**
  - Product 1: "Standard Call" — $499
  - Product 2: "3-Pack Sprint" — $599 (or finalize price)
  - Product 3: "First Call" — price TBD (intro/discount?)
  - See `docs/stripe-product-setup-guide.md` for full instructions

- [ ] **Create Payment Links** for each product
  - Add metadata to each link: `product_name` = exact Notion select value
  - Optional: `lead_source` metadata for tracking

- [ ] **Update website** Stripe links to point to new Payment Links

- [ ] **Align pricing across all touchpoints:**
  - Website homepage: currently $499
  - Pricing page: currently $500/$599
  - Stripe: whatever you set above
  - Pick ONE price per product and make everything match

---

## Phase 3: n8n Workflow Fixes (In Priority Order)

### 3A: Fix WF1 (Stripe → Calendly)
- [ ] Add "Map Product from Amount" Code node (or metadata mapping)
- [ ] Add duplicate payment guard (check Stripe Session ID)
- [ ] Add Lead Source = "Direct" to Create Notion Lead
- [ ] Replace email template with Frankie voice (from `email-templates-frankie.md` #1)
- [ ] Test with Payload 1 from `test-payloads.md`
- Spec: `docs/wf1-stripe-fix-spec.md`

### 3B: Fix WF4 (Laylo → Notion)
- [ ] Fix Phone mapping (add phoneValue to node config)
- [ ] Set Client Name fallback to email prefix when name unavailable
- [ ] Add duplicate check (by email)
- [ ] Verify "Laylo SMS Signup" works as Product Purchased option
- [ ] Test with Payload 4

### 3C: Fix WF2 (Calendly → Payments)
- [ ] Fix team notification: replace `event_type`/`start_time` with `call_date`
- [ ] Test with Payload 2

### 3D: Fix WF3 (Tally → Claude)
- [ ] **SECURITY:** Move Claude API key from hardcoded header to n8n credential
  - n8n → Credentials → New → HTTP Header Auth → Header: `x-api-key`, Value: `[the key]`
  - Update Claude Generate Summary node to use credential instead of raw header
- [ ] Remove orphaned "Find Notion Lead" node (not connected to anything)
- [ ] Test with Payload 3

### 3E: Build Consolidated Follow-Ups (replaces WF5+6+7)
- [ ] Build single "Daily Follow-Ups" workflow from `docs/wf567-consolidated-spec.md`
- [ ] Use Frankie-voice email templates
- [ ] Fix WF7 "Learn More" URL → https://www.thecreativehotline.com
- [ ] Test each branch independently
- [ ] Deactivate WF5, WF6, WF7
- [ ] Activate consolidated workflow

### 3F: Build WF8 (Calendly → Tally Send)
- [ ] Build from `docs/wf8-rebuild-spec.md`
- [ ] Register Calendly webhook for new URL
- [ ] Test with Payload 5
- [ ] **OR** merge into WF2 to save an active workflow slot

### 3G: Build WF9 (Post-Call Follow-Up)
- [ ] Build from `docs/wf9-rebuild-spec.md`
- [ ] Test with manual Payments DB record (Status = "Call Complete", Call Date = today)
- [ ] Verify dedup (run twice, confirm no double-send)

---

## Phase 4: End-to-End Pipeline Test

After all fixes are in place, run the full sequence:

- [ ] **Step 1:** Send Stripe test payload → verify Payment record created
- [ ] **Step 2:** Send Calendly test payload → verify Call Date set, status updated
- [ ] **Step 3:** Send Calendly→Tally payload (WF8) → verify Tally email sent
- [ ] **Step 4:** Send Tally test payload → verify Intake created, Claude analysis, linked to Payment
- [ ] **Step 5:** Manually set Status → "Call Complete" + Call Date → today
- [ ] **Step 6:** Wait for WF9 daily run (or trigger manually) → verify thank-you email
- [ ] **Step 7:** Check both databases — all fields populated, records linked

Full sequence and payloads in `docs/test-payloads.md`.

---

## Phase 5: Active Workflow Count Check

After all changes, verify you're within the 5-workflow Starter limit:

| # | Workflow | Status |
|---|---------|--------|
| 1 | WF1: Stripe → Calendly | Active (fixed) |
| 2 | WF2: Calendly → Payments (+WF8 merged in) | Active (fixed) |
| 3 | WF3: Tally → Claude | Active (fixed) |
| 4 | WF4: Laylo → Notion | Active (fixed) |
| 5 | Daily Follow-Ups (consolidated WF5+6+7) | Active (new) |
| — | WF9: Post-Call Follow-Up | **6th workflow — over limit!** |

**Options for WF9:**
- A: Merge WF9 into Daily Follow-Ups as a 4th branch → 5 total (fits)
- B: Upgrade to Pro plan → unlimited workflows
- C: Keep WF9 as manual-trigger workflow (doesn't count against active limit if not scheduled) — but loses automation

**Recommended:** Option A — add post-call follow-up as a 4th branch in the consolidated daily workflow. The filter logic is already structured to support additional branches.

---

## Phase 6: Pre-Launch Validation

- [ ] **Pricing alignment:** Same prices on website, Stripe, and in all email templates
- [ ] **All webhook URLs active:** Test each production URL responds (200 OK)
- [ ] **Email deliverability:** Send test from hello@creativehotline.com and notifications@creativehotline.com — confirm not going to spam
- [ ] **Calendly link works:** Click through from email → booking page loads
- [ ] **Tally form works:** Click pre-filled link → form loads with name/email populated
- [ ] **Frankie voice check:** Read all customer-facing emails — do they sound like Frankie?
- [ ] **Website CTAs:** All "Book a Call" buttons → Calendly
- [ ] **Pricing page title:** Fix "Marketio" → "The Creative Hotline — Pricing"

---

## Phase 7: Go Live

- [ ] Delete all test records from both Notion databases
- [ ] Reset all "Sent" checkbox flags
- [ ] Announce launch on Instagram (trigger Laylo drops)
- [ ] Monitor first real customer through entire pipeline
- [ ] Check n8n execution logs for errors after each step

---

## Quick Reference: Where Everything Lives

| Resource | Location |
|----------|----------|
| Workflow backup | `docs/n8n-workflow-backup.md` |
| WF1 fix spec | `docs/wf1-stripe-fix-spec.md` |
| WF8 rebuild spec | `docs/wf8-rebuild-spec.md` |
| WF9 rebuild spec | `docs/wf9-rebuild-spec.md` |
| WF5+6+7 consolidation spec | `docs/wf567-consolidated-spec.md` |
| Email templates | `docs/email-templates-frankie.md` |
| Test payloads | `docs/test-payloads.md` |
| Notion audit | `docs/notion-audit.md` |
| Stripe product setup | `docs/stripe-product-setup-guide.md` |
| Full system reference | `docs/system-reference.md` |

---

## New Issues Found During This Session

These were discovered by pulling live workflow data via n8n MCP:

| # | Issue | Severity | Workflow |
|---|-------|----------|----------|
| 1 | **WF7 "Learn More" URL still points to dead soscreativehotline.com** | High | WF7 |
| 2 | **WF3 Claude API key hardcoded in HTTP Request headers** | High (security) | WF3 |
| 3 | **WF4 Phone not mapped** (phoneValue missing in Notion node) | Medium | WF4 |
| 4 | **WF4 Client Name always blank** (no name fallback) | Medium | WF4 |
| 5 | **WF2 team notification references wrong variables** (event_type, start_time) | Low | WF2 |
| 6 | **WF3 orphaned "Find Notion Lead" node** (dead code) | Low | WF3 |
| 7 | **WF1/5/6/7 email templates not Frankie voice** | Medium | Multiple |
| 8 | **WF5/6/7 all lack dedup** (send same email daily) | High | WF5/6/7 |
