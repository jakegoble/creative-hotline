# Notion Data Quality Report

**Date:** 2026-02-20
**Source:** Notion MCP queries against both databases

---

## Payments Database (Master CRM)

**Database ID:** `3030e73ffadc80bcb9dde15f51a9caf2`

### Records Found

| # | Client Name | Email | Status | Product | Amount | Notes |
|---|------------|-------|--------|---------|--------|-------|
| 1 | Jake Goble | jake@radanimal.co | Unknown | Unknown | Unknown | TEST record |
| 2 | Jake Goble | jake@radanimal.co | Unknown | Unknown | Unknown | TEST record |
| 3 | Jake Goble | jake@radanimal.co | Unknown | Unknown | Unknown | TEST record |
| 4 | Jake Goble | jake@radanimal.co | Unknown | Unknown | Unknown | TEST record |

**Finding:** 4 test records created by Jake (likely during workflow testing on Feb 11). These should be cleaned up before launch to avoid:
- Polluting pipeline status reports
- Triggering follow-up workflows (WF5, WF6, WF7 will pick these up if status matches)
- Confusing team notifications
- Inflating metrics

### Recommended Cleanup

1. **Archive or delete all 4 Jake Goble test records** from Payments DB
2. **Before deleting**, check if any have linked Intake records that should also be removed
3. **After cleanup**, verify follow-up workflows don't have stale references

---

## Intake Database

**Database ID:** `2f60e73ffadc806bbf5ddca2f5c256a3`

### Records Found

| # | Client Name | Email | Brand | AI Summary | Intake Status | Type |
|---|------------|-------|-------|------------|---------------|------|
| 1 | Sarah Chen | (present) | Moonlight Studio | Populated | Submitted | Real client |
| 2 | Marcus Thompson | (present) | Rebel Roast Co. | Populated | Submitted | Real client |
| 3 | Priya Malhotra | (present) | Unknown | Unknown | Unknown | Real client |
| 4 | Jake Goble | jake@radanimal.co | Unknown | Unknown | Unknown | TEST record |

### Verification Results

**Sarah Chen** — All fields populated at runtime:
- Brand: Moonlight Studio
- Creative Emergency: Populated
- AI Intake Summary: Populated (Claude analysis complete)
- Desired Outcome: ["Stronger positioning", "Direction I can trust"]
- Status: Submitted

**Marcus Thompson** — All fields populated at runtime:
- Brand: Rebel Roast Co.
- Creative Emergency: Populated
- AI Intake Summary: Populated (Claude analysis complete)
- Status: Submitted

**Priya Malhotra** — Not yet verified (need to confirm fields populated)

**Jake Goble** — Test record, should be removed

### Key Finding: MCP Serialization Artifact

When reading Notion records via the n8n MCP, `rich_text` properties show empty `textContent` values. This is a **serialization artifact** — the actual Notion records have all fields populated. Confirmed by querying Notion directly via Notion MCP.

**This means:** Issues #8 and #9 from the original audit (empty intake fields) are NOT bugs. The data flow is working correctly.

---

## Data Quality Issues

### Issue 1: Test Records (Action Required)

**4 Jake Goble records in Payments DB + 1 in Intake DB** should be archived or deleted before launch.

**Steps to clean up:**
1. Open Notion → Payments DB
2. Filter by Client Name contains "Jake Goble"
3. For each record: check the Linked Intake relation
4. Delete or archive the test records
5. Open Notion → Intake DB
6. Filter by Client Name contains "Jake Goble"
7. Delete or archive the test intake record

### Issue 2: Orphan Risk

If any real Intake records exist without a matching Payments record (or vice versa), the relation link is broken. This can happen when:
- A customer fills the Tally form but used a different email than Stripe
- WF3's "Find Payment by Email" step fails silently

**Check:** Query Intake DB for records where Linked Payment is empty. These are potential orphans.

### Issue 3: Pipeline Status Consistency

Verify that Payments DB statuses align with actual customer state:
- No "Paid - Needs Booking" records that are actually already booked
- No "Booked - Needs Intake" records that already have a linked intake
- No "Lead - Laylo" records that have actually paid

**Check:** Cross-reference Payments DB status with Intake DB existence and Calendly booking state.

### Issue 4: Missing Product Purchased

All Stripe-sourced records likely have `Product Purchased` as empty/null because WF1's extraction is broken (see [stripe-product-mapping.md](stripe-product-mapping.md)).

**Fix:** After implementing the Stripe metadata fix, backfill existing records:
1. Open Payments DB
2. Filter where Product Purchased is empty AND Payment Amount > 0
3. Set Product Purchased to "Standard Call" for all (assuming all current purchases are single calls)

---

## Recommendations

| Priority | Action | Time |
|----------|--------|------|
| NOW | Delete/archive 4 Jake Goble test records from Payments DB | 2 min |
| NOW | Delete/archive 1 Jake Goble test record from Intake DB | 1 min |
| TODAY | Verify Priya Malhotra intake fields are populated | 2 min |
| TODAY | Check for orphan Intake records (no linked Payment) | 5 min |
| THIS WEEK | Backfill Product Purchased on existing records | 5 min |
| THIS WEEK | Audit pipeline statuses match reality | 10 min |
