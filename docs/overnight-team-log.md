# Overnight Team Log — Creative Hotline

Communication log between Claude Code and Cowork browser agent.

---

### [Claude Code] — Notion CRM Data Integrity Audit (Feb 20, ~11pm PT)

**What was done:**
- Pulled and cross-referenced ALL records from Payments DB (4 records) and Intake DB (4 records)
- Payments DB has only 4 Jake Goble test entries at $699 each — all with `cs_test_` Stripe IDs, created within 65 minutes of each other on Feb 11
- All 4 payment records have Status = "Call Complete" but NO Call Date, NO Product Purchased, NO Phone, NO Calendly Link, NO Lead Source — confirms WF1 bugs (no dedup guard, Product Purchased null from Stripe webhook, Lead Source not set)
- Intake DB has 3 test clients (Sarah Chen, Marcus Thompson, Priya Malhotra) with NO matching payment records — orphaned intakes
- Jake Goble has 1 intake record with empty AI Intake Summary and no Intake Status set
- Zero Linked Intake/Linked Payment relations are set anywhere — the linking step in WF3 either wasn't triggered or failed silently
- Full findings written to `docs/notion-audit.md`

**Status:** DONE

**Next for Cowork:**
- Delete 3 duplicate Jake Goble payment records (keep `3040e73f-fadc-81d0`)
- Update the keeper: set Product Purchased to "Standard Call", amount to $499, reset Status to "Paid - Needs Booking", set Lead Source to "Direct"
- Set Jake Goble intake status to "Submitted"
- Decide whether to keep or delete Sarah/Marcus/Priya test records

---

### [Claude Code] — WF8 Rebuild Spec: Calendly → Tally Intake Send (Feb 20, ~11pm PT)

**What was done:**
- Wrote complete rebuild specification with node-by-node JSON configs
- Designed: Calendly webhook → Extract data → Get All Payments → Code filter by email → Generate pre-filled Tally link → Send Frankie-voice email → Update status to "Booked - Needs Intake" → Team notification
- Added orphan booking alert (false branch) for email-mismatch cases — this was a known silent failure
- Pre-filled Tally link: `https://tally.so/r/b5W1JE?name={name}&email={email}`
- Error handling (continueRegularOutput) on every external call
- Documented WF2 overlap and future merge recommendation
- Full spec at `docs/wf8-rebuild-spec.md`

**Status:** DONE

**Next for Cowork:**
- Build WF8 in n8n Cloud UI using the spec
- Register new Calendly webhook URL: `https://creativehotline.app.n8n.cloud/webhook/calendly-tally-send`
- Test in n8n test mode before activating
- Consider merging into WF2 later to reduce active workflow count (helps with 5-workflow Starter plan limit)

---

### [Claude Code] — WF9 Rebuild Spec: Post-Call Follow-Up (Feb 20, ~11pm PT)

**What was done:**
- Wrote complete rebuild specification with node-by-node JSON configs
- Root cause documented: original crashed because Notion filter was empty (returned ALL records) and code called `.replace()` on undefined Call Date
- Designed: Daily 6pm PT schedule → Get All Payments → Code filter (Status = "Call Complete" AND Call Date = today AND Thank You Sent = false) → Send Frankie-voice thank-you email → Mark Thank You Sent checkbox → Update status to "Follow-Up Sent" → Team notification
- Critical safeguard: `if (!callDateObj || !callDateObj.start) continue;` — prevents the original crash
- Dedup via "Thank You Sent" checkbox — prevents re-sending
- New "Follow-Up Sent" status for clean pipeline progression
- Error handling on every external call
- Full spec at `docs/wf9-rebuild-spec.md`

**Status:** DONE

**Next for Cowork:**
1. **Before building WF9:** Add "Follow-Up Sent" to Payments DB Status options AND add "Thank You Sent" checkbox property
2. Build WF9 in n8n Cloud UI using the spec
3. Test with a Payment record where Status = "Call Complete" and Call Date = today
4. Verify dedup: run again and confirm same record is not processed twice
5. Action plan delivery notification (part 2) deferred to separate workflow — build after launch stabilizes

---

### [Claude Code] — n8n Workflow Backup + Live Audit (Feb 20, ~11:30pm PT)

**What was done:**
- Pulled all 7 active workflows via n8n MCP and saved complete node configs to `docs/n8n-workflow-backup.md`
- WF8 and WF9 are already deleted from n8n (not just disabled)
- Discovered 8 NEW issues from live workflow data that weren't in the original audit:

| # | Issue | Severity |
|---|-------|----------|
| 1 | **WF7 "Learn More" URL STILL broken** — points to dead soscreativehotline.com | High |
| 2 | **WF3 Claude API key hardcoded** in HTTP Request headers (security risk) | High |
| 3 | **WF4 Phone not mapped** — phoneValue field missing in Notion node | Medium |
| 4 | **WF4 Client Name always blank** — no fallback for Laylo (no name provided) | Medium |
| 5 | **WF2 team notification wrong variables** — references event_type/start_time (don't exist) | Low |
| 6 | **WF3 orphaned node** — "Find Notion Lead" not connected to anything | Low |
| 7 | **WF1/5/6/7 email templates not Frankie voice** — still generic | Medium |
| 8 | **WF5/6/7 all lack dedup** — send same email every day | High |

**Status:** DONE

**Next for Cowork:**
- FIX NOW: WF7 "Learn More" URL → change `soscreativehotline.com` to `www.thecreativehotline.com`
- FIX NOW: WF3 Claude API key → move to n8n credential (HTTP Header Auth), remove from node
- Fix WF4 Phone mapping and Client Name fallback
- Fix WF2 team notification variables

---

### [Claude Code] — Consolidated Follow-Ups Spec (Feb 20, ~11:30pm PT)

**What was done:**
- Wrote complete spec to merge WF5+WF6+WF7 into single "Daily Follow-Ups" workflow
- One schedule trigger (8am), one Notion getAll call, one Code node with 3 output branches
- Each branch: filter → send Frankie-voice email → mark "Sent" checkbox → team alert
- Fixes all 3 dedup bugs (new checkbox properties per branch)
- Fixes WF6 past-due lower cutoff (limits to 2hrs past due, not infinite)
- Fixes WF7 broken URL
- Replaces all generic templates with Frankie voice
- Reduces active workflow count from 7 to 5 (fits Starter plan)
- Full spec at `docs/wf567-consolidated-spec.md`

**Status:** DONE

**Next for Cowork:**
1. Add 3 checkbox properties to Payments DB: Booking Reminder Sent, Intake Reminder Sent, Nurture Email Sent
2. Build consolidated workflow from spec
3. Test each branch
4. Deactivate WF5, WF6, WF7
5. Activate consolidated workflow

---

### [Claude Code] — WF1 Stripe Fix Spec (Feb 20, ~11:30pm PT)

**What was done:**
- Wrote spec for 4 WF1 fixes: product mapping, dedup guard, Lead Source, Frankie email
- Product fix: metadata-based mapping (preferred) or price-to-product Code node (fallback)
- Dedup fix: check Stripe Session ID against existing records before creating new one
- Lead Source: default to "Direct" for Stripe purchases
- Email template swap to Frankie voice
- Full spec at `docs/wf1-stripe-fix-spec.md`

**Status:** DONE

**Next for Cowork:**
- Requires Stripe products/prices to be set up first (see Phase 2 of launch runbook)
- Then implement all 4 fixes in n8n UI

---

### [Claude Code] — Test Payloads + Launch Runbook (Feb 20, ~11:30pm PT)

**What was done:**
- Wrote exact curl/JSON test payloads for all 5 webhooks: `docs/test-payloads.md`
- Includes full pipeline test sequence (Stripe → Calendly → Tally → Claude → Follow-up)
- Wrote phased launch-day runbook: `docs/launch-runbook.md`
  - Phase 0: Upgrade n8n (URGENT — trial expires ~Feb 23)
  - Phase 1: Notion schema changes (checkboxes, status options)
  - Phase 2: Stripe product setup
  - Phase 3: n8n workflow fixes (prioritized order)
  - Phase 4: End-to-end pipeline test
  - Phase 5: Active workflow count check
  - Phase 6: Pre-launch validation
  - Phase 7: Go live

**Status:** DONE

**Next for Cowork:**
- Start with Phase 0 (upgrade n8n) and Phase 1 (Notion schema changes) — these unblock everything else
- Use the runbook as the master checklist going forward

---

### [Cowork] — Browser Session Fixes (Feb 20, ~6pm PT)

**What was done:**
- **Google Meet added to Calendly** — call link now auto-generates
- **Calendly welcome message updated to Frankie voice**
- **n8n upgraded to Pro plan** (not Starter!) — no active workflow limit
- **Fixed critical bug in WF5, WF6, WF7** — all 3 had `return` statement inside the `for` loop, causing them to exit after processing only the first record. Moved `return results` outside the loop in all 3 Code nodes.

**Status:** DONE

---

### [Claude Code] — Notion Schema Updates + Data Cleanup (Feb 20, ~midnight PT)

**What was done:**
- **Added 4 checkbox properties to Payments DB** (via Notion MCP):
  - `Thank You Sent` — for WF9 dedup
  - `Booking Reminder Sent` — for consolidated follow-ups dedup
  - `Intake Reminder Sent` — for consolidated follow-ups dedup
  - `Nurture Email Sent` — for consolidated follow-ups dedup
- **Added "Follow-Up Sent" as new Status option** (green) in Payments DB
- **Updated keeper Jake Goble payment record** (`3040e73f-fadc-81d0`):
  - Product Purchased → "Standard Call"
  - Payment Amount → $499
  - Status → "Paid - Needs Booking"
  - Lead Source → "Direct"
- **Set Jake Goble intake record** (`2ff0e73f-fadc-817d`) Intake Status → "Submitted"
- **3 duplicate Jake Goble payment records flagged for manual deletion** — Notion MCP doesn't support archive/delete. IDs: `3040e73f-fadc-813a`, `3040e73f-fadc-81ee`, `3040e73f-fadc-8109`

**Status:** DONE (except 3 duplicate deletions — need manual action)

**Next for Cowork:**
- Delete 3 duplicate Jake Goble payment records from Notion (IDs above)
- Decide whether to keep or delete Sarah/Marcus/Priya test intake records

---

### [Claude Code] — WF5/6/7 Fix Verification (Feb 20, ~midnight PT)

**What was done:**
- Pulled all 3 follow-up workflows via n8n MCP to verify Cowork's fixes
- Confirmed `return results` fix applied to all 3 Code nodes ✅
- Confirmed Tally URL in WF6 is correct (`b5W1JE`) ✅
- Confirmed sender email is `hello@creativehotline.com` on all 3 ✅

**Remaining issues found:**

| # | Issue | Workflow | Priority |
|---|-------|----------|----------|
| 1 | **WF7 "Learn More" URL still `soscreativehotline.com`** — broken link going to customers | WF7 | **HIGH — fix now** |
| 2 | No dedup checkbox checks in filter code | All 3 | Medium (planned for consolidation) |
| 3 | No lower cutoff on WF6 past-due calls | WF6 | Medium (planned for consolidation) |
| 4 | Email templates still generic (not Frankie voice) | All 3 | Medium (planned for consolidation) |

**Status:** DONE

**Next for Cowork:**
1. **FIX NOW:** WF7 Send Nurture Email node → change `href="https://soscreativehotline.com"` to `href="https://www.thecreativehotline.com"` — this is a dead link customers are clicking
2. Issues 2-4 will be resolved when the consolidated "Daily Follow-Ups" workflow replaces WF5+6+7 (spec at `docs/wf567-consolidated-spec.md`)

---

### [Claude Code] — Batch 2 Complete (Feb 20, ~midnight PT)

**What was done:**

1. **Task 1 — WF7 "Learn More" URL:** Confirmed via n8n MCP that the dead `soscreativehotline.com` URL is still live in WF7's "Send Nurture Email" node HTML. The n8n MCP is read-only (no update capability), so exact find-and-replace instructions are documented in `docs/workflow-health-check.md`. This is the #1 priority for Cowork.

2. **Task 2 — Duplicate Jake Goble Records:** Confirmed all 4 records still exist via Notion MCP search. The Notion MCP does not support archive/delete operations. The 3 duplicates (`3040e73f-fadc-813a`, `3040e73f-fadc-81ee`, `3040e73f-fadc-8109`) must be manually deleted in Notion. The keeper (`3040e73f-fadc-81d0`) was already updated in Batch 1.

3. **Task 3 — Stripe Product Verification:** Jake provided 3 Stripe test-mode products with payment links. Checkout URLs are dynamically rendered (can't extract details via fetch). Wrote `docs/stripe-launch-checklist.md` covering: product-to-offering mapping verification, metadata requirements for WF1 integration, test-to-live migration steps, $1 real charge test procedure, and price alignment across all touchpoints. Key note: Calendly's $499 payment gate is already LIVE — the Stripe payment links are for the direct-purchase flow bypassing Calendly.

4. **Task 4 — Final Workflow Health Check:** Pulled all 7 workflows via n8n MCP and inspected every node against 5 criteria. Results:
   - All 7 active: **PASS**
   - No `soscreativehotline.com` refs: **FAIL** — WF7 Send Nurture Email (exact fix documented)
   - No `marketio-template.webflow.io` refs: **PASS**
   - No personal email senders: **PASS** — all customer emails from `hello@`, all team from `notifications@`
   - No `api.laylo.com` refs: **PASS** — WF1's Laylo calls use correct `laylo.com/api/graphql` endpoint
   - 9 additional issues documented (API key security, wrong variables, missing mappings, etc.)
   - Full report: `docs/workflow-health-check.md`

**Flagged for Cowork / Jake:**

**IMMEDIATE (do before any customer goes through):**
- [ ] **WF7 URL fix** — In n8n UI, open "Laylo Lead Nurture" → "Send Nurture Email" node → change `href="https://soscreativehotline.com"` to `href="https://www.thecreativehotline.com"` → Save & publish
- [ ] **Delete 3 duplicate Jake Goble payment records** in Notion (IDs: `813a`, `81ee`, `8109`)
- [ ] **WF3 Claude API key** — Move hardcoded `sk-ant-api03-...` from HTTP header to n8n credential (HTTP Header Auth type). This is a security risk.

**BEFORE STRIPE DIRECT PURCHASE GO-LIVE:**
- [ ] Verify which of the 3 Stripe products is Standard Call ($499), 3-Pack Sprint ($599), First Call (TBD)
- [ ] Add `product_name` metadata to each Stripe payment link (must match Notion select values exactly)
- [ ] Apply WF1 fixes from `docs/wf1-stripe-fix-spec.md`
- [ ] Switch Stripe to live mode and recreate products/links
- [ ] Test with real $1 charge

**ONGOING (fix specs already written):**
- [ ] WF2 team notification wrong variables (`event_type`/`start_time` → `call_date`)
- [ ] WF4 Phone mapping + Client Name fallback
- [ ] WF3 orphaned "Find Notion Lead" node (delete it)
- [ ] Build consolidated follow-ups workflow (from `wf567-consolidated-spec.md`)
- [ ] Build WF8 from `wf8-rebuild-spec.md`
- [ ] Build WF9 from `wf9-rebuild-spec.md`
- [ ] End-to-end pipeline test using `docs/test-payloads.md`
- [ ] Pre-launch validation (pricing alignment, email deliverability, Frankie voice check)

**Status:** DONE

---

### Status Summary — What's Left Before Launch

**Completed (Phase 0-1 of runbook + Batch 1-2):**
- [x] n8n upgraded to Pro (no workflow limit concern)
- [x] Notion schema updated (4 checkboxes + Follow-Up Sent status)
- [x] Test data partially cleaned (keeper fixed, intake status set)
- [x] WF5/6/7 critical filter bug fixed
- [x] Google Meet added to Calendly
- [x] Calendly welcome message → Frankie voice
- [x] All specs and rebuild docs written
- [x] Stripe product verification report written
- [x] Full workflow health check completed (4/5 pass)
- [x] All email senders verified correct

**Needs Cowork/Manual Action:**
- [ ] **FIX NOW:** WF7 "Learn More" URL → `www.thecreativehotline.com` (see `docs/workflow-health-check.md` for exact HTML)
- [ ] **FIX NOW:** Delete 3 duplicate Jake Goble payment records
- [ ] **FIX NOW:** WF3 Claude API key → move to n8n credential
- [ ] Verify Stripe products → add metadata → WF1 fixes → go live (see `docs/stripe-launch-checklist.md`)
- [ ] WF2 team notification variables
- [ ] WF4 Phone mapping + Client Name fallback
- [ ] Build consolidated follow-ups workflow (from `wf567-consolidated-spec.md`)
- [ ] Build WF8 from `wf8-rebuild-spec.md`
- [ ] Build WF9 from `wf9-rebuild-spec.md`
- [ ] End-to-end pipeline test
- [ ] Pre-launch validation (pricing alignment, email deliverability, etc.)

### New Docs Created in Batch 2
- `docs/stripe-launch-checklist.md` — Stripe product verification, go-live steps, $1 test procedure
- `docs/workflow-health-check.md` — Full 7-workflow health audit with 5-point check and 9 additional findings

---

### [Claude Code] — Batch 3: Stripe Live Products Integration (Feb 20, ~1am PT)

**What was done:**

Jake created 3 live Stripe products with payment links. This batch audited all workflows for Stripe references and updated all docs to reflect the new confirmed pricing.

**1. Workflow Stripe Audit (All 7 active + WF8/WF9 confirmed deleted):**

| Check | Result |
|-------|--------|
| `buy.stripe.com/test` URLs | **None found** — no workflows link directly to Stripe checkout |
| Sandbox product IDs (`prod_Twu*`) | **None found** — these were never in workflows |
| Test Stripe API keys (`sk_test_`, `pk_test_`) | **None found** — WF1 uses plain webhook, no Stripe SDK |
| Test webhook endpoints | WF1 webhook has no Stripe signature verification (see below) |

**2. WF1 Webhook Analysis:**
- Listens for POST to `/webhook/stripe-checkout` (production: `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout`)
- Event type: `checkout.session.completed` (matched in workflow by checking `$json.body.type`)
- **No webhook signing secret configured** — n8n accepts ANY POST to this URL. Not a blocker for launch but a security gap (anyone could fake a payment event)
- **No product-specific filtering** — processes all checkout events regardless of product
- Product name mapping is broken (reads `line_items.data[0].description` which is always null)
- **Jake needs to register this URL as a webhook endpoint in Stripe Dashboard → Developers → Webhooks** for live mode events

**3. Major Pricing Update — ALL docs updated:**

| Product | Old Price (in specs) | New Confirmed Price |
|---------|---------------------|-------------------|
| First Call | TBD | **$499** |
| Standard Call | $499 | **$699** |
| 3-Session Clarity Sprint | $599 ("3-Pack Sprint") | **$1,495** |

This changes several things:
- Calendly's $499 gate is for **First Call** (not Standard Call as previously assumed)
- Website homepage $499 refers to First Call
- The WF1 fix spec price map was completely wrong — now corrected
- Notion needs "3-Session Clarity Sprint" added to Product Purchased options

**4. Docs updated:**
- `docs/system-reference.md` — Added full "Stripe Products" section with live links, Calendly distinction, metadata requirements. Updated Payments DB schema (Follow-Up Sent status, Product Purchased note). Fixed incorrect sender notes (marked as resolved). Fixed WF6 Tally URL note (marked as resolved).
- `docs/wf1-stripe-fix-spec.md` — Updated price map ($499→First Call, $699→Standard Call, $1495→3-Session Clarity Sprint), added live payment link table, updated Stripe setup section to reflect live products done.
- `docs/stripe-launch-checklist.md` — Replaced test product table with live products, updated go-live steps (metadata first, then webhook registration, then Notion update), corrected price alignment table.

**Flagged for Cowork / Jake:**

**IMMEDIATE:**
- [ ] **Add metadata to all 3 live payment links** in Stripe Dashboard:
  - First Call → `product_name` = `First Call`
  - Standard Call → `product_name` = `Standard Call`
  - 3-Session Clarity Sprint → `product_name` = `3-Session Clarity Sprint`
- [ ] **Register Stripe webhook** for live mode: Stripe Dashboard → Developers → Webhooks → Add endpoint `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout` → Event: `checkout.session.completed`
- [ ] **Add "3-Session Clarity Sprint"** to Notion Payments DB Product Purchased select options

**BEFORE DIRECT PURCHASE GO-LIVE:**
- [ ] Apply WF1 fixes from updated `docs/wf1-stripe-fix-spec.md` (product mapping, dedup, Lead Source, Frankie email)
- [ ] Update website pricing page: $500 → $499 (First Call), add $699 (Standard Call), $599 → $1,495 (3-Session Clarity Sprint)
- [ ] Test with a real $1 charge (procedure in `docs/stripe-launch-checklist.md`)

**Status:** DONE

---

### [Claude Code] — Batch 4: Final Pre-Launch Verification (Feb 20, ~2am PT)

**What was done:**

Cowork completed several items since Batch 3: WF7 URL fix (reported), 3 duplicate records deleted, "3-Session Clarity Sprint" added to Notion, Stripe webhook registered, WF3 API key documented for Jake, Webflow fix PDF sent. This batch verified all of that and produced final launch documentation.

**1. Final Workflow Verification Sweep (all 7 workflows re-pulled via n8n MCP):**

| # | Workflow | Dead Domain | Template Refs | Email Senders | Tally URL | Calendly URL |
|---|---------|-------------|---------------|---------------|-----------|-------------|
| 1 | Stripe → Calendly | PASS | PASS | PASS | N/A | PASS |
| 2 | Calendly → Payments | PASS | PASS | PASS | N/A | N/A |
| 3 | Tally → Claude | PASS | PASS | PASS | N/A | N/A |
| 4 | Laylo → Notion | PASS | PASS | PASS | N/A | N/A |
| 5 | Paid But Never Booked | PASS | PASS | PASS | N/A | PASS |
| 6 | Booked But No Intake | PASS | PASS | PASS | PASS | N/A |
| 7 | Laylo Lead Nurture | **FAIL** | PASS | PASS | N/A | N/A |

**WF7 URL NOT FIXED:** The n8n MCP shows WF7 `Send Nurture Email` still contains `href="https://soscreativehotline.com"`. Same `versionId` and `updatedAt` as Batch 2/3 pulls. Either the change wasn't saved/published, or the fix was not applied.

**ACTION REQUIRED:** Verify in n8n Cloud UI and re-apply if needed.

**2. WF1 Webhook + Signing Secret Documentation:**
- WF1 uses generic `n8n-nodes-base.webhook` v2.1 with `authentication: "none"` — no signature verification
- Documented 3 fix options in `wf1-stripe-fix-spec.md` Problem 5
- Priority: MEDIUM (not a launch blocker)

**3. End-to-End Test Plan:** `docs/e2e-test-plan.md`
- Pre-test checklist, 5 test scenarios, known gaps table, rollback plan

**4. docs/system-reference.md updated:**
- WF8/WF9 → "DELETED from n8n"
- Payments DB schema: added 4 checkboxes, updated Product Purchased options
- Marked resolved: WF3 type mappings, sender fixes, WF6 Tally URL, Stripe webhook registration

**Flagged for Cowork / Jake:**

**CRITICAL:**
- [ ] **Verify WF7 URL fix** — n8n MCP still shows dead domain. Check browser UI.
- [ ] **Add `product_name` metadata** to Stripe payment links
- [ ] **Apply WF1 core fixes** (product mapping + dedup)

**RECOMMENDED:**
- [ ] Stripe signature verification (WF1)
- [ ] WF4 Phone/Name/Product fixes
- [ ] WF2 team notification variable fix
- [ ] Full e2e test from `docs/e2e-test-plan.md`

### New/Updated Docs
- `docs/workflow-health-check.md` — Added Final Verification Sweep section
- `docs/wf1-stripe-fix-spec.md` — Added Problem 5 (signature verification)
- `docs/e2e-test-plan.md` — NEW
- `docs/system-reference.md` — Updated with Batch 1-4 state

**Status:** DONE
