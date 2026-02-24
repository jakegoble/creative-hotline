# Notion Data Readiness Report — The Creative Hotline

**Date:** 2026-02-24 (updated with finalized decisions)
**Author:** CRM & Data Operations Lead (Claude Code)
**Method:** Live Notion MCP queries + documentation cross-reference + code audit

---

## Decisions Applied (Feb 24)

The following decisions were made during a parallel Cowork session and have been applied to the codebase:

1. **"Single Call" is the canonical $699 product** — renamed from "Standard Call". Updated in Stripe, n8n WF1, Notion, and all app code.
2. **"3-Session Clarity Sprint" is the canonical Sprint name** — "3-Pack Sprint" is legacy alias only.
3. **Test records: keep for now** — Jake decided not to archive.
4. **WF1 product mapping: already fixed** — $499→First Call, $699→Single Call, $1495→Sprint. Metadata-first with amount fallback.
5. **Code changes applied:** `config.py` PRODUCT_TYPES + LEGACY_ALIASES, `demo_data.py`, `lead_scorer.py`, `revenue_modeler.py`, `segment_builder.py`, `frankie_prompts.py`, `revenue_goals.py`, `stripe_client.py`, and all 12 test files updated. 400 tests passing.

---

## Executive Summary

The original audit found **12 discrepancies**. After applying the above decisions, **H1 (WF1 product mapping) and M1/M4 (Single Call, Sprint naming) are resolved.** The remaining open items are H2/H3 (WF3/WF4 type mismatches), M2 (Constraints property name), M3 (missing relations), M5 (demo data intake_status — fixed), and the 4 low-severity doc gaps.

---

## 1. Schema Audit: Documentation vs Live Reality

### Payments Database (18 properties live)

| # | Property | Live Type | Documented? | Issue |
|---|----------|-----------|-------------|-------|
| 1 | Client Name | `title` | Yes | OK |
| 2 | Email | `email` | Yes | OK |
| 3 | Phone | `phone_number` | Yes | OK |
| 4 | Payment Amount | `number` | Yes | OK |
| 5 | Product Purchased | `select` | Yes | **Options mismatch** — see below |
| 6 | Payment Date | `date` | Yes | OK |
| 7 | Stripe Session ID | `rich_text` | Yes | OK |
| 8 | Status | `select` | Yes | OK — all 7 options match |
| 9 | Call Date | `date` | Yes | OK |
| 10 | Calendly Link | `url` | Yes | OK |
| 11 | Linked Intake | `relation` | Yes | OK |
| 12 | Lead Source | `select` | Yes | OK — all 8 options match |
| 13 | Booking Reminder Sent | `checkbox` | Yes | OK |
| 14 | Intake Reminder Sent | `checkbox` | Yes | OK |
| 15 | Nurture Email Sent | `checkbox` | Yes | OK |
| 16 | Thank You Sent | `checkbox` | Yes | OK |
| 17 | Created | `created_time` | **No** | Missing from CLAUDE.md key properties |
| 18 | Days to Convert | `formula` | **No** | Missing from CLAUDE.md key properties |

### Intake Database (15 properties live)

| # | Property | Live Type | Documented? | Issue |
|---|----------|-----------|-------------|-------|
| 1 | Client Name | `title` | Yes | OK |
| 2 | Email | `email` | Yes | OK |
| 3 | Role | `rich_text` | Yes | OK (WF3 maps wrong — see type mismatches) |
| 4 | Brand | `rich_text` | Partial | Type not explicitly listed in CLAUDE.md |
| 5 | Website / IG | `url` | Yes | OK |
| 6 | Creative Emergency | `rich_text` | Yes | OK |
| 7 | Desired Outcome | `multi_select` | Yes | OK (WF3 maps wrong — see type mismatches) |
| 8 | What They've Tried | `rich_text` | Yes | OK |
| 9 | Deadline | `rich_text` | Yes | OK |
| 10 | Constraints / Avoid | `rich_text` | **Name differs** | CLAUDE.md says "Constraints", live is "Constraints / Avoid" |
| 11 | Intake Status | `select` | Yes | Options: "Not Started", "Submitted" |
| 12 | AI Intake Summary | `rich_text` | Yes | OK |
| 13 | Action Plan Sent | `checkbox` | Yes | OK |
| 14 | Call Date | `date` | **No** | Missing from CLAUDE.md Intake properties |
| 15 | Linked Payment | `relation` | Yes | OK |

---

## 2. Discrepancies — Ranked by Severity

### HIGH SEVERITY (3) — Will corrupt real customer data

#### H1: WF1 Product Mapping Bug — $499 tagged as "Standard Call"
- **Evidence:** Jake Goble test record paid $499 (First Call price) but Product Purchased = "Standard Call" ($699)
- **Root cause:** WF1 doesn't map Stripe line items to product names. Either sets null or wrong value.
- **Impact:** Every real customer will have the wrong product in their CRM record. Revenue reports, pipeline analytics, and upsell detection all break.
- **Fix:** WF1 needs amount-based product mapping: $499 → "First Call", $699 → "Standard Call", $1,495 → "3-Session Clarity Sprint". See `docs/wf1-stripe-fix-spec.md`.
- **Owner:** Automation Architect

#### H2: WF3 Type Mismatches — Role and Desired Outcome silently fail
- **Evidence:** Live DB confirms Role = `rich_text`, Desired Outcome = `multi_select`. WF3 maps both as `select`.
- **Impact:** When a real customer submits the Tally intake form:
  - `Role` value is silently dropped (select write to a rich_text field = ignored by Notion API)
  - `Desired Outcome` value is silently dropped (select write to a multi_select field = ignored)
  - The client detail view shows empty fields. AI analysis misses key context.
- **Fix:** In WF3's "Create Intake Record" node:
  - Change `Role|select` → `Role|rich_text`
  - Change `Desired Outcome|select` → `Desired Outcome|multiSelect`
- **Owner:** Automation Architect

#### H3: WF4 Product Purchased Type Mismatch — rich_text write to select field
- **Evidence:** Documented in schemas doc and confirmed via live query. WF4 writes Product Purchased as rich_text, but it's a select property.
- **Impact:** Every Laylo lead captured will have Product Purchased silently dropped. Acceptable for leads (they haven't purchased), but the field should either be explicitly null or set correctly if the workflow ever needs it.
- **Fix:** In WF4's "Create Payment Record" node, change `Product Purchased|rich_text` → `Product Purchased|select` (or remove it entirely for leads).
- **Owner:** Automation Architect

### MEDIUM SEVERITY (5) — Will cause confusion or silent failures

#### M1: Undocumented "Single Call" product option in Payments DB
- **Evidence:** Live Notion Product Purchased select has 5 options: First Call, Standard Call, 3-Pack Sprint, 3-Session Clarity Sprint, **Single Call**. "Single Call" is not in CLAUDE.md, not in Stripe products, not in `config.py` PRODUCT_TYPES.
- **Impact:** If WF1's product mapping accidentally selects "Single Call", it won't match any revenue calculation logic. Code in `config.py` won't recognize it.
- **Decision needed:** Remove "Single Call" from Notion, or add it to PRODUCT_TYPES with a price mapping.

#### M2: Property name mismatch — "Constraints" vs "Constraints / Avoid"
- **Evidence:** Live Notion property = "Constraints / Avoid". CLAUDE.md documents it as just "Constraints".
- **Impact:** Any n8n node referencing "Constraints" (without "/ Avoid") will fail to match. The app code correctly uses `props.get("Constraints / Avoid", {})` in `notion_client.py:165`, so the Command Center is OK. But any new workflow node built from CLAUDE.md will get it wrong.
- **Fix:** Update CLAUDE.md to say "Constraints / Avoid".

#### M3: No Linked Intake/Payment relation set on any existing record
- **Evidence:** Jake Goble has records in both DBs, but Linked Intake (Payments) and Linked Payment (Intake) are both empty. All 3 demo intake records also have empty Linked Payment.
- **Impact:** `get_merged_clients()` joins on email (workaround works), but the Notion UI won't show related records. WF3's "Link Intake & Update Status" node is supposed to wire this — either it failed during Jake's test or was misconfigured.
- **Fix:** Verify WF3's linking logic. For existing records, manually set the relation in Notion.

#### M4: "3-Pack Sprint" vs "3-Session Clarity Sprint" naming inconsistency
- **Evidence:** Both exist as Product Purchased options in live Notion. `config.py` maps both to $1,495. Stripe product is "3-Session Clarity Sprint". Marketing uses both names.
- **Impact:** Pipeline reports may split Sprint customers across two categories. Demo data uses "3-Session Clarity Sprint" only.
- **Decision needed:** Standardize on one name. Recommendation: "3-Session Clarity Sprint" (matches Stripe). Remove "3-Pack Sprint" from Notion after confirming no records use it.

#### M5: Demo data intake_status uses "Complete" but Notion only has "Not Started" and "Submitted"
- **Evidence:** `demo_data.py` line 184+ sets `intake_status: "Complete"` on all intake records. Live Notion Intake Status select only has two options: "Not Started" and "Submitted".
- **Impact:** Demo mode pipeline stats may display "Complete" as a status that doesn't exist in real Notion. If anyone tries to create a record with status "Complete" via API, Notion will accept it (auto-creating the option), but it diverges from the intended schema.
- **Fix:** Change demo_data.py intake_status from "Complete" to "Submitted" to match real Notion options.

### LOW SEVERITY (4) — Documentation gaps

#### L1: Payments DB "Created" and "Days to Convert" not in CLAUDE.md
- Created is `created_time` (auto-set by Notion), used by WF7 for lead age filtering.
- Days to Convert is a `formula` property for pipeline velocity tracking.
- **Fix:** Add to CLAUDE.md Payments DB key properties.

#### L2: Intake DB "Call Date" not documented in CLAUDE.md
- Exists in live DB, used in "Upcoming Calls" calendar view.
- Not populated by any workflow (documented in schemas doc).
- **Fix:** Add to CLAUDE.md. Consider having WF2 or WF3 populate it.

#### L3: Intake DB "Brand" type not explicitly documented
- Type is `rich_text`, which is correct and the app reads it correctly.
- **Fix:** Add explicit type to CLAUDE.md Intake key properties.

#### L4: Intake Status options not listed in CLAUDE.md
- Live options: "Not Started", "Submitted".
- **Fix:** Add to CLAUDE.md.

---

## 3. Test Record Audit

### Current Records

| DB | Name | Type | Issues | Action |
|----|------|------|--------|--------|
| Payments | Jake Goble | TEST | `cs_test_` Stripe ID, $499/"Standard Call" mismatch, stale "Paid - Needs Booking" status, no linked intake | **Archive before launch** |
| Intake | Jake Goble | TEST | Empty AI Summary, no linked payment | **Archive before launch** |
| Intake | Sarah Chen | DEMO | Good AI summary, realistic data, no linked payment | Keep as reference |
| Intake | Marcus Thompson | DEMO | Good AI summary, realistic data, no linked payment | Keep as reference |
| Intake | Priya Malhotra | DEMO | Good AI summary, realistic data, no linked payment | Keep as reference |

### Pre-Launch Cleanup Checklist

1. **Archive Jake Goble records** (both DBs) — they are test data causing WF5 to fire daily
2. **Decide on demo records** — keep for stakeholder demos or archive for a clean slate
3. **Verify no hidden records** — Notion search has limits; manually check both DBs in table view sorted by Created date
4. **Reset dedup checkboxes** on any remaining records for fresh testing

---

## 4. Demo Data vs Live Schema Cross-Check

| Field | Demo Data Value | Live Notion Schema | Match? |
|-------|----------------|-------------------|--------|
| `status` values | All 7 pipeline statuses | All 7 exist as options | YES |
| `product_purchased` | "First Call", "Standard Call", "3-Session Clarity Sprint" | 5 options (adds "3-Pack Sprint", "Single Call") | PARTIAL — demo doesn't use "3-Pack Sprint" or "Single Call" |
| `lead_source` | All 8 sources | All 8 exist as options | YES |
| `intake_status` | **"Complete"** | "Not Started", "Submitted" | **NO** — "Complete" doesn't exist in Notion |
| `desired_outcome` | 5 outcome values | All 5 exist as multi_select options | YES |
| Property names | `constraints` key | "Constraints / Avoid" property name | OK — `notion_client.py` correctly maps the name |

**Critical fix needed:** Change `intake_status: "Complete"` to `intake_status: "Submitted"` in `demo_data.py` (9 records).

---

## 5. Code Alignment Audit

### notion_client.py — Property Name Mapping

| Parsed Key | Notion Property Name | Correct? |
|-----------|---------------------|----------|
| `client_name` | "Client Name" | YES |
| `email` | "Email" | YES |
| `phone` | "Phone" | YES |
| `payment_amount` | "Payment Amount" | YES |
| `product_purchased` | "Product Purchased" | YES |
| `payment_date` | "Payment Date" | YES |
| `status` | "Status" | YES — reads as select |
| `call_date` | "Call Date" | YES |
| `calendly_link` | "Calendly Link" | YES |
| `lead_source` | "Lead Source" | YES |
| `stripe_session_id` | "Stripe Session ID" | YES |
| `linked_intake_id` | "Linked Intake" | YES |
| `booking_reminder_sent` | "Booking Reminder Sent" | YES |
| `intake_reminder_sent` | "Intake Reminder Sent" | YES |
| `nurture_email_sent` | "Nurture Email Sent" | YES |
| `role` | "Role" | YES — reads as rich_text |
| `brand` | "Brand" | YES |
| `website_ig` | "Website / IG" | YES |
| `creative_emergency` | "Creative Emergency" | YES |
| `desired_outcome` | "Desired Outcome" | YES — reads as multi_select |
| `what_tried` | "What They've Tried" | YES |
| `deadline` | "Deadline" | YES |
| `constraints` | "Constraints / Avoid" | YES |
| `intake_status` | "Intake Status" | YES |
| `ai_summary` | "AI Intake Summary" | YES |
| `action_plan_sent` | "Action Plan Sent" | YES |

**Verdict:** `notion_client.py` is correctly aligned with live Notion property names and types. No code changes needed here.

### config.py — Constants Check

| Constant | Matches Live Notion? | Issue |
|---------|---------------------|-------|
| `PIPELINE_STATUSES` | YES — all 7 match | OK |
| `PRODUCT_TYPES` | PARTIAL — has "3-Pack Sprint" + "3-Session Clarity Sprint" but not "Single Call" | Missing "Single Call" (should it exist?) |
| `LEAD_SOURCES` | YES — all 8 match | OK |
| `DESIRED_OUTCOMES` | YES — all 5 match | OK |

---

## 6. Notion CRM Best Practice Recommendations

### Immediate (Pre-Launch)

1. **Remove "Single Call" option** — it has no corresponding Stripe product and no workflow creates it. Ask Jake if it was intentional.

2. **Standardize Sprint naming** — pick "3-Session Clarity Sprint" (matches Stripe) and remove "3-Pack Sprint" from Notion. Update `config.py` to remove the duplicate.

3. **Add "Thank You Sent" to dedup filter** — the checkbox exists but no workflow reads it yet. Wire it when WF9 is rebuilt.

### Short-Term (Post-Launch)

4. **Convert Intake DB "Deadline" from rich_text to date** — currently stores free-text like "3 weeks — launch March 15". A date type would enable:
   - Sorting intakes by deadline urgency
   - Automated "deadline approaching" alerts
   - Pipeline velocity calculations
   - Trade-off: loses the descriptive text. Could add a separate "Deadline Notes" rich_text field.

5. **Populate Intake DB "Call Date" via workflow** — WF2 sets Call Date on Payments, but not on Intake. When WF3 links the records, it should copy Call Date from Payments → Intake. This enables the "Upcoming Calls" calendar view in Notion to work.

6. **Add "Last Contact Date" property to Payments DB** — tracks when the team last interacted with a client. Useful for:
   - Identifying stale deals
   - Re-engagement triggers
   - Client health scoring

### Medium-Term (Scale Preparation)

7. **Add formula: "Days in Current Stage"** — `dateBetween(now(), prop("Last Modified"), "days")`. Enables:
   - Pipeline velocity dashboards
   - Bottleneck detection (which stage has the longest dwell time)
   - SLA alerting ("client has been stuck for 7+ days")

8. **Add rollup on Payments via Linked Intake** — roll up "Intake Status" and "AI Intake Summary" so the Payments DB shows intake progress without clicking through.

9. **Add "Client Value Tier" formula** — based on Payment Amount: $499 = Bronze, $699 = Silver, $1,495 = Gold. Enables:
   - Prioritized follow-up (Gold clients get faster responses)
   - Revenue segmentation in dashboards
   - Future: VIP onboarding flow

10. **Consider a "Notes / Activity Log" property** — rich_text field on Payments for quick notes ("Left voicemail", "Rescheduled to March 5"). Currently there's no structured place for team notes outside of external tools.

---

## 7. Pre-Launch Data Checklist

| # | Item | Status | Owner | Blocker? |
|---|------|--------|-------|----------|
| 1 | Fix WF1 product mapping ($499→First Call, $699→Standard Call, $1495→Sprint) | NOT DONE | Automation Architect | **YES** |
| 2 | Fix WF3 Role type (rich_text) | NOT DONE | Automation Architect | **YES** |
| 3 | Fix WF3 Desired Outcome type (multi_select) | NOT DONE | Automation Architect | **YES** |
| 4 | Fix WF4 Product Purchased type (select) | NOT DONE | Automation Architect | **YES** |
| 5 | Archive Jake Goble test records (both DBs) | NOT DONE | Jake (manual) or CRM Lead | **YES** |
| 6 | Resolve "Single Call" option — remove or document | NOT DONE | Jake (decision) | No |
| 7 | Standardize Sprint naming (pick one) | NOT DONE | Jake (decision) | No |
| 8 | Fix demo_data.py intake_status "Complete" → "Submitted" | NOT DONE | Command Center Engineer | No |
| 9 | Update CLAUDE.md Intake property name to "Constraints / Avoid" | NOT DONE | CRM Lead | No |
| 10 | Update CLAUDE.md with missing properties (Created, Days to Convert, Call Date, Brand) | NOT DONE | CRM Lead | No |
| 11 | Wire "Mark Sent" checkbox nodes in Daily Follow-Up Engine | NOT DONE | Automation Architect | No (dedup safety) |
| 12 | Test full pipeline end-to-end with Stripe test mode | NOT DONE | All agents | **YES** |

**Items 1-5 and 12 are launch blockers.** The first real customer will hit corrupt data without these fixes.

---

## 8. Risk Assessment

### If we launch without fixes

| Scenario | What happens | Data impact |
|----------|-------------|-------------|
| Customer pays $499 | WF1 creates record with wrong/null Product Purchased | Revenue reports wrong, upsell detection broken |
| Customer submits intake | WF3 drops Role and Desired Outcome values | AI analysis misses context, empty fields in client view |
| Laylo captures lead | WF4 writes Product Purchased as wrong type | Silent failure, field stays empty |
| WF5 fires daily | Picks up Jake Goble test record every day | Sends booking reminder to jake@ daily |
| Team uses "Single Call" | Not in config.py PRODUCT_TYPES | Revenue calculations break, unknown product |

### After fixes

The pipeline will correctly:
1. Map Stripe amounts to product names
2. Store all intake form fields with correct types
3. Set dedup checkboxes to prevent repeat emails
4. Show accurate data in the Command Center dashboard

---

## Appendix: Live Database Query Results

### Payments DB — 1 record
```
Jake Goble | jake@radanimal.co | $499 | "Standard Call" (WRONG)
Status: Paid - Needs Booking | Created: 2026-02-11
Stripe: cs_test_a1qiEv... | Lead Source: Direct
All dedup checkboxes: false | Linked Intake: empty
```

### Intake DB — 4 records
```
1. Sarah Chen | sarah.chen@example.com | Submitted | AI Summary: Yes | Linked Payment: empty
2. Marcus Thompson | marcus@rebelroastco.com | Submitted | AI Summary: Yes | Linked Payment: empty
3. Priya Malhotra | priya.m@cloudcurve.io | Submitted | AI Summary: Yes | Linked Payment: empty
4. Jake Goble | jake@radanimal.co | Submitted | AI Summary: EMPTY | Linked Payment: empty
```

### Product Purchased Options (live)
First Call, Standard Call, 3-Pack Sprint, 3-Session Clarity Sprint, **Single Call** (undocumented)

### Status Options (live)
Lead - Laylo, Paid - Needs Booking, Booked - Needs Intake, Intake Complete, Ready for Call, Call Complete, Follow-Up Sent

### Lead Source Options (live)
IG DM, IG Comment, IG Story, Meta Ad, LinkedIn, Website, Referral, Direct

### Intake Status Options (live)
Not Started, Submitted

### Desired Outcome Options (live)
A clear decision, Direction I can trust, A short action plan, Stronger positioning, Someone to tell me the truth
