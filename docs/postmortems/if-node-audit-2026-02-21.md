# IF Node Audit — All 7 Active Workflows

**Date:** 2026-02-21
**Method:** Pulled all 7 workflows via n8n MCP, inspected every IF node's `conditions` parameter
**Purpose:** Check for blank or misconfigured IF conditions that could cause the empty-routing bug documented in `empty-if-condition-bug.md`

---

## Results

| WF | IF Node Name | Condition Type | Condition | Verdict |
|----|-------------|---------------|-----------|---------|
| WF1 | Has Phone Number? | `string` / `isNotEmpty` | `$json.phone` is not empty | **OK** — proper positive check |
| WF2 | *(none)* | N/A | Linear flow, no IF node | **OK** |
| WF3 | Upsell Detected? | `boolean` / `equal` | `$json.upsell_detected` equals `true` | **MINOR RISK** — see notes |
| WF4 | *(none)* | N/A | Linear flow, no IF node | **OK** |
| WF5 | Any Results? | `string` / `exists` | `$json.email` exists | **FIXED** — Cowork updated 2026-02-21 |
| WF6 | Any Results? | `string` / `exists` | `$json.email` exists | **FIXED** — Cowork updated 2026-02-20 |
| WF7 | Any Leads to Nurture? | `string` / `exists` | `$json.email` exists | **FIXED** — Cowork updated 2026-02-21 |

---

## Detailed Findings

### WF1: Has Phone Number? — OK

```json
{
  "conditions": {
    "string": [{
      "value1": "={{$json.phone}}",
      "operation": "isNotEmpty"
    }]
  }
}
```

This is a proper positive check. If `$json.phone` has a value, route to SMS subscribe; otherwise route to email-only subscribe. No risk of empty-routing.

### WF3: Upsell Detected? — MINOR RISK

```json
{
  "conditions": {
    "boolean": [{
      "value1": "={{$json.upsell_detected}}",
      "value2": true
    }]
  }
}
```

The `upsell_detected` field is set by the Extract Claude Response node as:
```
={{ $json.content[0].text.includes('Upsell: Yes') }}
```

This evaluates to the **string** `"true"` or `"false"` (not a boolean). n8n's boolean condition may coerce string `"true"` to boolean `true`, which works. However:

- If the Claude API call fails and returns no `content[0].text`, the expression evaluates to `undefined` or throws
- The `onError: "continueRegularOutput"` on the Claude node means failures pass through with error data
- In that case, `upsell_detected` would be `undefined`, and `undefined == true` → `false` → routes to false branch

**Verdict:** Low risk. Worst case: a failed Claude call skips the upsell alert, which is acceptable. But the hardcoded API key (separate issue) makes Claude failures more likely.

### WF5: Any Results? — FIXED (2026-02-21)

```json
{
  "conditions": {
    "conditions": [{
      "id": "18b89922-b8c1-4e97-a891-c9b6c4646734",
      "leftValue": "={{ $json.email }}",
      "operator": { "type": "string", "operation": "exists", "singleValue": true }
    }],
    "combinator": "and"
  }
}
```

**Previously** used `boolean` / `!$json._empty` which caused empty-routing bugs. Cowork updated to match WF6's `string` / `exists` pattern. `updatedAt: 2026-02-21T00:31:36.769Z`.

### WF7: Any Leads to Nurture? — FIXED (2026-02-21)

```json
{
  "conditions": {
    "conditions": [{
      "id": "6f693535-79f3-42ec-88dc-da6b4c408e7d",
      "leftValue": "={{ $json.email }}",
      "operator": { "type": "string", "operation": "exists", "singleValue": true }
    }],
    "combinator": "and"
  }
}
```

**Previously** used `boolean` / `!$json._empty` which relied on the Code node's `_empty` sentinel. Cowork updated to match WF6's pattern. `updatedAt: 2026-02-21T00:28:13.655Z`.

---

## Summary

| Status | Count | Workflows |
|--------|-------|-----------|
| **OK** | 6 | WF1, WF2, WF4, WF5, WF6, WF7 |
| **Minor risk** | 1 | WF3 (upsell boolean coercion) |
| **Buggy (needs fix)** | 0 | — |

All IF node bugs have been resolved. WF6 was fixed first by Cowork on 2026-02-20, then WF5 and WF7 were fixed on 2026-02-21 using the same pattern.
