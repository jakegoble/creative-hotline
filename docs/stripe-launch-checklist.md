# Stripe Product Verification & Launch Checklist

**Date:** February 20, 2026 (Updated with LIVE products)

---

## Live Stripe Products (Confirmed Feb 20)

| Product | Price | Live Payment Link |
|---------|-------|------------------|
| First Call | $499 | `https://buy.stripe.com/14AaEQcDDaY43eFdT59ws00` |
| Standard Call | $699 | `https://buy.stripe.com/eVqbIUeLL1nu02t16j9ws02` |
| 3-Session Clarity Sprint | $1,495 | `https://buy.stripe.com/4gMcMY9rr2rycPfdT59ws03` |

### Previous Test Products (Superseded)

| Product ID | Status |
|-----------|--------|
| `prod_TwuACV5Kp0Ywtq` | **Replaced by live products** |
| `prod_TwuB8QGxdJaHwO` | **Replaced by live products** |
| `prod_TwuC70y8K4z9tx` | **Replaced by live products** |

---

## Metadata Still Needed on Payment Links

Each payment link needs metadata so WF1 can map the purchase to the correct Notion `Product Purchased` value:

- [ ] **First Call link** → Metadata: `product_name` = `First Call`
- [ ] **Standard Call link** → Metadata: `product_name` = `Standard Call`
- [ ] **3-Session Clarity Sprint link** → Metadata: `product_name` = `3-Session Clarity Sprint`
- [ ] (Optional) Add `lead_source` metadata to each link for tracking (e.g., `Direct`, `Website`, `IG`)

**How to add metadata:** Stripe Dashboard → Payment Links → Select link → Settings → Metadata → Add key `product_name` with value exactly as shown above.

**Why this matters:** WF1's Extract Data node currently maps `line_items.data[0].description` which is always null. The fix (in `wf1-stripe-fix-spec.md`) reads `metadata.product_name` instead.

---

## Calendly Payment Gate (Separate LIVE Stripe Connection)

The Calendly booking page has its own $499 payment gate (for First Call) that processes real Stripe charges. This is:
- A **separate Stripe connection** from the n8n webhook flow
- Already live and processing real payments
- When a customer pays via Calendly, WF2 fires on the booking event (NOT WF1)

The 3 payment links above are for **direct-purchase flows** that bypass Calendly:
- Sharing in DMs, emails, website CTAs, Laylo drops
- These trigger WF1 (Stripe webhook → Calendly email)

**Two paths to purchase:**
- **Calendly path:** Customer pays $499 via Calendly → books call simultaneously → WF2 fires
- **Direct Stripe path:** Customer pays via payment link → WF1 fires → Calendly booking email sent → customer books separately → WF2 fires

Both paths converge at the Payments DB. The direct path needs WF1 fixes (product mapping, dedup) to work correctly.

---

## Go-Live Checklist

### Step 1: Add Metadata to Live Payment Links
- [ ] Open Stripe Dashboard → Payment Links
- [ ] For each of the 3 live links, add metadata:
  - First Call → `product_name` = `First Call`
  - Standard Call → `product_name` = `Standard Call`
  - 3-Session Clarity Sprint → `product_name` = `3-Session Clarity Sprint`
- [ ] (Optional) Add `lead_source` = `Direct` to each link

### Step 2: Register Stripe Webhook for Live Mode
- [ ] In Stripe Dashboard → Developers → Webhooks
- [ ] Add endpoint: `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout`
- [ ] Event: `checkout.session.completed`
- [ ] Copy the webhook signing secret for later (needed for signature verification, but n8n webhook currently doesn't verify signatures)
- [ ] If there's a test webhook pointing to this URL, remove or disable it

### Step 3: Update Notion Product Purchased Options
- [ ] Add "3-Session Clarity Sprint" as a new option in the Product Purchased select field
- [ ] Decide whether to keep "3-Pack Sprint" (old name) or remove it

### Step 4: Test with Real $1 Charge
- [ ] Create a temporary $1 product in Stripe live mode
- [ ] Create a payment link for it
- [ ] Complete a real purchase with a real card
- [ ] Verify:
  - [ ] WF1 fires and creates a Notion record
  - [ ] Product Purchased is correctly mapped (via metadata)
  - [ ] Customer email is sent with Calendly link
  - [ ] Team notification is sent
  - [ ] No duplicate records on retry
- [ ] Refund the $1 charge after testing
- [ ] Delete the $1 test product

### Step 5: Update All Links
- [ ] Website "Buy Now" / pricing page buttons → new live payment links
- [ ] Any Instagram bio links or Linktree entries → new live payment links
- [ ] ManyChat "Book Now" automations (if they link to Stripe directly)
- [ ] Email templates that reference pricing pages

---

## Price Alignment Reminder

Now that live Stripe prices are confirmed, here's what needs to match:

| Product | Stripe (Live) | Calendly Gate | Website Homepage | Website Pricing Page |
|---------|--------------|--------------|-----------------|---------------------|
| First Call | $499 | $499 | $499 | $500 |
| Standard Call | $699 | — | — | — |
| 3-Session Clarity Sprint | $1,495 | — | — | $599 (old price!) |

**Actions:**
- Website homepage $499 matches First Call — correct
- Website pricing page needs update: $500 → $499 for First Call, $599 → $1,495 for 3-Session Clarity Sprint, add $699 Standard Call
- Calendly $499 gate matches First Call — correct
- Ensure all email templates and DM responses reference correct prices

---

## WF1 Dependency

The direct Stripe payment links won't work correctly in the pipeline until WF1 is fixed:
1. **Product mapping** — currently always null (needs metadata or price-based mapping)
2. **Dedup guard** — Stripe webhook retries create duplicate records
3. **Lead Source** — not set (should default to "Direct")
4. **Email template** — not Frankie voice yet

Fix spec: `docs/wf1-stripe-fix-spec.md`

**Recommended order:** Set up metadata on payment links first (Step 1 above), then apply WF1 fixes, then go live.
