# Stripe Product Setup Guide — The Creative Hotline

> **PARTIALLY SUPERSEDED:** Stripe products, prices, and payment links were created on Feb 20, 2026. See `docs/stripe-launch-checklist.md` for current live links and remaining metadata tasks. This doc retained for reference on the setup process.

**Purpose:** Step-by-step instructions to configure Stripe products, prices, and payment links so they align with the Notion CRM, n8n workflows, and website pricing.

---

## Current State (Broken)

| Source | Single Call Price | Multi-Pack | Notes |
|--------|------------------|------------|-------|
| Homepage | $499 | "3-Pack" mentioned | No payment link visible |
| Pricing page | $500/month "Pay as You Go" | $599 "Premium" | Inconsistent with homepage |
| Notion select options | "Standard Call", "3-Pack Sprint", "First Call" | — | Used by n8n workflows |
| Stripe (unknown) | Unknown | Unknown | Need to verify current products |
| n8n WF1 | Always null (broken extraction) | — | `line_items` not in webhook payload |

**Problems:**
1. Website shows different prices on different pages
2. Stripe product names don't match Notion select values
3. n8n can't extract product name from Stripe webhook
4. No metadata on Stripe checkout sessions for attribution

---

## Recommended Product Structure

Align everything to these three products:

| Product | Price | Notion Select Value | Stripe Product Name | Stripe Metadata |
|---------|-------|--------------------|--------------------|-----------------|
| Single Call | $499 | `Standard Call` | Creative Hotline — Standard Call | `product_type: "Standard Call"` |
| 3-Pack | $1,299 | `3-Pack Sprint` | Creative Hotline — 3-Pack Sprint | `product_type: "3-Pack Sprint"` |
| First Call (intro) | $299 | `First Call` | Creative Hotline — First Call | `product_type: "First Call"` |

**Note:** The 3-Pack price ($1,299) is a suggestion — adjust to whatever Jake decides. The First Call price ($299) is an introductory rate. Confirm both with Jake before creating.

---

## Step 1: Create Stripe Products

Go to **Stripe Dashboard → Products → + Add Product** for each:

### Product 1: Standard Call

```
Name: Creative Hotline — Standard Call
Description: 45-minute creative direction call with a custom action plan delivered within 24 hours.
Price: $499.00 (one-time)
```

### Product 2: 3-Pack Sprint

```
Name: Creative Hotline — 3-Pack Sprint
Description: Three 45-minute creative direction calls. Each includes a custom action plan within 24 hours.
Price: $1,299.00 (one-time)  ← CONFIRM WITH JAKE
```

### Product 3: First Call (Optional)

```
Name: Creative Hotline — First Call
Description: Your first 45-minute creative direction call — includes action plan within 24 hours.
Price: $299.00 (one-time)  ← CONFIRM WITH JAKE
```

After creating each product, **copy the Price ID** (starts with `price_`). You'll need these for payment links and metadata mapping.

---

## Step 2: Create Payment Links

For each product, go to **Stripe Dashboard → Payment Links → + Create Payment Link**:

### Settings for each link:

```
Product:            [Select the product created above]
Quantity:           Fixed at 1
Collect:            ☑ Email (required)
                    ☑ Phone number (optional)
                    ☑ Billing address (optional)
After payment:      Redirect to https://www.thecreativehotline.com/thank-you
```

### Add Metadata (Critical)

In each payment link, under **Advanced → Metadata**, add:

| Key | Value |
|-----|-------|
| `product_type` | `Standard Call` (or `3-Pack Sprint` or `First Call`) |
| `source` | `website` |

This metadata flows through to the `checkout.session.completed` webhook and into n8n → Notion.

### Payment Link URLs

After creating, copy each payment link URL. You'll need to give these to your Webflow dev.

| Product | Payment Link URL |
|---------|-----------------|
| Standard Call | `https://buy.stripe.com/XXXXX` |
| 3-Pack Sprint | `https://buy.stripe.com/YYYYY` |
| First Call | `https://buy.stripe.com/ZZZZZ` |

---

## Step 3: Configure Stripe Webhook

Go to **Stripe Dashboard → Developers → Webhooks**.

### Verify existing webhook:

```
Endpoint URL: https://creativehotline.app.n8n.cloud/webhook/[WF1-webhook-path]
Events:       checkout.session.completed
```

If no webhook exists, create one:
1. Click **+ Add endpoint**
2. URL: Copy from n8n WF1's webhook node (the production URL, not test URL)
3. Events: Select only `checkout.session.completed`
4. Click **Add endpoint**

### Test the webhook:

1. Go to the webhook endpoint in Stripe
2. Click **Send test webhook**
3. Select `checkout.session.completed`
4. Check n8n execution logs — should show the test event received

---

## Step 4: Update n8n WF1 (Extract Data Node)

Change the product name extraction in the "Extract Data" node:

### Immediate fix (hardcode):
```
product_name: Standard Call
```

### Proper fix (use metadata):
```
product_name: ={{ $json.body.data.object.metadata.product_type || 'Standard Call' }}
```

The `|| 'Standard Call'` fallback ensures old payment links without metadata don't break.

### Also add lead source from metadata:
```
lead_source: ={{ $json.body.data.object.metadata.source || 'Direct' }}
```

---

## Step 5: Update Website Pricing

Give your Webflow dev these exact values to match the Stripe products:

### Homepage:
```
Single Call: $499
CTA button: Links to Standard Call payment link
```

### Pricing Page:

| Tier | Price | CTA | Payment Link |
|------|-------|-----|-------------|
| First Call | $299 | "Book Your First Call" | First Call payment link |
| Standard Call | $499 | "Book a Call" | Standard Call payment link |
| 3-Pack Sprint | $1,299 | "Get the 3-Pack" | 3-Pack Sprint payment link |

**Remove** the current "Pay as You Go" / "Premium" / "$500/month" / "$599/month" language — it implies a subscription model that doesn't match the actual one-time payment structure.

---

## Step 6: Update Notion Select Options (If Needed)

The current Notion Payments DB `Product Purchased` select already has the right options:
- `Standard Call`
- `3-Pack Sprint`
- `First Call`

**No changes needed** — the Stripe metadata values are designed to match these exactly.

---

## Step 7: Verify End-to-End

After setup, run a test purchase:

1. **Enable Stripe Test Mode** (toggle in Stripe Dashboard)
2. Create a test payment link for Standard Call with metadata
3. Complete a test purchase using card `4242 4242 4242 4242`
4. Check n8n execution log — verify `product_type` extracted correctly
5. Check Notion Payments DB — verify `Product Purchased` shows "Standard Call"
6. Check email — verify Calendly link was sent
7. **Disable Stripe Test Mode** when done

---

## Pricing Decision Needed from Jake

Before implementing, Jake needs to decide:

| Question | Options |
|----------|---------|
| Is there a First Call intro price? | Yes ($299) / No (just Standard Call) |
| What's the 3-Pack price? | $1,299 / $1,399 / Other |
| Monthly subscription or one-time? | One-time (recommended) / Monthly |
| Any promotional pricing? | Launch discount? / Friends & family? |

The current website shows "$500/month" and "$599/month" which implies subscriptions. If these are actually one-time payments, the website copy needs updating. If they ARE subscriptions, the Stripe products need to be configured as recurring prices and the n8n workflow needs adjustment.

---

## Files Reference

| Doc | Purpose |
|-----|---------|
| [stripe-product-mapping.md](stripe-product-mapping.md) | Technical problem analysis + 4 solution options |
| [n8n-fix-configs.md](n8n-fix-configs.md) | WF1 Extract Data node fix instructions |
| [webflow-dev-handoff.md](webflow-dev-handoff.md) | Website pricing update instructions for dev |
