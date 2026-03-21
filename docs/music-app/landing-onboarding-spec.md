# Music Command Center -- Landing Page, Onboarding & Public Pages Spec

**Date:** 2026-02-26
**Author:** The Builder (BUILD)
**Status:** Draft v1
**Depends on:** strategy-and-business.md (COS), voice-and-copy-guide.md (FRANK)
**App Location:** `/Users/bronteruiz/music-command-center-next/`

---

## Table of Contents

1. [Design Direction](#1-design-direction)
2. [Landing Page](#2-landing-page)
3. [Onboarding Flow](#3-onboarding-flow)
4. [Public Pages](#4-public-pages)
5. [Performance Targets](#5-performance-targets)
6. [Component Architecture](#6-component-architecture)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Design Direction

### 1.1 Visual Philosophy

The app already has a strong dark-mode identity: `#0e1117` background, `#161b22` card surfaces, Inter typeface, Spotify green as the primary accent. The landing page should feel like a natural extension of this -- but warmer and more cinematic than the dashboard.

**Two visual modes:**

| Context | Mood | Rationale |
|---------|------|-----------|
| **Landing page / marketing** | Cinematic, atmospheric, bold typography | First impressions. The page is a stage. It needs to stop the scroll and create desire. |
| **App / dashboard** | Clean, functional, information-dense | Daily use. Once someone is inside, clarity and density matter more than drama. |

The landing page uses the same color palette but amplifies it: larger type, more negative space, gradient backgrounds, subtle grain texture, and animated data visualizations that show the product in motion.

### 1.2 Color System

The existing Tailwind theme in `globals.css` serves as the base. For the landing page, we extend it:

```
Landing-specific additions:
  --color-hero-gradient-start: #0e1117    (existing bg)
  --color-hero-gradient-mid: #111827      (slightly warmer dark)
  --color-hero-gradient-end: #0c1222      (deep blue-black)
  --color-glow-green: rgba(29, 185, 84, 0.15)   (Spotify green glow)
  --color-glow-blue: rgba(88, 166, 255, 0.12)    (accent blue glow)
  --color-surface-elevated: #1a2030       (raised sections)
```

### 1.3 Typography Scale

The app uses Inter. The landing page should add **one display face** for headlines only -- a variable-weight sans-serif that has more personality at large sizes. Candidates:

- **Satoshi** (free, variable, geometric) -- clean but distinctive at 48-72px
- **General Sans** (free, variable) -- slightly warmer than Inter, strong at display sizes
- **Inter Display** (the display optical size of Inter) -- safest choice, zero new font load

**Recommendation:** Use Inter Display at 48-80px for headlines. It keeps the brand consistent and avoids the performance hit of a second font family. Save a display face for a future brand evolution.

**Landing page type scale:**
```
Hero headline:    clamp(2.5rem, 5vw + 1rem, 4.5rem)  font-weight: 700  letter-spacing: -0.03em
Section headline: clamp(1.75rem, 3vw + 0.5rem, 2.5rem) font-weight: 700  letter-spacing: -0.02em
Body large:       1.125rem / 1.7 line-height  font-weight: 400
Body:             1rem / 1.6 line-height  font-weight: 400
Caption:          0.875rem / 1.5 line-height  font-weight: 500
```

### 1.4 Dark Mode Default, Light Mode Later

Ship dark-only for v1. The existing app is dark-only. The target audience (musicians, producers) overwhelmingly prefer dark interfaces -- studio environments, late-night sessions, phone usage at shows. Light mode is a Phase 2 feature.

### 1.5 Animation & Motion Principles

1. **Entrance animations:** Elements fade in and slide up slightly (8-12px) on scroll. Use `IntersectionObserver` or `framer-motion` `whileInView`. Duration: 400-600ms, ease-out.
2. **Data animations:** Numbers count up on first view. Charts draw in progressively. This creates the feeling of data "arriving."
3. **Micro-interactions:** Buttons have subtle scale (1.02x) on hover. Cards lift slightly on hover (already in KpiCard). Links underline-animate from left.
4. **No parallax.** It hurts performance, causes motion sickness, and adds zero value for a data product.
5. **Respect `prefers-reduced-motion`.** All animations wrapped in a media query check. Reduced-motion users get instant state changes.

### 1.6 Mobile-First Mandate

Musicians live on their phones. The landing page must be designed mobile-first, then enhanced for desktop. Specific requirements:

- Touch targets: minimum 44x44px
- No horizontal scroll at any viewport
- Bottom-anchored CTA on mobile (fixed, semi-transparent, appears after scroll)
- Charts in the demo section must be legible at 375px width
- Text hierarchy must work without relying on column layouts
- Test at: 375px (iPhone SE), 390px (iPhone 15), 412px (Pixel), 768px (iPad), 1280px (laptop), 1440px (desktop)

---

## 2. Landing Page

### 2.1 Page Structure (Wireframe)

```
+========================================================+
|  [NAV BAR]                                              |
|  Logo          Features  Pricing  Blog     [Sign Up]    |
+========================================================+
|                                                         |
|  HERO SECTION                                           |
|  -------------------------------------------------------+
|                                                         |
|  Your music is telling you something.                   |
|  We help you hear it.                                   |
|                                                         |
|  [Start free -- connect Spotify in 30 seconds]          |
|  No credit card. No commitment. Just clarity.           |
|                                                         |
|  +---------------------------------------------------+ |
|  |                                                     | |
|  |  [ANIMATED DASHBOARD PREVIEW]                       | |
|  |  Realistic screenshot of the dashboard with         | |
|  |  subtle data animation -- numbers counting up,      | |
|  |  chart lines drawing in                             | |
|  |                                                     | |
|  +---------------------------------------------------+ |
|                                                         |
+=========================================================+
|                                                         |
|  SOCIAL PROOF BAR                                       |
|  -------------------------------------------------------+
|  "Trusted by 1,200+ independent artists"                |
|  [Artist avatar] [Avatar] [Avatar] [Avatar] +891 more   |
|  Or pre-launch: "Built by a working musician, for       |
|  working musicians."                                    |
|                                                         |
+=========================================================+
|                                                         |
|  PROBLEM / SOLUTION                                     |
|  -------------------------------------------------------+
|                                                         |
|  You're checking 5 dashboards and still guessing.       |
|                                                         |
|  [Icon] Spotify for Artists     -- streams only         |
|  [Icon] Apple Music for Artists -- Apple only            |
|  [Icon] Instagram Insights     -- social only           |
|  [Icon] DistroKid dashboard    -- revenue only          |
|  [Icon] Your spreadsheet       -- outdated yesterday    |
|                                                         |
|  One place. Every platform. Actual strategy.             |
|                                                         |
+=========================================================+
|                                                         |
|  FEATURE SHOWCASE (3 pillars)                           |
|  -------------------------------------------------------+
|                                                         |
|  +------------------+  +------------------+              |
|  | SEE EVERYTHING   |  | KNOW WHAT'S      |              |
|  |                  |  | WORKING          |              |
|  | Cross-platform   |  | AI-powered       |              |
|  | streams, revenue,|  | insights that    |              |
|  | social, playlists|  | tell you what    |              |
|  | -- one dashboard.|  | to do next.      |              |
|  |                  |  |                  |              |
|  | [Screenshot:     |  | [Screenshot:     |              |
|  |  Dashboard]      |  |  AI Insights]    |              |
|  +------------------+  +------------------+              |
|                                                         |
|  +------------------+                                   |
|  | EARN SMARTER     |                                   |
|  |                  |                                   |
|  | Revenue estimates|                                   |
|  | by platform,     |                                   |
|  | by track. See    |                                   |
|  | what your music  |                                   |
|  | actually earns.  |                                   |
|  |                  |                                   |
|  | [Screenshot:     |                                   |
|  |  Revenue page]   |                                   |
|  +------------------+                                   |
|                                                         |
+=========================================================+
|                                                         |
|  THE "AHA MOMENT" DEMO                                  |
|  -------------------------------------------------------+
|                                                         |
|  Here's what we found for an artist like you.           |
|                                                         |
|  +---------------------------------------------------+ |
|  |  INTERACTIVE MINI-DASHBOARD                         | |
|  |  Shows a demo artist's data:                        | |
|  |  - Growth score: 67                                 | |
|  |  - Revenue estimate: $2,180/year                    | |
|  |  - Top insight: "Your collab posts get 2.2x more   | |
|  |    engagement. You only collab 12% of the time."    | |
|  |  - Radar chart (strategy shape)                     | |
|  |                                                     | |
|  |  [See your own data -- connect Spotify]             | |
|  +---------------------------------------------------+ |
|                                                         |
+=========================================================+
|                                                         |
|  TESTIMONIALS / SOCIAL PROOF                            |
|  -------------------------------------------------------+
|                                                         |
|  "I was checking 4 different dashboards every morning.  |
|   Now I check one."                                     |
|   -- [Name], [X]K monthly listeners                     |
|                                                         |
|  "The AI told me my Tuesday releases outperform Friday  |
|   by 40%. That one insight paid for the whole year."    |
|   -- [Name], independent producer                       |
|                                                         |
|  "Finally, someone built Spotify Wrapped but for every  |
|   day of the year."                                     |
|   -- [Name], manager                                    |
|                                                         |
+=========================================================+
|                                                         |
|  PRICING PREVIEW                                        |
|  -------------------------------------------------------+
|                                                         |
|  Start free. Upgrade when you're ready.                 |
|                                                         |
|  [Free]      [Starter $9/mo]   [Pro $29/mo]            |
|   Dashboard    + Daily data      + 5 artists            |
|   Revenue est  + Unlimited AI    + Benchmarks           |
|   1 AI/week    + Full export     + Playlists            |
|   Weekly data  + No watermark    + API access            |
|                                                         |
|  [Start Free]  [Start Free]     [Start Free]            |
|                                                         |
+=========================================================+
|                                                         |
|  COMPARISON TABLE                                       |
|  -------------------------------------------------------+
|                                                         |
|  How we compare                                         |
|                                                         |
|  Feature         | Us  | Chartmetric | Spotify f/A     |
|  AI insights     | Yes | No          | No              |
|  Revenue est.    | Yes | No          | No              |
|  Cross-platform  | Yes | Yes         | No              |
|  Free tier       | Yes | Limited     | Spotify only    |
|  Price           | $0  | $100+/mo    | Free (1 DSP)    |
|                                                         |
+=========================================================+
|                                                         |
|  FAQ                                                    |
|  -------------------------------------------------------+
|  Accordion: 6-8 questions                               |
|                                                         |
+=========================================================+
|                                                         |
|  FINAL CTA                                              |
|  -------------------------------------------------------+
|                                                         |
|  Your music is already doing the work.                  |
|  See what it's telling you.                             |
|                                                         |
|  [Start free -- takes 30 seconds]                       |
|                                                         |
+=========================================================+
|                                                         |
|  FOOTER                                                 |
|  -------------------------------------------------------+
|  Logo   Features  Pricing  Blog  Privacy  Terms         |
|  Built by the team behind The Creative Hotline          |
|  (c) 2026                                               |
+=========================================================+
```

### 2.2 Section-by-Section Copy

All copy follows FRANK's voice guide: musician-first, warm confidence, studio frame of reference, short declarative rhythmic sentences.

#### Navigation Bar

Sticky on scroll. Transparent over hero, transitions to solid `bg-card` with backdrop-blur on scroll. Logo left, nav links center, CTA right.

```
Logo: [Music Command Center]  (or final brand name)
Links: Features | Pricing | Blog
CTA Button: "Sign up free" (ghost style on hero, solid on scroll)
```

Mobile: Hamburger menu. Logo left. CTA button right (always visible).

#### Hero Section

**Headline:** "Your music is telling you something."

**Subhead:** "Streaming data, revenue, social, playlists -- scattered across a dozen dashboards. We bring it together. Then we tell you what to do about it."

**Primary CTA:** "Start free -- connect Spotify in 30 seconds"

**Sub-CTA text:** "No credit card. No setup fee. Just your music and the data behind it."

**Visual:** Full-width app screenshot, floating in a subtle perspective tilt (3-5 degrees, CSS transform). The screenshot shows the dashboard page with real data visible. On load, the numbers animate (count up from 0), the chart bars grow, the radar chart draws -- making the static image feel alive.

**Background:** Gradient from `#0e1117` to `#0c1222` with a subtle radial glow (Spotify green, 8% opacity) behind the screenshot. Optional: very subtle noise/grain texture overlay at 2-3% opacity.

**Mobile adaptation:** Headline stacks to 2 lines. Screenshot scales to full width with horizontal scroll hint for the chart sections. CTA becomes full-width button.

**Copy alternatives (A/B test candidates):**

- Alt A: "The dashboard your distributor should have built."
- Alt B: "Every stream, every dollar, every insight. One place."
- Alt C: "Stop guessing. Start knowing."

#### Social Proof Bar

**Pre-launch (0-100 users):**
> "Built by a working musician with 4.6M streams, for every artist tired of checking five dashboards."

**Early traction (100-1,000 users):**
> "Joined by 847 independent artists this month"
> [Scrolling ticker of recent signups: "A producer in LA just connected..." "An artist in London just got their first insight..."]

**Scale (1,000+ users):**
> "Trusted by [X] artists tracking [Y]M+ streams"
> [Row of avatar circles + "+891 more"]

**Logo bar (when available):** Badges of notable playlists or publications, not label logos. "Featured on" or "Artists from playlists like:" with playlist artwork.

#### Problem Statement Section

**Headline:** "You're checking 5 dashboards and still guessing."

**Layout:** A visual stack of platform logos (Spotify, Apple Music, IG, DistroKid/TuneCore, a sad spreadsheet icon), each with a one-line limitation. They appear dim and fragmented. Below, a single glowing card shows the unified dashboard.

**Copy per platform:**
- **Spotify for Artists** -- "Streams and listeners. But only Spotify."
- **Apple Music for Artists** -- "Another silo. Another login."
- **Instagram Insights** -- "Engagement data that never connects to your streams."
- **Your distributor** -- "Revenue numbers, 30 days late."
- **Your spreadsheet** -- "Already out of date."

**Resolution line:** "One place. Every platform. Actual strategy."

**Design note:** The fragmented platforms should visually "collapse" into the unified dashboard on scroll (CSS animation or scroll-triggered transition). On mobile, this is a vertical stack that converges.

#### Feature Showcase

Three pillars, each with a heading, 2-3 sentences of copy, and a product screenshot. On desktop: 2-column grid for first two, full-width for third. On mobile: vertical stack.

**Pillar 1: "See everything"**
> Your streaming data, social engagement, revenue, and playlist placements -- pulled together from every platform you're on. No more tab-switching. No more mental math. One dashboard, updated daily.

Screenshot: Dashboard page showing KPI cards + charts.

**Pillar 2: "Know what's working"**
> AI-powered strategy recommendations built from your actual data. Not generic advice -- specific moves for your catalog, your audience, your career stage. The kind of insight that used to require a manager and an analyst.

Screenshot: AI Insights page showing strategy score + priority lanes.

**Pillar 3: "Understand your money"**
> See what your music actually earns, broken down by platform and track. Estimated revenue, blended rates, ownership splits. The financial picture your distributor never shows you.

Screenshot: Revenue page showing platform breakdown.

**Design treatment:** Each pillar card has a subtle colored top border matching its accent (green for streaming, red for AI, gold for revenue). Screenshots are rendered inside a browser chrome mockup with rounded corners, sitting on a slight elevation shadow.

#### Interactive Demo Section

This is the conversion accelerator. A self-contained mini-dashboard that works with demo data, giving visitors a taste of the "aha moment" without signing up.

**Headline:** "Here's what a career looks like through the lens."

**Implementation:** A React component embedded in the page that renders:
1. A strategy score (animated radar chart)
2. Revenue estimate (counting up)
3. One AI insight card (the collab multiplier insight)
4. A small streaming chart (bar chart, top 5 tracks)

The data is static demo data (already exists in the app's data files). The component reuses the existing `KpiCard`, `Card`, and Recharts components from the app.

**CTA below the demo:** "This is demo data. See your own -- connect Spotify."

**Mobile:** The demo renders as a scrollable horizontal card carousel (swipe between score, revenue, insight, chart).

#### Testimonials

**Layout:** Three-column on desktop, carousel on mobile. Each testimonial card has:
- Quote text (2-3 sentences max)
- Name, one credential (monthly listeners, role, genre)
- Optional: small avatar or genre-color gradient circle

**Pre-launch strategy:** Use Jake's own experience as the first testimonial. Frame it as the founder's story:
> "I built this because I was tired of checking Songstats, Spotify for Artists, Instagram Insights, and a Google Sheet every morning before I could figure out what was actually working. Now I open one tab."
> -- Jake Goble, 4.6M streams, Organic House

As beta users come in, replace with real testimonials. Target: 3 testimonials at launch, 6 within 60 days.

**Copy guidelines for testimonials (per FRANK voice):**
- Specific numbers over vague praise ("saved me 2 hours a week" > "so useful")
- Mention a specific feature or insight that changed a decision
- Include the artist's listener count or track count -- contextualizes their level

#### Pricing Preview

**Headline:** "Start free. Upgrade when you're ready."

**Subhead:** "No credit card to start. No feature cliffs that make the free tier useless."

**Layout:** Three cards side by side (desktop), vertical stack (mobile). The Starter tier is visually emphasized (slightly larger, "Most Popular" badge).

**Free tier card:**
```
Free -- $0/forever
-----
Dashboard overview
Cross-platform estimates
Revenue estimation
1 AI insight per week
Weekly data refresh
Catalog browser

[Start free]
```

**Starter tier card:**
```
Starter -- $9/mo ($7/mo annual)
-----
Everything in Free, plus:
Daily data refresh
Unlimited AI insights
Full streaming analytics
Full IG analytics
Collaborator analysis
Revenue by track
PDF/CSV export
Weekly email digest

[Start free]  <-- note: all tiers start with free signup
"Most popular"
```

**Pro tier card:**
```
Pro -- $29/mo ($22/mo annual)
-----
Everything in Starter, plus:
Track up to 5 artists
Competitor benchmarking
Playlist intelligence
Growth projections
TikTok + YouTube
Content calendar (AI)
API access
Priority support

[Start free]
```

**Design:** Cards use the existing `bg-card` surface. The selected/popular card has a subtle green border glow. All CTAs say "Start free" because every path begins with the free tier -- this reduces friction.

**Below the cards:** "Questions? jake@radanimal.co" (personal touch for early-stage trust).

#### Comparison Table

**Headline:** "How we compare"

Minimal table, 5 rows max. Checkmarks and X marks. Our column is visually highlighted.

| Feature | Us (Free) | Chartmetric | Spotify for Artists |
|---------|:---------:|:-----------:|:-------------------:|
| Cross-platform streaming | Yes | Yes ($100+/mo) | No (Spotify only) |
| Revenue estimation | Yes | No | No |
| AI strategy recommendations | Yes | No | No |
| Social analytics | Yes | Limited | No |
| Price for indie artists | $0 | $10-100+/mo | Free (1 platform) |

**Design note:** Do not make this adversarial. Frame as "here's where we fit" not "here's why they suck." The table should feel informative, not competitive.

#### FAQ Section

Accordion-style. 6-8 questions.

**Q: Is it really free?**
> Yes. The free tier gives you a working dashboard with cross-platform estimates, revenue data, and one AI insight per week. No credit card, no trial period, no bait-and-switch. Paid tiers add daily data, unlimited AI, and multi-artist support.

**Q: How does it work?**
> Connect your Spotify for Artists account (takes 30 seconds). We pull your streaming data, estimate cross-platform numbers, calculate revenue, and generate your first AI insight. You can also connect Instagram and your distributor for a fuller picture.

**Q: How accurate is the revenue estimate?**
> We estimate revenue using published per-stream rates for each platform and your streaming data. It is an estimate, not an accounting tool. Most artists tell us it is within 10-15% of their actual royalty statements. As you connect more data sources, the estimate gets more precise.

**Q: Can I track multiple artists?**
> Yes, on the Pro plan ($29/mo). You can track up to 5 artist profiles, which is ideal for managers or artists with multiple projects.

**Q: What data do you access?**
> We read your public streaming stats (streams, listeners, playlists) and, if you connect Instagram, your engagement data. We never post on your behalf, never access your private messages, and never share your data with anyone.

**Q: Who built this?**
> Jake Goble -- a working musician (Jakke, Enjune) with 4.6M streams who got tired of checking a dozen dashboards. This is the tool he wished existed. It is built by the team behind The Creative Hotline, a creative consultancy for independent artists and brands.

**Q: Can I cancel anytime?**
> Yes. No contracts, no cancellation fees. Your data stays accessible on the free tier even if you downgrade.

**Q: What platforms do you support?**
> Spotify (deepest integration), Instagram, YouTube, Apple Music, SoundCloud, and TikTok (coming soon). Revenue estimation covers all major DSPs. We add new platforms based on user requests.

#### Final CTA Section

Full-width section with dramatic background (the subtle green glow returns, stronger here).

**Headline:** "Your music is already doing the work."
**Subhead:** "See what it's telling you."
**CTA:** "Start free -- takes 30 seconds"

This mirrors the hero but with a more confident, closing tone. The visitor has seen the product, the features, the price. This is the final push.

#### Footer

Minimal. Dark background, muted text.

```
[Logo]

Product       Company        Legal
Features      About          Privacy Policy
Pricing       Blog           Terms of Service
Changelog     Contact

Built by the team behind The Creative Hotline
jake@radanimal.co

(c) 2026 Music Command Center
```

### 2.3 Landing Page Technical Notes

**Route:** The landing page lives at `/` when the user is NOT authenticated. When authenticated, `/` renders the dashboard. This is a standard SaaS pattern.

**Implementation approach:**
```
src/app/(marketing)/layout.tsx    -- marketing layout (no sidebar)
src/app/(marketing)/page.tsx      -- landing page
src/app/(marketing)/pricing/page.tsx
src/app/(marketing)/blog/page.tsx

src/app/(app)/layout.tsx          -- app layout (sidebar, auth-required)
src/app/(app)/dashboard/page.tsx  -- current page.tsx moves here
src/app/(app)/streaming/page.tsx
... etc
```

Using Next.js route groups `(marketing)` and `(app)` keeps the layouts separate. The marketing layout has no sidebar, different nav, and different head metadata (SEO-optimized).

**SEO metadata for landing page:**
```
title: "Music Command Center -- Streaming analytics and AI insights for independent artists"
description: "See your music career in one place. Cross-platform streaming data, revenue estimates, AI-powered strategy recommendations. Free for independent artists."
og:image: /og-landing.png (1200x630, dashboard screenshot with headline overlay)
```

---

## 3. Onboarding Flow

### 3.1 Design Goals

1. **Time-to-first-insight: under 90 seconds.** From "Sign Up" click to seeing their first real data point.
2. **Progressive disclosure.** Don't ask for everything upfront. Get one connection (Spotify), show value immediately, then prompt for more.
3. **Zero-configuration start.** The dashboard should render something useful with just a Spotify connection. Everything else is optional.
4. **Trust through transparency.** Tell the user exactly what data you are accessing and what you are not.

### 3.2 Flow Diagram

```
[Landing Page CTA]
        |
        v
+-------------------+
| STEP 1: SIGN UP   |
| Email + password   |
| OR Google OAuth    |
| OR Spotify OAuth   |  <-- fastest path (combines signup + data connection)
+-------------------+
        |
        v
+-------------------+
| STEP 2: CONNECT   |
| SPOTIFY            |
|                    |
| "Your streaming    |
|  backbone. This is |
|  where the story   |
|  starts."          |
|                    |
| [Connect Spotify]  |
| [Skip for now]     |
+-------------------+
        |
        v
+-------------------+
| STEP 3: LOADING   |
| DATA               |
|                    |
| Progress indicator |
| with rotating      |
| microcopy:         |
| "Reading your      |
|  streaming         |
|  history..."       |
| "Mapping your      |
|  playlist          |
|  network..."       |
| "Building your     |
|  strategy score.." |
|                    |
| [Animated progress |
|  bar or circular   |
|  indicator]        |
+-------------------+
        |
        v
+-------------------+
| STEP 4: AHA       |
| MOMENT             |
|                    |
| "Here's something  |
|  you might not     |
|  know."            |
|                    |
| [Personalized      |
|  insight from      |
|  their data]       |
|                    |
| "That's one        |
|  pattern. There    |
|  are {N} more."    |
|                    |
| [Show me           |
|  everything]       |
+-------------------+
        |
        v
+-------------------+
| DASHBOARD          |
| (Full app)         |
|                    |
| Soft-prompt banner:|
| "Connect Instagram |
|  for social        |
|  insights"         |
+-------------------+
```

### 3.3 Step Details

#### Step 1: Sign Up

**Layout:** Centered card on a dark background. Logo above. Minimal form.

**Fields:**
- Email
- Password (with visibility toggle and strength indicator)
- OR: "Continue with Google" button
- OR: "Continue with Spotify" button (green, most prominent -- this is the fastest path because it combines auth + data connection)

**Copy:**
> **Your music. Your data. One place.**
>
> Sign up to connect your streaming platforms and see your career in a new way. Takes about 60 seconds.

**Below form:** "Already have an account? Sign in"

**Privacy note (small, below CTA):** "We read your streaming stats. We never post on your behalf. [Privacy policy]"

**Mobile:** Full-screen, centered. Form fills available width with comfortable padding.

#### Step 2: Connect Spotify

**Shown if:** User signed up with email/Google (not Spotify OAuth). If they used Spotify OAuth, this step is skipped -- they're already connected.

**Layout:** Centered card with Spotify's green accent. Clear permission explanation.

**Copy:**
> **Connect Spotify for Artists**
>
> Your streaming backbone. Listeners, saves, playlists, popularity -- this is where the story starts.
>
> We'll pull your catalog, streaming history, and playlist placements. Read-only access -- we never modify anything on your account.

**CTA:** "Connect Spotify" (green button, Spotify logo)
**Skip:** "Skip for now -- you can connect later in Settings"

**Additional connections (shown after Spotify, not blocking):**

After Spotify connects, a secondary panel slides in:
> "Want the full picture? These are optional but make your insights sharper."
>
> [Connect Instagram] -- "Social engagement + audience data"
> [Connect distributor] -- "Actual revenue numbers"
> [Continue to dashboard] -- "I'll add these later"

**Design:** Each connection option is a card with the platform's brand color as an accent stripe. Connected platforms show a green checkmark. The "Continue to dashboard" button is always visible and prominent -- never make the user feel trapped in setup.

#### Step 3: Data Loading

**Timing:** 15-45 seconds for initial Spotify data pull. During this time, we show a full-screen loading experience that builds anticipation.

**Layout:** Centered content. Animated circular progress indicator (not a spinner -- a ring that fills). Below it, rotating microcopy lines.

**Microcopy rotation (every 4-5 seconds):**
1. "Reading your streaming history..."
2. "Mapping your playlist network..."
3. "Analyzing your catalog..."
4. "Estimating your cross-platform reach..."
5. "Building your strategy score..."
6. "Almost there -- worth the wait."

**Background:** The progress ring uses a gradient from Spotify green to accent blue. A subtle pulse animation on the ring creates a heartbeat feel.

**Progressive loading:** If Spotify data arrives in chunks, start rendering partial results immediately. Show the catalog count first ("Found 47 tracks"), then streams, then playlists. Each number fades in as it arrives. This makes the wait feel shorter and more alive.

**Error handling:** If the Spotify connection fails or times out:
> "Something went wrong connecting to Spotify. This happens sometimes -- their API can be slow."
>
> [Try again] [Skip and explore with demo data]

The "explore with demo data" option is critical. Never let a technical failure kill the onboarding. The demo data path shows a curated demo artist (similar to the current static data) and prompts the user to connect their real account from the Settings page.

#### Step 4: The "Aha Moment"

This is the most important screen in the entire product. It is the first thing a user sees after connecting their data, and it determines whether they come back tomorrow.

**Layout:** Single full-screen card, centered, dramatic. One insight, beautifully presented.

**Insight selection logic (ranked by impressiveness):**

1. **Revenue estimate** (if > $100): "Your catalog has earned an estimated ${amount}." Most artists have never seen this number.
2. **Playlist reach** (if > 100K): "Your music is sitting in front of {reach} potential listeners right now, across {count} playlists."
3. **Growth score anomaly** (if any dimension > 70): "Your {dimension} score is {score}/100 -- that puts you in the top {percentile}% of indie artists in your genre."
4. **Collaboration insight** (if collab data exists): "Your collab tracks average {collab_avg} streams vs {solo_avg} solo. That's a {multiplier}x multiplier."
5. **Geographic insight** (if audience data available): "Your biggest room is in {top_city}. {percentage}% of your audience is there."
6. **Catalog depth** (fallback): "You've built a catalog of {count} tracks across {genres}. That's the foundation everything else compounds on."

**Template:**
```
Here's something you might not know.

{personalized_insight_paragraph}

That's one pattern. There are {count} more insights waiting in your dashboard.

[Show me everything]
```

**Design:** The insight text should be large (20-24px), well-spaced, centered. The number in the insight should be visually emphasized (larger font, accent color, possibly animated count-up). The background can have a subtle gradient glow matching the insight's category color.

**Mobile:** Same layout, full screen. The "Show me everything" button is fixed at the bottom of the viewport.

### 3.4 Cold Start: What to Show While Waiting for Data

For users who skip Spotify connection or are waiting for data refresh:

**Dashboard (no data):**
> "This is where everything comes together -- streaming, social, revenue, and audience data in one view. Connect Spotify to light it up."
>
> [Connect Spotify]

Show empty-state KPI cards with dashed borders and placeholder "---" values. The layout should be identical to the populated dashboard so the user can see exactly what they'll get.

**Skeleton states:** Every data component should have a skeleton loading state -- pulsing gray rectangles that match the shape of the real content. Use Tailwind's `animate-pulse` on `bg-white/[0.04]` rounded elements.

**Demo mode banner:** If the user is in demo mode (no real data connected), show a persistent but dismissable banner:
> "You're viewing demo data. [Connect your accounts] to see your own numbers."

This banner should be a distinct color (amber/gold) so it is visible without being alarming.

### 3.5 Onboarding Nudges (Post-Signup)

After the user reaches the dashboard, we don't abandon them. Strategic nudges over the first 7 days:

**Day 0 (first session):**
- Soft-highlight the sidebar sections with tooltip popovers: "Your streaming data lives here" / "Revenue breakdown is here" / "AI insights update weekly"
- These are NOT a full tour -- just 3-4 contextual highlights that dismiss on click

**Day 1 (email):**
> Subject: "Your first insight is ready"
> Body: Summary of their strategy score + the top AI recommendation. Link back to dashboard.

**Day 3 (in-app):**
- If Instagram is not connected: banner suggesting connection
- If Instagram IS connected: highlight the Growth page

**Day 7 (email):**
> Subject: "Your week in music"
> Body: First weekly digest (per FRANK voice guide, Section 4). This is the retention hook.

**Design principle:** Every nudge must provide value, not just ask for engagement. Never send an email that says "Come back!" Always send one that says "Here's what happened with your music."

---

## 4. Public Pages

### 4.1 Artist Public Profile

**Route:** `/artist/{slug}` (e.g., `/artist/jakke`)

**Purpose:** A shareable, SEO-optimized page that artists can use as a press kit or link-in-bio destination. This serves dual purposes: it gives the artist a useful tool AND it drives organic traffic to the product.

**Layout:**
```
+=========================================================+
|  ARTIST HEADER                                           |
|  --------------------------------------------------------|
|  [Avatar/Genre Gradient]                                 |
|  Artist Name                                             |
|  Genre badges | Location                                 |
|  Bio (short, from FRANK's bio generator)                 |
|  [Spotify] [Instagram] [YouTube] (social links)          |
+=========================================================+
|  KEY METRICS BAR                                         |
|  --------------------------------------------------------|
|  4.6M streams | 32.1K listeners | 820 playlists          |
+=========================================================+
|  TOP TRACKS                                              |
|  --------------------------------------------------------|
|  Rendered as a visual tracklist (not a table).            |
|  Each track: name, streams, genre badge, popularity bar.  |
|  Click to open on Spotify.                                |
+=========================================================+
|  PLAYLIST PLACEMENTS                                     |
|  --------------------------------------------------------|
|  Top 5 playlists with follower counts.                    |
|  Visual emphasis on the largest.                          |
+=========================================================+
|  STRATEGY SCORE                                          |
|  --------------------------------------------------------|
|  Radar chart (read-only, not interactive).                |
|  Composite score displayed prominently.                   |
+=========================================================+
|  FOOTER CTA                                              |
|  --------------------------------------------------------|
|  "Want your own page? Sign up free."                      |
|  [Create your profile]                                    |
+=========================================================+
```

**SEO optimization:**
- Title: "{Artist Name} -- Streaming Stats, Playlists & Career Analytics"
- Description: "{Artist Name} has {streams} streams across {playlists} playlists. See their full career analytics."
- Open Graph image: Auto-generated card with artist name, strategy score, and top metric (use `@vercel/og` or `satori`)
- Structured data: `MusicGroup` schema.org markup

**Shareability:** The page should generate a beautiful OG image when shared on social. This is the viral mechanic -- artists share their profile, their friends see it, their friends want their own.

**Privacy:** Artists control what is visible on their public profile via Settings. Default: everything public. Option to hide revenue estimates, specific metrics, or make the profile private.

### 4.2 Industry Benchmarks Page

**Route:** `/benchmarks`

**Purpose:** A free, ungated resource page that ranks for SEO terms like "indie artist streaming benchmarks," "how many streams is good for an independent artist," "average spotify streams per month."

**Layout:**
```
+=========================================================+
|  HEADLINE                                                |
|  "Where do you stand? Benchmarks for indie artists."     |
+=========================================================+
|  INTERACTIVE BENCHMARK TOOL                              |
|  --------------------------------------------------------|
|  Input: Monthly listeners [slider or input]               |
|  Input: Genre [dropdown]                                  |
|  Input: Years active [slider]                             |
|                                                          |
|  Output:                                                 |
|  "With 32K monthly listeners in Organic House,            |
|   you're in the top 15% of indie artists in your          |
|   genre who have been active for 3+ years."               |
|                                                          |
|  [Percentile visualization -- bar/gauge]                  |
+=========================================================+
|  BENCHMARK DATA TABLES                                   |
|  --------------------------------------------------------|
|  Average streams by genre                                 |
|  Average monthly listeners by career stage                |
|  Average playlist count by listener tier                  |
|  Revenue estimates by stream count                        |
+=========================================================+
|  CTA                                                     |
|  --------------------------------------------------------|
|  "These are averages. Want to see YOUR numbers?"           |
|  [Sign up free]                                           |
+=========================================================+
```

**Data source:** Aggregated anonymized data from our users (once we have enough), supplemented with publicly available industry data. Initially, use industry benchmarks from published sources (Chartmetric reports, MIDiA Research, Spotify data).

**SEO value:** This page targets high-volume informational queries. It should be updated quarterly with fresh data to maintain rankings.

### 4.3 Revenue Calculator Page

**Route:** `/tools/revenue-calculator`

**Purpose:** A free tool that answers the most-Googled question in music: "How much do artists get paid per stream?" This is the top-of-funnel SEO play.

**Layout:**
```
+=========================================================+
|  HEADLINE                                                |
|  "How much is your music earning?"                        |
+=========================================================+
|  CALCULATOR                                              |
|  --------------------------------------------------------|
|  Input: Total streams across platforms [input field]      |
|  OR                                                      |
|  Input: Spotify streams [input]                           |
|         Apple Music streams [input]                       |
|         YouTube streams [input]                           |
|                                                          |
|  Output:                                                 |
|  Estimated total revenue: $X,XXX                          |
|  Revenue by platform (pie chart)                          |
|  Per-stream rates by platform (table)                     |
|  Daily/monthly/annual estimate breakdown                  |
+=========================================================+
|  CONTEXT                                                 |
|  --------------------------------------------------------|
|  "These are estimates based on published per-stream       |
|   rates. Actual payouts vary by country, subscription     |
|   type, and distributor terms."                           |
|                                                          |
|  Rate table:                                              |
|  Spotify: $0.003-0.005 | Apple: $0.007-0.012             |
|  YouTube Music: $0.006-0.010 | Tidal: $0.012-0.014       |
+=========================================================+
|  CTA                                                     |
|  --------------------------------------------------------|
|  "Want revenue tracking for YOUR catalog,                 |
|   updated automatically?"                                 |
|  [Sign up free -- auto-calculate from your real data]     |
+=========================================================+
```

**Technical note:** The calculator reuses the existing `estimateRevenue()` function from `/src/lib/revenue.ts` and the `RATES` / `PLATFORM_SPLIT` constants from `/src/lib/constants.ts`. No new logic needed -- just a public-facing UI wrapper.

**Email capture:** Optionally, offer to email the results: "Want a PDF of this breakdown? Enter your email." This captures leads without gating the tool itself.

### 4.4 Pricing Page

**Route:** `/pricing`

**Purpose:** Dedicated pricing page with more detail than the landing page preview.

**Layout:** Full-width comparison with feature matrix. Same three tiers as landing page but with complete feature lists, a toggle for monthly/annual pricing, and an FAQ specific to billing.

**Annual discount display:**
- Monthly toggle: $9/mo, $29/mo, $79/mo
- Annual toggle: $7/mo (save 22%), $22/mo (save 24%), $59/mo (save 25%)

**Copy for annual upsell:** "Pay annually, save enough for a new plugin." (Musician-frame reference per FRANK voice.)

### 4.5 Blog / Insights Section

**Route:** `/blog` and `/blog/{slug}`

**Purpose:** SEO content hub. Published articles on music industry data, strategy, and platform tips.

**Initial content plan (first 5 articles):**
1. "How much does Spotify pay per stream in 2026?" (SEO target)
2. "The indie artist's guide to playlist pitching" (SEO target)
3. "We analyzed 10,000 independent releases -- here's what we found" (viral potential)
4. "Why your Tuesday releases might outperform Friday" (data-driven, surprising)
5. "Building your first 1,000 monthly listeners" (beginner funnel)

**Design:** Clean reading experience. Dark background, comfortable line-height (1.7), max-width 680px for text column. Code blocks and data tables styled consistently with the app.

**Technical:** Use MDX files in the repo or a headless CMS (Notion as CMS is viable given existing Notion expertise). For v1, MDX in the repo is simpler.

---

## 5. Performance Targets

### 5.1 Core Web Vitals

| Metric | Target | Strategy |
|--------|--------|----------|
| **FCP** (First Contentful Paint) | < 1.5s | Server-render the landing page. No client-side data fetching for above-the-fold content. |
| **LCP** (Largest Contentful Paint) | < 2.5s | Preload hero image/screenshot. Use `next/image` with priority flag. Inline critical CSS. |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Set explicit dimensions on images and charts. Use skeleton states that match final dimensions. |
| **INP** (Interaction to Next Paint) | < 200ms | Debounce scroll handlers. Use `startTransition` for non-urgent state updates. No blocking JS in the critical path. |
| **TTFB** (Time to First Byte) | < 400ms | Vercel Edge functions. Static generation for marketing pages. ISR for dynamic content. |
| **TTI** (Time to Interactive) | < 3.5s | Code-split aggressively. Defer Recharts bundle. Lazy-load below-fold sections. |

### 5.2 Bundle Strategy

```
Landing page bundle targets:
  - Initial JS: < 80KB gzipped (HTML + critical CSS + hero animation)
  - Deferred JS: < 150KB (Recharts for demo section, animation library)
  - Total JS: < 250KB gzipped

App bundle targets:
  - Initial JS: < 120KB (layout + sidebar + page shell)
  - Per-page JS: < 60KB (page-specific code, loaded on navigation)
  - Recharts: ~45KB gzipped (loaded once, shared across pages)
```

**Code splitting strategy:**
- Marketing pages: statically generated, minimal JS
- App pages: `dynamic(() => import(...))` for chart-heavy components
- Recharts: Load only the chart types used per page (not the entire library)
- Demo section on landing page: lazy-loaded when scrolled into view (`IntersectionObserver`)

### 5.3 Image Strategy

| Asset | Format | Optimization |
|-------|--------|-------------|
| Dashboard screenshots | WebP with PNG fallback | `next/image` with `sizes` prop, responsive srcset |
| Hero background | CSS gradient (no image) | Zero network cost |
| Platform logos | SVG (inline) | Part of the JS bundle, < 1KB each |
| OG images | PNG 1200x630 | Generated at build time with `@vercel/og` |
| Avatar placeholders | CSS gradient circles | No image needed |

### 5.4 Progressive Data Loading (In-App)

The app currently loads all data on mount via `useEffect`. For the multi-user version:

1. **Shell first:** Render the page layout, sidebar, and skeleton states immediately.
2. **KPIs first:** Load the 4-5 KPI numbers before any charts. These are small payloads (< 1KB) and fill the most prominent visual space.
3. **Charts second:** Load chart data in parallel. Each chart has its own loading state.
4. **AI insights last:** These are the most expensive to compute. Load them asynchronously and show a "Generating insights..." state.

**Streaming API pattern:** For the data loading step in onboarding, use Server-Sent Events (SSE) to stream progress updates to the client. This gives real-time feedback as data arrives:

```
event: progress
data: {"step": "catalog", "message": "Found 47 tracks", "percent": 30}

event: progress
data: {"step": "playlists", "message": "Mapped 820 playlists", "percent": 60}

event: progress
data: {"step": "score", "message": "Strategy score: 67", "percent": 90}

event: complete
data: {"redirect": "/dashboard"}
```

### 5.5 Error States

Every data component needs three states: loading, populated, and error.

**Error state design principles:**
1. Never show a blank screen. Always show the page structure with an error message in the failing section.
2. Offer a retry. Every error state includes a "Try again" button.
3. Be honest about what happened. "We couldn't load your streaming data right now" is better than "Something went wrong."
4. Degrade gracefully. If Spotify data fails but Instagram works, show what we have with a note about the missing section.

**Error copy examples:**

*Spotify connection failed:*
> "Spotify's API is being slow right now. This happens sometimes. Your data will update automatically when it's back."
> [Retry now]

*AI insights generation failed:*
> "The insight engine needs a moment. We're generating your recommendations -- check back in a few minutes."
> [Refresh insights]

*No data connected:*
> "This page comes alive when you connect your streaming accounts. Right now it's quiet in here."
> [Connect Spotify]

### 5.6 Offline and Slow Connection

- Cache the last successful data load in `localStorage`. If the user opens the app offline or on a slow connection, show cached data with a "Last updated: [timestamp]" indicator.
- Use `navigator.onLine` and the `online`/`offline` events to show a subtle banner when connectivity is lost.
- The landing page (marketing pages) should work fully offline after first load (static content, no API calls).

---

## 6. Component Architecture

### 6.1 New Components Needed

```
src/components/
  marketing/
    NavBar.tsx              -- Landing page nav (sticky, transparent -> solid)
    Hero.tsx                -- Hero section with animated screenshot
    SocialProofBar.tsx      -- User count + avatars
    ProblemSolution.tsx     -- Platform fragmentation visual
    FeaturePillar.tsx       -- Feature showcase card (reusable x3)
    InteractiveDemo.tsx     -- Mini-dashboard with demo data
    TestimonialCard.tsx     -- Quote + attribution
    PricingCard.tsx         -- Tier card (reusable x3)
    ComparisonTable.tsx     -- Us vs competitors
    FaqAccordion.tsx        -- Expandable Q&A
    FinalCta.tsx            -- Bottom CTA section
    Footer.tsx              -- Site footer

  onboarding/
    SignUpForm.tsx           -- Email/password/OAuth form
    ConnectPlatform.tsx      -- Platform connection card (Spotify, IG, etc.)
    DataLoadingScreen.tsx    -- Progress ring + rotating microcopy
    AhaMoment.tsx            -- First insight reveal
    OnboardingNudge.tsx      -- In-app highlight/tooltip

  public/
    ArtistProfileCard.tsx    -- Public artist page header
    BenchmarkTool.tsx        -- Interactive benchmark calculator
    RevenueCalculator.tsx    -- Public revenue calculator

  shared/
    AnimatedNumber.tsx       -- Count-up animation for numbers
    SkeletonLoader.tsx       -- Configurable skeleton states
    ErrorState.tsx           -- Reusable error with retry
    EmptyState.tsx           -- Reusable empty state with CTA
    ScrollReveal.tsx         -- IntersectionObserver wrapper for entrance animations
```

### 6.2 Reusing Existing Components

The landing page demo section reuses these existing components directly:
- `KpiCard` + `KpiRow` -- for the mini-dashboard KPIs
- `Card` -- for the demo container
- `Section` -- for demo section headers
- Recharts charts (RadarChart, BarChart) -- for the strategy score and top tracks

This ensures visual consistency between the marketing promise and the actual product.

### 6.3 Shared UI Tokens

Create a shared tokens file that both marketing and app components consume:

```typescript
// src/lib/tokens.ts
export const tokens = {
  colors: {
    bg: '#0e1117',
    card: '#161b22',
    hover: '#1c2333',
    border: '#21262d',
    text: '#f0f6fc',
    textDim: '#8b949e',
    textMuted: 'rgba(255,255,255,0.4)',
    spotify: '#1DB954',
    accent: '#58a6ff',
    gold: '#f0c040',
    amber: '#f0883e',
    red: '#f85149',
  },
  spacing: {
    section: 'py-20 md:py-28',        // Landing page section padding
    sectionInner: 'max-w-6xl mx-auto px-4 md:px-6',
    cardPad: 'p-5',
    gap: 'gap-4',
  },
  radii: {
    card: 'rounded-xl',
    button: 'rounded-lg',
    badge: 'rounded-full',
  },
  shadows: {
    card: 'shadow-md',
    elevated: 'shadow-lg',
    glow: (color: string) => `0 0 40px ${color}`,
  },
} as const;
```

---

## 7. Implementation Roadmap

### 7.1 Phase 1: Landing Page (Week 1)

| Task | Priority | Est. Hours | Notes |
|------|----------|------------|-------|
| Route groups setup (`(marketing)` + `(app)`) | P0 | 2 | Restructure existing pages into `(app)` group |
| Marketing layout (NavBar + Footer) | P0 | 3 | No sidebar, marketing nav |
| Hero section | P0 | 4 | Animated screenshot, responsive |
| Social proof bar | P0 | 1 | Static for now, dynamic later |
| Problem/solution section | P1 | 3 | Platform collapse animation |
| Feature showcase (3 pillars) | P0 | 3 | Screenshots + copy |
| Interactive demo | P1 | 4 | Reuse existing chart components with demo data |
| Testimonials | P1 | 1 | Static cards |
| Pricing preview | P0 | 2 | Three tier cards |
| Comparison table | P1 | 1 | Static table |
| FAQ accordion | P1 | 2 | Collapsible sections |
| Final CTA | P0 | 1 | Copy + button |
| SEO metadata | P0 | 1 | Title, description, OG image |
| Mobile QA | P0 | 3 | Test at all breakpoints |
| **Total** | | **31** | |

### 7.2 Phase 2: Auth + Onboarding (Week 2-3)

| Task | Priority | Est. Hours | Notes |
|------|----------|------------|-------|
| Auth provider setup (Clerk or Supabase Auth) | P0 | 4 | |
| Sign-up form component | P0 | 3 | Email + OAuth buttons |
| Spotify OAuth flow | P0 | 6 | OAuth 2.0 PKCE + token storage |
| Instagram OAuth flow | P1 | 4 | Graph API permissions |
| Data loading screen | P0 | 3 | Progress ring + microcopy |
| Aha moment page | P0 | 4 | Insight selection logic |
| Onboarding nudges (day 0) | P1 | 3 | Tooltip highlights |
| Empty states for all pages | P1 | 4 | Per-page empty state copy |
| Skeleton loaders for all pages | P1 | 3 | Reusable component |
| Error states for all pages | P1 | 3 | Reusable component |
| **Total** | | **37** | |

### 7.3 Phase 3: Public Pages (Week 3-4)

| Task | Priority | Est. Hours | Notes |
|------|----------|------------|-------|
| Artist public profile page | P1 | 6 | SSR, SEO, OG image gen |
| Revenue calculator | P1 | 4 | Reuse existing `estimateRevenue()` |
| Benchmarks page | P2 | 6 | Interactive tool + data tables |
| Pricing page (full) | P1 | 3 | Feature matrix + toggle |
| Blog setup (MDX) | P2 | 4 | Layout + first 2 articles |
| **Total** | | **23** | |

### 7.4 Phase 4: Performance + Polish (Week 4-5)

| Task | Priority | Est. Hours | Notes |
|------|----------|------------|-------|
| Bundle analysis + code splitting | P1 | 3 | |
| Image optimization (WebP, srcset) | P1 | 2 | |
| Progressive data loading (shell first) | P1 | 4 | |
| AnimatedNumber component | P2 | 2 | |
| ScrollReveal entrance animations | P2 | 2 | |
| LocalStorage data caching | P2 | 3 | |
| Lighthouse audit + fixes | P1 | 3 | Target all greens |
| Mobile responsive final QA | P0 | 4 | |
| **Total** | | **23** | |

### 7.5 Dependencies

```
Phase 1 (Landing) has NO dependencies -- can start immediately.
Phase 2 (Auth + Onboarding) depends on:
  - Auth provider selection (Clerk vs Supabase)
  - Spotify Developer App registration
  - Database setup (Supabase)
Phase 3 (Public Pages) depends on:
  - Database (for dynamic artist profiles)
  - Phase 2 (onboarding must exist for the CTA flow)
Phase 4 (Performance) depends on:
  - All other phases (optimization happens after features exist)
```

### 7.6 New Dependencies to Install

```json
{
  "dependencies": {
    "framer-motion": "^11.x",       // Scroll animations, entrance effects
    "@vercel/og": "^0.6.x",         // OG image generation
    "@clerk/nextjs": "^5.x",        // Auth (if Clerk chosen)
    // OR
    "@supabase/ssr": "^0.5.x",      // Auth + DB (if Supabase chosen)
  },
  "devDependencies": {
    "sharp": "^0.33.x",             // Image optimization for next/image
    "@next/bundle-analyzer": "^15.x" // Bundle analysis
  }
}
```

Note: `framer-motion` is the only new runtime dependency for the landing page. Everything else is either existing (Recharts, Tailwind, clsx) or build-time only.

---

## Appendix A: Landing Page Copy Quick Reference

All copy adheres to FRANK's voice guide. Quick reference for the builder:

**Do:**
- Use specific numbers ("47 tracks," "820 playlists," not "dozens of tracks")
- Frame everything in music terms ("your catalog," "the room you're playing to")
- Keep sentences under 20 words
- Use "you" and "your" -- speak directly to the artist
- Be honest about what the product does and does not do

**Do not:**
- Say "crushing it," "killing it," "amazing," or any hype language
- Use "leverage," "monetize," "optimize," "KPI," "funnel," "ROI" in copy
- Use exclamation marks (one per page maximum)
- Call musicians "users" or "consumers"
- Promise things the product cannot deliver yet

**CTA language hierarchy:**
1. Primary: "Start free" or "Start free -- connect Spotify in 30 seconds"
2. Secondary: "See your own data"
3. Tertiary: "Learn more" / "See pricing"

Never: "Sign up now!" / "Get started today!" / "Don't miss out!"

---

## Appendix B: Competitor Landing Page Patterns -- What to Learn From

### Chartmetric
- **Good:** Dense feature showcase, clear enterprise positioning, data-rich screenshots.
- **Bad:** Overwhelming. Too much information above the fold. The free tier is buried. The page speaks to labels and managers, not artists. No interactive demo.
- **Learn:** Their depth of data visualization in screenshots is impressive. Match that visual density in our screenshots, but with cleaner framing and musician-first copy.

### DistroKid
- **Good:** Bold, simple hero. One sentence value prop. Immediate price anchor ("$22.99/year"). The page is short and confident. Social proof through artist names and numbers.
- **Bad:** Almost too simple -- limited feature explanation. Hard to understand the full value before signing up. No analytics pitch at all (they don't offer it).
- **Learn:** Their confidence in brevity. The hero is one sentence, one number, one button. That clarity is worth emulating. Our hero should be equally decisive, even if our product is more complex.

### Feature.fm
- **Good:** Clean design. Clear feature segmentation. Good use of video/animation in the hero. Free tier prominently featured. The page speaks directly to artists.
- **Bad:** Too many features displayed equally -- no clear hierarchy of value. The "smart link" focus buries the analytics angle.
- **Learn:** Their use of animated product demos in the hero section. A short video loop or animated screenshot is more compelling than a static image.

### Splice
- **Good:** Beautiful dark design (similar to our direction). Strong visual identity. The product literally plays audio as you browse -- an experiential landing page. Community-forward positioning.
- **Bad:** Very different product (sample marketplace), so the landing page patterns don't all transfer.
- **Learn:** The dark aesthetic + warm accent colors. Their use of audio and motion to make the page feel alive. The community element -- showing that other musicians use this -- is powerful.

### Spotify for Artists
- **Good:** Clean, authoritative. Leverages Spotify's brand strength. The features are presented as stories, not bullet points.
- **Bad:** Only available to artists on Spotify (obvious). Very corporate tone compared to our voice.
- **Learn:** Their "artist stories" approach -- showing how real artists use the tools -- is more compelling than feature lists. We should plan for a "featured artists" section once we have real users.

### Viberate
- **Good:** Affordable pricing prominently displayed. Clean UI screenshots. Good comparison to competitors.
- **Bad:** Generic SaaS feel. Doesn't feel like it was built by musicians.
- **Learn:** Their pricing table design is clean and scannable. The "compare plans" approach with checkmarks works.

---

## Appendix C: Mobile Wireframe -- Landing Page

```
+-----------------------------+
|  [=] Logo         [Sign Up] |
+-----------------------------+
|                              |
|  Your music is               |
|  telling you                 |
|  something.                  |
|                              |
|  Streaming data, revenue,    |
|  social, playlists --        |
|  one place. One strategy.    |
|                              |
|  [Start free - 30 seconds]   |
|                              |
|  +-------------------------+ |
|  | [Dashboard screenshot    | |
|  |  with horizontal scroll  | |
|  |  hint]                   | |
|  +-------------------------+ |
|                              |
+------------------------------+
|                              |
|  Built by a working          |
|  musician with 4.6M streams  |
|                              |
+------------------------------+
|                              |
|  You're checking 5           |
|  dashboards and still        |
|  guessing.                   |
|                              |
|  [Spotify icon] Streams only |
|  [Apple icon]   Apple only   |
|  [IG icon]      Social only  |
|  [$ icon]       Revenue only |
|  [Sheet icon]   Outdated     |
|                              |
|  One place. Every platform.  |
|                              |
+------------------------------+
|                              |
|  SEE EVERYTHING              |
|  +-------------------------+ |
|  | [Screenshot]             | |
|  +-------------------------+ |
|  Cross-platform streams,     |
|  revenue, social, playlists. |
|                              |
|  KNOW WHAT'S WORKING         |
|  +-------------------------+ |
|  | [Screenshot]             | |
|  +-------------------------+ |
|  AI-powered strategy         |
|  recommendations.            |
|                              |
|  UNDERSTAND YOUR MONEY       |
|  +-------------------------+ |
|  | [Screenshot]             | |
|  +-------------------------+ |
|  Revenue by platform,        |
|  by track.                   |
|                              |
+------------------------------+
|  (Interactive demo)          |
|  [Swipeable card carousel]   |
|  < Score | Revenue | Chart > |
+------------------------------+
|  (Testimonials carousel)     |
|  < Quote 1 | Quote 2 >      |
+------------------------------+
|  (Pricing -- vertical stack) |
|  [Free]                      |
|  [Starter $9/mo] POPULAR     |
|  [Pro $29/mo]                |
+------------------------------+
|  (FAQ accordion)             |
+------------------------------+
|  Your music is already       |
|  doing the work.             |
|  [Start free]                |
+------------------------------+
|  [Footer]                    |
+------------------------------+

+------------------------------+
| [Start free]      | <-- Fixed bottom CTA
+------------------------------+  (appears after scrolling past hero)
```

---

## Appendix D: Key Decisions Still Open

| Decision | Options | Recommendation | Blocker? |
|----------|---------|----------------|----------|
| Auth provider | Clerk vs Supabase Auth | Clerk for speed, Supabase if we want auth + DB in one | Yes -- blocks Phase 2 |
| Product name | "Music Command Center" vs new name | Decide before landing page ships. See strategy doc 5.4 | Yes -- blocks branding |
| Animation library | framer-motion vs CSS-only | framer-motion for landing, CSS for app (smaller bundle) | No |
| Blog CMS | MDX in repo vs headless CMS (Notion) | MDX for v1 (simpler), migrate to CMS at scale | No |
| OG image generation | @vercel/og vs static templates | @vercel/og (dynamic, per-artist) | No |
| Annual billing discount | 22-25% vs higher | 22-25% is standard for SaaS. Keep it. | No |
| Demo data on landing page | Current Jake data vs fictional artist | Fictional artist (avoids revealing Jake's real data publicly) | No -- but needs demo data file |

---

*This spec is a living document. As the landing page is built and tested with real users, sections will be updated with performance data, A/B test results, and user feedback. The voice, visual direction, and architectural decisions are designed to scale from 0 to 50,000 users without major rewrites.*
