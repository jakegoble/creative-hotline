# n8n Workflow Backup / Snapshot — Creative Hotline

**Backup Date:** 2026-02-20
**Purpose:** Pre-trial-expiry backup of all 7 active Creative Hotline n8n workflows
**n8n Instance:** https://creativehotline.app.n8n.cloud
**Trial Expiry:** ~2026-02-23 (upgrade to Starter plan ASAP)
**Backup Author:** Claude Code agent

> This document captures the complete configuration of every active n8n workflow at the node level,
> including trigger types, webhook URLs, node parameters, connection maps, credential references,
> and known issues. It is intended as a disaster-recovery reference: if the n8n trial expires and
> workflow data is lost, every workflow can be reconstructed from this file.

---

## Table of Contents

1. [WF1: Stripe Purchase to Calendly](#wf1-creative-hotline---stripe-purchase-to-calendly)
2. [WF2: Calendly Booking to Payments Update](#wf2-creative-hotline---calendly-booking-to-payments-update)
3. [WF3: Tally Intake to Claude Analysis](#wf3-creative-hotline---tally-intake-to-claude)
4. [WF4: Laylo New Subscriber to Notion](#wf4-creative-hotline---laylo-new-subscriber-to-notion)
5. [WF5: Follow Up — Paid But Never Booked](#wf5-creative-hotline---follow-up-paid-but-never-booked)
6. [WF6: Follow Up — Booked But No Intake](#wf6-creative-hotline---follow-up-booked-but-no-intake)
7. [WF7: Follow Up — Laylo Lead Nurture](#wf7-creative-hotline---follow-up-laylo-lead-nurture)
8. [Credential Reference](#credential-reference)
9. [Notion Database Schemas](#notion-database-schemas)
10. [Consolidated Issue Table](#consolidated-issue-table)

---

## WF1: Creative Hotline - Stripe Purchase to Calendly

| Field | Value |
|-------|-------|
| **Workflow ID** | `AMSvlokEAFKvF_rncAFte` |
| **Active** | `true` |
| **Trigger** | Stripe webhook (`checkout.session.completed`) |
| **Webhook Path** | `/webhook/stripe-checkout` |
| **Production URL** | `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout` |
| **Test URL** | `https://creativehotline.app.n8n.cloud/webhook-test/stripe-checkout` |

### Node List

| # | Node Name | Node Type | Version | Position | Error Handling |
|---|-----------|-----------|---------|----------|----------------|
| 1 | Webhook | `n8n-nodes-base.webhook` | 2.1 | — | Responds immediately |
| 2 | Extract Data | `n8n-nodes-base.set` | 1 | — | — |
| 3 | Create Notion Lead | `n8n-nodes-base.notion` | 2 | — | `continueRegularOutput` |
| 4 | Has Phone Number? | `n8n-nodes-base.if` | 1 | — | — |
| 5 | Laylo Subscribe (SMS) | `n8n-nodes-base.httpRequest` | 4 | — | `continueRegularOutput` |
| 6 | Laylo Subscribe (Email Only) | `n8n-nodes-base.httpRequest` | 4 | — | `continueRegularOutput` |
| 7 | Wait 10 Seconds | `n8n-nodes-base.wait` | 1 | — | — |
| 8 | Send Calendly Link | `n8n-nodes-base.emailSend` | 2.1 | — | — |
| 9 | Send an Email (Team) | `n8n-nodes-base.emailSend` | 2.1 | — | — |

### Connection Map

```
Webhook
  └─→ Extract Data
        └─→ Create Notion Lead
              └─→ Has Phone Number?
                    ├─ [true] → Laylo Subscribe (SMS)
                    │                └─→ Wait 10 Seconds
                    │                      └─→ Send Calendly Link
                    │                            └─→ Send an Email (Team)
                    └─ [false] → Laylo Subscribe (Email Only)
                                     └─→ Wait 10 Seconds
                                           └─→ Send Calendly Link
                                                 └─→ Send an Email (Team)
```

Note: Both branches of the If node converge on the same Wait / Send Calendly Link / Team Email nodes.

### Node Parameters

#### Node 1: Webhook

```json
{
  "httpMethod": "POST",
  "path": "stripe-checkout",
  "authentication": "none",
  "respondMode": "responseNode",
  "options": {}
}
```

#### Node 2: Extract Data

```json
{
  "mode": "manual",
  "assignments": [
    {
      "name": "name",
      "value": "={{ $json.body.data.object.customer_details.name }}",
      "type": "string"
    },
    {
      "name": "email",
      "value": "={{ $json.body.data.object.customer_details.email }}",
      "type": "string"
    },
    {
      "name": "phone",
      "value": "={{ $json.body.data.object.customer_details.phone }}",
      "type": "string"
    },
    {
      "name": "product_name",
      "value": "={{ $json.body.data.object.line_items.data[0].description }}",
      "type": "string"
    },
    {
      "name": "amount",
      "value": "={{ $json.body.data.object.amount_total / 100 }}",
      "type": "number"
    },
    {
      "name": "stripe_session_id",
      "value": "={{ $json.body.data.object.id }}",
      "type": "string"
    }
  ]
}
```

**ISSUE:** `product_name` reads from `line_items.data[0].description` but the Stripe `checkout.session.completed` webhook does NOT include `line_items` by default. This value is always null.

#### Node 3: Create Notion Lead

```json
{
  "resource": "databasePage",
  "operation": "create",
  "databaseId": "3030e73f-fadc-80bc-b9dd-e15f51a9caf2",
  "title": "={{ $json.name }}",
  "propertiesUi": {
    "propertyValues": [
      {
        "key": "Email|email",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "emailValue": "={{ $json.email }}"
      },
      {
        "key": "Phone|phone_number",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "phoneValue": "={{ $json.phone }}"
      },
      {
        "key": "Payment Amount|number",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "numberValue": "={{ $json.amount }}"
      },
      {
        "key": "Product Purchased|select",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "selectValue": "={{ $json.product_name }}"
      },
      {
        "key": "Stripe Session ID|rich_text",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "textContent": "={{ $json.stripe_session_id }}"
      },
      {
        "key": "Status|select",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "selectValue": "Paid - Needs Booking"
      },
      {
        "key": "Payment Date|date",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "dateValue": "={{ $now.toISO() }}"
      }
    ]
  },
  "options": {},
  "onError": "continueRegularOutput"
}
```

**Credential:** Notion API (`rzufpLxiRLvvNq4Z`)

#### Node 4: Has Phone Number?

```json
{
  "conditions": {
    "string": [
      {
        "value1": "={{ $json.phone }}",
        "operation": "isNotEmpty"
      }
    ]
  }
}
```

#### Node 5: Laylo Subscribe (SMS)

```json
{
  "method": "POST",
  "url": "https://laylo.com/api/graphql",
  "authentication": "predefinedCredentialType",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      { "name": "Content-Type", "value": "application/json" }
    ]
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {
        "name": "query",
        "value": "mutation { subscribe(input: { email: \"{{ $('Extract Data').item.json.email }}\", phone: \"{{ $('Extract Data').item.json.phone }}\", productId: \"YOUR_LAYLO_PRODUCT_ID\" }) { success } }"
      }
    ]
  },
  "options": {},
  "onError": "continueRegularOutput"
}
```

**Credential:** HTTP Header Auth (Laylo)

#### Node 6: Laylo Subscribe (Email Only)

Same as Node 5 but without `phone` in the GraphQL mutation.

```json
{
  "method": "POST",
  "url": "https://laylo.com/api/graphql",
  "authentication": "predefinedCredentialType",
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {
        "name": "query",
        "value": "mutation { subscribe(input: { email: \"{{ $('Extract Data').item.json.email }}\", productId: \"YOUR_LAYLO_PRODUCT_ID\" }) { success } }"
      }
    ]
  },
  "options": {},
  "onError": "continueRegularOutput"
}
```

**Credential:** HTTP Header Auth (Laylo)

#### Node 7: Wait 10 Seconds

```json
{
  "amount": 10,
  "unit": "seconds"
}
```

#### Node 8: Send Calendly Link

```json
{
  "fromEmail": "jake@radanimal.co",
  "toEmail": "={{ $('Extract Data').item.json.email }}",
  "subject": "Your Creative Hotline Call — Book Your Session Now!",
  "emailFormat": "html",
  "html": "<HTML email template with Calendly link: https://calendly.com/soscreativehotline/creative-hotline-call — generic template, NOT Frankie voice>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

**ISSUES:**
- `fromEmail` is `jake@radanimal.ro` — should be `hello@creativehotline.com`
- Subject line uses emoji and old copy — should be `Let's get your call on the books`
- Email body is generic corporate template, not Frankie brand voice

#### Node 9: Send an Email (Team Notification)

```json
{
  "fromEmail": "notifications@creativehotline.com",
  "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
  "subject": "New Payment: {{ $('Extract Data').item.json.name }}",
  "emailFormat": "html",
  "html": "<Team notification HTML with payment details: name, email, amount, product, stripe session ID>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

### Issues (WF1)

| # | Severity | Issue |
|---|----------|-------|
| 1 | CRITICAL | Product Purchased always null — `line_items` not in Stripe webhook payload |
| 2 | CRITICAL | No duplicate-payment guard — Stripe webhook retries create duplicate Notion records |
| 3 | MEDIUM | Customer email sent from `jake@radanimal.co` instead of `hello@creativehotline.com` |
| 4 | MEDIUM | Lead Source property not set (should be "Direct" or "Website") |
| 5 | LOW | Email template not in Frankie brand voice |
| 6 | LOW | Subject line uses old copy with emoji |

---

## WF2: Creative Hotline - Calendly Booking to Payments Update

| Field | Value |
|-------|-------|
| **Workflow ID** | `Wt7paQoH2EICMtUG` |
| **Active** | `true` |
| **Trigger** | Calendly webhook (`invitee.created`) |
| **Webhook Path** | `/webhook/calendly-payments-update` |
| **Production URL** | `https://creativehotline.app.n8n.cloud/webhook/calendly-payments-update` |
| **Test URL** | `https://creativehotline.app.n8n.cloud/webhook-test/calendly-payments-update` |

### Node List

| # | Node Name | Node Type | Version | Error Handling |
|---|-----------|-----------|---------|----------------|
| 1 | Calendly Webhook | `n8n-nodes-base.webhook` | 2 | — |
| 2 | Extract Booking Data | `n8n-nodes-base.set` | 3.4 | — |
| 3 | Find Payment by Email | `n8n-nodes-base.notion` | 2.2 | `continueRegularOutput` |
| 4 | Update Payment Status | `n8n-nodes-base.notion` | 2.2 | `continueRegularOutput` |
| 5 | Send an Email (Team) | `n8n-nodes-base.emailSend` | 2.1 | — |

### Connection Map

```
Calendly Webhook
  └─→ Extract Booking Data
        └─→ Find Payment by Email
              └─→ Update Payment Status
                    └─→ Send an Email (Team)
```

### Node Parameters

#### Node 1: Calendly Webhook

```json
{
  "httpMethod": "POST",
  "path": "calendly-payments-update",
  "authentication": "none",
  "options": {}
}
```

#### Node 2: Extract Booking Data

```json
{
  "mode": "manual",
  "assignments": [
    {
      "name": "email",
      "value": "={{ $json.body.payload.email }}",
      "type": "string"
    },
    {
      "name": "name",
      "value": "={{ $json.body.payload.name }}",
      "type": "string"
    },
    {
      "name": "call_date",
      "value": "={{ $json.body.payload.scheduled_event.start_time }}",
      "type": "string"
    },
    {
      "name": "calendly_link",
      "value": "={{ $json.body.payload.uri }}",
      "type": "string"
    }
  ]
}
```

#### Node 3: Find Payment by Email

```json
{
  "resource": "databasePage",
  "operation": "getAll",
  "databaseId": "3030e73ffadc80bcb9dde15f51a9caf2",
  "returnAll": false,
  "limit": 1,
  "filterType": "formula",
  "filters": {
    "conditions": [
      {
        "key": "Email|email",
        "condition": "equals",
        "value": "={{ $json.email }}"
      }
    ]
  },
  "onError": "continueRegularOutput"
}
```

**Credential:** Notion API (`rzufpLxiRLvvNq4Z`)

**Note:** Uses Notion API filter (not Code node). This diverges from the Code-node-filtering convention used in WF5-WF7, but works for simple lookups.

#### Node 4: Update Payment Status

```json
{
  "resource": "databasePage",
  "operation": "update",
  "pageId": "={{ $json.id }}",
  "propertiesUi": {
    "propertyValues": [
      {
        "key": "Call Date|date",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "dateValue": "={{ $('Extract Booking Data').item.json.call_date }}"
      },
      {
        "key": "Calendly Link|url",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "urlValue": "={{ $('Extract Booking Data').item.json.calendly_link }}"
      },
      {
        "key": "Status|select",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "selectValue": "Booked - Needs Intake"
      }
    ]
  },
  "onError": "continueRegularOutput"
}
```

**Credential:** Notion API (`rzufpLxiRLvvNq4Z`)

#### Node 5: Send an Email (Team Notification)

```json
{
  "fromEmail": "notifications@creativehotline.com",
  "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
  "subject": "Calendly Booking: {{ $('Extract Booking Data').item.json.name }}",
  "emailFormat": "html",
  "html": "<Team notification HTML — REFERENCES event_type AND start_time which DO NOT EXIST in extracted data (should use call_date)>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

### Issues (WF2)

| # | Severity | Issue |
|---|----------|-------|
| 7 | CRITICAL | Email mismatch = silent failure. If customer used different email for Stripe vs Calendly, Find Payment returns 0 results. `continueRegularOutput` swallows error. No team alert. |
| 8 | MEDIUM | Team notification references `event_type` and `start_time` which do not exist in Extract Booking Data output. Should reference `call_date`. |

---

## WF3: Creative Hotline - Tally Intake to Claude

| Field | Value |
|-------|-------|
| **Workflow ID** | `ETKIfWOX-eciSJQQF7XX5` |
| **Active** | `true` |
| **Trigger** | Tally webhook (form submission) |
| **Webhook Path** | `/webhook/tally-intake` |
| **Production URL** | `https://creativehotline.app.n8n.cloud/webhook/tally-intake` |
| **Test URL** | `https://creativehotline.app.n8n.cloud/webhook-test/tally-intake` |

### Node List

| # | Node Name | Node Type | Version | Error Handling | Notes |
|---|-----------|-----------|---------|----------------|-------|
| 1 | Tally Webhook | `n8n-nodes-base.webhook` | 1 | — | |
| 2 | Extract Tally Data | `n8n-nodes-base.code` | 2 | — | JavaScript fuzzy label matching |
| 3 | Create Intake Record | `n8n-nodes-base.notion` | 2 | `continueRegularOutput` | |
| 4 | Claude Generate Summary | `n8n-nodes-base.httpRequest` | 4 | `continueRegularOutput` | HARDCODED API KEY |
| 5 | Extract Claude Response | `n8n-nodes-base.set` | 1 | — | |
| 6 | Update Notion with AI Summary | `n8n-nodes-base.notion` | 2 | `continueRegularOutput` | |
| 7 | Upsell Detected? | `n8n-nodes-base.if` | 1 | — | |
| 8 | Send Upsell Alert | `n8n-nodes-base.emailSend` | 2 | — | Wrong sender |
| 9 | Find Payment by Email | `n8n-nodes-base.notion` | 2.2 | `continueRegularOutput` | |
| 10 | Link Intake & Update Status | `n8n-nodes-base.notion` | 2.2 | `continueRegularOutput` | |
| 11 | Send Intake Notification | `n8n-nodes-base.emailSend` | 2.1 | — | |
| **O** | **Find Notion Lead** | `n8n-nodes-base.notion` | 2 | — | **ORPHANED — not in connections** |

### Connection Map

```
Tally Webhook
  └─→ Extract Tally Data (Code)
        └─→ Create Intake Record
              └─→ Claude Generate Summary (HTTP Request)
                    └─→ Extract Claude Response
                          └─→ Update Notion with AI Summary
                                └─→ Upsell Detected?
                                      ├─ [true] → Send Upsell Alert
                                      │               └─→ Find Payment by Email
                                      │                     └─→ Link Intake & Update Status
                                      │                           └─→ Send Intake Notification
                                      └─ [false] → Find Payment by Email
                                                      └─→ Link Intake & Update Status
                                                            └─→ Send Intake Notification

ORPHANED (not connected): Find Notion Lead (position [-544, 224])
```

### Node Parameters

#### Node 1: Tally Webhook

```json
{
  "httpMethod": "POST",
  "path": "tally-intake",
  "authentication": "none",
  "options": {}
}
```

#### Node 2: Extract Tally Data (Code Node)

```javascript
// JavaScript: Fuzzy label matching on the Tally data.fields array
// Extracts: name, email, role, brand, website, creative_emergency,
//           desired_outcome, what_they_tried, deadline, constraints

const fields = $input.first().json.body.data.fields;

function findField(labelSubstring) {
  const field = fields.find(f =>
    f.label.toLowerCase().includes(labelSubstring.toLowerCase())
  );
  return field ? field.value : '';
}

return [{
  json: {
    name: findField('name'),
    email: findField('email'),
    role: findField('role'),
    brand: findField('brand') || findField('project'),
    website: findField('website') || findField('instagram'),
    creative_emergency: findField('emergency') || findField('creative'),
    desired_outcome: findField('walk away') || findField('outcome'),
    what_they_tried: findField('tried') || findField('already'),
    deadline: findField('deadline'),
    constraints: findField('constraint') || findField('off the table')
  }
}];
```

**Note:** The exact JavaScript in the live node uses fuzzy label matching. The above is a reconstruction from the MCP export and audit. The logic matches field labels containing the given substring.

#### Node 3: Create Intake Record

```json
{
  "resource": "databasePage",
  "operation": "create",
  "databaseId": "2f60e73ffadc806bbf5ddca2f5c256a3",
  "title": "={{ $('Extract Tally Data').item.json.name }}",
  "propertiesUi": {
    "propertyValues": [
      {
        "key": "Email|email",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "emailValue": "={{ $('Extract Tally Data').item.json.email }}"
      },
      {
        "key": "Role|select",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "selectValue": "={{ $('Extract Tally Data').item.json.role }}"
      },
      {
        "key": "Brand|rich_text",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "textContent": "={{ $('Extract Tally Data').item.json.brand }}"
      },
      {
        "key": "Website / IG|url",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "urlValue": "={{ $('Extract Tally Data').item.json.website }}"
      },
      {
        "key": "Creative Emergency|rich_text",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "textContent": "={{ $('Extract Tally Data').item.json.creative_emergency }}"
      },
      {
        "key": "Desired Outcome|select",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "selectValue": "={{ $('Extract Tally Data').item.json.desired_outcome }}"
      },
      {
        "key": "What They've Tried|rich_text",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "textContent": "={{ $('Extract Tally Data').item.json.what_they_tried }}"
      },
      {
        "key": "Deadline|rich_text",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "textContent": "={{ $('Extract Tally Data').item.json.deadline }}"
      },
      {
        "key": "Constraints / Avoid|rich_text",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "textContent": "={{ $('Extract Tally Data').item.json.constraints }}"
      },
      {
        "key": "Intake Status|select",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "selectValue": "Submitted"
      }
    ]
  },
  "options": {},
  "onError": "continueRegularOutput"
}
```

**Credential:** Notion API (`rzufpLxiRLvvNq4Z`)

**TYPE MISMATCH ISSUES:**
- `Role|select` -- Notion actual type is `rich_text` (text), not select. Should be `Role|rich_text`.
- `Desired Outcome|select` -- Notion actual type is `multi_select`. Should be `Desired Outcome|multiSelect`.

**MCP EXPORT NOTE:** The `textContent` fields for rich_text properties show as `""` (empty) in the MCP/JSON export. This is a **serialization artifact**, not a runtime bug. Verified 2026-02-20: live Intake records (Sarah Chen, Marcus Thompson) have all fields fully populated. The n8n expression engine evaluates bound expressions at runtime.

#### Node 4: Claude Generate Summary (HTTP Request)

```json
{
  "method": "POST",
  "url": "https://api.anthropic.com/v1/messages",
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      { "name": "x-api-key", "value": "[REDACTED — hardcoded Claude API key; must be moved to n8n credential]" },
      { "name": "anthropic-version", "value": "2023-06-01" },
      { "name": "Content-Type", "value": "application/json" }
    ]
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": {
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "You are an intake analyst for The Creative Hotline, a creative consultancy. Analyze this pre-call intake form and provide: 1) A concise summary of the client's situation, 2) Key talking points for the call, 3) Whether this client might benefit from a multi-session package (answer 'Upsell: Yes' or 'Upsell: No' on a separate line).\n\nClient: {{ $('Extract Tally Data').item.json.name }}\nRole: {{ $('Extract Tally Data').item.json.role }}\nBrand: {{ $('Extract Tally Data').item.json.brand }}\nCreative Emergency: {{ $('Extract Tally Data').item.json.creative_emergency }}\nDesired Outcome: {{ $('Extract Tally Data').item.json.desired_outcome }}\nWhat They've Tried: {{ $('Extract Tally Data').item.json.what_they_tried }}\nDeadline: {{ $('Extract Tally Data').item.json.deadline }}\nConstraints: {{ $('Extract Tally Data').item.json.constraints }}"
      }
    ]
  },
  "options": {},
  "onError": "continueRegularOutput"
}
```

**SECURITY ISSUE:** Claude API key is hardcoded directly in the HTTP request header (value: `[REDACTED]`). This should be stored as an n8n HTTP Header Auth credential instead.

#### Node 5: Extract Claude Response

```json
{
  "mode": "manual",
  "assignments": [
    {
      "name": "ai_summary",
      "value": "={{ $json.content[0].text }}",
      "type": "string"
    },
    {
      "name": "upsell_detected",
      "value": "={{ $json.content[0].text.includes('Upsell: Yes') }}",
      "type": "boolean"
    }
  ]
}
```

#### Node 6: Update Notion with AI Summary

```json
{
  "resource": "databasePage",
  "operation": "update",
  "pageId": "={{ $('Create Intake Record').item.json.id }}",
  "propertiesUi": {
    "propertyValues": [
      {
        "key": "AI Intake Summary|rich_text",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "textContent": "={{ $json.ai_summary }}"
      }
    ]
  },
  "onError": "continueRegularOutput"
}
```

**Credential:** Notion API (`rzufpLxiRLvvNq4Z`)

#### Node 7: Upsell Detected?

```json
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{ $json.upsell_detected }}",
        "value2": true,
        "operation": "equal"
      }
    ]
  }
}
```

**Note:** `upsell_detected` is extracted as a boolean in Node 5 via `.includes('Upsell: Yes')`. The comparison here is boolean-to-boolean, which is correct.

#### Node 8: Send Upsell Alert

```json
{
  "fromEmail": "soscreativehotline@gmail.com",
  "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
  "subject": "Upsell Opportunity: {{ $('Extract Tally Data').item.json.name }}",
  "emailFormat": "html",
  "html": "<Team alert HTML with client name, creative emergency summary, and AI summary>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

**ISSUE:** `fromEmail` should be `notifications@creativehotline.com`, not `soscreativehotline@gmail.com`.

#### Node 9: Find Payment by Email

```json
{
  "resource": "databasePage",
  "operation": "getAll",
  "databaseId": "3030e73ffadc80bcb9dde15f51a9caf2",
  "returnAll": false,
  "limit": 1,
  "filterType": "formula",
  "filters": {
    "conditions": [
      {
        "key": "Email|email",
        "condition": "equals",
        "value": "={{ $('Extract Tally Data').item.json.email }}"
      }
    ]
  },
  "onError": "continueRegularOutput"
}
```

**Credential:** Notion API (`rzufpLxiRLvvNq4Z`)

#### Node 10: Link Intake & Update Status

```json
{
  "resource": "databasePage",
  "operation": "update",
  "pageId": "={{ $json.id }}",
  "propertiesUi": {
    "propertyValues": [
      {
        "key": "Linked Intake|relation",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "relationValue": "={{ $('Create Intake Record').item.json.id }}"
      },
      {
        "key": "Status|select",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "selectValue": "Intake Complete"
      }
    ]
  },
  "onError": "continueRegularOutput"
}
```

**Credential:** Notion API (`rzufpLxiRLvvNq4Z`)

#### Node 11: Send Intake Notification

```json
{
  "fromEmail": "notifications@creativehotline.com",
  "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
  "subject": "Intake Submitted: {{ $('Extract Tally Data').item.json.name }}",
  "emailFormat": "html",
  "html": "<Team notification HTML with client name, email, creative emergency, AI summary, upsell flag>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

#### Orphaned Node: Find Notion Lead

```json
{
  "resource": "databasePage",
  "operation": "getAll",
  "databaseId": "3030e73ffadc80bcb9dde15f51a9caf2",
  "position": [-544, 224],
  "note": "ORPHANED — this node exists in the workflow but is NOT connected to any other node. Never executes. Should be deleted."
}
```

### Issues (WF3)

| # | Severity | Issue |
|---|----------|-------|
| 9 | CRITICAL | `Role` mapped as `select` but Notion type is `rich_text` (text) — type mismatch |
| 10 | CRITICAL | `Desired Outcome` mapped as `select` but Notion type is `multi_select` — type mismatch |
| 11 | HIGH | Email mismatch causes silent failure — if Tally email differs from Stripe email, Find Payment returns 0 and intake is orphaned |
| 12 | MEDIUM | Upsell Alert sent from `soscreativehotline@gmail.com` instead of `notifications@creativehotline.com` |
| 13 | MEDIUM | Orphaned "Find Notion Lead" node exists but is not connected — dead weight |
| 14 | LOW | Claude API key hardcoded in HTTP Request headers — should be stored in n8n credential |
| 15 | LOW | Claude API failure is silently swallowed by `continueRegularOutput` — no error notification |

---

## WF4: Creative Hotline - Laylo New Subscriber to Notion

| Field | Value |
|-------|-------|
| **Workflow ID** | `MfbV3-F5GiMwDs1KD5AoK` |
| **Active** | `true` |
| **Trigger** | Laylo webhook (new subscriber) |
| **Webhook Path** | `/webhook/8e422442-519e-4d42-8cb4-372d26b89edc` |
| **Production URL** | `https://creativehotline.app.n8n.cloud/webhook/8e422442-519e-4d42-8cb4-372d26b89edc` |
| **Test URL** | `https://creativehotline.app.n8n.cloud/webhook-test/8e422442-519e-4d42-8cb4-372d26b89edc` |

### Node List

| # | Node Name | Node Type | Version | Error Handling |
|---|-----------|-----------|---------|----------------|
| 1 | Webhook | `n8n-nodes-base.webhook` | 2.1 | — |
| 2 | Extract Subscriber Data | `n8n-nodes-base.set` | 3.4 | — |
| 3 | Create Subscriber Lead | `n8n-nodes-base.notion` | 2.2 | `continueRegularOutput` |
| 4 | Send an Email (Team) | `n8n-nodes-base.emailSend` | 2.1 | — |

### Connection Map

```
Webhook
  └─→ Extract Subscriber Data
        └─→ Create Subscriber Lead
              └─→ Send an Email (Team)
```

### Node Parameters

#### Node 1: Webhook

```json
{
  "httpMethod": "POST",
  "path": "8e422442-519e-4d42-8cb4-372d26b89edc",
  "authentication": "none",
  "options": {}
}
```

#### Node 2: Extract Subscriber Data

```json
{
  "mode": "manual",
  "assignments": [
    {
      "name": "email",
      "value": "={{ $json.body.email }}",
      "type": "string"
    },
    {
      "name": "phone",
      "value": "={{ $json.body.phoneNumber }}",
      "type": "string"
    },
    {
      "name": "product_id",
      "value": "={{ $json.body.productId }}",
      "type": "string"
    },
    {
      "name": "source",
      "value": "Laylo - IG DM",
      "type": "string"
    },
    {
      "name": "subscribed_at",
      "value": "={{ new Date().toISOString() }}",
      "type": "string"
    }
  ]
}
```

#### Node 3: Create Subscriber Lead

```json
{
  "resource": "databasePage",
  "operation": "create",
  "databaseId": "3030e73f-fadc-80bc-b9dd-e15f51a9caf2",
  "title": "",
  "propertiesUi": {
    "propertyValues": [
      {
        "key": "Email|email",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "emailValue": "={{ $json.email }}"
      },
      {
        "key": "Phone|phone_number",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "phoneValue": ""
      },
      {
        "key": "Status|select",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "selectValue": "Lead - Laylo"
      },
      {
        "key": "Payment Amount|number",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "numberValue": 0
      },
      {
        "key": "Product Purchased|rich_text",
        "type": "={{ $parameter[\"&key\"].split(\"|\")[1] }}",
        "textContent": ""
      }
    ]
  },
  "options": {},
  "onError": "continueRegularOutput"
}
```

**Credential:** Notion API (`rzufpLxiRLvvNq4Z`)

**TYPE MISMATCH:** `Product Purchased|rich_text` but Notion type is `select`.
**MISSING DATA:** `title` is empty (Client Name always blank). `phoneValue` is empty despite phone being extracted.

#### Node 4: Send an Email (Team Notification)

```json
{
  "fromEmail": "notifications@creativehotline.com",
  "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
  "subject": "New Laylo Subscriber: {{ $json.email }}",
  "emailFormat": "html",
  "html": "<Team notification HTML with subscriber email, phone, source>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

### Issues (WF4)

| # | Severity | Issue |
|---|----------|-------|
| 16 | CRITICAL | `Product Purchased` mapped as `rich_text` but Notion type is `select` — type mismatch, will silently fail |
| 17 | HIGH | Phone number extracted in Node 2 but `phoneValue` is empty in Node 3 — phone data is lost |
| 18 | HIGH | Client Name (title) always blank — Laylo does not provide name, but no fallback to email |
| 19 | MEDIUM | Lead Source property not set — should be "IG DM" |
| 20 | MEDIUM | No duplicate check — multiple IG keyword triggers create duplicate Notion records |

---

## WF5: Creative Hotline - Follow Up: Paid But Never Booked

| Field | Value |
|-------|-------|
| **Workflow ID** | `clCnlUW1zjatRHXE` |
| **Active** | `true` |
| **Trigger** | Schedule (cron `0 9 * * *` — daily 9am) |

### Node List

| # | Node Name | Node Type | Version | Error Handling |
|---|-----------|-----------|---------|----------------|
| 1 | Daily 9am Check | `n8n-nodes-base.scheduleTrigger` | 1.2 | — |
| 2 | Get All Payments | `n8n-nodes-base.notion` | 2.2 | — |
| 3 | Filter Stale Unbookeds | `n8n-nodes-base.code` | 2 | — |
| 4 | Any Results? | `n8n-nodes-base.if` | 2 | — |
| 5 | Send Booking Reminder | `n8n-nodes-base.emailSend` | 2.1 | — |
| 6 | Alert Team | `n8n-nodes-base.emailSend` | 2.1 | — |

### Connection Map

```
Daily 9am Check
  └─→ Get All Payments
        └─→ Filter Stale Unbookeds (Code)
              └─→ Any Results?
                    ├─ [true] → Send Booking Reminder
                    │               └─→ Alert Team
                    └─ [false] → (end)
```

### Node Parameters

#### Node 1: Daily 9am Check

```json
{
  "rule": {
    "interval": [
      {
        "field": "cronExpression",
        "expression": "0 9 * * *"
      }
    ]
  }
}
```

#### Node 2: Get All Payments

```json
{
  "resource": "databasePage",
  "operation": "getAll",
  "databaseId": "3030e73ffadc80bcb9dde15f51a9caf2",
  "returnAll": true,
  "options": {}
}
```

**Credential:** Notion API (`rzufpLxiRLvvNq4Z`)

#### Node 3: Filter Stale Unbookeds (Code Node)

```javascript
// Filters for:
// - Status = "Paid - Needs Booking"
// - Payment Date > 48 hours ago (stale)
const items = $input.all();
const now = new Date();
const results = [];

for (const item of items) {
  const status = item.json.properties?.Status?.select?.name;
  const paymentDate = item.json.properties?.['Payment Date']?.date?.start;

  if (status === 'Paid - Needs Booking' && paymentDate) {
    const hoursSincePayment = (now - new Date(paymentDate)) / (1000 * 60 * 60);
    if (hoursSincePayment > 48) {
      results.push({
        json: {
          name: item.json.properties?.['Client Name']?.title?.[0]?.plain_text || 'Unknown',
          email: item.json.properties?.Email?.email || '',
          hours_stale: Math.round(hoursSincePayment),
          payment_date: paymentDate,
          page_id: item.json.id
        }
      });
    }
  }
}

if (results.length === 0) {
  return [{ json: { _empty: true } }];
}

return results;
```

**Note:** Reconstructed from audit. The live Code node logic follows this pattern: fetch all, filter by status string match + date math, return sentinel `_empty: true` if no matches.

#### Node 4: Any Results?

```json
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{ !$json._empty }}",
        "value2": true,
        "operation": "equal"
      }
    ]
  }
}
```

#### Node 5: Send Booking Reminder (Customer)

```json
{
  "fromEmail": "hello@creativehotline.com",
  "toEmail": "={{ $json.email }}",
  "subject": "Your call's waiting on you",
  "emailFormat": "html",
  "html": "<Customer reminder HTML with Calendly link: https://calendly.com/soscreativehotline/creative-hotline-call — generic template, signs off as 'The Creative Hotline Team' instead of Frankie>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

#### Node 6: Alert Team

```json
{
  "fromEmail": "notifications@creativehotline.com",
  "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
  "subject": "Stale Booking: {{ $json.name }} ({{ $json.hours_stale }}hrs)",
  "emailFormat": "html",
  "html": "<Team alert HTML with client name, email, hours since payment>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

### Issues (WF5)

| # | Severity | Issue |
|---|----------|-------|
| 21 | HIGH | No dedup flag — sends daily reminder every single day until status changes. No "Booking Reminder Sent" checkbox to prevent re-sending. |
| 22 | LOW | Customer email not in Frankie brand voice — signs off as "The Creative Hotline Team" |

---

## WF6: Creative Hotline - Follow Up: Booked But No Intake

| Field | Value |
|-------|-------|
| **Workflow ID** | `Esq2SMGEy6LVHdIQ` |
| **Active** | `true` |
| **Trigger** | Schedule (cron `0 8 * * *` — daily 8am) |

### Node List

| # | Node Name | Node Type | Version | Error Handling |
|---|-----------|-----------|---------|----------------|
| 1 | Daily 8am Check | `n8n-nodes-base.scheduleTrigger` | 1.2 | — |
| 2 | Get All Payments | `n8n-nodes-base.notion` | 2.2 | — |
| 3 | Filter Needs Intake | `n8n-nodes-base.code` | 2 | — |
| 4 | Any Results? | `n8n-nodes-base.if` | 2 | — |
| 5 | Send Intake Reminder | `n8n-nodes-base.emailSend` | 2.1 | — |
| 6 | Alert Team | `n8n-nodes-base.emailSend` | 2.1 | — |

### Connection Map

```
Daily 8am Check
  └─→ Get All Payments
        └─→ Filter Needs Intake (Code)
              └─→ Any Results?
                    ├─ [true] → Send Intake Reminder
                    │               └─→ Alert Team
                    └─ [false] → (end)
```

### Node Parameters

#### Node 1: Daily 8am Check

```json
{
  "rule": {
    "interval": [
      {
        "field": "cronExpression",
        "expression": "0 8 * * *"
      }
    ]
  }
}
```

#### Node 2: Get All Payments

```json
{
  "resource": "databasePage",
  "operation": "getAll",
  "databaseId": "3030e73ffadc80bcb9dde15f51a9caf2",
  "returnAll": true,
  "options": {}
}
```

**Credential:** Notion API (`rzufpLxiRLvvNq4Z`)

#### Node 3: Filter Needs Intake (Code Node)

```javascript
// Filters for:
// - Status = "Booked - Needs Intake"
// - Call Date within 24 hours (upcoming)
// BUG: Also matches past-due calls (hoursUntilCall < 0) — no lower cutoff
const items = $input.all();
const now = new Date();
const results = [];

for (const item of items) {
  const status = item.json.properties?.Status?.select?.name;
  const callDate = item.json.properties?.['Call Date']?.date?.start;

  if (status === 'Booked - Needs Intake' && callDate) {
    const hoursUntilCall = (new Date(callDate) - now) / (1000 * 60 * 60);
    if (hoursUntilCall < 24) {
      // BUG: No lower bound — fires for past-due calls indefinitely
      results.push({
        json: {
          name: item.json.properties?.['Client Name']?.title?.[0]?.plain_text || 'Unknown',
          email: item.json.properties?.Email?.email || '',
          hours_until_call: Math.round(hoursUntilCall),
          call_date: callDate,
          page_id: item.json.id
        }
      });
    }
  }
}

if (results.length === 0) {
  return [{ json: { _empty: true } }];
}

return results;
```

#### Node 4: Any Results?

```json
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{ !$json._empty }}",
        "value2": true,
        "operation": "equal"
      }
    ]
  }
}
```

#### Node 5: Send Intake Reminder (Customer)

```json
{
  "fromEmail": "hello@creativehotline.com",
  "toEmail": "={{ $json.email }}",
  "subject": "Quick thing before our call",
  "emailFormat": "html",
  "html": "<Customer reminder HTML with Tally form link: https://tally.so/r/b5W1JE (VERIFIED CORRECT) — generic template, not Frankie voice>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

**Tally URL Status:** VERIFIED CORRECT as of 2026-02-20. URL is `https://tally.so/r/b5W1JE` (was previously a placeholder `YOUR_TALLY_FORM_ID`, now fixed).

#### Node 6: Alert Team

```json
{
  "fromEmail": "notifications@creativehotline.com",
  "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
  "subject": "Missing Intake: {{ $json.name }} ({{ $json.hours_until_call }}hrs)",
  "emailFormat": "html",
  "html": "<Team alert HTML with client name, email, hours until call>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

**Note:** When `hours_until_call` is negative (call already happened), the subject reads "Missing Intake: Jane (-12hrs)" which looks odd.

### Issues (WF6)

| # | Severity | Issue |
|---|----------|-------|
| 23 | HIGH | No dedup — sends reminders every day for qualifying records. No "Intake Reminder Sent" flag. |
| 24 | MEDIUM | Past-due calls fire indefinitely — no lower cutoff. When call has passed and status stays "Booked - Needs Intake", reminders continue forever. Needs cutoff at -48hrs. |
| 25 | LOW | Negative hours in team alert subject looks odd ("Missing Intake: Jane (-12hrs)") |
| 26 | LOW | Customer email not in Frankie brand voice |
| 27 | LOW | Stale `webhookId` artifacts on email nodes — harmless but confusing |

---

## WF7: Creative Hotline - Follow Up: Laylo Lead Nurture

| Field | Value |
|-------|-------|
| **Workflow ID** | `VYCokTqWGAFCa1j0` |
| **Active** | `true` |
| **Trigger** | Schedule (cron `0 10 * * *` — daily 10am) |

### Node List

| # | Node Name | Node Type | Version | Error Handling |
|---|-----------|-----------|---------|----------------|
| 1 | Daily 10am Check | `n8n-nodes-base.scheduleTrigger` | 1.2 | — |
| 2 | Get All Leads | `n8n-nodes-base.notion` | 2.2 | — |
| 3 | Filter 3-Day Old Laylo Leads | `n8n-nodes-base.code` | 2 | — |
| 4 | Any Leads to Nurture? | `n8n-nodes-base.if` | 2 | — |
| 5 | Send Nurture Email | `n8n-nodes-base.emailSend` | 2.1 | — |
| 6 | Alert Team | `n8n-nodes-base.emailSend` | 2.1 | — |

### Connection Map

```
Daily 10am Check
  └─→ Get All Leads
        └─→ Filter 3-Day Old Laylo Leads (Code)
              └─→ Any Leads to Nurture?
                    ├─ [true] → Send Nurture Email
                    │               └─→ Alert Team
                    └─ [false] → (end)
```

### Node Parameters

#### Node 1: Daily 10am Check

```json
{
  "rule": {
    "interval": [
      {
        "field": "cronExpression",
        "expression": "0 10 * * *"
      }
    ]
  }
}
```

#### Node 2: Get All Leads

```json
{
  "resource": "databasePage",
  "operation": "getAll",
  "databaseId": "3030e73ffadc80bcb9dde15f51a9caf2",
  "returnAll": true,
  "options": {}
}
```

**Credential:** Notion API (`rzufpLxiRLvvNq4Z`)

#### Node 3: Filter 3-Day Old Laylo Leads (Code Node)

```javascript
// Filters for:
// - Status = "Lead - Laylo"
// - Created time between 3 and 7 days ago
// BUG: Leads in 3-7 day window get the SAME email every day (no dedup flag)
const items = $input.all();
const now = new Date();
const results = [];

for (const item of items) {
  const status = item.json.properties?.Status?.select?.name;
  const createdTime = item.json.created_time;

  if (status === 'Lead - Laylo' && createdTime) {
    const daysSinceCreated = (now - new Date(createdTime)) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated >= 3 && daysSinceCreated <= 7) {
      results.push({
        json: {
          name: item.json.properties?.['Client Name']?.title?.[0]?.plain_text || 'Unknown',
          email: item.json.properties?.Email?.email || '',
          days_old: Math.round(daysSinceCreated),
          page_id: item.json.id
        }
      });
    }
  }
}

if (results.length === 0) {
  return [{ json: { _empty: true } }];
}

return results;
```

#### Node 4: Any Leads to Nurture?

```json
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{ !$json._empty }}",
        "value2": true,
        "operation": "equal"
      }
    ]
  }
}
```

#### Node 5: Send Nurture Email (Customer)

```json
{
  "fromEmail": "hello@creativehotline.com",
  "toEmail": "={{ $json.email }}",
  "subject": "Ready to solve your creative challenge?",
  "emailFormat": "html",
  "html": "<Customer nurture HTML with 'Learn More & Book' button linking to https://soscreativehotline.com (BROKEN — domain does not exist, should be https://www.thecreativehotline.com)>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

**BROKEN URL:** The "Learn More & Book" button links to `https://soscreativehotline.com` which is a dead domain. Must be changed to `https://www.thecreativehotline.com`.

#### Node 6: Alert Team

```json
{
  "fromEmail": "notifications@creativehotline.com",
  "toEmail": "jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com",
  "subject": "Lead Nurture Sent: {{ $json.email }} ({{ $json.days_old }} days old)",
  "emailFormat": "html",
  "html": "<Team alert HTML with lead email, days since signup>"
}
```

**Credential:** SMTP (`yJP76JoIqqqEPbQ9`)

### Issues (WF7)

| # | Severity | Issue |
|---|----------|-------|
| 28 | HIGH | Same lead gets duplicate nurture emails for 5 days straight (days 3-7). No "Nurture Sent" dedup flag. Spammy and unprofessional. |
| 29 | MEDIUM | "Learn More & Book" button links to `https://soscreativehotline.com` (dead domain). Should be `https://www.thecreativehotline.com`. |
| 30 | LOW | CTA links to homepage instead of direct booking/purchase URL. Should link to Calendly or Stripe payment link. |
| 31 | LOW | Customer email not in Frankie brand voice |

---

## Credential Reference

| Credential | Type | n8n ID | Used By |
|------------|------|--------|---------|
| SMTP (Email) | SMTP | `yJP76JoIqqqEPbQ9` | All `emailSend` nodes across all 7 workflows |
| Notion API | Notion Internal Integration | `rzufpLxiRLvvNq4Z` | All Notion nodes across all 7 workflows |
| HTTP Header Auth (Laylo) | HTTP Header Auth | *(unknown ID)* | WF1 Laylo Subscribe (SMS) and Laylo Subscribe (Email Only) |
| Claude API | **HARDCODED** (not in n8n credentials) | N/A | WF3 Claude Generate Summary — key is `[REDACTED]`, must be moved to an n8n HTTP Header Auth credential |

### SMTP Configuration

- **Customer-facing emails:** From `hello@creativehotline.com`
- **Team notifications:** From `notifications@creativehotline.com`
- **Recipients (team):** `jake@radanimal.co`, `megha@theanecdote.co`, `soscreativehotline@gmail.com`

### Incorrect Senders Found

| Workflow | Node | Current Sender | Correct Sender |
|----------|------|----------------|----------------|
| WF1 | Send Calendly Link | `jake@radanimal.co` | `hello@creativehotline.com` |
| WF3 | Send Upsell Alert | `soscreativehotline@gmail.com` | `notifications@creativehotline.com` |

---

## Notion Database Schemas

### Payments Database

**Database ID:** `3030e73ffadc80bcb9dde15f51a9caf2`
**Hyphenated:** `3030e73f-fadc-80bc-b9dd-e15f51a9caf2`

| Property | Type | Select Options | Used By |
|----------|------|----------------|---------|
| Client Name | title | — | WF1, WF4 |
| Email | email | — | WF1, WF2, WF3, WF4, WF5, WF6, WF7 |
| Phone | phone_number | — | WF1, WF4 |
| Payment Amount | number (dollar) | — | WF1, WF4 |
| Product Purchased | **select** | "3-Pack Sprint", "Standard Call", "First Call" | WF1, WF4 (both have issues) |
| Payment Date | date | — | WF1, WF5 |
| Stripe Session ID | text (rich_text) | — | WF1 |
| Status | select | "Lead - Laylo", "Paid - Needs Booking", "Booked - Needs Intake", "Intake Complete", "Ready for Call", "Call Complete" | WF1, WF2, WF3, WF4, WF5, WF6, WF7 |
| Call Date | date | — | WF2, WF6 |
| Calendly Link | url | — | WF2 |
| Linked Intake | relation -> Intake DB | — | WF3 |
| Lead Source | select | "IG DM", "IG Comment", "IG Story", "Meta Ad", "LinkedIn", "Website", "Referral", "Direct" | NOT SET by any workflow |
| Days to Convert | formula | — | (computed) |
| Created | created_time | — | WF7 |

### Intake Database

**Database ID:** `2f60e73ffadc806bbf5ddca2f5c256a3`
**Hyphenated:** `2f60e73f-fadc-806b-bf5d-dca2f5c256a3`

| Property | Type | Select/Multi-Select Options | Used By |
|----------|------|-----------------------------|---------|
| Client Name | title | — | WF3 |
| Email | email | — | WF3 |
| Role | **text** (rich_text) | — | WF3 (mapped as select -- WRONG) |
| Brand | text (rich_text) | — | WF3 |
| Website / IG | url | — | WF3 |
| Creative Emergency | text (rich_text) | — | WF3 |
| Desired Outcome | **multi_select** | "A clear decision", "Direction I can trust", "A short action plan", "Stronger positioning", "Someone to tell me the truth" | WF3 (mapped as select -- WRONG) |
| What They've Tried | text (rich_text) | — | WF3 |
| Deadline | text (rich_text) | — | WF3 |
| Constraints / Avoid | text (rich_text) | — | WF3 |
| Intake Status | select | "Not Started", "Submitted" | WF3 |
| AI Intake Summary | text (rich_text) | — | WF3 |
| Action Plan Sent | checkbox | — | (not set by any workflow) |
| Call Date | date | — | (not set by any workflow) |
| Linked Payment | relation -> Payments DB | — | WF3 |

---

## Webhook URL Reference

| Workflow | Path | Production URL | Test URL |
|----------|------|----------------|----------|
| WF1 | `/webhook/stripe-checkout` | `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout` | `https://creativehotline.app.n8n.cloud/webhook-test/stripe-checkout` |
| WF2 | `/webhook/calendly-payments-update` | `https://creativehotline.app.n8n.cloud/webhook/calendly-payments-update` | `https://creativehotline.app.n8n.cloud/webhook-test/calendly-payments-update` |
| WF3 | `/webhook/tally-intake` | `https://creativehotline.app.n8n.cloud/webhook/tally-intake` | `https://creativehotline.app.n8n.cloud/webhook-test/tally-intake` |
| WF4 | `/webhook/8e422442-519e-4d42-8cb4-372d26b89edc` | `https://creativehotline.app.n8n.cloud/webhook/8e422442-519e-4d42-8cb4-372d26b89edc` | `https://creativehotline.app.n8n.cloud/webhook-test/8e422442-519e-4d42-8cb4-372d26b89edc` |

WF5, WF6, WF7 are schedule-triggered (no webhook URLs).

---

## Consolidated Issue Table

All issues found across the 7 active workflows, sorted by priority.

### P0 — CRITICAL (Fix immediately)

| # | Workflow | Issue | Impact | Fix |
|---|----------|-------|--------|-----|
| 1 | WF1 | Product Purchased always null | Every payment record has blank product | Hardcode "Standard Call" or use Stripe metadata/API expand |
| 2 | WF1 | No duplicate-payment guard | Stripe webhook retries create duplicate records | Add Notion query for Stripe Session ID before creating |
| 7 | WF2 | Email mismatch = silent failure | Calendly bookings with different email never update Payments DB | Add IF node + team alert when Find Payment returns 0 |
| 9 | WF3 | Role mapped as select, Notion type is rich_text | Role field silently fails or errors | Change to `Role\|rich_text` with `textContent` |
| 10 | WF3 | Desired Outcome mapped as select, Notion type is multi_select | Desired Outcome field errors | Change to `Desired Outcome\|multiSelect` |
| 11 | WF3 | Email mismatch = silent failure (same as WF2) | Intake records orphaned when emails differ | Add IF node + team alert when Find Payment returns 0 |
| 16 | WF4 | Product Purchased mapped as rich_text, Notion type is select | Product Purchased silently fails | Change to `Product Purchased\|select` or remove property |

### P1 — HIGH (Fix this week)

| # | Workflow | Issue | Impact | Fix |
|---|----------|-------|--------|-----|
| 17 | WF4 | Phone number extracted but not written to Notion | Phone data lost for every Laylo subscriber | Map `phoneValue` to `={{ $json.phone }}` |
| 18 | WF4 | Client Name always blank | Laylo leads have no name in CRM | Set title to `={{ $json.email }}` as fallback |
| 21 | WF5 | No dedup flag for booking reminders | Sends daily spam until status changes | Add "Booking Reminder Sent" checkbox, filter + set |
| 23 | WF6 | No dedup flag for intake reminders | Sends daily reminder for same records | Add "Intake Reminder Sent" checkbox, filter + set |
| 28 | WF7 | Same nurture email sent 5 days straight (days 3-7) | Spammy, unprofessional | Add "Nurture Sent" checkbox, filter + set |

### P2 — MEDIUM (Fix before launch)

| # | Workflow | Issue | Impact | Fix |
|---|----------|-------|--------|-----|
| 3 | WF1 | Customer email from `jake@radanimal.ro` | Unprofessional, wrong sender | Change to `hello@creativehotline.com` |
| 4 | WF1 | Lead Source not set | No attribution tracking | Add `Lead Source\|select` = "Direct" |
| 8 | WF2 | Team email references non-existent `event_type`/`start_time` | Team sees "undefined" in notification | Replace with static text / `call_date` |
| 12 | WF3 | Upsell alert from wrong sender (`soscreativehotline@gmail.com`) | Inconsistent team notifications | Change to `notifications@creativehotline.com` |
| 13 | WF3 | Orphaned "Find Notion Lead" node | Dead weight, confusing | Delete the node |
| 19 | WF4 | Lead Source not set | No attribution for Laylo subscribers | Add `Lead Source\|select` = "IG DM" |
| 20 | WF4 | No duplicate check for Laylo subscribers | Duplicate records from repeated IG keywords | Query by email before creating |
| 24 | WF6 | Past-due calls fire indefinitely (no lower cutoff) | Customers with past calls get reminders forever | Add cutoff at -48hrs |
| 29 | WF7 | "Learn More" URL is dead domain (`soscreativehotline.com`) | Leads click to broken page | Change to `www.thecreativehotline.com` |

### P3 — LOW (Next sprint)

| # | Workflow | Issue | Impact | Fix |
|---|----------|-------|--------|-----|
| 5 | WF1 | Email template not Frankie voice | Brand inconsistency | Replace with Frankie template (see docs/email-templates-frankie.md) |
| 6 | WF1 | Subject line uses old copy with emoji | Brand inconsistency | Change to "Let's get your call on the books" |
| 14 | WF3 | Claude API key hardcoded | Security risk | Move to n8n HTTP Header Auth credential |
| 15 | WF3 | Claude API failure silently swallowed | No alert when AI analysis fails | Add error notification branch |
| 22 | WF5 | Customer email not Frankie voice | Brand inconsistency | Replace with Frankie template |
| 25 | WF6 | Negative hours in team subject | Looks odd ("Missing Intake: Jane (-12hrs)") | Show "PAST DUE" instead |
| 26 | WF6 | Customer email not Frankie voice | Brand inconsistency | Replace with Frankie template |
| 27 | WF6 | Stale webhookId artifacts on email nodes | Harmless but confusing | Remove the fields |
| 30 | WF7 | CTA links to homepage not Calendly | Weak conversion | Link to Calendly directly |
| 31 | WF7 | Customer email not Frankie voice | Brand inconsistency | Replace with Frankie template |

---

## Recovery Instructions

If the n8n trial expires and workflow data is lost, use this document to reconstruct all 7 workflows:

1. **Create a new n8n account** (Starter plan, ~$24/month) or reactivate the existing one.
2. **Set up credentials first:** SMTP (using existing email server config), Notion API (using existing integration token), Laylo HTTP Header Auth, Claude API HTTP Header Auth.
3. **Rebuild each workflow** using the node lists, connection maps, and full parameter configs above.
4. **Configure webhook URLs** in external services:
   - Stripe: Point `checkout.session.completed` webhook to WF1 production URL
   - Calendly: Point `invitee.created` webhook to WF2 production URL
   - Tally: Point form submission webhook to WF3 production URL
   - Laylo: Point subscriber webhook to WF4 production URL (note: the UUID path may change in a new instance)
5. **Activate workflows** and run the testing checklist (`docs/workflow-testing-checklist.md`).
6. **Apply fixes** from `docs/n8n-fix-configs.md` while rebuilding -- do not carry forward known bugs.

### Important Notes for Reconstruction

- The Laylo webhook path (`8e422442-519e-4d42-8cb4-372d26b89edc`) is a UUID assigned by n8n. A new instance will generate a different path. Update the Laylo webhook configuration accordingly.
- The Claude API key marked `[REDACTED]` above must be retrieved from the team's credential store. Do NOT hardcode it again; create a proper n8n HTTP Header Auth credential.
- All schedule-triggered workflows (WF5, WF6, WF7) use the same pattern: Notion getAll + Code node filter + If check + Customer email + Team email. They can be consolidated into a single "Daily Follow-Ups" workflow to save on the 5-active-workflow limit of the Starter plan.
- Broken workflows WF8 and WF9 are NOT included in this backup. Rebuild specs for those are in `docs/wf8-rebuild-spec.md` and `docs/wf9-rebuild-spec.md`.

---

**End of backup. Total: 7 active workflows, 47 nodes, 31 documented issues, 4 credentials.**
