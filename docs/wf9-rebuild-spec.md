# WF9 Rebuild Specification: Post-Call Follow-Up

**Current ID:** `9mct9GBz3R-EjTgQOZcPt`
**Current Status:** DISABLED (was broken — empty Notion filters returned ALL records, `.replace` error on undefined Call Date, ran every hour burning executions)
**Approach:** Complete rebuild with daily schedule
**Date:** February 20, 2026

---

## Overview

After a call is completed, this workflow:
1. Finds customers whose call happened today and status is "Call Complete"
2. Sends a thank-you email with action plan timeline
3. Notifies the team
4. Updates the Payments DB status to "Follow-Up Sent"

**Root cause of original failure:** The Notion filter had empty conditions, returning ALL Intake DB records. The code then called `.replace()` on the Call Date field, which was undefined for records without a date. This threw `Cannot read properties of undefined (reading 'replace')` on every hourly run.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Trigger | Daily at 6pm PT (not hourly) | Calls are daytime; 6pm catch gives team time to mark "Call Complete" |
| Database | Payments DB (not Intake DB) | Payments DB is the pipeline source of truth for status |
| Filtering | Code node (not Notion API filter) | More reliable for date math, per project convention |
| Dedup | "Thank You Sent" checkbox + filter | Prevents re-sending on subsequent daily runs |
| Status update | "Follow-Up Sent" (new status) | Clear pipeline progression beyond "Call Complete" |

---

## Prerequisites — Notion Schema Changes

Before building this workflow, add these to the Payments DB:

1. **New Status option:** Add `"Follow-Up Sent"` to the Status select property
2. **New property:** Add `Thank You Sent` (checkbox type) to Payments DB

These prevent duplicate sends and enable clean pipeline tracking.

---

## Node-by-Node Configuration

### Node 1: Daily Schedule Trigger

```json
{
  "parameters": {
    "rule": {
      "interval": [
        {
          "triggerAtHour": 18,
          "triggerAtMinute": 0
        }
      ]
    }
  },
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.2,
  "name": "Daily 6pm PT",
  "position": [250, 300]
}
```

**Note:** n8n Cloud timezone must be set to America/Los_Angeles (Pacific Time), or use a cron expression adjusted to UTC: `0 2 * * *` (2am UTC = 6pm PT).

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

---

### Node 3: Filter — Call Complete Today, Not Yet Thanked

This is the critical node. The original workflow crashed here because it didn't check for undefined Call Date.

```json
{
  "parameters": {
    "jsCode": "const now = new Date();\nconst todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD\nconst results = [];\n\nfor (const item of $input.all()) {\n  const props = item.json.properties || item.json;\n\n  // Get status — MUST be 'Call Complete'\n  const status = props.Status?.select?.name || props.Status || '';\n  if (status !== 'Call Complete') continue;\n\n  // CRITICAL: Check that Call Date exists before accessing it\n  // This is what caused the original .replace() crash\n  const callDateObj = props['Call Date']?.date;\n  if (!callDateObj || !callDateObj.start) continue;\n\n  const callDateStr = callDateObj.start.split('T')[0]; // normalize to YYYY-MM-DD\n\n  // Only process calls from today\n  if (callDateStr !== todayStr) continue;\n\n  // Check dedup: skip if thank-you already sent\n  const thankYouSent = props['Thank You Sent']?.checkbox || false;\n  if (thankYouSent) continue;\n\n  // Extract customer data\n  const name = props['Client Name']?.title?.[0]?.plain_text || 'there';\n  const email = props.Email?.email || '';\n  if (!email) continue;\n\n  results.push({\n    json: {\n      name: name,\n      email: email,\n      call_date: callDateStr,\n      status: status,\n      page_id: item.json.id\n    }\n  });\n}\n\nif (results.length === 0) {\n  return [{ json: { _empty: true } }];\n}\n\nreturn results;"
  },
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "name": "Filter Call Complete Today",
  "position": [690, 300]
}
```

**Key safeguards:**
- Line `if (!callDateObj || !callDateObj.start) continue;` — prevents the `.replace` crash
- `thankYouSent` check — prevents duplicate sends on subsequent runs
- `callDateStr !== todayStr` — only processes today's calls

---

### Node 4: Any Results?

```json
{
  "parameters": {
    "conditions": {
      "options": {
        "caseSensitive": true,
        "leftValue": "",
        "typeValidation": "strict"
      },
      "conditions": [
        {
          "id": "has-results",
          "leftValue": "={{ $json._empty }}",
          "rightValue": true,
          "operator": {
            "type": "boolean",
            "operation": "notTrue"
          }
        }
      ],
      "combinator": "and"
    }
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "name": "Any Results?",
  "position": [910, 300]
}
```

- **True:** Continue to send emails
- **False:** End (no calls completed today, or all already thanked)

---

### Node 5: Send Thank-You Email

```json
{
  "parameters": {
    "fromEmail": "hello@creativehotline.com",
    "toEmail": "={{ $json.email }}",
    "subject": "Your action plan is on the way",
    "emailFormat": "html",
    "html": "",
    "options": {
      "appendAttribution": false
    }
  },
  "type": "n8n-nodes-base.emailSend",
  "typeVersion": 2.1,
  "name": "Send Thank You Email",
  "position": [1130, 200],
  "credentials": {
    "smtp": {
      "id": "yJP76JoIqqqEPbQ9",
      "name": "SMTP"
    }
  },
  "onError": "continueRegularOutput"
}
```

**Email HTML body** (Frankie voice — use template from [email-templates-frankie.md](email-templates-frankie.md) #5 "Post-Call Thank You"):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your action plan is on the way</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. That was a good call. Appreciate you being open and bringing real questions to the table — that's how the best sessions happen.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Your custom action plan is being put together now. You'll have it in your inbox within 24 hours. It'll lay out the specific next steps we talked through, in the order that makes sense, so you can move on it right away.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">In the meantime, if anything from the call is already rattling around in your head, write it down. Fresh instincts are worth keeping.</p>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Talk soon,<br>Frankie</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.5;">The Creative Hotline<br>Questions? Just reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

### Node 6: Mark Thank You Sent

```json
{
  "parameters": {
    "resource": "databasePage",
    "operation": "update",
    "pageId": "={{ $json.page_id }}",
    "propertiesUi": {
      "propertyValues": [
        {
          "key": "Thank You Sent",
          "type": "checkboxValue",
          "checkboxValue": true
        }
      ]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.notion",
  "typeVersion": 2.2,
  "name": "Mark Thank You Sent",
  "position": [1350, 200],
  "credentials": {
    "notionApi": {
      "id": "rzufpLxiRLvvNq4Z",
      "name": "Notion API"
    }
  },
  "onError": "continueRegularOutput"
}
```

---

### Node 7: Update Status to Follow-Up Sent

```json
{
  "parameters": {
    "resource": "databasePage",
    "operation": "update",
    "pageId": "={{ $json.page_id }}",
    "propertiesUi": {
      "propertyValues": [
        {
          "key": "Status",
          "type": "selectValue",
          "selectValue": "Follow-Up Sent"
        }
      ]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.notion",
  "typeVersion": 2.2,
  "name": "Update Status",
  "position": [1570, 200],
  "credentials": {
    "notionApi": {
      "id": "rzufpLxiRLvvNq4Z",
      "name": "Notion API"
    }
  },
  "onError": "continueRegularOutput"
}
```

**Note:** You must first add "Follow-Up Sent" as an option in the Payments DB Status select property before this node will work.

---

### Node 8: Team Notification

```json
{
  "parameters": {
    "fromEmail": "notifications@creativehotline.com",
    "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
    "subject": "=Post-call thank you sent: {{ $json.name }}",
    "emailFormat": "html",
    "html": "",
    "options": {
      "appendAttribution": false
    }
  },
  "type": "n8n-nodes-base.emailSend",
  "typeVersion": 2.1,
  "name": "Team Notification",
  "position": [1790, 200],
  "credentials": {
    "smtp": {
      "id": "yJP76JoIqqqEPbQ9",
      "name": "SMTP"
    }
  },
  "onError": "continueRegularOutput"
}
```

**Team notification HTML body:** Use the standard team notification template from [email-templates-frankie.md](email-templates-frankie.md) with:
- EVENT_TYPE: `Post-Call Thank You Sent`
- Data rows: Name, Email, Call Date, Status (→ Follow-Up Sent)
- Additional context: "Action plan due within 24 hours."

---

## Connection Map

```
Daily 6pm PT
    → Get All Payments
        → Filter Call Complete Today
            → Any Results?
                → TRUE:  Send Thank You Email → Mark Thank You Sent → Update Status → Team Notification
                → FALSE: (end — no action needed)
```

---

## Error Handling

| Node | onError Setting | Rationale |
|------|----------------|-----------|
| Get All Payments | continueRegularOutput | If Notion is down, workflow ends gracefully (empty results) |
| Send Thank You Email | continueRegularOutput | If email fails, still update DB to prevent retry spam |
| Mark Thank You Sent | continueRegularOutput | Critical for dedup — but if it fails, the filter will re-match tomorrow |
| Update Status | continueRegularOutput | Non-blocking — status update is informational |
| Team Notification | continueRegularOutput | Non-critical |

---

## What This Does NOT Handle

This spec covers the **thank-you email** (part 1 of post-call follow-up). The **action plan delivery notification** (part 2) is a separate concern:

- When the team manually sends the action plan and checks "Action Plan Sent" in the Intake DB, a separate notification should fire
- This requires either a second scheduled workflow or a Notion webhook integration
- Recommend building this as a separate WF10 or extending WF9 with a second filter branch after launch stabilizes

---

## Notion Schema Changes Required

### Payments DB — Add These Before Building

1. **Status select option:** Add `"Follow-Up Sent"` after `"Call Complete"` in the Status property options

   Full status pipeline becomes:
   ```
   Lead - Laylo → Paid - Needs Booking → Booked - Needs Intake → Intake Complete → Ready for Call → Call Complete → Follow-Up Sent
   ```

2. **Thank You Sent checkbox:** Add new property `Thank You Sent` (type: checkbox)
   - Default: unchecked
   - Set to checked by this workflow after sending the thank-you email
   - Used as dedup filter to prevent re-sends

---

## Testing Checklist

- [ ] Add "Follow-Up Sent" status option to Payments DB
- [ ] Add "Thank You Sent" checkbox to Payments DB
- [ ] Build workflow in n8n, activate in test mode
- [ ] Create a test Payments record: Status = "Call Complete", Call Date = today, Thank You Sent = unchecked
- [ ] Run workflow manually (click "Test Workflow")
- [ ] Verify filter correctly identifies the test record
- [ ] Verify email arrives from hello@creativehotline.com
- [ ] Verify "Thank You Sent" checkbox is now checked
- [ ] Verify Status updated to "Follow-Up Sent"
- [ ] Verify team notification arrives
- [ ] Run workflow again — verify the same record is NOT processed again (dedup works)
- [ ] Test with record that has NO Call Date — verify no crash (the original bug)
- [ ] Test with record where Status != "Call Complete" — verify it's skipped
- [ ] Test with Call Date = yesterday — verify it's skipped
