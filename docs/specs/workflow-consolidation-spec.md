# WF5+WF6+WF7 Consolidation Spec — "Daily Follow-Ups"

**Date:** 2026-02-21
**Status:** Spec only — for implementation when upgrading to Starter plan
**Purpose:** Merge 3 follow-up workflows into 1 to fit within n8n Starter plan's 5-active-workflow limit

---

## Problem

n8n Starter plan (€24/mo) allows **5 active workflows**. Current state:

| # | Workflow | Status |
|---|----------|--------|
| WF1 | Stripe Purchase → Calendly | Active (required) |
| WF2 | Calendly Booking → Payments Update | Active (required) |
| WF3 | Tally Intake → Claude Analysis | Active (required) |
| WF4 | Laylo Subscriber → Notion | Active (required) |
| WF5 | Follow Up: Paid But Never Booked | Active |
| WF6 | Follow Up: Booked But No Intake | Active |
| WF7 | Follow Up: Laylo Lead Nurture | Active |
| ~~WF8~~ | ~~Calendly → Tally~~ | Deleted by Cowork (Feb 21) |
| ~~WF9~~ | ~~Post-Call Follow-Up~~ | Deleted by Cowork (Feb 21) |

With WF8+WF9 deleted: **7 active workflows**, still 2 over the limit.

**Solution:** Consolidate WF5+WF6+WF7 into a single "Daily Follow-Ups" workflow = **5 active workflows** (exactly at limit).

---

## Architecture

### Current: 3 Separate Workflows

```
WF5: Schedule 9am → Get All Payments → Filter (48hr stale) → IF → Email + Alert
WF6: Schedule 8am → Get All Payments → Filter (24hr pre-call) → IF → Email + Alert
WF7: Schedule 10am → Get All Leads → Filter (3-7 day old) → IF → Email + Alert
```

**Waste:** All 3 query the same Notion Payments DB. WF5 and WF6 use identical `getAll` calls.

### Proposed: 1 Combined Workflow

```
Daily Follow-Ups (8am)
  └─→ Get All Payments (single Notion call)
        ├─→ Filter: Paid But Never Booked (Code)
        │     └─→ Has Unbooked? (IF: $json.email exists)
        │           └─→ [true] Send Booking Reminder → Mark Booking Sent → Alert Team
        │
        ├─→ Filter: Booked But No Intake (Code)
        │     └─→ Has No Intake? (IF: $json.email exists)
        │           └─→ [true] Send Intake Reminder → Mark Intake Sent → Alert Team
        │
        └─→ Filter: Laylo Lead Nurture (Code)
              └─→ Has Leads? (IF: $json.email exists)
                    └─→ [true] Send Nurture Email → Mark Nurture Sent → Alert Team
```

### Key Design Decisions

1. **Single trigger at 8am** — All follow-ups run once daily. The staggered 8am/9am/10am times were arbitrary.
2. **Single Notion getAll call** — All 3 filters read from the same result set. Saves 2 API calls per run.
3. **Parallel branches** — After the single getAll, three independent filter+email branches run in parallel using n8n's connection fan-out.
4. **Same IF pattern** — All 3 branches use `string` / `exists` on `$json.email` (the pattern Cowork standardized).
5. **Include "Mark Sent" nodes** — Add the dedup Notion Update nodes that are currently missing in the separate workflows.

---

## Node-by-Node Spec

### Node 1: Daily Follow-Up Check (Schedule Trigger)

```json
{
  "rule": {
    "interval": [{
      "field": "cronExpression",
      "expression": "0 8 * * *"
    }]
  }
}
```

### Node 2: Get All Payments (Notion)

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

### Branch A: Paid But Never Booked

#### Node 3A: Filter Stale Unbookeds (Code)

```javascript
const now = new Date();
const cutoff = new Date(now.getTime() - (48 * 60 * 60 * 1000));
const results = [];

for (const item of $input.all()) {
  const props = item.json.properties || item.json;
  const status = props['Status']?.select?.name || '';
  if (status !== 'Paid - Needs Booking') continue;
  if (props['Booking Reminder Sent']?.checkbox) continue;

  let paymentDate = props['Payment Date']?.date?.start || null;
  if (!paymentDate) continue;

  const pDate = new Date(paymentDate);
  if (pDate >= cutoff) continue;

  const name = props['Client Name']?.title?.[0]?.plain_text || 'there';
  const email = props['Email']?.email || '';
  if (!email) continue;

  results.push({
    json: {
      name, email,
      payment_date: paymentDate,
      hours_ago: Math.round((now - pDate) / (60*60*1000)),
      page_id: item.json.id,
      follow_up_type: 'booking_reminder'
    }
  });
}

return results;
```

#### Node 4A: Has Unbooked? (IF)

`string` / `exists` on `$json.email`

#### Node 5A: Send Booking Reminder (Email)

From: `hello@creativehotline.com`
To: `{{ $json.email }}`
Subject: `Your Creative Hotline call is waiting!`
HTML: (same as current WF5)

#### Node 6A: Mark Booking Reminder Sent (Notion Update) — NEW

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
  },
  "onError": "continueRegularOutput"
}
```

#### Node 7A: Alert Team - Unbooked (Email)

From: `notifications@creativehotline.com`
To: team list
Subject: `Unbooked Client: {{ $json.name }} ({{ $json.hours_ago }}hrs since payment)`

### Branch B: Booked But No Intake

#### Node 3B: Filter Needs Intake (Code)

```javascript
const now = new Date();
const results = [];

for (const item of $input.all()) {
  const props = item.json.properties || item.json;
  const status = props['Status']?.select?.name || '';
  if (status !== 'Booked - Needs Intake') continue;
  if (props['Intake Reminder Sent']?.checkbox) continue;

  let callDate = props['Call Date']?.date?.start || null;
  if (!callDate) continue;

  const cDate = new Date(callDate);
  const hoursUntilCall = (cDate - now) / (60*60*1000);
  if (hoursUntilCall > 24) continue;

  const name = props['Client Name']?.title?.[0]?.plain_text || 'there';
  const email = props['Email']?.email || '';
  if (!email) continue;

  results.push({
    json: {
      name, email,
      call_date: callDate,
      hours_until_call: Math.round(hoursUntilCall),
      is_past_due: hoursUntilCall < 0,
      page_id: item.json.id,
      follow_up_type: 'intake_reminder'
    }
  });
}

return results;
```

#### Node 4B: Has No Intake? (IF)

`string` / `exists` on `$json.email`

#### Node 5B: Send Intake Reminder (Email)

From: `hello@creativehotline.com`
To: `{{ $json.email }}`
Subject: `Quick prep before your Creative Hotline call!`
HTML: (same as current WF6, with Tally URL `https://tally.so/r/b5W1JE`)

#### Node 6B: Mark Intake Reminder Sent (Notion Update) — NEW

Same pattern as 6A but sets `Intake Reminder Sent` checkbox.

#### Node 7B: Alert Team - Missing Intake (Email)

From: `notifications@creativehotline.com`
Subject: `Missing Intake: {{ $json.name }} (call in {{ $json.hours_until_call }}hrs)`

### Branch C: Laylo Lead Nurture

#### Node 3C: Filter Laylo Leads (Code)

```javascript
const now = new Date();
const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
const results = [];

for (const item of $input.all()) {
  const props = item.json.properties || item.json;
  const status = props['Status']?.select?.name || '';
  if (status !== 'Lead - Laylo') continue;
  if (props['Nurture Email Sent']?.checkbox) continue;

  const createdTime = item.json.created_time || null;
  if (!createdTime) continue;

  const created = new Date(createdTime);
  const daysOld = Math.round((now - created) / (24*60*60*1000));
  if (created > threeDaysAgo || created < sevenDaysAgo) continue;

  const name = props['Client Name']?.title?.[0]?.plain_text || 'there';
  const email = props['Email']?.email || '';
  if (!email) continue;

  results.push({
    json: {
      name, email,
      days_old: daysOld,
      page_id: item.json.id,
      follow_up_type: 'nurture'
    }
  });
}

return results;
```

#### Node 4C: Has Leads? (IF)

`string` / `exists` on `$json.email`

#### Node 5C: Send Nurture Email (Email)

From: `hello@creativehotline.com`
Subject: `Ready to solve your creative challenge?`
HTML: (same as current WF7, with correct `thecreativehotline.com` URL)

#### Node 6C: Mark Nurture Email Sent (Notion Update) — NEW

Same pattern as 6A but sets `Nurture Email Sent` checkbox.

#### Node 7C: Alert Team - Nurture (Email)

From: `notifications@creativehotline.com`
Subject: `Laylo Lead Nurtured: {{ $json.name }} ({{ $json.days_old }} days old)`

---

## Connection Map

```
Daily Follow-Up Check
  └─→ Get All Payments
        ├─→ Filter Stale Unbookeds → Has Unbooked? → [true] → Send Booking Reminder → Mark Booking Sent → Alert Team (Unbooked)
        ├─→ Filter Needs Intake → Has No Intake? → [true] → Send Intake Reminder → Mark Intake Sent → Alert Team (Intake)
        └─→ Filter Laylo Leads → Has Leads? → [true] → Send Nurture Email → Mark Nurture Sent → Alert Team (Nurture)
```

**Total nodes:** 1 trigger + 1 Notion getAll + 3×(Code + IF + Email + Notion Update + Email) = **17 nodes**
vs. current: 3×(trigger + Notion + Code + IF + 2×Email) = **18 nodes** across 3 workflows

---

## Migration Steps

1. **Build the consolidated workflow** in n8n using the spec above
2. **Test each branch** independently using test mode:
   - Create a test record matching each filter
   - Verify email sends AND checkbox gets set
   - Verify re-run skips the record
3. **Activate the consolidated workflow**
4. **Deactivate WF5, WF6, WF7** (keep them inactive as backups, don't delete)
5. ~~**Deactivate WF8 and WF9**~~ — Already deleted by Cowork (Feb 21)
6. **Verify active count:** WF1 + WF2 + WF3 + WF4 + Daily Follow-Ups = **5 active**

---

## Advantages

- Fits Starter plan 5-workflow limit (no need for Pro at €60/mo)
- Single Notion API call instead of 3 (reduces API usage)
- Includes "Mark Sent" dedup nodes from the start
- All follow-up logic in one place for easier maintenance
- Single 8am trigger instead of staggered times

## Risks

- Larger workflow = harder to debug individual branches
- If one branch errors, it could affect the others (mitigated by `continueRegularOutput` on all external nodes)
- n8n's parallel branch execution order isn't guaranteed (but order doesn't matter here)

---

## Alternative: Upgrade to Pro

If €60/mo is acceptable, skip consolidation and keep separate workflows:
- Pro plan: 15+ active workflows
- Simpler to maintain individual workflows
- Can also add the Error Handler workflow as a 6th active workflow

**Recommendation:** Start with Starter + consolidation. Upgrade to Pro when revenue justifies it.
