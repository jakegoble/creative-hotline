# WF1 Fix Specification: Stripe Product Mapping + Dedup Guard

**Workflow:** Creative Hotline - Stripe Purchase to Calendly (`AMSvlokEAFKvF_rncAFte`)
**Date:** February 20, 2026

---

## Problem 1: Product Purchased is Always Null

The Stripe `checkout.session.completed` webhook does **not** include `line_items` by default. The current Extract Data node maps:

```
product_name = $json.body.data.object.line_items.data[0].description
```

This is always `undefined` because `line_items` is not in the payload.

### Fix: Use Stripe Metadata Instead of line_items

The cleanest fix doesn't require an API call. Configure each Stripe Payment Link or Checkout Session to include product metadata.

**In Stripe Dashboard → Payment Links (or Checkout Sessions):**

Add metadata to each product:
- Key: `product_name`
- Value: `First Call` / `Standard Call` / `3-Session Clarity Sprint`

**Live Payment Links (Feb 20, 2026):**
- First Call ($499): `https://buy.stripe.com/14AaEQcDDaY43eFdT59ws00`
- Standard Call ($699): `https://buy.stripe.com/eVqbIUeLL1nu02t16j9ws02`
- 3-Session Clarity Sprint ($1,495): `https://buy.stripe.com/4gMcMY9rr2rycPfdT59ws03`

Then change the Extract Data mapping:

```
product_name = $json.body.data.object.metadata.product_name
```

**If you can't add metadata** (e.g., Stripe Payment Links don't support custom metadata on the link level), use this alternative:

### Alternative Fix: Price-Based Mapping Code Node

Add a Code node between Extract Data and Create Notion Lead that maps the `amount_total` to a product name.

**Node: Map Product from Amount**

```json
{
  "parameters": {
    "jsCode": "SEE BELOW"
  },
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "name": "Map Product from Amount",
  "position": [-312, -16]
}
```

```javascript
// Map Stripe amount to Notion Product Purchased value
// amount_total is in cents, already divided by 100 in Extract Data

const amount = $json.amount;
const metadata = $json.body?.data?.object?.metadata || {};

// Priority 1: Use metadata if available (best approach)
if (metadata.product_name) {
  $json.product_name = metadata.product_name;
  return [$input.item];
}

// Priority 2: Map by amount (fallback)
// Updated Feb 20, 2026 with live Stripe prices
const priceMap = {
  499: 'First Call',
  500: 'First Call',          // handle rounding
  699: 'Standard Call',
  700: 'Standard Call',       // handle rounding
  1495: '3-Session Clarity Sprint',
  1500: '3-Session Clarity Sprint',  // handle rounding
};

const mapped = priceMap[Math.round(amount)];

if (mapped) {
  $json.product_name = mapped;
} else {
  // Unknown amount — set a fallback and alert the team
  $json.product_name = 'First Call';
  $json._unknown_amount = true;
}

return [$input.item];
```

**Connection change:** Insert between "Extract Data" and "Create Notion Lead":
```
Extract Data → Map Product from Amount → Create Notion Lead
```

---

## Problem 2: No Duplicate Payment Guard

Stripe webhooks retry on failure (up to ~15 times over 72 hours). Each retry creates a new Notion record. The audit found 4 duplicate Jake Goble records from test checkouts.

### Fix: Check for Existing Record by Stripe Session ID

Add a Code node before "Create Notion Lead" that queries existing records.

**Option A (Recommended): Check by Stripe Session ID**

Add these nodes between "Map Product from Amount" and "Create Notion Lead":

#### Node: Get All Payments (for dedup)

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
  "name": "Get Existing Payments",
  "credentials": { "notionApi": { "id": "rzufpLxiRLvvNq4Z" } },
  "onError": "continueRegularOutput"
}
```

#### Node: Check Duplicate (Code)

```javascript
const stripeSessionId = $('Extract Data').item.json.stripe_session_id;
const existingPayments = $('Get Existing Payments').all();

let isDuplicate = false;

for (const item of existingPayments) {
  const props = item.json.properties || item.json;
  // Check Stripe Session ID
  const existingId = props['Stripe Session ID']?.rich_text?.[0]?.plain_text || '';
  if (existingId === stripeSessionId) {
    isDuplicate = true;
    break;
  }
}

return [{ json: { ...$input.item.json, _is_duplicate: isDuplicate } }];
```

#### Node: Is Duplicate? (IF)

- Condition: `$json._is_duplicate` equals `false`
- True: Continue to Create Notion Lead (new payment)
- False: Skip to Send Calendly Link (still send email, but don't create duplicate record)

**Updated connection:**
```
Extract Data → Map Product from Amount → Get Existing Payments → Check Duplicate → Is Duplicate?
  → FALSE (not duplicate): Create Notion Lead → Has Phone? → ... → Send Calendly Link → Team Notification
  → TRUE (duplicate): Send Calendly Link (skip to email — customer still needs their link)
```

---

## Problem 3: Lead Source Not Set

The Create Notion Lead node doesn't set Lead Source. For Stripe checkout purchases, this should be "Direct" (or could be derived from Stripe metadata if you track UTM parameters).

### Fix: Add Lead Source to Create Notion Lead

Add this to the propertiesUi.propertyValues array:

```json
{
  "key": "Lead Source|select",
  "selectValue": "Direct"
}
```

If you want to track where the payment came from (e.g., Instagram link vs website), add a `lead_source` metadata field to your Stripe Payment Links and map it:

```json
{
  "key": "Lead Source|select",
  "selectValue": "={{ $json.body?.data?.object?.metadata?.lead_source || 'Direct' }}"
}
```

---

## Problem 4: Email Template Not Frankie Voice

The current "Send Calendly Link" node uses a generic template with emoji subject line. Replace with the Frankie-voice template from [email-templates-frankie.md](email-templates-frankie.md) #1.

**Changes:**
- Subject: `"Your Creative Hotline Call — Book Your Session Now!"` → `"Let's get your call on the books"`
- Body: Replace generic HTML with Frankie template
- The template is already written and production-ready in the email templates doc

---

## Summary: All WF1 Changes

| Change | Type | Node Affected |
|--------|------|---------------|
| Product mapping from metadata/amount | New Code node | Insert after Extract Data |
| Duplicate payment guard | New Code node + IF | Insert before Create Notion Lead |
| Lead Source = "Direct" | Property addition | Create Notion Lead |
| Frankie voice email template | Template swap | Send Calendly Link |

### Updated Connection Map

```
Webhook
  → Extract Data
    → Map Product from Amount (NEW)
      → Get Existing Payments (NEW)
        → Check Duplicate (NEW)
          → Is Duplicate? (NEW)
            → FALSE: Create Notion Lead → Has Phone? → Laylo Subscribe → Wait → Send Calendly Link → Team Notification
            → TRUE: Send Calendly Link (skip record creation, still send email)
```

---

## Stripe Setup Required

Before these fixes work, set up Stripe products properly:

**DONE — Live products created Feb 20, 2026:**

| Product | Price | Live Payment Link |
|---------|-------|------------------|
| First Call | $499 | `https://buy.stripe.com/14AaEQcDDaY43eFdT59ws00` |
| Standard Call | $699 | `https://buy.stripe.com/eVqbIUeLL1nu02t16j9ws02` |
| 3-Session Clarity Sprint | $1,495 | `https://buy.stripe.com/4gMcMY9rr2rycPfdT59ws03` |

**Still needed:**
1. Add `product_name` metadata to each Payment Link (must match Notion select values exactly)
2. Add `lead_source` metadata (optional, for tracking: "Direct", "Website", "IG", etc.)
3. ~~Add "3-Session Clarity Sprint" to Notion Product Purchased select options~~ DONE (Cowork, Feb 20)
4. ~~Register Stripe webhook for live mode~~ DONE (Cowork, Feb 20) — signing secret stored in Stripe Dashboard
5. Update website Stripe links to point to the live Payment Links

See [stripe-launch-checklist.md](stripe-launch-checklist.md) for full go-live steps.

---

## Problem 5: No Webhook Signature Verification

### Current Configuration

| Setting | Value |
|---------|-------|
| Node type | `n8n-nodes-base.webhook` (generic Webhook) |
| Version | 2.1 |
| HTTP method | POST |
| Path | `stripe-checkout` |
| Production URL | `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout` |
| Authentication | **none** |
| Stripe signature check | **none** |

**Risk:** Anyone who knows the webhook URL can send a fake `checkout.session.completed` payload and create a fraudulent payment record in Notion. The customer would receive a Calendly link email without having actually paid.

### Stripe Signing Secret

Jake registered the webhook in Stripe Dashboard. The signing secret is:
```
whsec_ColiuSGF9fkcgPCWFui8eviYWXaiFHde
```

**Store this in n8n as a credential — do NOT hardcode it in a node.**

### Option A (Recommended): Add a Code Node for Signature Verification

The generic Webhook node (`n8n-nodes-base.webhook`) does **not** have built-in Stripe signature verification. Add a Code node immediately after the Webhook to verify the signature before processing.

**Node: Verify Stripe Signature**

Insert between "Webhook" and "Extract Data":

```javascript
// Verify Stripe webhook signature
// Requires the stripe-signature header and the raw body

const crypto = require('crypto');

const sigHeader = $json.headers['stripe-signature'];
const rawBody = JSON.stringify($json.body);

if (!sigHeader) {
  throw new Error('Missing stripe-signature header');
}

// Parse the signature header
const elements = sigHeader.split(',');
let timestamp = '';
let signature = '';

for (const element of elements) {
  const [key, value] = element.split('=');
  if (key === 't') timestamp = value;
  if (key === 'v1') signature = value;
}

if (!timestamp || !signature) {
  throw new Error('Invalid stripe-signature header format');
}

// Check timestamp tolerance (5 minutes)
const tolerance = 300;
const currentTime = Math.floor(Date.now() / 1000);
if (Math.abs(currentTime - parseInt(timestamp)) > tolerance) {
  throw new Error('Webhook timestamp too old — possible replay attack');
}

// Compute expected signature
// IMPORTANT: Replace the credential reference below with your n8n credential
const secret = 'whsec_ColiuSGF9fkcgPCWFui8eviYWXaiFHde';
const signedPayload = `${timestamp}.${rawBody}`;
const expectedSig = crypto
  .createHmac('sha256', secret)
  .update(signedPayload)
  .digest('hex');

if (expectedSig !== signature) {
  throw new Error('Invalid Stripe webhook signature');
}

// Signature valid — pass through
return [$input.item];
```

**Updated connection:**
```
Webhook → Verify Stripe Signature (NEW) → Extract Data → ...
```

**Important caveat:** n8n's generic Webhook node may not preserve the raw body exactly as received. If `JSON.stringify($json.body)` produces a different byte sequence than what Stripe signed, verification will fail. If this happens, use Option B instead.

### Option B (Alternative): Switch to Stripe Trigger Node

n8n has a dedicated Stripe Trigger node (`n8n-nodes-base.stripeTrigger`) that handles signature verification automatically.

**Steps:**
1. In n8n → Credentials → New → "Stripe API" → Enter your Stripe Secret Key + Webhook Signing Secret
2. Replace the current generic Webhook node with a Stripe Trigger node
3. Configure events: `checkout.session.completed`
4. The Stripe Trigger node automatically verifies signatures using the credential

**Trade-off:** This changes the webhook URL (Stripe Trigger uses its own path format). You'd need to update the webhook URL in Stripe Dashboard. The payload structure may also differ slightly — the Extract Data node mappings may need adjustment.

### Option C (Minimum Viable): IP Allowlist or Shared Secret Header

If signature verification proves complex:
1. **Header check:** Add a custom header to the webhook URL (e.g., `?token=YOUR_SECRET`) and check it in a Code node. Not as secure as signature verification but blocks casual spoofing.
2. **Stripe IP allowlist:** Not practical — Stripe's IP range changes and n8n Cloud doesn't support IP filtering at the webhook level.

### Recommendation

Try **Option A** first. If the raw body issue causes signature mismatches, fall back to **Option B** (Stripe Trigger node). Option A is lower-risk because it doesn't change the webhook URL or payload structure.

**Priority:** MEDIUM — This is a security gap but not a launch blocker. The webhook URL is not publicly discoverable (it's only registered in Stripe). Implement after WF1's core fixes (product mapping, dedup) are working.
