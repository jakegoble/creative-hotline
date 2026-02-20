# Cowork Browser Audit — Creative Hotline

**Date:** 2026-02-20
**Agent:** Cowork (browser verification) + Claude Code (website re-audit post-Webflow publish)
**Tabs audited:** ManyChat, Calendly Admin, Tally, Website, n8n, Notion, Calendly public, Contact page, Laylo

---

## Website Audit (Post-Webflow Publish)

### FIXED by Dev

| Issue | Before | After | Status |
|-------|--------|-------|--------|
| Page titles | "Marketio - Webflow Ecommerce Website Template" | "The Creative Hotline - Get Unstuck in One Call" (homepage), "Contact — The Creative Hotline" (contact) | FIXED (except pricing page) |
| Book a Call buttons | Linked to `/inner-pages/contact` | Now link to `calendly.com/soscreativehotline/creative-hotline-call` | FIXED |
| Footer address | Dubai placeholder address | "Based in Venice, CA" | FIXED |
| Template artifacts | Style Guide, Change Log, Password, License links in footer | Removed | FIXED |
| Pricing page | Empty | Now has actual pricing content | FIXED |
| Social links | Unknown/unverified | LinkedIn, Instagram (@creative.hotline), Facebook present | FIXED |

### STILL NEEDS ATTENTION

| Issue | Severity | Detail |
|-------|----------|--------|
| Pricing page title | MEDIUM | Still shows "Marketio - Webflow Ecommerce Website Template" — only page not updated |
| Contact form dead end | HIGH | "General Inquiries" form (First Name, Last Name, Email, Subject, Message) submits via Webflow but NOT connected to n8n/Notion pipeline |
| Some nav links broken | LOW | Mix of working paths (`/`, `/about`, `/contact`) and non-functional `#` anchors in some nav instances |
| Pricing confusion | MEDIUM | Homepage shows $499 single call. Pricing page shows "Pay as You Go" $500/month and "Premium" $599/month. Inconsistent with Stripe products ("Standard Call", "3-Pack Sprint", "First Call") |
| No Tally form on contact page | MEDIUM | Contact page has booking buttons to Calendly and Laylo, but no Tally intake form embed. Clients must wait for email to discover the intake form |
| No Calendly embed | LOW | External Calendly links work, but no embedded widget for frictionless booking on-site |
| Footer email signup | LOW | Present with success messaging, but unclear what platform it connects to (not Notion, not Laylo) |

---

## Cowork Browser Tab Findings

### 1. Notion — Intake Records (CRITICAL check)

**Result: Fields ARE populated at runtime.**

Verified by Claude Code via Notion MCP:
- Sarah Chen: Brand "Moonlight Studio", Creative Emergency populated, AI Summary populated, Desired Outcome ["Stronger positioning", "Direction I can trust"]
- Marcus Thompson: Brand "Rebel Roast Co.", all fields populated, AI Summary populated

The empty `textContent` values in n8n MCP exports are a serialization artifact, not a runtime bug. **No data loss occurring.**

### 2. Tally — Form Field Labels

Form at `tally.so/r/b5W1JE` contains:
- Name, Email, Role, Brand/Company
- Website / IG handle
- Creative Emergency (free text)
- Desired Outcome (options matching Notion multi_select)
- What They've Tried (free text)
- Deadline (free text)
- Constraints / Things to Avoid (free text)

WF3 uses fuzzy label matching on `data.fields` array — labels must match for data extraction to work. Current labels align with WF3 Extract Tally Data code node.

### 3. n8n — Execution Logs

- All 9 workflows still active
- **WF8 and WF9 still active and running despite being broken** — need immediate deactivation
- WF8 last updated: 2026-02-20 08:06:46 (no structural changes)
- WF9 last updated: 2026-02-20 08:00:17 (no structural changes)
- No node changes detected across any workflows since initial audit

### 4. Calendly — Event Configuration

- Public booking page live: `calendly.com/soscreativehotline/creative-hotline-call`
- Event: 45-minute Creative Hotline Call
- Website "Book a Call" buttons now correctly link to Calendly (FIXED)

### 5. Website — Verified Issues

See "Website Audit (Post-Webflow Publish)" section above. Major improvements made by dev. Remaining items documented.

### 6. ManyChat — Flows + Knowledge Base

From Cowork's prior session verification:
- 4 automations active (Welcome DM, Comment-to-DM, Story Mention Reply, Ice Breaker Menu)
- AI Replies ON, responding to DMs using Knowledge Base
- AI Comments OFF (ManyChat UI bug — Comment-to-DM workaround active)
- 2 AI Goals live (Share Booking Link + Capture Email)
- Knowledge Base: 5 entries (business info, pricing, Frankie persona, booking process, FAQ/objections)
- Booking link shared via ManyChat: Calendly URL (correct)

### 7. Laylo — Webhook Config

- Laylo community page: `laylo.com/creative-hotline`
- Website "TEXT FRANKIE" and "TEXT US" buttons link to Laylo (correct)
- Keywords active: BOOK, PRICING, HELP
- Webhook to n8n: `https://creativehotline.app.n8n.cloud/webhook/8e422442-519e-4d42-8cb4-372d26b89edc`

### 8. Stripe — Product/Price Names

From website pricing:
- Single Call: $499 (homepage) / $500 "Pay as You Go" (pricing page) — **price mismatch**
- 3-Pack: mentioned on homepage
- Notion select options: "Standard Call", "3-Pack Sprint", "First Call"
- **Stripe product names need verification** — pricing page shows different structure than Notion expects

---

## Summary: What Changed, What Didn't

### Dev Fixed (6 items)
1. Page titles (homepage + contact page)
2. Book a Call buttons → Calendly
3. Footer address → Venice, CA
4. Template artifacts removed
5. Pricing page populated
6. Social links added

### Still Broken (7 items)
1. Pricing page title still "Marketio"
2. Contact form not connected to pipeline
3. Some nav links still # anchors
4. Pricing amounts inconsistent ($499 vs $500 vs $599)
5. No Tally form embed on site
6. WF8 + WF9 still active in n8n
7. All n8n workflow bugs from overnight audit remain unfixed

### New Findings
1. Laylo integration on website looks correct (TEXT FRANKIE → laylo.com/creative-hotline)
2. Website now has clear dual CTA pattern: Book a Call (Calendly) + Text Frankie (Laylo)
3. Pricing page structure suggests potential new product tiers not yet in Notion/Stripe
