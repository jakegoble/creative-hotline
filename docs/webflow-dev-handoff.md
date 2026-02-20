# Webflow Developer Handoff — Remaining Website Fixes

**Project:** The Creative Hotline (www.thecreativehotline.com)
**Date:** 2026-02-20
**Context:** You already fixed 6 issues (homepage/contact page titles, Book a Call buttons, footer address, template artifacts, pricing page content, social links). This document covers the 8 remaining items, organized by priority.

---

## CRITICAL Priority

---

### 1. Pricing Page Title Tag Still Shows "Marketio"

**What to change:**
The `<title>` tag on the pricing page (`/inner-pages/pricing`) still reads "Marketio - Webflow Ecommerce Website Template". This was fixed on the homepage and contact page but missed on this page.

**Where in Webflow:**
1. Open the Webflow Designer
2. Navigate to the page `/inner-pages/pricing` using the Pages panel (left sidebar, page icon)
3. Click the gear icon next to the pricing page to open Page Settings
4. Find the **Title Tag** field under the SEO Settings section

**Change:**
- **From:** `Marketio - Webflow Ecommerce Website Template`
- **To:** `Pricing — The Creative Hotline`

Also update the **Meta Description** if it still contains template placeholder text. Suggested meta description:
> See what a Creative Hotline call costs. One call, one clear direction. No retainers, no contracts.

**Expected result:** Browser tab on `/inner-pages/pricing` shows "Pricing — The Creative Hotline" instead of the Marketio template text.

**How to test:**
1. Publish the site
2. Open `https://www.thecreativehotline.com/inner-pages/pricing` in a new incognito/private window
3. Check the browser tab text
4. Right-click > View Page Source > search for `<title>` to confirm
5. Also check with a social preview tool (e.g., opengraph.xyz) to verify the title renders correctly in share cards

---

### 2. Contact Form "General Inquiries" Is a Dead End

**The problem:**
The contact page (`/inner-pages/contact`) has a form with fields: First Name, Last Name, Email, Subject, Message. It submits through Webflow's built-in form handling but the data goes nowhere useful — it is not connected to the business pipeline (n8n, Notion, or any CRM).

**Where in Webflow:**
1. Open the Designer
2. Navigate to the contact page (`/inner-pages/contact`)
3. Select the form block labeled "General Inquiries" (or click into any form field and navigate up to the parent Form element)
4. The form element is in the Form settings panel on the right sidebar

**Recommended approach — Option A (Webflow webhook to n8n):**

This is the preferred solution. It keeps the existing form design intact and sends submissions to the automation platform.

1. In the Webflow Designer, select the form element
2. Open Project Settings > Integrations (or the form's settings panel)
3. Under **Form Notifications**, Webflow Logic, or Webhooks section, add a webhook URL
4. The n8n team will provide the exact webhook URL. Use this placeholder for now and update once they confirm:
   ```
   https://creativehotline.app.n8n.cloud/webhook/website-contact-form
   ```
5. The webhook payload should include all form fields: `first_name`, `last_name`, `email`, `subject`, `message`
6. Ensure the field names in Webflow match what n8n expects. In the form settings, set the **Name** attribute for each input field:
   - First Name input: `name="first_name"`
   - Last Name input: `name="last_name"`
   - Email input: `name="email"`
   - Subject input: `name="subject"`
   - Message textarea: `name="message"`

**If Webflow webhook is not available on the current plan:**

**Option B — Replace with Tally embed:**
1. Delete or hide the existing form block
2. Add an Embed element (Add Elements panel > Components > Embed)
3. Paste this Tally embed code:
   ```html
   <iframe
     data-tally-src="https://tally.so/r/b5W1JE?transparentBackground=1"
     loading="lazy"
     width="100%"
     height="600"
     frameborder="0"
     marginheight="0"
     marginwidth="0"
     title="Creative Hotline Intake Form"
   ></iframe>
   <script>
     var d=document,w="https://tally.so/widgets/embed.js",
     v=function(){"undefined"!=typeof Tally?Tally.loadEmbeds():d.querySelectorAll("iframe[data-tally-src]:not([src])").forEach((function(e){e.src=e.dataset.tallySrc}))};
     if("undefined"!=typeof Tally)v();
     else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w;s.onload=v;s.onerror=v;d.body.appendChild(s)}
   </script>
   ```
4. Note: This replaces the general contact form with the intake form. This changes the form's purpose from "general inquiry" to "pre-call intake," which may not be appropriate for all visitors. Discuss with the business owner.

**Option C — External form action:**
1. Select the form element
2. In the form settings, change the **Action** attribute to a Zapier or Make webhook URL (the business team would need to provide this)
3. Set **Method** to POST

**Expected result:** Form submissions are captured and routed to the business pipeline rather than sitting in Webflow's form submissions panel unused.

**How to test:**
1. Publish the site
2. Submit a test entry with clearly identifiable data (e.g., name "Test Webflow" and email "test@example.com")
3. For Option A: Confirm the n8n team received the webhook (they can check n8n execution logs)
4. For Option B: Confirm the submission appears in Tally's responses dashboard at tally.so
5. For Option C: Confirm the submission appears in the connected Zapier/Make scenario

---

### 3. Pricing Inconsistency — Ghost Prices + Wrong Amounts

**The problem (updated Feb 20):**

The homepage has **two separate pricing sections** that contradict each other, and the /pricing page returns **404**.

**Section 1 (mostly correct):**
| Product | Website Price | Stripe Price | Match? |
|---------|-------------|-------------|--------|
| Single Call (standard) | $699 | $699 | YES |
| Single Call (first call promo) | $499 | $499 | YES |
| Creative Clarity Pack (3 sessions) | $1,497 | $1,495 | NO — $2 off |

**Section 2 (Needs Review):**
| Element | What It Shows | Issue |
|---------|-------------|-------|
| 3-Pack savings badge | "Save $400" (was "Save $300") | Should be "Save $602" — actual savings is 3×$699 ($2,097) minus $1,495 = $602. Stripe product description already says "Save $602". |
| Creative Clarity Pack | $1,100 | No Stripe product at this price. Should be $1,495 or removed. |

The CTA in this section may link to **Laylo** instead of Calendly — needs verification.

**Confirmed Stripe prices (source of truth):**
| Product | Price | Payment Link |
|---------|-------|-------------|
| First Call | $499 | `https://buy.stripe.com/14AaEQcDDaY43eFdT59ws00` |
| Standard Call | $699 | `https://buy.stripe.com/eVqbIUeLL1nu02t16j9ws02` |
| 3-Session Clarity Sprint | $1,495 | `https://buy.stripe.com/4gMcMY9rr2rycPfdT59ws03` |

**What to fix:**

1. **Fix the "Save $400" badge on the 3-pack** — Currently says "Save $400" (was "Save $300"). Actual savings: 3 × $699 = $2,097 − $1,495 = **$602**. Update badge to "Save $602" (or "Save $600+"). The Stripe product description already says "Save $602 vs. booking 3 standard calls individually". Also: the $1,100 price has no Stripe product — replace with $1,495 or remove.

2. **Fix the 3-pack price:** Change $1,497 → $1,495 to match Stripe exactly.

3. **Fix or restore /pricing page** — Currently returns 404. Either redirect `/pricing` and `/inner-pages/pricing` to the homepage pricing section, or build a dedicated pricing page with the 3 correct tiers.

4. **Verify all pricing CTA buttons** link to Calendly (`https://calendly.com/soscreativehotline/creative-hotline-call`), NOT Laylo.

**Where in Webflow:**

Homepage pricing section 1:
1. Open the homepage in the Designer
2. Find the pricing section with $699/$499/$1,497
3. Change $1,497 → $1,495

Homepage pricing section 2 (savings badge + $1,100):
1. Scroll further on the homepage (may only be visible on mobile viewport)
2. Find the 3-pack pricing card with "Save $400" badge and "$1,100" price
3. Change badge from "Save $400" → "Save $602" (or "Save $600+")
4. Change $1,100 → $1,495 (or remove this section entirely)

Pricing page:
1. Navigate to `/inner-pages/pricing` in the Pages panel
2. Either build a page with the correct 3 tiers or set up a redirect to the homepage pricing section

**Expected result:** All prices across the site match Stripe: $499, $699, $1,495. Savings badge says "Save $602". All CTAs go to Calendly.

**How to test:**
1. After publishing, visit the homepage on both desktop and mobile
2. Confirm only one pricing section exists with $499/$699/$1,495
3. Visit `/pricing` and `/inner-pages/pricing` — should either load a page or redirect
4. Tap every pricing CTA button — all should go to Calendly
5. Cross-reference against Stripe: `$499`, `$699`, `$1,495`

See full pricing audit: [website-pricing-audit.md](website-pricing-audit.md)

---

## MEDIUM Priority

---

### 4. Navigation Links Using # Anchors

**The problem:**
Some navigation links across the site still use `#` as their href (placeholder links from the original Marketio template) instead of actual page paths. This means clicking them does nothing or scrolls to the top of the page.

**Where in Webflow:**
1. Open the Designer
2. Check the navigation component (Navbar) — this is typically a Symbol/Component shared across all pages
3. Select each nav link and check its **Link Settings** in the right panel
4. Also check footer navigation links
5. Also check any in-page CTAs or text links that might use `#`

**What to audit — check every instance of these navigation elements:**

| Element Location | What to Check |
|-----------------|---------------|
| Main navbar (desktop) | All top-level links + any dropdown items |
| Main navbar (mobile/hamburger) | Same links in mobile nav overlay |
| Footer navigation | All link columns |
| Any in-page section links | "Learn more", "See pricing", etc. |

**Expected link targets:**

| Link Text | Should Point To |
|-----------|----------------|
| Home | `/` |
| About | `/about` (or `/inner-pages/about` — match existing page slug) |
| Pricing | `/inner-pages/pricing` |
| Contact | `/inner-pages/contact` |
| Book a Call | `https://calendly.com/soscreativehotline/creative-hotline-call` (external, opens new tab) |

If any nav links reference pages that do not exist (e.g., `/services`, `/blog`, `/portfolio`), either create the pages or remove those links from the navigation.

**Expected result:** Every navigation link on every page takes the user to a real destination. No `#` href values remain.

**How to test:**
1. After publishing, visit each page (homepage, about, pricing, contact)
2. Click every navigation link in the header and footer
3. Test on both desktop and mobile viewport
4. Right-click > Inspect Element on any suspicious links and confirm href is not `#`
5. Use a broken link checker tool (e.g., deadlinkchecker.com) on the full site

---

### 5. Embed Calendly Scheduling Widget on Contact Page

**What to add:**
An inline Calendly scheduling widget on the contact page so visitors can book a 45-minute Creative Hotline call without leaving the site.

**Calendly URL:** `https://calendly.com/soscreativehotline/creative-hotline-call`

**Where in Webflow:**
1. Open the contact page (`/inner-pages/contact`) in the Designer
2. Decide on placement — recommended: a new section above or alongside the contact form, with a heading like "Book a Call" or "Pick a Time"
3. Add an Embed element (Add Elements > Components > Embed)

**Embed code (inline widget):**
```html
<!-- Calendly inline widget begin -->
<div class="calendly-inline-widget" data-url="https://calendly.com/soscreativehotline/creative-hotline-call" style="min-width:320px;height:700px;"></div>
<script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>
<!-- Calendly inline widget end -->
```

**Alternative — popup widget (less intrusive):**
If an inline embed takes up too much space, use a popup button instead:
```html
<!-- Calendly popup widget begin -->
<link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet">
<script src="https://assets.calendly.com/assets/external/widget.js" type="text/javascript" async></script>
<a href="" onclick="Calendly.initPopupWidget({url: 'https://calendly.com/soscreativehotline/creative-hotline-call'});return false;" style="display:inline-block;padding:16px 32px;background:#000;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Book a Call</a>
<!-- Calendly popup widget end -->
```

**Layout suggestion:**
Structure the contact page in two columns or two stacked sections:
1. **Top/Left:** Calendly widget (booking) with heading "Book Your Call"
2. **Bottom/Right:** Contact form (general inquiries) with heading "Or Send Us a Message"

**Expected result:** Visitors can see available time slots and book a call directly on the contact page without being redirected to calendly.com.

**How to test:**
1. Publish the site
2. Visit `/inner-pages/contact`
3. Confirm the Calendly widget loads and displays available time slots
4. Select a time slot and confirm the booking flow works end-to-end (use a test booking and cancel it afterward)
5. Test on mobile — the widget should be responsive (min-width 320px)
6. Check that the widget does not break the page layout or overlap other elements

---

### 6. Embed Tally Intake Form on Contact Page

**What to add:**
The pre-call intake form (Tally) embedded on the contact page so visitors who have already booked can fill out their intake without waiting for the email prompt.

**Tally Form URL:** `https://tally.so/r/b5W1JE`

**Where in Webflow:**
1. Open the contact page (`/inner-pages/contact`) in the Designer
2. Place this below the Calendly widget, in its own section with a heading like "Already Booked? Fill Out Your Intake Form"
3. Add an Embed element (Add Elements > Components > Embed)

**Embed code:**
```html
<iframe
  data-tally-src="https://tally.so/r/b5W1JE?transparentBackground=1"
  loading="lazy"
  width="100%"
  height="800"
  frameborder="0"
  marginheight="0"
  marginwidth="0"
  title="Creative Hotline Intake Form"
></iframe>
<script>
  var d=document,w="https://tally.so/widgets/embed.js",
  v=function(){"undefined"!=typeof Tally?Tally.loadEmbeds():d.querySelectorAll("iframe[data-tally-src]:not([src])").forEach((function(e){e.src=e.dataset.tallySrc}))};
  if("undefined"!=typeof Tally)v();
  else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w;s.onload=v;s.onerror=v;d.body.appendChild(s)}
</script>
```

**Layout note:** The contact page should flow logically:
1. Hero/header
2. "Book Your Call" section with Calendly widget
3. "Already Booked? Complete Your Intake" section with Tally form
4. "General Inquiries" section with the existing contact form

**Expected result:** Visitors can fill out the intake form directly on the website. Submissions flow through Tally's existing webhook to n8n (already configured — no backend changes needed).

**How to test:**
1. Publish the site
2. Visit `/inner-pages/contact`
3. Scroll to the Tally embed section
4. Confirm the form loads and all fields are visible (Name, Email, Role, Brand, Website/IG, Creative Emergency, Desired Outcome, What They've Tried, Deadline, Constraints)
5. Submit a test entry with identifiable data
6. Verify the submission appears in Tally's response dashboard at `tally.so`
7. Test on mobile — the iframe should be responsive at 100% width

---

## LOW Priority

---

### 7. Footer Email Signup — Verify and Connect

**The problem:**
The footer has an email signup field (likely from the Marketio template). It appears to submit successfully (shows a success message) but it is unclear where the data goes. It is probably just going to Webflow's form submissions, which nobody monitors.

**Where in Webflow:**
1. Open any page in the Designer (the footer is shared across pages)
2. Scroll to the footer
3. Find the email signup form element
4. Select the form and check its settings in the right panel
5. Check the **Form Name** and **Action** fields

**Options (confirm with business owner):**

**Option A — Connect to Laylo (recommended):**
Replace the Webflow form with a link to the Laylo community page:
```
https://laylo.com/creative-hotline
```
Change the signup CTA to something like "Join the List" and link it to Laylo. This keeps all subscriber data in one place (Laylo already connects to n8n).

**Option B — Webflow webhook to n8n:**
Same approach as the contact form (Issue #2): add a webhook that POSTs the email to n8n, which creates a "Lead - Website" record in Notion.

**Option C — Remove it:**
If the business does not need a footer email capture, remove the form entirely to avoid a confusing dead end. Replace with contact info or social links.

**Expected result:** Footer email signups either route to an active platform or the form is removed/replaced.

**How to test:**
1. Submit a test email address
2. Confirm it arrives in the chosen destination (Laylo dashboard, n8n execution log, or Notion)
3. If removed, confirm the footer looks clean without a broken form

---

### 8. Add Open Graph Meta Tags for Social Sharing

**The problem:**
When someone shares a link to thecreativehotline.com on social media, the preview card may show generic or missing information if Open Graph tags are not set.

**Where in Webflow:**
1. Open the Pages panel (left sidebar)
2. For each page, click the gear icon to open Page Settings
3. Scroll to the **Open Graph Settings** section

**What to set for each page:**

**Homepage (`/`):**
- **OG Title:** `The Creative Hotline — Get Unstuck in One Call`
- **OG Description:** `45-minute creative direction calls for founders, creators, and brands. One call, one clear plan. No retainers.`
- **OG Image:** Upload a branded image (1200x630px recommended). Use the site's hero image or a custom social share graphic. If no image is available, ask the business owner for a brand asset.

**Pricing page (`/inner-pages/pricing`):**
- **OG Title:** `Pricing — The Creative Hotline`
- **OG Description:** `See what a Creative Hotline call costs. Clear pricing, no surprises.`
- **OG Image:** Same branded image as homepage (or a pricing-specific variant)

**Contact page (`/inner-pages/contact`):**
- **OG Title:** `Contact — The Creative Hotline`
- **OG Description:** `Book a creative direction call, fill out your intake form, or send us a message.`
- **OG Image:** Same branded image as homepage

**About page (if it exists):**
- **OG Title:** `About — The Creative Hotline`
- **OG Description:** `Meet the team behind The Creative Hotline. Creative direction for people who build things.`
- **OG Image:** Same branded image as homepage

**Expected result:** Sharing any page URL on LinkedIn, Twitter/X, Facebook, iMessage, or Slack shows a rich preview card with the correct title, description, and image.

**How to test:**
1. Publish the site
2. Use these tools to preview each page's social card:
   - https://opengraph.xyz — enter each page URL
   - https://cards-dev.twitter.com/validator — Twitter/X card preview
   - https://developers.facebook.com/tools/debug/ — Facebook share debugger (click "Scrape Again" to refresh cache)
3. Confirm title, description, and image appear correctly for each page
4. If the image does not appear, ensure it is uploaded in Webflow's OG Image field (not just referenced by URL)

---

## Summary Checklist

| # | Item | Priority | Requires Business Decision? |
|---|------|----------|---------------------------|
| 1 | Pricing page title tag | CRITICAL | No — straightforward fix |
| 2 | Contact form connection | CRITICAL | Partial — need n8n webhook URL from automation team |
| 3 | Fix "Save $400"→"Save $602" badge, replace $1,100→$1,495, fix $1,497→$1,495, fix /pricing 404 | CRITICAL | Stripe is source of truth ($499/$699/$1,495). 3-pack savings = $602 (3×$699−$1,495) |
| 4 | Navigation # anchor audit | MEDIUM | No — straightforward fix |
| 5 | Calendly embed on contact page | MEDIUM | No — embed code provided above |
| 6 | Tally embed on contact page | MEDIUM | No — embed code provided above |
| 7 | Footer email signup | LOW | Yes — confirm preferred destination with Jake |
| 8 | Open Graph meta tags | LOW | Partial — need a brand image from the team |

## Contacts

- **Business owner:** Jake Goble — jake@radanimal.co
- **Automation/n8n team:** Will provide webhook URLs for items #2 and #7
- **Site URL:** https://www.thecreativehotline.com
- **Webflow project:** The Creative Hotline (Marketio template base)

## After Publishing

Once all changes are published, notify the team so they can:
1. Verify the n8n webhook receives test form submissions (items #2, #7)
2. Confirm pricing amounts match Stripe product catalog (item #3)
3. Run a full site walkthrough on desktop and mobile
