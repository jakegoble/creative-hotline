# SEO & Conversion Recommendations — thecreativehotline.com

**Date:** 2026-02-20
**Based on:** Automated audit of homepage, contact page, and pricing page

---

## Priority 1: Fix Now (Impact on Search + Social Sharing)

### 1.1 Pricing Page Title Tag

**Issue:** Still shows "Marketio - Webflow Ecommerce Website Template"
**Fix:** Change to `Pricing — The Creative Hotline | Creative Direction Starting at $499`
**Where:** Webflow → Pages → Pricing → Page Settings → Title Tag
**Impact:** HIGH — This appears in Google results and browser tabs

### 1.2 Add Meta Descriptions

No meta descriptions found on any page. Search engines will auto-generate snippets (usually poorly).

| Page | Recommended Meta Description |
|------|------------------------------|
| Homepage | `Stuck on a creative decision? Book a 45-minute call with The Creative Hotline and get a custom action plan within 24 hours. Starting at $499.` |
| Pricing | `Simple pricing for creative direction that works. One call, one action plan, zero fluff. See plans starting at $499.` |
| Contact | `Book a creative direction call, text Frankie, or send us a message. The Creative Hotline — get unstuck in one call.` |
| About | `The Creative Hotline is a creative consultancy by Jake Goble and Megha. 45-minute calls that cut through creative paralysis.` |

**Where:** Webflow → Pages → [Page] → Page Settings → Meta Description
**Impact:** HIGH — Controls what appears in Google search results

### 1.3 Add Open Graph Tags

Missing OG tags means social sharing (LinkedIn, Facebook, Twitter/X, iMessage) will show generic previews or nothing.

For each page, add in Webflow Page Settings → Open Graph:

| Tag | Homepage Value |
|-----|---------------|
| og:title | `The Creative Hotline — Get Unstuck in One Call` |
| og:description | `45-minute creative direction calls with a custom action plan delivered within 24 hours. Starting at $499.` |
| og:image | Upload a 1200x630px branded image (logo + tagline on brand background) |
| og:type | `website` |

**Impact:** HIGH — Critical for social media sharing, especially LinkedIn where creative professionals hang out

---

## Priority 2: Fix This Week (SEO Fundamentals)

### 2.1 Consolidate H1 Tags

**Issue:** Homepage has 5+ H1 tags. Google expects ONE H1 per page.

**Fix:**
- Keep only the main hero headline as H1: "Get Unstuck in One Call" (or similar)
- Demote all other H1s to H2 or H3
- Rule of thumb: H1 = page title, H2 = section headers, H3 = sub-sections

**Where:** Webflow → Designer → Select each heading → Change tag from H1 to H2/H3
**Impact:** MEDIUM — Helps Google understand page hierarchy

### 2.2 Fix Image Alt Tags

**Issue:** Most images have generic or missing alt text ("image", empty, or Webflow defaults).

**Fix:** Write descriptive alt text for every image:

| Instead of | Use |
|-----------|-----|
| `alt="image"` | `alt="Creative direction call in progress"` |
| `alt=""` | `alt="The Creative Hotline logo"` |
| `alt="hero-image"` | `alt="Creative professional on a strategy call with The Creative Hotline"` |

**Where:** Webflow → Designer → Click image → Settings → Alt Text
**Impact:** MEDIUM — Accessibility + Google Image search + overall SEO signal

### 2.3 Add Canonical URLs

**Issue:** No canonical URL tags found. Risk of duplicate content issues.

**Fix:** Add canonical tags to each page:

```html
<link rel="canonical" href="https://www.thecreativehotline.com/" />
<link rel="canonical" href="https://www.thecreativehotline.com/pricing" />
<link rel="canonical" href="https://www.thecreativehotline.com/contact" />
```

**Where:** Webflow → Pages → [Page] → Page Settings → Custom Code (Head)
**Impact:** MEDIUM — Prevents duplicate content issues with/without www, trailing slashes, etc.

---

## Priority 3: Conversion Optimization

### 3.1 Add Schema Markup (Structured Data)

Add JSON-LD structured data to help Google understand and feature your business:

**Homepage — LocalBusiness + Service:**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "The Creative Hotline",
  "description": "Creative direction consultancy offering 45-minute strategy calls with custom action plans.",
  "url": "https://www.thecreativehotline.com",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Venice",
    "addressRegion": "CA",
    "addressCountry": "US"
  },
  "priceRange": "$299-$1299",
  "serviceType": "Creative Direction Consulting",
  "areaServed": "Worldwide",
  "sameAs": [
    "https://www.instagram.com/creative.hotline",
    "https://www.linkedin.com/company/thecreativehotline"
  ]
}
</script>
```

**Pricing page — Offer markup:**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Creative Hotline — Standard Call",
  "description": "45-minute creative direction call with custom action plan delivered within 24 hours.",
  "provider": {
    "@type": "ProfessionalService",
    "name": "The Creative Hotline"
  },
  "offers": {
    "@type": "Offer",
    "price": "499",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

**Where:** Webflow → Pages → [Page] → Page Settings → Custom Code (Head)
**Impact:** MEDIUM — Enables rich snippets in Google (price, business info)

### 3.2 Embed Calendly Widget on Contact Page

Current state: External links to Calendly work, but no embedded booking widget.

**Benefit:** Keeps users on-site, reduces friction, improves conversion rate.

**Embed code:**
```html
<!-- Calendly inline widget -->
<div class="calendly-inline-widget" data-url="https://calendly.com/soscreativehotline/creative-hotline-call" style="min-width:320px;height:700px;"></div>
<script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>
```

**Where:** Webflow → Contact page → Add Embed element → Paste code
**Impact:** HIGH for conversion — every click away from site is a potential lost customer

### 3.3 Embed Tally Form on Contact Page

Current state: Clients only discover intake form via email after booking.

**Benefit:** Pre-engaged visitors can fill out the form before even booking, signaling intent.

**Embed code:**
```html
<iframe data-tally-src="https://tally.so/embed/b5W1JE?alignLeft=1&hideTitle=1&transparentBackground=1" loading="lazy" width="100%" height="500" frameborder="0" marginheight="0" marginwidth="0" title="Creative Hotline Intake Form"></iframe>
<script>var d=document,w="https://tally.so/widgets/embed.js",v=function(){"undefined"!=typeof Tally?Tally.loadEmbeds():d.querySelectorAll("iframe[data-tally-src]:not([src])").forEach((function(e){e.src=e.dataset.tallySrc}))};if("undefined"!=typeof Tally)v();else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w;s.onload=v;s.onerror=v;d.body.appendChild(s)}</script>
```

**Where:** Webflow → Contact page → Add Embed element → Paste code
**Impact:** MEDIUM — Collects intent data earlier in funnel

### 3.4 Add a Thank You Page

Currently `success_url` in Stripe points to `https://www.thecreativehotline.com/thank-you` but this page may not exist.

**Create:** A dedicated thank-you page with:
- Confirmation message ("You're in! Check your email for your Calendly booking link")
- What happens next (3 steps: Book → Fill intake form → Get action plan)
- Link to Tally form (so they can start immediately)
- Social sharing prompt

**Impact:** MEDIUM — Reduces post-purchase anxiety, sets expectations, captures Tally submissions faster

---

## Priority 4: Performance & Technical

### 4.1 Check Page Speed

Run these tests and address any issues:
- [PageSpeed Insights](https://pagespeed.web.dev/) — target 90+ on both mobile and desktop
- [GTmetrix](https://gtmetrix.com/) — check for large images, render-blocking scripts

Common Webflow issues to check:
- Oversized hero images (should be <200KB, use WebP format)
- Unused CSS from Webflow template
- Too many external scripts (Calendly, Tally, analytics)

### 4.2 Mobile Responsiveness

Verify on actual mobile devices (not just browser dev tools):
- Booking buttons are easily tappable (min 44x44px)
- Text is readable without zooming
- Forms are usable on mobile
- Pricing cards don't overlap or break layout

### 4.3 Add Google Analytics / Search Console

If not already set up:
1. **Google Analytics 4** — Add GA4 tracking code to Webflow (Project Settings → Custom Code → Head)
2. **Google Search Console** — Verify site ownership, submit sitemap
3. **Webflow auto-generates sitemap** at `www.thecreativehotline.com/sitemap.xml` — verify it exists

---

## Quick Wins Summary

| Fix | Time | Impact |
|-----|------|--------|
| Fix pricing page title | 1 min | HIGH |
| Add meta descriptions (4 pages) | 10 min | HIGH |
| Add OG tags (4 pages) | 15 min | HIGH |
| Consolidate H1 tags | 15 min | MEDIUM |
| Fix image alt tags | 20 min | MEDIUM |
| Add canonical URLs | 5 min | MEDIUM |
| Add schema markup | 10 min | MEDIUM |
| Embed Calendly widget | 5 min | HIGH (conversion) |
| **Total** | **~80 min** | |

---

## Handoff

The technical SEO fixes (title tags, meta descriptions, OG tags, heading hierarchy, alt tags, schema markup, canonical URLs) should go to your Webflow dev along with the [webflow-dev-handoff.md](webflow-dev-handoff.md) document.

The conversion optimization items (Calendly embed, Tally embed, thank-you page) are business decisions — Jake should confirm the page layout and flow before the dev implements.
