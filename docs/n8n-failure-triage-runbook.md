# n8n Failure Triage Runbook

**Date:** 2026-02-21
**Context:** 178+ failed executions discovered during Feb 2026 audit (99.4% failure rate). This runbook documents how to diagnose and fix n8n workflow failures.

---

## Step 1: Check Execution Log

1. Open https://creativehotline.app.n8n.cloud
2. Go to **Executions** (left sidebar)
3. Filter by **Status: Error** and the relevant time range
4. Note: Most "failures" may be test-mode executions or webhook pings with no payload — check the error message before panicking

### Common Execution Log Patterns

| Pattern | Meaning | Action |
|---------|---------|--------|
| Large batch of failures at same time | Test runs or webhook retries | Likely harmless — check payload |
| Failures only on WF5/WF6/WF7 | Schedule trigger ran but no matching records | Normal — empty Code node output triggers IF false branch |
| "ERROR" on webhook workflow | External service sent bad/empty payload | Check the payload in execution detail |
| Single failure on WF1 | Stripe webhook retry with duplicate event | Add dedup guard (see fix spec) |

---

## Step 2: Identify the Failing Node

1. Click on the failed execution
2. n8n highlights the failing node in red
3. Click the node to see the error message and input data

### Common Failing Nodes

| Node Type | Common Error | Root Cause | Fix |
|-----------|-------------|------------|-----|
| `notion` (create/update) | "Property type mismatch" | Workflow sends `select` but Notion expects `rich_text` (or vice versa) | Match the `key` type suffix to Notion's actual property type |
| `notion` (create/update) | "Select option not found" | Workflow tries to set a select value that doesn't exist in Notion | Add the option in Notion or map to an existing one |
| `notion` (getAll) | "Could not find database" | Database ID wrong or Notion integration not shared | Verify DB ID and sharing in Notion settings |
| `httpRequest` (Claude) | 401 Unauthorized | API key expired or wrong | Check/rotate the Claude API key |
| `httpRequest` (Claude) | 429 Rate Limited | Too many requests | Add retry logic or increase delay |
| `httpRequest` (Laylo) | Connection refused | Laylo API down or URL wrong | Check Laylo API status |
| `emailSend` | SMTP auth failure | SMTP credential expired | Re-authenticate SMTP in n8n credentials |
| `emailSend` | "No recipients defined" | Upstream node returned no email field | Check Code node filter — may have returned empty array |
| `if` | "Cannot read property of undefined" | Upstream node output doesn't have expected field | Check Code node output shape |
| `code` | JavaScript runtime error | Bug in filter logic | Check code in n8n editor, test with sample data |

---

## Step 3: Verify Notion Configuration

Many failures trace back to Notion type mismatches. Here's how to verify:

### Check Property Types

1. Open the Notion database in browser
2. Click a property header → **Edit property** → note the **Type**
3. Compare with the n8n node's `key` suffix:

| n8n Key Suffix | Notion Type | Match? |
|----------------|-------------|--------|
| `\|email` | email | Yes |
| `\|select` | select | Yes |
| `\|rich_text` | text / rich_text | Yes |
| `\|select` | rich_text | **NO — type mismatch** |
| `\|rich_text` | select | **NO — type mismatch** |
| `\|select` | multi_select | **NO — type mismatch** |

### Known Type Mismatches (as of Feb 2026)

| Workflow | Property | n8n Maps As | Notion Actual | Status |
|----------|----------|-------------|---------------|--------|
| WF3 | Role (Intake DB) | `select` | `rich_text` | Open |
| WF3 | Desired Outcome (Intake DB) | `select` | `multi_select` | Open |
| WF4 | Product Purchased (Payments DB) | `rich_text` | `select` | Open |

### Verify with Notion MCP

```
# From Claude Code CLI:
mcp__claude_ai_Notion__notion-search  # Find database
mcp__claude_ai_Notion__notion-fetch   # Get database schema
```

---

## Step 4: Verify Node Configuration

### Check for Empty Parameters

In n8n MCP exports, `textContent: ""` in rich_text nodes is a serialization artifact — the actual runtime value comes from the bound expression. To verify:

1. Open the workflow in n8n editor
2. Click the node
3. Check if the field shows an expression (orange icon) vs static text
4. If expression: the empty export is fine (runtime evaluates it)
5. If no expression: the field is genuinely empty — fix it

### Check IF Node Conditions

All follow-up IF nodes should use this pattern:
```json
{
  "leftValue": "={{ $json.email }}",
  "operator": { "type": "string", "operation": "exists", "singleValue": true }
}
```

**Do NOT** use the old pattern: `"value1": "={{ !$json._empty }}"` — this fails when the Code node returns an empty array instead of `{_empty: true}`.

### Check Code Node Output

Run the workflow in test mode and verify the Code node:
- Returns `[]` (empty array) when no records match — not `[{_empty: true}]`
- Returns `[{json: {email: "...", name: "...", ...}}]` when records match
- Includes `page_id` in output (needed for "Mark Sent" nodes)

---

## Step 5: Test Fixes

### In n8n Test Mode

1. Open the workflow in n8n editor
2. Click **Test workflow** (play button)
3. For webhook workflows: use the **Test URL** (not production URL) and send a sample payload
4. For schedule workflows: click the trigger node and run manually
5. Check each node's output by clicking on it

### Test Payloads

See `docs/test-payloads.md` for sample webhook payloads for each workflow.

### Verify in Notion

After running a test:
1. Check Notion Payments/Intake DB for the test record
2. Verify all fields populated correctly
3. Verify status is correct
4. Clean up: delete test records or mark them clearly

---

## Step 6: Common Fix Patterns

### Fix 1: Type Mismatch

```
# Before (wrong):
"key": "Role|select", "selectValue": "={{ $json.role }}"

# After (correct):
"key": "Role|rich_text", "textContent": "={{ $json.role }}"
```

### Fix 2: Missing Error Handling

Add `continueRegularOutput` to any node calling an external service:
```json
{ "onError": "continueRegularOutput" }
```

This prevents one node's failure from killing the entire workflow.

### Fix 3: IF Node Pattern

Replace old boolean pattern with string exists:
```json
{
  "conditions": {
    "conditions": [{
      "leftValue": "={{ $json.email }}",
      "operator": { "type": "string", "operation": "exists", "singleValue": true }
    }]
  }
}
```

### Fix 4: Dedup Guard

Add to Code node filter:
```javascript
if (props['Booking Reminder Sent']?.checkbox) continue;
```

Add "Mark Sent" Notion Update node after email send:
```json
{
  "resource": "databasePage",
  "operation": "update",
  "pageId": "={{ $json.page_id }}",
  "propertiesUi": {
    "propertyValues": [{
      "key": "Booking Reminder Sent|checkbox",
      "checkboxValue": true
    }]
  }
}
```

---

## Step 7: Escalation

If a failure can't be resolved:

1. **Document** the error in `docs/postmortems/` with: timestamp, workflow, node, error message, input data
2. **Deactivate** the workflow if it's causing customer-facing issues (spam emails, duplicate records)
3. **Notify team** via `notifications@creativehotline.com`
4. **Check n8n community** at https://community.n8n.io for similar issues

---

## Quick Reference: Workflow-Specific Issues

| Workflow | Most Likely Failure | Quick Fix |
|----------|-------------------|-----------|
| WF1 | Stripe webhook retry → duplicate record | Check if Stripe Session ID already exists before creating |
| WF2 | Email mismatch → Find Payment returns 0 | Add IF node to alert team when no match found |
| WF3 | Claude API timeout or rate limit | Check API key, add retry |
| WF4 | Laylo webhook with no email | Check payload — Laylo sometimes sends incomplete data |
| WF5 | No matches → IF false → ends normally | Not a real failure — expected behavior |
| WF6 | Past-due records fire forever | Add lower cutoff at -48 hours in filter code |
| WF7 | Same lead emailed 5 days straight | Wire dedup checkbox in filter code |
