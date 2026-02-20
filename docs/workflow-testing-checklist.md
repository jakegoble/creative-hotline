# Creative Hotline — Workflow Testing Checklist

> **NOTE:** References "9 workflows" but WF8 + WF9 have been deleted. See `docs/e2e-test-plan.md` for the updated 7-workflow test plan with curl payloads in `docs/test-payloads.md`.

**Last updated:** 2026-02-20
**Purpose:** Step-by-step guide for testing the n8n workflows end-to-end using n8n test mode and Stripe test mode. Designed for the business owner to run through without developer assistance.

**Time estimate:** 60-90 minutes for full end-to-end testing

---

## Table of Contents

1. [Before You Start: General Setup](#before-you-start-general-setup)
2. [Stripe Test Mode Setup](#stripe-test-mode-setup)
3. [n8n Test Mode Basics](#n8n-test-mode-basics)
4. [WF1: Stripe Purchase to Calendly Link](#wf1-stripe-purchase--calendly-link)
5. [WF2: Calendly Booking to Payments Update](#wf2-calendly-booking--payments-update)
6. [WF3: Tally Intake to Claude Analysis](#wf3-tally-intake--claude-analysis)
7. [WF4: Laylo Subscriber to Notion](#wf4-laylo-subscriber--notion)
8. [WF5: Paid But Never Booked (Daily 9am)](#wf5-paid-but-never-booked)
9. [WF6: Booked But No Intake (Daily 8am)](#wf6-booked-but-no-intake)
10. [WF7: Laylo Lead Nurture (Daily 10am)](#wf7-laylo-lead-nurture)
11. [WF8 and WF9: Broken Workflows](#wf8--wf9-broken-workflows--deactivate)
12. [Full Smoke Test: End-to-End Customer Journey](#full-smoke-test-end-to-end-customer-journey)
13. [Sample Webhook Payloads for Manual Testing](#sample-webhook-payloads-for-manual-testing)
14. [Post-Testing Cleanup](#post-testing-cleanup)

---

## Before You Start: General Setup

### What you need open

- [ ] **n8n Cloud editor:** https://creativehotline.app.n8n.cloud
- [ ] **Notion:** Both databases open in separate tabs
  - Payments DB (ID: `3030e73ffadc80bcb9dde15f51a9caf2`)
  - Intake DB (ID: `2f60e73ffadc806bbf5ddca2f5c256a3`)
- [ ] **Stripe Dashboard:** https://dashboard.stripe.com (logged in)
- [ ] **Your email inbox** (check jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com)
- [ ] **A personal test email address** you can receive mail at (NOT the team addresses above)
- [ ] **(Optional)** Postman, Insomnia, or a similar HTTP client for sending manual webhook payloads

### Naming convention for test data

Use this pattern so test records are easy to find and delete:

- **Name:** `TEST - [Your Name]`
- **Email:** `test+hotline@youremail.com` (Gmail plus-addressing works great)
- **Phone:** `+15551234567`

### Important safety notes

- n8n test mode runs a workflow once using a test trigger. It does NOT activate the workflow permanently.
- Test mode still writes real data to Notion and sends real emails. You will need to clean up test records afterward.
- When using Stripe test mode, no real charges are made. Test card numbers produce fake transactions.

---

## Stripe Test Mode Setup

### Step 1: Enable test mode in Stripe

1. Go to https://dashboard.stripe.com
2. In the top-right corner, find the **"Test mode"** toggle and turn it ON. The dashboard header will turn orange/yellow to confirm you are in test mode.
3. All data you see is now test data. Real customer data is hidden.

### Step 2: Find or create a test product

1. Go to **Products** in the Stripe sidebar.
2. Look for an existing test product (it may say "Creative Hotline Call" or similar).
3. If none exists, click **Add product**:
   - Name: `Creative Hotline Call - Test`
   - Price: `$499.00` (one-time)
   - Click **Save product**
4. Optionally add metadata to the product: `product_type: Standard Call` (this helps WF1 map the product name correctly to Notion).

### Step 3: Create a test payment link (for the smoke test later)

1. In Stripe, go to **Payment links** in the sidebar.
2. Click **Create payment link**.
3. Select your test product, quantity 1.
4. Under **After payment**, set the confirmation page or redirect URL to `https://www.thecreativehotline.com`.
5. Click **Create link**.
6. Copy this link. You will use it in the full smoke test.

### Step 4: Stripe test card numbers

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Payment declined |
| `4000 0000 0000 3220` | Requires 3D Secure authentication |

For all test cards: use any future expiry date (e.g., `12/30`), any 3-digit CVC (e.g., `123`), and any billing ZIP (e.g., `90291`).

### Step 5: Verify Stripe webhook points to n8n

1. In Stripe test mode, go to **Developers > Webhooks**.
2. Confirm there is a webhook endpoint pointing to:
   ```
   https://creativehotline.app.n8n.cloud/webhook/stripe-checkout
   ```
3. Confirm it is listening for the `checkout.session.completed` event.
4. If the webhook does not exist, click **Add endpoint** and create it with the URL and event above.

---

## n8n Test Mode Basics

### How to run a workflow in test mode

1. Open the workflow in the n8n editor.
2. Click the **"Test workflow"** button (play icon at the bottom center of the canvas, or top-right depending on your n8n version). For webhook-triggered workflows, this puts the webhook into "listening" mode.
3. For **webhook-triggered workflows** (WF1-WF4): After clicking "Test workflow," n8n displays a test webhook URL. You then trigger the external event (Stripe payment, Calendly booking, etc.) or send a manual POST request to that URL.
4. For **schedule-triggered workflows** (WF5-WF7): Click "Test workflow" and it executes immediately using the current time, regardless of the cron schedule.
5. After the workflow executes, n8n highlights each node green (success) or red (error). Click any node to inspect its input and output data.

### Test webhook URLs vs production webhook URLs

When you click "Test workflow" on a webhook-triggered workflow, n8n generates a **test** URL that looks like:

```
https://creativehotline.app.n8n.cloud/webhook-test/stripe-checkout
```

Notice the `/webhook-test/` path instead of `/webhook/`. This test URL is only active while you are in test mode. Production webhooks from Stripe/Calendly/etc. hit the `/webhook/` path and are handled by the activated workflow.

For manual Postman testing, send your payloads to the **test** URL while the workflow is listening.

---

## WF1: Stripe Purchase -> Calendly Link

**Workflow ID:** `AMSvlokEAFKvF_rncAFte`
**Trigger:** Stripe webhook (`checkout.session.completed`)
**What it does:** Creates a Notion record in Payments DB, subscribes customer to Laylo, emails customer the Calendly booking link, notifies team.

### Pre-test setup

- [ ] Open WF1 in the n8n editor
- [ ] Confirm Stripe is in test mode (orange header)
- [ ] Have your Notion Payments DB open so you can watch for new records
- [ ] Have your test email inbox open

### How to trigger

**Option A: Use Stripe test payment (most realistic)**

1. In n8n, click **"Test workflow"** on WF1. The webhook starts listening.
2. Open your Stripe test payment link (from setup step 3) in a new browser tab.
3. Fill in the checkout form:
   - Email: `test+hotline@youremail.com`
   - Name: `TEST - Jake`
   - Card: `4242 4242 4242 4242`, Exp: `12/30`, CVC: `123`
4. Complete the purchase.
5. Stripe fires the `checkout.session.completed` webhook to n8n.

**Option B: Use Stripe CLI to send a test event**

If you have the Stripe CLI installed:

```bash
stripe trigger checkout.session.completed \
  --override checkout_session:customer_details.email=test+hotline@youremail.com \
  --override checkout_session:customer_details.name="TEST - Jake"
```

**Option C: Send a manual payload via Postman**

1. In n8n, click **"Test workflow"** and copy the test webhook URL.
2. Send a POST request to that URL with the sample Stripe payload from the [Sample Payloads](#sample-stripe-checkoutsessioncompleted-payload) section below.

### What to check after

- [ ] **n8n execution:** All nodes should show green. Click each node to verify data passed through correctly.
- [ ] **Notion Payments DB:** A new record should appear with:
  - Client Name: `TEST - Jake`
  - Email: `test+hotline@youremail.com`
  - Status: `Paid - Needs Booking`
  - Payment Amount: `499` (or whatever amount you used)
  - Stripe Session ID: populated (not empty)
  - Payment Date: today's date
- [ ] **Customer email:** Check your test inbox for an email from `hello@creativehotline.com` (or `jake@radanimal.co` if the sender fix has not been applied yet) with subject "Let's get your call on the books" containing a Calendly link.
- [ ] **Team notification email:** Check jake@radanimal.co, megha@theanecdote.co, or soscreativehotline@gmail.com for a notification email about the new payment.

### Common failure points

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Webhook never fires | Stripe webhook not configured for test mode | Add webhook endpoint in Stripe test mode dashboard |
| Notion record created but Product Purchased is blank | Stripe webhook does not include `line_items` | Known issue. Apply Fix 1.2 (hardcode "Standard Call" or use metadata) |
| Customer email comes from `jake@radanimal.co` | Sender not updated yet | Apply Fix 1.1 (change fromEmail to `hello@creativehotline.com`) |
| Duplicate Notion records on retry | No dedup guard on Stripe Session ID | Known issue. Avoid retrying the same webhook for now |
| Laylo subscribe node errors (red) | Laylo API credentials or format issue | Check that onError is set to continueRegularOutput. Email should still send. |
| n8n shows "Workflow could not be started" | Workflow not in listening mode | Click "Test workflow" before triggering Stripe |

### Success criteria

- [ ] Notion record exists with correct name, email, amount, status, session ID, and date
- [ ] Customer received the Calendly link email
- [ ] Team received the payment notification email
- [ ] No red (errored) nodes in the execution (Laylo errors are acceptable if they do not block email delivery)

---

## WF2: Calendly Booking -> Payments Update

**Workflow ID:** `Wt7paQoH2EICMtUG`
**Trigger:** Calendly webhook (`invitee.created`)
**What it does:** Finds the customer's Payments DB record by email, updates status to "Booked - Needs Intake", sets Call Date and Calendly Link, notifies team.

### Pre-test setup

- [ ] Open WF2 in the n8n editor
- [ ] Confirm there is an existing Notion Payments DB record for your test email with status `Paid - Needs Booking` (created by WF1, or create one manually)
- [ ] Note the email on that record. You must use the **same email** when booking on Calendly.

### How to trigger

**Option A: Book a real Calendly test call (most realistic)**

1. In n8n, click **"Test workflow"** on WF2. The webhook starts listening.
2. Open https://calendly.com/soscreativehotline/creative-hotline-call in a new browser tab.
3. Pick any available time slot.
4. Enter: name `TEST - Jake`, email `test+hotline@youremail.com` (must match the Notion record).
5. Confirm the booking.
6. Calendly fires the `invitee.created` webhook to n8n.

**Option B: Send a manual payload via Postman**

1. In n8n, click **"Test workflow"** and copy the test webhook URL.
2. Send a POST request with the sample Calendly payload from the [Sample Payloads](#sample-calendly-inviteecreated-payload) section below.

### What to check after

- [ ] **n8n execution:** All nodes green. Verify "Find Payment by Email" found exactly 1 result.
- [ ] **Notion Payments DB:** The existing test record should now show:
  - Status changed to: `Booked - Needs Intake`
  - Call Date: the date/time you booked
  - Calendly Link: populated with the Calendly event URL
- [ ] **Team notification email:** Check team inboxes for booking notification.

### Common failure points

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Find Payment by Email" returns 0 results | Email used in Calendly does not match Stripe/Notion email | Known issue. Use the same email. Long-term: add fallback notification. |
| Status not updated | Notion record not found (see above) | Verify email match manually in Notion |
| Team notification shows "undefined" for event_type or start_time | Broken field references in email template | Apply Fix 2.1 (replace `event_type` with static text, `start_time` with `call_date`) |
| WF8 also fires on the same Calendly webhook | WF8 is active and listening on a Calendly webhook | Deactivate WF8 immediately |

### Success criteria

- [ ] Notion record status changed from `Paid - Needs Booking` to `Booked - Needs Intake`
- [ ] Call Date and Calendly Link are populated
- [ ] Team received the booking notification email
- [ ] No red nodes in execution

---

## WF3: Tally Intake -> Claude Analysis

**Workflow ID:** `ETKIfWOX-eciSJQQF7XX5`
**Trigger:** Tally webhook (form submission)
**What it does:** Creates an Intake DB record, calls Claude API to generate an AI summary, checks for upsell opportunities, links the Intake record to the Payments DB record, updates status to "Intake Complete", notifies team.

### Pre-test setup

- [ ] Open WF3 in the n8n editor
- [ ] Confirm there is an existing Notion Payments DB record for your test email with status `Booked - Needs Intake` (set by WF2, or create/update one manually)
- [ ] Have both the Notion Payments DB and Intake DB open

### How to trigger

**Option A: Submit the real Tally form (most realistic)**

1. In n8n, click **"Test workflow"** on WF3. The webhook starts listening.
2. Open https://tally.so/r/b5W1JE in a new browser tab.
3. Fill out the intake form with test data:
   - Name: `TEST - Jake`
   - Email: `test+hotline@youremail.com` (must match the Payments DB record)
   - Role: `Founder`
   - Brand: `Test Brand Co`
   - Website/IG: `https://www.testbrand.com`
   - Creative Emergency: `We need a new brand identity. Our current look is outdated and does not resonate with our target audience.`
   - Desired Outcome: `A clear decision`
   - What They've Tried: `Hired a freelance designer but the results were off-brand.`
   - Deadline: `End of March`
   - Constraints: `Budget under $5k, no pink`
4. Submit the form. Tally fires its webhook to n8n.

**Option B: Send a manual payload via Postman**

1. In n8n, click **"Test workflow"** and copy the test webhook URL.
2. Send a POST request with the sample Tally payload from the [Sample Payloads](#sample-tally-form-submission-payload) section below.

### What to check after

- [ ] **n8n execution:** Walk through every node. Pay special attention to:
  - "Extract Tally Data" — verify all fields extracted correctly (click the node, check output)
  - "Create Intake Record" — verify it created a Notion page
  - "Claude Generate Summary" — verify it returned a response (not a 401 or 429 error)
  - "Extract Claude Response" — verify `ai_summary` is a paragraph of text and `upsell_detected` is true or false
  - "Find Payment by Email" — verify it found 1 result
  - "Link Intake & Update Status" — verify it updated the Payments record
- [ ] **Notion Intake DB:** A new record should appear with:
  - Client Name: `TEST - Jake`
  - Email: `test+hotline@youremail.com`
  - Role: `Founder` (should be text, not a dropdown)
  - Brand: `Test Brand Co`
  - Creative Emergency: populated with your test text
  - AI Intake Summary: populated with Claude's analysis (a paragraph or two)
  - Intake Status: `Submitted`
  - Linked Payment: linked to the corresponding Payments DB record
- [ ] **Notion Payments DB:** The test record should now show:
  - Status changed to: `Intake Complete`
  - Linked Intake: linked to the new Intake DB record
- [ ] **Team notification email:** Check for intake notification.
- [ ] **If upsell detected:** Check for a separate upsell alert email to the team.

### Common failure points

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Intake record created but most fields are blank | Empty `textContent` values in Notion node config | Check n8n node config. Verified as working in production (MCP export shows empty but expressions evaluate at runtime). If truly blank, apply Fixes 3.3-3.8. |
| Role field errors or is blank | Role mapped as `select` but Notion expects `rich_text` | Apply Fix 3.1 (change to `Role\|rich_text`) |
| Desired Outcome field errors | Mapped as `select` but Notion expects `multi_select` | Apply Fix 3.2 (change to `Desired Outcome\|multiSelect`) |
| Claude Generate Summary returns 401 | API key expired or invalid | Check the hardcoded API key in the HTTP Request node headers. Long-term: move to n8n credential (Fix 3.12). |
| Claude Generate Summary returns 429 | Rate limited | Wait a minute and retry. This is transient. |
| AI Summary blank in Notion | Summary not written to Notion | Check "Update Notion with AI Summary" node output. Apply Fix 3.9 if textContent expression is missing. |
| "Find Payment by Email" returns 0 | Email mismatch between Tally form and Payments DB | Use the exact same email. Known issue for production. |
| Upsell alert comes from wrong email | Sender not updated | Apply Fix 3.10 (change fromEmail to `notifications@creativehotline.com`) |

### Success criteria

- [ ] Intake DB record exists with all fields populated (name, email, role, brand, creative emergency, etc.)
- [ ] AI Intake Summary field contains Claude's analysis text
- [ ] Payments DB record status changed to `Intake Complete`
- [ ] Both records are linked to each other via the relation fields
- [ ] Team received the intake notification email
- [ ] If upsell was detected, team received a separate upsell alert
- [ ] No red nodes in execution (Laylo errors on the orphaned node are ignorable)

---

## WF4: Laylo Subscriber -> Notion

**Workflow ID:** `MfbV3-F5GiMwDs1KD5AoK`
**Trigger:** Laylo webhook (new subscriber)
**What it does:** Creates a lead record in the Payments DB with status "Lead - Laylo" and notifies the team.

### Pre-test setup

- [ ] Open WF4 in the n8n editor
- [ ] Have Notion Payments DB open

### How to trigger

**Option A: Trigger a real Laylo subscription from Instagram**

This requires sending a keyword (BOOK, PRICING, or HELP) via Instagram DM to @creative.hotline. This is hard to test in isolation without a real Instagram interaction.

**Option B: Send a manual payload via Postman (recommended for testing)**

1. In n8n, click **"Test workflow"** and copy the test webhook URL. It will look like:
   ```
   https://creativehotline.app.n8n.cloud/webhook-test/8e422442-519e-4d42-8cb4-372d26b89edc
   ```
2. Send a POST request with the sample Laylo payload from the [Sample Payloads](#sample-laylo-subscriber-payload) section below.

### What to check after

- [ ] **n8n execution:** All nodes green.
- [ ] **Notion Payments DB:** A new record should appear with:
  - Client Name: email address (or blank if Fix 4.3 not applied)
  - Email: `test+laylo@youremail.com`
  - Phone: `+15551234567` (or blank if Fix 4.2 not applied)
  - Status: `Lead - Laylo`
  - Payment Amount: `0`
- [ ] **Team notification email:** Check for new subscriber notification.

### Common failure points

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Client Name is blank | Laylo does not provide a name; fallback not set | Apply Fix 4.3 (use email as fallback title) |
| Phone is blank even though payload included it | phoneValue not mapped | Apply Fix 4.2 (map phoneValue) |
| Product Purchased errors | Type mismatch (rich_text vs select) | Apply Fix 4.1 (change to select or remove property) |
| Duplicate records for same email | No dedup check | Known issue. Delete duplicates manually for now. |
| Lead Source is blank | Property not set in workflow | Apply Fix 4.4 (add Lead Source = "IG DM") |

### Success criteria

- [ ] Notion record exists with email, status "Lead - Laylo", and amount 0
- [ ] Team received the subscriber notification email
- [ ] No red nodes in execution

---

## WF5: Paid But Never Booked

**Workflow ID:** `clCnlUW1zjatRHXE`
**Trigger:** Daily schedule at 9am
**What it does:** Finds all Payments DB records with status "Paid - Needs Booking" that are 48+ hours old, sends a booking reminder email to the customer, and alerts the team.

### Pre-test setup

- [ ] Open WF5 in the n8n editor
- [ ] Create (or confirm you have) a test record in Notion Payments DB with:
  - Client Name: `TEST - Stale Booking`
  - Email: your test email address
  - Status: `Paid - Needs Booking`
  - Payment Date: **at least 48 hours ago** (set it to 3 days ago to be safe)
  - Payment Amount: `499`

### How to trigger

1. In n8n, click **"Test workflow"**. The schedule trigger fires immediately (no need to wait until 9am).
2. The workflow will pull all Payments DB records and filter in the Code node.

### What to check after

- [ ] **n8n execution:** Inspect the "Filter Stale Unbookeds" Code node output. Your test record should appear in the results.
- [ ] **Customer email:** Check your test inbox for a reminder email with subject "Your call's waiting on you" from `hello@creativehotline.com` with a Calendly booking link.
- [ ] **Team email:** Check for stale booking alert.

### Common failure points

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Code node returns empty results | Test record's Payment Date is not 48+ hours old | Adjust the Payment Date in Notion to be older |
| Code node returns empty but record exists | Status is not exactly `Paid - Needs Booking` | Check for typos or extra spaces in the status value |
| All records in DB are returned (no filtering) | Code node logic error | Inspect the Code node JavaScript for correct status and date filtering |
| Customer email not received | SMTP issue or email goes to spam | Check spam folder. Verify SMTP credential is working. |

### Success criteria

- [ ] Stale test record was identified by the filter
- [ ] Customer received the booking reminder email
- [ ] Team received the stale booking alert
- [ ] Records that are NOT stale (less than 48 hours old or different status) were correctly excluded

---

## WF6: Booked But No Intake

**Workflow ID:** `Esq2SMGEy6LVHdIQ`
**Trigger:** Daily schedule at 8am
**What it does:** Finds all Payments DB records with status "Booked - Needs Intake" where the call is within 24 hours, sends an intake form reminder to the customer, and alerts the team.

### Pre-test setup

- [ ] Open WF6 in the n8n editor
- [ ] Create (or confirm you have) a test record in Notion Payments DB with:
  - Client Name: `TEST - Missing Intake`
  - Email: your test email address
  - Status: `Booked - Needs Intake`
  - Call Date: **within the next 24 hours** (set it to tomorrow morning)

### How to trigger

1. In n8n, click **"Test workflow"**. The schedule trigger fires immediately.

### What to check after

- [ ] **n8n execution:** Inspect the Code node output. Your test record should appear.
- [ ] **Customer email:** Check for a reminder email with subject "Quick thing before our call" from `hello@creativehotline.com`.
- [ ] **CRITICAL CHECK:** Open the email and verify the Tally form link is `https://tally.so/r/b5W1JE` and NOT `https://tally.so/r/YOUR_TALLY_FORM_ID`. If it shows the placeholder, this is a critical bug that must be fixed before the workflow goes live.
- [ ] **Team email:** Check for missing intake alert.

### Common failure points

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Code node returns empty results | Call Date is not within 24 hours | Adjust Call Date in Notion to be tomorrow |
| Tally link in email goes to "YOUR_TALLY_FORM_ID" | Placeholder URL not replaced | Apply Fix 6.1 (change to `https://tally.so/r/b5W1JE`) -- this is the most critical fix in the system |
| Code node processes too many records | Filter logic is too broad | Inspect the Code node; it should only match "Booked - Needs Intake" with calls within 24hrs |

### Success criteria

- [ ] Test record with upcoming call was identified by the filter
- [ ] Customer received the intake reminder email
- [ ] The Tally form link in the email is correct (`https://tally.so/r/b5W1JE`) and clickable
- [ ] Team received the missing intake alert
- [ ] Records with calls further than 24 hours out were excluded

---

## WF7: Laylo Lead Nurture

**Workflow ID:** `VYCokTqWGAFCa1j0`
**Trigger:** Daily schedule at 10am
**What it does:** Finds all Payments DB records with status "Lead - Laylo" that are 3-7 days old, sends a nurture email, and alerts the team.

### Pre-test setup

- [ ] Open WF7 in the n8n editor
- [ ] Create (or confirm you have) a test record in Notion Payments DB with:
  - Client Name: `TEST - Laylo Lead`
  - Email: your test email address
  - Status: `Lead - Laylo`
  - Created time: **4-5 days ago** (you cannot edit Created time directly in Notion, so you need a record that was actually created 3-7 days ago, OR adjust the Code node filter temporarily for testing)

**Important:** Notion's `created_time` is set automatically and cannot be edited. If you do not have a record that is 3-7 days old, you can temporarily change the Code node filter range to `0-100 days` for testing, then change it back.

### How to trigger

1. In n8n, click **"Test workflow"**. The schedule trigger fires immediately.

### What to check after

- [ ] **n8n execution:** Inspect the Code node output. Your test record should appear.
- [ ] **Customer email:** Check for a nurture email with subject "Still thinking about it?" from `hello@creativehotline.com`.
- [ ] **IMPORTANT CHECK:** Open the email and verify the "See What We Do" / "Learn More" button links to `https://www.thecreativehotline.com` and NOT `https://soscreativehotline.com` (which is a dead domain). If it links to the wrong domain, apply Fix 7.1.
- [ ] **Team email:** Check for lead nurture alert.

### Common failure points

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Code node returns empty | No records are 3-7 days old | You need a record created in that window, or temporarily widen the filter |
| "Learn More" button goes to dead domain | Wrong URL in email template | Apply Fix 7.1 (change `soscreativehotline.com` to `www.thecreativehotline.com`) |
| Lead gets nurture email repeatedly | No "nurture sent" tracking | Known limitation. The workflow will re-send to the same leads each day they are within the 3-7 day window |

### Success criteria

- [ ] Leads in the 3-7 day window were identified
- [ ] Customer received the nurture email
- [ ] The website link in the email goes to the correct domain
- [ ] Team received the nurture notification
- [ ] Leads outside the window (younger than 3 days, older than 7 days, or different status) were excluded

---

## WF8 & WF9: Broken Workflows -- Deactivate

These two workflows are non-functional scaffolding. They should be deactivated immediately. Do not test them.

### WF8: Calendly Booking to Tally (`3ONZZbLdprx4nxGK7eEom`)

**Why it is broken:**
- Queries the wrong database (Intake DB instead of Payments DB)
- Tries to send messages via Laylo API instead of email (empty request bodies)
- All filter and update values are empty
- Conflicts with WF2 (both listen on Calendly webhooks)

**Action:**
- [ ] Open WF8 in n8n
- [ ] Click the **Active** toggle in the top-right to switch it to **Inactive**
- [ ] Confirm the toggle shows inactive (grayed out)

### WF9: Post-Call Follow-Up (`9mct9GBz3R-EjTgQOZcPt`)

**Why it is broken:**
- Notion filter has empty conditions (returns ALL Intake records every hour)
- "Send Thank You" calls Laylo API with empty body instead of sending email
- "Mark Action Plan Sent" update node has no properties mapped
- Runs every hour doing nothing useful (wastes n8n execution credits)

**Action:**
- [ ] Open WF9 in n8n
- [ ] Click the **Active** toggle to switch it to **Inactive**
- [ ] Confirm the toggle shows inactive

### Success criteria

- [ ] WF8 is inactive
- [ ] WF9 is inactive
- [ ] Neither workflow appears in the "Active" filter in the n8n workflow list

---

## Full Smoke Test: End-to-End Customer Journey

This test simulates the complete customer pipeline from payment through intake. Run this after you have tested each workflow individually and confirmed they work.

**Time estimate:** 20-30 minutes

### Prerequisites

- [ ] All fixes have been applied (or you are aware of which known issues to expect)
- [ ] WF8 and WF9 are deactivated
- [ ] WF1, WF2, WF3 are all active
- [ ] Stripe is in test mode
- [ ] You have a clean test email (no existing Notion records for this email)

### Step 1: Simulate a Stripe purchase (WF1)

1. Activate WF1 if it is not already active.
2. Open your Stripe test payment link.
3. Complete checkout with:
   - Email: `smoketest+hotline@youremail.com`
   - Name: `SMOKETEST - Full Journey`
   - Card: `4242 4242 4242 4242`
4. Wait 15-30 seconds for the webhook to fire and the workflow to complete.

**Checkpoint:**
- [ ] Notion Payments DB: new record with status `Paid - Needs Booking`
- [ ] Email received: Calendly booking link

### Step 2: Book a Calendly call (WF2)

1. Activate WF2 if it is not already active.
2. Click the Calendly link from the email (or go directly to https://calendly.com/soscreativehotline/creative-hotline-call).
3. Book a time using the **same email**: `smoketest+hotline@youremail.com`
4. Wait 15-30 seconds.

**Checkpoint:**
- [ ] Notion Payments DB: same record now shows status `Booked - Needs Intake`
- [ ] Call Date and Calendly Link are populated
- [ ] Team received booking notification

### Step 3: Submit the Tally intake form (WF3)

1. Activate WF3 if it is not already active.
2. Open https://tally.so/r/b5W1JE
3. Fill it out with realistic test data using email: `smoketest+hotline@youremail.com`
4. Submit the form.
5. Wait 30-60 seconds (Claude API call takes a moment).

**Checkpoint:**
- [ ] Notion Intake DB: new record with all fields populated
- [ ] Notion Intake DB: AI Intake Summary field has Claude's analysis
- [ ] Notion Payments DB: status changed to `Intake Complete`
- [ ] Both records are linked via their relation fields
- [ ] Team received intake notification
- [ ] If Claude detected an upsell opportunity, team received upsell alert

### Step 4: Verify the full pipeline state

Open the Notion Payments DB record for `SMOKETEST - Full Journey` and confirm this final state:

| Property | Expected Value |
|----------|---------------|
| Client Name | `SMOKETEST - Full Journey` |
| Email | `smoketest+hotline@youremail.com` |
| Payment Amount | `499` (or your test amount) |
| Status | `Intake Complete` |
| Stripe Session ID | Populated |
| Payment Date | Today |
| Call Date | The date/time you booked |
| Calendly Link | Populated with Calendly URL |
| Linked Intake | Linked to the Intake DB record |

Open the Notion Intake DB record and confirm:

| Property | Expected Value |
|----------|---------------|
| Client Name | Your test name from Tally |
| Email | `smoketest+hotline@youremail.com` |
| All intake fields | Populated with your Tally responses |
| AI Intake Summary | Populated with Claude's analysis |
| Intake Status | `Submitted` |
| Linked Payment | Linked to the Payments DB record |

### Step 5: Verify email trail

You should have received these emails at your test address:

- [ ] 1. Calendly link email (from WF1)
- [ ] 2. Calendly booking confirmation (from Calendly directly, not n8n)

The team should have received:

- [ ] 1. New payment notification (from WF1)
- [ ] 2. New booking notification (from WF2)
- [ ] 3. Intake submitted notification (from WF3)
- [ ] 4. (Possibly) Upsell opportunity alert (from WF3, if detected)

### Smoke test success criteria

- [ ] Customer record moved through all 3 statuses: `Paid - Needs Booking` -> `Booked - Needs Intake` -> `Intake Complete`
- [ ] Both Notion databases have linked, complete records
- [ ] All customer and team emails were sent and received
- [ ] No orphaned or duplicate records
- [ ] No workflow errors (all nodes green in all 3 executions)

---

## Sample Webhook Payloads for Manual Testing

Use these payloads with Postman, Insomnia, curl, or any HTTP client. Send them as POST requests with `Content-Type: application/json` to the **test webhook URL** shown in n8n when you click "Test workflow."

### Sample Stripe checkout.session.completed Payload

```json
{
  "id": "evt_test_123456789",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_abc123def456",
      "object": "checkout.session",
      "amount_total": 49900,
      "currency": "usd",
      "customer_details": {
        "email": "test+hotline@youremail.com",
        "name": "TEST - Manual Payload",
        "phone": "+15551234567"
      },
      "metadata": {
        "product_type": "Standard Call"
      },
      "mode": "payment",
      "payment_status": "paid",
      "status": "complete",
      "success_url": "https://www.thecreativehotline.com",
      "created": 1740000000
    }
  },
  "livemode": false
}
```

**Notes:**
- `amount_total` is in cents ($499.00 = `49900`).
- The `metadata.product_type` field is only available if you configured it in Stripe (see Stripe setup). If not, the Extract Data node will get `null` for product_name.
- `customer_details.phone` may be null if the customer did not provide a phone number.

**curl example:**
```bash
curl -X POST \
  https://creativehotline.app.n8n.cloud/webhook-test/stripe-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_123456789",
    "object": "event",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_abc123def456",
        "object": "checkout.session",
        "amount_total": 49900,
        "currency": "usd",
        "customer_details": {
          "email": "test+hotline@youremail.com",
          "name": "TEST - Manual Payload",
          "phone": "+15551234567"
        },
        "metadata": {
          "product_type": "Standard Call"
        },
        "mode": "payment",
        "payment_status": "paid",
        "status": "complete",
        "created": 1740000000
      }
    },
    "livemode": false
  }'
```

### Sample Calendly invitee.created Payload

```json
{
  "event": "invitee.created",
  "payload": {
    "email": "test+hotline@youremail.com",
    "name": "TEST - Manual Payload",
    "uri": "https://calendly.com/scheduled_events/abc123/invitees/def456",
    "scheduled_event": {
      "uri": "https://api.calendly.com/scheduled_events/abc123",
      "name": "Creative Hotline Call",
      "start_time": "2026-02-25T18:00:00.000000Z",
      "end_time": "2026-02-25T18:45:00.000000Z",
      "status": "active",
      "location": {
        "type": "zoom",
        "join_url": "https://zoom.us/j/1234567890"
      }
    },
    "created_at": "2026-02-20T12:00:00.000000Z",
    "cancel_url": "https://calendly.com/cancellations/abc123",
    "reschedule_url": "https://calendly.com/reschedulings/abc123"
  }
}
```

**Notes:**
- The `email` field must match the email on the Payments DB record for WF2 to find and update it.
- `start_time` is what gets mapped to `call_date` in Notion. Set it to a realistic future date.

**curl example:**
```bash
curl -X POST \
  https://creativehotline.app.n8n.cloud/webhook-test/calendly-payments-update \
  -H "Content-Type: application/json" \
  -d '{
    "event": "invitee.created",
    "payload": {
      "email": "test+hotline@youremail.com",
      "name": "TEST - Manual Payload",
      "uri": "https://calendly.com/scheduled_events/abc123/invitees/def456",
      "scheduled_event": {
        "uri": "https://api.calendly.com/scheduled_events/abc123",
        "name": "Creative Hotline Call",
        "start_time": "2026-02-25T18:00:00.000000Z",
        "end_time": "2026-02-25T18:45:00.000000Z",
        "status": "active"
      },
      "created_at": "2026-02-20T12:00:00.000000Z",
      "cancel_url": "https://calendly.com/cancellations/abc123",
      "reschedule_url": "https://calendly.com/reschedulings/abc123"
    }
  }'
```

### Sample Tally Form Submission Payload

```json
{
  "eventId": "test-event-123",
  "eventType": "FORM_RESPONSE",
  "createdAt": "2026-02-20T12:30:00.000Z",
  "data": {
    "responseId": "test-response-456",
    "submissionId": "test-submission-789",
    "respondentId": "test-respondent-012",
    "formId": "b5W1JE",
    "formName": "Creative Hotline Pre-Call Intake",
    "createdAt": "2026-02-20T12:30:00.000Z",
    "fields": [
      {
        "key": "question_name",
        "label": "What's your name?",
        "type": "INPUT_TEXT",
        "value": "TEST - Manual Payload"
      },
      {
        "key": "question_email",
        "label": "Email address",
        "type": "INPUT_EMAIL",
        "value": "test+hotline@youremail.com"
      },
      {
        "key": "question_role",
        "label": "What's your role?",
        "type": "INPUT_TEXT",
        "value": "Founder & Creative Director"
      },
      {
        "key": "question_brand",
        "label": "What's the brand or project?",
        "type": "INPUT_TEXT",
        "value": "Test Brand Co — a direct-to-consumer wellness startup"
      },
      {
        "key": "question_website",
        "label": "Website or Instagram handle",
        "type": "INPUT_TEXT",
        "value": "https://www.testbrand.com"
      },
      {
        "key": "question_emergency",
        "label": "What's your creative emergency?",
        "type": "TEXTAREA",
        "value": "We launched six months ago and our brand identity feels generic. We look like every other wellness brand on Instagram. Need to figure out what makes us different and how to show it. Also considering a full rebrand but not sure if that is the right call or just a distraction."
      },
      {
        "key": "question_outcome",
        "label": "What do you want to walk away with?",
        "type": "INPUT_TEXT",
        "value": "A clear decision"
      },
      {
        "key": "question_tried",
        "label": "What have you already tried?",
        "type": "TEXTAREA",
        "value": "Hired a freelance designer for new logo concepts, did a brand survey with existing customers, looked at competitor audits. The logo concepts missed the mark and we are back to square one."
      },
      {
        "key": "question_deadline",
        "label": "Any deadlines we should know about?",
        "type": "INPUT_TEXT",
        "value": "Retail launch in April — need visual identity locked by end of March"
      },
      {
        "key": "question_constraints",
        "label": "Anything off the table or constraints?",
        "type": "INPUT_TEXT",
        "value": "Budget is capped at $5k for any follow-on design work. Cannot change the brand name (legal reasons)."
      }
    ]
  }
}
```

**Notes:**
- The `fields` array uses label-based fuzzy matching in the Extract Tally Data code node. The exact `label` text matters. If your actual Tally form uses different question wording, adjust the labels above to match.
- The `value` for "creative emergency" is intentionally long and realistic to test Claude's analysis quality.

**curl example:**
```bash
curl -X POST \
  https://creativehotline.app.n8n.cloud/webhook-test/tally-intake \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "test-event-123",
    "eventType": "FORM_RESPONSE",
    "createdAt": "2026-02-20T12:30:00.000Z",
    "data": {
      "responseId": "test-response-456",
      "formId": "b5W1JE",
      "formName": "Creative Hotline Pre-Call Intake",
      "createdAt": "2026-02-20T12:30:00.000Z",
      "fields": [
        {"key": "question_name", "label": "What'\''s your name?", "type": "INPUT_TEXT", "value": "TEST - Manual Payload"},
        {"key": "question_email", "label": "Email address", "type": "INPUT_EMAIL", "value": "test+hotline@youremail.com"},
        {"key": "question_role", "label": "What'\''s your role?", "type": "INPUT_TEXT", "value": "Founder"},
        {"key": "question_brand", "label": "What'\''s the brand or project?", "type": "INPUT_TEXT", "value": "Test Brand Co"},
        {"key": "question_website", "label": "Website or Instagram handle", "type": "INPUT_TEXT", "value": "https://www.testbrand.com"},
        {"key": "question_emergency", "label": "What'\''s your creative emergency?", "type": "TEXTAREA", "value": "Brand identity feels generic. Need differentiation strategy."},
        {"key": "question_outcome", "label": "What do you want to walk away with?", "type": "INPUT_TEXT", "value": "A clear decision"},
        {"key": "question_tried", "label": "What have you already tried?", "type": "TEXTAREA", "value": "Hired a freelancer, did customer surveys."},
        {"key": "question_deadline", "label": "Any deadlines we should know about?", "type": "INPUT_TEXT", "value": "End of March"},
        {"key": "question_constraints", "label": "Anything off the table or constraints?", "type": "INPUT_TEXT", "value": "Budget under $5k"}
      ]
    }
  }'
```

### Sample Laylo Subscriber Payload

```json
{
  "email": "test+laylo@youremail.com",
  "phoneNumber": "+15551234567",
  "productId": "laylo-product-abc123",
  "source": "instagram",
  "keyword": "BOOK",
  "subscribedAt": "2026-02-20T12:00:00.000Z"
}
```

**Notes:**
- The exact shape of the Laylo webhook payload depends on Laylo's current API. The fields above are based on the Extract Subscriber Data node config. If Laylo sends data in a different structure, adjust accordingly.
- `phoneNumber` may or may not be present depending on the subscriber.

**curl example:**
```bash
curl -X POST \
  https://creativehotline.app.n8n.cloud/webhook-test/8e422442-519e-4d42-8cb4-372d26b89edc \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test+laylo@youremail.com",
    "phoneNumber": "+15551234567",
    "productId": "laylo-product-abc123",
    "source": "instagram",
    "keyword": "BOOK",
    "subscribedAt": "2026-02-20T12:00:00.000Z"
  }'
```

---

## Post-Testing Cleanup

After testing, remove all test data so it does not interfere with real customer records or trigger follow-up emails.

### Notion cleanup

- [ ] Open the Payments DB and search for records with "TEST" or "SMOKETEST" in the Client Name
- [ ] Delete all test records (or archive them if you want to keep them for reference)
- [ ] Open the Intake DB and do the same
- [ ] Verify no test records remain that could trigger follow-up workflows (WF5, WF6, WF7)

### Stripe cleanup

- [ ] Switch Stripe back to **live mode** when you are done testing (toggle off "Test mode")
- [ ] Test transactions in Stripe test mode do not need to be deleted. They are isolated from live data.

### Calendly cleanup

- [ ] If you booked a real Calendly test appointment, cancel it so it does not show on your calendar
- [ ] Go to https://calendly.com/soscreativehotline and cancel any test bookings

### n8n cleanup

- [ ] Confirm all workflows you want active are toggled **Active** (WF1, WF2, WF3, WF4, WF5, WF6, WF7)
- [ ] Confirm WF8 and WF9 are toggled **Inactive**
- [ ] Check the n8n Executions log (sidebar) and review any failed executions from your test runs

### Email cleanup

- [ ] Delete or archive test emails from your inbox so they do not cause confusion later

---

## Quick Reference: All Workflow Status

| Workflow | ID | Should Be Active? | Trigger |
|----------|----|--------------------|---------|
| WF1: Stripe to Calendly | `AMSvlokEAFKvF_rncAFte` | Yes | Stripe webhook |
| WF2: Calendly to Payments | `Wt7paQoH2EICMtUG` | Yes | Calendly webhook |
| WF3: Tally to Claude | `ETKIfWOX-eciSJQQF7XX5` | Yes | Tally webhook |
| WF4: Laylo to Notion | `MfbV3-F5GiMwDs1KD5AoK` | Yes | Laylo webhook |
| WF5: Paid But Never Booked | `clCnlUW1zjatRHXE` | Yes | Daily 9am |
| WF6: Booked But No Intake | `Esq2SMGEy6LVHdIQ` | Yes | Daily 8am |
| WF7: Laylo Lead Nurture | `VYCokTqWGAFCa1j0` | Yes | Daily 10am |
| WF8: Calendly to Tally | `3ONZZbLdprx4nxGK7eEom` | **No (BROKEN)** | Deactivate |
| WF9: Post-Call Follow-Up | `9mct9GBz3R-EjTgQOZcPt` | **No (BROKEN)** | Deactivate |

---

## Quick Reference: Known Issues to Watch For During Testing

These are documented bugs that have not been fixed yet. If you encounter them during testing, they are expected. Refer to `docs/n8n-fix-configs.md` for exact fix instructions.

| Issue | Workflow | Severity | Fix Reference |
|-------|----------|----------|---------------|
| Product Purchased always null | WF1 | Critical | Fix 1.2 |
| Customer email from wrong sender | WF1 | Medium | Fix 1.1 |
| No duplicate payment guard | WF1 | Critical | Not yet specced |
| Email mismatch causes silent failure | WF2, WF3 | Critical | Not yet specced |
| Team notification shows "undefined" | WF2 | Medium | Fix 2.1 |
| Role field type mismatch | WF3 | Critical | Fix 3.1 |
| Desired Outcome field type mismatch | WF3 | Critical | Fix 3.2 |
| Upsell alert from wrong sender | WF3 | Medium | Fix 3.10 |
| Claude API key hardcoded | WF3 | Low | Fix 3.12 |
| Product Purchased type mismatch | WF4 | Critical | Fix 4.1 |
| Phone not written to Notion | WF4 | High | Fix 4.2 |
| Client Name blank (Laylo) | WF4 | High | Fix 4.3 |
| Tally URL is placeholder | WF6 | Critical | Fix 6.1 |
| Website URL is dead domain | WF7 | Medium | Fix 7.1 |
