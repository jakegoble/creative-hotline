# The Creative Hotline — Internal Data Addendum
**Compiled: March 5, 2026**
**Supplement to: Ads Specialist Intelligence Brief**

---

## CRITICAL CONTEXT: PRE-LAUNCH STATUS

**The Creative Hotline is pre-launch.** All systems are built, connected, and healthy — but there are no completed customer transactions yet. This fundamentally shapes the ads strategy.

### What This Means for the Ads Specialist
1. **No historical conversion data** — can't optimize for "purchase" events initially
2. **No customer list for lookalike audiences** — must rely on interest targeting first
3. **No testimonials from paying clients** — social proof must come from credibility signals (Nike, Sony logos) and the founders' track records
4. **No organic content history** — can't identify top performers to boost
5. **All infrastructure is ready** — ManyChat, Stripe, Calendly, Notion CRM are wired up and waiting

This is actually a clean-slate advantage: the ads specialist can architect tracking and attribution from day one with zero legacy mess.

---

## 1. STRIPE (Revenue & Payments)

| Metric | Value |
|---|---|
| **API Status** | Connected & healthy |
| **Completed transactions** | 0 |
| **Payment intents created** | 2 (both $499, both incomplete — test transactions) |
| **Refunds** | 0 |
| **Products configured** | First Call ($499), Single Call ($699), 3-Session Clarity Sprint ($1,495) |

### What the Ads Specialist Needs to Know
- Stripe is set up as a payment processor connected through Calendly's booking flow
- Checkout sessions are created when users reach the booking page
- 2 incomplete payment intents at $499 suggest the booking flow has been tested but no real customer has completed payment
- **Revenue tracking is ready** — Stripe events will feed into Notion CRM automatically via n8n workflows
- **Refund policy** needs to be defined and communicated in ad landing pages

### Unit Economics to Model (Pre-Revenue)

| Product | Price | Estimated CPA Target | Break-even ROAS |
|---|---|---|---|
| First Call | $499 | $80-$150 | 3.3:1 - 6.2:1 |
| Single Call | $699 | $100-$200 | 3.5:1 - 7.0:1 |
| Clarity Sprint | $1,495 | $150-$350 | 4.3:1 - 10.0:1 |

---

## 2. NOTION CRM (Client Pipeline)

| Metric | Value |
|---|---|
| **API Status** | Connected & healthy |
| **Total records** | 2 (1 test payment by Jake, 1 Laylo test record) |
| **Real customers** | 0 |

### Pipeline Status Breakdown

| Status | Count |
|---|---|
| Lead - Laylo | 1 (test record) |
| Paid - Needs Booking | 1 (Jake's own test) |
| Booked - Needs Intake | 0 |
| Intake Complete | 0 |
| Ready for Call | 0 |
| Call Complete | 0 |
| Follow-Up Sent | 0 |

### CRM Schema Ready for Attribution

The CRM has the following tracking fields ready:
- **Lead Source** (select): IG DM, IG Comment, IG Story, Meta Ad, LinkedIn, Website, Referral, Direct
- **Product Purchased** (select): First Call, Single Call, 3-Session Clarity Sprint
- **Payment Date**, **Call Date** — for time-to-convert analysis
- **Booking Reminder Sent**, **Intake Reminder Sent**, **Nurture Email Sent** — for automation tracking
- **Stripe Session ID** — for revenue reconciliation

**For the ads specialist:** When setting up UTM parameters, map them to the "Lead Source" field. The value "Meta Ad" is already a configured option. Consider adding "Meta Ad - Cold", "Meta Ad - Retarget" as custom sources for campaign-level attribution.

### Intake DB (Pre-Call Questionnaire)

| Metric | Value |
|---|---|
| **Total intakes** | 8 (4 with real data, 4 empty/test) |

**Intake records with data (likely demos/tests):**

| Client | Desired Outcomes | Creative Emergency (excerpt) |
|---|---|---|
| Priya Malhotra | Clear decision, Short action plan | "Launching new product tier in 3 weeks, no idea how to..." |
| Sarah Chen | Stronger positioning, Direction I can trust | "Getting asked to pitch bigger clients but positioning sounds like..." |
| Marcus Thompson | Short action plan, Someone to tell me the truth | "Instagram content performs great but not converting followers to..." |
| Jake Goble | Stronger positioning, Truth, Action plan, Direction | "Need help with my website" |

**Top desired outcomes across intakes:**
1. "A short action plan" — 3 mentions
2. "Stronger positioning" — 3 mentions
3. "Someone to tell me the truth" — 2 mentions
4. "Direction I can trust" — 2 mentions
5. "A clear decision" — 1 mention

**For the ads specialist:** These desired outcomes are literal ad copy gold. The language your target audience uses to describe what they want:
- "A short action plan" → Ad hook: "Get a custom action plan in 24 hours"
- "Someone to tell me the truth" → Ad hook: "Creative direction. No BS."
- "Stronger positioning" → Ad hook: "Stop blending in. Start standing out."
- "Direction I can trust" → Ad hook: "Senior creative direction from people who've done it for Nike, Sony, and the WNBA."

---

## 3. CALENDLY (Booking Data)

| Metric | Value |
|---|---|
| **API Status** | Connected & healthy |
| **Account** | soscreativehotline@gmail.com |
| **Event type** | "Creative Hotline Call" — 45 min, active |
| **Completed bookings** | 0 |
| **Cancelled bookings** | 0 |
| **Upcoming bookings** | 0 |

### Booking Infrastructure
- Single event type configured: 45-minute Creative Hotline Call
- Stripe payment is gated at booking (must pay to book)
- Calendly link is sent after Stripe payment via n8n workflow (WF1)

**For the ads specialist:** The booking flow is: Ad → Landing Page → Stripe checkout → Calendly booking link emailed → Client books a slot. Consider whether a "Book Now" CTA should go directly to a Calendly page with embedded Stripe payment, or to a landing page first. Direct-to-Calendly reduces friction but loses the landing page's persuasion opportunity.

---

## 4. MANYCHAT (Instagram DM Automation)

| Metric | Value |
|---|---|
| **API Status** | Connected & healthy |
| **Total subscribers** | 0 |
| **New subscribers (30d)** | 0 |

### Tags Infrastructure (Pre-Built, Ready for Data)

The ManyChat account has **10 tags** already configured for sophisticated lead tracking:

| Tag | Purpose | Current Count |
|---|---|---|
| `viewed_creative` | Saw creative/portfolio content | 0 |
| `viewed_pricing` | Looked at pricing info | 0 |
| `needs_human` | Requested human handoff | 0 |
| `booked` | Completed booking | 0 |
| `objection_timing` | Expressed timing objection | 0 |
| `objection_price` | Expressed price objection | 0 |
| `abandoned_conversation` | Started but dropped off | 0 |
| `interested_not_booked` | Showed interest, didn't book | 0 |
| `link_clicked` | Clicked a link in DM | 0 |

### Growth Tools (3 Active)

| Tool | Type |
|---|---|
| Quick Automation EN | Comment-to-DM trigger |
| Quick Automation Story Reply | Story reply trigger |
| Quick Automation EN | Comment-to-DM trigger (duplicate) |

### Custom Fields for Ad Attribution

| Field | Type | Purpose |
|---|---|---|
| `ad_campaign` | text | Track which ad campaign drove the DM |
| `ad_source` | text | Track ad source/medium |
| `first_touch_date` | datetime | Record first interaction date |

**For the ads specialist:** This is a sophisticated ManyChat setup ready for ad campaigns. Key implications:

1. **Objection tracking is built in** — when people say "too expensive" or "not the right time", they get tagged. This data will reveal the most common objections to address in ad copy.

2. **Ad attribution is ready** — the `ad_campaign` and `ad_source` custom fields mean you can track which specific ad drove each DM subscriber. Set UTM → ManyChat field mapping from day one.

3. **Comment-to-DM automations are active** — Reels ads with "Comment [KEYWORD]" CTAs will trigger automated DM sequences immediately.

4. **The `interested_not_booked` tag** is your retargeting goldmine — these are warm leads who engaged but didn't convert. Build a custom audience from this segment.

---

## 5. WHAT'S MISSING & NEEDS TO BE SET UP

### Before Running Ads (Blocking)

- [ ] **Meta Pixel + CAPI**: Confirm the pixel is firing on all booking flow pages (website scan shows it's installed, but verify events are tracking: PageView, InitiateCheckout, Purchase)
- [ ] **Custom conversions**: Create in Meta Events Manager for: ViewContent (pricing page), InitiateCheckout (Stripe page), Purchase (booking confirmed)
- [ ] **UTM conventions**: Define standard UTM parameters across all ad campaigns (e.g., `utm_source=meta&utm_medium=paid&utm_campaign=cold_v1&utm_content=reel_skip_agency`)
- [ ] **Landing page**: The current website serves as the landing page but has no dedicated ad-specific LP. Consider creating a stripped-down version focused solely on conversion
- [ ] **First 3-5 ad creatives produced**: Video of Jake/Megha talking to camera, at minimum

### Before Scaling (Important but Not Blocking)

- [ ] **Video testimonials**: Need at least 1-2 client testimonials before scaling spend (first customers are critical)
- [ ] **Lead magnet**: No email capture exists — build one for the secondary funnel (e.g., "5-Minute Brand Audit" checklist)
- [ ] **Email nurture sequence**: 3-5 email series for leads who download lead magnet but don't book immediately
- [ ] **Google Analytics 4**: Verify it's configured with the same conversion events as Meta Pixel
- [ ] **Retargeting audiences**: Build and let them populate for 2-4 weeks before running retargeting campaigns

### Data Collection Priorities (First 30 Days)

Once ads are running, track and report weekly:

| Metric | Source | Why It Matters |
|---|---|---|
| CPM & CPC by ad | Meta Ads Manager | Creative performance |
| CTR by ad | Meta Ads Manager | Hook effectiveness |
| Landing page conversion rate | GA4 | Page optimization |
| DM-to-booking rate | ManyChat + Notion | Funnel efficiency |
| Objection tag distribution | ManyChat | Ad copy refinement |
| Cost per booking | Meta + Stripe | True CPA |
| Lead source distribution | Notion CRM | Channel ROI |
| Time from first touch to purchase | ManyChat + Stripe | Sales cycle length |

---

## 6. LAUNCH STRATEGY ADJUSTMENT (Pre-Revenue)

Given the pre-launch status, the original brief's strategy needs modification:

### Phase 0: Organic Foundation (Weeks 1-2, Before Paid)
- Post 10-15 organic Reels establishing Creative Hotline's presence
- Use comment-to-DM on every post to start building ManyChat subscribers
- Get 1-3 "beta clients" through personal network (discounted or free) for testimonial content
- Document the beta calls for before/after content

### Phase 1: Seed Campaign (Weeks 3-4, $20-30/day)
- **Objective**: Traffic/Engagement (NOT conversions — not enough data for Meta to optimize)
- Run 2-3 Reels ads to build retargeting audiences
- Focus on video views and Instagram engagement
- Keyword CTA → ManyChat DMs → qualify manually
- **Goal**: First 5-10 paying customers + testimonials

### Phase 2: Learning (Weeks 5-8, $30-50/day)
- Switch to Conversions objective once you have 10+ purchases
- Start testing audiences: interest-based vs. ManyChat subscriber LAL (if 1,000+ by then)
- Introduce retargeting with testimonial content from Phase 1 clients
- **Goal**: Identify winning creative and audience, approach break-even

### Phase 3: Scale (Weeks 9+, per original brief)
- Follow the Phase 2 and 3 strategy from the original intel brief

### Why This Matters
Meta's algorithm needs ~50 conversion events per ad set per week to optimize. At $499/sale, that's ~$25K/week in revenue per ad set — unrealistic at launch. Starting with engagement/traffic objectives lets the algorithm learn your audience without requiring purchase volume. Switch to conversion optimization once you have enough signal.

---

## 7. COMPETITOR AD INTELLIGENCE

**Meta Ad Library access is blocked from automated tools.** The ads specialist should manually search these terms in the [Meta Ad Library](https://www.facebook.com/ads/library):

### Search Queries to Run
1. "creative direction" — see who's advertising creative direction services
2. "brand strategy call" — direct competitors
3. "creative consultant" — broader competitive set
4. "fractional creative director" — emerging category
5. Search by advertiser: "The Futur", "Chris Do", "Blind", "Collins"

### What to Look For
- **Ad formats**: Video vs static vs carousel
- **Hook text**: First line of ad copy
- **CTA button**: Book Now vs Learn More vs Send Message
- **Run duration**: Longer-running ads = likely profitable (keep an eye on these)
- **Landing page URL**: Where do competitors send traffic?

### Competitive Gap (From Web Research)
- **Talk to a Creative Director** (talktoacreativedirector.com): Free mentorship calls — not a paid competitor but occupies mindshare
- **Chris Do / The Futur**: Sells courses and coaching memberships, NOT individual calls. Massive audience but different model
- **Clarity.fm / Intro.co**: General expert marketplaces (15-20% commission, per-minute rates). Not branded around creative direction
- **No direct competitor** is running a branded, fixed-price creative direction call service with AI-powered briefings and 24-hour action plan delivery. This is a genuine white space.

---

## 8. KEYWORD INTELLIGENCE (For Google Ads)

Specific search volume data requires Google Keyword Planner access (the ads specialist should pull this). Based on industry data:

### Estimated Search Volumes (US, Monthly)

| Keyword | Est. Volume | Intent | Competition |
|---|---|---|---|
| "creative direction" | 5,000-10,000 | Informational (broad) | Medium |
| "creative consultant" | 1,000-3,000 | Mixed | Medium |
| "creative director for hire" | 500-1,000 | High intent | Low-Medium |
| "fractional creative director" | 500-1,500 | High intent | Low |
| "brand strategy session" | 200-500 | High intent | Low |
| "creative direction consultant" | 100-300 | Very high intent | Low |
| "brand strategy call" | 100-200 | Very high intent | Very Low |
| "hire creative director freelance" | 100-300 | High intent | Low |
| "creative consulting call" | <100 | Very high intent | Very Low |

### Recommended Google Ads Priority
- Start with **exact match** on high-intent, low-competition terms
- Budget: $15-20/day initially (secondary to Meta)
- Expected CPC: $3-$12
- These are low-volume but high-intent — every click is someone actively looking for what you sell

---

## 9. EMAIL LIST & AUDIENCE SIZE

| Asset | Size | Lookalike Viable? |
|---|---|---|
| Customer email list | 0 | No (need 100+ for custom audience, 1,000+ for useful LAL) |
| ManyChat subscribers | 0 | No |
| Website visitors (pixel) | Unknown (pixel installed, need to check Events Manager) | Possibly, if site has had traffic |
| Instagram followers | Unknown (check @creative.hotline Insights) | Yes, if 1,000+ |

**Priority action**: Check Instagram Insights for @creative.hotline — follower count, demographics, and engagement rate. If there's an existing organic audience, that's the first retargeting/LAL seed.

---

## 10. REVENUE MODELING

### Path to $800K Revenue Goal

| Scenario | Product Mix | Clients Needed | Clients/Month (12mo) | Ad Budget Needed |
|---|---|---|---|---|
| All First Call ($499) | 100% $499 | 1,603 | 134/mo | $13K-$20K/mo |
| All Single Call ($699) | 100% $699 | 1,144 | 96/mo | $10K-$19K/mo |
| All Sprint ($1,495) | 100% $1,495 | 535 | 45/mo | $7K-$16K/mo |
| **Realistic Mix** | 50% FC, 30% SC, 20% Sprint | **~950** | **~80/mo** | **$8K-$16K/mo** |

### Realistic Mix Breakdown
- 475 First Call clients x $499 = $236,975
- 285 Single Call clients x $699 = $199,215
- 190 Sprint clients x $1,495 = $284,050
- **Total: $720,240** (add ~10% upsells/referrals to hit $800K)

### Capacity Check
At 80 clients/month and 45 minutes/call:
- **60 hours/month of call time** (15 hours/week)
- Plus prep time (AI briefing handles most of this)
- Plus action plan delivery (within 24 hours)
- **This is tight for 1-2 people** — the Sprint clients take 3 calls each

**Recommendation for ads specialist:** Start with First Call ($499) as the primary advertised offer. It's the lowest barrier and builds the client base fastest. Upsell to Sprint during or after the first call.

---

## APPENDIX: Raw Data Files

- `docs/ads-internal-data.json` — Full JSON output from API extraction
- `docs/ads-specialist-intel-brief.md` — Primary strategy brief
- `docs/ads-specialist-intel-brief.pdf` — PDF version of strategy brief
- `scripts/ads_data_extract.py` — Reusable script to pull fresh data

**To refresh data after launch:**
```bash
cd /Users/bronteruiz/Projects/creative-hotline
python3 scripts/ads_data_extract.py
```

---

## SOURCES

- Live API queries: Stripe, Notion, Calendly, ManyChat (March 5, 2026)
- [Meta Ad Library](https://www.facebook.com/ads/library) (manual search recommended)
- [Google Keyword Planner](https://ads.google.com/home/tools/keyword-planner/) (manual lookup recommended)
- [Fractional Work Statistics 2026](https://columncontent.com/fractional-work-statistics/)
- [ManyChat DM vs Email Performance](https://www.unkoa.com/instagram-dm-automation-vs-email-in-2025-why-manychat-delivers-90-open-rates-and-60-reply-rates/)
- [Consulting Fees & Pricing 2026](https://nmsconsulting.com/consulting-fees-and-pricing-in-2026/)
- [Search Engine Land: Facebook Ad Templates 2026](https://searchengineland.com/facebook-ad-templates-examples-467942)
- [Facebook Ads for Coaches Guide](https://luisazhou.com/blog/facebook-ads-for-coaches/)
