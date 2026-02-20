# End-to-End Test Payloads

Exact JSON payloads for testing each n8n webhook in test mode. Copy-paste into n8n's "Test Workflow" → "Send Test Data" or use curl.

**Date:** February 20, 2026

---

## How to Use These

### Option A: n8n Test Mode (Recommended)
1. Open the workflow in n8n
2. Click "Test Workflow"
3. The webhook node will say "Listening for test event..."
4. Use curl (below) or Postman to send the test payload
5. Watch the execution trace for each node

### Option B: curl from Terminal
Each payload below includes a curl command. Replace `webhook-test` with `webhook` for production (NOT recommended for testing).

---

## Test Payload 1: Stripe Purchase (WF1)

Simulates a Stripe `checkout.session.completed` event.

```bash
curl -X POST https://creativehotline.app.n8n.cloud/webhook-test/stripe-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_END_TO_END_001",
        "customer_details": {
          "name": "Test Customer",
          "email": "test@example.com",
          "phone": "+13105551234"
        },
        "amount_total": 49900,
        "metadata": {
          "product_name": "Standard Call",
          "lead_source": "Direct"
        },
        "line_items": {
          "data": [
            {
              "description": "Standard Call"
            }
          ]
        }
      }
    }
  }'
```

**Expected result:**
- Notion Payments DB: New record "Test Customer", $499, Status="Paid - Needs Booking", Product="Standard Call"
- Email to test@example.com: Calendly booking link
- Email to team: Payment notification
- Laylo: SMS subscribe attempt (will fail on test data — that's OK)

**What to verify:**
- [ ] Record created in Payments DB with correct fields
- [ ] Product Purchased is "Standard Call" (not null)
- [ ] Customer email received
- [ ] Team notification received
- [ ] No duplicate record if you send the same payload again (after dedup fix)

---

## Test Payload 2: Calendly Booking (WF2)

Simulates a Calendly `invitee.created` event.

```bash
curl -X POST https://creativehotline.app.n8n.cloud/webhook-test/calendly-payments-update \
  -H "Content-Type: application/json" \
  -d '{
    "event": "invitee.created",
    "payload": {
      "email": "test@example.com",
      "name": "Test Customer",
      "uri": "https://calendly.com/soscreativehotline/creative-hotline-call/invitees/test123",
      "scheduled_event": {
        "start_time": "2026-02-25T18:00:00.000Z",
        "end_time": "2026-02-25T18:45:00.000Z",
        "name": "Creative Hotline Call",
        "uri": "https://calendly.com/soscreativehotline/creative-hotline-call/test456"
      }
    }
  }'
```

**Expected result:**
- Payments DB record for test@example.com updated: Call Date = Feb 25, Calendly Link set, Status → "Booked - Needs Intake"
- Team notification email

**What to verify:**
- [ ] Existing Payment record found by email
- [ ] Call Date set correctly
- [ ] Calendly Link populated
- [ ] Status changed to "Booked - Needs Intake"
- [ ] Team notification received

**Edge case to test:** Send with a different email (e.g., `testdifferent@example.com`) to verify the email-mismatch behavior. Currently silently fails — after WF8 rebuild, should send orphan alert.

---

## Test Payload 3: Tally Intake (WF3)

Simulates a Tally form submission.

```bash
curl -X POST https://creativehotline.app.n8n.cloud/webhook-test/tally-intake \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "test-event-001",
    "eventType": "FORM_RESPONSE",
    "createdAt": "2026-02-20T10:00:00.000Z",
    "data": {
      "responseId": "test-response-001",
      "submissionId": "test-sub-001",
      "respondentId": "test-respondent-001",
      "formId": "b5W1JE",
      "formName": "Creative Hotline Intake",
      "createdAt": "2026-02-20T10:00:00.000Z",
      "fields": [
        {
          "key": "question_name",
          "label": "Your Name",
          "type": "INPUT_TEXT",
          "value": "Test Customer"
        },
        {
          "key": "question_email",
          "label": "Email Address",
          "type": "INPUT_EMAIL",
          "value": "test@example.com"
        },
        {
          "key": "question_role",
          "label": "Your Role / Title",
          "type": "INPUT_TEXT",
          "value": "Creative Director"
        },
        {
          "key": "question_brand",
          "label": "Brand / Company Name",
          "type": "INPUT_TEXT",
          "value": "Test Brand Co."
        },
        {
          "key": "question_website",
          "label": "Website or Instagram",
          "type": "INPUT_TEXT",
          "value": "https://testbrand.co"
        },
        {
          "key": "question_emergency",
          "label": "Creative Emergency",
          "type": "TEXTAREA",
          "value": "We are rebranding and cannot decide between two directions. One feels safe but boring, the other feels risky but exciting. Launch is in 3 weeks and we are stuck."
        },
        {
          "key": "question_outcome",
          "label": "Desired Outcome",
          "type": "CHECKBOXES",
          "value": "A clear decision, A short action plan"
        },
        {
          "key": "question_tried",
          "label": "What have you tried so far?",
          "type": "TEXTAREA",
          "value": "Internal team brainstorms, hired a freelance designer who gave us 3 options but no direction, polled our audience on Instagram."
        },
        {
          "key": "question_deadline",
          "label": "Any deadlines?",
          "type": "INPUT_TEXT",
          "value": "Launch is March 15th. Need decision by March 1st."
        },
        {
          "key": "question_constraints",
          "label": "Anything to avoid or constraints?",
          "type": "TEXTAREA",
          "value": "Cannot change our name. Budget for implementation is under $5k. Need to keep existing customers happy."
        }
      ]
    }
  }'
```

**Expected result:**
- Intake DB: New record with all fields populated
- Claude API call: Returns AI summary + upsell detection
- Intake record updated with AI Intake Summary
- Payments DB: Found by email, Linked Intake set, Status → "Intake Complete"
- Team notification + possible upsell alert

**What to verify:**
- [ ] All intake fields populated correctly (especially Role as rich_text, Desired Outcome as multi_select)
- [ ] Claude API returns a summary (check the HTTP Request node output)
- [ ] AI Intake Summary written back to Notion
- [ ] Linked Intake relation set on Payments record
- [ ] Payments status updated to "Intake Complete"
- [ ] Team notification received
- [ ] Upsell check: Does Claude flag this as upsell opportunity?

---

## Test Payload 4: Laylo Subscriber (WF4)

Simulates a Laylo webhook for an Instagram DM keyword signup.

```bash
curl -X POST https://creativehotline.app.n8n.cloud/webhook-test/8e422442-519e-4d42-8cb4-372d26b89edc \
  -H "Content-Type: application/json" \
  -d '{
    "email": "igfollower@example.com",
    "phoneNumber": "+13105559876",
    "productId": "laylo_drop_123",
    "subscribedAt": "2026-02-20T15:00:00.000Z"
  }'
```

**Expected result:**
- Payments DB: New record, Email=igfollower@example.com, Status="Lead - Laylo", Product="Laylo SMS Signup"
- Team notification email

**What to verify:**
- [ ] Record created with correct email
- [ ] Status is "Lead - Laylo"
- [ ] Phone number is populated (currently broken — phoneValue not mapped)
- [ ] Client Name field (currently blank — expected, Laylo doesn't provide name)
- [ ] Team notification received

**Known issues that will show up:**
- Client Name will be blank (Laylo doesn't provide name — need fallback to email prefix)
- Phone may not be saved (phoneValue mapping issue in WF4)

---

## Test Payload 5: Calendly → Tally Send (WF8 — After Rebuild)

```bash
curl -X POST https://creativehotline.app.n8n.cloud/webhook-test/calendly-tally-send \
  -H "Content-Type: application/json" \
  -d '{
    "event": "invitee.created",
    "payload": {
      "email": "test@example.com",
      "name": "Test Customer",
      "uri": "https://calendly.com/soscreativehotline/creative-hotline-call/invitees/test789",
      "scheduled_event": {
        "start_time": "2026-02-25T18:00:00.000Z",
        "end_time": "2026-02-25T18:45:00.000Z"
      }
    }
  }'
```

**Expected result:**
- Customer email with pre-filled Tally link
- Payments DB status → "Booked - Needs Intake"
- Team notification

---

## Full Pipeline Test Sequence

Run these in order to simulate a complete customer journey:

| Step | Payload | Wait | What to Check |
|------|---------|------|--------------|
| 1 | Stripe Purchase (Payload 1) | — | Payment record created, Calendly email sent |
| 2 | Calendly Booking (Payload 2) | — | Payment updated with Call Date, status → "Booked - Needs Intake" |
| 3 | Calendly → Tally Send (Payload 5) | — | Tally intake email sent to customer |
| 4 | Tally Intake (Payload 3) | — | Intake record created, Claude analysis, linked to payment, status → "Intake Complete" |
| 5 | Manually set Status → "Call Complete" + Call Date → today | Wait for 6pm | WF9 sends thank-you email, status → "Follow-Up Sent" |

**Between steps:** Check Notion to verify each status change propagated correctly.

**After full run:** Both databases should show a complete linked record with all fields populated.

---

## Cleanup After Testing

After running end-to-end tests:

1. Delete test records from Payments DB (filter by email = "test@example.com")
2. Delete test records from Intake DB
3. Reset any checkbox flags (Booking/Intake/Nurture Reminder Sent)
4. Check that Laylo didn't actually subscribe the test email (may need manual removal)
