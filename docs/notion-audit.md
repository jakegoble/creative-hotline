# Notion CRM Data Integrity Audit

**Date:** February 20, 2026
**Audited by:** Claude Code
**Databases:** Payments DB (`3030e73ffadc80bcb9dde15f51a9caf2`) + Intake DB (`2f60e73ffadc806bbf5ddca2f5c256a3`)

---

## Summary

| Metric | Count |
|--------|-------|
| Payments DB records | 4 |
| Intake DB records | 4 |
| Payments with matching Intake (by email) | 1 (Jake Goble — unlinked) |
| Intake records with matching Payments | 1 (Jake Goble — unlinked) |
| Orphan Intake records (no payment) | 3 |
| Records with critical missing fields | 8 of 8 |

**Verdict:** Both databases contain only test data. No real customer records exist yet. All records have data quality issues that reflect workflow bugs (now mostly fixed) rather than manual entry errors.

---

## Payments Database — All Records

All 4 records are Jake Goble test transactions from Feb 11, 2026.

| # | Client Name | Email | Amount | Status | Product Purchased | Call Date | Phone | Calendly Link | Lead Source | Stripe Session ID |
|---|------------|-------|--------|--------|-------------------|-----------|-------|---------------|-------------|-------------------|
| 1 | Jake Goble | jake@radanimal.co | $699 | Call Complete | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | cs_test_a1qiEv9c... |
| 2 | Jake Goble | jake@radanimal.co | $699 | Call Complete | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | cs_test_a1Z17Xd... |
| 3 | Jake Goble | jake@radanimal.co | $699 | Call Complete | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | cs_test_a1Bruni... |
| 4 | Jake Goble | jake@radanimal.co | $699 | Call Complete | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | cs_test_a1YJEn2... |

### Payments Issues Found

1. **4 duplicate test entries** — Same person, same email, same amount, created within ~65 minutes of each other (00:11 → 01:15 UTC on Feb 11). This confirms the known bug: no duplicate-payment guard on the Stripe webhook. Each test checkout created a new record.

2. **Status = "Call Complete" but Call Date is empty on all 4** — Status was manually advanced past the booking step, but no Calendly booking ever happened for these test transactions. This is a status inconsistency.

3. **Product Purchased is empty on all 4** — Confirms the known WF1 bug: `line_items.data[0].description` is not included in the Stripe webhook payload. The value is always null. Fix requires either a Stripe API expand call or metadata-based product mapping.

4. **$699 doesn't match any Product Purchased option** — The select options are "Standard Call", "3-Pack Sprint", "First Call". Website pricing shows $499/$500/$599. The $699 test amount doesn't correspond to any real product tier. These should be updated to $499 or the correct launch price.

5. **Phone is empty on all 4** — Jake likely didn't provide a phone in test checkouts. Not a bug per se, but WF1 should handle this gracefully (it does — uses email-only Laylo subscribe path).

6. **Calendly Link is empty on all 4** — No booking was made through Calendly for these test entries.

7. **Lead Source is empty on all 4** — WF1 doesn't set Lead Source. Should be "Direct" for Stripe checkout purchases.

8. **Linked Intake is empty on all 4** — Despite a Jake Goble Intake record existing (jake@radanimal.co), the relation was never set. WF3 (Tally Intake) is supposed to link intake to payment by email, but it was never triggered for these test records, or the linking step failed.

---

## Intake Database — All Records

| # | Client Name | Email | Role | Brand | Intake Status | AI Summary | Call Date | Action Plan Sent | Linked Payment | Website/IG |
|---|------------|-------|------|-------|---------------|------------|-----------|------------------|----------------|------------|
| 1 | Sarah Chen | sarah.chen@example.com | Founder & Creative Director | Moonlight Studio | Submitted | ✅ Filled | 2026-01-30 | No | *(empty)* | *(empty)* |
| 2 | Marcus Thompson | marcus@rebelroastco.com | Co-founder | Rebel Roast Co. | Submitted | ✅ Filled | 2026-01-31 | No | *(empty)* | *(empty)* |
| 3 | Priya Malhotra | priya.m@cloudcurve.io | Head of Marketing | CloudCurve | Submitted | ✅ Filled | 2026-02-02 | No | *(empty)* | *(empty)* |
| 4 | Jake Goble | jake@radanimal.co | CEO | Rad Animal | *(empty)* | ❌ Empty | 2026-02-06 | No | *(empty)* | *(empty)* |

### Intake Issues Found

1. **3 orphan intake records (Sarah, Marcus, Priya)** — These have NO corresponding Payments DB records. They appear to be test records created directly in Notion or via the Tally webhook without a preceding Stripe payment. In the real pipeline, every intake should have a matching payment. These records prove the intake form + Claude analysis pipeline works, but they're disconnected from the payments pipeline.

2. **Jake Goble intake has empty AI Intake Summary** — The Claude analysis either wasn't triggered or didn't persist. This may have been caused by the known WF3 empty `textContent` bug (now understood to be a serialization artifact, but worth verifying this specific record). All other intake records have complete AI summaries.

3. **Jake Goble intake has no Intake Status** — Should be "Submitted" since all fields are filled. The other 3 test records correctly show "Submitted".

4. **All Linked Payment relations are empty** — WF3 is supposed to find the payment record by email and create the relation. For Sarah/Marcus/Priya, there ARE no payment records to link. For Jake, 4 payment records exist but the link was never made.

5. **Website/IG is empty on all 4** — Not a bug if the Tally form field is optional, but worth noting. Zero out of 4 test users provided it.

6. **All Action Plan Sent = No** — Expected for test data, but confirms no post-call follow-up has been completed for any record.

---

## Cross-Reference Analysis

### By Email Match

| Email | Payments Records | Intake Records | Linked? |
|-------|-----------------|----------------|---------|
| jake@radanimal.co | 4 (all $699) | 1 | ❌ No |
| sarah.chen@example.com | 0 | 1 | N/A |
| marcus@rebelroastco.com | 0 | 1 | N/A |
| priya.m@cloudcurve.io | 0 | 1 | N/A |

### Pipeline Status Consistency Check

| Record | Status | Expected Prerequisites | Met? |
|--------|--------|----------------------|------|
| Jake Goble (Payments ×4) | Call Complete | Should have Call Date | ❌ No Call Date |
| Jake Goble (Payments ×4) | Call Complete | Should have Calendly Link | ❌ No Calendly Link |
| Jake Goble (Payments ×4) | Call Complete | Should have Product Purchased | ❌ Empty |
| Jake Goble (Payments ×4) | Call Complete | Should have Linked Intake | ❌ Not linked |
| Sarah Chen (Intake) | Submitted | Should have matching Payment | ❌ No payment |
| Marcus Thompson (Intake) | Submitted | Should have matching Payment | ❌ No payment |
| Priya Malhotra (Intake) | Submitted | Should have matching Payment | ❌ No payment |

---

## Jake Goble $699 Test Entries — Recommendation

The 4 Jake Goble records at $699 each are clearly test transactions:
- All have `cs_test_` Stripe session IDs
- Created within 65 minutes of each other
- $699 doesn't match any actual product price
- All critical fields are empty

### Options

**Option A (Recommended): Keep 1, delete 3, update the keeper**
1. Keep the earliest record (`3040e73f-fadc-81d0`, created 00:11 UTC)
2. Delete the other 3 duplicates
3. Update the keeper:
   - Payment Amount: $499 (or whatever the launch price will be)
   - Product Purchased: "Standard Call"
   - Status: "Paid - Needs Booking" (reset to beginning of pipeline for end-to-end retest)
   - Lead Source: "Direct"
4. Link it to the Jake Goble Intake record
5. Run through the full pipeline as a final integration test

**Option B: Delete all 4, start fresh**
1. Delete all test records from both databases
2. Create one clean test record by running a real test Stripe checkout with the correct product/price
3. Walk it through the entire pipeline end-to-end

**Option C: Leave as-is, mark as test data**
1. Add a "Test" tag or status to all test records
2. This requires adding a new property to both databases

---

## Workflow Bug Confirmation

This audit confirms the following workflow bugs documented in the system reference:

| Bug | Confirmed? | Evidence |
|-----|-----------|----------|
| WF1: Product Purchased always null (Stripe webhook doesn't include line_items) | ✅ Yes | All 4 payments have empty Product Purchased |
| WF1: No duplicate-payment guard | ✅ Yes | 4 identical records from same email in 65 minutes |
| WF1: Lead Source not set | ✅ Yes | All 4 payments have empty Lead Source |
| WF3: Intake-to-Payment linking fails | ✅ Yes | Jake Goble has records in both DBs but relation is empty |
| WF3: AI Summary may not persist | ⚠️ Partial | Jake's intake has empty summary; 3 others are fine |

---

## Recommended Cleanup Actions

1. **Delete 3 duplicate Jake Goble payment records** (keep earliest)
2. **Update remaining Jake Goble payment**: set Product Purchased, fix amount, reset status
3. **Link Jake Goble intake → payment** (set Linked Payment relation)
4. **Set Jake Goble intake status** to "Submitted"
5. **Decide on Sarah/Marcus/Priya** — either delete (pure test data) or create matching payment records to test the full pipeline
6. **Before launch**: run one clean end-to-end test with correct Stripe product/price to verify all fixes
