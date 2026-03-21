# Automation Workflows Specification — Music Command Center

> Complete inventory of every automated workflow that keeps the Music Command Center alive without manual intervention.
> Covers data pipelines, alert rules, scheduled reports, integration flows, and the decision framework for where each piece runs.

**Last updated:** 2026-02-26
**Author:** The Conductor (Automation Implementation Specialist)
**Depends on:** [Data Sources Catalog](./data-sources-catalog.md), [Scoring Models Spec](./scoring-models-spec.md), [Voice & Copy Guide](./voice-and-copy-guide.md)

---

## Table of Contents

1. [Decision Framework: n8n vs In-App vs Vercel Cron](#1-decision-framework)
2. [Data Pipeline Workflows](#2-data-pipeline-workflows)
3. [Alert Workflows](#3-alert-workflows)
4. [Scheduled Report Workflows](#4-scheduled-report-workflows)
5. [Integration Workflows](#5-integration-workflows)
6. [n8n Workflow Inventory](#6-n8n-workflow-inventory)
7. [In-App Automation Inventory](#7-in-app-automation-inventory)
8. [Error Handling & Retry Strategy](#8-error-handling--retry-strategy)
9. [Rate Limit Management](#9-rate-limit-management)
10. [Data Schema & Storage](#10-data-schema--storage)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Monitoring & Observability](#12-monitoring--observability)

---

## 1. Decision Framework

Every piece of automation must live somewhere. Here is the framework for deciding where.

### The Three Execution Environments

| Environment | Best For | Limitations |
|-------------|----------|-------------|
| **n8n Cloud** | Multi-step orchestration with branching logic, webhook receivers, email sending, workflows that touch 3+ external services, anything requiring visual debugging | 5-minute execution timeout on Cloud, no persistent state between runs, limited compute |
| **Next.js API Routes (Vercel Cron)** | Lightweight scheduled tasks, data fetches that write directly to the app's database, tasks that need app context (auth tokens, DB connection) | 10-second timeout on Hobby, 60-second on Pro, no visual debugging, cold starts |
| **Next.js API Routes (On-Demand)** | User-triggered actions (connect account, manual refresh, CSV import), tasks that need immediate response to the UI | Same timeout limits, must return quickly for good UX |

### Decision Tree

```
Does this workflow touch 3+ external APIs in sequence?
  YES → n8n (visual orchestration, easier error handling per node)
  NO ↓

Does this workflow need to send emails with branded templates?
  YES → n8n (SMTP node, template management, retry on bounce)
  NO ↓

Does this workflow need to receive webhooks from external services?
  YES → Does it need complex routing based on webhook payload?
    YES → n8n (IF/Switch nodes, easy to debug webhook payloads)
    NO → Next.js API route (simple webhook handler)

Does this workflow write directly to the app's database?
  YES → Next.js API route (direct Prisma/Supabase access)
  NO → n8n (if multi-step) or Vercel Cron (if single-step)

Is this a simple "fetch data, transform, store" on a schedule?
  YES → Vercel Cron → Next.js API route
  NO → n8n

Does the user need to trigger this manually from the UI?
  YES → Next.js API route (POST endpoint called from frontend)
  NO → n8n or Vercel Cron (scheduled)
```

### Quick Assignment Table

| Task Type | Where | Why |
|-----------|-------|-----|
| Daily streaming data pull | Vercel Cron → API route | Single API call, writes to DB |
| Social metrics aggregation | Vercel Cron → API route | Single source per run, writes to DB |
| Revenue data sync | n8n | Touches distributor + normalizer + DB + optional email |
| Alert evaluation | Vercel Cron → API route | Reads from DB, computes thresholds, writes alerts |
| Alert delivery (email/push) | n8n | SMTP + template + retry logic |
| Weekly career brief | n8n | Data aggregation + AI summary + email delivery |
| OAuth token refresh | Vercel Cron → API route | DB read/write of tokens, simple logic |
| CSV import processing | Next.js API route (on-demand) | User-triggered, needs upload handling |
| New release detection | Vercel Cron → API route | Single API check, writes to DB |
| Webhook receivers (Stripe, Chartmetric) | n8n | Complex routing, multiple downstream actions |
| Score recalculation | Vercel Cron → API route | Pure computation from DB data |

---

## 2. Data Pipeline Workflows

### Overview

Data pipelines are the backbone. They run on schedule, pull from external sources, normalize, and store. Every pipeline follows the same pattern:

```
TRIGGER (cron schedule)
  → FETCH (API call with auth + rate limit handling)
  → NORMALIZE (transform to canonical schema)
  → COMPARE (diff against previous snapshot for change detection)
  → STORE (write to database)
  → EVALUATE (check alert thresholds)
```

---

### DP-1: Daily Streaming Data Pull

**Trigger:** Vercel Cron, every day at 6:00 AM UTC
**Environment:** Next.js API route (`/api/cron/streaming-pull`)
**Sources:** Songstats API (primary), Spotify Web API (supplemental)
**Cost:** Songstats Pro ($9.99/mo)

**Data Flow:**

```
1. Fetch Songstats /artists/{id}/stats for Jakke
2. Fetch Songstats /artists/{id}/stats for Enjune
3. Fetch Spotify /v1/artists/{id} for both (live popularity, followers)
4. Fetch Spotify /v1/artists/{id}/top-tracks for both
5. Normalize all responses to canonical StreamingSnapshot schema
6. Write to streaming_snapshots table (append, never overwrite)
7. Update current_metrics cache (latest values for dashboard)
8. Compare today vs yesterday: flag any metric with >20% change
9. If flagged → write to pending_alerts table
```

**Canonical Schema:**

```typescript
interface StreamingSnapshot {
  id: string;                    // auto-generated
  artist_id: string;             // "jakke" | "enjune"
  snapshot_date: Date;           // UTC midnight
  source: string;                // "songstats" | "spotify"

  // Core metrics
  spotify_monthly_listeners: number;
  spotify_followers: number;
  spotify_popularity: number;
  spotify_total_streams: number;
  cross_platform_total_streams: number;
  cross_platform_total_followers: number;
  cross_platform_total_playlists: number;
  cross_platform_playlist_reach: number;

  // Per-track data (JSONB)
  track_popularity: Record<string, number>;
  track_streams: Record<string, number>;

  // Playlist snapshot
  current_playlists: number;
  playlist_additions_today: number;  // 0 if no diff data
  playlist_removals_today: number;   // 0 if no diff data

  // Radio
  radio_plays: number;

  created_at: Date;
}
```

**Rate Limit Budget:**
- Songstats: 2 calls (1 per artist) out of 100/min limit. No concern.
- Spotify: 4 calls. Well under 180/min limit.

---

### DP-2: Social Metrics Collection

**Trigger:** Vercel Cron, every day at 7:00 AM UTC
**Environment:** Next.js API route (`/api/cron/social-pull`)
**Sources:** Instagram Graph API, YouTube Data API v3
**Cost:** Free

**Data Flow:**

```
1. Check Instagram token validity (60-day expiry)
   → If <7 days remaining, queue token refresh alert
2. Fetch IG /{user-id}?fields=followers_count,media_count
3. Fetch IG /{user-id}/insights?metric=impressions,reach,profile_views&period=day
4. Fetch IG /{user-id}/insights?metric=follower_count&period=day (last 30 days)
5. Fetch YouTube /channels?id={id}&part=statistics (subscribers, views, video count)
6. Fetch YouTube /search?channelId={id}&publishedAfter={yesterday} (detect new uploads)
7. Normalize all to SocialSnapshot schema
8. Write to social_snapshots table
9. Update current_metrics cache
10. Evaluate alert thresholds (follower milestones, engagement drops)
```

**Canonical Schema:**

```typescript
interface SocialSnapshot {
  id: string;
  snapshot_date: Date;

  // Instagram
  ig_followers: number;
  ig_following: number;
  ig_posts_count: number;
  ig_impressions_day: number;
  ig_reach_day: number;
  ig_profile_visits_day: number;
  ig_engagement_rate: number;        // calculated: interactions / reach

  // YouTube
  yt_subscribers: number;
  yt_total_views: number;
  yt_video_count: number;
  yt_views_today: number;            // diff from yesterday

  created_at: Date;
}
```

**Rate Limit Budget:**
- Instagram: ~6 calls. Under 200/user/hour.
- YouTube: ~3 units. Under 10,000/day quota.

---

### DP-3: Playlist Intelligence Sync

**Trigger:** Vercel Cron, every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
**Environment:** Next.js API route (`/api/cron/playlist-sync`)
**Sources:** Songstats API (Phase 1), Chartmetric API (Phase 3)
**Cost:** Included in Songstats Pro / Chartmetric Pro

**Data Flow:**

```
1. Fetch Songstats /artists/{id}/playlists for Jakke
2. Fetch Songstats /artists/{id}/playlists for Enjune
3. Compare current playlist set vs stored playlist set
4. For each NEW playlist:
   a. Record addition with timestamp, playlist name, follower count
   b. Classify: editorial / algorithmic / user-generated (from metadata)
   c. If follower_count > 10,000 → create HIGH priority alert
   d. If follower_count > 50,000 → create URGENT alert
5. For each REMOVED playlist:
   a. Record removal with timestamp
   b. If follower_count was > 50,000 → create MEDIUM priority alert
6. Update playlist_events table
7. Update current_playlists array in current_metrics cache
```

**Canonical Schema:**

```typescript
interface PlaylistEvent {
  id: string;
  artist_id: string;
  playlist_name: string;
  playlist_id: string;              // platform-specific ID
  platform: string;                 // "spotify" | "apple_music" | "deezer" | etc
  follower_count: number;
  event_type: "added" | "removed";
  event_date: Date;
  track_name: string;               // which track was added/removed
  playlist_type: "editorial" | "algorithmic" | "user" | "unknown";
  created_at: Date;
}
```

---

### DP-4: Financial Data Sync

**Trigger:** n8n scheduled workflow, every Monday at 8:00 AM UTC
**Environment:** n8n Cloud
**Why n8n:** Touches DistroKid CSV (if auto-forwarded via email), normalizer, DB, and optional summary email. Multi-step orchestration.

**Data Flow (n8n workflow: `Music — Weekly Revenue Sync`):**

```
Node 1: Schedule Trigger (weekly Monday 08:00 UTC)
Node 2: Check Email (IMAP) for DistroKid stats email attachments
  → IF attachment found:
    Node 3a: Download CSV attachment
    Node 3b: Parse CSV (Reporting Date, Store, Artist, Title, ISRC, Quantity, Revenue)
    Node 3c: Normalize store names to canonical platform names
    Node 3d: Write to revenue_entries table via Supabase/Postgres
    Node 3e: Aggregate: total revenue this period, revenue by platform, by track
    Node 3f: Compare to previous period (detect +/-20% changes)
    Node 3g: Update current_metrics cache via API call
  → IF no attachment:
    Node 4a: Use Songstats estimated revenue (blended rate * streams)
    Node 4b: Write estimate to revenue_entries with source="estimate"
Node 5: Check for revenue milestones ($5K, $10K, $25K, $50K, $100K lifetime)
Node 6: If milestone crossed → trigger milestone alert
```

**Canonical Schema:**

```typescript
interface RevenueEntry {
  id: string;
  artist_id: string;
  period_start: Date;
  period_end: Date;
  platform: string;                  // "spotify" | "apple_music" | "youtube" | etc
  track_name: string;
  isrc: string | null;
  stream_count: number;
  revenue_amount: number;            // USD
  per_stream_rate: number;           // calculated
  currency: string;                  // always normalize to USD
  source: "distrokid" | "estimate";  // real vs estimated
  created_at: Date;
}
```

**Fallback:** If no DistroKid CSV is available, the workflow falls back to estimation using the blended rate from `revenue.ts` ($0.00488/stream). This ensures the revenue page always has data, with a clear "Estimated" badge when actual data is missing.

---

### DP-5: Score Recalculation

**Trigger:** Vercel Cron, every day at 9:00 AM UTC (after DP-1, DP-2, DP-3 complete)
**Environment:** Next.js API route (`/api/cron/recalculate-scores`)
**Sources:** Internal database only (no external API calls)

**Data Flow:**

```
1. Read latest streaming_snapshots, social_snapshots, playlist_events from DB
2. Compute all 7 scoring models (per scoring-models-spec.md):
   a. Career Momentum Score
   b. Song Health Score (per track)
   c. Sync Readiness Score (per track)
   d. Audience Quality Score
   e. Release Timing Recommendation
   f. Benchmark Percentiles
   g. Catalog Economics (LTV, concentration, diversification)
3. Write results to score_history table (append)
4. Update current_scores cache
5. Compare today's scores to yesterday's:
   a. Career Momentum change > 5 points → alert
   b. Any Song Health tier change (Rising → Declining) → alert
   c. Benchmark percentile jump across quartile boundary → alert
6. Write any triggered alerts to pending_alerts table
```

**Canonical Schema:**

```typescript
interface ScoreSnapshot {
  id: string;
  snapshot_date: Date;
  artist_id: string;

  // Artist-level scores
  career_momentum: number;
  career_momentum_subscores: Record<string, number>;  // 6 sub-scores
  audience_quality: number;
  audience_quality_subscores: Record<string, number>;  // 6 sub-scores
  benchmark_percentiles: Record<string, number>;       // per metric

  // Track-level scores (JSONB)
  song_health: Record<string, { score: number; tier: string }>;
  sync_readiness: Record<string, { score: number; tier: string }>;

  // Catalog-level
  catalog_annual_revenue: number;
  catalog_5yr_ltv: number;
  catalog_hhi: number;
  catalog_diversification: number;

  // Release timing
  next_release_window: string;
  release_confidence: number;

  created_at: Date;
}
```

---

### DP-6: New Release Detection

**Trigger:** Vercel Cron, every 6 hours
**Environment:** Next.js API route (`/api/cron/release-check`)
**Sources:** Spotify Web API

**Data Flow:**

```
1. Fetch Spotify /v1/artists/{jakke_id}/albums?include_groups=single,album&limit=5
2. Fetch Spotify /v1/artists/{enjune_id}/albums?include_groups=single,album&limit=5
3. Compare release IDs to stored catalog
4. If new release found:
   a. Fetch full track metadata from Spotify /v1/tracks/{id}
   b. Fetch audio features from Spotify /v1/audio-features/{id}
   c. Write to catalog table
   d. Create "New Release Detected" alert
   e. Trigger full score recalculation (DP-5) out of band
   f. If Chartmetric is integrated: fetch initial playlist tracking
```

---

### DP-7: Chartmetric Deep Sync (Phase 3)

**Trigger:** Vercel Cron, daily at 10:00 AM UTC
**Environment:** Next.js API route (`/api/cron/chartmetric-sync`)
**Sources:** Chartmetric API ($160/mo)
**Dependencies:** Phase 3 implementation

**Data Flow:**

```
1. Refresh Chartmetric bearer token if expired (7-day lifetime)
2. Fetch /artist/{id}/stat/spotify — time-series Spotify data
3. Fetch /artist/{id}/stat/applemusic — Apple Music data (NEW)
4. Fetch /artist/{id}/stat/youtube — YouTube data
5. Fetch /artist/{id}/stat/shazam — Shazam discovery data (NEW)
6. Fetch /artist/{id}/stat/tiktok — TikTok sound usage (NEW)
7. Fetch /artist/{id}/spotify-playlist-history — complete playlist history
8. Fetch /artist/{id}/charts — chart positions
9. Fetch /artist/{id}/related-artists — competitive landscape
10. Write all to platform-specific time-series tables
11. Evaluate alert thresholds:
    - Shazam spike >300% in 24hrs → possible sync placement alert
    - TikTok sound usage >200% in 24hrs → viral detection alert
    - New chart entry → chart alert
12. Feed data into enhanced scoring models (replaces estimates with real data)
```

**Rate Limit Budget:** Chartmetric Pro allows 5,000 req/day. This workflow uses ~12 calls/artist x 2 artists = 24 calls. Plenty of headroom.

---

### DP-8: Competitor & Market Intelligence (Phase 3)

**Trigger:** Vercel Cron, weekly on Sundays at 10:00 AM UTC
**Environment:** Next.js API route (`/api/cron/competitor-sync`)
**Sources:** Chartmetric API, Spotify Web API

**Data Flow:**

```
1. Fetch Spotify /v1/artists/{id}/related-artists for both Jakke and Enjune
2. For top 10 related artists:
   a. Fetch Chartmetric /artist/{id}/stat/spotify — monthly listeners, popularity
   b. Store competitor_snapshots
3. Fetch Chartmetric genre-level trends for "Organic House", "Melodic House"
4. Detect notable competitor events:
   a. Competitor released new music this week
   b. Competitor gained >50% more playlists this week
   c. Competitor crossed a milestone (100K listeners, etc.)
5. Write competitor_events to database
6. Generate competitive intelligence insight for weekly brief
```

---

## 3. Alert Workflows

### Alert Architecture

Alerts follow a two-phase pattern: **evaluation** (detecting the condition) and **delivery** (notifying the artist).

```
EVALUATION (runs in Vercel Cron, after each data pipeline)
  → writes alert to pending_alerts table with priority + payload

DELIVERY (runs in n8n, polls pending_alerts every 30 minutes)
  → reads undelivered alerts
  → batches by priority
  → sends via email / push / in-app
  → marks as delivered
```

This separation means evaluation can happen quickly in the API routes (sub-second), while delivery can use n8n's SMTP, retry logic, and template rendering.

### Alert Priority Levels

| Priority | Delivery Speed | Channel | Examples |
|----------|---------------|---------|----------|
| URGENT | Within 30 min | Email + push + in-app | Viral spike, major playlist add (>50K), Shazam surge |
| HIGH | Within 2 hours | Email + in-app | Playlist add (>10K), score jump >10 points, revenue milestone |
| MEDIUM | Next daily digest | In-app + optional email | Press mention, follower milestone, competitor event |
| LOW | Weekly brief only | In-app | Minor playlist changes, small score fluctuations |

### Alert Rule Definitions

---

#### AL-1: Viral Detection

**Trigger Conditions (any one):**
- Spotify popularity score jumps >5 points in 24 hours
- Stream velocity doubles vs 7-day rolling average
- TikTok sound usage increases >200% in 24 hours (Phase 3)
- Shazam count increases >300% in 24 hours (Phase 3)

**Priority:** URGENT

**Payload:**

```typescript
interface ViralAlert {
  type: "viral_detection";
  track_name: string;
  signal: "popularity_spike" | "stream_velocity" | "tiktok_trend" | "shazam_surge";
  previous_value: number;
  current_value: number;
  change_percentage: number;
  detected_at: Date;
}
```

**Copy Template (from voice guide, Breakout Alert 2.2 Variation B):**

> **Something's happening with {track_name}.**
> {change_percentage}% {signal_description} in the last 24 hours. {context_sentence}. That's organic pull. Feed it.

**Suggested Actions (auto-generated):**
1. Post about it on Instagram within 24 hours
2. Submit to editorial playlists if not already submitted
3. Check which playlists are driving the spike
4. Consider paid promotion to amplify the organic momentum

---

#### AL-2: Playlist Addition

**Trigger Conditions:**
- Track added to any playlist with >10,000 followers

**Priority:**
- >50,000 followers: URGENT
- >10,000 followers: HIGH
- <10,000 followers: LOW (in-app only, no email)

**Payload:**

```typescript
interface PlaylistAlert {
  type: "playlist_addition";
  track_name: string;
  playlist_name: string;
  playlist_followers: number;
  playlist_type: "editorial" | "algorithmic" | "user" | "unknown";
  platform: string;
  detected_at: Date;
}
```

**Copy Template (from voice guide, Playlist Addition 2.7 Variation A):**

> **New playlist: {playlist_name} ({follower_count_formatted} followers).**
> {track_name} just got added. That's {reach_description} new potential listeners. The playlist's vibe ({playlist_type}) lines up with your catalog -- could lead to more adds from the same curator network.

---

#### AL-3: Playlist Removal

**Trigger Conditions:**
- Track removed from playlist with >50,000 followers

**Priority:** MEDIUM

**Copy Template (from voice guide, Playlist Removal 2.7 Variation A):**

> **{track_name} was removed from {playlist_name}.**
> Lost access to {follower_count_formatted} potential listeners. Normal rotation -- playlists cycle tracks. The streams you gained during placement are permanent. Focus on pitching the next one.

---

#### AL-4: Revenue Milestone

**Trigger Conditions:**
- Lifetime estimated revenue crosses: $1K, $2.5K, $5K, $10K, $25K, $50K, $100K
- Single-track revenue crosses: $500, $1K, $2.5K, $5K

**Priority:** HIGH

**Copy Template (from voice guide, Revenue Milestone 2.6 Variation A):**

> **You just crossed ${milestone_formatted} in estimated revenue.**
> {total_streams_formatted} streams at a ${blended_rate} blended rate. Not life-changing money yet, but it's proof the catalog works while you sleep. Every new release adds another revenue layer.

---

#### AL-5: Score Change Alert

**Trigger Conditions:**
- Career Momentum Score changes >5 points in a single day
- Career Momentum Score crosses a tier boundary (Breaking Out / Building / Coasting / Stalling)
- Song Health tier change for any track in top 5 by streams

**Priority:**
- Tier boundary crossed: HIGH
- >5 point change: MEDIUM

**Copy Template (score increase):**

> **Your momentum score jumped from {old_score} to {new_score}.**
> {primary_driver_explanation}. The data is showing {trend_description}. This is the kind of movement that compounds if you keep feeding it.

**Copy Template (score decrease):**

> **Heads up -- your momentum score dipped from {old_score} to {new_score}.**
> Main driver: {primary_driver_explanation}. {context_sentence}. {one_action_to_take}.

---

#### AL-6: Competitor Alert (Phase 3)

**Trigger Conditions:**
- Similar artist releases new music
- Similar artist gains a major playlist placement (>100K followers)
- Similar artist crosses a milestone (100K, 500K, 1M monthly listeners)

**Priority:** MEDIUM

**Copy Template (from voice guide, Competitive Intelligence 2.10 Variation B):**

> **{similar_artist} just hit {milestone}.**
> They're in a similar lane with comparable catalog size. What's different: {differentiator}. Not a blueprint to copy, but the {observation} is worth noting.

---

#### AL-7: Declining Track Warning

**Trigger Conditions:**
- Song Health score drops below 20 (Dormant tier) for a track that was previously >45 (Stable+)
- Popularity score drops >10 points in 7 days

**Priority:** MEDIUM

**Copy Template (from voice guide, Declining Track 2.2 Variation A):**

> **{track_name} is cooling off.**
> Popularity dropped from {old_score} to {new_score} over the last {period}. {playlist_context}. Normal lifecycle -- but if you want to extend the run, a remix, a live version, or a visual piece can reset momentum.

---

#### AL-8: Follower / Stream Milestone

**Trigger Conditions:**
- Cross-platform streams cross round numbers: 5M, 10M, 25M, 50M, 100M
- Spotify monthly listeners cross: 50K, 100K, 250K, 500K, 1M
- Instagram followers cross: 25K, 50K, 100K
- Any platform followers cross round-number thresholds

**Priority:** LOW (weekly brief) unless milestone is significant (50K+ listeners → HIGH)

**Copy Template (from voice guide, Growth Milestone 2.11 Variation A):**

> **{metric_name} just passed {milestone_formatted}.**
> That took {time_period}. The last {previous_milestone} took {previous_time}. The pace is accelerating -- each release compounds on the catalog behind it.

---

#### AL-9: Token Expiry Warning

**Trigger Conditions:**
- Any OAuth token expires within 7 days
- Instagram long-lived token expires within 14 days (requires user action)
- Chartmetric bearer token expires within 2 days

**Priority:** HIGH (system alert, not artist-facing)

**Copy (internal notification):**

> **Action required: {platform} token expires in {days_remaining} days.**
> The {platform} connection will stop working on {expiry_date}. Refresh the token in Settings to keep data flowing.

**In-app UI:** Show a banner on the dashboard and Settings page.

---

#### AL-10: Data Freshness Alert

**Trigger Conditions:**
- No streaming data for >36 hours (expected: daily)
- No social data for >36 hours
- No playlist data for >24 hours (expected: every 6 hours)

**Priority:** HIGH (system alert)

**Copy (internal notification):**

> **Data gap detected: no {data_type} data since {last_timestamp}.**
> The {source} pipeline may have failed. Check the workflow logs.

---

### Alert Delivery Workflow (n8n)

**n8n Workflow: `Music — Alert Delivery Engine`**
**Trigger:** Schedule (every 30 minutes)

```
Node 1: Schedule Trigger (every 30 min)
Node 2: HTTP Request → GET /api/alerts/pending
  → Returns pending alerts sorted by priority DESC, created_at ASC
Node 3: IF — any URGENT alerts?
  YES →
    Node 4a: Loop over URGENT alerts
    Node 4b: Build email from copy template + alert payload
    Node 4c: Send Email (SMTP) to jake@radanimal.co
    Node 4d: HTTP Request → PATCH /api/alerts/{id} (mark delivered)
  NO → continue
Node 5: IF — any HIGH alerts not yet batched today?
  YES →
    Node 5a: Batch HIGH alerts into single digest email
    Node 5b: Build digest email using voice guide tone
    Node 5c: Send Email (SMTP)
    Node 5d: Mark all as delivered
  NO → continue
Node 6: Write all alerts to in_app_alerts table (for dashboard feed)
Node 7: Mark remaining (MEDIUM, LOW) as "in_app_delivered"
```

---

## 4. Scheduled Report Workflows

### SR-1: Weekly Career Brief

**Trigger:** n8n scheduled workflow, every Monday at 8:00 AM PT (16:00 UTC)
**Environment:** n8n Cloud
**Why n8n:** Multi-step: data aggregation, AI summary generation, email composition, delivery.

**n8n Workflow: `Music — Weekly Career Brief`**

```
Node 1: Schedule Trigger (Monday 16:00 UTC)

Node 2: HTTP Request → GET /api/reports/weekly-data
  Returns: {
    streaming: { this_week, last_week, delta_pct },
    social: { ig_engagement, ig_followers, yt_subs },
    playlists: { active_count, added, removed, notable_adds },
    revenue: { weekly_estimate, lifetime_total },
    scores: { career_momentum, change, top_song_health },
    alerts: [ ...this week's notable alerts ],
    top_tracks: [ ...top 5 performing tracks this week ]
  }

Node 3: Claude AI (Anthropic API) — Generate brief copy
  System prompt: [Voice guide principles — musician-first, warm confidence,
    studio frame of reference, short declarative, honest about scale]
  User prompt: |
    Write a weekly career brief for an indie electronic music artist.
    Use this exact structure:
    1. HEADLINE + LEAD (1-2 sentences, the most important thing this week)
    2. BY THE NUMBERS (4-6 metrics as a table with week-over-week delta)
    3. WHAT MOVED (2-3 bullet points on notable changes)
    4. ONE THING TO DO THIS WEEK (single highest-leverage action)
    5. LOOKING AHEAD (1-2 sentences on what to watch)

    Keep it under 500 words. Tone: like a sharp, music-obsessed friend
    talking at 1am with a laptop open. No buzzwords, no hype.

    Here is this week's data:
    {weekly_data_json}

Node 4: Build HTML email from Claude response
  → Use email template with Music Command Center branding
  → Include "View Full Dashboard" CTA button

Node 5: Send Email (SMTP)
  From: noreply@musiccommandcenter.com (or configured sender)
  To: jake@radanimal.co
  Subject: "Your week in music — {date_range}"

Node 6: HTTP Request → POST /api/reports/log
  → Log that weekly brief was sent, store the generated copy
```

**Brief Variation Logic (from voice guide Section 4):**

The Claude prompt should include a classification hint based on the data:

| Condition | Brief Type | Lead Approach |
|-----------|-----------|---------------|
| Any track popularity up >5 or major playlist add | Release/Breakout week | Lead with the movement |
| Stream/listener milestone crossed | Milestone week | Lead with the milestone |
| All deltas within +/-5% | Quiet week | "The foundation held" frame |
| Multiple metrics down >5% | Declining week | Lead honestly, follow with context |

---

### SR-2: Monthly Revenue Report

**Trigger:** n8n scheduled workflow, 1st of each month at 10:00 AM PT
**Environment:** n8n Cloud

**n8n Workflow: `Music — Monthly Revenue Report`**

```
Node 1: Schedule Trigger (1st of month, 18:00 UTC)

Node 2: HTTP Request → GET /api/reports/monthly-revenue
  Returns: {
    month: "February 2026",
    total_revenue: number,
    revenue_by_platform: { spotify: n, apple: n, youtube: n, ... },
    revenue_by_track: [ { track, revenue, streams, per_stream_rate } ],
    top_earner: { track, revenue },
    vs_last_month: { total_delta_pct, platform_shifts },
    lifetime_total: number,
    catalog_valuation: { annual, 5yr, 10yr, multiplier, sale_value },
    source: "actual" | "estimated"
  }

Node 3: Claude AI — Generate revenue narrative
  Prompt: Write a monthly revenue summary. Include platform breakdown,
  top-earning tracks, and a one-sentence outlook. Mention if data is
  estimated vs actual. Use the voice of the Music Command Center:
  grounded, specific, musician-first.

Node 4: Build HTML email with charts (inline images or CSS-styled tables)

Node 5: Send Email (SMTP)
  Subject: "Revenue report — {month_name} {year}"

Node 6: Log report delivery
```

---

### SR-3: Quarterly Catalog Health Check

**Trigger:** n8n scheduled workflow, 1st of Jan/Apr/Jul/Oct at 10:00 AM PT
**Environment:** n8n Cloud

**n8n Workflow: `Music — Quarterly Catalog Health`**

```
Node 1: Schedule Trigger (quarterly)

Node 2: HTTP Request → GET /api/reports/catalog-health
  Returns: {
    total_tracks: number,
    tracks_by_tier: { rising: n, stable: n, declining: n, dormant: n },
    appreciating_tracks: [ ... ],
    depreciating_tracks: [ ... ],
    sync_candidates: [ ...top 5 by sync readiness score ],
    concentration_risk: { hhi, top_song_share, risk_level },
    catalog_valuation_trend: [ ...last 4 quarters ],
    recommendations: [
      "Consider pitching {track} for sync — high readiness score",
      "Refresh {track} with remix or visual — it's slipping",
      "{track} is your hidden gem — 3x above expected streams for its age"
    ]
  }

Node 3: Claude AI — Generate catalog narrative
  Focus on: which songs are rising, which need attention, sync opportunities,
  catalog diversification, and strategic recommendations.

Node 4: Build HTML email with catalog heatmap (tracks colored by health tier)

Node 5: Send Email (SMTP)
  Subject: "Catalog health check — Q{quarter} {year}"

Node 6: Log report delivery
```

---

## 5. Integration Workflows

### IW-1: Artist Connects New Platform (OAuth Flow)

**Environment:** Next.js (user-triggered from Settings page)
**Platforms:** Spotify, Instagram, YouTube, TikTok (future)

**Flow:**

```
1. User clicks "Connect {Platform}" in Settings page
2. Frontend redirects to /api/auth/{platform}/authorize
3. API route generates OAuth URL with proper scopes + state parameter
4. User authorizes on platform
5. Platform redirects to /api/auth/{platform}/callback
6. Callback handler:
   a. Exchange auth code for access token + refresh token
   b. Validate token by making a test API call
   c. Store tokens encrypted in database (artist_connections table)
   d. Trigger initial data pull:
      - Queue immediate run of relevant data pipeline (DP-1/DP-2/DP-3)
      - If platform has history API: trigger backfill job
   e. Return success to frontend with redirect to Settings page
7. Frontend shows "Connected" status with last sync time
```

**Backfill Logic:**

| Platform | Backfill Available | Data Range | Method |
|----------|-------------------|------------|--------|
| Spotify | Yes (catalog endpoints) | All-time | Fetch full discography + audio features |
| Instagram | Partial (30-day insights only) | 30 days | Fetch insights for last 30 days |
| YouTube | Yes (Analytics API) | Up to 2 years | Fetch daily reports in monthly chunks |
| Chartmetric | Yes (historical stats) | Full history | Fetch daily stats going back to artist registration |
| Songstats | Yes (historic endpoint) | Full history | Fetch /artists/{id}/historic |

**Backfill Workflow (Vercel background function or n8n):**

```
For Songstats backfill:
1. Fetch /artists/{id}/historic?from=2020-01-01
2. Parse daily snapshots
3. Batch insert into streaming_snapshots table (1 row per day)
4. Recalculate all scoring models with full history
5. Mark backfill as complete

For Spotify catalog backfill:
1. Fetch /v1/artists/{id}/albums?include_groups=album,single,compilation
2. For each album: fetch /v1/albums/{id}/tracks
3. For each track: fetch /v1/audio-features/{id}
4. Populate catalog table with full metadata
5. Compute Sync Readiness with real audio features
```

---

### IW-2: Artist Adds New Song (Auto-Detection)

**Trigger:** DP-6 (New Release Detection) detects a new release
**Environment:** Mix — detection in Vercel Cron, enrichment chain in Next.js API route

**Flow:**

```
1. DP-6 detects new Spotify album/single not in catalog
2. Fetch Spotify /v1/tracks/{id} — metadata (name, artists, ISRC, duration, explicit, markets)
3. Fetch Spotify /v1/audio-features/{id} — BPM, key, energy, valence, danceability, instrumentalness
4. Search MusicBrainz by ISRC — canonical metadata, ISWC if available
5. Create catalog entry:
   {
     title, artist, collaborators, genre (from Spotify),
     release_date, duration_ms, explicit, isrc, iswc,
     bpm, key, energy, valence, danceability, instrumentalness,
     spotify_id, spotify_uri, apple_music_id (if Chartmetric available)
   }
6. Compute initial Song Health Score (will be low — no stream history yet)
7. Compute Sync Readiness Score (has all audio features from step 3)
8. Create "New Release Added" in-app notification
9. If Chartmetric: register track for playlist tracking
10. If this is the first release in >90 days: update CatalogFreshness sub-score
```

---

### IW-3: DistroKid CSV Import (Manual)

**Environment:** Next.js API route (user-triggered)
**Trigger:** User uploads CSV file from Settings or Revenue page

**Flow:**

```
1. User drags CSV file onto upload zone in Revenue page
2. Frontend POSTs to /api/import/distrokid with multipart form data
3. API route:
   a. Validate file type (CSV) and size (<10MB)
   b. Parse CSV headers: Reporting Date, Sale Period, Store, Artist, Title,
      ISRC, UPC, Quantity, Per-Unit, Currency, Revenue
   c. Validate column presence
   d. For each row:
      - Normalize store name ("Spotify" → "spotify", "Apple Music" → "apple_music")
      - Convert currency to USD if needed
      - Match ISRC to catalog entry
      - Calculate per_stream_rate = Revenue / Quantity
   e. Batch insert into revenue_entries table with source="distrokid"
   f. Delete any existing "estimate" entries for the same period (real data replaces estimates)
   g. Recalculate Catalog Economics scores
   h. Return summary: { rows_imported, total_revenue, platforms_found, date_range }
4. Frontend shows import results with "Imported" confirmation
```

---

### IW-4: Sync Opportunity Match (Phase 3+)

**Environment:** n8n Cloud (requires multiple external checks)
**Trigger:** Weekly or when notified by sync platform

**n8n Workflow: `Music — Sync Opportunity Matcher`**

```
Node 1: Schedule Trigger (weekly) OR Webhook (from sync platform notification)

Node 2: Fetch current catalog with Sync Readiness scores
  → HTTP Request → GET /api/catalog?min_sync_score=55

Node 3: For each track with score >= 55:
  a. Check Songtradr for matching briefs (if API available)
  b. Check internal "sync briefs" table (manually entered opportunities)
  c. Match by: genre, mood, BPM range, duration, explicit=false

Node 4: For each match:
  a. Generate pitch sheet using voice guide template (Section 6.2)
  b. Include: track metadata, streaming proof, mood tags, suggested placements

Node 5: Batch matches into digest email
  Subject: "Sync opportunities this week — {count} matches for your catalog"

Node 6: Send Email (SMTP) to jake@radanimal.co

Node 7: Log matches to sync_opportunities table
```

---

### IW-5: OAuth Token Refresh

**Trigger:** Vercel Cron, every 6 hours
**Environment:** Next.js API route (`/api/cron/token-refresh`)

**Flow:**

```
1. Query artist_connections table for all active connections
2. For each connection:
   a. Check token expiry
   b. If token expires within the refresh window:
      - Spotify (1hr tokens): always refresh. Call POST /api/token with refresh_token
      - Instagram (60-day tokens): refresh if <14 days remaining.
        Call GET /refresh_access_token?grant_type=ig_refresh_token&access_token={token}
      - Chartmetric (7-day tokens): refresh if <2 days remaining.
        Call POST /api/token with refresh_token
      - YouTube Analytics (1hr tokens): always refresh via Google OAuth
      - TikTok (24hr tokens): refresh if <6 hours remaining
   c. Store new tokens (encrypted) in artist_connections
   d. If refresh fails: create AL-9 token expiry alert
3. Log all refresh results
```

---

## 6. n8n Workflow Inventory

Complete list of n8n workflows for the Music Command Center, separate from the 5 existing Creative Hotline workflows.

| ID | Workflow Name | Trigger | Schedule | Phase |
|----|--------------|---------|----------|-------|
| M-1 | Music — Alert Delivery Engine | Schedule | Every 30 min | Phase 1 |
| M-2 | Music — Weekly Career Brief | Schedule | Monday 16:00 UTC | Phase 1 |
| M-3 | Music — Monthly Revenue Report | Schedule | 1st of month 18:00 UTC | Phase 2 |
| M-4 | Music — Quarterly Catalog Health | Schedule | Quarterly 18:00 UTC | Phase 2 |
| M-5 | Music — Weekly Revenue Sync | Schedule | Monday 08:00 UTC | Phase 2 |
| M-6 | Music — Sync Opportunity Matcher | Schedule + Webhook | Weekly | Phase 3 |

### M-1: Alert Delivery Engine (Node-by-Node)

```
[Schedule Trigger: */30 * * * *]
  ↓
[HTTP Request: GET /api/alerts/pending]
  → Method: GET
  → URL: {{$env.APP_URL}}/api/alerts/pending
  → Authentication: Header (x-api-key: {{$env.INTERNAL_API_KEY}})
  → Response: JSON array of pending alerts
  ↓
[IF: Has URGENT alerts]
  → Condition: {{ $json.alerts.filter(a => a.priority === 'URGENT').length > 0 }}
  ↓ TRUE
  [Split In Batches: URGENT alerts]
    ↓
    [Function: Build Email]
      → Map alert type to copy template
      → Interpolate variables from alert payload
      → Apply voice guide rules (no buzzwords, no exclamation marks)
    ↓
    [Send Email (SMTP)]
      → From: notifications@musiccommandcenter.com
      → To: jake@radanimal.co
      → Subject: "{{ $json.alert_subject }}"
      → HTML: {{ $json.alert_html }}
      → SMTP Credential: (configured)
    ↓
    [HTTP Request: PATCH /api/alerts/{id}]
      → Mark as delivered
  ↓ FALSE (no URGENT)
  continue
  ↓
[IF: Has HIGH alerts from today, not yet delivered]
  ↓ TRUE
  [Function: Batch HIGH alerts into digest]
    → Group by type
    → Build sections per alert type
    → Add "View Dashboard" CTA
  ↓
  [Send Email (SMTP)]
    → Subject: "Music update — {count} things to know"
  ↓
  [HTTP Request: PATCH /api/alerts/batch-deliver]
  ↓ FALSE
  continue
  ↓
[HTTP Request: POST /api/alerts/mark-in-app]
  → Mark all MEDIUM/LOW alerts as in_app_delivered
```

### M-2: Weekly Career Brief (Node-by-Node)

```
[Schedule Trigger: Monday 16:00 UTC]
  ↓
[HTTP Request: GET /api/reports/weekly-data]
  → Returns aggregated weekly metrics
  ↓
[Function: Classify Week Type]
  → if any track_popularity_delta > 5 → "breakout"
  → if any milestone_crossed → "milestone"
  → if all deltas within +/-5% → "quiet"
  → if multiple metrics down >5% → "declining"
  → Set $json.week_type and $json.lead_hint
  ↓
[Anthropic (Claude) Node]
  → Model: claude-sonnet-4-5-20250929
  → System Prompt: |
      You write weekly career briefs for an indie electronic music artist.
      Voice: like the artist's own intelligence — sharp, music-obsessed,
      grounded. No buzzwords. No hype. Specific numbers over generalizations.
      Music language, not marketing language.

      Structure (exactly 5 sections):
      1. HEADLINE + LEAD (1-2 sentences)
      2. BY THE NUMBERS (4-6 metrics, table format, with delta)
      3. WHAT MOVED (2-3 bullets)
      4. ONE THING TO DO THIS WEEK (specific, achievable, tied to a number)
      5. LOOKING AHEAD (1-2 sentences)

      Keep under 500 words. This is a {{ $json.week_type }} week.
  → User Prompt: {{ JSON.stringify($json.weekly_data) }}
  ↓
[Function: Build HTML Email]
  → Wrap Claude output in branded HTML template
  → Add "View Full Dashboard" button
  → Add "Manage Preferences" footer link
  ↓
[Send Email (SMTP)]
  → From: brief@musiccommandcenter.com
  → To: jake@radanimal.co
  → Subject: "Your week in music — {{ $json.date_range }}"
  ↓
[HTTP Request: POST /api/reports/log]
  → Store generated brief text for in-app viewing
  → Store metadata: week_type, date_range, delivery_status
```

---

## 7. In-App Automation Inventory

These run as Vercel Cron jobs calling Next.js API routes.

### Vercel Cron Configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/streaming-pull",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/social-pull",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/playlist-sync",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/recalculate-scores",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/release-check",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/token-refresh",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/chartmetric-sync",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/competitor-sync",
      "schedule": "0 10 * * 0"
    }
  ]
}
```

### API Route Structure

```
src/app/api/
├── cron/
│   ├── streaming-pull/route.ts       # DP-1
│   ├── social-pull/route.ts          # DP-2
│   ├── playlist-sync/route.ts        # DP-3
│   ├── recalculate-scores/route.ts   # DP-5
│   ├── release-check/route.ts        # DP-6
│   ├── token-refresh/route.ts        # IW-5
│   ├── chartmetric-sync/route.ts     # DP-7 (Phase 3)
│   └── competitor-sync/route.ts      # DP-8 (Phase 3)
├── alerts/
│   ├── pending/route.ts              # GET — for n8n to poll
│   ├── [id]/route.ts                 # PATCH — mark delivered
│   ├── batch-deliver/route.ts        # PATCH — batch mark
│   └── mark-in-app/route.ts         # POST — mark in-app delivered
├── reports/
│   ├── weekly-data/route.ts          # GET — aggregated weekly data for brief
│   ├── monthly-revenue/route.ts      # GET — monthly revenue aggregation
│   ├── catalog-health/route.ts       # GET — quarterly catalog report data
│   └── log/route.ts                  # POST — log report delivery
├── auth/
│   ├── [platform]/
│   │   ├── authorize/route.ts        # GET — redirect to OAuth
│   │   └── callback/route.ts         # GET — OAuth callback
│   └── refresh/route.ts              # POST — manual token refresh
├── import/
│   └── distrokid/route.ts            # POST — CSV upload handler
├── catalog/
│   └── route.ts                      # GET — catalog with scores
└── sync/
    └── route.ts                      # POST — trigger manual data refresh
```

### Cron Route Security

All `/api/cron/*` routes must verify the request comes from Vercel Cron:

```typescript
// src/lib/cron-auth.ts
export function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}
```

All `/api/alerts/*` routes called by n8n must verify the internal API key:

```typescript
export function verifyInternalRequest(request: Request): boolean {
  const apiKey = request.headers.get("x-api-key");
  return apiKey === process.env.INTERNAL_API_KEY;
}
```

---

## 8. Error Handling & Retry Strategy

### Retry Tiers

| Error Type | Retry Strategy | Max Retries | Backoff |
|-----------|----------------|-------------|---------|
| Rate limit (429) | Respect Retry-After header, then retry | 3 | Header-specified or exponential (1s, 4s, 16s) |
| Server error (5xx) | Exponential backoff | 3 | 2s, 8s, 32s |
| Network timeout | Immediate retry, then backoff | 2 | 0s, 5s |
| Auth error (401/403) | Refresh token, then retry once | 1 | Immediate after refresh |
| Client error (4xx, not 401/429) | No retry (log error) | 0 | N/A |

### Error Handling by Environment

**Vercel Cron API Routes:**

```typescript
// Wrapper for all cron handlers
export async function withCronErrorHandling(
  handler: () => Promise<Response>,
  pipelineName: string
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    // Log to pipeline_errors table
    await logPipelineError(pipelineName, error);

    // If this pipeline has failed 3+ times consecutively:
    // → Create AL-10 data freshness alert
    const consecutiveFailures = await getConsecutiveFailures(pipelineName);
    if (consecutiveFailures >= 3) {
      await createAlert({
        type: "data_freshness",
        priority: "HIGH",
        payload: {
          pipeline: pipelineName,
          consecutive_failures: consecutiveFailures,
          last_error: error.message,
        },
      });
    }

    // Still return 200 to Vercel Cron (avoid re-triggering)
    return Response.json({ error: error.message, pipeline: pipelineName }, { status: 200 });
  }
}
```

**n8n Workflows:**

Every node that makes an external HTTP request must have:
1. **Error handling:** "Continue on Fail" enabled with error output connected to an error-logging branch
2. **Retry:** Built-in n8n retry (3 attempts with exponential backoff)
3. **Timeout:** 30-second request timeout per node

```
[HTTP Request Node]
  → Settings:
    - Retry On Fail: true
    - Max Retries: 3
    - Wait Between Retries: 2000ms (doubles each time)
    - Timeout: 30000ms
  → On Error: Continue (route to error handler branch)

[Error Handler Branch]
  → [Function: Log Error]
    → Record: workflow name, node name, error message, timestamp
  → [IF: Is critical path?]
    YES → [Send Email: Alert notification team]
    NO → [Set: Skip this step, continue workflow]
```

### Dead Letter Queue

Failed alerts and pipeline runs go to a dead letter queue (table: `failed_jobs`):

```typescript
interface FailedJob {
  id: string;
  job_type: "pipeline" | "alert_delivery" | "report" | "token_refresh";
  job_name: string;
  error_message: string;
  error_stack: string | null;
  payload: Record<string, unknown>;    // original input data
  retry_count: number;
  last_retry_at: Date | null;
  status: "pending_retry" | "exhausted" | "resolved";
  created_at: Date;
}
```

A separate cron job (`/api/cron/retry-failed-jobs`) runs every 2 hours, picks up `pending_retry` jobs with retry_count < 5, and re-executes them. After 5 failures, status moves to `exhausted` and a system alert is created.

---

## 9. Rate Limit Management

### Daily Budget Allocation

| API | Daily Limit | Budget Per Pipeline | Headroom |
|-----|-------------|-------------------|----------|
| Spotify Web API | ~260K/day (180/min) | DP-1: ~10, DP-6: ~15, IW-2: ~5 | Massive headroom |
| Songstats | 144K/day (100/min) | DP-1: ~4, DP-3: ~8 | Massive headroom |
| Instagram Graph API | 4,800/day (200/hr) | DP-2: ~10 | Large headroom |
| YouTube Data API | 10,000 units/day | DP-2: ~5 units | Large headroom |
| Chartmetric | 5,000/day (Pro) | DP-7: ~30, DP-8: ~25 | Comfortable |
| Deezer | 864K/day (50/5s) | Future: ~5 | Massive headroom |
| MusicBrainz | 86.4K/day (1/s) | Future: ~5 | Large headroom |

### Rate Limiter Implementation

```typescript
// src/lib/rate-limiter.ts
interface RateLimitConfig {
  requestsPerWindow: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  spotify: { requestsPerWindow: 170, windowMs: 60_000 },      // 170/min (buffer below 180)
  songstats: { requestsPerWindow: 90, windowMs: 60_000 },     // 90/min (buffer below 100)
  instagram: { requestsPerWindow: 180, windowMs: 3_600_000 }, // 180/hr (buffer below 200)
  youtube: { requestsPerWindow: 9_000, windowMs: 86_400_000 },// 9K/day (buffer below 10K)
  chartmetric: { requestsPerWindow: 4_500, windowMs: 86_400_000 }, // 4.5K/day
  musicbrainz: { requestsPerWindow: 1, windowMs: 1_100 },     // 1 req/1.1s (strict)
  deezer: { requestsPerWindow: 45, windowMs: 5_000 },         // 45/5s (buffer below 50)
};

// Use a token bucket stored in Redis (Vercel KV) or in-memory for single-instance
class RateLimiter {
  async acquire(api: string): Promise<void> {
    const config = RATE_LIMITS[api];
    // Wait if at capacity, proceeed if under limit
    // Implementation: leaky bucket with Redis MULTI/EXEC
  }
}
```

### Spotify Token Cache

Spotify tokens expire every hour. Avoid re-authenticating on every cron run:

```typescript
// src/lib/spotify-auth.ts
// Store token in Vercel KV or database
// Refresh 5 minutes before expiry
async function getSpotifyToken(): Promise<string> {
  const cached = await kv.get<{ token: string; expires_at: number }>("spotify_token");
  if (cached && cached.expires_at > Date.now() + 300_000) {
    return cached.token;
  }
  // Refresh using client credentials flow
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
    }),
  });
  const data = await response.json();
  await kv.set("spotify_token", {
    token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}
```

---

## 10. Data Schema & Storage

### Database Tables Overview

Using PostgreSQL (Supabase or Neon) with Prisma ORM.

```
streaming_snapshots     — Daily streaming metrics (DP-1)
social_snapshots        — Daily social metrics (DP-2)
playlist_events         — Playlist add/remove log (DP-3)
revenue_entries         — Per-platform, per-track revenue (DP-4, IW-3)
score_history           — Daily scoring model outputs (DP-5)
catalog                 — Track metadata + audio features (DP-6, IW-2)
pending_alerts          — Alerts awaiting delivery (Alert Engine)
delivered_alerts        — Alert delivery log
in_app_alerts           — Alerts for dashboard feed
artist_connections      — OAuth tokens (encrypted) per platform (IW-1, IW-5)
competitor_snapshots    — Weekly competitor metrics (DP-8)
competitor_events       — Notable competitor activity
report_log              — History of sent reports (SR-1,2,3)
failed_jobs             — Dead letter queue
pipeline_runs           — Execution log for all cron jobs
current_metrics         — Latest values cache (materialized view or separate table)
```

### Prisma Schema (Key Tables)

```prisma
model StreamingSnapshot {
  id                        String   @id @default(cuid())
  artistId                  String   @map("artist_id")
  snapshotDate              DateTime @map("snapshot_date")
  source                    String

  spotifyMonthlyListeners   Int      @map("spotify_monthly_listeners")
  spotifyFollowers          Int      @map("spotify_followers")
  spotifyPopularity         Int      @map("spotify_popularity")
  spotifyTotalStreams        BigInt   @map("spotify_total_streams")
  crossPlatformTotalStreams  BigInt   @map("cross_platform_total_streams")
  crossPlatformFollowers    Int      @map("cross_platform_total_followers")
  crossPlatformPlaylists    Int      @map("cross_platform_total_playlists")
  crossPlatformPlaylistReach BigInt  @map("cross_platform_playlist_reach")

  trackPopularity           Json     @map("track_popularity")
  trackStreams              Json     @map("track_streams")

  currentPlaylists          Int      @map("current_playlists")
  playlistAdditionsToday    Int      @default(0) @map("playlist_additions_today")
  playlistRemovalsToday     Int      @default(0) @map("playlist_removals_today")

  radioPlays                Int      @map("radio_plays")

  createdAt                 DateTime @default(now()) @map("created_at")

  @@index([artistId, snapshotDate])
  @@map("streaming_snapshots")
}

model PendingAlert {
  id          String   @id @default(cuid())
  type        String                          // "viral_detection", "playlist_addition", etc
  priority    String                          // "URGENT", "HIGH", "MEDIUM", "LOW"
  payload     Json                            // alert-type-specific data
  delivered   Boolean  @default(false)
  deliveredAt DateTime? @map("delivered_at")
  deliveryChannel String? @map("delivery_channel")  // "email", "in_app", "push"
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([delivered, priority, createdAt])
  @@map("pending_alerts")
}

model ArtistConnection {
  id            String   @id @default(cuid())
  artistId      String   @map("artist_id")
  platform      String                        // "spotify", "instagram", "youtube", etc
  accessToken   String   @map("access_token") // encrypted at rest
  refreshToken  String?  @map("refresh_token") // encrypted at rest
  tokenExpiresAt DateTime @map("token_expires_at")
  platformUserId String? @map("platform_user_id")
  scopes        String?                       // space-separated scopes granted
  isActive      Boolean  @default(true) @map("is_active")
  lastSyncAt    DateTime? @map("last_sync_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@unique([artistId, platform])
  @@map("artist_connections")
}

model Catalog {
  id              String   @id @default(cuid())
  artistId        String   @map("artist_id")
  title           String
  collaborators   String?
  genre           String?
  releaseDate     DateTime? @map("release_date")
  durationMs      Int?     @map("duration_ms")
  explicit        Boolean  @default(false)
  isrc            String?
  iswc            String?

  // Spotify IDs
  spotifyId       String?  @map("spotify_id")
  spotifyUri      String?  @map("spotify_uri")

  // Audio features (from Spotify API)
  bpm             Float?
  key             String?
  energy          Float?
  valence         Float?
  danceability    Float?
  instrumentalness Float?
  acousticness    Float?
  liveness        Float?

  // Atmos / quality metadata
  hasStereo       Boolean  @default(true) @map("has_stereo")
  hasAtmos        Boolean  @default(false) @map("has_atmos")

  // Latest scores (denormalized for fast reads)
  songHealthScore Float?   @map("song_health_score")
  songHealthTier  String?  @map("song_health_tier")
  syncReadinessScore Float? @map("sync_readiness_score")
  syncReadinessTier String? @map("sync_readiness_tier")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([artistId])
  @@index([isrc])
  @@map("catalog")
}

model PipelineRun {
  id          String   @id @default(cuid())
  pipeline    String                          // "streaming-pull", "social-pull", etc
  status      String                          // "success", "partial", "failed"
  startedAt   DateTime @map("started_at")
  completedAt DateTime? @map("completed_at")
  durationMs  Int?     @map("duration_ms")
  recordsProcessed Int @default(0) @map("records_processed")
  errorMessage String? @map("error_message")
  metadata    Json?                           // any pipeline-specific context
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([pipeline, createdAt])
  @@map("pipeline_runs")
}
```

### Data Retention Policy

| Table | Retention | Reason |
|-------|-----------|--------|
| streaming_snapshots | Forever | Time-series history is the product's core value |
| social_snapshots | Forever | Same |
| playlist_events | Forever | Playlist history is irreplaceable |
| revenue_entries | Forever | Financial records |
| score_history | 2 years rolling | Scores can be recomputed from snapshots |
| pending_alerts | 90 days after delivery | Audit trail |
| pipeline_runs | 90 days | Debugging |
| failed_jobs | 30 days after resolved | Debugging |
| current_metrics | N/A (always overwritten) | Cache only |

---

## 11. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Replace static CSV files with automated daily data collection. Basic alerts.

| Task | Type | Environment | Effort |
|------|------|-------------|--------|
| Set up PostgreSQL database (Supabase) | Infrastructure | Cloud | 2 hours |
| Create Prisma schema + migrations | Code | Next.js | 3 hours |
| Implement DP-1: Streaming Pull (Songstats + Spotify) | Code | Vercel Cron | 4 hours |
| Implement DP-2: Social Pull (Instagram + YouTube) | Code | Vercel Cron | 4 hours |
| Implement DP-5: Score Recalculation | Code | Vercel Cron | 3 hours |
| Implement DP-6: New Release Detection | Code | Vercel Cron | 2 hours |
| Implement IW-5: Token Refresh | Code | Vercel Cron | 2 hours |
| Build alert evaluation logic (AL-1 through AL-10) | Code | Next.js lib | 4 hours |
| Build n8n M-1: Alert Delivery Engine | n8n | n8n Cloud | 3 hours |
| Build pending_alerts API routes | Code | Next.js | 2 hours |
| Wire dashboard to read from DB instead of CSV | Code | Next.js | 4 hours |

**Total Phase 1 effort:** ~33 hours
**Monthly cost:** $10 (Songstats Pro) + Supabase free tier + Vercel free/Pro

### Phase 2: Reports + Revenue (Week 3-4)

**Goal:** Weekly career briefs, revenue pipeline, playlist intelligence.

| Task | Type | Environment | Effort |
|------|------|-------------|--------|
| Implement DP-3: Playlist Intelligence Sync | Code | Vercel Cron | 3 hours |
| Build n8n M-2: Weekly Career Brief | n8n | n8n Cloud | 4 hours |
| Build n8n M-5: Weekly Revenue Sync | n8n | n8n Cloud | 3 hours |
| Implement IW-3: DistroKid CSV Import | Code | Next.js | 4 hours |
| Build /api/reports/* endpoints | Code | Next.js | 3 hours |
| Build n8n M-3: Monthly Revenue Report | n8n | n8n Cloud | 3 hours |
| Build n8n M-4: Quarterly Catalog Health | n8n | n8n Cloud | 3 hours |
| Build IW-1: OAuth connection flow (Spotify + IG) | Code | Next.js | 6 hours |
| Build Settings page connection UI | Code | Next.js | 3 hours |

**Total Phase 2 effort:** ~32 hours
**Monthly cost:** Same as Phase 1 ($10)

### Phase 3: Intelligence Layer (Week 5-8)

**Goal:** Chartmetric integration, competitive intelligence, TikTok/Shazam alerts.

| Task | Type | Environment | Effort |
|------|------|-------------|--------|
| Implement DP-7: Chartmetric Deep Sync | Code | Vercel Cron | 6 hours |
| Implement DP-8: Competitor Intelligence | Code | Vercel Cron | 4 hours |
| Add Apple Music, Shazam, TikTok data to scoring models | Code | Next.js lib | 4 hours |
| Build n8n M-6: Sync Opportunity Matcher | n8n | n8n Cloud | 4 hours |
| Implement IW-2: New Release Auto-Enrichment (full pipeline) | Code | Next.js | 3 hours |
| Build IW-4: Sync Opportunity Match (requires catalog + scores) | n8n | n8n Cloud | 4 hours |
| Add competitor view to dashboard | Code | Next.js | 4 hours |
| Add backfill logic for historical Songstats/Chartmetric data | Code | Next.js | 4 hours |
| Wire AL-6 competitor alerts | Code | Next.js | 2 hours |

**Total Phase 3 effort:** ~35 hours
**Monthly cost:** +$160 (Chartmetric Pro) = $170/month total

### Phase 4: Polish + Advanced (Week 8-12)

**Goal:** YouTube Analytics, TikTok Creator API, email CRM, press monitoring.

| Task | Type | Environment | Effort |
|------|------|-------------|--------|
| YouTube Analytics OAuth + revenue data | Code | Next.js | 4 hours |
| TikTok Creator API integration | Code | Next.js | 4 hours |
| Press mention monitoring (NewsAPI/Google) | Code | Vercel Cron | 2 hours |
| Email CRM integration (Mailchimp/Kit) | Code | Next.js | 3 hours |
| Dead letter queue + retry system | Code | Next.js | 3 hours |
| Monitoring dashboard (pipeline health) | Code | Next.js | 4 hours |
| Rate limiter with Redis backing | Code | Next.js | 3 hours |
| End-to-end testing of all pipelines | Testing | Local | 4 hours |

**Total Phase 4 effort:** ~27 hours
**Monthly cost:** Same ($170/month)

### Total Implementation Summary

| Phase | Effort | Duration | Monthly Cost |
|-------|--------|----------|-------------|
| Phase 1 | ~33 hours | Week 1-2 | $10 |
| Phase 2 | ~32 hours | Week 3-4 | $10 |
| Phase 3 | ~35 hours | Week 5-8 | $170 |
| Phase 4 | ~27 hours | Week 8-12 | $170 |
| **Total** | **~127 hours** | **~12 weeks** | **$170/month steady state** |

---

## 12. Monitoring & Observability

### Pipeline Health Dashboard

The Settings or System Health page should show:

```
Pipeline Status
─────────────────────────────────────────────
Pipeline              Last Run      Status    Records
──────────────        ──────────    ──────    ─────────
Streaming Pull        6:02 AM UTC   Success   2 snapshots
Social Pull           7:01 AM UTC   Success   1 snapshot
Playlist Sync         6:00 AM UTC   Success   3 events
Score Recalculation   9:03 AM UTC   Success   7 scores
Release Check         6:01 AM UTC   Success   0 new
Token Refresh         6:00 AM UTC   Success   2 refreshed
Chartmetric Sync      10:04 AM UTC  Success   24 records
Competitor Sync       Sun 10:02 AM  Success   10 competitors

Alert Delivery
──────────────
Pending: 0
Delivered today: 3 (1 HIGH, 2 MEDIUM)
Failed: 0

API Rate Limits (24hr usage)
────────────────────────────
Spotify:     32 / 260,000  (0.01%)
Songstats:   12 / 144,000  (0.01%)
Instagram:   10 / 4,800    (0.21%)
YouTube:      5 / 10,000   (0.05%)
Chartmetric: 30 / 5,000    (0.60%)

OAuth Token Status
──────────────────
Spotify:     Valid (refreshes automatically)
Instagram:   Expires in 47 days
YouTube:     Valid (refreshes automatically)
Chartmetric: Expires in 5 days ⚠️
```

### Logging Strategy

| What to Log | Where | Retention |
|-------------|-------|-----------|
| Pipeline run results | `pipeline_runs` table | 90 days |
| Alert creation/delivery | `pending_alerts` + `delivered_alerts` | 90 days |
| API call counts per service | `api_usage_log` table or Vercel analytics | 30 days |
| Token refresh events | `artist_connections` updated_at + log | Persistent |
| Errors and failures | `failed_jobs` table + Vercel logs | 30 days |

### Health Check Endpoint

```typescript
// src/app/api/health/route.ts
// Returns system health for monitoring (Uptime Robot, etc.)

export async function GET() {
  const checks = {
    database: await checkDatabase(),
    last_streaming_pull: await getLastPipelineRun("streaming-pull"),
    last_social_pull: await getLastPipelineRun("social-pull"),
    pending_alerts: await getPendingAlertCount(),
    failed_jobs: await getFailedJobCount(),
    token_status: await getTokenExpiryStatus(),
  };

  const healthy = checks.database
    && checks.last_streaming_pull.age_hours < 36
    && checks.last_social_pull.age_hours < 36
    && checks.failed_jobs < 5;

  return Response.json({
    status: healthy ? "healthy" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503 });
}
```

---

## Appendix A: Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Vercel
CRON_SECRET=...                  # Vercel Cron auth
INTERNAL_API_KEY=...             # n8n ↔ Next.js auth

# Spotify
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...

# Instagram (Meta)
META_APP_ID=...
META_APP_SECRET=...

# YouTube
YOUTUBE_API_KEY=...
GOOGLE_CLIENT_ID=...             # For YouTube Analytics OAuth
GOOGLE_CLIENT_SECRET=...

# Songstats
SONGSTATS_API_KEY=...

# Chartmetric (Phase 3)
CHARTMETRIC_REFRESH_TOKEN=...

# Claude API (for career briefs)
ANTHROPIC_API_KEY=...

# n8n
N8N_WEBHOOK_URL=...              # If n8n needs to call back
N8N_API_KEY=...

# Redis / KV (rate limiter, token cache)
KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...

# Email (n8n SMTP, not needed in Next.js)
# Configured in n8n credentials, not here
```

## Appendix B: Data Flow Timing Diagram

```
UTC   Event                              Depends On
────  ───────────────────────────────    ──────────
0:00  Playlist Sync (DP-3)              —
6:00  Streaming Pull (DP-1)             —
6:00  Playlist Sync (DP-3)              —
6:00  Release Check (DP-6)              —
6:00  Token Refresh (IW-5)              —
7:00  Social Pull (DP-2)                —
8:00  Revenue Sync (DP-4, Monday only)  —
9:00  Score Recalculation (DP-5)        DP-1, DP-2, DP-3
9:30  Alert Evaluation                  DP-5 (scores), all pipelines
10:00 Chartmetric Sync (DP-7)           —
10:00 Competitor Sync (DP-8, Sunday)    —
10:30 Alert Delivery Check (n8n M-1)    Alert Evaluation
12:00 Playlist Sync (DP-3)              —
16:00 Weekly Brief (n8n M-2, Monday)    All morning pipelines
18:00 Playlist Sync (DP-3)              —
18:00 Monthly Report (n8n M-3, 1st)     Full month of data
18:00 Quarterly Health (n8n M-4, Q1)    Full quarter of data
```

The key ordering constraint: **Score Recalculation (DP-5) must run after DP-1, DP-2, and DP-3** so it has fresh data. This is enforced by scheduling DP-5 at 9:00 AM UTC, 3 hours after the data pipelines start. All data pipelines complete in under 60 seconds each, so there is ample margin.

## Appendix C: n8n Cloud Capacity Planning

We currently run 5 Creative Hotline workflows on n8n Cloud. Adding 6 Music Command Center workflows:

| Current (Creative Hotline) | New (Music Command Center) |
|---------------------------|---------------------------|
| WF1: Stripe → Calendly | M-1: Alert Delivery Engine |
| WF2: Calendly → Notion | M-2: Weekly Career Brief |
| WF3: Tally → Claude | M-3: Monthly Revenue Report |
| WF4: Laylo → Notion | M-4: Quarterly Catalog Health |
| Daily Follow-Up Engine | M-5: Weekly Revenue Sync |
| | M-6: Sync Opportunity Matcher |

**Total: 11 workflows.** n8n Cloud's Starter plan supports unlimited workflows. The key constraint is execution count -- Starter allows 2,500 executions/month. Our Music Command Center workflows execute:

- M-1: 48/day (every 30 min) = ~1,440/month
- M-2: 4/month
- M-3: 1/month
- M-4: 1/quarter
- M-5: 4/month
- M-6: 4/month

**Total Music executions: ~1,453/month**
**Total Creative Hotline: ~200/month (estimated)**
**Combined: ~1,653/month** -- fits within 2,500 limit.

If we approach the limit, the Alert Delivery Engine (M-1) can be reduced to every hour (720/month) or moved to a Vercel Cron + API route pattern where the Next.js route handles email sending directly (eliminating the need for n8n polling).

---

*This specification should be re-reviewed when Chartmetric integration begins (Phase 3) and when n8n execution counts approach plan limits. Last verified: 2026-02-26.*
