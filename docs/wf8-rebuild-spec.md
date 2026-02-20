# WF8 Rebuild Specification: Calendly Booking → Tally Intake Send

**Current ID:** `3ONZZbLdprx4nxGK7eEom`
**Current Status:** DISABLED (was completely broken — POSTed to api.laylo.com instead of sending email)
**Approach:** Standalone rebuild with new webhook path
**Date:** February 20, 2026

---

## Overview

When a customer books a Calendly call, this workflow:
1. Extracts their booking info
2. Finds their Payments DB record
3. Emails them a pre-filled Tally intake form link
4. Updates their Payments DB status to "Booked - Needs Intake"
5. Notifies the team

**Important:** WF2 (Calendly Booking → Payments Update) also fires on the same Calendly event. WF8 handles the Tally send + status update, while WF2 handles setting Call Date and Calendly Link. Consider merging into WF2 as a future optimization (see Alternative Approach at bottom).

---

## Node-by-Node Configuration

### Node 1: Calendly Webhook

```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "calendly-tally-send",
    "options": {}
  },
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "name": "Calendly Webhook",
  "position": [250, 300]
}
```

**Calendly setup:** Add this webhook URL to Calendly alongside the existing WF2 webhook:
`https://creativehotline.app.n8n.cloud/webhook/calendly-tally-send`

Subscribe to event: `invitee.created`

---

### Node 2: Extract Booking Data

```json
{
  "parameters": {
    "mode": "manual",
    "duplicateItem": false,
    "assignments": {
      "assignments": [
        {
          "id": "email",
          "name": "email",
          "value": "={{ $json.payload.email }}",
          "type": "string"
        },
        {
          "id": "name",
          "name": "name",
          "value": "={{ $json.payload.name }}",
          "type": "string"
        },
        {
          "id": "call_date",
          "name": "call_date",
          "value": "={{ $json.payload.scheduled_event.start_time }}",
          "type": "string"
        },
        {
          "id": "call_date_formatted",
          "name": "call_date_formatted",
          "value": "={{ DateTime.fromISO($json.payload.scheduled_event.start_time).toFormat('EEEE, MMMM d \\a\\t h:mm a') }}",
          "type": "string"
        }
      ]
    }
  },
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "name": "Extract Booking Data",
  "position": [470, 300]
}
```

---

### Node 3: Find Payment by Email

```json
{
  "parameters": {
    "resource": "databasePage",
    "operation": "getAll",
    "databaseId": "3030e73ffadc80bcb9dde15f51a9caf2",
    "returnAll": false,
    "limit": 1,
    "filterType": "none",
    "options": {}
  },
  "type": "n8n-nodes-base.notion",
  "typeVersion": 2.2,
  "name": "Get All Payments",
  "position": [690, 300],
  "credentials": {
    "notionApi": {
      "id": "rzufpLxiRLvvNq4Z",
      "name": "Notion API"
    }
  },
  "onError": "continueRegularOutput"
}
```

**Note:** We use `getAll` + Code node filter (next step) instead of Notion API filter for reliability, per project convention. Set `returnAll: true` for the Code node approach, or use `limit: 50` as a safety cap.

**Updated approach — use getAll + Code filter:**

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
  "position": [690, 300],
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

### Node 4: Filter Payment by Email (Code Node)

```json
{
  "parameters": {
    "jsCode": "const email = $('Extract Booking Data').item.json.email;\nconst results = [];\n\nfor (const item of $input.all()) {\n  const props = item.json.properties || item.json;\n  const recordEmail = props.Email?.email || props.email || '';\n  if (recordEmail.toLowerCase() === email.toLowerCase()) {\n    results.push(item);\n  }\n}\n\nif (results.length === 0) {\n  return [{ json: { _no_match: true, email: email } }];\n}\n\n// Return the most recent match (by created time)\nresults.sort((a, b) => {\n  const aTime = new Date(a.json.properties?.Created?.created_time || a.json.created_time || 0);\n  const bTime = new Date(b.json.properties?.Created?.created_time || b.json.created_time || 0);\n  return bTime - aTime;\n});\n\nreturn [results[0]];"
  },
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "name": "Filter by Email",
  "position": [910, 300]
}
```

---

### Node 5: Payment Found?

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
          "id": "check-match",
          "leftValue": "={{ $json._no_match }}",
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
  "name": "Payment Found?",
  "position": [1130, 300]
}
```

- **True (payment found):** Continue to Generate Tally Link
- **False (no match):** Send Team Alert about orphan booking

---

### Node 6: Generate Pre-Filled Tally Link

```json
{
  "parameters": {
    "mode": "manual",
    "duplicateItem": false,
    "assignments": {
      "assignments": [
        {
          "id": "tally_link",
          "name": "tally_link",
          "value": "={{ 'https://tally.so/r/b5W1JE?name=' + encodeURIComponent($('Extract Booking Data').item.json.name) + '&email=' + encodeURIComponent($('Extract Booking Data').item.json.email) }}",
          "type": "string"
        },
        {
          "id": "page_id",
          "name": "page_id",
          "value": "={{ $('Filter by Email').item.json.id }}",
          "type": "string"
        }
      ]
    }
  },
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "name": "Generate Tally Link",
  "position": [1350, 200]
}
```

---

### Node 7: Send Tally Intake Email

```json
{
  "parameters": {
    "fromEmail": "hello@creativehotline.com",
    "toEmail": "={{ $('Extract Booking Data').item.json.email }}",
    "subject": "One quick step before your call",
    "emailFormat": "html",
    "html": "",
    "options": {
      "appendAttribution": false
    }
  },
  "type": "n8n-nodes-base.emailSend",
  "typeVersion": 2.1,
  "name": "Send Tally Intake Email",
  "position": [1570, 200],
  "credentials": {
    "smtp": {
      "id": "yJP76JoIqqqEPbQ9",
      "name": "SMTP"
    }
  },
  "onError": "continueRegularOutput"
}
```

**Email HTML body** (Frankie voice):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>One quick step before your call</title>
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
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $('Extract Booking Data').item.json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Your call is locked in for <strong>{{ $('Extract Booking Data').item.json.call_date_formatted }}</strong>. Nice.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">One thing to do before then: fill out a quick intake form. It takes about 5 minutes. It's how we skip the warmup and get straight into the real work. The more context you give us, the sharper your action plan will be.</p>
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">Your name and email are already filled in — just answer the questions and hit submit.</p>
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #FF6B35;">
                    <a href="{{ $json.tally_link }}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Fill Out the Intake</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">See you on the call.</p>
              <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
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

### Node 8: Update Payments DB Status

```json
{
  "parameters": {
    "resource": "databasePage",
    "operation": "update",
    "pageId": "={{ $('Generate Tally Link').item.json.page_id }}",
    "propertiesUi": {
      "propertyValues": [
        {
          "key": "Status",
          "type": "selectValue",
          "selectValue": "Booked - Needs Intake"
        }
      ]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.notion",
  "typeVersion": 2.2,
  "name": "Update Status",
  "position": [1790, 200],
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

### Node 9: Team Notification

```json
{
  "parameters": {
    "fromEmail": "notifications@creativehotline.com",
    "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
    "subject": "=Booking + Intake sent: {{ $('Extract Booking Data').item.json.name }}",
    "emailFormat": "html",
    "html": "",
    "options": {
      "appendAttribution": false
    }
  },
  "type": "n8n-nodes-base.emailSend",
  "typeVersion": 2.1,
  "name": "Team Notification",
  "position": [2010, 200],
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
- EVENT_TYPE: `New Booking — Intake Form Sent`
- Data rows: Name, Email, Call Date, Tally Link, Status (→ Booked - Needs Intake)

---

### Node 10: No-Match Team Alert (False branch from "Payment Found?")

```json
{
  "parameters": {
    "fromEmail": "notifications@creativehotline.com",
    "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
    "subject": "=Orphan booking: {{ $('Extract Booking Data').item.json.name }} (no payment found)",
    "emailFormat": "html",
    "html": "",
    "options": {
      "appendAttribution": false
    }
  },
  "type": "n8n-nodes-base.emailSend",
  "typeVersion": 2.1,
  "name": "No Match Alert",
  "position": [1350, 450],
  "credentials": {
    "smtp": {
      "id": "yJP76JoIqqqEPbQ9",
      "name": "SMTP"
    }
  },
  "onError": "continueRegularOutput"
}
```

This handles the known email-mismatch issue: if a customer uses a different email for Stripe vs Calendly, the team gets alerted instead of silently failing.

---

## Connection Map

```
Calendly Webhook
    → Extract Booking Data
        → Get All Payments
            → Filter by Email
                → Payment Found?
                    → TRUE:  Generate Tally Link → Send Tally Intake Email → Update Status → Team Notification
                    → FALSE: No Match Alert (team notification about orphan booking)
```

---

## Error Handling

| Node | onError Setting | Rationale |
|------|----------------|-----------|
| Get All Payments | continueRegularOutput | If Notion is down, still attempt email via fallback |
| Filter by Email | (code node — use try/catch internally) | Graceful handling of malformed data |
| Send Tally Intake Email | continueRegularOutput | If email fails, still update DB and notify team |
| Update Status | continueRegularOutput | If DB update fails, email was already sent |
| Team Notification | continueRegularOutput | Non-critical — don't block pipeline |
| No Match Alert | continueRegularOutput | Non-critical |

---

## Conflict with WF2

WF2 (Calendly Booking → Payments Update) also triggers on `invitee.created`. Both workflows handle the same Calendly event but do different things:

| | WF2 | WF8 (this spec) |
|---|-----|-----------------|
| Sets Call Date | Yes | No |
| Sets Calendly Link | Yes | No |
| Updates Status | Yes (to "Booked - Needs Intake") | Yes (to "Booked - Needs Intake") |
| Sends Tally link | No | Yes |
| Sends team notification | Yes | Yes |

**Overlap:** Both update status to "Booked - Needs Intake" and both send team notifications. This is safe (idempotent status update, double notification is acceptable) but not ideal.

**Future optimization:** Merge WF8 into WF2 by adding the Tally email send after the status update node. This eliminates the duplicate webhook, duplicate Notion queries, and duplicate team notifications. See [workflow-rebuild-specs.md](workflow-rebuild-specs.md) Option A for details.

---

## Testing Checklist

- [ ] Activate in test mode
- [ ] Send test Calendly webhook payload (use n8n's "Listen for test event" + book a test call)
- [ ] Verify Extract Booking Data outputs correct name, email, call_date
- [ ] Verify Tally link is properly URL-encoded with name and email pre-filled
- [ ] Verify email arrives from hello@creativehotline.com with correct Tally link
- [ ] Verify Payments DB record status updated to "Booked - Needs Intake"
- [ ] Verify team notification arrives at all 3 addresses
- [ ] Test email-mismatch scenario: book with different email than Stripe payment
- [ ] Verify orphan booking alert fires when no payment match found
- [ ] Test with Tally link: confirm form pre-fills name and email correctly
