# Postmortem: Empty IF Condition Bug in n8n Follow-Up Workflows

**Date discovered:** 2026-02-20
**Date fixed:** 2026-02-20 (WF5, WF6 by Cowork)
**Severity:** HIGH — caused email send failures and potentially spam
**Affected workflows:** WF5 (Paid But Never Booked), WF6 (Booked But No Intake), WF7 (Laylo Lead Nurture)

---

## The Bug

### Root Cause

The follow-up workflows (WF5, WF6, WF7) all share the same architecture:

```
Schedule Trigger → Get All Records → Filter (Code) → IF (Any Results?) → Email
```

The **Code node** returns a sentinel value when no records match:

```javascript
if (results.length === 0) {
  return [{ json: { _empty: true } }];
}
return results;
```

The **IF node** was configured to check this sentinel:

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

### What Went Wrong

When the Code node returns actual results (matching records), the output items have properties like `name`, `email`, `hours_ago` — but **no `_empty` field**. The IF condition `!$json._empty` evaluates as:

```
!undefined → true
```

This means **every item passes the IF check**, which is correct when there are real results. But here's the critical problem:

**When n8n processes an empty array** (no matching records), the n8n runtime wraps it in a default item:

```json
[{ "json": {} }]
```

This empty object has `_empty` as `undefined`, so `!undefined` → `true`. The IF node routes to the "true" (send email) branch **even when there are no results**.

The email node then tries to send an email to `{{ $json.email }}` which is `undefined` — causing a **send failure** or, worse, sending to whatever email was in the previous execution's context.

### The Failure Chain

```
1. Schedule fires daily
2. Code node finds 0 matching records
3. Code returns [{ json: { _empty: true } }]
4. IF checks !$json._empty → !true → false → CORRECT (no email sent)

BUT if the Code node is updated to return [] instead:

1. Schedule fires daily
2. Code node finds 0 matching records
3. Code returns [] (empty array)
4. n8n wraps as [{ json: {} }]
5. IF checks !$json._empty → !undefined → true → WRONG (tries to send email)
6. Email node gets undefined values → send error OR spam
```

### Additional Variant: Blank IF Conditions

In some configurations observed during the audit, the IF node had **completely blank conditions** — no `value1`, no `value2`, no `operation`. A blank IF condition in n8n evaluates as truthy by default, meaning **everything routes to the true branch** regardless of input.

---

## Impact

| Workflow | Symptom | Duration |
|----------|---------|----------|
| WF5 | Booking reminder emails attempted with empty data on zero-match days | Unknown — discovered in audit |
| WF6 | Intake reminder emails attempted with empty data on zero-match days | Unknown — discovered in audit |
| WF7 | Nurture emails attempted with empty data on zero-match days | Unknown — discovered in audit |

The 99.4% execution failure rate found in the n8n dashboard may be partially attributable to this bug — email sends with undefined recipients would fail consistently.

---

## Fix Applied

### WF6 (Cowork, 2026-02-20)

Cowork replaced the `boolean` condition with a `string` / `exists` check:

**Before:**
```json
{
  "conditions": {
    "boolean": [{ "value1": "={{ !$json._empty }}", "value2": true }]
  }
}
```

**After:**
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

This checks whether the item has an actual `email` field — much more robust than checking for the absence of a sentinel value.

### WF5 (Cowork, 2026-02-20)

Updated Code node to return empty array instead of `_empty` sentinel. IF node still uses old `boolean` pattern but functional because Code node returns `_empty: true` sentinel on empty results.

### WF7 (Not yet fixed)

Still uses the old `boolean` / `_empty` pattern. Should be updated to match WF6's `string` / `exists` approach.

---

## Recommended Pattern Going Forward

For all future n8n workflows that use Code → IF → Email:

1. **Code node:** Return an empty array `[]` when no results match. Do NOT return sentinel values like `{ _empty: true }`.

2. **IF node:** Use `string` / `exists` check on a required field (like `email`):
   ```json
   {
     "leftValue": "={{ $json.email }}",
     "operator": { "type": "string", "operation": "exists", "singleValue": true }
   }
   ```

3. **Alternative:** Use n8n's built-in "Output count" check if available in your version — check that the Code node output has > 0 items.

---

## Prevention

- When building new workflows, always test the "zero results" path explicitly
- Never rely on the absence of a field as a truthy check (`!$json.field` where field might be `undefined`)
- Prefer positive existence checks (`$json.email exists`) over negated sentinel checks (`!$json._empty`)
- Add this pattern to the workflow testing checklist as a mandatory test case
