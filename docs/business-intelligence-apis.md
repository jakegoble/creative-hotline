# Business Intelligence API Catalog

> Comprehensive catalog of APIs, data sources, and web data pools for The Creative Hotline's business intelligence platform. Organized by category with implementation details for each source.
>
> Last updated: 2026-02-26

---

## Table of Contents

1. [Social Media Analytics APIs](#1-social-media-analytics-apis)
2. [Website & Search Analytics](#2-website--search-analytics)
3. [SEO & Competitive Intelligence](#3-seo--competitive-intelligence)
4. [Email Marketing APIs](#4-email-marketing-apis)
5. [CRM & Sales APIs](#5-crm--sales-apis)
6. [Payment & Revenue APIs](#6-payment--revenue-apis)
7. [Scheduling APIs](#7-scheduling-apis)
8. [Form & Survey APIs](#8-form--survey-apis)
9. [Review & Reputation APIs](#9-review--reputation-apis)
10. [Creative Industry Data](#10-creative-industry-data)
11. [Brand Monitoring & Listening](#11-brand-monitoring--listening)
12. [Content Performance](#12-content-performance)
13. [Advertising Data APIs](#13-advertising-data-apis)
14. [Influencer Intelligence](#14-influencer-intelligence)
15. [Market Intelligence & Benchmarks](#15-market-intelligence--benchmarks)
16. [Job Market & Freelance Data](#16-job-market--freelance-data)
17. [AI & NLP APIs](#17-ai--nlp-apis)
18. [Workflow & Automation APIs](#18-workflow--automation-apis)
19. [Communication APIs](#19-communication-apis)
20. [Priority Matrix for Creative Hotline](#20-priority-matrix-for-creative-hotline)

---

## 1. Social Media Analytics APIs

### 1.1 Instagram Graph API (Meta)

| Field | Detail |
|-------|--------|
| **API Type** | REST (Graph API v19.0+) |
| **Base URL** | `https://graph.facebook.com/v19.0/` |
| **Auth** | OAuth 2.0 (Facebook Login / Business Login) |
| **Rate Limits** | 200 calls/user/hour; 4800 calls/app/24hr per user |
| **Free Tier** | Free for business/creator accounts via Facebook App |
| **Paid Tier** | No direct cost; requires Facebook App Review for production |
| **Key Endpoints** | `GET /{ig-user-id}/insights` (account metrics), `GET /{ig-media-id}/insights` (post metrics), `GET /{ig-user-id}/media` (content feed), `GET /{ig-user-id}/stories` (story insights) |
| **Data Available** | Follower count, reach, impressions, profile views, website clicks, email contacts, audience demographics (age, gender, city, country), engagement rate per post, story exits/replies/taps, reel plays/shares, hashtag performance |
| **Unique Value** | **Primary channel for Creative Hotline.** Direct access to @creative.hotline audience demographics, content performance, story engagement. Can track which content types drive DMs and booking conversions. |
| **Implementation Notes** | Requires Facebook Business Page linked to IG Professional account. Needs `instagram_basic`, `instagram_manage_insights`, `pages_show_list` permissions. Must pass App Review for production. Insights only available for business/creator accounts. Historical data limited to 2 years for account-level, 30 days for story insights. |
| **Creative Hotline Use** | Track which IG content drives Laylo signups and bookings; measure Frankie's voice resonance via engagement rates; audience demographic analysis for client targeting. |

### 1.2 TikTok API for Business

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://business-api.tiktok.com/open_api/v1.3/` |
| **Auth** | OAuth 2.0 (TikTok for Business) |
| **Rate Limits** | 600 requests/minute (varies by endpoint); 1000/day for some endpoints |
| **Free Tier** | Free for business accounts |
| **Paid Tier** | Ads API requires active ad account |
| **Key Endpoints** | `/business/get/` (account info), `/business/video/list/` (video metrics), `/business/comment/list/`, Content Publishing API (`/post/publish/video/`) |
| **Data Available** | Video views, likes, comments, shares, average watch time, audience demographics, follower growth, traffic source types, audience territories |
| **Unique Value** | Short-form video intelligence. If Creative Hotline expands to TikTok (recommended for reaching younger creative professionals), this provides content performance data and audience insights. |
| **Implementation Notes** | Requires TikTok for Business account. Display API (public data) has stricter limits. Research API available for academic/research purposes with application process. Content Posting API requires separate approval. |
| **Creative Hotline Use** | Future channel expansion; track creative direction tip content performance; identify trending formats for client recommendations. |

### 1.3 LinkedIn API (Marketing & Community Management)

| Field | Detail |
|-------|--------|
| **API Type** | REST (v2) |
| **Base URL** | `https://api.linkedin.com/v2/` (migrating to `https://api.linkedin.com/rest/`) |
| **Auth** | OAuth 2.0 (3-legged) |
| **Rate Limits** | 100 requests/day (Consumer), 100K/day (Marketing Developer Platform); varies by endpoint |
| **Free Tier** | Consumer tier: basic profile, share, company page data |
| **Paid Tier** | Marketing Developer Platform (application required); Advertising API requires ad account |
| **Key Endpoints** | `GET /organizationalEntityShareStatistics` (post analytics), `GET /organizationPageStatistics` (page analytics), `GET /adAnalytics` (ad performance), Community Management API (posts, comments, reactions) |
| **Data Available** | Post impressions, clicks, engagement rate, follower demographics, company page views, ad campaign metrics (CPM, CPC, CTR, conversions), audience insights |
| **Unique Value** | **High-value channel for B2B creative consultancy.** LinkedIn is where brand decision-makers and creative directors live. Post-level analytics reveal which thought leadership topics resonate with potential clients. |
| **Implementation Notes** | Marketing Developer Platform requires application and approval (2-4 weeks). Community Management API launched 2024 for organic content management. Limited historical data (12 months for page stats). Company page admin access required. |
| **Creative Hotline Use** | Track thought leadership content that drives consultancy inquiries; identify high-engagement topics for Jake/Megha's LinkedIn presence; B2B lead source attribution. |

### 1.4 X (Twitter) API v2

| Field | Detail |
|-------|--------|
| **API Type** | REST + Streaming |
| **Base URL** | `https://api.x.com/2/` |
| **Auth** | OAuth 2.0 (PKCE) or OAuth 1.0a (user context) |
| **Rate Limits** | Free: 1 tweet creation/day, limited reads. Basic: 100 reads/month. Pro: 1M reads/month |
| **Free Tier** | Extremely limited: 1 POST/day, 1 app, no search, no analytics |
| **Basic Tier** | $200/month: 100 GETs/15min, 50K tweet reads/month, basic tweet search |
| **Pro Tier** | $5,000/month: 300 GETs/15min, 1M tweet reads/month, full-archive search, analytics |
| **Enterprise** | Custom pricing: firehose access, compliance, advanced analytics |
| **Key Endpoints** | `GET /tweets/:id` (tweet data), `GET /users/:id/tweets` (user timeline), `GET /tweets/search/recent` (search), `GET /tweets/counts` (volume counts) |
| **Data Available** | Tweet metrics (impressions, retweets, likes, replies, quote tweets), user followers, tweet text + media, conversation threads, hashtag volume |
| **Unique Value** | Real-time conversation monitoring. Creative industry discourse, brand crises, trending topics in design/marketing. However, pricing is prohibitive for a small consultancy. |
| **Implementation Notes** | Free tier is essentially useless for analytics. Basic tier ($200/mo) gets minimal data. Pro tier ($5K/mo) is cost-prohibitive unless X is a primary channel. Consider third-party aggregators instead. API v1.1 deprecated for most endpoints. |
| **Creative Hotline Use** | Low priority unless Jake/Megha are active on X. Better served by Brand24 or Mention for X monitoring at lower cost. |

### 1.5 YouTube Data API v3

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://www.googleapis.com/youtube/v3/` |
| **Auth** | API Key (public data) or OAuth 2.0 (private/channel data) |
| **Rate Limits** | 10,000 units/day (free quota); each endpoint costs 1-100 units |
| **Free Tier** | 10,000 quota units/day (generous for moderate use) |
| **Paid Tier** | Additional quota available via Google Cloud billing |
| **Key Endpoints** | `channels.list` (channel stats), `videos.list` (video metrics), `search.list` (search — expensive at 100 units), `analytics` (YouTube Analytics API — separate) |
| **Data Available** | Views, watch time, subscribers, likes, comments, audience retention, traffic sources, demographics, revenue (for monetized channels) |
| **Unique Value** | If Creative Hotline launches YouTube content (creative direction tips, case studies), this tracks content performance and audience growth. YouTube Analytics API provides deeper channel-owner metrics. |
| **Creative Hotline Use** | Future content channel; client content auditing if they have YouTube presence; competitive analysis of creative consultancy YouTube channels. |

### 1.6 Pinterest API v5

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.pinterest.com/v5/` |
| **Auth** | OAuth 2.0 |
| **Rate Limits** | 1000 requests/minute (standard), varies by endpoint |
| **Free Tier** | Free for business accounts |
| **Paid Tier** | Ads API requires ad account |
| **Key Endpoints** | `GET /user_account/analytics` (account metrics), `GET /pins/{pin_id}/analytics` (pin metrics), `GET /boards/{board_id}/` (board data), Trends API |
| **Data Available** | Pin impressions, saves, clicks, closeups, audience demographics, trending searches, board performance |
| **Unique Value** | Visual trend intelligence. Pinterest Trends API reveals what visual styles, color palettes, and design aesthetics are trending — directly relevant to creative direction. |
| **Creative Hotline Use** | Visual trend forecasting for client recommendations; track creative direction mood board engagement; identify emerging design trends before they hit mainstream. |

### 1.7 Threads API (Meta)

| Field | Detail |
|-------|--------|
| **API Type** | REST (part of Meta's Graph API ecosystem) |
| **Base URL** | `https://graph.threads.net/v1.0/` |
| **Auth** | OAuth 2.0 (Threads Login) |
| **Rate Limits** | 250 calls/user/hour |
| **Free Tier** | Free |
| **Key Endpoints** | `GET /{threads-user-id}/threads` (user posts), `GET /{threads-media-id}/insights` (post insights), `POST /{threads-user-id}/threads` (publishing) |
| **Data Available** | Views, likes, replies, reposts, quotes, follower count, demographics |
| **Unique Value** | Emerging text-based platform. Meta launched the Threads API in mid-2024. May become important for creative industry discourse as it grows. |
| **Creative Hotline Use** | Low priority currently; monitor if Threads gains traction with creative professionals. |

---

## 2. Website & Search Analytics

### 2.1 Google Analytics Data API (GA4)

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://analyticsdata.googleapis.com/v1beta/` |
| **Auth** | OAuth 2.0 or Service Account |
| **Rate Limits** | 10 concurrent requests; 10,000 requests/day/project |
| **Free Tier** | Free (GA4 is free for up to 10M events/month) |
| **Paid Tier** | GA4 360: $50K+/year (enterprise features, higher limits — not needed) |
| **Key Endpoints** | `runReport` (custom reports), `runRealtimeReport` (live data), `batchRunReports` (multiple reports), `getMetadata` (available dimensions/metrics) |
| **Data Available** | Sessions, users, pageviews, bounce rate, average session duration, conversion events, traffic sources, user demographics, device categories, geographic data, custom events, e-commerce transactions, user acquisition channels |
| **Unique Value** | **Essential.** The Webflow site (thecreativehotline.com) should have GA4 installed. Tracks the full website journey: landing page > pricing page > Stripe payment link click > booking. Attribution data shows which channels drive actual conversions. |
| **Implementation Notes** | GA4 property must be set up on Webflow site. Service account approach is best for server-to-server (no user OAuth flow). Streaming export to BigQuery available for raw event data. Data API supports 400+ dimensions/metrics. |
| **Creative Hotline Use** | Website conversion funnel (visit > pricing > payment); traffic source attribution for Revenue Goals page; landing page A/B test analysis; geographic expansion opportunities. |

### 2.2 Google Search Console API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://searchconsole.googleapis.com/` |
| **Auth** | OAuth 2.0 or Service Account |
| **Rate Limits** | 200 requests/minute, 6000 requests/day |
| **Free Tier** | Completely free |
| **Key Endpoints** | `searchAnalytics.query` (search performance), `sitemaps.list` (sitemap status), `urlInspection.index.inspect` (URL indexing status) |
| **Data Available** | Search queries driving traffic, click-through rates, average position, impressions, page-level performance, device breakdown, country breakdown, search appearance types |
| **Unique Value** | **SEO intelligence.** Shows exactly what search queries bring people to thecreativehotline.com. Reveals content gaps — queries where the site appears but doesn't get clicks. Critical for content strategy. |
| **Implementation Notes** | Must verify site ownership. Data available for last 16 months. Maximum 50,000 rows per query. Can filter by query, page, country, device, search appearance. |
| **Creative Hotline Use** | Identify high-intent search queries (e.g., "creative direction consultant", "brand strategy call"); track SEO improvements; discover content opportunities; monitor indexing health. |

### 2.3 Plausible Analytics API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://plausible.io/api/v1/` (cloud) or self-hosted |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | 600 requests/hour |
| **Free Tier** | None (starts at $9/month for 10K pageviews) |
| **Paid Tier** | $9/mo (10K), $19/mo (100K), $29/mo (200K) — usage-based |
| **Key Endpoints** | `/stats/realtime/visitors`, `/stats/aggregate`, `/stats/timeseries`, `/stats/breakdown` |
| **Data Available** | Visitors, pageviews, bounce rate, visit duration, referral sources, UTM parameters, goals/conversions, custom events, country, device, browser, OS |
| **Unique Value** | Privacy-first, cookieless analytics. Lightweight script (< 1KB) that doesn't require cookie consent banners. Simpler than GA4 but covers 90% of needs. GDPR/CCPA compliant by default. |
| **Creative Hotline Use** | Alternative to GA4 if privacy is a priority; simpler dashboard for quick metrics; Webflow integration is one-line script. |

### 2.4 Fathom Analytics API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.usefathom.com/v1/` |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | Undisclosed (reasonable for typical use) |
| **Free Tier** | None (starts at $14/month for 100K pageviews) |
| **Paid Tier** | $14/mo (100K), $24/mo (200K), scaling up |
| **Key Endpoints** | `/aggregations` (site stats), `/current_visitors`, `/sites`, `/events` |
| **Data Available** | Unique visitors, pageviews, average time on site, bounce rate, top pages, top referrers, UTM tracking, custom events, goals |
| **Unique Value** | Similar to Plausible but with a more polished dashboard and EU isolation option. Cookie-free, GDPR compliant. |
| **Creative Hotline Use** | Same as Plausible; choose one privacy-first alternative if GA4 feels too heavy. |

### 2.5 Hotjar API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.hotjar.com/` |
| **Auth** | API Key or OAuth 2.0 |
| **Rate Limits** | 180 requests/minute |
| **Free Tier** | Basic plan: 35 daily sessions, limited heatmaps |
| **Paid Tier** | Plus: $32/mo, Business: $80/mo, Scale: $171/mo |
| **Key Endpoints** | Surveys API, Feedback API, Events API |
| **Data Available** | Heatmaps, session recordings, conversion funnels, form analytics, user feedback, surveys |
| **Unique Value** | **Qualitative website intelligence.** Heatmaps show where visitors click on pricing pages, session recordings reveal drop-off points in the booking flow. Form analytics show where people abandon the Stripe checkout. |
| **Creative Hotline Use** | Optimize Webflow pricing page layout; identify friction in the payment > booking flow; understand what visitors look at before purchasing. |

---

## 3. SEO & Competitive Intelligence

### 3.1 Ahrefs API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.ahrefs.com/v3/` |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | Varies by plan: Lite: 500 rows/query, Standard: 50K rows/query |
| **Free Tier** | None (Ahrefs Webmaster Tools has limited free data for verified sites) |
| **Paid Tier** | Lite: $99/mo, Standard: $199/mo, Advanced: $399/mo, Enterprise: $999/mo |
| **Key Endpoints** | `/site-explorer/overview` (domain metrics), `/site-explorer/backlinks` (backlink data), `/keywords-explorer/overview` (keyword data), `/site-explorer/organic-keywords` (ranking keywords) |
| **Data Available** | Domain Rating (DR), URL Rating (UR), organic traffic estimates, backlink profiles, referring domains, keyword rankings, keyword difficulty, search volume, SERP features, content gap analysis, competing domains |
| **Unique Value** | **Gold standard for SEO competitive intelligence.** Can analyze competitor consultancy websites (e.g., Wieden+Kennedy, Collins, Pentagram) to find keyword gaps and content opportunities. Backlink data reveals link-building opportunities. |
| **Creative Hotline Use** | Analyze competitor creative consultancy SEO; find high-value keywords for content strategy; track domain authority growth; identify link-building opportunities from creative industry publications. |

### 3.2 SEMrush API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.semrush.com/` |
| **Auth** | API Key |
| **Rate Limits** | Based on API units (each plan has monthly allocation): Pro: 10K units/mo, Guru: 30K units/mo |
| **Free Tier** | 10 free requests/day (very limited) |
| **Paid Tier** | Pro: $129.95/mo, Guru: $249.95/mo, Business: $499.95/mo |
| **Key Endpoints** | Domain Analytics (organic/paid traffic), Keyword Analytics (volume, difficulty, CPC), Backlinks, URL Analytics, Advertising Research |
| **Data Available** | Organic & paid traffic estimates, keyword rankings, competitors' ad copies, display advertising data, backlinks, keyword difficulty, content ideas, domain comparison |
| **Unique Value** | Broader than Ahrefs — includes paid advertising intelligence. Can see competitors' Google Ads copies and display ads. Content Marketing Toolkit helps plan blog content. |
| **Creative Hotline Use** | Similar to Ahrefs plus ad intelligence; see what messaging competitors use in Google Ads; content topic research for blog/newsletter. |

### 3.3 Moz API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://lsapi.seomoz.com/v2/` (Links API) |
| **Auth** | API Key (Access ID + Secret Key) |
| **Rate Limits** | Free: 10 queries/month, Standard: 20K rows/month |
| **Free Tier** | Moz Free: 10 link queries/month, limited DA checks |
| **Paid Tier** | Standard: $99/mo, Medium: $179/mo, Large: $299/mo |
| **Key Endpoints** | `/url_metrics` (page/domain authority), `/links` (backlinks), `/anchor_text` (anchor text distribution) |
| **Data Available** | Domain Authority (DA), Page Authority (PA), Spam Score, backlink data, anchor text, linking domains |
| **Unique Value** | Domain Authority is widely recognized as an SEO benchmark. Moz's Spam Score helps identify toxic backlinks. Simpler API than Ahrefs/SEMrush if you just need authority metrics. |
| **Creative Hotline Use** | Track thecreativehotline.com DA growth; benchmark against competitor consultancy DAs; audit backlink quality. |

### 3.4 SimilarWeb API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.similarweb.com/v1/` |
| **Auth** | API Key |
| **Rate Limits** | Based on plan (credits per month) |
| **Free Tier** | None for API (SimilarWeb free browser extension has limited data) |
| **Paid Tier** | Starter: ~$125/mo, Professional: ~$333/mo, Enterprise: custom |
| **Key Endpoints** | `/website/{domain}/total-traffic-and-engagement/`, `/website/{domain}/traffic-sources/`, `/website/{domain}/audience-interests/`, `/website/{domain}/competitors-and-similar-sites/` |
| **Data Available** | Total visits, bounce rate, pages/visit, visit duration, traffic by source (direct, search, social, referral, paid, email), geographic distribution, audience interests, competitor analysis, industry benchmarks |
| **Unique Value** | **Competitive traffic intelligence.** Can estimate any website's traffic and sources without their permission. See how much traffic competitor consultancies get, where it comes from, and what their audience is interested in. |
| **Creative Hotline Use** | Benchmark thecreativehotline.com traffic against competitors; identify which marketing channels work for similar consultancies; discover audience overlap with potential partner sites. |

### 3.5 BuiltWith API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.builtwith.com/` |
| **Auth** | API Key |
| **Rate Limits** | Based on plan |
| **Free Tier** | Free Lookup (limited): 1 lookup/query, basic tech data |
| **Paid Tier** | Basic: $295/mo, Pro: $495/mo, Enterprise: $995/mo |
| **Key Endpoints** | `/v21/api.json` (technology lookup), `/v7/api.json` (domain technology profile) |
| **Data Available** | Technology stack of any website (CMS, analytics, marketing tools, payment processors, hosting, CDN, frameworks), technology adoption trends, market share data |
| **Unique Value** | **Prospecting intelligence.** Find businesses using specific tools (e.g., all Webflow sites in the creative industry, or all businesses using ManyChat). Helps identify potential clients who already use tools Creative Hotline can help optimize. |
| **Creative Hotline Use** | Identify potential clients by tech stack; understand market adoption of tools the consultancy recommends; competitive tech stack analysis. |

### 3.6 Crunchbase API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.crunchbase.com/api/v4/` |
| **Auth** | API Key (User Key) |
| **Rate Limits** | 200 calls/minute (Basic), higher for Enterprise |
| **Free Tier** | Basic API: limited fields, 200 calls/min |
| **Paid Tier** | Starter: $99/mo, Pro: Custom, Enterprise: Custom |
| **Key Endpoints** | `/entities/organizations/{uuid}`, `/searches/organizations` (search/filter), `/autocompletes` |
| **Data Available** | Company founding date, funding rounds, investors, team size, revenue range, industry categories, news mentions, acquisitions, IPO status |
| **Unique Value** | **Funded startup intelligence.** Recently funded creative agencies or startups needing brand direction are ideal Creative Hotline clients. Crunchbase can surface these leads. |
| **Creative Hotline Use** | Identify recently funded companies that likely need branding/creative direction; track creative industry M&A; find high-growth potential clients. |

---

## 4. Email Marketing APIs

### 4.1 ConvertKit API (now Kit)

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.convertkit.com/v4/` |
| **Auth** | API Key or OAuth 2.0 |
| **Rate Limits** | 120 requests/minute |
| **Free Tier** | Free plan: up to 10,000 subscribers, limited automation |
| **Paid Tier** | Creator: $25/mo (1K subs), Creator Pro: $50/mo |
| **Key Endpoints** | `/subscribers` (list management), `/sequences` (email sequences), `/broadcasts` (one-off emails), `/tags` (segmentation), `/forms` (forms and landing pages) |
| **Data Available** | Subscriber growth, open rates, click rates, unsubscribe rates, tag-based segmentation, automation performance, form conversion rates, revenue per subscriber (with commerce) |
| **Unique Value** | **Ideal for creator-first businesses.** Built for consultants, coaches, and creators. Visual automation builder. Commerce integration for selling digital products (relevant to future Brand Audit product and template sales). |
| **Creative Hotline Use** | Primary email platform candidate; manage Laylo leads and post-call nurture sequences; sell digital products; segment by client type/interest. Replaces custom n8n SMTP for email marketing. |

### 4.2 Beehiiv API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.beehiiv.com/v2/` |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | 60 requests/minute |
| **Free Tier** | Launch plan: up to 2,500 subscribers, basic analytics |
| **Paid Tier** | Grow: $42/mo (10K subs), Scale: $84/mo (100K subs) |
| **Key Endpoints** | `/publications/{id}/subscriptions` (subscriber management), `/publications/{id}/posts` (content management), `/publications/{id}/stats` (analytics) |
| **Data Available** | Subscriber count/growth, open rates, click rates, referral program stats, post-level performance, audience demographics, ad revenue |
| **Unique Value** | **Newsletter-as-a-product platform.** Built-in referral program, ad network, and recommendation engine. If Creative Hotline launches a creative direction newsletter, Beehiiv's growth features are unmatched. |
| **Creative Hotline Use** | Newsletter platform for thought leadership content; built-in referral program aligns with Growth Action Plan referral initiative; monetizable through premium tier or sponsorships. |

### 4.3 Mailchimp API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://{dc}.api.mailchimp.com/3.0/` |
| **Auth** | API Key (Basic Auth) or OAuth 2.0 |
| **Rate Limits** | 10 concurrent connections; 100K requests/day |
| **Free Tier** | Free plan: 500 contacts, 1000 emails/month |
| **Paid Tier** | Essentials: $13/mo, Standard: $20/mo, Premium: $350/mo |
| **Key Endpoints** | `/lists` (audiences), `/campaigns` (email campaigns), `/reports` (campaign analytics), `/automations` (automated sequences), `/ecommerce` (revenue tracking) |
| **Data Available** | Campaign performance (opens, clicks, bounces, unsubscribes), audience growth, segmentation, A/B test results, click maps, social performance, e-commerce revenue attribution, predicted demographics |
| **Unique Value** | Most widely used email platform. Rich API with extensive analytics and e-commerce tracking. Transactional email (Mandrill) available as add-on. |
| **Creative Hotline Use** | Established platform if more robust segmentation needed than ConvertKit; good for tracking email-driven revenue attribution. |

### 4.4 Substack API

| Field | Detail |
|-------|--------|
| **API Type** | No public API |
| **Auth** | N/A |
| **Data Available** | Subscriber count, open rates, free/paid subscriber split (dashboard only) |
| **Unique Value** | Large creative/writer community. No API means data is manual-only. Not recommended for programmatic integration. |
| **Creative Hotline Use** | Not recommended — no API access. Use Beehiiv or ConvertKit instead for newsletter needs. |

### 4.5 Resend API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.resend.com/` |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | Free: 100 emails/day. Pro: 50K/month |
| **Free Tier** | 100 emails/day, 1 custom domain |
| **Paid Tier** | Pro: $20/mo (50K emails), Business: $90/mo, Enterprise: custom |
| **Key Endpoints** | `POST /emails` (send), `GET /emails/{id}` (delivery status), `POST /domains` (domain management), `POST /audiences` (contact management) |
| **Data Available** | Delivery status (sent, delivered, opened, clicked, bounced), domain verification status |
| **Unique Value** | Developer-friendly transactional email. React Email integration for beautiful templates. Could replace n8n SMTP nodes for more reliable email delivery with tracking. |
| **Creative Hotline Use** | Transactional emails (booking confirmations, action plan delivery, follow-ups) with delivery tracking; replace current n8n SMTP setup for better reliability. |

---

## 5. CRM & Sales APIs

### 5.1 Notion API (Current CRM)

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.notion.com/v1/` |
| **Auth** | Integration Token (Bearer) |
| **Rate Limits** | 3 requests/second per integration |
| **Free Tier** | Free for personal use; API access on all plans |
| **Paid Tier** | Plus: $10/user/mo, Business: $18/user/mo |
| **Key Endpoints** | `/databases/{id}/query` (query database), `/pages` (create/update pages), `/search` (search across workspace) |
| **Data Available** | Full CRM data (Payments DB + Intake DB), custom properties, relations, formulas, rollups |
| **Unique Value** | **Already the primary CRM.** All pipeline data lives here. API is the backbone of the Command Center app's data layer. |
| **Implementation Notes** | Already integrated via `app/services/notion_client.py`. Rate limit of 3 req/sec is the main bottleneck — use batch queries and caching. MCP access also available. |
| **Creative Hotline Use** | Core CRM data source; all dashboard metrics derive from Notion data; pipeline management and client lifecycle tracking. |

### 5.2 HubSpot API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.hubapi.com/` |
| **Auth** | OAuth 2.0 or Private App Token |
| **Rate Limits** | Free: 100 requests/10 sec. Paid: 150 requests/10 sec. Plus burst limits |
| **Free Tier** | Free CRM: unlimited contacts, deal tracking, email tracking, meeting scheduler |
| **Paid Tier** | Starter: $20/mo, Professional: $800/mo, Enterprise: $3,600/mo |
| **Key Endpoints** | `/contacts/v3/`, `/deals/v3/`, `/companies/v3/`, `/analytics/v2/reports/`, `/marketing/v3/emails/`, `/automation/v4/flows/` |
| **Data Available** | Contacts, companies, deals, tickets, email tracking (opens/clicks), meeting bookings, pipeline stages, attribution reports, custom properties, workflow automation, marketing analytics |
| **Unique Value** | **Full-featured CRM with marketing automation.** Free tier is genuinely useful. If Creative Hotline outgrows Notion as a CRM, HubSpot is the logical upgrade path. Built-in email sequences, meeting scheduling, pipeline management, and reporting. |
| **Creative Hotline Use** | Future CRM upgrade path; would replace Notion + Calendly + email sequences in a single platform; superior reporting and attribution out of the box. Not needed now at current scale. |

### 5.3 Pipedrive API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.pipedrive.com/v1/` |
| **Auth** | API Token or OAuth 2.0 |
| **Rate Limits** | 80 requests/2 sec (standard), 100 requests/2 sec (Enterprise) |
| **Free Tier** | 14-day trial only |
| **Paid Tier** | Essential: $14.90/user/mo, Advanced: $27.90, Professional: $49.90, Power: $64.90, Enterprise: $99 |
| **Key Endpoints** | `/deals`, `/persons`, `/organizations`, `/activities`, `/pipelines`, `/stages` |
| **Data Available** | Deals, contacts, organizations, activities, pipeline stages, email tracking, revenue forecasting, goals |
| **Unique Value** | Sales-focused CRM with strong pipeline visualization. Better deal management than Notion for a sales-heavy operation. |
| **Creative Hotline Use** | Alternative CRM if sales volume increases significantly; strong pipeline views but less flexible than Notion for creative workflows. |

### 5.4 Close.com API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.close.com/api/v1/` |
| **Auth** | API Key (Basic Auth) |
| **Rate Limits** | Varies by plan (standard is generous for small teams) |
| **Free Tier** | None (14-day trial) |
| **Paid Tier** | Startup: $49/user/mo, Professional: $99/user/mo, Enterprise: $139/user/mo |
| **Key Endpoints** | `/lead/`, `/contact/`, `/opportunity/`, `/activity/`, `/report/` |
| **Data Available** | Leads, contacts, opportunities, call logs, email sequences, SMS, pipeline reports, revenue tracking |
| **Unique Value** | Built for inside sales teams. Native calling, SMS, and email in one platform. Excellent for high-touch consultancy sales where phone follow-ups matter. |
| **Creative Hotline Use** | Overkill for current scale; potentially valuable if outbound sales become a channel. |

### 5.5 Apollo.io API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.apollo.io/v1/` |
| **Auth** | API Key |
| **Rate Limits** | Rate limits vary; ~100 requests/minute typical |
| **Free Tier** | Free plan: 10,000 email credits/month, 60 mobile credits |
| **Paid Tier** | Basic: $49/user/mo (unlimited emails), Professional: $79/user/mo (with intent data) |
| **Key Endpoints** | `/people/match` (person enrichment), `/organizations/enrich` (company enrichment), `/mixed_people/search` (people search), `/email_accounts` (email sequences) |
| **Data Available** | Person: email, phone, job title, company, LinkedIn URL, tech stack. Company: revenue, headcount, industry, funding, technologies used. Intent signals. |
| **Unique Value** | **Lead enrichment and prospecting.** Referenced in the Growth Action Plan. Can enrich Notion records with company data, find decision-makers at target companies, and identify businesses showing buying intent for creative services. |
| **Creative Hotline Use** | Enrich Laylo/website leads with company and role data; find creative directors and marketing VPs at funded startups; build targeted outreach lists; add 6 enrichment fields to Payments DB. |

---

## 6. Payment & Revenue APIs

### 6.1 Stripe API (Current)

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.stripe.com/v1/` |
| **Auth** | API Key (Bearer token — Secret Key) |
| **Rate Limits** | 100 read requests/sec, 100 write requests/sec (live mode) |
| **Free Tier** | No monthly fee — 2.9% + $0.30 per transaction |
| **Key Endpoints** | `/charges` (payments), `/customers` (customer records), `/subscriptions` (recurring billing), `/checkout/sessions` (checkout data), `/invoices`, `/balance_transactions`, `/payment_intents`, `/refunds`, `/disputes` |
| **Data Available** | Transaction history, customer data, subscription status, MRR/ARR, churn, payment method distribution, refund rate, dispute rate, revenue by product, checkout conversion rates |
| **Unique Value** | **Already integrated.** Revenue source of truth. Rich financial data for the Command Center dashboard. Webhooks provide real-time payment events. |
| **Implementation Notes** | Already integrated via `app/services/stripe_client.py`. Webhook `checkout.session.completed` triggers WF1 in n8n. Consider adding `customer.subscription.created`, `invoice.paid`, `charge.refunded` webhooks. |
| **Creative Hotline Use** | Revenue tracking, payment analytics, subscription management (if Sprint becomes recurring), failed payment recovery, customer LTV calculation. |

### 6.2 Stripe Sigma (SQL on Stripe Data)

| Field | Detail |
|-------|--------|
| **API Type** | SQL queries via Stripe Dashboard |
| **Auth** | Stripe Dashboard access |
| **Free Tier** | None |
| **Paid Tier** | $10/month |
| **Data Available** | Full SQL access to all Stripe data — custom reports, cohort analysis, revenue trends, customer segments |
| **Unique Value** | Run complex SQL queries on payment data without building a data warehouse. Cohort retention analysis, revenue attribution, product mix analysis. |
| **Creative Hotline Use** | Advanced revenue reporting; cohort analysis that would be difficult through the REST API alone; custom financial dashboards. |

### 6.3 PayPal REST API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api-m.paypal.com/v2/` (live), `https://api-m.sandbox.paypal.com/v2/` (sandbox) |
| **Auth** | OAuth 2.0 (Client ID + Secret) |
| **Rate Limits** | Varies by endpoint; generous for typical volume |
| **Free Tier** | No monthly fee — 2.9% + $0.30 per transaction (similar to Stripe) |
| **Key Endpoints** | `/checkout/orders` (payments), `/payments/captures` (capture details), `/reporting/transactions` (transaction history), `/invoicing/invoices` (invoicing) |
| **Data Available** | Transaction history, payer details, invoice status, dispute data, seller protection status |
| **Unique Value** | Alternative/additional payment method. Some clients prefer PayPal. Could be added alongside Stripe. |
| **Creative Hotline Use** | Low priority — Stripe is sufficient. Consider only if significant demand from clients for PayPal payment. |

### 6.4 Square API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://connect.squareup.com/v2/` |
| **Auth** | OAuth 2.0 or Personal Access Token |
| **Rate Limits** | Varies; generally generous |
| **Free Tier** | No monthly fee for basic payments — 2.6% + $0.10 per transaction |
| **Key Endpoints** | `/payments`, `/customers`, `/invoices`, `/orders`, `/subscriptions` |
| **Data Available** | Payment data, customer profiles, invoicing, inventory, loyalty programs |
| **Unique Value** | Good for in-person payments if Creative Hotline does events or workshops. Built-in invoicing and customer management. |
| **Creative Hotline Use** | Only relevant if hosting in-person creative workshops or events in Venice, CA. Not a priority. |

---

## 7. Scheduling APIs

### 7.1 Calendly API v2 (Current)

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.calendly.com/` |
| **Auth** | OAuth 2.0 or Personal Access Token |
| **Rate Limits** | Standard plan: API access included. Limits not publicly documented but generous for moderate use |
| **Free Tier** | Free plan: 1 event type, no API access |
| **Paid Tier** | Standard: $10/user/mo, Teams: $16/user/mo (API access on all paid plans) |
| **Key Endpoints** | `GET /scheduled_events` (bookings), `GET /event_types` (availability), `GET /invitees` (attendee data), Webhooks: `invitee.created`, `invitee.canceled` |
| **Data Available** | Booking dates/times, invitee name/email, event types, cancellation data, reschedule data, timezone distribution, UTM parameters on booking links |
| **Unique Value** | **Already integrated.** Booking data is critical for conversion tracking (paid > booked > showed up). Cancellation/reschedule rates indicate booking friction. |
| **Implementation Notes** | Already integrated via `app/services/calendly_client.py`. Webhook `invitee.created` triggers WF2 in n8n. Could add `invitee.canceled` webhook for no-show tracking. |
| **Creative Hotline Use** | Booking analytics, show rate tracking, time-of-day/day-of-week booking patterns, cancellation rate monitoring, UTM tracking for attribution. |

### 7.2 Cal.com API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.cal.com/v1/` (cloud) or self-hosted |
| **Auth** | API Key |
| **Rate Limits** | Generous; self-hosted has no limits |
| **Free Tier** | Free for individuals (1 event type); self-hosted is completely free |
| **Paid Tier** | Team: $12/user/mo, Organization: $37/user/mo, Enterprise: custom |
| **Key Endpoints** | `/bookings`, `/event-types`, `/availability`, `/webhooks` |
| **Data Available** | Bookings, availability, event types, attendee data, custom fields, workflow automation |
| **Unique Value** | Open-source Calendly alternative. Can self-host for zero ongoing cost. More customizable booking flows and webhooks. |
| **Creative Hotline Use** | Potential Calendly replacement if customization needed (e.g., embedded booking with custom branding). Not a priority since Calendly works. |

---

## 8. Form & Survey APIs

### 8.1 Tally API (Current)

| Field | Detail |
|-------|--------|
| **API Type** | Webhooks (no REST API for reading data) |
| **Auth** | Webhook URL |
| **Rate Limits** | N/A (webhook-based) |
| **Free Tier** | Free: unlimited forms, unlimited submissions |
| **Paid Tier** | Pro: $29/mo (custom domains, file uploads, team collaboration) |
| **Key Endpoints** | Webhook: payload on form submission. No read API for historical submissions. |
| **Data Available** | Form submission data (all fields), submission timestamp, respondent metadata |
| **Unique Value** | **Already integrated** for intake forms. Free with unlimited submissions. Clean UI for respondents. Limitation: no API to query historical submissions. |
| **Implementation Notes** | Webhook triggers WF3 in n8n. Historical data only accessible via Tally dashboard CSV export. |
| **Creative Hotline Use** | Pre-call intake form data collection; no changes needed unless historical query capability becomes important. |

### 8.2 Typeform API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.typeform.com/` |
| **Auth** | OAuth 2.0 or Personal Access Token |
| **Rate Limits** | 2 requests/second |
| **Free Tier** | Free: 10 responses/month (very limited) |
| **Paid Tier** | Basic: $25/mo, Plus: $50/mo, Business: $83/mo |
| **Key Endpoints** | `GET /forms/{form_id}/responses` (query responses), `POST /forms` (create forms), Webhooks for real-time submissions |
| **Data Available** | Form responses with full answer data, partial submissions (drop-off analytics), completion time, response metadata, logic jump paths |
| **Unique Value** | Superior form analytics: drop-off rates per question, average completion time, partial response data. Conversational UI provides better respondent experience for longer forms. |
| **Creative Hotline Use** | Alternative to Tally if intake form analytics become important (e.g., which questions cause drop-offs). API enables historical response queries unlike Tally. |

### 8.3 Google Forms API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://forms.googleapis.com/v1/` |
| **Auth** | OAuth 2.0 or Service Account |
| **Rate Limits** | Standard Google API limits (60 requests/minute/user) |
| **Free Tier** | Completely free |
| **Key Endpoints** | `GET /forms/{formId}` (form structure), `GET /forms/{formId}/responses` (all responses), Webhooks (via Google Apps Script or Pub/Sub) |
| **Data Available** | Form structure, all responses, individual response data, timestamps |
| **Unique Value** | Free with full API access. Direct integration with Google Sheets for automated reporting. |
| **Creative Hotline Use** | Lower priority than Tally/Typeform; only relevant if the team prefers Google Workspace ecosystem. |

### 8.4 SurveyMonkey API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.surveymonkey.com/v3/` |
| **Auth** | OAuth 2.0 |
| **Rate Limits** | 120 requests/minute (standard), 500/minute (Platinum) |
| **Free Tier** | Basic plan allows API access (limited to 10 questions/survey, 40 responses/survey) |
| **Paid Tier** | Advantage: $39/mo, Premier: $119/mo, Enterprise: custom |
| **Key Endpoints** | `/surveys`, `/surveys/{id}/responses`, `/collectors`, `/benchmarks` |
| **Data Available** | Survey responses, question-level analytics, benchmarks, text analysis, NPS scores |
| **Unique Value** | Industry benchmarks for survey questions. NPS tracking built-in. Text analysis on open-ended responses. |
| **Creative Hotline Use** | Post-call satisfaction surveys with NPS tracking; benchmark responses against industry norms; text analysis on client feedback. |

---

## 9. Review & Reputation APIs

### 9.1 Google Business Profile API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://mybusinessbusinessinformation.googleapis.com/v1/` |
| **Auth** | OAuth 2.0 |
| **Rate Limits** | Standard Google limits |
| **Free Tier** | Free |
| **Key Endpoints** | `GET /accounts/{accountId}/locations/{locationId}/reviews` (reviews), Performance API for search/maps visibility |
| **Data Available** | Reviews (text, rating, date, reply), search queries, maps views, website clicks, phone calls, direction requests, photo views |
| **Unique Value** | Local search visibility. If Creative Hotline has a Google Business Profile (Venice, CA office), this tracks how people find the business through Google Maps and Search. Reviews are powerful social proof. |
| **Creative Hotline Use** | Track local discovery; manage and respond to reviews; monitor search visibility for "creative consultant Venice CA" type queries. |

### 9.2 Trustpilot API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.trustpilot.com/v1/` |
| **Auth** | API Key + OAuth 2.0 |
| **Rate Limits** | Based on plan |
| **Free Tier** | Free profile; API access on paid plans |
| **Paid Tier** | Standard: ~$225/mo, Growth: ~$600/mo |
| **Key Endpoints** | `/business-units/{id}/reviews` (reviews), `/business-units/{id}/statistics` (aggregate stats), `/invitation-links` (review invitations) |
| **Data Available** | Reviews, TrustScore, star distribution, response rate, review invitations sent/completed |
| **Unique Value** | Industry-standard B2B review platform. TrustScore widget can be embedded on the website. Review invitation API automates post-call review requests. |
| **Creative Hotline Use** | Automated post-call review requests; social proof widget on website; track client satisfaction trends. Premium pricing may not justify for current scale. |

### 9.3 G2 API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | Via G2 Marketing Solutions |
| **Auth** | API Key |
| **Free Tier** | Free profile listing |
| **Paid Tier** | Marketing Solutions: custom pricing (expensive — $5K+/year) |
| **Data Available** | Reviews, ratings, competitive comparisons, buyer intent data, category rankings |
| **Unique Value** | B2B software/services review platform. Relevant if Creative Hotline wants to be listed as a consultancy service. Buyer intent data shows which companies are researching creative consulting. |
| **Creative Hotline Use** | Low priority for current scale; G2 is more relevant for SaaS companies. Consider once at scale for B2B credibility. |

---

## 10. Creative Industry Data

### 10.1 Dribbble API

| Field | Detail |
|-------|--------|
| **API Type** | REST (v2, limited) |
| **Base URL** | `https://api.dribbble.com/v2/` |
| **Auth** | OAuth 2.0 |
| **Rate Limits** | 60 requests/minute |
| **Free Tier** | Free (basic user data, own shots) |
| **Paid Tier** | Dribbble Pro: $8/mo (more API access) |
| **Key Endpoints** | `/user` (profile), `/user/shots` (user's work), `/shots/{id}` (shot details) — Note: public search endpoint deprecated |
| **Data Available** | Shot details (views, likes, comments), user profiles, tags, color palettes, attachment data |
| **Unique Value** | **Design trend intelligence.** Track popular design styles, color trends, and visual approaches. Identify trending aesthetics for client recommendations. Caveat: API has been significantly limited since 2023. |
| **Implementation Notes** | API is heavily restricted compared to earlier versions. No public search endpoint. Consider web scraping (with permission) or third-party aggregators for broader trend data. |
| **Creative Hotline Use** | Monitor design trends; identify popular visual styles to reference in client creative direction; portfolio-level competitive analysis. Limited API may require supplementing with manual research. |

### 10.2 Behance API (Adobe)

| Field | Detail |
|-------|--------|
| **API Type** | REST (deprecated/limited) |
| **Auth** | API Key (legacy) |
| **Status** | **Largely deprecated.** Adobe has significantly restricted the Behance API. Most endpoints return limited or no data. |
| **Data Available** | Historically: project views, appreciations, comments, user followers, creative fields, tools used |
| **Unique Value** | Behance remains the largest creative portfolio platform, but API access is essentially gone. |
| **Creative Hotline Use** | Not viable for programmatic access. Use Behance manually for trend research and competitive analysis. |

### 10.3 Pinterest Trends API

| Field | Detail |
|-------|--------|
| **API Type** | REST (part of Pinterest API v5) |
| **Base URL** | `https://api.pinterest.com/v5/trends/` |
| **Auth** | OAuth 2.0 |
| **Rate Limits** | Part of Pinterest API limits (1000 requests/min) |
| **Free Tier** | Available on business accounts |
| **Key Endpoints** | `GET /trending/keywords/{region}` (trending searches), `GET /trending/pins` |
| **Data Available** | Trending search terms, trending pins, trend trajectory (growing/stable/declining), demographic breakdown of trends |
| **Unique Value** | **Forward-looking visual trend data.** Pinterest users plan future purchases/projects, so trends here predict what clients will want 3-6 months from now. Directly relevant to creative direction advice. |
| **Creative Hotline Use** | Predict upcoming visual trends for client recommendations; identify seasonal creative patterns; inform brand audit recommendations with data-backed trend insights. |

### 10.4 Adobe Stock API (Trend Data)

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://stock.adobe.io/Rest/Media/1/Search/Files` |
| **Auth** | API Key + OAuth (IMS) |
| **Rate Limits** | Based on API plan |
| **Free Tier** | Search API is free with API key |
| **Key Endpoints** | `/Search/Files` (search stock), `/Search/Category` (categories), `/Search/CategoryTree` |
| **Data Available** | Search popularity, category trends, visual similarity, keyword associations, asset popularity |
| **Unique Value** | Stock search trends indicate what visual content is in demand. Can identify overused vs. unique visual approaches for brand differentiation. |
| **Creative Hotline Use** | Identify visual trends and cliches (what to avoid in creative direction); find trending visual styles for client recommendations. |

### 10.5 Unsplash API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.unsplash.com/` |
| **Auth** | API Key (OAuth for user actions) |
| **Rate Limits** | Demo: 50 requests/hour. Production: 5000 requests/hour |
| **Free Tier** | Free (must follow attribution guidelines) |
| **Key Endpoints** | `/photos` (list photos), `/search/photos` (search), `/topics` (curated topics), `/collections` (collections) |
| **Data Available** | Photo metadata, download counts, view counts, trending topics, color data, EXIF data |
| **Unique Value** | Free, high-quality visual trend data. Topics/collections reveal curated visual themes. Color analysis data useful for brand palette recommendations. |
| **Creative Hotline Use** | Visual trend research; color palette trend analysis; supplement brand audit recommendations with data on trending visual approaches. |

---

## 11. Brand Monitoring & Listening

### 11.1 Brand24

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.brand24.com/v3/` |
| **Auth** | API Key |
| **Rate Limits** | Based on plan |
| **Free Tier** | 14-day trial |
| **Paid Tier** | Individual: $79/mo, Team: $149/mo, Pro: $199/mo, Enterprise: $399/mo |
| **Key Endpoints** | `/mentions` (brand mentions), `/analysis` (sentiment analysis), `/most-active-sites` (source breakdown), `/influencers` (influential mentioners) |
| **Data Available** | Brand mentions across social media, blogs, forums, news, podcasts, and reviews. Sentiment analysis (positive/negative/neutral), mention volume trends, reach estimates, influential sources, top hashtags, geographic distribution |
| **Unique Value** | **Real-time brand intelligence across the entire web.** Monitors mentions of "Creative Hotline," "Frankie," Jake's name, or competitor brands. Sentiment analysis reveals brand perception. Influence score identifies brand advocates. |
| **Creative Hotline Use** | Monitor brand mentions and sentiment; track competitor mentions; identify brand advocates for referral program; detect potential crises early; measure PR/content impact. |

### 11.2 Mention

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.mention.com/api/accounts/{account_id}/` |
| **Auth** | OAuth 2.0 or API Key |
| **Rate Limits** | Based on plan |
| **Free Tier** | Free plan: 1 alert, 250 mentions |
| **Paid Tier** | Solo: $29/mo, Pro: $99/mo, ProPlus: $179/mo, Company: $450+ |
| **Key Endpoints** | `/alerts` (monitoring alerts), `/mentions` (collected mentions), `/statistics` (analytics) |
| **Data Available** | Mentions across social media, web, news, blogs, forums. Sentiment, source type, language, country, influence score |
| **Unique Value** | Similar to Brand24 with competitive pricing. Better API documentation. Publish feature allows responding to mentions from the platform. |
| **Creative Hotline Use** | Same as Brand24 — brand monitoring, competitor tracking, sentiment analysis. Choose Brand24 or Mention based on pricing and feature needs. |

### 11.3 Google Alerts (via SerpAPI or similar)

| Field | Detail |
|-------|--------|
| **API Type** | No official API. Access via email parsing or third-party services (SerpAPI, DataForSEO) |
| **Auth** | N/A (Google Alerts is email-based) |
| **Free Tier** | Google Alerts is free; third-party APIs have their own pricing |
| **Data Available** | Web mentions matching keyword queries, news articles, blog posts |
| **Unique Value** | Free monitoring of brand mentions, competitor names, industry keywords. Limited to Google-indexed content. No API means parsing email alerts or using alternatives. |
| **Creative Hotline Use** | Free baseline monitoring; set up alerts for "creative hotline," "creative consultancy," competitor names, and industry keywords. Parse with n8n email trigger. |

### 11.4 Brandwatch API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Auth** | OAuth 2.0 |
| **Free Tier** | None (enterprise-only) |
| **Paid Tier** | Enterprise pricing (typically $800+/mo) |
| **Data Available** | Social listening across all platforms, consumer research, trend analysis, image recognition, audience segmentation, competitive benchmarking |
| **Unique Value** | Most comprehensive social listening platform. AI-powered trend prediction and image analysis. Too expensive for current scale but represents the gold standard. |
| **Creative Hotline Use** | Not cost-effective currently. Consider if the consultancy scales to serve enterprise clients who need social listening reports as part of their creative direction engagement. |

---

## 12. Content Performance

### 12.1 BuzzSumo API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.buzzsumo.com/search/` |
| **Auth** | API Key |
| **Rate Limits** | Based on plan (typically 10-50 requests/minute) |
| **Free Tier** | Limited free searches via web interface |
| **Paid Tier** | Content Creation: $199/mo, PR & Comms: $299/mo, Suite: $499/mo, Enterprise: $999/mo |
| **Key Endpoints** | `/articles.json` (content search), `/sharers.json` (content sharers), `/trending.json` (trending content), `/links.json` (backlink data) |
| **Data Available** | Content performance (shares, links, engagement by platform), top-performing content by topic/domain, trending content, key sharers/influencers, content format analysis, evergreen score, question analyzer |
| **Unique Value** | **Content strategy intelligence.** Shows what creative industry content gets the most engagement. Identifies content gaps — topics with high demand but low competition. Question analyzer reveals what the audience is asking about creative direction. |
| **Creative Hotline Use** | Research highest-performing content topics in creative consulting; identify content formats that resonate (video vs. carousel vs. article); find questions potential clients are asking; analyze competitor content performance. |

### 12.2 SparkToro API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.sparktoro.com/v0/` |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | Based on plan credits |
| **Free Tier** | Free: 5 searches/month |
| **Paid Tier** | Starter: $50/mo, Standard: $150/mo, Premium: $300/mo |
| **Key Endpoints** | `/search/social` (audience research), `/search/text` (text-based audience search) |
| **Data Available** | Audience demographics, websites they visit, social accounts they follow, podcasts they listen to, YouTube channels they watch, subreddits they're active in, hashtags they use, topics they discuss |
| **Unique Value** | **Audience intelligence goldmine.** Input "creative direction" or "brand strategy" and SparkToro reveals where that audience hangs out online, what they read, who they follow, and what they care about. Directly informs content strategy and channel selection. |
| **Creative Hotline Use** | Discover where potential creative direction clients spend time online; identify podcasts and publications for guest appearances/PR; find influencers the target audience follows; inform ad targeting and content distribution strategy. |

### 12.3 Chartbeat API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.chartbeat.com/` |
| **Auth** | API Key |
| **Free Tier** | None |
| **Paid Tier** | Custom pricing (publisher-focused, ~$7K+/year) |
| **Data Available** | Real-time content engagement, scroll depth, active reading time, recirculation, social traffic |
| **Unique Value** | Publisher-focused real-time content analytics. Overkill for Creative Hotline unless running a content-heavy blog/newsletter. |
| **Creative Hotline Use** | Low priority — only relevant if running a high-volume content operation. |

---

## 13. Advertising Data APIs

### 13.1 Meta Marketing API (Facebook + Instagram Ads)

| Field | Detail |
|-------|--------|
| **API Type** | REST (Graph API) |
| **Base URL** | `https://graph.facebook.com/v19.0/act_{ad_account_id}/` |
| **Auth** | OAuth 2.0 (System User Token or User Token) |
| **Rate Limits** | Business Use Case Rate Limiting: based on estimated usage. Standard apps: ~200 calls/user/hour |
| **Free Tier** | Free (API access comes with any ad account) |
| **Key Endpoints** | `/campaigns` (campaign management), `/adsets` (ad set management), `/ads` (ad management), `/insights` (performance reporting), `/adcreatives` (creative assets), `/{campaign_id}/insights` (campaign-level metrics) |
| **Data Available** | Impressions, reach, frequency, clicks, CTR, CPC, CPM, conversions, ROAS, cost per conversion, audience demographics, placement performance, creative performance, video views, engagement, lead form submissions |
| **Unique Value** | **Critical for paid growth.** The Growth Action Plan includes Instagram carousel ads and Meta ad campaigns. This API provides complete ad performance data for attribution and optimization. Can track cost-per-booking and ROAS to the penny. |
| **Implementation Notes** | Requires Facebook Business Manager and ad account. System User approach is best for server-to-server. Conversion API (CAPI) should be implemented alongside pixel for accurate attribution. |
| **Creative Hotline Use** | Track ad spend efficiency for Instagram/Facebook campaigns; measure cost-per-booking for each creative; optimize audience targeting; report ROAS to justify ad spend. |

### 13.2 Google Ads API

| Field | Detail |
|-------|--------|
| **API Type** | REST + gRPC |
| **Base URL** | `https://googleads.googleapis.com/v16/` |
| **Auth** | OAuth 2.0 (Manager Account or individual) |
| **Rate Limits** | Standard access: 15,000 operations/day (requests to Developer Token) |
| **Free Tier** | Free API access; pay for ads |
| **Key Endpoints** | `/customers/{customerId}/googleAds:search` (GAQL queries for all data), Campaign/AdGroup/Ad/Keyword resources |
| **Data Available** | Impressions, clicks, CTR, CPC, conversions, conversion value, quality score, search terms, auction insights, audience segments, geographic performance, device performance, ad schedule performance |
| **Unique Value** | Google Search ads target high-intent queries like "creative consultant" or "brand strategy session." Search ads capture demand; Meta ads create demand. The two together cover the full acquisition spectrum. |
| **Creative Hotline Use** | Search campaign performance for high-intent keywords; cost-per-booking for Google traffic; search term reports reveal what potential clients are searching; use auction insights to understand competitor ad activity. |

### 13.3 LinkedIn Marketing API (Ads)

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.linkedin.com/rest/` |
| **Auth** | OAuth 2.0 |
| **Rate Limits** | 100K requests/day (Marketing Developer Platform) |
| **Free Tier** | API access with ad account |
| **Paid Tier** | Pay for ads; minimum $10/day campaign budget |
| **Key Endpoints** | `/adAccounts`, `/adCampaigns`, `/adCreatives`, `/adAnalytics` (reporting) |
| **Data Available** | Campaign performance, audience demographics, company targeting results, conversion tracking, lead gen form submissions, InMail metrics |
| **Unique Value** | **B2B targeting precision.** Target by job title ("Creative Director"), company size, industry, seniority. LinkedIn ads are expensive ($5-15 CPC) but reach the exact decision-makers who book creative direction calls. |
| **Creative Hotline Use** | Target Creative Directors, CMOs, and Marketing VPs at companies 10-500 employees; sponsored content promoting case studies; lead gen forms for brand audit product. |

### 13.4 TikTok Ads API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://business-api.tiktok.com/open_api/v1.3/` |
| **Auth** | OAuth 2.0 (TikTok for Business) |
| **Rate Limits** | 600 requests/minute |
| **Free Tier** | API access with ad account |
| **Key Endpoints** | `/campaign/get/`, `/adgroup/get/`, `/ad/get/`, `/report/integrated/get/` (performance reports) |
| **Data Available** | Campaign/adgroup/ad metrics, video performance, audience insights, conversion tracking, cost metrics |
| **Unique Value** | If Creative Hotline targets younger creative professionals, TikTok ads offer lower CPMs than Meta/LinkedIn. Short-form video creative direction tips could perform well. |
| **Creative Hotline Use** | Future channel; test with small budget ($500/mo) to see if creative professional audience is reachable on TikTok. |

---

## 14. Influencer Intelligence

### 14.1 HypeAuditor API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://hypeauditor.com/api/` |
| **Auth** | API Key |
| **Rate Limits** | Based on plan |
| **Free Tier** | Limited free reports |
| **Paid Tier** | Starter: ~$299/mo, Business: custom |
| **Key Endpoints** | `/ig/report/{username}` (IG profile analysis), `/youtube/report/{channel_id}`, `/tiktok/report/{username}` |
| **Data Available** | Follower authenticity (fake follower %), engagement rate (true), audience demographics (age, gender, location, interests), audience quality score, brand affinity, growth trends, similar accounts |
| **Unique Value** | **Influencer fraud detection and audience analysis.** Can analyze @creative.hotline's audience quality, verify that engagement is real, and understand audience demographics at a deeper level than IG's native insights. Also useful for vetting influencer partnerships. |
| **Creative Hotline Use** | Audit @creative.hotline's audience quality; analyze potential collaboration partners; verify audience authenticity for client brand audits; competitive account analysis. |

### 14.2 Upfluence API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Auth** | OAuth 2.0 |
| **Free Tier** | None |
| **Paid Tier** | Custom pricing (~$478+/mo) |
| **Data Available** | Influencer discovery, audience demographics, engagement analytics, campaign tracking, EMV (earned media value) |
| **Unique Value** | Full influencer marketing platform with discovery, outreach, and campaign tracking. |
| **Creative Hotline Use** | Only relevant if running influencer marketing campaigns. More suited for clients' needs than the consultancy's own growth. Could offer as part of brand audit service. |

### 14.3 Modash API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.modash.io/v1/` |
| **Auth** | API Key |
| **Rate Limits** | Based on credits |
| **Free Tier** | 14-day trial |
| **Paid Tier** | Essentials: $120/mo, Performance: $299/mo, Enterprise: custom |
| **Key Endpoints** | `/instagram/profile/{username}`, `/tiktok/profile/{username}`, `/youtube/channel/{id}`, `/search/instagram` |
| **Data Available** | Creator profiles, audience demographics, engagement rates, lookalike audiences, fake follower detection, brand mentions |
| **Unique Value** | 200M+ creator database. Good for finding micro-influencers in the creative space for partnerships or client recommendations. |
| **Creative Hotline Use** | Identify creative industry micro-influencers for collaboration; use in brand audit reports to recommend influencer partners for clients. |

---

## 15. Market Intelligence & Benchmarks

### 15.1 Bureau of Labor Statistics (BLS) API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.bls.gov/publicAPI/v2/` |
| **Auth** | Registration key (optional, increases limits) |
| **Rate Limits** | Without key: 25 queries/day, 10 years/query. With key: 500 queries/day, 20 years/query |
| **Free Tier** | Completely free |
| **Key Endpoints** | `/timeseries/data/` (time series data) |
| **Data Available** | Employment statistics, wage data by occupation (graphic designers, art directors, marketing managers), industry employment trends, CPI (inflation), PPI |
| **Unique Value** | **Market sizing and salary benchmarks.** Know what creative professionals earn (to price services appropriately), track employment trends in creative industries, understand economic context for creative spending. |
| **Creative Hotline Use** | Benchmark pricing against creative director salaries; track creative industry employment trends; economic context for revenue forecasting; justify consultancy pricing with market data. |

### 15.2 Census Bureau API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.census.gov/data/` |
| **Auth** | API Key (free registration) |
| **Rate Limits** | 500 queries/day/key |
| **Free Tier** | Completely free |
| **Key Endpoints** | Various datasets: Annual Business Survey, County Business Patterns, Economic Census |
| **Data Available** | Business formation data, industry revenue, geographic business density, company size distribution |
| **Unique Value** | Understand the business landscape for creative services: how many design firms exist, where they cluster, revenue trends. |
| **Creative Hotline Use** | Market sizing for creative consultancy; geographic analysis for expansion; industry trend data. |

### 15.3 IBISWorld / Statista APIs

| Field | Detail |
|-------|--------|
| **API Type** | No public API (data via subscriptions and reports) |
| **Free Tier** | Limited free statistics on Statista |
| **Paid Tier** | IBISWorld: $1,100+/report. Statista: $39/mo (basic) to $6K+/year (enterprise) |
| **Data Available** | Industry reports, market size, growth rates, competitive landscape, key success factors, cost structure breakdowns |
| **Unique Value** | Professional-grade industry benchmarks. IBISWorld covers "Graphic Design Services" and "Management Consulting" industries specifically. Statista has creative industry statistics. |
| **Creative Hotline Use** | Industry benchmark data for revenue goals; market size data for investor/strategy decks; competitive landscape analysis; pricing intelligence. |

### 15.4 Glassdoor API (via third-party)

| Field | Detail |
|-------|--------|
| **API Type** | Official API deprecated; data via scraping services (Proxycurl, Apify) |
| **Free Tier** | N/A |
| **Data Available** | Company ratings, salary data by role, interview reviews, company culture data |
| **Unique Value** | Salary benchmarks for creative roles help justify consultancy pricing. Company culture data useful for client brand audits. |
| **Creative Hotline Use** | Creative role salary benchmarks; company culture analysis for client brand audits. |

### 15.5 Indeed/LinkedIn Salary APIs

| Field | Detail |
|-------|--------|
| **API Type** | Indeed: no public API. LinkedIn: limited salary data in Marketing API |
| **Data Available** | Job postings, salary ranges, skills in demand, geographic salary differences |
| **Unique Value** | Real-time job market demand signals. If companies are hiring creative directors, they likely need interim creative direction (i.e., Creative Hotline's service). |
| **Creative Hotline Use** | Identify companies actively hiring for creative roles (potential clients during their transition period); salary benchmarks for pricing. |

### 15.6 Upwork/Fiverr Data (via web scraping)

| Field | Detail |
|-------|--------|
| **API Type** | No public APIs for market data. Upwork has client/freelancer API for managing contracts |
| **Data Available** | Freelance rates by category, project types, demand trends, skill pricing |
| **Unique Value** | Freelance creative services pricing intelligence. Understand the price spectrum from low-cost Fiverr to premium Upwork consultants. Positions Creative Hotline's pricing ($499-$1,495) in the market. |
| **Creative Hotline Use** | Competitive pricing intelligence; understand the freelance creative services market; identify pricing gaps where Creative Hotline offers premium value. |

### 15.7 Clutch.co API (via scraping/partnership)

| Field | Detail |
|-------|--------|
| **API Type** | No public API; data available via scraping or partnership |
| **Data Available** | Agency reviews, pricing ranges, service categories, client portfolios, industry focus |
| **Unique Value** | **Direct competitive intelligence for creative consultancies.** Clutch is the primary directory for creative agencies and consultancies. See competitor pricing, services, reviews, and focus areas. |
| **Creative Hotline Use** | Competitive pricing intelligence; identify underserved niches; understand how competitors position themselves; potential listing for lead generation. |

---

## 16. Job Market & Freelance Data

### 16.1 LinkedIn Talent Insights (API)

| Field | Detail |
|-------|--------|
| **API Type** | REST (part of LinkedIn Marketing/Talent Solutions API) |
| **Auth** | OAuth 2.0 (requires LinkedIn Talent Solutions partnership) |
| **Free Tier** | None |
| **Paid Tier** | Enterprise only (Talent Solutions contract) |
| **Data Available** | Talent pool data, skill trends, hiring trends, geographic talent distribution, company headcount changes |
| **Unique Value** | Enterprise-grade workforce intelligence. Shows which companies are growing/shrinking creative teams — a signal for potential clients. |
| **Creative Hotline Use** | Enterprise-level prospecting intelligence; not cost-effective at current scale. |

### 16.2 RapidAPI (Aggregator)

| Field | Detail |
|-------|--------|
| **API Type** | REST (marketplace for thousands of APIs) |
| **Base URL** | `https://{api-name}.p.rapidapi.com/` |
| **Auth** | API Key (RapidAPI key) |
| **Rate Limits** | Varies by API |
| **Free Tier** | Many APIs have free tiers |
| **Key APIs for Creative Hotline** | Job Search APIs, Company Data APIs, Social Media APIs, SEO APIs, NLP APIs |
| **Unique Value** | **One API key, hundreds of APIs.** Aggregates APIs that would otherwise require individual signups. Good for testing new data sources quickly. Many free tiers available. |
| **Creative Hotline Use** | Quick prototyping access to job market data, company data, and social media data through a single integration point. |

---

## 17. AI & NLP APIs

### 17.1 Anthropic Claude API (Current)

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.anthropic.com/v1/` |
| **Auth** | API Key (x-api-key header) |
| **Rate Limits** | Tier-based: Tier 1: 60 RPM, 300K input tokens/min. Tier 4: 4000 RPM, 10M input tokens/min |
| **Free Tier** | None ($5 free credits for new accounts) |
| **Paid Tier** | Pay-per-use: Sonnet ~$3/$15 per M input/output tokens; Opus ~$15/$75 per M tokens |
| **Key Endpoints** | `/messages` (chat), `/messages` with streaming, tool use, vision |
| **Data Available** | Text generation, analysis, summarization, classification, structured output |
| **Unique Value** | **Already integrated for intake analysis and action plans.** Using claude-sonnet-4-5-20250929. Powers: intake form analysis, upsell detection, action plan generation, transcript processing, brand voice content. |
| **Creative Hotline Use** | Intake analysis, action plan generation, brand audit AI analysis, content repurposing, transcript processing, Frankie voice generation. |

### 17.2 OpenAI API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.openai.com/v1/` |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | Tier-based: varies by model (e.g., GPT-4o: 500 RPM at Tier 1) |
| **Free Tier** | $5 free credits for new accounts |
| **Paid Tier** | GPT-4o: $2.50/$10 per M input/output tokens; GPT-4o-mini: $0.15/$0.60 per M tokens |
| **Key Endpoints** | `/chat/completions`, `/embeddings`, `/images/generations` (DALL-E), `/audio/transcriptions` (Whisper), `/audio/speech` (TTS) |
| **Data Available** | Text generation, embeddings (for semantic search), image generation, speech-to-text, text-to-speech |
| **Unique Value** | Whisper API for transcription (alternative to Fireflies); DALL-E for image generation in brand audits; embeddings for semantic client matching. Multi-modal capabilities. |
| **Creative Hotline Use** | Backup/supplementary AI provider; Whisper for call transcription if Fireflies is dropped; embeddings for intelligent client/content matching; image generation for brand audit mockups. |

### 17.3 Google Cloud Natural Language API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://language.googleapis.com/v2/` |
| **Auth** | API Key or Service Account |
| **Rate Limits** | 600 requests/minute |
| **Free Tier** | 5,000 units/month free (each feature call = 1-3 units) |
| **Paid Tier** | $1-2 per 1000 units beyond free tier |
| **Key Endpoints** | `/documents:analyzeSentiment`, `/documents:analyzeEntities`, `/documents:classifyText`, `/documents:moderateText` |
| **Data Available** | Sentiment analysis (score + magnitude), entity extraction (people, organizations, places), content classification (700+ categories), syntax analysis, text moderation |
| **Unique Value** | **Structured analysis of client communications.** Analyze intake form text, testimonials, social mentions for sentiment and key entities. Content classification helps categorize client needs automatically. |
| **Creative Hotline Use** | Sentiment analysis on client testimonials for NPS correlation; entity extraction from intake forms to auto-tag industries/topics; classify client needs for routing and recommendation. |

### 17.4 Cohere API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.cohere.ai/v1/` |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | Free: 100 calls/minute. Production: 10,000 calls/minute |
| **Free Tier** | Trial: 1000 API calls/month (rate limited) |
| **Paid Tier** | Production: pay-per-use ($0.20/M tokens for Embed) |
| **Key Endpoints** | `/embed` (embeddings), `/rerank` (search reranking), `/classify` (text classification), `/chat` (generation) |
| **Data Available** | Text embeddings, semantic search/reranking, text classification, generation |
| **Unique Value** | Best-in-class embeddings and reranking. If building a knowledge base search (e.g., searching across all client action plans, intake forms, and transcripts), Cohere's embedding model excels at retrieval. |
| **Creative Hotline Use** | Semantic search across client history ("find all clients who asked about brand refresh"); rerank search results for relevance; classify incoming leads by topic/intent. |

### 17.5 Deepgram API

| Field | Detail |
|-------|--------|
| **API Type** | REST + WebSocket (real-time) |
| **Base URL** | `https://api.deepgram.com/v1/` |
| **Auth** | API Key |
| **Rate Limits** | Based on plan |
| **Free Tier** | $200 in free credits |
| **Paid Tier** | Pay-as-you-go: $0.0043/min (Nova-2); Growth: $4K/year |
| **Key Endpoints** | `/listen` (transcription), `/speak` (text-to-speech) |
| **Data Available** | Transcription (pre-recorded and real-time), speaker diarization, sentiment analysis, topic detection, summarization, entity detection |
| **Unique Value** | **Alternative to Fireflies for call transcription.** Faster and cheaper than Whisper. Real-time transcription could enable live call analysis. Speaker diarization identifies who said what (Jake vs. client). |
| **Creative Hotline Use** | Call transcription (replace or supplement Fireflies); real-time call analysis; post-call sentiment detection; automated call summary generation. |

### 17.6 Fireflies.ai API (Current)

| Field | Detail |
|-------|--------|
| **API Type** | GraphQL |
| **Base URL** | `https://api.fireflies.ai/graphql` |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | Based on plan |
| **Free Tier** | Free plan: limited transcription minutes |
| **Paid Tier** | Pro: $10/user/mo, Business: $19/user/mo, Enterprise: $39/user/mo |
| **Key Endpoints** | GraphQL queries: `transcripts`, `transcript(id)`, `user` |
| **Data Available** | Call transcripts, speaker labels, action items, questions asked, sentiment, key topics, custom vocabulary, meeting summary |
| **Unique Value** | **Already integrated.** Auto-joins Calendly calls, transcribes, and provides structured meeting data. Action item extraction is directly useful for action plan generation. |
| **Implementation Notes** | Integrated via `app/services/fireflies_client.py`. GraphQL (not REST). Feeds into transcript_processor.py for action plan generation. |
| **Creative Hotline Use** | Call transcription and analysis; automated action item extraction; feeds into AI action plan generation; meeting analytics. |

---

## 18. Workflow & Automation APIs

### 18.1 n8n API (Current)

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://creativehotline.app.n8n.cloud/api/v1/` |
| **Auth** | API Key (X-N8N-API-KEY header) |
| **Rate Limits** | Based on plan (cloud limits apply) |
| **Free Tier** | n/a (currently on paid plan) |
| **Key Endpoints** | `/workflows` (list/manage), `/executions` (execution history), `/credentials` (credential management) |
| **Data Available** | Workflow definitions, execution history (success/fail), execution data, node configurations |
| **Unique Value** | **Already the automation backbone.** 5 active workflows. Execution history provides workflow health data for the System Health page. |
| **Creative Hotline Use** | Workflow monitoring, execution tracking, health checks via `app/services/n8n_client.py`. |

### 18.2 Zapier API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.zapier.com/v1/` |
| **Auth** | API Key |
| **Free Tier** | 100 tasks/month |
| **Paid Tier** | Starter: $19.99/mo, Professional: $49/mo, Team: $69/mo |
| **Data Available** | Zap execution data, connected apps, task usage |
| **Unique Value** | Alternative/supplement to n8n. 6000+ app integrations. Better for simple automations; n8n is better for complex logic. |
| **Creative Hotline Use** | Not needed — n8n covers automation needs. Keep as backup awareness. |

### 18.3 Make (Integromat) API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://us1.make.com/api/v2/` |
| **Auth** | API Key |
| **Free Tier** | 1000 operations/month |
| **Paid Tier** | Core: $9/mo, Pro: $16/mo, Teams: $29/mo |
| **Data Available** | Scenario execution data, connected apps, data store contents |
| **Unique Value** | More visual than n8n for non-technical users. Better for data transformations. |
| **Creative Hotline Use** | Not needed — n8n is established. Keep as backup awareness. |

---

## 19. Communication APIs

### 19.1 Twilio API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.twilio.com/2010-04-01/` |
| **Auth** | Account SID + Auth Token (Basic Auth) |
| **Rate Limits** | 100 concurrent connections (default); higher with account upgrade |
| **Free Tier** | Trial: free credits (~$15); limited to verified numbers |
| **Paid Tier** | Pay-as-you-go: SMS $0.0079/msg, Voice $0.0085/min |
| **Key Endpoints** | `/Messages` (SMS/MMS), `/Calls` (voice), WhatsApp Business API |
| **Data Available** | SMS delivery status, call logs, recording transcripts, WhatsApp message status |
| **Unique Value** | **SMS follow-ups and appointment reminders.** SMS has 98% open rate vs. 20% for email. Could replace or supplement email reminders for booking and intake with SMS nudges. |
| **Creative Hotline Use** | Booking confirmation SMS; intake form reminder SMS (higher open rate than email); call reminder 1 hour before; post-call thank you SMS with action plan link. |

### 19.2 SendGrid API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.sendgrid.com/v3/` |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | Free: 100 emails/day. Paid: based on plan |
| **Free Tier** | 100 emails/day forever |
| **Paid Tier** | Essentials: $19.95/mo (50K emails), Pro: $89.95/mo (100K), Premier: custom |
| **Key Endpoints** | `/mail/send` (send email), `/stats` (analytics), `/tracking_settings` (open/click tracking), `/contactdb` (contact management) |
| **Data Available** | Email delivery rates, open rates, click rates, bounce rates, spam reports, unsubscribes, link click tracking |
| **Unique Value** | Enterprise-grade email delivery with detailed analytics. Better deliverability than raw SMTP. Could replace n8n's SMTP node for more reliable, trackable email delivery. |
| **Creative Hotline Use** | Reliable email delivery for all automated emails (currently sent via n8n SMTP); delivery analytics to track which emails are being opened/clicked; resolve potential deliverability issues with hello@creativehotline.com. |

### 19.3 ManyChat API (Current)

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.manychat.com/fb/` |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | 10 requests/second |
| **Free Tier** | Free plan: basic features, 1000 contacts |
| **Paid Tier** | Pro: $15/mo (500 contacts), scales with contacts ($44/mo current) |
| **Key Endpoints** | `/sending/sendContent` (send message), `/subscriber/getInfo` (subscriber data), `/subscriber/findByCustomField` (search), `/page/setCustomField` (update subscriber) |
| **Data Available** | Subscriber profiles, custom fields, tag assignments, last interaction date, sequence positions, automation triggers |
| **Unique Value** | **Already integrated** for Instagram DM automation. AI-powered DM responses via Knowledge Base. Captures leads from IG comments and DMs. |
| **Creative Hotline Use** | IG DM lead capture and nurturing; automated keyword responses (BOOK, PRICING, HELP via Laylo); subscriber segmentation; sequence management. |

### 19.4 Intercom API

| Field | Detail |
|-------|--------|
| **API Type** | REST |
| **Base URL** | `https://api.intercom.io/` |
| **Auth** | Access Token (Bearer) |
| **Rate Limits** | 83 requests/10 sec (standard plan) |
| **Free Tier** | Essential: $39/seat/month |
| **Paid Tier** | Advanced: $99/seat/mo, Expert: $139/seat/mo |
| **Key Endpoints** | `/contacts`, `/conversations`, `/messages`, `/articles`, `/help_center` |
| **Data Available** | Customer conversations, support metrics, article views, resolution time, customer segments, product tours, custom bots |
| **Unique Value** | Website chat + customer communication platform. Could power a live chat widget on thecreativehotline.com for immediate prospect engagement. |
| **Creative Hotline Use** | Website live chat for immediate prospect engagement; chatbot for FAQs and booking; knowledge base for self-service support. Higher cost than alternatives — consider Crisp or Tawk.to for similar features. |

### 19.5 Slack API

| Field | Detail |
|-------|--------|
| **API Type** | REST + WebSocket (Events API, RTM) |
| **Base URL** | `https://slack.com/api/` |
| **Auth** | OAuth 2.0 (Bot Token) |
| **Rate Limits** | Tier 1: 1 request/minute, Tier 2: 20/minute, Tier 3: 50/minute, Tier 4: 100+/minute |
| **Free Tier** | Free Slack workspace + free app creation |
| **Key Endpoints** | `chat.postMessage` (send messages), `conversations.history` (read messages), Events API (webhooks) |
| **Data Available** | Messages, channels, users, reactions, file sharing, app integrations |
| **Unique Value** | Internal team communication and notifications. Better than email for real-time team alerts (new booking, intake submitted, call about to start). |
| **Creative Hotline Use** | Internal notifications (new payment, booking, intake) as Slack messages instead of or alongside email; team coordination channel; automated daily summary of pipeline status. |

---

## 20. Priority Matrix for Creative Hotline

### Tier 1: Integrate Now (Already Have or Critical)
These are either already integrated or provide the highest immediate value.

| Source | Status | Priority Reason | Est. Cost |
|--------|--------|----------------|-----------|
| **Notion API** | Integrated | Core CRM | Free |
| **Stripe API** | Integrated | Revenue source of truth | Free (tx fees) |
| **Calendly API** | Integrated | Booking data | $10/mo |
| **Claude API** | Integrated | AI analysis engine | ~$50-100/mo |
| **Fireflies.ai** | Integrated | Call transcription | $10-19/mo |
| **ManyChat** | Integrated | IG DM automation | $44/mo |
| **Instagram Graph API** | NOT YET | Primary social channel analytics | Free |
| **Google Analytics (GA4)** | NOT YET | Website conversion tracking | Free |
| **Google Search Console** | NOT YET | SEO visibility | Free |

### Tier 2: Integrate Soon (High Value, Low Cost)
These unlock significant intelligence at minimal cost.

| Source | Priority Reason | Est. Cost |
|--------|----------------|-----------|
| **Meta Marketing API** | Track ad spend ROI for IG campaigns | Free (with ad spend) |
| **Apollo.io** | Lead enrichment for Notion records | Free (10K credits/mo) |
| **SendGrid or Resend** | Reliable email delivery + tracking | Free tier or $20/mo |
| **ConvertKit/Beehiiv** | Email marketing + newsletter growth | Free-$29/mo |
| **Twilio** | SMS appointment reminders (98% open rate) | ~$10-20/mo |
| **Pinterest Trends API** | Visual trend forecasting for clients | Free |
| **BLS API** | Market sizing and salary benchmarks | Free |

### Tier 3: Integrate When Scaling (Medium Value, Medium Cost)
These become valuable as the business grows.

| Source | Priority Reason | Est. Cost |
|--------|----------------|-----------|
| **SparkToro** | Audience intelligence for content strategy | $50-150/mo |
| **BuzzSumo** | Content performance research | $199/mo |
| **Brand24 or Mention** | Brand monitoring and sentiment | $79-149/mo |
| **LinkedIn Marketing API** | B2B ad targeting for premium clients | Free (with ad spend) |
| **HypeAuditor** | Audience quality audit for @creative.hotline | $299/mo |
| **Google Ads API** | Search ad performance tracking | Free (with ad spend) |
| **Hotjar** | Website UX optimization | $32-80/mo |
| **Slack API** | Internal team notifications | Free |
| **Deepgram** | Call transcription alternative (cheaper) | $0.0043/min |

### Tier 4: Future / Enterprise (Evaluate Later)
These are for a scaled operation or specific use cases.

| Source | Priority Reason | Est. Cost |
|--------|----------------|-----------|
| **Ahrefs or SEMrush** | Full SEO competitive intelligence | $99-199/mo |
| **SimilarWeb** | Competitive traffic analysis | $125+/mo |
| **HubSpot** | CRM upgrade when Notion is outgrown | $20-800/mo |
| **Crunchbase** | Funded company prospecting | $99+/mo |
| **BuiltWith** | Tech stack prospecting | $295+/mo |
| **LinkedIn Talent Insights** | Workforce intelligence | Enterprise only |
| **TikTok API** | Future channel expansion | Free |
| **YouTube Data API** | Future content channel | Free |
| **Brandwatch** | Enterprise social listening | $800+/mo |
| **Cohere Embeddings** | Semantic search across client data | ~$20/mo |

---

## Implementation Recommendations

### Phase 0 (Now): Fill Critical Gaps
1. **Instagram Graph API** — The primary customer acquisition channel has zero programmatic analytics. Set up a Facebook App, get IG Insights permissions, and pipe data to the Command Center dashboard. Free.
2. **Google Analytics 4** — Install GA4 on the Webflow site immediately. Create a Service Account for API access. Track: page views, payment link clicks, Calendly link clicks, traffic sources. Free.
3. **Google Search Console** — Verify the domain and connect API. Know what search queries bring visitors. Free.

### Phase 1 (Weeks 1-2): Lead Intelligence
4. **Apollo.io** — Enrich Notion Payments DB records with company data (6 fields planned in Growth Action Plan). Free tier provides 10K credits/month. Wire into n8n or Command Center.
5. **Meta Marketing API** — If running Instagram ads (Growth Action Plan Phase 2), this is required for tracking ROAS and optimizing spend. Free.
6. **SendGrid or Resend** — Replace n8n SMTP with a proper email delivery service. Get delivery/open/click tracking on all automated emails. Helps debug the hello@creativehotline.com issue.

### Phase 2 (Weeks 2-4): Content & Growth Intelligence
7. **ConvertKit or Beehiiv** — Launch a newsletter for lead nurturing and thought leadership. Replaces manual email sequences in n8n.
8. **SparkToro** — Understand where the target audience (creative directors, brand managers) spends time online. Informs content and partnership strategy.
9. **Pinterest Trends API** — Forward-looking visual trend data for creative direction recommendations.
10. **BLS API** — Market sizing data for revenue modeling; salary benchmarks for pricing justification.

### Phase 3 (Months 2-3): Monitoring & Optimization
11. **Brand24 or Mention** — Monitor brand mentions, competitor activity, and industry sentiment.
12. **BuzzSumo** — Research top-performing content in the creative consulting space.
13. **Hotjar** — Optimize the Webflow pricing and booking flow with heatmaps and recordings.
14. **Twilio** — Add SMS reminders for bookings and intake forms. 98% open rate vs. 20% for email.

### Architecture Notes
- All new API integrations should follow the existing pattern: `app/services/{service}_client.py` for API wrapper, with a corresponding demo service
- Use `_get_secret()` pattern for all API keys (env var first, then `st.secrets`)
- Add health checks to `app/services/health_checker.py` for each new service
- Cache API responses with `@st.cache_data(ttl=300)` to respect rate limits
- Create `tests/test_{service}_client.py` with mocked responses for each new integration
- Update `app/config.py:Settings` dataclass with any new configuration values

### Data Flow Architecture
```
External APIs ──→ app/services/{service}_client.py ──→ app/utils/{analyzer}.py ──→ app/pages/{page}.py
                         ↓                                      ↓
                  app/services/cache_manager.py          app/components/{chart}.py
                         ↓                                      ↓
                  st.session_state                      Streamlit UI
```

### Cost Estimate (Full Stack)
| Tier | Monthly Cost | What You Get |
|------|-------------|--------------|
| Current (Tier 1 only) | ~$130/mo | CRM, payments, booking, AI, transcription, DM automation |
| + Tier 2 additions | ~$180-230/mo | + Email marketing, SMS, lead enrichment, SEO data |
| + Tier 3 additions | ~$850-1,200/mo | + Brand monitoring, content research, audience intelligence, UX optimization |
| Full stack (all tiers) | ~$2,000-3,000/mo | Complete business intelligence platform |

**Recommendation:** Stay at Tier 1 + 2 until monthly revenue exceeds $10K/month. Tier 3 investments should each be justified by a specific revenue or efficiency gain. Tier 4 is for when the consultancy is doing $50K+/month.

---

## Appendix: Authentication Quick Reference

| Auth Type | APIs Using It | Notes |
|-----------|--------------|-------|
| **API Key (header)** | Claude, Stripe, Fireflies, Apollo, SendGrid, Resend, BLS, Ahrefs, SEMrush, Brand24, ManyChat, n8n | Simplest. Store in `.env` / `st.secrets` |
| **OAuth 2.0** | Instagram, LinkedIn, X, Google (GA4, GSC), Pinterest, Threads, HubSpot, Calendly, Typeform, TikTok, Meta Ads | Requires user authorization flow. Use refresh tokens for long-lived access |
| **Service Account** | Google (GA4, GSC, NLP) | Server-to-server. No user interaction. Best for backend integrations |
| **Basic Auth** | Stripe (alt), Close.com, Twilio | Username:password encoded as Base64 |
| **Webhook** | Tally, Stripe, Calendly, n8n, Laylo | Event-driven push. No polling needed |

## Appendix: Rate Limit Comparison

| API | Requests | Period | Notes |
|-----|----------|--------|-------|
| Notion | 3 | 1 second | Bottleneck for CRM queries — use batch + caching |
| Stripe | 100 read + 100 write | 1 second | Very generous |
| Instagram Graph | 200 | 1 hour/user | Adequate for analytics polling |
| Google Analytics | 10 concurrent | Per project | Use batch reporting |
| LinkedIn | 100K | 1 day | Very generous on Marketing tier |
| X (Twitter) Basic | 100 | 15 minutes | Restrictive |
| Apollo | ~100 | 1 minute | Adequate for enrichment batches |
| ManyChat | 10 | 1 second | Adequate for automation |
| SendGrid | Unlimited (paid) | N/A | Burst limits apply |
| BLS | 500 | 1 day (with key) | Adequate for periodic data pulls |
