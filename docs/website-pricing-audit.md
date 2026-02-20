# Website Pricing Audit

**Date:** February 20, 2026
**URL:** https://www.thecreativehotline.com
**Method:** Fetched live homepage via WebFetch

---

## Confirmed Stripe Prices (Source of Truth)

| Product | Stripe Live Price | Payment Link |
|---------|------------------|-------------|
| First Call | **$499** | `https://buy.stripe.com/14AaEQcDDaY43eFdT59ws00` |
| Standard Call | **$699** | `https://buy.stripe.com/eVqbIUeLL1nu02t16j9ws02` |
| 3-Session Clarity Sprint | **$1,495** | `https://buy.stripe.com/4gMcMY9rr2rycPfdT59ws03` |

---

## What the Website Currently Shows

### Pricing Section 1 (Main)

| Product | Website Price | Stripe Price | Match? |
|---------|-------------|-------------|--------|
| Single Call (standard) | **$699** | $699 (Standard Call) | **YES** |
| Single Call (first call promo) | **$499** | $499 (First Call) | **YES** |
| Creative Clarity Pack (3 sessions) | **$1,497** | $1,495 (3-Session Clarity Sprint) | **NO — $2 off** |

The $1,497 vs $1,495 discrepancy is minor but should match. Either update the website to $1,495 or the Stripe price to $1,497.

### Pricing Section 2 (Savings Badges)

The homepage pricing cards have savings badges:

| Element | Currently Shows | Correct Value | Issue |
|---------|---------------|--------------|-------|
| 3-Pack savings badge | **"Save $400"** (was "Save $300") | **"Save $602"** | 3 x $699 = $2,097 minus $1,495 = $602 savings. Badge should say "Save $602" (or round to "Save $600+") |

**Note:** The "$300" originally flagged in the audit was this savings badge, not a standalone price. It has since been updated to "$400" but is still wrong — the actual savings is $602.

The Stripe product description already says "Save $602 vs. booking 3 standard calls individually" — the website badge should match.

### Other Findings

- **Homepage tab title:** "The Creative Hotline - Get Unstuck in One Call" — correct, no more "Marketio"
- **/pricing page:** Returns **404** — the page doesn't exist
- **CTA buttons:** Link to `https://calendly.com/soscreativehotline/creative-hotline-call` — correct
- **Some buttons** link to `https://www.laylo.com/creative-hotline` — this is the Laylo drops page, fine for IG capture
- **"First call credit applies toward larger packages within 15 days"** — is this still the policy? Needs confirmation.
- **Calendly payment gate:** $499 for First Call — matches Stripe

---

## Required Fixes (for Webflow Dev)

### CRITICAL — Fix Before Launch

1. **Fix the "Save $400" badge on the 3-pack** — Currently says "Save $400" (was "Save $300"). Actual savings: 3 × $699 = $2,097 − $1,495 = **$602**. Update badge to "Save $602" (or "Save $600+"). The $1,100 price has no Stripe product — remove it or replace with $1,495.

2. **Align 3-pack price:** Change $1,497 → $1,495 (or update Stripe to $1,497 — pick one and be consistent).

### RECOMMENDED

3. **Add or restore /pricing page** — Currently 404. Either redirect to the homepage pricing section or build a dedicated page.

4. **Confirm "first call credit" policy** — The homepage mentions first-call credit toward packages within 15 days. If this is still offered, the n8n pipeline should track it. If not, remove the copy.

5. **Update product names to match Stripe:**
   - "Creative Clarity Pack" → "3-Session Clarity Sprint" (consistent branding)
   - Or update Stripe product name to "Creative Clarity Pack" — just pick one

---

## Price Alignment Matrix (All Touchpoints)

| Touchpoint | First Call | Standard Call | 3-Session |
|-----------|-----------|--------------|-----------|
| **Stripe (truth)** | $499 | $699 | $1,495 |
| **Calendly gate** | $499 | — | — |
| **Website (section 1)** | $499 | $699 | $1,497 |
| **Website (section 2)** | — | — | "Save $400" badge (should be $602), $1,100 (wrong) |
| **ManyChat KB** | ? | ? | ? |
| **Email templates** | Not mentioned | Not mentioned | Not mentioned |

**Action:** Webflow dev needs to remove section 2 pricing and fix the $1,497 → $1,495 discrepancy. Jake should also verify ManyChat Knowledge Base has correct prices.
