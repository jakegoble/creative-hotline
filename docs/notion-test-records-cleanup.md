# Notion Test Records Cleanup Plan

**Date:** 2026-02-21
**Status:** Plan only — DO NOT execute without Jake's confirmation
**Databases:** Payments DB (`3030e73ffadc80bcb9dde15f51a9caf2`) + Intake DB (`2f60e73ffadc806bbf5ddca2f5c256a3`)

---

## Inventory of All Records

### Payments Database

| # | Client Name | Email | Status | Amount | Product | Stripe ID | Test? | Action |
|---|------------|-------|--------|--------|---------|-----------|-------|--------|
| 1 | Jake Goble | jake@radanimal.co | Paid - Needs Booking | $499 | Standard Call | `cs_test_a1qiEv...` | **YES** — `cs_test_` prefix = Stripe test mode | Archive or delete |

**Observations:**
- Only 1 record found in Payments DB via search
- The `cs_test_` prefix on the Stripe Session ID confirms this is a test checkout, not a real payment
- Status is still "Paid - Needs Booking" — this means WF5 (booking reminder) will fire daily for this record once the dedup checkbox is wired
- Lead Source is set to "Direct" — was probably a manual test of the Stripe → n8n pipeline
- The audit originally reported 4 duplicate Jake Goble records — the other 3 may have already been cleaned up, or they may not be findable via search (Notion search has limitations)

### Intake Database

| # | Client Name | Email | Role | Brand | Status | AI Summary | Test? | Action |
|---|------------|-------|------|-------|--------|-----------|-------|--------|
| 1 | Sarah Chen | sarah@luminastudio.co | Founder & Creative Director | Lumina Studio | Submitted | Yes (full summary) | **DEMO** — realistic but fabricated | Keep as reference OR archive |
| 2 | Marcus Thompson | marcus@rebelroastco.com | Co-founder | Rebel Roast Co. | Submitted | Yes (full summary) | **DEMO** — realistic but fabricated | Keep as reference OR archive |
| 3 | Priya Malhotra | (not fetched) | (not fetched) | (not fetched) | Submitted | (not fetched) | **DEMO** — realistic but fabricated | Keep as reference OR archive |
| 4 | Jake Goble | jake@radanimal.co | CEO | Rad Animal | Submitted | **Empty** | **TEST** — Jake's own test submission | Archive or delete |

**Observations:**
- Sarah Chen, Marcus Thompson, and Priya Malhotra are demo records (created Jan 28) with realistic but fake data. They demonstrate the AI intake analysis pipeline working correctly.
- Jake Goble's intake record is a real test submission with real data (Rad Animal is Jake's actual company) but has an empty AI Summary — the Claude API call likely failed or wasn't configured yet when this was created.
- None of the intake records have a `Linked Payment` relation set.

---

## Cleanup Recommendations

### Tier 1: Safe to Delete (Test Data)

| Record | DB | Reason | Page ID |
|--------|-----|--------|---------|
| Jake Goble | Payments | `cs_test_` Stripe session — not a real payment | `3040e73f-fadc-81d0-9cfa-d0abe1a69bd1` |
| Jake Goble | Intake | Test submission, empty AI summary | `2ff0e73f-fadc-817d-ada5-e928c88bf89e` |

### Tier 2: Consider Keeping (Demo Data)

| Record | DB | Reason |
|--------|-----|--------|
| Sarah Chen | Intake | Good demo of full pipeline — has AI summary, realistic data |
| Marcus Thompson | Intake | Good demo of full pipeline — has AI summary, realistic data |
| Priya Malhotra | Intake | Good demo of full pipeline |

**Recommendation:** Keep the demo records for now — they're useful for showing the pipeline to stakeholders and for testing. Archive them later once real customer data starts flowing.

### Tier 3: Investigate

The original audit (Feb 20) reported **4 duplicate Jake Goble records** in the Payments DB from test checkouts. Only 1 was found via search. Possible explanations:
1. Other duplicates were already manually deleted
2. Notion search didn't return all matches (search has result limits)
3. The duplicates were in a different view or had different titles

**Action:** Manually check the Payments DB in the Notion UI — switch to a table view sorted by Created date and scroll through all records. Look for any additional test records with `cs_test_` in the Stripe Session ID field.

---

## Execution Steps (When Ready)

### Option A: Archive (Reversible — Recommended)

1. Open each record in Notion
2. Click the `...` menu → "Move to Trash"
3. Records go to Notion's Trash (recoverable for 30 days)

### Option B: Delete via API (Irreversible)

Using the Notion MCP `update-page` tool with `in_trash: true`:

```
For Jake Goble (Payments):
  page_id: 3040e73f-fadc-81d0-9cfa-d0abe1a69bd1
  command: update_properties (archive)

For Jake Goble (Intake):
  page_id: 2ff0e73f-fadc-817d-ada5-e928c88bf89e
  command: update_properties (archive)
```

**Do NOT execute Option B without explicit confirmation from Jake.**

---

## Pre-Launch Cleanup Checklist

- [ ] Confirm with Jake which records to delete vs keep
- [ ] Archive/delete the confirmed test records
- [ ] Verify the Payments DB table view — ensure no hidden test records remain
- [ ] Verify the Intake DB — check all 4 records are accounted for
- [ ] After cleanup, run WF5 manually to confirm it no longer picks up the Jake test record
- [ ] Reset any dedup checkboxes on remaining records if needed for testing

---

## Impact Assessment

The Jake Goble test record in Payments DB is **actively causing issues**:
- Status "Paid - Needs Booking" + Payment Date Feb 11 = **9+ days stale**
- WF5 (Paid But Never Booked) fires daily and this record matches the 48hr+ filter
- With no dedup checkbox set, a booking reminder email is being sent to `jake@radanimal.co` every single day
- This is likely contributing to the 99.4% execution failure rate (the email might fail or Jake might be ignoring automated emails from his own system)

**Deleting this record should be a priority** — it's polluting both the CRM data and the automated follow-up pipeline.
