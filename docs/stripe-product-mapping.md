# Stripe Product Mapping — Problem & Solutions

> **SUPERSEDED by `docs/wf1-stripe-fix-spec.md`** which has the complete fix spec including metadata mapping, amount-based fallback, and dedup guard. This doc retained as background reference.

This document explains the Stripe to Notion product mapping problem and provides solutions.

## The Problem

The Creative Hotline's n8n workflow (WF1: Stripe Purchase -> Calendly) tries to extract the product name from Stripe's checkout.session.completed webhook using:

```
$json.body.data.object.line_items.data[0].description
```

This fails because **Stripe's checkout.session.completed webhook event does NOT include `line_items` by default**. The `line_items` property is only available when you explicitly expand it via the API.

Meanwhile, the Notion Payments DB has a `Product Purchased` select field with three options:
- "Standard Call"
- "3-Pack Sprint"
- "First Call"

So even if line_items WERE available, the Stripe product description (e.g., "Creative Hotline - 45 Minute Creative Direction Call") would not match any of these Notion select values.

## Solution Options

### Option 1: Stripe Metadata (Recommended — Simplest)

Add a `product_type` metadata field to your Stripe Checkout Session when creating it. This metadata IS included in the webhook payload.

**Step 1:** When creating the Stripe Checkout Session (wherever your payment link or API call is configured), add metadata:

```json
{
  "metadata": {
    "product_type": "Standard Call"
  }
}
```

For each product/price:
| Stripe Product | Metadata value |
|---------------|----------------|
| Single consultation call ($499) | `Standard Call` |
| 3-pack of calls | `3-Pack Sprint` |
| First-time/introductory call | `First Call` |

**Step 2:** In n8n WF1 "Extract Data" node, change the product_name expression:
```
Before: ={{$json.body.data.object.line_items.data[0].description}}
After:  ={{$json.body.data.object.metadata.product_type}}
```

**Pros:** Simplest change. Metadata is always in the webhook payload. Values can exactly match Notion select options.
**Cons:** Requires updating wherever Checkout Sessions are created.

### Option 2: Stripe Price ID Lookup

Map Stripe price IDs to Notion select values in a Code node.

**Step 1:** Add a Code node in WF1 after the webhook, before Extract Data:

```javascript
const priceId = $json.body.data.object?.line_items?.data?.[0]?.price?.id
  || $json.body.data.object?.metadata?.price_id
  || '';

// Map price IDs to product names
const priceMap = {
  'price_XXXXXXXXX': 'Standard Call',    // Replace with actual Stripe price ID
  'price_YYYYYYYYY': '3-Pack Sprint',     // Replace with actual Stripe price ID
  'price_ZZZZZZZZZ': 'First Call',        // Replace with actual Stripe price ID
};

const productName = priceMap[priceId] || 'Standard Call'; // Default to Standard Call

return [{
  json: {
    ...$json,
    _product_name: productName
  }
}];
```

**Step 2:** In Extract Data, reference `$json._product_name` instead.

**Pros:** Deterministic mapping. No Stripe config changes needed if you store price_id in metadata.
**Cons:** Need to maintain the mapping when prices change. Still needs price_id from somewhere.

### Option 3: Stripe API Expand Call

Add an HTTP Request node to call Stripe API with expanded line_items.

**Step 1:** Add HTTP Request node after webhook:
- Method: GET
- URL: `https://api.stripe.com/v1/checkout/sessions/={{$json.body.data.object.id}}?expand[]=line_items`
- Authentication: HTTP Header Auth with `Authorization: Bearer sk_live_XXXX` (use n8n Stripe credential)

**Step 2:** Extract product name from the API response's line_items.

**Pros:** Gets full product data including description, quantity, amount.
**Cons:** Adds API call (latency + rate limits). Description still won't match Notion select options without a mapping step.

### Option 4: Hardcode (Quick Fix)

If there's currently only one product ($499 Creative Hotline Call), hardcode it:

```
={{$json.body.data.object.amount_total === 49900 ? 'Standard Call' : 'Standard Call'}}
```

Or simply: `Standard Call`

**Pros:** Works immediately. Zero complexity.
**Cons:** Breaks when you add more products. Not scalable.

## Recommended Implementation

**For now:** Use Option 4 (hardcode "Standard Call") as an immediate fix.
**This week:** Implement Option 1 (metadata) when you set up the Stripe checkout flow properly.

### Immediate Fix for n8n

In WF1 "Extract Data" node:
```
product_name value: Standard Call
```

This ensures every Stripe purchase writes a valid Notion select value immediately, while you work on the metadata approach.

## Stripe Checkout Session Configuration

When you set up (or update) your Stripe payment links or checkout sessions, here's the metadata to include:

```json
{
  "line_items": [{"price": "price_XXX", "quantity": 1}],
  "mode": "payment",
  "success_url": "https://www.thecreativehotline.com/thank-you",
  "cancel_url": "https://www.thecreativehotline.com",
  "metadata": {
    "product_type": "Standard Call",
    "source": "website"
  }
}
```

The `source` field could also feed into the `Lead Source` Notion property for attribution tracking.
