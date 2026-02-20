# Workflow Rebuild Specifications

Complete rebuild specs for two broken n8n workflows. Both are currently active but completely non-functional — they must be deactivated first, then rebuilt from scratch.

---

## WF8 Rebuild: Calendly Booking → Tally Intake Send

**Current ID:** `3ONZZbLdprx4nxGK7eEom`
**Current Status:** Active but broken (queries wrong DB, calls Laylo API instead of email, empty configs)
**Recommendation:** Deactivate current. Build new workflow OR merge functionality into WF2.

### Option A: Merge into WF2 (Recommended)

WF2 (Calendly Booking → Payments Update, ID: `Wt7paQoH2EICMtUG`) already handles the Calendly webhook. Add a branch after "Update Payment Status" that sends the Tally form link email.

#### New nodes to add to WF2:

**Node: Send Tally Form Link** (emailSend v2.1)
- Position: After "Update Payment Status", before "Send an Email" (team notification)
- fromEmail: `hello@creativehotline.com`
- toEmail: `={{ $('Extract Booking Data').item.json.email }}`
- subject: `One quick step before your call`
- emailFormat: html
- HTML body: Use the Frankie-voice intake reminder template with link to https://tally.so/r/b5W1JE
- This sends the Tally link immediately after booking confirmation

This eliminates the need for WF8 entirely.

### Option B: Rebuild WF8 as Standalone

Use this approach if a separate workflow is preferred.

#### Node 1: Calendly Webhook

- Type: webhook v2.1
- httpMethod: POST
- path: `calendly-tally-send` (NEW path — do NOT reuse `calendly-booking`)
- Note: Configure Calendly to also send to this webhook, or better yet, use WF2's webhook and add a sub-workflow call

#### Node 2: Extract Data (set v3.4)

Assignments:
- email: `={{ $json.payload.email }}`
- name: `={{ $json.payload.name }}`
- call_date: `={{ $json.payload.scheduled_event.start_time }}`

#### Node 3: Send Tally Form Email (emailSend v2.1)

- fromEmail: `hello@creativehotline.com`
- toEmail: `={{ $json.email }}`
- subject: `One quick step before your call`
- emailFormat: html
- Body: Frankie-voice email with CTA to https://tally.so/r/b5W1JE

#### Node 4: Wait 24 Hours (wait v1)

- amount: 24
- unit: hours

#### Node 5: Check Intake Status (notion v2.2)

- resource: databasePage
- operation: getAll
- databaseId: `2f60e73ffadc806bbf5ddca2f5c256a3` (Intake DB)
- returnAll: false
- limit: 1
- filter: Email equals `={{ $('Extract Data').item.json.email }}` AND Intake Status equals "Submitted"

#### Node 6: Intake Not Submitted? (if v2)

- Condition: Check if result count is 0 (no intake found)
- True path: Send reminder
- False path: End (intake already submitted)

#### Node 7: Send Intake Reminder (emailSend v2.1)

- fromEmail: `hello@creativehotline.com`
- toEmail: `={{ $('Extract Data').item.json.email }}`
- subject: `Quick thing before our call`
- emailFormat: html
- Body: Frankie-voice reminder with CTA to https://tally.so/r/b5W1JE

#### Node 8: Alert Team (emailSend v2.1)

- fromEmail: `notifications@creativehotline.com`
- toEmail: `jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com`
- subject: `Missing Intake: {{ $('Extract Data').item.json.name }} (call tomorrow)`
- Body: Standard team notification format

#### Connections

```
Calendly Webhook → Extract Data → Send Tally Form Email → Wait 24 Hours → Check Intake Status → Intake Not Submitted?
  → YES: Send Intake Reminder → Alert Team
  → NO: (end)
```

---

## WF9 Rebuild: Post-Call Follow-Up

**Current ID:** `9mct9GBz3R-EjTgQOZcPt`
**Current Status:** Active but broken (empty filters, calls Laylo API, updates nothing)
**Recommendation:** Deactivate current. Build new workflow.

### Design

The post-call follow-up has two parts:

1. Thank-you email sent after call completes (status changes to "Call Complete")
2. Action plan delivery notification (when team marks "Action Plan Sent" checkbox)

Since n8n cannot easily watch for Notion property changes, use a scheduled approach like the other follow-up workflows.

### Node 1: Check Every 30 Minutes (scheduleTrigger v1.2)

- Cron: `*/30 * * * *` (every 30 minutes)
- Why 30 min instead of hourly: action plan delivery is time-sensitive (24hr promise)

### Node 2: Get All Intakes (notion v2.2)

- resource: databasePage
- operation: getAll
- databaseId: `2f60e73ffadc806bbf5ddca2f5c256a3` (Intake DB)
- returnAll: true

### Node 3: Filter Logic (code v2)

JavaScript code:

```javascript
const now = new Date();
const results = [];

for (const item of $input.all()) {
  const props = item.json.properties || item.json;

  const intakeStatus = props['Intake Status']?.select?.name || '';
  if (intakeStatus !== 'Submitted') continue;

  const actionPlanSent = props['Action Plan Sent']?.checkbox || false;

  // Get call date
  const callDate = props['Call Date']?.date?.start || null;
  if (!callDate) continue;

  const cDate = new Date(callDate);
  const hoursSinceCall = (now - cDate) / (60 * 60 * 1000);

  // Only process calls that happened in the last 48 hours
  if (hoursSinceCall < 0 || hoursSinceCall > 48) continue;

  const name = props['Client Name']?.title?.[0]?.plain_text || 'there';
  const email = props['Email']?.email || '';
  if (!email) continue;

  // Determine what action to take
  let action = null;
  if (hoursSinceCall >= 0.5 && hoursSinceCall < 2 && !actionPlanSent) {
    action = 'send_thank_you';
  } else if (actionPlanSent) {
    // Check if we already sent the action plan notification
    // Use a simple heuristic: if it was just marked (within last 30 min window)
    action = 'send_action_plan_notice';
  }

  if (!action) continue;

  results.push({
    json: {
      name,
      email,
      call_date: callDate,
      hours_since_call: Math.round(hoursSinceCall),
      action_plan_sent: actionPlanSent,
      action: action,
      page_id: item.json.id
    }
  });
}

return results.length > 0 ? results : [{ json: { _empty: true } }];
```

### Node 4: Any Results? (if v2)

- Condition: `!$json._empty` equals true
- True: Continue
- False: End

### Node 5: Route by Action (if v2)

- Condition: `$json.action` equals `send_thank_you`
- True: Send Thank You Email
- False: Send Action Plan Notice

### Node 6a: Send Thank You Email (emailSend v2.1)

- fromEmail: `hello@creativehotline.com`
- toEmail: `={{ $json.email }}`
- subject: `Your action plan is on the way`
- Body: Frankie-voice thank you, set expectations for 24hr delivery

### Node 6b: Send Action Plan Notice (emailSend v2.1)

- fromEmail: `hello@creativehotline.com`
- toEmail: `={{ $json.email }}`
- subject: `Your action plan just landed`
- Body: Frankie-voice delivery notification

### Node 7: Alert Team (emailSend v2.1)

- fromEmail: `notifications@creativehotline.com`
- toEmail: `jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com`
- subject: `Post-call email sent: {{ $json.name }} ({{ $json.action }})`

### Connections

```
Check Every 30 Min → Get All Intakes → Filter Logic → Any Results?
  → YES: Route by Action
    → send_thank_you: Send Thank You → Alert Team
    → send_action_plan_notice: Send Action Plan Notice → Alert Team
  → NO: (end)
```

### Important Caveat: Duplicate Send Prevention

This design has a problem: it will re-send the thank-you email every 30 minutes for 1.5 hours (between the 0.5hr and 2hr marks). To prevent this, you need a "Thank You Sent" tracking mechanism. Options:

1. **Add a "Thank You Sent" checkbox to the Intake DB** and check it in the filter (recommended)
2. Use a separate tracking DB
3. Change the approach: instead of scheduled, trigger off a manual status change (team sets "Call Complete" status)

**Recommendation:** Add a `Thank You Sent` checkbox property to the Intake DB and include it in the filter logic (skip if already true), then set it to true after sending.

---

## Implementation Order

1. Deactivate both current WF8 (`3ONZZbLdprx4nxGK7eEom`) and WF9 (`9mct9GBz3R-EjTgQOZcPt`)
2. Fix WF2 by adding Tally send node (Option A for WF8)
3. Build new WF9 from spec above
4. Test both in n8n test mode before activating
5. Activate new WF9
