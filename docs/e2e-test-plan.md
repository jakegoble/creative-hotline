# End-to-End Test Plan: First Real Payment

**Date:** February 20, 2026
**Purpose:** Verify the full pipeline before real customer payments flow through the system.

---

## Pre-Test Checklist

Before running the test, confirm every item:

- [ ] **n8n account is on Pro plan** (not expired trial)
- [ ] **All 7 workflows are active** in n8n Cloud
- [ ] **Stripe webhook registered** for live mode at `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout` for event `checkout.session.completed`
- [ ] **Stripe payment link metadata set** on all 3 live links (`product_name` key with exact Notion select values)
- [ ] **"3-Session Clarity Sprint"** exists as a Product Purchased option in Notion Payments DB
- [ ] **WF7 dead URL fixed** — Send Nurture Email contains `www.thecreativehotline.com` (not `soscreativehotline.com`)
- [ ] **WF1 fixes applied** (if ready): product mapping, dedup guard, Lead Source, Frankie email
- [ ] **Notion Payments DB is clean** — no leftover test duplicates that would confuse verification
- [ ] **Team email recipients confirmed** — jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com all active

---

## Test 1: Stripe Direct Purchase → WF1

**What it tests:** The direct payment path (payment link → WF1 → Notion record + customer email + team notification)

### Steps

1. **Create a temporary $1 test product** in Stripe live mode
   - Stripe Dashboard → Products → Add Product → Name: "Test $1" → Price: $1.00 one-time
   - Create a Payment Link for it
   - Add metadata: `product_name` = `First Call` (to test the mapping)

2. **Complete a real purchase**
   - Open the $1 Payment Link in an incognito browser
   - Use a real card (your own)
   - Enter a test email you control (e.g., a personal Gmail)
   - Complete checkout

3. **Verify within 60 seconds:**

| Check | Where to Look | Expected Result |
|-------|--------------|-----------------|
| WF1 fired | n8n → Executions → WF1 | Green checkmark, no errors |
| Notion record created | Payments DB | New record with your name + email |
| Status correct | Payments DB → Status | "Paid - Needs Booking" |
| Product Purchased | Payments DB → Product Purchased | "First Call" (from metadata) |
| Payment Amount | Payments DB → Payment Amount | $1 |
| Stripe Session ID | Payments DB → Stripe Session ID | `cs_live_...` (not empty) |
| Payment Date | Payments DB → Payment Date | Today's date |
| Lead Source | Payments DB → Lead Source | "Direct" (if WF1 fix applied) |
| Customer email received | Your test email inbox | Subject: booking email with Calendly link |
| Calendly link works | Click link in email | Opens Calendly booking page |
| Team notification received | jake@radanimal.co inbox | Payment alert with correct details |

4. **Check for duplicates** (wait 2-3 minutes)
   - Refresh Payments DB — should be exactly 1 record for this purchase
   - If WF1 dedup is not yet applied, Stripe may retry and create duplicates

5. **Refund the $1 charge**
   - Stripe Dashboard → Payments → Find the charge → Issue full refund

6. **Delete the test product and payment link**
   - Stripe Dashboard → Products → Delete "Test $1"

---

## Test 2: Calendly Booking → WF2

**What it tests:** The booking path (Calendly webhook → WF2 → Notion status update + team notification)

### Steps

1. **Book a test call on Calendly**
   - Use the same email as Test 1 (so WF2 can find the payment record by email)
   - Go to `https://calendly.com/soscreativehotline/creative-hotline-call`
   - Book any available slot

2. **Verify within 60 seconds:**

| Check | Where to Look | Expected Result |
|-------|--------------|-----------------|
| WF2 fired | n8n → Executions → WF2 | Green checkmark |
| Status updated | Payments DB → your record | "Booked - Needs Intake" |
| Call Date set | Payments DB → Call Date | The date/time you booked |
| Calendly Link set | Payments DB → Calendly Link | URL to the event |
| Team notification | Team inbox | Booking alert (note: `event_type` and `start_time` may show blank — known bug) |

3. **Cancel the test booking** in Calendly after verification

---

## Test 3: Tally Intake → WF3

**What it tests:** The intake path (Tally form → WF3 → Intake record + Claude analysis + Notion linking + team notification)

### Steps

1. **Submit the Tally intake form**
   - Go to `https://tally.so/r/b5W1JE`
   - Fill in with test data:
     - Name: Same as Test 1
     - Email: Same as Test 1
     - Role: "Creative Director"
     - Brand: "Test Brand Co"
     - Creative Emergency: "Need help with brand positioning for a product launch"
     - Desired Outcome: Select any option(s)
     - Other fields: Fill with realistic test data

2. **Verify within 2 minutes** (Claude API call adds latency):

| Check | Where to Look | Expected Result |
|-------|--------------|-----------------|
| WF3 fired | n8n → Executions → WF3 | Green checkmark |
| Intake record created | Intake DB | New record with your test data |
| All fields populated | Intake DB → your record | Name, email, role, brand, creative emergency all filled |
| AI Summary generated | Intake DB → AI Intake Summary | Non-empty text with Claude's analysis |
| Intake Status | Intake DB → Intake Status | "Submitted" |
| Payment linked | Payments DB → your record → Linked Intake | Points to the new intake record |
| Payment status updated | Payments DB → Status | "Intake Complete" |
| Team notification | Team inbox | Intake notification with client details |
| Upsell alert (if triggered) | Team inbox | Upsell alert (depends on Claude's analysis) |

---

## Test 4: Follow-Up Workflows (WF5/6/7)

**What it tests:** That follow-up emails fire correctly and don't spam

These run on daily schedules and can't be easily triggered on demand. To test:

### Option A: Wait for scheduled execution
- Leave the test record in "Paid - Needs Booking" status for 48+ hours → WF5 should fire at 9am
- Leave it in "Booked - Needs Intake" with a call date within 24hrs → WF6 should fire at 8am
- Create a "Lead - Laylo" record 3-7 days old → WF7 should fire at 10am

### Option B: Manual execution via n8n
- In n8n Cloud UI → Open WF5 → Click "Test workflow" (runs immediately with current Notion data)
- Check that the filter code correctly identifies matching records
- Verify emails are sent only to matching clients

### Verification for each:

| Check | Expected |
|-------|----------|
| Correct records filtered | Only matching status + time window |
| Customer email sent | From `hello@creativehotline.com` with correct content |
| Team alert sent | From `notifications@creativehotline.com` |
| No duplicates | Same record not processed twice on re-run (requires dedup checkboxes — not yet implemented) |

---

## Test 5: Laylo Subscriber → WF4

**What it tests:** Instagram DM keyword → Laylo webhook → WF4 → Notion record + team notification

### Steps

This requires triggering a Laylo webhook. Options:
1. **Instagram method:** DM @creative.hotline with a configured keyword (BOOK, PRICING, or HELP)
2. **Direct webhook test:** In n8n, use WF4's test mode and send a test payload:
   ```json
   {
     "body": {
       "email": "test@example.com",
       "phoneNumber": "+15551234567",
       "productId": "test-drop-id"
     }
   }
   ```

### Verification:

| Check | Expected |
|-------|----------|
| WF4 fired | Green checkmark in n8n |
| Notion record created | Payments DB with Status = "Lead - Laylo" |
| Email set | Your test email |
| Phone mapped | Your test phone (known bug: currently NOT mapped) |
| Client Name | Currently blank (known bug: no fallback) |
| Product Purchased | Currently "Laylo SMS Signup" (known bug: invalid select value) |
| Team notification | Subscriber alert sent |

---

## Known Gaps (Not Blockers for First Payment)

These are documented bugs that will not prevent the first payment from flowing through, but should be fixed before scaling:

| Gap | Impact | Fix Spec |
|-----|--------|----------|
| WF1 product_name always null | Notion shows blank Product Purchased | `wf1-stripe-fix-spec.md` Problem 1 |
| WF1 no dedup guard | Stripe retries create duplicate records | `wf1-stripe-fix-spec.md` Problem 2 |
| WF1 no Lead Source | Notion Lead Source column blank | `wf1-stripe-fix-spec.md` Problem 3 |
| WF1 no signature verification | Fake webhooks accepted | `wf1-stripe-fix-spec.md` Problem 5 |
| WF2 team email wrong variables | Team sees blank event_type/start_time | `workflow-health-check.md` issue #2 |
| WF4 phone not mapped | Phone number lost | `workflow-health-check.md` issue #3 |
| WF4 Client Name blank | Record has no name | `workflow-health-check.md` issue #4 |
| WF5/6/7 no dedup | Same email sent daily | `wf567-consolidated-spec.md` |
| WF7 dead URL | "Learn More" link broken | `workflow-health-check.md` Check 2 |

---

## Rollback Plan

If something goes critically wrong during the test:

### Immediate Actions
1. **Deactivate WF1** in n8n Cloud → stops processing any new Stripe webhooks
2. **Refund the charge** in Stripe Dashboard → Payments → Issue refund
3. **Delete the test record** from Notion Payments DB manually

### If WF1 is Sending Wrong Emails
1. Deactivate WF1
2. Check the "Send Calendly Link" node — verify `fromEmail`, `subject`, and HTML are correct
3. Fix and reactivate

### If Duplicate Records Appear
1. This is expected if the dedup guard isn't yet applied
2. Delete duplicates manually in Notion
3. Stripe stops retrying after 72 hours or after receiving a 2xx response

### If Notion API Fails
1. WF1 has `onError: "continueRegularOutput"` on the Notion node — the customer email still sends
2. Check n8n execution log for the specific error
3. Common causes: credential expired, property name mismatch, invalid select value
4. Fix and re-run the execution manually in n8n

### If No Webhook Fires at All
1. Check Stripe Dashboard → Developers → Webhooks → Event log
2. Verify the endpoint URL is exactly: `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout`
3. Verify the event type is `checkout.session.completed`
4. Check n8n → WF1 → is it active?
5. Try sending a test event from Stripe's webhook testing tool

---

## Post-Test Cleanup

After successful testing:
- [ ] Refund any test charges in Stripe
- [ ] Delete any test payment links/products in Stripe
- [ ] Delete test records from Notion Payments DB
- [ ] Cancel any test Calendly bookings
- [ ] Verify team inboxes received expected notifications
- [ ] Document any unexpected behavior for follow-up
