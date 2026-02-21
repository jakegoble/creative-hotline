# Dedup Checkbox Wiring Spec — WF5, WF6, WF7

**Date:** 2026-02-21
**Status:** Partially implemented — filter side done for WF5+WF6, "Mark Sent" nodes still needed for all 3
**Prerequisite:** Notion checkboxes already exist (added 2026-02-20)

---

## Problem

The three follow-up workflows send reminder emails daily to every matching record. There's no "already sent" flag, so the same customer gets the same email every day until their status changes.

| Workflow | Email Type | Spam Window |
|----------|-----------|-------------|
| WF5 | Booking reminder | Every day from 48hrs post-payment until they book |
| WF6 | Intake reminder | Every day from 24hrs pre-call until they submit (including past-due) |
| WF7 | Nurture email | Every day for days 3-7 after Laylo signup (5 consecutive days) |

---

## Solution

Each workflow needs two changes:

1. **Filter code:** Skip records where the checkbox is already `true`
2. **After email send:** Set the checkbox to `true` via a Notion Update node

### Notion Checkboxes (Already Exist)

| Workflow | Checkbox Property | DB |
|----------|------------------|-----|
| WF5 | `Booking Reminder Sent` | Payments |
| WF6 | `Intake Reminder Sent` | Payments |
| WF7 | `Nurture Email Sent` | Payments |

---

## WF5: Paid But Never Booked

### Change 1: Update Filter Code — DONE (Cowork, 2026-02-21)

~~In the "Filter Stale Unbookeds" Code node, add a checkbox check after the status check:~~

Live code now includes `if (props['Booking Reminder Sent']?.checkbox) continue;` — verified via n8n MCP pull.

```javascript
// ADD after: if (status !== 'Paid - Needs Booking') continue;

// Skip if reminder already sent
const reminderSent = props['Booking Reminder Sent']?.checkbox === true;
if (reminderSent) continue;
```

**Full updated code:**

```javascript
const now = new Date();
const cutoff = new Date(now.getTime() - (48 * 60 * 60 * 1000));
const results = [];

for (const item of $input.all()) {
  const props = item.json.properties || item.json;

  const status = props['Status']?.select?.name || '';
  if (status !== 'Paid - Needs Booking') continue;

  // Skip if reminder already sent
  const reminderSent = props['Booking Reminder Sent']?.checkbox === true;
  if (reminderSent) continue;

  let paymentDate = props['Payment Date']?.date?.start || null;
  if (!paymentDate) continue;

  const pDate = new Date(paymentDate);
  if (pDate >= cutoff) continue;

  const name = props['Client Name']?.title?.[0]?.plain_text || 'there';
  const email = props['Email']?.email || '';
  if (!email) continue;

  results.push({
    json: {
      name: name,
      email: email,
      payment_date: paymentDate,
      hours_ago: Math.round((now - pDate) / (60*60*1000)),
      page_id: item.json.id
    }
  });
}

return results;
```

### Change 2: Add "Mark Reminder Sent" Node

Add a new Notion Update node **after** "Send Booking Reminder" and **before** "Alert Team":

**Node: Mark Booking Reminder Sent**

| Setting | Value |
|---------|-------|
| Type | `n8n-nodes-base.notion` |
| Operation | `update` (databasePage) |
| Page ID | `={{ $json.page_id }}` |
| Property | `Booking Reminder Sent` = `true` (checkbox) |
| Credential | Notion API (`rzufpLxiRLvvNq4Z`) |
| Error handling | `continueRegularOutput` |

**Updated connection:**
```
Filter Stale Unbookeds → Any Results?
  → [true] → Send Booking Reminder → Mark Booking Reminder Sent (NEW) → Alert Team
  → [false] → (end)
```

---

## WF6: Booked But No Intake

### Change 1: Update Filter Code — DONE (Cowork, 2026-02-21)

~~In the "Filter Needs Intake" Code node, add a checkbox check:~~

Live code now includes `if (props['Intake Reminder Sent']?.checkbox) continue;` — verified via n8n MCP pull.

```javascript
// ADD after: if (status !== 'Booked - Needs Intake') continue;

// Skip if reminder already sent
const reminderSent = props['Intake Reminder Sent']?.checkbox === true;
if (reminderSent) continue;
```

**Full updated code:**

```javascript
const now = new Date();
const results = [];

for (const item of $input.all()) {
  const props = item.json.properties || item.json;
  const status = props['Status']?.select?.name || '';
  if (status !== 'Booked - Needs Intake') continue;

  // Skip if reminder already sent
  const reminderSent = props['Intake Reminder Sent']?.checkbox === true;
  if (reminderSent) continue;

  let callDate = props['Call Date']?.date?.start || null;
  if (!callDate) continue;

  const cDate = new Date(callDate);
  const hoursUntilCall = (cDate - now) / (60*60*1000);
  if (hoursUntilCall > 24) continue;

  const name = props['Client Name']?.title?.[0]?.plain_text || 'there';
  const email = props['Email']?.email || '';
  if (!email) continue;

  const isPastDue = hoursUntilCall < 0;

  results.push({
    json: {
      name: name,
      email: email,
      call_date: callDate,
      hours_until_call: Math.round(hoursUntilCall),
      is_past_due: isPastDue,
      page_id: item.json.id
    }
  });
}

return results;
```

### Change 2: Add "Mark Reminder Sent" Node

**Node: Mark Intake Reminder Sent**

| Setting | Value |
|---------|-------|
| Type | `n8n-nodes-base.notion` |
| Operation | `update` (databasePage) |
| Page ID | `={{ $json.page_id }}` |
| Property | `Intake Reminder Sent` = `true` (checkbox) |
| Credential | Notion API (`rzufpLxiRLvvNq4Z`) |
| Error handling | `continueRegularOutput` |

**Updated connection:**
```
Filter Needs Intake → Any Results?
  → [true] → Send Intake Reminder → Mark Intake Reminder Sent (NEW) → Alert Team
  → [false] → (end)
```

---

## WF7: Laylo Lead Nurture

### Change 1: Update Filter Code

In the "Filter 3-Day Old Laylo Leads" Code node, add a checkbox check:

```javascript
// ADD after: if (status !== 'Lead - Laylo') continue;

// Skip if nurture already sent
const nurtureSent = props['Nurture Email Sent']?.checkbox === true;
if (nurtureSent) continue;
```

**Full updated code:**

```javascript
const now = new Date();
const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
const results = [];

for (const item of $input.all()) {
  const props = item.json.properties || item.json;
  const status = props['Status']?.select?.name || '';
  if (status !== 'Lead - Laylo') continue;

  // Skip if nurture already sent
  const nurtureSent = props['Nurture Email Sent']?.checkbox === true;
  if (nurtureSent) continue;

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
      name: name,
      email: email,
      days_old: daysOld,
      page_id: item.json.id
    }
  });
}

return results;
```

### Change 2: Add "Mark Nurture Sent" Node

**Node: Mark Nurture Email Sent**

| Setting | Value |
|---------|-------|
| Type | `n8n-nodes-base.notion` |
| Operation | `update` (databasePage) |
| Page ID | `={{ $json.page_id }}` |
| Property | `Nurture Email Sent` = `true` (checkbox) |
| Credential | Notion API (`rzufpLxiRLvvNq4Z`) |
| Error handling | `continueRegularOutput` |

**Updated connection:**
```
Filter 3-Day Old Laylo Leads → Any Leads to Nurture?
  → [true] → Send Nurture Email → Mark Nurture Email Sent (NEW) → Alert Team
  → [false] → (end)
```

---

## Implementation Order

1. **WF7 first** (highest spam risk — 5 emails per lead)
2. **WF5 second** (daily reminders until booking)
3. **WF6 third** (already has Cowork's improved IF node)

All changes must be made in the n8n Cloud UI — the MCP does not support workflow editing.

---

## Testing

For each workflow after wiring:

1. **Create a test record** in Notion with the matching status and no checkbox
2. **Run the workflow manually** (test mode in n8n)
3. **Verify:** Email sent AND checkbox set to `true`
4. **Run again** — verify the record is now skipped (no duplicate email)
5. **Clean up** — reset the checkbox for the test record

---

## Edge Case: Reset After Status Change

When a customer progresses (e.g., books their call → status changes from "Paid - Needs Booking" to "Booked - Needs Intake"), the `Booking Reminder Sent` checkbox stays `true` — but that's fine because the filter already requires `Status = 'Paid - Needs Booking'`. The checkbox only needs resetting if a customer somehow cycles back to the same status, which shouldn't happen in normal flow.
