# ManyChat ↔ n8n Integration Guide

**Date:** 2026-02-20
**Current state:** ManyChat operates independently. No data flows between ManyChat and n8n/Notion.
**Why this matters:** IG DM conversations and email captures in ManyChat are invisible to the CRM. If someone DMs on Instagram and later pays via Stripe, there's no attribution.

---

## Current ManyChat Setup

- **Plan:** Pro ($44/month)
- **Platform:** Instagram (@creative.hotline)
- **AI Replies:** ON (Knowledge Base with 5 entries)
- **AI Goals:** 2 live (Share Booking Link, Capture Email)
- **Automations:** 4 live (Welcome DM, Comment-to-DM, Story Mention Reply, Ice Breaker Menu)

Currently, ManyChat handles the Instagram conversation autonomously but does NOT:
- Create records in Notion
- Trigger n8n workflows
- Pass captured emails to the CRM
- Track whether a DM lead later converted

---

## Integration Architecture Options

### Option A: ManyChat External Request → n8n Webhook (Recommended)

ManyChat Pro includes "External Request" — an action that sends HTTP requests to any URL. Point it at an n8n webhook.

**Flow:**
```
Instagram DM → ManyChat AI captures email
  → External Request POST to n8n webhook
  → n8n creates/updates Notion record
  → n8n tags lead source as "IG DM"
```

**Setup Steps:**

1. **Create n8n webhook workflow:**
   - New workflow: "ManyChat Lead Capture"
   - Webhook node: POST `/webhook/manychat-lead`
   - Extract data: name, email, ig_handle, source
   - Check if email exists in Payments DB
   - If new: create record (Status = "Lead - IG DM", Lead Source = "IG DM")
   - If exists: update Lead Source if blank
   - Team notification

2. **Configure ManyChat External Request:**
   - In ManyChat automation (after "Capture Email" goal fires)
   - Action: External Request
   - Method: POST
   - URL: `https://creativehotline.app.n8n.cloud/webhook/manychat-lead`
   - Headers: `Content-Type: application/json`
   - Body:
   ```json
   {
     "email": "{{email}}",
     "name": "{{first_name}} {{last_name}}",
     "ig_handle": "{{ig_username}}",
     "source": "manychat_ai_goal",
     "subscriber_id": "{{id}}"
   }
   ```
   - Response mapping: Not needed (fire-and-forget)

3. **Important: Respond immediately**
   - The n8n webhook MUST respond to ManyChat within 10 seconds
   - Use "Respond to Webhook" as the first node after receiving
   - Then process asynchronously (Notion create, team alert)
   - ManyChat will show "Response is null" if processing takes >10s

**Pros:** Direct integration, no third-party tools, real-time, included in ManyChat Pro.
**Cons:** 10-second timeout limitation, requires careful error handling.

### Option B: ManyChat → Zapier/Make → n8n

Use Zapier or Make as a bridge if External Request proves unreliable.

**Flow:**
```
ManyChat event → Zapier webhook trigger → Zapier sends to n8n webhook
```

**Pros:** More reliable, handles retries, easier to debug.
**Cons:** Additional cost ($20-30/month for Zapier), adds latency, another tool to manage.

### Option C: ManyChat API (n8n polls or reacts)

n8n calls ManyChat's API to fetch subscriber data.

**Flow:**
```
n8n scheduled trigger (every hour)
  → GET ManyChat subscribers with tag "email_captured"
  → For each: create/update Notion record
  → Remove tag (or add "synced_to_crm" tag)
```

**Pros:** n8n controls the flow, no ManyChat config changes needed.
**Cons:** Not real-time (polling), ManyChat API rate limits, more complex.

---

## Recommended Implementation

### Phase 1: Basic Lead Capture (30 min)

Use Option A. Create a simple webhook that captures email + IG handle from ManyChat.

**n8n workflow spec:**

```
Node 1: ManyChat Webhook (webhook v2.1)
  - POST /webhook/manychat-lead
  - Respond immediately with { "status": "ok" }

Node 2: Extract Data (set v3.4)
  - email: $json.body.email
  - name: $json.body.name || $json.body.ig_handle
  - ig_handle: $json.body.ig_handle
  - source: "IG DM"
  - subscriber_id: $json.body.subscriber_id

Node 3: Check Existing (notion v2.2)
  - Query Payments DB where Email = extracted email
  - Limit 1

Node 4: Already Exists? (if v2)
  - True: Skip (or update Lead Source if blank)
  - False: Create new record

Node 5: Create Lead (notion v2.2)
  - Client Name: name or ig_handle
  - Email: email
  - Status: "Lead - IG DM" (new status option needed)
  - Lead Source: "IG DM"
  - Payment Amount: 0

Node 6: Team Alert (emailSend v2.1)
  - Subject: "New IG DM Lead: [name] (@ig_handle)"
```

**ManyChat config:**
1. Go to ManyChat → Automations
2. Edit the "Capture Email" goal success action
3. Add action: External Request
4. Configure POST to n8n webhook URL with subscriber fields

### Phase 2: Conversation Context (Future)

Pass conversation summary from ManyChat to n8n so the CRM has context about what the lead asked about.

### Phase 3: Bidirectional Sync (Future)

When a lead converts (pays via Stripe), n8n triggers ManyChat to send a congratulations DM and update the subscriber's tags.

---

## ManyChat Custom Fields to Map

| ManyChat Field | Notion Property | Notes |
|---------------|----------------|-------|
| `{{email}}` | Email | Primary key for matching |
| `{{first_name}} {{last_name}}` | Client Name | May be blank if not captured |
| `{{ig_username}}` | Website / IG | Store IG handle |
| `{{id}}` | (new field or metadata) | ManyChat subscriber ID for bidirectional sync |
| `{{phone}}` | Phone | If captured |

---

## Notion Changes Needed

1. **Add Lead Source option:** "IG DM" (if not already present — check current options)
2. **Consider adding Status option:** "Lead - IG DM" (or reuse "Lead - Laylo" pattern)
3. **Optional: Add ManyChat ID field** to Payments DB for bidirectional sync

---

## Known Integration Gotchas

1. **10-second timeout:** ManyChat External Request times out at 10s. n8n must respond immediately, then process async.
2. **Test vs Production:** External Request may behave differently in ManyChat test mode vs live. Always test with a real IG DM.
3. **Trial limitation:** External Request is blocked during ManyChat trial. Since you're on Pro ($44/mo), this shouldn't be an issue.
4. **Duplicate subscribers:** Same person may DM multiple times. Dedup on email in n8n before creating Notion records.
5. **Rate limits:** ManyChat API has rate limits. For Option C (polling), respect these.

---

## Attribution Tracking Improvement

With ManyChat → n8n in place, you can track:

| Source | Lead Source Value | How It's Set |
|--------|-----------------|-------------|
| IG DM (ManyChat) | "IG DM" | New ManyChat → n8n webhook |
| IG Keyword (Laylo) | "IG DM" | WF4 (needs fix — currently not set) |
| Website (Stripe) | "Website" or "Direct" | WF1 (needs fix — currently not set) |
| Referral | "Referral" | Manual or via UTM params |

This gives Jake full visibility into which channels are driving conversions.
