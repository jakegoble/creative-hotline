# Consolidated WF5+6+7 Specification: Daily Follow-Ups

**Replaces:** WF5 (`clCnlUW1zjatRHXE`), WF6 (`Esq2SMGEy6LVHdIQ`), WF7 (`VYCokTqWGAFCa1j0`)
**Purpose:** Combine three daily follow-up workflows into one, reducing active workflow count from 7 to 5 (fits n8n Starter plan limit)
**Date:** February 20, 2026

---

## Why Consolidate

| Problem | Impact |
|---------|--------|
| n8n Starter plan allows 5 active workflows | Currently have 7 active (after WF8+WF9 disabled) |
| All 3 follow-ups use the same pattern | Schedule → Get All Payments → Code filter → Email + team alert |
| All 3 have the same dedup bug | No "sent" flag — spam customers daily |
| All 3 use generic email templates | Not Frankie voice |

One workflow with 3 filter branches solves all of this.

---

## Design

```
Daily 8am PT
  → Get All Payments (one Notion call, shared across all 3 checks)
  → Filter & Route (single Code node, 3 output branches)
    → Branch 1: Paid but never booked (48hrs+ old) → Send booking reminder → Mark sent
    → Branch 2: Booked but no intake (call within 24hrs) → Send intake reminder → Mark sent
    → Branch 3: Laylo lead nurture (3-7 days old) → Send nurture email → Mark sent
  → Team summary email (one email with all actions taken)
```

---

## Prerequisites — Notion Schema Changes

Add these checkbox properties to the **Payments DB** (`3030e73ffadc80bcb9dde15f51a9caf2`):

1. **Booking Reminder Sent** (checkbox) — dedup for WF5 branch
2. **Intake Reminder Sent** (checkbox) — dedup for WF6 branch
3. **Nurture Email Sent** (checkbox) — dedup for WF7 branch

---

## Node-by-Node Configuration

### Node 1: Daily 8am PT Schedule

```json
{
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "0 8 * * *"
        }
      ]
    }
  },
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.2,
  "name": "Daily 8am Check",
  "position": [250, 300]
}
```

Single trigger at 8am covers all 3 checks. Previously: 8am, 9am, 10am separately.

---

### Node 2: Get All Payments

```json
{
  "parameters": {
    "resource": "databasePage",
    "operation": "getAll",
    "databaseId": "3030e73ffadc80bcb9dde15f51a9caf2",
    "returnAll": true,
    "options": {}
  },
  "type": "n8n-nodes-base.notion",
  "typeVersion": 2.2,
  "name": "Get All Payments",
  "position": [470, 300],
  "credentials": {
    "notionApi": {
      "id": "rzufpLxiRLvvNq4Z",
      "name": "Notion API"
    }
  },
  "onError": "continueRegularOutput"
}
```

One Notion API call instead of three. This reduces API usage by ~66%.

---

### Node 3: Filter & Route (Code Node)

This is the core logic. One Code node, 3 output arrays.

```json
{
  "parameters": {
    "mode": "runOnceForAllItems",
    "language": "javaScript",
    "jsCode": "SEE BELOW"
  },
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "name": "Filter & Route",
  "position": [690, 300],
  "outputs": ["main", "main", "main"]
}
```

**JavaScript:**

```javascript
const now = new Date();
const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));
const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
const twentyFourHoursFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));

const bookingReminders = [];  // Output 0: Paid but never booked
const intakeReminders = [];   // Output 1: Booked but no intake
const nurtureEmails = [];     // Output 2: Laylo lead nurture

for (const item of $input.all()) {
  const props = item.json.properties || item.json;
  const status = props['Status']?.select?.name || '';
  const email = props['Email']?.email || '';
  if (!email) continue;

  const name = props['Client Name']?.title?.[0]?.plain_text || 'there';
  const pageId = item.json.id;

  // --- Branch 1: Paid But Never Booked ---
  if (status === 'Paid - Needs Booking') {
    // Check dedup
    const bookingReminderSent = props['Booking Reminder Sent']?.checkbox || false;
    if (bookingReminderSent) continue;

    // Check if payment is 48+ hours old
    const paymentDate = props['Payment Date']?.date?.start || null;
    if (!paymentDate) continue;
    const pDate = new Date(paymentDate);
    if (pDate >= fortyEightHoursAgo) continue;

    bookingReminders.push({
      json: {
        name, email, pageId,
        payment_date: paymentDate,
        hours_ago: Math.round((now - pDate) / (60 * 60 * 1000)),
        action: 'booking_reminder'
      }
    });
    continue;
  }

  // --- Branch 2: Booked But No Intake ---
  if (status === 'Booked - Needs Intake') {
    // Check dedup
    const intakeReminderSent = props['Intake Reminder Sent']?.checkbox || false;
    if (intakeReminderSent) continue;

    // Check if call is within 24 hours (and not past due by more than 2 hours)
    const callDate = props['Call Date']?.date?.start || null;
    if (!callDate) continue;
    const cDate = new Date(callDate);
    const hoursUntilCall = (cDate - now) / (60 * 60 * 1000);

    // Only send if call is within 24hrs AND not more than 2hrs past due
    if (hoursUntilCall > 24 || hoursUntilCall < -2) continue;

    intakeReminders.push({
      json: {
        name, email, pageId,
        call_date: callDate,
        hours_until_call: Math.round(hoursUntilCall),
        action: 'intake_reminder'
      }
    });
    continue;
  }

  // --- Branch 3: Laylo Lead Nurture ---
  if (status === 'Lead - Laylo') {
    // Check dedup
    const nurtureEmailSent = props['Nurture Email Sent']?.checkbox || false;
    if (nurtureEmailSent) continue;

    // Check if lead is 3-7 days old
    const createdTime = item.json.created_time || null;
    if (!createdTime) continue;
    const created = new Date(createdTime);
    if (created > threeDaysAgo || created < sevenDaysAgo) continue;

    const daysOld = Math.round((now - created) / (24 * 60 * 60 * 1000));

    nurtureEmails.push({
      json: {
        name, email, pageId,
        days_old: daysOld,
        action: 'lead_nurture'
      }
    });
    continue;
  }
}

// Return 3 output arrays (one per branch)
// Empty arrays get a sentinel so downstream IF nodes can check
const out0 = bookingReminders.length > 0 ? bookingReminders : [{ json: { _empty: true } }];
const out1 = intakeReminders.length > 0 ? intakeReminders : [{ json: { _empty: true } }];
const out2 = nurtureEmails.length > 0 ? nurtureEmails : [{ json: { _empty: true } }];

return [out0, out1, out2];
```

**n8n Note:** To enable 3 outputs on a Code node, set `outputs: ["main", "main", "main"]` in the node JSON, or configure via the UI by adding output branches.

---

### Branch 1: Booking Reminder

#### Node 4a: Has Booking Results?
```json
{
  "parameters": {
    "conditions": {
      "conditions": [{
        "leftValue": "={{ $json._empty }}",
        "rightValue": true,
        "operator": { "type": "boolean", "operation": "notTrue" }
      }]
    }
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "name": "Has Booking Results?",
  "position": [910, 100]
}
```

#### Node 5a: Send Booking Reminder (Frankie voice)
```json
{
  "parameters": {
    "fromEmail": "hello@creativehotline.com",
    "toEmail": "={{ $json.email }}",
    "subject": "Your call's waiting on you",
    "emailFormat": "html",
    "html": "USE TEMPLATE FROM email-templates-frankie.md #2 (Booking Reminder)"
  },
  "type": "n8n-nodes-base.emailSend",
  "typeVersion": 2.1,
  "name": "Send Booking Reminder",
  "credentials": { "smtp": { "id": "yJP76JoIqqqEPbQ9" } },
  "onError": "continueRegularOutput"
}
```

#### Node 6a: Mark Booking Reminder Sent
```json
{
  "parameters": {
    "resource": "databasePage",
    "operation": "update",
    "pageId": "={{ $json.pageId }}",
    "propertiesUi": {
      "propertyValues": [{
        "key": "Booking Reminder Sent",
        "type": "checkboxValue",
        "checkboxValue": true
      }]
    }
  },
  "type": "n8n-nodes-base.notion",
  "typeVersion": 2.2,
  "credentials": { "notionApi": { "id": "rzufpLxiRLvvNq4Z" } },
  "onError": "continueRegularOutput"
}
```

---

### Branch 2: Intake Reminder

#### Node 4b: Has Intake Results?
Same pattern as 4a.

#### Node 5b: Send Intake Reminder (Frankie voice)
```json
{
  "parameters": {
    "fromEmail": "hello@creativehotline.com",
    "toEmail": "={{ $json.email }}",
    "subject": "Quick thing before our call",
    "emailFormat": "html",
    "html": "USE TEMPLATE FROM email-templates-frankie.md #3 (Intake Reminder)"
  },
  "type": "n8n-nodes-base.emailSend",
  "typeVersion": 2.1,
  "credentials": { "smtp": { "id": "yJP76JoIqqqEPbQ9" } },
  "onError": "continueRegularOutput"
}
```

#### Node 6b: Mark Intake Reminder Sent
Same pattern as 6a, but sets "Intake Reminder Sent" checkbox.

---

### Branch 3: Lead Nurture

#### Node 4c: Has Nurture Results?
Same pattern as 4a.

#### Node 5c: Send Nurture Email (Frankie voice)
```json
{
  "parameters": {
    "fromEmail": "hello@creativehotline.com",
    "toEmail": "={{ $json.email }}",
    "subject": "Still thinking about it?",
    "emailFormat": "html",
    "html": "USE TEMPLATE FROM email-templates-frankie.md #4 (Lead Nurture) — IMPORTANT: CTA links to https://www.thecreativehotline.com NOT soscreativehotline.com"
  },
  "type": "n8n-nodes-base.emailSend",
  "typeVersion": 2.1,
  "credentials": { "smtp": { "id": "yJP76JoIqqqEPbQ9" } },
  "onError": "continueRegularOutput"
}
```

#### Node 6c: Mark Nurture Email Sent
Same pattern as 6a, but sets "Nurture Email Sent" checkbox.

---

### Node 7: Team Summary Email

All three branches converge here. One daily summary instead of separate alerts.

```json
{
  "parameters": {
    "fromEmail": "notifications@creativehotline.com",
    "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
    "subject": "Daily Follow-Up Summary",
    "emailFormat": "html",
    "html": "SEE TEMPLATE BELOW"
  },
  "type": "n8n-nodes-base.emailSend",
  "typeVersion": 2.1,
  "credentials": { "smtp": { "id": "yJP76JoIqqqEPbQ9" } },
  "onError": "continueRegularOutput"
}
```

**Team summary template concept:**
```
Subject: Daily Follow-Up Summary — [date]

Body:
## Booking Reminders Sent: [count]
- [name] ([email]) — paid [X]hrs ago

## Intake Reminders Sent: [count]
- [name] ([email]) — call in [X]hrs

## Lead Nurture Emails Sent: [count]
- [name] ([email]) — [X] days since signup

No action needed unless someone needs a personal follow-up.
```

**Note:** Implementing the team summary with data from all 3 branches requires a merge/aggregate approach in n8n. Simplest: use a Function node that collects results from all branches, or send 3 separate team alerts (one per branch, only if that branch had results). The 3-alert approach is simpler to build and still reduces from 6 team emails (current) to max 3.

---

## Connection Map

```
Daily 8am Check
  → Get All Payments
    → Filter & Route (3 outputs)
      → Output 0: Has Booking Results?
          → TRUE: Send Booking Reminder → Mark Sent → Alert Team (booking)
          → FALSE: (end)
      → Output 1: Has Intake Results?
          → TRUE: Send Intake Reminder → Mark Sent → Alert Team (intake)
          → FALSE: (end)
      → Output 2: Has Nurture Results?
          → TRUE: Send Nurture Email → Mark Sent → Alert Team (nurture)
          → FALSE: (end)
```

---

## Bugs Fixed by This Consolidation

| Current Bug | How It's Fixed |
|-------------|---------------|
| WF5: No dedup — spams daily | Booking Reminder Sent checkbox, checked before sending |
| WF6: No dedup — spams daily | Intake Reminder Sent checkbox |
| WF6: No lower cutoff — sends for past-due calls forever | Filter limits to calls no more than 2hrs past due |
| WF7: No dedup — sends same email 5 days in a row | Nurture Email Sent checkbox, one email per lead |
| WF7: "Learn More" links to dead soscreativehotline.com | Fixed to www.thecreativehotline.com |
| WF5/6/7: Generic email templates | Replaced with Frankie-voice templates |
| 3 workflows using 3 active slots | 1 workflow using 1 active slot |
| 3 separate Notion API calls daily | 1 shared call |

---

## Migration Steps

1. Add 3 checkbox properties to Payments DB (Booking/Intake/Nurture Reminder Sent)
2. Build consolidated workflow in n8n
3. Test each branch with appropriate test data
4. Deactivate WF5, WF6, WF7
5. Activate consolidated workflow
6. Verify one daily run processes all 3 branches

---

## Active Workflow Count After Consolidation

| # | Workflow | Status |
|---|---------|--------|
| 1 | WF1: Stripe → Calendly | Active |
| 2 | WF2: Calendly → Payments | Active |
| 3 | WF3: Tally → Claude | Active |
| 4 | WF4: Laylo → Notion | Active |
| 5 | **Daily Follow-Ups** (replaces WF5+6+7) | Active |
| — | WF8: Calendly → Tally (rebuild) | To be built |
| — | WF9: Post-Call Follow-Up (rebuild) | To be built |

**With consolidation: 5 active** — fits Starter plan limit exactly.

**Problem:** WF8 and WF9 rebuilds would push to 7. Options:
- Merge WF8 into WF2 (recommended — same Calendly trigger) → stays at 6
- Merge WF9 into the Daily Follow-Ups workflow as a 4th branch → stays at 5
- Upgrade to Pro plan (unlimited workflows)
