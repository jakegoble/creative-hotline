# Music Command Center -- App Architecture Spec

> The blueprint for upgrading from a static data dashboard to a living career intelligence platform.
> Covers page structure, component system, data architecture, service clients, scoring model integration,
> design system, and a phased migration plan from static CSV/JSON to live API data.

**Last updated:** 2026-02-26
**Author:** Command Center Engineer (ARCH)
**Status:** Approved for implementation
**App version:** Current v6.0, target v7.0

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Page Map & Navigation](#2-page-map--navigation)
3. [Component Architecture](#3-component-architecture)
4. [Data Architecture](#4-data-architecture)
5. [Service Client System](#5-service-client-system)
6. [Scoring Model Integration](#6-scoring-model-integration)
7. [Copy & Insight System](#7-copy--insight-system)
8. [Design System](#8-design-system)
9. [State Management](#9-state-management)
10. [File Structure](#10-file-structure)
11. [Migration Plan](#11-migration-plan)
12. [Technical Decisions](#12-technical-decisions)

---

## 1. Architecture Overview

### Current State (v6.0)

The existing app is a Next.js 15 + React 19 + TypeScript client-side dashboard with:

- **9 pages:** Dashboard, Streaming, Catalog, Revenue, Instagram, Collaborators, Growth, Cross-Platform, AI Insights
- **28+ charts** using Recharts, all rendering client-side
- **Static data** from 14 CSV/JSON files in `public/data/`
- **4 reusable UI components:** KpiCard, PageHeader, Section, Card
- **4 library modules:** types, constants, data (fetch wrappers), revenue, format
- **Artist switcher:** Jakke/Enjune toggle in sidebar, but data loading is not parameterized (Jakke-only on most pages)
- **No authentication, no API calls, no caching, no server components**

### Problems to Solve

1. **Static data decay.** CSV/JSON files are manual exports that go stale immediately. No mechanism for refresh.
2. **No scoring intelligence.** The AI Insights page is hardcoded insights and a simple composite score. The 7 scoring models from GROWTH are not implemented.
3. **No voice or personality.** Chart titles are generic ("Monthly Listeners Over Time"), insights are terse, and nothing speaks in the voice defined by FRANK.
4. **Monolithic page files.** Each page is 200-400 lines of mixed data loading, computation, and rendering. No separation of concerns.
5. **Duplicated chart patterns.** Every page re-implements tooltip styles, tick styles, color mappings, and layout patterns.
6. **No data normalization.** Revenue estimates use hardcoded platform splits. No way to incorporate real distributor data.
7. **Artist switcher is decorative.** Switching to Enjune changes the sidebar profile but most pages still load Jakke data.
8. **No historical tracking.** No snapshots, no trends, no delta calculations. Every metric is a single point in time.

### Target State (v7.0)

A Next.js 15 application that:

- Serves 16 pages across 5 navigation groups, each backed by computed scoring models
- Uses Server Components for data fetching and Client Components for interactivity
- Pulls from a unified data layer that abstracts static files vs live APIs
- Generates insight copy dynamically using FRANK's template system
- Provides full artist-switcher support (all data parameterized by artist ID)
- Stores periodic snapshots for trend calculations
- Is deployable to Vercel with zero configuration

### Guiding Principles

1. **Data in, decisions out.** Every page should answer a question, not just display a metric.
2. **The catalog is the protagonist.** Songs are the atomic unit. Everything rolls up from individual tracks.
3. **Progressive enhancement.** Static data first, API data layered on top. The app works with zero API keys configured.
4. **Voice everywhere.** No static chart title survives. Every header, subtitle, and insight adapts to what the data shows.
5. **Musician's mental model.** Navigation follows how an artist thinks about their career, not how a data engineer organizes tables.

---

## 2. Page Map & Navigation

### Navigation Structure

Five groups, ordered by the artist's natural workflow: check the big picture, drill into the catalog, understand the audience, get strategic recommendations, then manage the system.

```
COMMAND CENTER
  /                     Dashboard (Career Overview)
  /pulse                Weekly Pulse (Career Brief)

CATALOG & STREAMING
  /catalog              Catalog (Record Collection)
  /catalog/[slug]       Song Detail (Deep Dive)
  /streaming            Streaming Intelligence
  /revenue              Revenue & Economics

AUDIENCE & REACH
  /audience             Audience Intelligence
  /social               Social Analytics (IG + future TikTok)
  /collaborators        Creative Network

STRATEGY
  /momentum             Career Momentum Score
  /sync                 Sync Opportunities
  /release-planner      Release Timing Optimizer
  /benchmarks           Industry Benchmarks

SYSTEM
  /settings             Settings & Connections
  /data-health          Data Health (source status)
```

### Page Descriptions

#### COMMAND CENTER

**Dashboard (`/`)**
The single most important page. Answers: "How is my career doing right now?"

Layout (top to bottom):
1. **Hero insight** -- One sentence generated from the highest-priority scoring model output. Example: "Karma Response is picking up speed. 36K recent streams -- that's 3.6x its lifetime average." Uses FRANK's Breakout Alert template (variation B).
2. **Career Momentum gauge** -- Large circular gauge (0-100) with color coding and one-word label (Breaking Out / Building / Coasting / Stalling). Replaces the current generic "Strategy Score."
3. **KPI strip** -- 4 cards: Cross-Platform Streams (with delta), Monthly Listeners (with delta), Estimated Monthly Revenue (with delta), Audience Quality Score (0-100).
4. **Catalog pulse** -- Horizontal strip of the top 5 tracks by recent activity, each as a small card showing song name, health badge (Rising/Stable/Declining/Dormant), and a 30-day sparkline. Clicking opens the Song Detail page.
5. **Top 3 actions** -- Algorithmically generated from scoring model weaknesses. Each action is a card with a title, one-line rationale, and effort/impact indicator. Pulled from the insight priority logic in the voice guide (time-sensitive > action-required > milestones > patterns > context).
6. **Streaming by platform** -- Donut chart of estimated platform split with revenue annotations.
7. **Quick stats grid** -- 6 compact cells: Active Playlists, Playlist Reach, IG Engagement Rate, Sync-Ready Tracks, Days Since Last Release, Superfan Estimate.

**Weekly Pulse (`/pulse`)**
A narrative page, not a dashboard. Answers: "What happened this week and what should I do about it?"

Renders the Weekly Career Brief format from the voice guide:
1. Headline + lead (auto-generated from highest-signal data change)
2. By the Numbers grid (6 metrics with week-over-week deltas -- requires snapshots)
3. What Moved (2-3 bullet points about notable changes)
4. One Thing to Do This Week (single highest-leverage action from scoring models)
5. Looking Ahead (upcoming windows, seasonality notes)

Falls back to "Your first weekly brief will appear after 7 days of data" if no snapshots exist yet.

#### CATALOG & STREAMING

**Catalog (`/catalog`)**
The "record collection" reimagined. Answers: "What is my catalog and how healthy is it?"

Two view modes:
- **Shelf View (default):** Card grid. Each track gets a card with genre-gradient background, song name, artist, key metrics (streams, popularity, health badge), and release date. Cards are sorted by release date (newest first) with sort toggles for streams, popularity, health score, and genre.
- **Table View:** Full data table with sortable columns: Song, Artist, Genre, Streams, Listeners, Popularity, Health Score, Recent Streams, Sync Score.

Additional sections:
- **Catalog Health Distribution** -- Horizontal bar showing count of Rising/Stable/Declining/Dormant tracks.
- **Genre Map** -- Treemap or horizontal bar showing streams by genre, colored by genre palette.
- **Revenue Concentration** -- Pie chart showing stream share per track, with HHI risk badge (Critical/High/Moderate/Low).
- **Deep Cuts toggle** -- Filters to tracks with low streams but high save-to-stream ratio or above-average health score. "The ones your real fans love."

**Song Detail (`/catalog/[slug]`)**
A new page that does not exist in v6.0. Answers: "Tell me everything about this one track."

Layout:
1. **Track hero** -- Song name, artist, genre badge, release date, duration (when available), health score gauge.
2. **Score cards** -- Song Health (0-100), Sync Readiness (0-100), Current Activity, Popularity, Playlist Presence.
3. **Streaming timeline** -- Line chart of streams over time (requires snapshots; shows a "not enough data yet" state otherwise).
4. **Playlist status** -- List of current playlists this track appears on, with follower counts. Historical add/remove timeline when data exists.
5. **Revenue breakdown** -- Estimated total revenue, Jake's split, platform breakdown, LTV projections (5yr/10yr/20yr).
6. **Sync pitch card** -- Auto-generated sync pitch sheet using FRANK's template (Section 6.2 of voice guide). One-click copy to clipboard.
7. **Health sub-scores** -- Radar chart of the 5 Song Health dimensions.
8. **Related tracks** -- Other songs in the same genre or by the same collaborator.

**Streaming Intelligence (`/streaming`)**
Upgraded from current. Answers: "How are my streams performing across platforms?"

Keeps: KPIs, top tracks by streams, popularity scores, currently playlisted, catalog table.
Adds:
- **Stream velocity chart** -- Bar chart comparing recent 30-day streams to lifetime monthly average per track. Highlights tracks above/below average.
- **Platform comparison** -- Stacked bar or small multiples showing estimated streams per platform over time (when snapshots exist).
- **Playlist network** -- Grouped list of playlists by estimated type (editorial, algorithmic, user-generated) with reach totals per group.

**Revenue & Economics (`/revenue`)**
Upgraded from current. Answers: "What is my music worth?"

Keeps: Revenue by platform, per-stream rates, top earning tracks, revenue by track table, projection tool.
Adds:
- **Catalog Valuation** -- KPI cards showing estimated catalog sale value (using industry multipliers), annual revenue, and 5yr/10yr/20yr projections from the Catalog Economics model.
- **Revenue concentration waterfall** -- Waterfall chart showing how each track contributes to total revenue.
- **Appreciation vs Depreciation table** -- Each track classified with color-coded badge and trend arrow, using the track trend classifier from the scoring spec.
- **Revenue per listener** -- Metric showing revenue efficiency. Cross-referenced with audience quality.

#### AUDIENCE & REACH

**Audience Intelligence (`/audience`)**
New page, does not exist in v6.0. Answers: "Who is listening, how engaged are they, and how valuable is this audience?"

Powered by Audience Quality Score (scoring model #4).
1. **Audience Quality gauge** -- Large 0-100 gauge with sub-score breakdown.
2. **Funnel diagram** -- Visual funnel: Playlist Reach > Monthly Listeners > Spotify Followers > IG Followers > Superfans (DM senders).
3. **Demographic breakdown** -- Age/gender donut from IG data, with high-value segments highlighted.
4. **Geographic map** -- World map (or top-5 country bar chart) showing audience concentration. Colored by per-stream value premium.
5. **Listener Loyalty metric** -- Follower-to-listener ratio with context ("84.4% of your listeners follow you -- that's exceptional. Industry average is 20-40%").
6. **Conversion signals** -- Cards showing profile visits, link taps, DMs started, with funnel efficiency calculations.
7. **Superfan estimate** -- Based on DM rate, with recommendations to capture email addresses.

**Social Analytics (`/social`)**
Renamed from "Instagram" to accommodate future TikTok integration. Keeps all existing Instagram tabs and content.

Adds:
- Tab structure: Instagram | TikTok (coming soon) | YouTube (coming soon)
- **Content strategy card** -- Auto-generated recommendation from scoring models and FRANK's Content Strategy Tip template. Example: "Your Reels outperform everything else by 3.2x."
- **Optimal posting schedule** -- Clock chart (24-hour radial) showing follower active hours with recommended posting windows highlighted.
- **Solo vs Collab analysis** -- Enhanced with multiplier calculation and specific collaborator recommendations.

**Creative Network (`/collaborators`)**
Upgraded from current. Answers: "Who should I work with next?"

Keeps: Music collaborator stats, IG collaborator stats, role breakdown, solo vs collab.
Adds:
- **Network graph** -- Node graph visualization where center = Jake, nodes = collaborators, edges = tracks/posts, node size = total impact (streams or engagement).
- **Collab ROI table** -- Each collaborator with: tracks together, total streams, engagement multiplier, estimated audience overlap, recommendation (More/Maintain/Complete).
- **Recommended next collabs** -- Generated from collaborator analysis. "You should get back in the studio with Allen Blickle -- your collab tracks average 2.1x your solo streams."

#### STRATEGY

**Career Momentum (`/momentum`)**
New page, replaces the current AI Insights page. Answers: "Am I accelerating, coasting, or stalling?"

Powered by Career Momentum Score (scoring model #1).
1. **Momentum hero** -- Large score with label and color. Trend arrow if historical data exists.
2. **6-axis radar chart** -- Streaming Velocity, Playlist Momentum, Social Acceleration, Catalog Freshness, Popularity Trend, Cross-Platform Spread.
3. **Sub-score detail cards** -- One card per dimension showing the score, the calculation inputs, and a one-line interpretation.
4. **Action items** -- Algorithmically generated from the weakest 2-3 sub-scores. Uses FRANK's insight templates.
5. **Historical momentum** -- Line chart of momentum score over time (requires snapshots). "Your first momentum trend line will appear after 30 days."

**Sync Opportunities (`/sync`)**
New page, does not exist in v6.0. Answers: "Which of my songs could land sync placements?"

Powered by Sync Readiness Score (scoring model #3).
1. **Top sync candidates** -- 3-5 cards showing highest-scoring tracks with one-liner pitch and genre/mood/tempo tags.
2. **Full catalog sync table** -- All tracks ranked by Sync Readiness Score with color-coded pills. Columns: Song, Genre, Mood (inferred), BPM (estimated), Sync Score, Top Fit Categories.
3. **Sync category matrix** -- Heatmap grid. Rows = songs, columns = sync categories (TV Drama, Commercial, Sports, Film, Gaming, Lifestyle). Cells colored by fit score.
4. **Pitch sheet generator** -- Select a track, auto-generates a formatted pitch sheet using FRANK's Sync Pitch Sheet template (Section 6.2). Copy-to-clipboard and download-as-PDF buttons.
5. **Stems availability tracker** -- Checklist of which tracks have stems packages ready.

**Release Timing Optimizer (`/release-planner`)**
New page. Answers: "When should I release my next track?"

Powered by Release Timing Optimizer (scoring model #5).
1. **Next release window** -- Hero card with recommended date range, day of week, and time (PT). Includes confidence score and rationale.
2. **Calendar heatmap** -- 7x52 grid showing historical engagement intensity by day. Highlights recommended windows.
3. **Day-of-week breakdown** -- Bar chart from ig_day_of_week.csv with confidence-weighted scores.
4. **Clock chart** -- 24-hour radial showing follower active hours. Peak windows highlighted.
5. **Release cadence timeline** -- Horizontal timeline showing past releases with engagement markers. Gap between last release and today is called out: "It's been X days since your last release."
6. **Seasonal patterns** -- Monthly engagement averages with best/worst months flagged.
7. **Checklist** -- Pre-release checklist: Submit to Spotify editorial (4 weeks early), prepare IG announcement (Thursday before Friday release), set up pre-save link, schedule second push for peak hour.

**Industry Benchmarks (`/benchmarks`)**
New page. Answers: "Where do I stand relative to artists at my level?"

Powered by Benchmark System (scoring model #6).
1. **Career stage badge** -- "You are an Emerging artist (32.1K monthly listeners)." With definition of the stage and what "next level" means.
2. **Percentile dashboard** -- Horizontal bar chart for each metric showing the artist's percentile within their career stage. Color-coded bands: red (0-25th), yellow (25-50th), blue (50-75th), green (75th+).
3. **Radar overlay** -- Spider chart with two layers: artist's current metrics vs. stage median (p50).
4. **Next-level gap analysis** -- Table showing each metric, current value, next-stage p25 target, absolute gap, percentage growth needed, and estimated months to reach. Sorted by "closest to achieving."
5. **Standout metrics** -- Cards highlighting metrics where the artist already exceeds the next stage (e.g., "Your playlist count (820) already exceeds Mid-Tier p25 (200). You're punching above your weight here.").

#### SYSTEM

**Settings (`/settings`)**
New page.
- Artist profile management (switch between Jakke/Enjune, future: add new artist)
- API connections panel (Spotify, Instagram, Songstats, DistroKid status indicators)
- Data refresh controls (manual trigger for each source)
- Snapshot schedule configuration
- Export options (CSV export of any page's data)
- About / version info

**Data Health (`/data-health`)**
New page. Answers: "Is my data fresh and complete?"
- Per-source health cards: source name, last updated timestamp, freshness indicator (green/yellow/red), record count, next scheduled refresh
- Data completeness grid: which fields are populated vs missing across the catalog
- Error log: any failed API calls or parsing errors

---

## 3. Component Architecture

### Design Philosophy

Every chart, card, and widget should be a reusable component that accepts data as props and handles its own rendering. No page file should contain raw Recharts JSX. Pages are composition layers that arrange components and pass data.

### Component Inventory

#### Layout Components (`src/components/layout/`)

| Component | Description | Props |
|-----------|-------------|-------|
| `Sidebar` | Navigation + artist profile + artist switcher. Already exists, needs artist context refactor | `artistId`, `onArtistChange` |
| `AppShell` | Wraps Sidebar + main content area. Manages collapsed state | `children` |
| `PageContainer` | Max-width container with consistent padding | `children` |

#### UI Primitives (`src/components/ui/`)

| Component | Description | Props |
|-----------|-------------|-------|
| `Card` | Base card with consistent border, background, padding. Already exists | `children`, `className` |
| `KpiCard` | Metric card with label, value, delta, sub-text. Already exists, add delta trending arrow | `label`, `value`, `delta`, `sub`, `accent`, `trend` |
| `KpiRow` | Grid container for KPI cards. Already exists | `children` |
| `PageHeader` | Page title with dynamic subtitle and accent underline. Already exists, add dynamic subtitle support | `title`, `subtitle`, `accent`, `badge` |
| `Section` | Section header with title and accent color. Already exists | `title`, `accent`, `children` |
| `Badge` | NEW -- Pill-shaped status indicator | `label`, `color`, `size` |
| `Gauge` | NEW -- Semicircular gauge for 0-100 scores | `score`, `label`, `thresholds` |
| `ScoreBar` | NEW -- Horizontal segmented bar showing score breakdown | `segments: { label, value, max, color }[]` |
| `InsightCard` | NEW -- Card with icon, title, body copy, and optional CTA | `icon`, `title`, `body`, `priority`, `effort`, `impact` |
| `EmptyState` | NEW -- Placeholder for pages/sections with no data | `title`, `body`, `icon`, `cta` |
| `Skeleton` | NEW -- Loading skeleton matching card/chart dimensions | `variant: "card" | "chart" | "table" | "text"` |
| `Tooltip` | NEW -- Consistent tooltip wrapper for hoverable elements | `content`, `children` |
| `SortableTable` | NEW -- Table with sortable column headers, pagination | `columns`, `data`, `defaultSort`, `pageSize` |
| `TabBar` | NEW -- Horizontal tab switcher (extracted from Instagram page) | `tabs`, `activeTab`, `onChange` |
| `ProgressRing` | NEW -- Circular progress indicator for percentiles | `value`, `max`, `color`, `size` |

#### Chart Components (`src/components/charts/`)

All chart components follow the same contract:
- Accept processed data as props (no raw API responses)
- Accept optional `height` (default: 280)
- Use the shared chart theme (colors, fonts, tooltip styles)
- Export a named component (no default exports for charts)

| Component | Chart Type | Used On | Notes |
|-----------|-----------|---------|-------|
| `BarChartHorizontal` | Horizontal bar (Recharts BarChart layout="vertical") | Streaming, Catalog, Collaborators, Revenue | Replaces ~8 duplicate BarChart implementations |
| `BarChartVertical` | Vertical bar | Instagram, Growth, Benchmarks | Replaces ~6 duplicate implementations |
| `BarChartStacked` | Stacked vertical bar | Instagram (format evolution), Revenue | |
| `DonutChart` | Pie with inner radius | Dashboard (platform split), Instagram (content type) | Replaces 2 PieChart implementations |
| `LineChartSimple` | Single-line trend | Streaming (recent performance), Revenue (projection) | |
| `AreaChartGradient` | Area with gradient fill | Growth (engagement trend) | |
| `RadarChartMulti` | Multi-series radar | Cross-Platform, Momentum, Song Detail | Replaces 3 RadarChart implementations |
| `ScatterPlot` | X/Y scatter with colored dots | Strategy (effort/impact matrix) | |
| `SparkLine` | NEW -- Tiny inline trend line (no axis, no labels) | Dashboard (catalog pulse cards), Tables | |
| `GaugeChart` | NEW -- Semicircular or full-circle gauge | Dashboard, Momentum, Audience, Song Detail | For all 0-100 scores |
| `TreemapChart` | NEW -- Proportional rectangles | Catalog (revenue concentration), Revenue (catalog valuation) | |
| `HeatmapGrid` | NEW -- Grid of colored cells | Sync (category matrix), Release Planner (calendar) | |
| `WaterfallChart` | NEW -- Rising/falling segments | Revenue (per-track contribution) | |
| `FunnelChart` | NEW -- Tapered funnel stages | Audience (reach > listeners > followers > superfans) | |
| `ClockChart` | NEW -- 24-hour radial bar chart | Release Planner (active hours), Social (posting times) | |
| `NetworkGraph` | NEW -- Force-directed node graph | Collaborators (creative network) | Consider using d3-force or a lightweight lib |

#### Shared Chart Configuration (`src/lib/chart-theme.ts`)

```typescript
export const CHART_THEME = {
  font: { fontSize: 11, fill: "rgba(255,255,255,0.5)", fontFamily: "Inter" },
  tooltip: {
    background: "rgba(25,25,30,0.95)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  },
  axis: { axisLine: false, tickLine: false },
  grid: { stroke: "rgba(255,255,255,0.06)", strokeDasharray: "3 3" },
  animation: { duration: 600, easing: "ease-out" },
} as const;
```

This eliminates the repeated `TICK`, `TT`, `CHART_FONT`, `TOOLTIP_STYLE`, and `TT_STYLE` constants currently copy-pasted across every page file.

---

## 4. Data Architecture

### Data Flow Diagram

```
                          +------------------+
                          |   Data Sources   |
                          +------------------+
                          |                  |
                     Live APIs         Static Files
                    (Phase 2+)         (Phase 1)
                          |                  |
                          v                  v
                   +--------------+  +--------------+
                   | API Clients  |  | File Loaders |
                   | (services/)  |  | (lib/data.ts)|
                   +--------------+  +--------------+
                          |                  |
                          v                  v
                   +-----------------------------+
                   |    Data Access Layer (DAL)   |
                   |    src/lib/dal/index.ts      |
                   |                             |
                   |  - Normalizes all sources   |
                   |  - Returns typed interfaces  |
                   |  - Handles artist switching  |
                   |  - Caches with TTL          |
                   +-----------------------------+
                               |
                               v
                   +-----------------------------+
                   |    Scoring Engine            |
                   |    src/lib/scoring/          |
                   |                             |
                   |  Pure functions. Data in,   |
                   |  scores + insights out.     |
                   +-----------------------------+
                               |
                               v
                   +-----------------------------+
                   |    Copy Engine               |
                   |    src/lib/copy/             |
                   |                             |
                   |  Templates + interpolation. |
                   |  Scores in, prose out.      |
                   +-----------------------------+
                               |
                               v
                   +-----------------------------+
                   |    Pages (Server Components) |
                   |    src/app/*/page.tsx         |
                   |                             |
                   |  Fetch data via DAL.        |
                   |  Compute scores.            |
                   |  Generate copy.             |
                   |  Pass to Client Components. |
                   +-----------------------------+
                               |
                               v
                   +-----------------------------+
                   |  Client Components           |
                   |  src/components/             |
                   |                             |
                   |  Charts, cards, interactive  |
                   |  elements. "use client" only |
                   |  where needed.               |
                   +-----------------------------+
```

### Data Access Layer (DAL)

The DAL is the single point of access for all data. Pages never call file loaders or API clients directly.

```typescript
// src/lib/dal/index.ts

export interface DAL {
  // Core data
  getArtistProfile(artistId: string): Promise<ArtistProfile>;
  getSongs(artistId: string): Promise<Song[]>;
  getRecentSongs(artistId: string): Promise<RecentSong[]>;
  getSongstats(artistId: string): Promise<SongstatsData>;

  // Social
  getIgInsights(artistId: string): Promise<IgInsights>;
  getIgYearly(artistId: string): Promise<IgYearly[]>;
  getIgMonthly(artistId: string): Promise<IgMonthly[]>;
  getIgTopPosts(artistId: string): Promise<IgTopPost[]>;
  getIgContentType(artistId: string): Promise<IgContentType[]>;
  getIgDayOfWeek(artistId: string): Promise<IgDayOfWeek[]>;
  getIgCollaborators(artistId: string): Promise<IgCollaborator[]>;

  // Collaborators
  getMusicCollaborators(artistId: string): Promise<MusicCollaborator[]>;

  // Revenue
  getRevenueEstimate(artistId: string): Promise<RevenueEstimate>;

  // Snapshots (for historical tracking)
  getSnapshots(artistId: string, metric: string, range: DateRange): Promise<Snapshot[]>;
  saveSnapshot(artistId: string, data: SnapshotData): Promise<void>;

  // Meta
  getDataHealth(): Promise<DataSourceHealth[]>;
}
```

**Phase 1 implementation:** `StaticDAL` -- reads from `public/data/` files. Artist ID maps to file prefixes. `getSnapshots()` returns empty array. `saveSnapshot()` writes to a local JSON file.

**Phase 2+ implementation:** `LiveDAL` -- calls API service clients. Falls back to `StaticDAL` for any source that is not connected.

### Normalized Data Types

All data types stay in `src/lib/types.ts`. New types to add:

```typescript
// Scoring results
export interface CareerMomentumResult {
  score: number;
  label: "Breaking Out" | "Building" | "Coasting" | "Stalling";
  subScores: {
    streamingVelocity: number;
    playlistMomentum: number;
    socialAcceleration: number;
    catalogFreshness: number;
    popularityTrend: number;
    crossPlatformSpread: number;
  };
  insights: GeneratedInsight[];
}

export interface SongHealthResult {
  song: string;
  score: number;
  tier: "Rising" | "Stable" | "Declining" | "Dormant";
  subScores: { currentActivity: number; popularity: number; playlistPresence: number; catalogPosition: number; ageResilience: number };
}

export interface SyncReadinessResult {
  song: string;
  score: number;
  tier: "Sync Ready" | "Needs Minor Work" | "Niche Sync Only" | "Not Sync Ready";
  subScores: { genreFit: number; moodFit: number; tempoFit: number; trackLengthFit: number; explicitPenalty: number; productionQuality: number; streamProof: number };
  bestFitCategories: string[];
  pitchSheet: string;  // generated copy
}

export interface AudienceQualityResult {
  score: number;
  label: "Premium Audience" | "Growing Quality" | "Passive Audience" | "Ghost Followers";
  subScores: { engagementDepth: number; conversionSignals: number; listenerLoyalty: number; demographicValue: number; communityStrength: number; geographicPremium: number };
  superfanEstimate: number;
  insights: GeneratedInsight[];
}

export interface ReleaseRecommendation {
  optimalDay: string;
  optimalIgPromoDay: string;
  optimalTimePT: string;
  secondPushTimePT: string;
  bestMonths: string[];
  avoidMonths: string[];
  releaseCadence: string;
  nextRecommendedWindow: string;
  confidence: number;
  rationale: string[];
}

export interface BenchmarkResult {
  stage: "Bedroom" | "Emerging" | "Mid-Tier" | "Breaking";
  percentiles: Record<string, number>;
  nextLevelGaps: { metric: string; current: number; target: number; gap: number; growthNeeded: number }[];
  standoutMetrics: string[];
}

export interface CatalogEconomicsResult {
  annualRevenue: number;
  projected5yr: number;
  projected10yr: number;
  projected20yr: number;
  catalogSaleValue: number;
  concentrationRisk: "Low" | "Moderate" | "High" | "Critical";
  herfindahlIndex: number;
  trackLTVs: { song: string; annualRevenue: number; ltv5yr: number; status: "appreciating" | "stable" | "depreciating" }[];
  diversificationScore: number;
}

// Generated insights
export interface GeneratedInsight {
  id: string;
  type: "breakout" | "declining" | "sync" | "timing" | "audience" | "revenue" | "content" | "milestone" | "competitive";
  priority: "now" | "soon" | "later";
  title: string;
  body: string;
  effort: number;  // 1-10
  impact: number;  // 1-10
  dataPoints: Record<string, string | number>;  // variables used in template
  source: string;  // which scoring model generated this
}

// Snapshots
export interface Snapshot {
  date: string;  // ISO date
  metrics: Record<string, number>;
}

export interface DataSourceHealth {
  source: string;
  status: "connected" | "stale" | "disconnected" | "error";
  lastUpdated: string | null;
  recordCount: number;
  nextRefresh: string | null;
  error: string | null;
}
```

### Caching Strategy

| Data Category | Cache Location | TTL | Invalidation |
|---------------|---------------|-----|-------------|
| Static file data | In-memory (module scope) | Until page reload | Manual refresh from Settings |
| API responses (future) | Next.js `fetch` cache + `revalidate` | 5 minutes (streaming), 1 hour (profile), 24 hours (historical) | `revalidatePath()` from Settings |
| Scoring results | Computed per-request (they're fast) | No cache needed | N/A |
| Copy templates | Compiled at build time | Permanent | Rebuild |
| Snapshots | File system (JSON) | Permanent (append-only) | N/A |

For Phase 1, caching is simple: static files are fetched once per page load. The DAL can memoize within a request using a simple Map.

For Phase 2+, use Next.js `unstable_cache` (or the stable equivalent by then) with tag-based invalidation:

```typescript
const getSongstats = unstable_cache(
  async (artistId: string) => fetchSongstatsFromApi(artistId),
  ["songstats"],
  { revalidate: 300, tags: [`songstats-${artistId}`] }
);
```

---

## 5. Service Client System

### Service Client Inventory

Each external data source gets a client in `src/lib/services/`. Clients handle authentication, rate limiting, error handling, and response normalization.

| Client | File | API | Auth | Rate Limits | Phase |
|--------|------|-----|------|------------|-------|
| `StaticDataClient` | `static-data.ts` | Local files in `public/data/` | None | None | 1 (exists as `data.ts`) |
| `SpotifyClient` | `spotify.ts` | Spotify Web API | OAuth 2.0 PKCE | 100 req/min | 2 |
| `SongstatsClient` | `songstats.ts` | Songstats API v1 | API key | 60 req/min | 2 |
| `InstagramClient` | `instagram.ts` | Instagram Graph API via Meta | App token | 200 req/hr | 3 |
| `DistrokidClient` | `distrokid.ts` | DistroKid bank CSV export | Manual upload | N/A | 3 |
| `ShazamClient` | `shazam.ts` | Apple Shazam API | API key | Varies | 4 |
| `BandsintownClient` | `bandsintown.ts` | Bandsintown API | App ID | 100 req/day | 4 |
| `MusicBrainzClient` | `musicbrainz.ts` | MusicBrainz API | None (rate limited) | 1 req/sec | 4 |

### Client Interface Pattern

Every service client implements the same error-handling pattern:

```typescript
// src/lib/services/base.ts
export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
  source: "live" | "cache" | "static" | "fallback";
  timestamp: string;
}

export abstract class BaseServiceClient {
  protected abstract name: string;

  protected async safeCall<T>(fn: () => Promise<T>): Promise<ServiceResult<T>> {
    try {
      const data = await fn();
      return { data, error: null, source: "live", timestamp: new Date().toISOString() };
    } catch (err) {
      console.error(`[${this.name}] API error:`, err);
      return { data: null, error: String(err), source: "fallback", timestamp: new Date().toISOString() };
    }
  }
}
```

### Spotify Client (Phase 2 priority)

The Spotify Web API is the single highest-value integration. It unlocks:
- Audio features (BPM, key, valence, energy, danceability, instrumentalness) for Sync Readiness
- Track duration for Sync Readiness and Song Health
- Explicit flag per track for Sync Readiness
- Saved tracks count (save rate) for Song Health
- Artist top tracks (real-time popularity) for Career Momentum
- Related artists for competitive benchmarking

Authentication: OAuth 2.0 Authorization Code with PKCE flow. User grants access via Spotify for Artists. Refresh token stored server-side.

### Data Source to Scoring Model Map

| Scoring Model | Primary Sources | Secondary Sources | Future Sources |
|--------------|----------------|-------------------|---------------|
| Career Momentum | songstats (streaming, playlists), ig_monthly (social) | songs_all (freshness), ig_insights (engagement) | Monthly snapshots |
| Song Health | songs_all, songs_recent, songstats (popularity, playlists) | -- | Audio features, save/skip rates |
| Sync Readiness | songs_all (genre), musicteam_catalog (metadata) | songstats (stream proof) | Audio features (BPM, valence, energy), duration |
| Audience Quality | ig_insights (demographics, engagement, messaging) | songstats (followers, listeners) | Spotify audience data |
| Release Timing | ig_day_of_week, ig_monthly, ig_insights (active hours), songs_all (release dates) | -- | Competitor calendar |
| Benchmarks | songstats (all fields), ig_insights (followers, engagement) | -- | Chartmetric data |
| Catalog Economics | songs_all (streams), songs_recent (recent), revenue calculations | songstats (popularity) | Distributor revenue data |

---

## 6. Scoring Model Integration

### File Structure

```
src/lib/scoring/
  index.ts               -- barrel export
  types.ts               -- all scoring result interfaces
  constants.ts           -- benchmarks, genre maps, thresholds, sync demand tiers
  utils.ts               -- clamp, sigmoid, safeDivide, percentileFromQuartiles
  career-momentum.ts     -- calculateCareerMomentum(data): CareerMomentumResult
  song-health.ts         -- calculateSongHealth(song, context): SongHealthResult
  sync-readiness.ts      -- calculateSyncReadiness(song, context): SyncReadinessResult
  audience-quality.ts    -- calculateAudienceQuality(data): AudienceQualityResult
  release-timing.ts      -- generateReleaseRecommendation(data): ReleaseRecommendation
  benchmarks.ts          -- calculateBenchmarks(data): BenchmarkResult
  catalog-economics.ts   -- calculateCatalogEconomics(data): CatalogEconomicsResult
  insight-generator.ts   -- generateInsights(allScores): GeneratedInsight[]
```

### Scoring Model to Page Map

| Scoring Model | Primary Page | Secondary Pages |
|--------------|-------------|----------------|
| Career Momentum | `/momentum` | `/` (dashboard hero gauge), `/pulse` (weekly brief) |
| Song Health | `/catalog` (health badges), `/catalog/[slug]` (detail) | `/` (catalog pulse strip), `/streaming` (velocity chart) |
| Sync Readiness | `/sync` | `/catalog/[slug]` (sync card), `/catalog` (sync column in table) |
| Audience Quality | `/audience` | `/` (dashboard KPI), `/social` (conversion signals) |
| Release Timing | `/release-planner` | `/` (days since release in quick stats) |
| Benchmarks | `/benchmarks` | `/momentum` (context), `/` (career stage badge) |
| Catalog Economics | `/revenue` (valuation, concentration) | `/catalog` (revenue column), `/catalog/[slug]` (LTV projections) |

### Insight Generation Pipeline

The insight generator runs after all scoring models and produces a prioritized list of `GeneratedInsight` objects:

```
All Scoring Results
       |
       v
  insight-generator.ts
       |
       ├── Check each model for "alert" conditions
       │   (breakout track, declining track, sync opportunity,
       │    release window, audience gap, revenue milestone)
       |
       ├── Select appropriate FRANK template for each insight
       │   (Section 2 of voice-and-copy-guide.md)
       |
       ├── Interpolate template variables from scoring data
       |
       ├── Score priority: time-sensitive > action-required > milestones > patterns > context
       |
       └── Return sorted GeneratedInsight[]
```

Pages consume insights via filtering:

```typescript
// Dashboard: top 3 insights of any type
const topInsights = allInsights.slice(0, 3);

// Streaming page: only streaming-related insights
const streamInsights = allInsights.filter(i => i.source === "career-momentum" || i.source === "song-health");

// Sync page: only sync insights
const syncInsights = allInsights.filter(i => i.type === "sync");
```

---

## 7. Copy & Insight System

### File Structure

```
src/lib/copy/
  index.ts              -- public API: getCopy(), getInsight(), getChartTitle()
  templates.ts          -- all 38+ insight templates from voice guide (Section 2)
  interpolate.ts        -- template variable replacement: "{{track_name}}" -> "Karma Response"
  selectors.ts          -- logic for choosing which template variation to use (contextual)
  chart-titles.ts       -- dynamic chart title generator (data-aware)
  weekly-brief.ts       -- weekly brief generator (Section 4 of voice guide)
  bio-generator.ts      -- artist bio templates (Section 6.1)
  pitch-sheets.ts       -- sync + curator pitch templates (Sections 6.2, 6.3)
  press-kit.ts          -- press kit generator (Section 6.4)
  empty-states.ts       -- empty state copy for each page (Section 3 of voice guide)
  onboarding.ts         -- onboarding flow copy (Section 3 of voice guide)
```

### Dynamic Chart Titles

Every chart title is a function call, not a string literal:

```typescript
// Instead of:
<Section title="Track Popularity (Spotify Score)">

// Use:
<Section title={getChartTitle("track-popularity", { topTrack: "Your Love's Not Wasted", topScore: 36 })}>
// Returns: "Your Love's Not Wasted leads at 36 popularity"
// Or if declining: "Popularity scores are cooling -- Your Love's Not Wasted down to 36"
```

The `getChartTitle()` function accepts a chart ID and data context, then returns a data-aware title following the voice guide principle: "The title tells you what to think, not what you're looking at."

### Dynamic Page Headers

```typescript
// Instead of:
<PageHeader title="Dashboard" subtitle="..." />

// Use:
<PageHeader
  title="Dashboard"
  subtitle={getPageSubtitle("dashboard", {
    momentumLabel: "Building",
    weekHighlight: "Karma Response",
    streamsDelta: "+2.3%",
  })}
/>
// Returns: "Building momentum -- Karma Response led the week with 36K streams"
```

### Template System

Templates follow the structure defined in the voice guide:

```typescript
// src/lib/copy/templates.ts

export const BREAKOUT_ALERT: Template[] = [
  {
    id: "breakout-a",
    title: "{{track_name}} is picking up speed.",
    body: "Popularity jumped from {{old_score}} to {{new_score}} this {{period}}. {{playlist_count}} new playlist adds are driving it. This is the window to push -- pitch it, post about it, get it in front of people while the algorithm is paying attention.",
    condition: (data) => data.playlist_count > 0,
  },
  {
    id: "breakout-b",
    title: "Something's happening with {{track_name}}.",
    body: "{{stream_delta}}% stream increase in {{period}}, now sitting on {{playlist_count}} playlists with {{playlist_reach}} combined reach. That's organic pull. Feed it.",
    condition: (data) => data.stream_delta > 20,
  },
  // ... variation C
];
```

The selector chooses the best-fit variation based on the data context (which template conditions match).

---

## 8. Design System

### Current Foundation

The existing design system is solid:
- Dark mode with well-chosen background layers (`#0e1117` base, `#161b22` card, `#1c2333` hover)
- Spotify green as primary accent (`#1DB954`)
- Inter font family
- Consistent color tokens in CSS custom properties
- Clean card/section/header patterns

### Enhancements for v7.0

#### Color System Extension

Add semantic score colors alongside existing platform/brand colors:

```css
@theme {
  /* Existing colors (keep) */
  --color-bg: #0e1117;
  --color-bg-card: #161b22;
  /* ... */

  /* Score colors (new) */
  --color-score-excellent: #1DB954;
  --color-score-good: #58a6ff;
  --color-score-warning: #f0c040;
  --color-score-danger: #f85149;

  /* Tier colors (new) */
  --color-tier-rising: #1DB954;
  --color-tier-stable: #58a6ff;
  --color-tier-declining: #f0c040;
  --color-tier-dormant: #f85149;

  /* Surface layers (new -- for progressive depth) */
  --color-bg-elevated: #1e2530;
  --color-bg-overlay: rgba(14, 17, 23, 0.85);

  /* Subtle accent backgrounds (new -- for insight cards) */
  --color-surface-green: rgba(29, 185, 84, 0.08);
  --color-surface-blue: rgba(88, 166, 255, 0.08);
  --color-surface-yellow: rgba(240, 192, 64, 0.08);
  --color-surface-red: rgba(248, 81, 73, 0.08);
}
```

#### Typography Scale

The current app uses `text-xs`, `text-sm`, `text-lg`, `text-2xl`, `text-5xl` inconsistently. Establish a type scale:

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `heading-hero` | 48px | 700 | Score gauges, year-in-review headline number |
| `heading-page` | 24px | 700 | Page titles (PageHeader) |
| `heading-section` | 11px uppercase tracking-wider | 700 | Section headers |
| `heading-card` | 16px | 600 | Card titles, insight titles |
| `body` | 14px | 400 | Default body text, table cells |
| `body-small` | 13px | 400 | Insight body copy, secondary info |
| `caption` | 12px | 500 | KPI labels, chart labels |
| `micro` | 10px | 600 | Badges, tags, axis ticks |

#### Motion

Add subtle transitions to make data feel alive:

```css
/* Score gauges: animate on load */
@keyframes gauge-fill {
  from { stroke-dashoffset: var(--gauge-circumference); }
  to { stroke-dashoffset: var(--gauge-offset); }
}

/* Cards: subtle entrance on page load */
@keyframes card-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Number counters: count up on load */
@keyframes count-up {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

#### Genre Gradient System

Maintain the existing genre color map but use it for card backgrounds with gradient washes:

```typescript
export function genreGradient(genre: string): string {
  const color = GENRE_COLORS[genre] ?? "#333";
  return `linear-gradient(135deg, ${color}15, transparent 60%)`;
}
```

This creates a subtle genre-colored wash on catalog cards without being overwhelming.

#### Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 768px | Single column, sidebar collapsed by default, stacked KPIs |
| Tablet | 768-1024px | 2-column grid, sidebar collapsible |
| Desktop | 1024-1440px | 2-column grid, sidebar always visible |
| Wide | > 1440px | 3-column grid option, max-width container |

The current `max-w-[1200px]` container works well. Consider bumping to `max-w-[1400px]` for the wide breakpoint.

---

## 9. State Management

### Approach

No external state management library. Use:

1. **Server Components** for all data fetching (eliminates most client-side state)
2. **React Context** for global client state (artist selection, sidebar collapse)
3. **URL search params** for shareable state (selected tab, sort order, date range)
4. **`useState`** for local interactive state (sliders, toggles)

### Artist Context

```typescript
// src/lib/context/artist-context.tsx
"use client";

import { createContext, useContext, useState } from "react";

interface ArtistContextType {
  artistId: string;
  setArtistId: (id: string) => void;
}

const ArtistContext = createContext<ArtistContextType>({
  artistId: "jakke",
  setArtistId: () => {},
});

export function ArtistProvider({ children }: { children: React.ReactNode }) {
  const [artistId, setArtistId] = useState("jakke");
  return (
    <ArtistContext.Provider value={{ artistId, setArtistId }}>
      {children}
    </ArtistContext.Provider>
  );
}

export function useArtist() {
  return useContext(ArtistContext);
}
```

Pages that need to react to artist changes use the `useArtist()` hook. Server Components receive `artistId` as a prop passed down from layout.

### URL-Based State

For tabs, sort orders, and date ranges, use Next.js `searchParams` so pages are bookmarkable and shareable:

```
/social?tab=instagram&year=2025
/catalog?sort=health&view=shelf
/benchmarks?stage=emerging
```

---

## 10. File Structure

### Target Directory Layout

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (AppShell + ArtistProvider)
│   ├── globals.css                   # Theme tokens + global styles
│   ├── page.tsx                      # Dashboard
│   ├── pulse/
│   │   └── page.tsx                  # Weekly Pulse
│   ├── catalog/
│   │   ├── page.tsx                  # Catalog (Record Collection)
│   │   └── [slug]/
│   │       └── page.tsx              # Song Detail
│   ├── streaming/
│   │   └── page.tsx                  # Streaming Intelligence
│   ├── revenue/
│   │   └── page.tsx                  # Revenue & Economics
│   ├── audience/
│   │   └── page.tsx                  # Audience Intelligence
│   ├── social/
│   │   └── page.tsx                  # Social Analytics
│   ├── collaborators/
│   │   └── page.tsx                  # Creative Network
│   ├── momentum/
│   │   └── page.tsx                  # Career Momentum Score
│   ├── sync/
│   │   └── page.tsx                  # Sync Opportunities
│   ├── release-planner/
│   │   └── page.tsx                  # Release Timing Optimizer
│   ├── benchmarks/
│   │   └── page.tsx                  # Industry Benchmarks
│   ├── settings/
│   │   └── page.tsx                  # Settings & Connections
│   └── data-health/
│       └── page.tsx                  # Data Health
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx               # Navigation + artist profile
│   │   ├── AppShell.tsx              # Sidebar + main wrapper
│   │   └── PageContainer.tsx         # Content wrapper
│   │
│   ├── ui/
│   │   ├── Card.tsx                  # Base card (exists)
│   │   ├── KpiCard.tsx               # Metric card (exists, enhance)
│   │   ├── KpiRow.tsx                # Grid container (extract from KpiCard)
│   │   ├── PageHeader.tsx            # Page header (exists, enhance)
│   │   ├── Section.tsx               # Section header (exists)
│   │   ├── Badge.tsx                 # Status pill (new)
│   │   ├── Gauge.tsx                 # Score gauge (new)
│   │   ├── ScoreBar.tsx              # Segmented score bar (new)
│   │   ├── InsightCard.tsx           # Insight display card (new)
│   │   ├── EmptyState.tsx            # No-data placeholder (new)
│   │   ├── Skeleton.tsx              # Loading skeleton (new)
│   │   ├── SortableTable.tsx         # Sortable data table (new)
│   │   ├── TabBar.tsx                # Tab switcher (new)
│   │   └── ProgressRing.tsx          # Circular progress (new)
│   │
│   └── charts/
│       ├── BarChartHorizontal.tsx    # Horizontal bar (new -- consolidates ~8)
│       ├── BarChartVertical.tsx      # Vertical bar (new -- consolidates ~6)
│       ├── BarChartStacked.tsx       # Stacked bar (new)
│       ├── DonutChart.tsx            # Donut / pie (new -- consolidates 2)
│       ├── LineChartSimple.tsx       # Line chart (new -- consolidates 2)
│       ├── AreaChartGradient.tsx     # Area with gradient (new)
│       ├── RadarChartMulti.tsx       # Radar chart (new -- consolidates 3)
│       ├── ScatterPlot.tsx           # Scatter (new)
│       ├── SparkLine.tsx             # Inline mini chart (new)
│       ├── GaugeChart.tsx            # Semicircular gauge (new)
│       ├── TreemapChart.tsx          # Proportional boxes (new)
│       ├── HeatmapGrid.tsx           # Color grid (new)
│       ├── WaterfallChart.tsx        # Waterfall (new)
│       ├── FunnelChart.tsx           # Funnel (new)
│       ├── ClockChart.tsx            # 24-hour radial (new)
│       └── NetworkGraph.tsx          # Node graph (new)
│
├── lib/
│   ├── types.ts                      # All TypeScript interfaces (exists, extend)
│   ├── constants.ts                  # Colors, rates, nav, splits (exists, extend)
│   ├── format.ts                     # Number/currency/date formatters (exists)
│   ├── chart-theme.ts               # Shared chart config (new -- replaces duplicated consts)
│   │
│   ├── dal/
│   │   ├── index.ts                  # DAL interface + factory
│   │   ├── static-dal.ts            # File-based implementation (refactored from data.ts)
│   │   └── live-dal.ts              # API-based implementation (Phase 2)
│   │
│   ├── services/
│   │   ├── base.ts                   # BaseServiceClient abstract class (new)
│   │   ├── spotify.ts               # Spotify Web API client (Phase 2)
│   │   ├── songstats.ts             # Songstats API client (Phase 2)
│   │   ├── instagram.ts             # Instagram Graph API client (Phase 3)
│   │   └── distrokid.ts             # DistroKid CSV parser (Phase 3)
│   │
│   ├── scoring/
│   │   ├── index.ts                  # Barrel export
│   │   ├── types.ts                  # Scoring result interfaces
│   │   ├── constants.ts             # Benchmarks, genre maps, thresholds
│   │   ├── utils.ts                 # clamp, sigmoid, safeDivide, percentile
│   │   ├── career-momentum.ts       # Career Momentum calculator
│   │   ├── song-health.ts           # Song Health per-track scorer
│   │   ├── sync-readiness.ts        # Sync Readiness per-track scorer
│   │   ├── audience-quality.ts      # Audience Quality calculator
│   │   ├── release-timing.ts        # Release Recommendation generator
│   │   ├── benchmarks.ts            # Benchmark percentile engine
│   │   ├── catalog-economics.ts     # LTV projections + concentration
│   │   └── insight-generator.ts     # Cross-model insight synthesis
│   │
│   ├── copy/
│   │   ├── index.ts                  # Public API: getCopy, getInsight, getChartTitle, getPageSubtitle
│   │   ├── templates.ts             # All 38+ insight copy templates
│   │   ├── interpolate.ts           # Variable replacement engine
│   │   ├── selectors.ts            # Template variation selection logic
│   │   ├── chart-titles.ts         # Dynamic chart title generator
│   │   ├── weekly-brief.ts         # Weekly brief generator
│   │   ├── bio-generator.ts        # Artist bio templates
│   │   ├── pitch-sheets.ts         # Sync + curator pitch templates
│   │   ├── press-kit.ts            # Press kit generator
│   │   ├── empty-states.ts         # Empty state copy per page
│   │   └── onboarding.ts           # Onboarding flow copy
│   │
│   ├── context/
│   │   └── artist-context.tsx       # Artist selection context (new)
│   │
│   └── revenue.ts                    # Revenue estimation (exists, extend)
│
└── public/
    └── data/
        ├── (all existing CSV/JSON files)
        └── snapshots/                # Historical metric snapshots (new, Phase 2)
            ├── jakke/
            │   └── 2026-02-26.json
            └── enjune/
                └── 2026-02-26.json
```

### File Count Summary

| Category | Existing | New | Total |
|----------|---------|-----|-------|
| Pages | 9 | 7 | 16 |
| Layout components | 1 | 2 | 3 |
| UI components | 4 | 10 | 14 |
| Chart components | 0 | 16 | 16 |
| Library modules | 5 | 28 | 33 |
| **Total source files** | **19** | **63** | **82** |

---

## 11. Migration Plan

### Phase 1: Foundation (Week 1-2)

**Goal:** Establish the new architecture without breaking existing functionality. All data still from static files.

**Step 1: Extract shared chart components (3 days)**
- Create `src/components/charts/` directory
- Extract `BarChartHorizontal` from the ~8 duplicate horizontal bar implementations
- Extract `BarChartVertical` from the ~6 duplicate vertical bar implementations
- Extract `DonutChart` from the 2 PieChart implementations
- Extract `RadarChartMulti` from the 3 RadarChart implementations
- Create `chart-theme.ts` with shared TICK, TOOLTIP, AXIS constants
- Refactor all 9 existing pages to use new chart components
- This is the highest-leverage refactor: it removes ~400 lines of duplicated code

**Step 2: Create Data Access Layer (1 day)**
- Create `src/lib/dal/` with `StaticDAL` implementation
- Refactor `data.ts` functions into `static-dal.ts` with artist ID parameterization
- Update all pages to use DAL instead of direct `loadXxx()` calls
- Verify Jakke/Enjune switching works on all pages

**Step 3: Build scoring engine (3 days)**
- Create `src/lib/scoring/` with all 7 scoring models
- Implement using formulas from `scoring-models-spec.md`
- Unit test every scoring function
- No UI changes yet -- just the calculation layer

**Step 4: Build copy engine (2 days)**
- Create `src/lib/copy/` with template system
- Port all 38 insight templates from `voice-and-copy-guide.md`
- Implement interpolation and selector logic
- Implement dynamic chart titles and page subtitles
- Unit test template rendering

**Step 5: Create new UI components (2 days)**
- Build `Badge`, `Gauge`, `ScoreBar`, `InsightCard`, `EmptyState`, `Skeleton`, `SortableTable`, `TabBar`
- Build `SparkLine`, `GaugeChart` chart components
- These are needed before building new pages

### Phase 2: New Pages + Scoring Integration (Week 2-4)

**Step 6: Upgrade existing pages (3 days)**
- Dashboard: Replace static KPIs with scoring-model-driven content. Add hero insight, momentum gauge, catalog pulse strip, top 3 actions.
- Catalog: Add health badges, shelf view, deep cuts toggle, genre treemap, revenue concentration chart.
- Revenue: Add catalog valuation, appreciation/depreciation table, waterfall chart.
- AI Insights: Rename to Career Momentum. Replace hardcoded insights with generated ones from scoring engine.
- Instagram: Rename to Social Analytics. Add content strategy card, optimal posting schedule.
- Growth: Merge into Career Momentum (the existing Growth page content is largely redundant with scoring models).
- Collaborators: Add network graph, collab ROI table, recommendations.

**Step 7: Build new pages (5 days)**
- `/pulse` (Weekly Pulse) -- narrative page with weekly brief
- `/catalog/[slug]` (Song Detail) -- deep dive per track
- `/audience` (Audience Intelligence) -- powered by Audience Quality score
- `/sync` (Sync Opportunities) -- powered by Sync Readiness score
- `/release-planner` (Release Timing Optimizer) -- calendar heatmap, clock chart
- `/benchmarks` (Industry Benchmarks) -- percentile dashboard, gap analysis
- `/settings` and `/data-health` -- system pages

**Step 8: Update navigation (1 day)**
- Restructure `NAV_GROUPS` to match new 5-group navigation
- Add active page highlighting for nested routes (`/catalog/[slug]`)
- Update sidebar artist profile to use Artist Context

### Phase 3: Live Data Integration (Week 4-6)

**Step 9: Spotify API integration**
- Implement `SpotifyClient` with OAuth 2.0 PKCE flow
- Add `/settings` connection UI for Spotify authorization
- Fetch audio features for all tracks (BPM, key, valence, energy, duration, explicit flag)
- Store in `public/data/audio_features.json` (or API cache)
- Update Sync Readiness scoring to use real audio data instead of genre-based estimates
- Update Song Health with real duration data

**Step 10: Snapshot system**
- Create snapshot file format: `public/data/snapshots/{artistId}/{YYYY-MM-DD}.json`
- Add a "Take Snapshot" button in Settings
- Create a Next.js API route or server action for snapshot creation
- Update scoring models to use historical data for trend calculations (MoM growth, delta calculations)
- Enable the Weekly Pulse page with real week-over-week deltas

**Step 11: Songstats API integration**
- Implement `SongstatsClient`
- Replace static `songstats_jakke.json` / `songstats_enjune.json` with live data
- Add playlist add/remove history tracking
- Enable real-time playlist monitoring on Song Detail pages

### Phase 4: Advanced Integrations (Week 6-8+)

**Step 12: Instagram Graph API**
- Replace static IG data with live API
- Enable real-time DM counts, engagement metrics, audience demographics
- Add TikTok placeholder (API availability dependent)

**Step 13: Distributor integration**
- DistroKid bank CSV upload in Settings
- Parse actual revenue data instead of estimating from stream counts
- Show real per-platform revenue in Revenue page

**Step 14: Additional APIs**
- MusicBrainz for catalog metadata enrichment (ISRC validation, recording relationships)
- Bandsintown for concert/touring data
- Shazam for discovery signal data

---

## 12. Technical Decisions

### Decision 1: Recharts vs Alternatives

**Decision:** Stay with Recharts for Phase 1-2. Evaluate alternatives for specific advanced charts.

**Rationale:** Recharts handles 80% of the chart needs (bars, lines, areas, pies, radar, scatter). The existing 28+ charts use it. Switching would require rewriting everything for marginal benefit.

For the 4 chart types Recharts cannot do well:
- **Network Graph:** Use `d3-force` (lightweight, tree-shakeable) or `react-force-graph-2d`
- **Treemap:** Recharts has a Treemap component but it's limited. Consider `@nivo/treemap`
- **Heatmap Grid:** Build custom with CSS Grid (no library needed)
- **Clock Chart:** Build custom with SVG (Recharts can't do polar bar charts well)

Add these as needed. Do not pre-install all charting libraries.

### Decision 2: Server Components vs Client Components

**Decision:** Default to Server Components. Only use `"use client"` for components that need interactivity (charts, tabs, sliders, artist switcher).

**Rationale:** Next.js 15 + React 19 defaults to Server Components. Data fetching in Server Components eliminates waterfall loading, reduces bundle size, and simplifies caching. Charts inherently need client-side rendering (Recharts uses the DOM), so they remain Client Components.

**Pattern:**
```tsx
// src/app/streaming/page.tsx (Server Component -- no "use client")
import { getDAL } from "@/lib/dal";
import { calculateSongHealth } from "@/lib/scoring";
import StreamingContent from "./streaming-content";  // Client Component

export default async function StreamingPage() {
  const dal = getDAL();
  const songstats = await dal.getSongstats("jakke");
  const songs = await dal.getSongs("jakke");
  const healthScores = songs.map(s => calculateSongHealth(s, { songstats, ... }));

  return <StreamingContent songstats={songstats} songs={songs} healthScores={healthScores} />;
}
```

Note: In Phase 1, since all data comes from static `public/` files fetched via `fetch()` on the client, Server Components provide limited benefit. But structuring this way means Phase 2+ API integrations slot in naturally.

**Pragmatic Phase 1 approach:** Keep pages as Client Components (as they are now) but structure the data flow to be easily convertible. The DAL abstraction is the key.

### Decision 3: Artist Switcher Architecture

**Decision:** Artist ID is stored in React Context (client state) and passed to the DAL. Navigation does not change when switching artists.

**Rationale:** The current approach (sidebar dropdown) is the right UX. The problem is that data loading is not parameterized. The fix is making every DAL method accept an `artistId` and having pages read from the Artist Context.

For Phase 2+ with Server Components, artist ID could move to a cookie or URL prefix (`/jakke/streaming`), but that is a future optimization.

### Decision 4: Snapshot Storage

**Decision:** JSON files in `public/data/snapshots/` for Phase 1-3. Migrate to a database (SQLite via Turso, or Postgres) if snapshot volume exceeds reasonable file-system limits.

**Rationale:** The app serves one artist (Jake) with two projects (Jakke, Enjune). Daily snapshots produce ~365 files/year. This is trivially manageable as JSON files. A database adds deployment complexity that is not justified until there are multiple users.

Snapshot format:
```json
{
  "date": "2026-02-26",
  "artistId": "jakke",
  "metrics": {
    "spotify_total_streams": 3320000,
    "spotify_monthly_listeners": 32100,
    "spotify_followers": 27100,
    "spotify_popularity": 23,
    "cross_platform_streams": 4610000,
    "cross_platform_followers": 142000,
    "cross_platform_playlists": 820,
    "cross_platform_playlist_reach": 15700000,
    "ig_followers": 26353,
    "ig_engagement_rate": 0.0254,
    "ig_views_30d": 51773,
    "ig_profile_visits": 936,
    "estimated_monthly_revenue": 42
  },
  "track_metrics": {
    "Your Love's Not Wasted": { "streams": 1911265, "popularity": 36, "recent_streams": 2569 },
    "Sugar Tide": { "streams": 240897, "popularity": 9, "recent_streams": 12890 }
  }
}
```

### Decision 5: New Dependencies

Minimize new dependencies. The current package.json has only 6 runtime dependencies, which is excellent.

| Package | Purpose | Phase | Justification |
|---------|---------|-------|---------------|
| None added Phase 1 | -- | 1 | Scoring + copy engines are pure TypeScript. No new libraries needed. |
| `d3-force` | Network graph physics | 2 | Only if building the collaborator network graph. Lightweight (~15KB). |
| `date-fns` | Date manipulation for snapshots + release timing | 2 | Lighter than moment/dayjs for the tree-shaking. |
| `@vercel/kv` or `ioredis` | Snapshot storage (if outgrowing JSON files) | 4 | Only if needed. |

Do NOT add: lodash (use native), axios (use native fetch), zustand/jotai (React Context suffices), nivo/visx (Recharts + custom SVG covers the need).

### Decision 6: Testing Strategy

| Layer | Test Type | Tool | Coverage Target |
|-------|----------|------|----------------|
| Scoring models | Unit tests | Vitest | 100% -- these are pure functions with known inputs/outputs |
| Copy templates | Unit tests | Vitest | All templates render without errors, all variables interpolated |
| DAL | Integration tests | Vitest | Verify file loading and data shape normalization |
| Components | Component tests | Vitest + @testing-library/react | Key interactions (sort, tab switch, artist change) |
| Pages | Smoke tests | Vitest + React Testing Library | Each page renders without throwing |
| E2E | Browser tests | Playwright (Phase 3+) | Happy path through all 16 pages |

Phase 1 priority: scoring model unit tests and copy template tests. These are the highest-value tests because they validate business logic.

### Decision 7: Deployment

**Platform:** Vercel (native Next.js host)
**Build:** `next build` (static export not viable due to dynamic routes in Phase 2+)
**Environment variables:** API keys stored in Vercel environment variables
**Preview deployments:** Automatic per-branch for PR review

Phase 1 can also deploy as a static export (`output: "export"` in `next.config.ts`) since there are no API routes or server-side data fetching. This is the simplest deployment path.

---

## Appendix A: Existing Page to New Page Migration Map

| Current Page (v6.0) | New Page (v7.0) | Changes |
|---------------------|----------------|---------|
| `/` Dashboard | `/` Dashboard | Major upgrade: scoring-driven hero, insight cards, catalog pulse |
| `/streaming` | `/streaming` | Moderate upgrade: velocity chart, platform comparison, playlist grouping |
| `/catalog` | `/catalog` | Major upgrade: shelf view, health badges, deep cuts, treemap |
| -- | `/catalog/[slug]` | NEW: per-track deep dive |
| `/revenue` | `/revenue` | Moderate upgrade: catalog valuation, appreciation table, waterfall |
| `/instagram` | `/social` | Renamed. Add tab structure for future platforms, content strategy card |
| `/collaborators` | `/collaborators` | Moderate upgrade: network graph, collab ROI, recommendations |
| `/growth` | REMOVED (merged into `/momentum`) | Content absorbed by Career Momentum + Dashboard actions |
| `/cross-platform` | REMOVED (merged into `/` and `/streaming`) | Jakke vs Enjune comparison stays as dashboard sub-section |
| `/ai-insights` | `/momentum` | Major upgrade: replaces hardcoded insights with scoring engine |
| -- | `/pulse` | NEW: weekly narrative brief |
| -- | `/audience` | NEW: audience quality scoring |
| -- | `/sync` | NEW: sync opportunity identification |
| -- | `/release-planner` | NEW: release timing optimization |
| -- | `/benchmarks` | NEW: industry benchmarking |
| -- | `/settings` | NEW: system configuration |
| -- | `/data-health` | NEW: data freshness monitoring |

## Appendix B: Estimated LOC by Module

| Module | Estimated Lines | Notes |
|--------|----------------|-------|
| Scoring engine (`lib/scoring/`) | 1,200 | 7 models + utils + constants |
| Copy engine (`lib/copy/`) | 800 | 38 templates + interpolation + generators |
| Chart components (`components/charts/`) | 1,600 | 16 components, ~100 lines each |
| UI components (`components/ui/`) | 600 | 10 new components, ~60 lines each |
| DAL (`lib/dal/`) | 300 | Interface + static implementation |
| Service clients (`lib/services/`) | 200 | Base class + Spotify stub (Phase 1) |
| New pages (7) | 2,100 | ~300 lines each |
| Upgraded pages (6) | Net +600 | Some grow, some shrink from component extraction |
| Tests | 1,500 | Scoring + copy + component tests |
| **Total new/modified** | **~8,900** | |

## Appendix C: Dependency on Research Documents

| Research Document | Consumed By | Integration Status |
|-------------------|-------------|-------------------|
| `scoring-models-spec.md` (GROWTH) | `lib/scoring/` -- all 7 models | Spec is implementation-ready. Formulas can be directly translated to TypeScript. |
| `data-sources-catalog.md` (AUTO) | `lib/services/` -- client inventory, `lib/dal/` -- data normalization | Used for service client planning and Phase 2-4 priority ordering. |
| `voice-and-copy-guide.md` (FRANK) | `lib/copy/` -- all templates, chart titles, empty states, onboarding, weekly brief | Spec is implementation-ready. Templates port directly. |
| `strategy-and-business.md` (COS) | Page structure, pricing tier awareness, competitive differentiation | Informs what pages to build and what features differentiate from competitors. |

---

*This spec is the single source of truth for the Music Command Center v7.0 architecture. All implementation work should reference this document. Update it when decisions change.*
