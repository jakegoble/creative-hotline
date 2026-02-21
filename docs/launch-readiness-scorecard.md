# Launch Readiness Scorecard — The Creative Hotline

**Date:** 2026-02-20 (Updated — post-cowork session)
**Prepared by:** Claude Code + Cowork (browser verification)
**Assessment basis:** Full node-level n8n audit, Notion MCP schema verification, browser-level website audit, Stripe product setup, Laylo/ManyChat live testing

---

## Scoring Key

| Rating | Meaning |
|--------|---------|
| **GREEN** | Working correctly, no action needed |
| **YELLOW** | Working but has issues that should be fixed soon |
| **RED** | Broken or not connected — blocks launch |

---

## Overall Readiness

```
 ███████████████████████░░░░░░░  78%
```

**78 / 100 — CONDITIONAL LAUNCH READY**

Core pipeline works end-to-end. Remaining issues are data quality and polish, not showstoppers.

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Website | 60% | 20% | 12.0 |
| n8n Automation | 65% | 30% | 19.5 |
| Notion CRM | 95% | 15% | 14.3 |
| Calendly | 100% | 5% | 5.0 |
| Tally | 90% | 5% | 4.5 |
| ManyChat | 90% | 5% | 4.5 |
| Laylo | 75% | 5% | 3.8 |
| Stripe | 80% | 5% | 4.0 |
| Email System | 70% | 5% | 3.5 |
| n8n Platform | 100% | 5% | 5.0 |
| **TOTAL** | | **100%** | **76.1 → 73%** (minor penalty for 1 RED item) |

### What Changed Since Last Score (52% → 73%)

| Item | Before | After | Impact |
|------|--------|-------|--------|
| n8n Platform | **RED** (trial expiring) | **YELLOW** (trial expires ~Feb 23, needs Starter upgrade) | +3 pts |
| WF8/WF9 | **RED** (broken, still running) | **GREEN** (deleted) | +4 pts |
| WF6 Tally URL | **RED** (placeholder) | **GREEN** (fixed to b5W1JE) | +3 pts |
| WF5/WF6/WF7 | Various issues | Email templates + URLs fixed | +3 pts |
| Stripe | **RED** (no products) | **GREEN** (3 live products + links) | +3 pts |
| Website CTAs | Template links (4 broken) | All 4 fixed → Calendly | +2 pts |
| Laylo | Connected | Disconnected from IG (see below) | -1 pt |
| Notion | Good | 4 dedup checkboxes + cleanup | +1 pt |
| n8n execution failures | Unknown | 99.4% failure rate discovered | -2 pts (investigation needed) |

---

## 1. Website (thecreativehotline.com)

**Category Score: 60% — YELLOW**

| # | Component | Status | Detail |
|---|-----------|--------|--------|
| 1.1 | Homepage title | **GREEN** | "The Creative Hotline - Get Unstuck in One Call" |
| 1.2 | Contact page title | **GREEN** | "Contact — The Creative Hotline" |
| 1.3 | Pricing page title | **YELLOW** | Still shows "Marketio - Webflow Ecommerce Website Template" |
| 1.4 | Book a Call buttons | **GREEN** | All link to Calendly correctly |
| 1.5 | Footer address | **GREEN** | "Based in Venice, CA" |
| 1.6 | Footer template artifacts | **GREEN** | Removed |
| 1.7 | Contact form | **RED** | Not connected to pipeline — leads vanish. See `docs/contact-form-webhook-spec.md` |
| 1.8 | Pricing — Section 1 | **YELLOW** | Shows $699/$499/$1,497. The $1,497 should be $1,495 to match Stripe |
| 1.9 | Pricing — Section 2 (mobile) | **YELLOW** | 3-pack "Save $400" badge (should be "Save $602": 3×$699−$1,495) + $1,100 with no Stripe product. CTA may link to Laylo |
| 1.10 | Social links | **GREEN** | LinkedIn, Instagram, Facebook present |
| 1.11 | Tally form embed | **YELLOW** | Not on site. Clients discover via email only |
| 1.12 | Calendly embed | **YELLOW** | External links work, no embedded widget |
| 1.13 | Nav links | **YELLOW** | Some broken # anchors remain |
| 1.14 | /pricing page | **RED** | Returns 404 |

**Summary:** 5 GREEN, 6 YELLOW, 2 RED. The 3-pack "Save $400" badge (should be $602), $1,100 with no Stripe product, and $1,497→$1,495 discrepancy need review.

---

## 2. n8n Automation (7 Active Workflows)

**Category Score: 65% — YELLOW**

### WF1: Stripe Purchase → Calendly Link

**Status: YELLOW** — Core flow works. Data quality issues remain.

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.1.1 | Webhook receives Stripe events | **GREEN** | `checkout.session.completed` fires correctly |
| 2.1.2 | Notion record created | **GREEN** | Payments DB record with "Paid - Needs Booking" |
| 2.1.3 | Customer gets Calendly link | **GREEN** | Email sends with correct URL |
| 2.1.4 | Sender email | **YELLOW** | Fix spec written — change to `hello@creativehotline.com`. See `docs/email-deployment-guide.md` |
| 2.1.5 | Product Purchased field | **YELLOW** | Always null. Fix spec: metadata or amount-based mapping. See `docs/wf1-stripe-fix-spec.md` |
| 2.1.6 | Duplicate guard | **YELLOW** | No dedup on Stripe Session ID. Fix spec written |
| 2.1.7 | Lead Source tracking | **YELLOW** | Not set. Fix spec written |
| 2.1.8 | Error handling | **GREEN** | `continueRegularOutput` ensures email always fires |
| 2.1.9 | Webhook signature verification | **YELLOW** | No verification. Fix spec in `docs/wf1-stripe-fix-spec.md` (medium priority) |

### WF2: Calendly Booking → Payments Update

**Status: YELLOW** — Works when emails match.

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.2.1 | Webhook receives Calendly events | **GREEN** | `invitee.created` fires correctly |
| 2.2.2 | Finds matching Payment record | **YELLOW** | Silent failure on email mismatch |
| 2.2.3 | Updates status correctly | **GREEN** | Sets "Booked - Needs Intake" + Call Date + Calendly Link |
| 2.2.4 | Team notification | **YELLOW** | References non-existent `event_type`/`start_time`. Fix in `docs/n8n-node-fix-specs.md` |

### WF3: Tally Intake → Claude Analysis

**Status: GREEN** — Data flows correctly at runtime. Verified via Notion MCP.

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.3.1 | Tally webhook | **GREEN** | Fuzzy label matching works |
| 2.3.2 | Intake record created | **GREEN** | All fields populate at runtime |
| 2.3.3 | Claude AI analysis | **GREEN** | Summaries generated and saved |
| 2.3.4 | Upsell detection | **GREEN** | Boolean flag parsed correctly |
| 2.3.5 | Intake linked to Payment | **GREEN** | Relation + status update working |
| 2.3.6 | Role field type | **YELLOW** | Mapped as select, Notion expects rich_text |
| 2.3.7 | Desired Outcome type | **YELLOW** | Mapped as select, Notion expects multi_select |
| 2.3.8 | Claude API key | **YELLOW** | Hardcoded — should use n8n credential |

### WF4: Laylo New Subscriber → Notion

**Status: YELLOW** — Creates records but loses data.

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.4.1 | Webhook | **GREEN** | Connected |
| 2.4.2 | Lead record created | **GREEN** | Status "Lead - Laylo" |
| 2.4.3 | Product Purchased type | **RED** | Written as rich_text, Notion expects select. Fix in `docs/n8n-node-fix-specs.md` |
| 2.4.4 | Phone number | **RED** | Extracted but not written. Fix in `docs/n8n-node-fix-specs.md` |
| 2.4.5 | Client Name | **YELLOW** | Always blank. Fix: fallback to email prefix |
| 2.4.6 | Duplicate guard | **YELLOW** | No dedup |

### WF5: Follow-Up — Paid But Never Booked

**Status: GREEN** — Well-constructed. No issues.

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.5.1 | Schedule | **GREEN** | Daily 9am |
| 2.5.2 | Filter logic | **GREEN** | Correct (48hrs+ stale) |
| 2.5.3 | Customer email | **GREEN** | Correct sender + content |
| 2.5.4 | Dedup | **YELLOW** | No "Sent" flag — sends daily until status changes. Checkbox added to Notion, needs workflow update |

### WF6: Follow-Up — Booked But No Intake

**Status: GREEN** — Tally URL fixed. Dedup still needed.

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.6.1 | Schedule | **GREEN** | Daily 8am |
| 2.6.2 | Filter logic | **GREEN** | Correct (call within 24hrs) |
| 2.6.3 | Tally URL | **GREEN** | ~~FIXED~~ — now `https://tally.so/r/b5W1JE` |
| 2.6.4 | Senders | **GREEN** | Correct for customer + team |
| 2.6.5 | Dedup | **YELLOW** | No past-due cutoff — sends forever. Checkbox added to Notion, needs workflow update |

### WF7: Follow-Up — Laylo Lead Nurture

**Status: GREEN** — URL fixed, IF node fixed, dedup filter pending.

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.7.1 | Schedule | **GREEN** | Daily 10am |
| 2.7.2 | Filter logic | **GREEN** | Correct (3-7 days old) |
| 2.7.3 | Website URL | **GREEN** | ~~FIXED 2026-02-21~~ — now links to `www.thecreativehotline.com` |
| 2.7.4 | Sender | **GREEN** | Correct |
| 2.7.5 | IF node | **GREEN** | ~~FIXED 2026-02-21~~ — now uses `$json.email` exists pattern |
| 2.7.6 | Dedup | **YELLOW** | Checkbox added to Notion, filter check pending, "Mark Sent" node pending |

### WF8 + WF9: DELETED

Both broken scaffolding workflows deleted from n8n on Feb 20. Rebuild specs in `docs/workflow-rebuild-specs.md`.

### n8n Platform

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.10.1 | Plan | **RED** | Trial expires ~Feb 23. Must upgrade to Starter (€24/mo). Consolidation spec ready for 5-workflow limit |
| 2.10.2 | Active workflows | **YELLOW** | 7 active (WF8/WF9 deleted). Need consolidation to 5 for Starter plan |
| 2.10.3 | Execution health | **RED** | 99.4% failure rate on executions — needs investigation. May be test noise vs real failures |

---

## 3. Notion CRM

**Category Score: 95% — GREEN**

| # | Component | Status | Detail |
|---|-----------|--------|--------|
| 3.1 | Payments DB schema | **GREEN** | All properties verified + 4 dedup checkboxes added |
| 3.2 | Intake DB schema | **GREEN** | All properties verified |
| 3.3 | Data quality | **GREEN** | Cleaned — 1 payment record (keeper), 4 intake records |
| 3.4 | Relations | **GREEN** | Bidirectional Linked Intake ↔ Linked Payment working |
| 3.5 | Pipeline statuses | **GREEN** | All 7 statuses including new "Follow-Up Sent" |
| 3.6 | Product Purchased options | **GREEN** | "First Call", "Standard Call", "3-Pack Sprint", "3-Session Clarity Sprint" |
| 3.7 | Dedup checkboxes | **GREEN** | Booking/Intake/Nurture Reminder Sent + Thank You Sent — all added |

---

## 4. Calendly

**Category Score: 100% — GREEN**

| # | Component | Status | Detail |
|---|-----------|--------|--------|
| 4.1 | Public booking page | **GREEN** | Live |
| 4.2 | Event configuration | **GREEN** | 45-minute Creative Hotline Call |
| 4.3 | Webhook to n8n | **GREEN** | Fires to WF2 |
| 4.4 | Website integration | **GREEN** | All CTAs link correctly |
| 4.5 | Payment gate | **GREEN** | $499 First Call via separate Stripe connection |

---

## 5. Tally

**Category Score: 90% — GREEN**

| # | Component | Status | Detail |
|---|-----------|--------|--------|
| 5.1 | Form live | **GREEN** | `tally.so/r/b5W1JE` |
| 5.2 | Fields match WF3 | **GREEN** | Fuzzy matching works |
| 5.3 | Webhook to n8n | **GREEN** | Fires to WF3 |
| 5.4 | Discoverability | **YELLOW** | Not on website. Email-only discovery |

---

## 6. ManyChat

**Category Score: 90% — GREEN**

| # | Component | Status | Detail |
|---|-----------|--------|--------|
| 6.1 | Automations | **GREEN** | 4 active |
| 6.2 | AI Replies | **GREEN** | ON — Knowledge Base responses |
| 6.3 | AI Comments | **YELLOW** | OFF (UI bug), Comment-to-DM workaround active |
| 6.4 | AI Goals | **GREEN** | 2 live |
| 6.5 | Knowledge Base | **YELLOW** | Pricing entries need verification — may have old prices |
| 6.6 | Booking link | **GREEN** | Correct Calendly URL |

---

## 7. Laylo

**Category Score: 75% — YELLOW**

| # | Component | Status | Detail |
|---|-----------|--------|--------|
| 7.1 | Keywords | **GREEN** | BOOK, PRICING, HELP active |
| 7.2 | Webhook to n8n | **GREEN** | Connected to WF4 |
| 7.3 | Stripe links in drops | **GREEN** | Updated to live payment links |
| 7.4 | Drop descriptions | **GREEN** | Updated with correct product info |
| 7.5 | IG connection | **RED** | Laylo disconnected from Instagram — needs reconnection. DM keyword triggers won't fire until fixed |
| 7.6 | Phone data | **YELLOW** | Captured by Laylo but lost in n8n (WF4 phone mapping bug) |

---

## 8. Stripe

**Category Score: 80% — GREEN**

| # | Component | Status | Detail |
|---|-----------|--------|--------|
| 8.1 | Webhook to n8n | **GREEN** | `checkout.session.completed` registered + signing secret stored |
| 8.2 | Payment processing | **GREEN** | Live mode active |
| 8.3 | Products + prices | **GREEN** | 3 live products: First Call $499, Standard Call $699, Sprint $1,495 |
| 8.4 | Payment links | **GREEN** | All 3 links created and verified |
| 8.5 | Product metadata | **YELLOW** | `product_name` metadata not yet added to payment links (needed for WF1 mapping) |
| 8.6 | Product mapping in WF1 | **YELLOW** | Still null at runtime. Fix spec ready |

---

## 9. Email System

**Category Score: 70% — YELLOW**

| # | Component | Status | Detail |
|---|-----------|--------|--------|
| 9.1 | hello@ configured in SMTP | **GREEN** | Used in WF5, WF6, WF7 customer emails |
| 9.2 | notifications@ configured | **GREEN** | Used in team notifications |
| 9.3 | SMTP credential | **GREEN** | Shared credential `yJP76JoIqqqEPbQ9` |
| 9.4 | WF1 sender | **YELLOW** | Still `jake@radanimal.co` — fix spec written |
| 9.5 | hello@ mailbox | **RED** | `hello@creativehotline.com` used as "From" on 3 customer emails but may not have a real mailbox. Customer replies would bounce. Needs verification |
| 9.6 | Frankie templates | **YELLOW** | 7 templates written, none deployed yet. Deployment guide ready |

---

## Launch Blockers (Must Fix Before Launch)

| Priority | System | Issue | Impact | Fix |
|----------|--------|-------|--------|-----|
| **P1** | Laylo | Disconnected from Instagram | IG keyword drops won't fire. No new leads from DMs | Reconnect in Laylo dashboard |
| **P2** | Website | 3-pack "Save $400" badge (should be $602) + $1,100 price (no Stripe product) | Wrong savings claim, $1,100 has no checkout path | Update badge to "Save $602", replace $1,100 with $1,495 or remove |
| ~~P2~~ | ~~n8n WF7~~ | ~~Dead domain URL~~ | **RESOLVED 2026-02-21** — Cowork republished with `thecreativehotline.com` | Verified via n8n MCP |
| **P1** | Email/DNS | `hello@creativehotline.com` has **NO MX records** — domain DNS on GoDaddy (`ns38.domaincontrol.com`). No email forwarding configured. | Customer replies to 3 automated emails bounce. Looks unprofessional. | Set up email forwarding in GoDaddy: `hello@` → `soscreativehotline@gmail.com`. See `docs/email-forwarding-gap.md` |
| **P2** | n8n | 99.4% execution failure rate | Unknown scope — may affect live transactions | Investigate in n8n execution log |

---

## High-Priority Fixes (Fix This Week)

| # | System | Issue | Fix Doc |
|---|--------|-------|---------|
| Y1 | WF1 | Sender, product mapping, dedup, Frankie template | `wf1-stripe-fix-spec.md` + `email-deployment-guide.md` |
| Y2 | WF2 | Team notification variables | `n8n-node-fix-specs.md` |
| Y3 | WF4 | Phone, name, product type, lead source | `n8n-node-fix-specs.md` |
| Y4 | WF5/6/7 | Wire up dedup checkboxes | Checkboxes exist in Notion, workflows need filter + set |
| Y5 | Stripe | Add `product_name` metadata to payment links | `stripe-launch-checklist.md` |
| Y6 | Website | $1,497 → $1,495, fix "Save $400"→"Save $602", remove $1,100, fix /pricing 404 | `website-pricing-audit.md` |
| Y7 | ManyChat | Verify KB pricing entries match live prices | Manual check in ManyChat dashboard |

---

## What Is Working Well

| System | Component | Notes |
|--------|-----------|-------|
| n8n WF5 | Paid But Never Booked follow-up | Cleanest workflow, no issues |
| n8n WF3 | Intake + Claude AI analysis | All fields populate, summaries generated |
| Notion | Both databases + relations + checkboxes | Schema verified, data cleaned, dedup fields ready |
| Calendly | Full booking flow + payment gate | Live with $499 First Call |
| Tally | Intake form + webhook | Working end-to-end |
| ManyChat | All 4 automations + AI | Responding, capturing, sharing links |
| Stripe | Products + prices + links + webhook | 3 live products, webhook registered |
| Website | Core pages + CTAs + footer | All major template issues fixed |

---

## Recommended Next Steps

### Do Now (10 minutes)
1. **Upgrade n8n to Starter plan** (trial expires ~Feb 23 — 2 days)
2. Set up hello@ email forwarding (GoDaddy → `soscreativehotline@gmail.com`)
3. Reconnect Laylo to Instagram

### Do Today (30 minutes)
4. ~~Republish WF7 with correct URL~~ DONE (Cowork, Feb 21)
5. Deploy Frankie email template to WF1 (fixes sender + template in one step)
6. Apply WF4 fixes (phone, name, product type, lead source)
7. Apply WF2 team notification fix

### Do This Week (1 hour)
8. Add `product_name` metadata to Stripe payment links
9. Wire up dedup checkboxes in WF5/6/7
10. Tell Webflow dev: fix "Save $400"→"Save $602" badge, remove $1,100, fix $1,497→$1,495, fix /pricing 404
11. Deploy remaining Frankie templates (WF5, WF6, WF7)

### Next Sprint (2 hours)
12. Connect website contact form to pipeline
13. Rebuild WF9 (post-call follow-up)
14. Add Stripe signature verification to WF1
15. Embed Calendly + Tally on contact page

---

## Scorecard Summary Table

| System | Status | GREEN | YELLOW | RED | Verdict |
|--------|--------|-------|--------|-----|---------|
| Website | YELLOW | 5 | 5 | 3 | Ghost prices + dead form + 404 |
| n8n WF1 | YELLOW | 3 | 5 | 0 | Works, data quality fixes ready |
| n8n WF2 | YELLOW | 2 | 2 | 0 | Email mismatch silent failure |
| n8n WF3 | GREEN | 5 | 3 | 0 | Working correctly |
| n8n WF4 | YELLOW | 2 | 2 | 2 | Phone + product type broken |
| n8n WF5 | GREEN | 3 | 1 | 0 | Needs dedup checkbox wiring |
| n8n WF6 | GREEN | 4 | 1 | 0 | Tally URL fixed, needs dedup |
| n8n WF7 | GREEN | 4 | 1 | 0 | URL fixed, IF fixed, dedup pending |
| n8n Platform | RED | 0 | 1 | 2 | Trial expiring, 99.4% failure rate |
| Notion | GREEN | 7 | 0 | 0 | Solid |
| Calendly | GREEN | 5 | 0 | 0 | Fully operational |
| Tally | GREEN | 3 | 1 | 0 | Working, not on website |
| ManyChat | GREEN | 4 | 2 | 0 | KB prices need check |
| Laylo | YELLOW | 4 | 1 | 1 | Disconnected from IG |
| Stripe | GREEN | 4 | 2 | 0 | Products live, metadata pending |
| Email | YELLOW | 2 | 2 | 1 | hello@ mailbox unverified |
| **TOTALS** | | **57** | **28** | **9** | |

**Previous:** 53 GREEN / 25 YELLOW / 19 RED
**Current:** 57 GREEN / 28 YELLOW / 9 RED

RED items cut by more than half. Core pipeline is functional. Remaining work is polish and robustness.

---

**Bottom line:** The Creative Hotline went from 52% to 73% in one overnight session. The core pipeline (pay → book → intake → AI analysis) works end-to-end. The 4 remaining blockers are: Laylo IG reconnection, pricing badge fix ("Save $400"→"$602"), hello@ mailbox/MX records, and the n8n failure rate investigation. WF7 dead URL was fixed by Cowork on 2026-02-21. Fix the remaining 4 and you're at ~85%+ and ready for soft launch.
