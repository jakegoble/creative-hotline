# n8n Error Handler Workflow Spec

**Date:** 2026-02-21
**Status:** Draft — needs implementation in n8n Cloud UI

---

## Purpose

A universal error-handler workflow that catches failures from any active workflow and sends an alert email with diagnostic details. This replaces the current "silent failure" behavior where broken nodes fail without notification.

---

## Architecture

n8n supports a built-in **Error Workflow** setting on each workflow. When any node in a workflow fails, n8n triggers the designated error workflow with a standardized error payload.

```
Any Workflow Fails
  → n8n Error Trigger node fires
    → Format Error Details (Code node)
      → Send Alert Email (Email Send node)
```

---

## Workflow: Creative Hotline - Error Handler

### Node 1: Error Trigger

| Setting | Value |
|---------|-------|
| Node type | `n8n-nodes-base.errorTrigger` |
| Name | `Error Trigger` |

The Error Trigger node receives a standardized payload when any workflow configured to use this error handler fails:

```json
{
  "execution": {
    "id": "12345",
    "url": "https://creativehotline.app.n8n.cloud/workflow/ABC/executions/12345",
    "error": {
      "message": "The resource could not be found",
      "name": "NodeApiError"
    },
    "lastNodeExecuted": "Create Notion Lead",
    "mode": "trigger"
  },
  "workflow": {
    "id": "AMSvlokEAFKvF_rncAFte",
    "name": "Creative Hotline - Stripe Purchase to Calendly"
  }
}
```

### Node 2: Format Error Details (Code)

```javascript
const execution = $json.execution || {};
const workflow = $json.workflow || {};
const error = execution.error || {};

const timestamp = new Date().toLocaleString('en-US', {
  timeZone: 'America/Los_Angeles',
  dateStyle: 'medium',
  timeStyle: 'short'
});

const workflowName = workflow.name || 'Unknown Workflow';
const workflowId = workflow.id || 'unknown';
const errorMessage = error.message || 'No error message available';
const errorType = error.name || 'Unknown';
const failedNode = execution.lastNodeExecuted || 'Unknown node';
const executionId = execution.id || 'unknown';
const executionUrl = execution.url || `https://creativehotline.app.n8n.cloud`;
const mode = execution.mode || 'unknown';

// Determine severity based on workflow
const criticalWorkflows = [
  'Stripe Purchase to Calendly',
  'Calendly Booking to Payments',
  'Tally Intake to Claude'
];
const isCritical = criticalWorkflows.some(w => workflowName.includes(w));
const severity = isCritical ? 'CRITICAL' : 'WARNING';

return [{
  json: {
    severity,
    workflowName,
    workflowId,
    errorMessage,
    errorType,
    failedNode,
    executionId,
    executionUrl,
    mode,
    timestamp
  }
}];
```

### Node 3: Send Alert Email

| Setting | Value |
|---------|-------|
| Node type | `n8n-nodes-base.emailSend` |
| Credential | SMTP (`yJP76JoIqqqEPbQ9`) |
| From | `notifications@creativehotline.com` |
| To | `soscreativehotline@gmail.com` |
| Subject | `={{ "[" + $json.severity + "] n8n Error: " + $json.workflowName }}` |

**HTML Template:**

```html
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background-color:{{ $json.severity === 'CRITICAL' ? '#DC2626' : '#F59E0B' }};color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
    <h2 style="margin:0;">{{ $json.severity }}: Workflow Error</h2>
  </div>
  <div style="border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;font-weight:bold;width:140px;vertical-align:top;">Workflow:</td>
        <td style="padding:8px 0;">{{ $json.workflowName }}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:bold;vertical-align:top;">Failed Node:</td>
        <td style="padding:8px 0;"><code>{{ $json.failedNode }}</code></td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:bold;vertical-align:top;">Error:</td>
        <td style="padding:8px 0;color:#DC2626;">{{ $json.errorMessage }}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:bold;vertical-align:top;">Error Type:</td>
        <td style="padding:8px 0;">{{ $json.errorType }}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:bold;vertical-align:top;">Trigger Mode:</td>
        <td style="padding:8px 0;">{{ $json.mode }}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:bold;vertical-align:top;">Timestamp:</td>
        <td style="padding:8px 0;">{{ $json.timestamp }}</td>
      </tr>
    </table>
    <p style="text-align:center;margin:24px 0 8px;">
      <a href="{{ $json.executionUrl }}" style="background-color:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">View Execution in n8n</a>
    </p>
  </div>
</div>
```

---

## Setup Instructions

### Step 1: Create the Error Handler Workflow

1. In n8n Cloud UI → New Workflow → Name: "Creative Hotline - Error Handler"
2. Add nodes: Error Trigger → Format Error Details (Code) → Send Alert Email
3. Copy the code and HTML template from above
4. Configure SMTP credential on the email node
5. Save and **activate** the workflow

### Step 2: Connect All Workflows to the Error Handler

For each of the 7 active workflows:

1. Open the workflow in n8n Cloud UI
2. Click the **Settings** tab (gear icon in the top bar)
3. Under "Error Workflow", select "Creative Hotline - Error Handler"
4. Save the workflow

**Workflows to connect:**
- WF1: Stripe Purchase → Calendly (`AMSvlokEAFKvF_rncAFte`)
- WF2: Calendly Booking → Payments Update (`Wt7paQoH2EICMtUG`)
- WF3: Tally Intake → Claude Analysis (`ETKIfWOX-eciSJQQF7XX5`)
- WF4: Laylo Subscriber → Notion (`MfbV3-F5GiMwDs1KD5AoK`)
- WF5: Paid But Never Booked (`clCnlUW1zjatRHXE`)
- WF6: Booked But No Intake (`Esq2SMGEy6LVHdIQ`)
- WF7: Laylo Lead Nurture (`VYCokTqWGAFCa1j0`)

### Step 3: Test

1. Open any workflow in test mode
2. Send invalid data to trigger an error
3. Verify the alert email arrives at `soscreativehotline@gmail.com`

---

## n8n Starter Plan Note

The error handler counts as an active workflow. On the Starter plan (5 active workflows), this is tight. If on Pro plan, no issue. If consolidating workflows to fit Starter, the error handler should be considered essential and kept active.

---

## Severity Classification

| Severity | Workflows | Rationale |
|----------|-----------|-----------|
| **CRITICAL** | WF1 (Stripe), WF2 (Calendly), WF3 (Tally) | Revenue pipeline — customer paid but might not get their email/booking/analysis |
| **WARNING** | WF4 (Laylo), WF5/6/7 (Follow-ups) | Lead nurture — important but not revenue-blocking |

---

## Future Enhancements

- Add Slack webhook for real-time alerts (if team adopts Slack)
- Add daily digest: summarize all errors from the past 24 hours
- Add automatic retry logic for transient errors (rate limits, timeouts)
- Track error frequency in a Notion "Error Log" database for pattern analysis
