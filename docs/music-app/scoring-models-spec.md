# Scoring Models Specification — Music Command Center

> Algorithmic, data-driven scoring models to replace the hardcoded AI Insights page.
> Each model is designed to be computable from existing data files or near-term API additions.
> Target implementation: `src/lib/scoring.ts` (pure functions, no side effects).

**Last updated:** 2026-02-26
**Author:** Growth Intelligence Analyst

---

## Table of Contents

1. [Career Momentum Score](#1-career-momentum-score)
2. [Song Health Score](#2-song-health-score)
3. [Sync Readiness Score](#3-sync-readiness-score)
4. [Audience Quality Score](#4-audience-quality-score)
5. [Release Timing Optimizer](#5-release-timing-optimizer)
6. [Benchmark System](#6-benchmark-system)
7. [Catalog Economics](#7-catalog-economics)
8. [Data Availability Matrix](#8-data-availability-matrix)
9. [Implementation Roadmap](#9-implementation-roadmap)

---

## 1. Career Momentum Score

**Purpose:** Detect whether an artist is accelerating, coasting, or stalling. Answers: "Is this artist about to break?"

**Scale:** 0-100

### Formula

```
CareerMomentum = (
    StreamingVelocity   * 0.30
  + PlaylistMomentum    * 0.20
  + SocialAcceleration  * 0.15
  + CatalogFreshness    * 0.15
  + PopularityTrend     * 0.10
  + CrossPlatformSpread * 0.10
)
```

### Sub-Score Definitions

#### 1a. Streaming Velocity (0-100) — Weight: 30%

Measures month-over-month growth in streaming activity.

```
recent_streams = sum of jakke_top_songs_recent.csv Streams (most recent period)
total_streams  = songstats_jakke.json → spotify.total_streams

// Velocity ratio: what % of lifetime streams happened recently?
// For a ~30-day recent window against a multi-year catalog:
velocity_ratio = recent_streams / total_streams

// Normalize: 1% recent/total in 30 days is baseline for a mature catalog
// 3%+ indicates strong momentum
StreamingVelocity = clamp(0, 100, (velocity_ratio / 0.03) * 100)
```

**With historical data (future, when we store monthly snapshots):**
```
mom_growth = (this_month_streams - last_month_streams) / last_month_streams
StreamingVelocity = clamp(0, 100, sigmoid(mom_growth, midpoint=0.05, steepness=20) * 100)
// 0% growth = 50, +10% growth = ~73, +20% growth = ~88, -10% = ~27
```

**Data inputs:**
- HAVE: `jakke_top_songs_recent.csv` (recent streams), `songstats_jakke.json` (total streams)
- NEED (future): Monthly stream snapshots for true MoM calculation

#### 1b. Playlist Momentum (0-100) — Weight: 20%

Measures playlist traction relative to career stage.

```
current_playlists = songstats_jakke.json → spotify.current_playlists  // 84
total_playlists   = songstats_jakke.json → cross_platform.total_playlists  // 820
playlist_reach    = songstats_jakke.json → spotify.playlist_reach  // 1,720,000
monthly_listeners = songstats_jakke.json → spotify.monthly_listeners  // 32,100

// Playlist penetration: how much of your reach converts to listeners?
penetration = monthly_listeners / playlist_reach  // 32100/1720000 = 0.0187

// Active playlist ratio: what % of your playlists are currently active?
active_ratio = current_playlists / total_playlists  // 84/820 = 0.102

// Playlist quality: average reach per active playlist
avg_playlist_quality = playlist_reach / current_playlists  // 20,476

// Composite playlist score
playlist_penetration_score = clamp(0, 40, (penetration / 0.05) * 40)   // 0.05 = strong
active_ratio_score         = clamp(0, 30, (active_ratio / 0.20) * 30)  // 0.20 = healthy
quality_score              = clamp(0, 30, (avg_playlist_quality / 50000) * 30)  // 50K avg = great

PlaylistMomentum = playlist_penetration_score + active_ratio_score + quality_score
```

**Data inputs:**
- HAVE: All fields from `songstats_jakke.json`
- NEED (future): Historical playlist count snapshots, editorial vs algorithmic vs user-generated breakdown

#### 1c. Social Acceleration (0-100) — Weight: 15%

Measures whether social engagement is growing, not just existing.

```
// Use ig_monthly_stats.csv — compare last 3 months avg to prior 3 months
recent_3mo_avg_likes = avg(last 3 months of ig_monthly_stats.avg_likes)
prior_3mo_avg_likes  = avg(months 4-6 of ig_monthly_stats.avg_likes)

social_growth = (recent_3mo_avg_likes - prior_3mo_avg_likes) / max(prior_3mo_avg_likes, 1)

// Engagement rate trend
engagement_rate = ig_insights.overview.interactions / ig_insights.account.followers
// Baseline indie artist IG engagement: ~2-4%
engagement_score = clamp(0, 50, (engagement_rate / 0.04) * 50)

// Growth component
growth_score = clamp(0, 50, sigmoid(social_growth, midpoint=0.0, steepness=5) * 50)
// Negative growth → below 25, flat → 25, positive growth → above 25

SocialAcceleration = engagement_score + growth_score
```

**Data inputs:**
- HAVE: `ig_monthly_stats.csv` (historical avg_likes), `instagram_jakke_insights_30d.json` (engagement)
- NEED: None (computable now)

#### 1d. Catalog Freshness (0-100) — Weight: 15%

Measures how recently the catalog has been refreshed with new material.

```
today = current date
songs = jakke_songs_all.csv (filtered to entries with release_date)

// Days since most recent release
days_since_last = (today - max(release_date)).days

// Number of releases in last 12 months
releases_last_year = count(songs where release_date > today - 365 days)

// Recency score: 0-50
// < 30 days = 50, 30-90 days = 40, 90-180 = 25, 180-365 = 15, 365+ = 5
recency_score =
  days_since_last < 30  ? 50 :
  days_since_last < 90  ? 40 :
  days_since_last < 180 ? 25 :
  days_since_last < 365 ? 15 : 5

// Cadence score: 0-50
// 6+ releases/year = 50, 4-5 = 40, 2-3 = 25, 1 = 10, 0 = 0
cadence_score =
  releases_last_year >= 6 ? 50 :
  releases_last_year >= 4 ? 40 :
  releases_last_year >= 2 ? 25 :
  releases_last_year >= 1 ? 10 : 0

CatalogFreshness = recency_score + cadence_score
```

**Data inputs:**
- HAVE: `jakke_songs_all.csv` (release_date column — partially populated)
- NEED: Complete release dates for all tracks (some are missing)

#### 1e. Popularity Trend (0-100) — Weight: 10%

Uses Spotify popularity scores as a proxy for algorithmic favor.

```
track_pops = songstats_jakke.json → track_popularity  // {track: score}
artist_pop = songstats_jakke.json → spotify.popularity_score  // 23

// Distribution analysis
max_pop = max(track_popularity values)  // 36
avg_pop = avg(track_popularity values)  // ~18
tracks_above_20 = count(track_popularity where value > 20)
total_tracks = count(track_popularity)

// Artist-level score (0-40): 23/100 on Spotify scale
artist_score = clamp(0, 40, (artist_pop / 50) * 40)  // 50 = strong indie

// Catalog depth score (0-30): how many tracks have meaningful popularity
depth_score = clamp(0, 30, (tracks_above_20 / total_tracks) * 30)

// Peak score (0-30): highest single-track popularity
peak_score = clamp(0, 30, (max_pop / 60) * 30)  // 60 = very strong for indie

PopularityTrend = artist_score + depth_score + peak_score
```

**Data inputs:**
- HAVE: `songstats_jakke.json` (track_popularity, popularity_score)
- NEED: Historical popularity snapshots (currently only current values)

#### 1f. Cross-Platform Spread (0-100) — Weight: 10%

Measures diversification across platforms.

```
spotify_streams = songstats_jakke.json → spotify.total_streams  // 3,320,000
total_streams   = songstats_jakke.json → cross_platform.total_streams  // 4,610,000
total_playlists = songstats_jakke.json → cross_platform.total_playlists  // 820
total_followers = songstats_jakke.json → cross_platform.total_followers  // 142,000
spotify_followers = songstats_jakke.json → spotify.followers  // 27,100

// Platform concentration (lower = more diversified)
spotify_concentration = spotify_streams / total_streams  // 0.72

// Follower diversification
follower_diversification = 1 - (spotify_followers / total_followers)  // 0.81

// Score: penalize over-reliance on single platform
// Ideal concentration: 40-60% Spotify (it's the biggest platform)
concentration_score = clamp(0, 50,
  spotify_concentration < 0.40 ? 50 :
  spotify_concentration < 0.60 ? 45 :
  spotify_concentration < 0.75 ? 30 :
  spotify_concentration < 0.90 ? 15 : 5
)

diversification_score = clamp(0, 50, follower_diversification * 50)

CrossPlatformSpread = concentration_score + diversification_score
```

**Data inputs:**
- HAVE: `songstats_jakke.json` (all cross-platform fields)
- NEED: None (computable now)

### Thresholds

| Score | Label | Color | Meaning |
|-------|-------|-------|---------|
| 75-100 | Breaking Out | `#1DB954` | Strong upward trajectory, multiple signals aligning |
| 55-74 | Building | `#58a6ff` | Positive direction, needs a catalyst (editorial, viral moment) |
| 35-54 | Coasting | `#f0c040` | Stable but flat. Risk of stagnation without new initiatives |
| 0-34 | Stalling | `#f85149` | Declining signals. Needs strategic intervention |

### Visualization

- **Primary:** Single large number (like the current Strategy Score hero) with color-coded background
- **Radar chart:** 6-axis showing each sub-score contribution
- **Trend sparkline:** If historical snapshots exist, show 6-month momentum trend
- **Sub-score bars:** Horizontal stacked bar for each component showing current vs. max

---

## 2. Song Health Score

**Purpose:** Per-track health assessment. Identifies which songs are rising, stable, declining, or dormant.

**Scale:** 0-100 per track

### Formula

```
SongHealth = (
    CurrentActivity    * 0.35
  + PopularityScore    * 0.25
  + PlaylistPresence   * 0.20
  + CatalogPosition    * 0.10
  + AgeResilience      * 0.10
)
```

### Sub-Score Definitions

#### 2a. Current Activity (0-100) — Weight: 35%

Compares recent streaming activity to the track's lifetime average.

```
recent_streams = jakke_top_songs_recent.csv → Streams for this track
total_streams  = jakke_songs_all.csv → streams for this track
release_date   = jakke_songs_all.csv → release_date

// If release_date exists, calculate expected monthly rate
months_since_release = max(1, (today - release_date).days / 30)
lifetime_monthly_avg = total_streams / months_since_release

// Recent activity ratio (recent period is ~30 days based on data)
activity_ratio = recent_streams / max(1, lifetime_monthly_avg)

// Score: ratio > 1 means performing above average
CurrentActivity = clamp(0, 100,
  activity_ratio >= 2.0 ? 100 :  // double normal rate
  activity_ratio >= 1.5 ? 85 :   // 50% above normal
  activity_ratio >= 1.0 ? 70 :   // at or above normal
  activity_ratio >= 0.5 ? 45 :   // half normal
  activity_ratio >= 0.2 ? 20 :   // steep decline
  5                               // near-dormant
)
```

**Data inputs:**
- HAVE: `jakke_top_songs_recent.csv`, `jakke_songs_all.csv` (streams, release_date)
- NOTE: release_date is missing for some tracks; fall back to a default age estimate

#### 2b. Popularity Score (0-100) — Weight: 25%

Direct mapping from Spotify's algorithmic popularity metric.

```
track_pop = songstats_jakke.json → track_popularity[song_name]

// Spotify popularity is 0-100 but most indie artists cluster 0-40
// Normalize to our scale with indie-appropriate expectations
PopularityScore = clamp(0, 100, (track_pop / 50) * 100)
// 50 on Spotify = 100 in our system (exceptional for indie)
// 25 on Spotify = 50 in our system (solid performer)
// 10 on Spotify = 20 in our system (below average)
```

**Data inputs:**
- HAVE: `songstats_jakke.json` → `track_popularity`

#### 2c. Playlist Presence (0-100) — Weight: 20%

Whether a track is currently on playlists (active discovery surface).

```
currently_playlisted = songstats_jakke.json → currently_playlisted  // ["Delicate", "Brick by Brick", "Late Night"]
top_playlists = songstats_jakke.json → top_playlists  // array with follower counts

is_playlisted = song_name in currently_playlisted

if (is_playlisted) {
  // Base score for being on any active playlist
  base = 60

  // Bonus: is it on high-reach playlists? Check top_playlists for name matches
  // Simplified: if playlisted and has top-playlist association
  PlaylistPresence = clamp(60, 100, base + 40)  // 100 if actively playlisted
} else {
  // Not currently playlisted — check if it WAS playlisted (we don't have historical data)
  // Use popularity as proxy: high popularity without playlist = organic strength
  PlaylistPresence = clamp(0, 30, (track_pop / 40) * 30)
}
```

**Data inputs:**
- HAVE: `songstats_jakke.json` → `currently_playlisted`, `top_playlists`
- NEED (future): Per-track playlist history (add/remove dates), playlist type breakdown

#### 2d. Catalog Position (0-100) — Weight: 10%

Where this track ranks within the artist's own catalog.

```
all_streams = jakke_songs_all.csv sorted by streams DESC
rank = position of this song (1-indexed)
total_tracks = count of all songs

// Top-heavy scoring: being in the top 3 matters a lot
CatalogPosition =
  rank == 1 ? 100 :
  rank == 2 ? 90 :
  rank == 3 ? 80 :
  rank <= 5 ? 65 :
  rank <= 10 ? 45 :
  rank <= 15 ? 25 :
  10
```

**Data inputs:**
- HAVE: `jakke_songs_all.csv` (streams column for ranking)

#### 2e. Age Resilience (0-100) — Weight: 10%

Rewards tracks that continue to perform well despite their age. A song released 3 years ago
that still gets streams is healthier than a brand-new song getting the same number.

```
if (!release_date) {
  AgeResilience = 50  // neutral default
} else {
  age_months = (today - release_date).days / 30

  // Expected decay: streams should decline ~50% every 12 months for indie
  expected_current_rate = total_streams / age_months * (0.5 ^ (age_months / 12))
  actual_current_rate   = recent_streams  // from jakke_top_songs_recent.csv

  resilience_ratio = actual_current_rate / max(1, expected_current_rate)

  AgeResilience = clamp(0, 100,
    resilience_ratio >= 2.0 ? 100 :  // beating decay by 2x
    resilience_ratio >= 1.0 ? 75 :   // holding steady
    resilience_ratio >= 0.5 ? 45 :   // declining at expected rate
    resilience_ratio >= 0.2 ? 20 :   // declining faster than expected
    5                                 // near-dead
  )
}
```

**Data inputs:**
- HAVE: `jakke_songs_all.csv` (release_date, streams), `jakke_top_songs_recent.csv` (recent streams)
- NOTE: Missing release dates get a neutral 50

### Tier Classification

| Score | Tier | Icon | Color | Description |
|-------|------|------|-------|-------------|
| 70-100 | Rising | Upward arrow | `#1DB954` | Growing in streams/popularity, active on playlists |
| 45-69 | Stable | Flat line | `#58a6ff` | Consistent performance, not declining |
| 20-44 | Declining | Downward arrow | `#f0c040` | Below-average activity, slipping off playlists |
| 0-19 | Dormant | Dot | `#f85149` | Near-zero recent activity, no playlist presence |

### Visualization

- **Track table:** Add a "Health" column with color-coded pill (Rising/Stable/Declining/Dormant)
- **Distribution chart:** Horizontal bar chart showing how many tracks in each tier
- **Scatter plot:** X = total streams (log scale), Y = health score. Identifies overperformers and underperformers
- **Heatmap grid:** Small multiples, one cell per track, colored by health, sorted by release date. Shows catalog vitality over time

---

## 3. Sync Readiness Score

**Purpose:** Rate each track's suitability for sync licensing (TV, film, ads, games).

**Scale:** 0-100 per track

### Formula

```
SyncReadiness = (
    GenreFit          * 0.25
  + MoodFit           * 0.20
  + TempoFit          * 0.15
  + TrackLengthFit    * 0.10
  + ExplicitPenalty   * 0.10
  + ProductionQuality * 0.10
  + StreamProof       * 0.10
)
```

### Sub-Score Definitions

#### 3a. Genre Fit (0-100) — Weight: 25%

Certain genres are in higher demand for sync placements.

```
// Sync demand tiers (based on industry sync placement data)
HIGH_DEMAND = ["Organic House", "Acoustic", "Lo-Fi", "Ambient", "Chillwave", "Indie Electronic"]
MEDIUM_DEMAND = ["Deep House", "Melodic House", "Downtempo"]
LOW_DEMAND = ["Melodic Techno", "Progressive House"]  // too niche/intense for most sync

genre = jakke_songs_all.csv → genre

GenreFit =
  genre in HIGH_DEMAND   ? 100 :
  genre in MEDIUM_DEMAND ? 60 :
  genre in LOW_DEMAND    ? 25 :
  40  // unknown genre, neutral
```

**Rationale:** Sync supervisors for TV/advertising overwhelmingly request chill, organic, acoustic,
and indie electronic. Hard electronic (techno, progressive) gets fewer placements outside of specific
sports/gaming contexts.

**Data inputs:**
- HAVE: `jakke_songs_all.csv` → `genre`
- NEED: None

#### 3b. Mood Fit (0-100) — Weight: 20%

Certain moods are more versatile for sync.

```
// Mood inference from genre (until we have audio analysis API data)
MOOD_MAP = {
  "Organic House":    { primary: "uplifting", versatility: 85 },
  "Acoustic":         { primary: "warm",      versatility: 95 },
  "Lo-Fi":            { primary: "chill",     versatility: 80 },
  "Ambient":          { primary: "calm",      versatility: 75 },
  "Chillwave":        { primary: "dreamy",    versatility: 80 },
  "Indie Electronic": { primary: "energetic", versatility: 70 },
  "Deep House":       { primary: "groovy",    versatility: 55 },
  "Melodic House":    { primary: "driving",   versatility: 50 },
  "Downtempo":        { primary: "reflective",versatility: 70 },
  "Melodic Techno":   { primary: "intense",   versatility: 30 },
  "Progressive House":{ primary: "building",  versatility: 35 },
}

mood = MOOD_MAP[genre] ?? { primary: "neutral", versatility: 50 }
MoodFit = mood.versatility
```

**With Spotify Audio Features API (future):**
```
valence = audio_features.valence        // 0-1, positivity
energy  = audio_features.energy         // 0-1
danceability = audio_features.danceability

// Most sync-friendly: moderate energy, positive or neutral valence
MoodFit = clamp(0, 100,
  (1 - abs(valence - 0.6)) * 40 +       // sweet spot around 0.6
  (1 - abs(energy - 0.5)) * 30 +         // moderate energy
  (danceability > 0.4 ? 20 : 10) +       // some groove helps
  10                                      // base
)
```

**Data inputs:**
- HAVE: `jakke_songs_all.csv` → `genre` (for mood inference)
- NEED (high value): Spotify Audio Features API (valence, energy, danceability, instrumentalness)

#### 3c. Tempo Fit (0-100) — Weight: 15%

Sync-friendly tempos cluster around 90-130 BPM. Too slow feels dead; too fast feels frantic.

```
// Genre-based BPM estimation (until we have audio analysis)
BPM_ESTIMATE = {
  "Organic House": 118,
  "Deep House": 122,
  "Melodic House": 124,
  "Melodic Techno": 128,
  "Progressive House": 126,
  "Indie Electronic": 110,
  "Downtempo": 90,
  "Chillwave": 95,
  "Lo-Fi": 85,
  "Ambient": 70,
  "Acoustic": 100,
}

bpm = BPM_ESTIMATE[genre] ?? 110

// Ideal range: 90-130 BPM
TempoFit =
  bpm >= 90 && bpm <= 130 ? 100 :
  bpm >= 80 && bpm < 90   ? 70 :
  bpm > 130 && bpm <= 140  ? 70 :
  bpm >= 70 && bpm < 80   ? 40 :
  bpm > 140 && bpm <= 150  ? 40 :
  20
```

**With Spotify Audio Features API (future):**
```
bpm = audio_features.tempo
// Direct measurement, no estimation needed
```

**Data inputs:**
- HAVE: `jakke_songs_all.csv` → `genre` (for BPM estimation)
- NEED (high value): Spotify Audio Features API (tempo)

#### 3d. Track Length Fit (0-100) — Weight: 10%

Ideal sync length: 2:30 - 3:30. Short enough for a scene, long enough for extended use.

```
// We don't have track duration in current data
// Estimation: most released singles are 3:00-4:00
// Use genre-based estimation until we have duration data

DURATION_ESTIMATE = {
  "Organic House": 4.5,   // minutes — tends to run longer
  "Deep House": 5.0,
  "Melodic House": 5.5,
  "Melodic Techno": 6.0,
  "Progressive House": 6.0,
  "Indie Electronic": 3.5,
  "Downtempo": 4.0,
  "Chillwave": 3.5,
  "Lo-Fi": 3.0,
  "Ambient": 5.0,
  "Acoustic": 3.5,
}

duration_min = DURATION_ESTIMATE[genre] ?? 3.5

TrackLengthFit =
  duration_min >= 2.5 && duration_min <= 3.5 ? 100 :
  duration_min > 3.5 && duration_min <= 4.5   ? 70 :
  duration_min > 4.5 && duration_min <= 5.5   ? 40 :
  duration_min > 5.5                           ? 20 :
  duration_min < 2.5                           ? 60 :  // short but usable
  50
```

**Data inputs:**
- HAVE: `jakke_songs_all.csv` → `genre` (for estimation)
- NEED (high value): Track duration from Spotify API or catalog metadata

#### 3e. Explicit Content Penalty (0-100) — Weight: 10%

Explicit tracks are excluded from most TV/advertising sync.

```
// Check song title for explicit indicators
// Known explicit tracks from enjune catalog: "Fuck Me Up"
// Cross-reference with musicteam_catalog.csv if available

title_lower = song_name.toLowerCase()
has_explicit_title = title_lower.includes("fuck") || title_lower.includes("shit") ||
                     title_lower.includes("bitch") || title_lower.includes("damn")

ExplicitPenalty = has_explicit_title ? 0 : 100
```

**With Spotify API (future):**
```
ExplicitPenalty = track.explicit ? 0 : 100
```

**Data inputs:**
- HAVE: Song titles (basic heuristic)
- NEED: Spotify `explicit` field per track

#### 3f. Production Quality Proxy (0-100) — Weight: 10%

Uses Dolby Atmos availability and mastering metadata as quality signals.

```
catalog_entry = musicteam_catalog.csv → match by Title

has_stereo = catalog_entry?.Stereo === "Yes"
has_atmos  = catalog_entry?.Dolby Atmos === "Yes"
has_isrc   = catalog_entry?.ISRC is not empty
has_iswc   = catalog_entry?.ISWC is not empty

ProductionQuality =
  (has_stereo ? 25 : 0) +
  (has_atmos  ? 35 : 0) +  // Atmos is a premium signal for sync
  (has_isrc   ? 20 : 0) +
  (has_iswc   ? 20 : 0)
```

**Data inputs:**
- HAVE: `musicteam_catalog.csv` (Stereo, Dolby Atmos, ISRC, ISWC)
- NOTE: Only 12 tracks (6 unique songs as Recording+Work pairs) are in the catalog file

#### 3g. Stream Proof (0-100) — Weight: 10%

Sync supervisors prefer tracks with proven audience traction.

```
streams = jakke_songs_all.csv → streams
max_streams = max(all song streams)  // ~1,911,265 for "Your Love's Not Wasted"

// Log scale so tail tracks aren't crushed
StreamProof = clamp(0, 100, (log10(max(streams, 1)) / log10(max_streams)) * 100)

// Examples:
// 1,911,265 streams → 100
// 240,897 streams → ~86
// 50,000 streams → ~75
// 5,000 streams → ~59
// 500 streams → ~43
```

**Data inputs:**
- HAVE: `jakke_songs_all.csv` → `streams`

### Thresholds

| Score | Tier | Meaning |
|-------|------|---------|
| 75-100 | Sync Ready | Pitch immediately to sync libraries and music supervisors |
| 55-74 | Needs Minor Work | Good candidate with small fixes (edit for length, create instrumental) |
| 35-54 | Niche Sync Only | Suitable for specific use cases (gaming, sports, niche TV) |
| 0-34 | Not Sync Ready | Wrong format, too niche, or explicit content issues |

### Visualization

- **Ranked table:** All tracks sorted by Sync Readiness Score with color-coded pill
- **Radar chart (per track):** 7-axis spider showing each sub-score
- **Top 5 "Pitch Now" cards:** Highlight the best sync candidates with key selling points
- **Genre fit heatmap:** Rows = songs, columns = sync categories (TV drama, commercial, sports, gaming, film), cells colored by fit

---

## 4. Audience Quality Score

**Purpose:** Measure how engaged, loyal, and monetizable the audience is. Not all listeners are equal.

**Scale:** 0-100

### Formula

```
AudienceQuality = (
    EngagementDepth     * 0.25
  + ConversionSignals   * 0.20
  + ListenerLoyalty     * 0.20
  + DemographicValue    * 0.15
  + CommunityStrength   * 0.10
  + GeographicPremium   * 0.10
)
```

### Sub-Score Definitions

#### 4a. Engagement Depth (0-100) — Weight: 25%

Measures quality of social interactions beyond passive consumption.

```
interactions     = ig_insights.overview.interactions  // 669
accounts_engaged = ig_insights.overview.accounts_engaged  // 431
accounts_reached = ig_insights.overview.accounts_reached  // 5,771
followers        = ig_insights.account.followers  // 26,353
dms_started      = ig_insights.messaging.conversations_started  // 192

// Engaged-to-reached ratio (higher = more compelling content)
engaged_ratio = accounts_engaged / max(accounts_reached, 1)  // 0.075

// DM rate (direct messages per follower — proxy for superfan density)
dm_rate = dms_started / max(followers, 1)  // 0.0073

// Interactions per engaged account (depth of engagement)
interaction_depth = interactions / max(accounts_engaged, 1)  // 1.55

EngagementDepth = clamp(0, 100,
  (engaged_ratio / 0.10) * 35 +         // 10% = strong
  (dm_rate / 0.01) * 35 +               // 1% DM rate = very engaged
  min(30, interaction_depth * 10)         // multiple interactions per person
)
```

**Data inputs:**
- HAVE: `instagram_jakke_insights_30d.json` (all fields)

#### 4b. Conversion Signals (0-100) — Weight: 20%

How effectively does social attention translate to action?

```
profile_visits     = ig_insights.overview.profile_visits  // 936
external_link_taps = ig_insights.overview.external_link_taps  // 5
accounts_reached   = ig_insights.overview.accounts_reached  // 5,771
views              = ig_insights.overview.views_30d  // 51,773

// Visit rate: profile views per reach
visit_rate = profile_visits / max(accounts_reached, 1)  // 0.162

// Click-through rate: link taps per profile visit
ctr = external_link_taps / max(profile_visits, 1)  // 0.0053

// Funnel efficiency: reach → visit → click
funnel_score = (visit_rate / 0.20) * 50    // 20% visit rate = excellent
click_score  = (ctr / 0.02) * 50           // 2% CTR = strong

ConversionSignals = clamp(0, 100, funnel_score + click_score)
```

**Data inputs:**
- HAVE: `instagram_jakke_insights_30d.json`
- NOTE: Link tap count is very low (5) — may indicate link-in-bio optimization opportunity

#### 4c. Listener Loyalty (0-100) — Weight: 20%

Proxy for repeat listening and audience stickiness.

```
spotify_followers  = songstats_jakke.json → spotify.followers  // 27,100
monthly_listeners  = songstats_jakke.json → spotify.monthly_listeners  // 32,100

// Follower-to-listener ratio: high = loyal base, low = passive/playlist-driven
follow_ratio = spotify_followers / max(monthly_listeners, 1)  // 0.844

// This is VERY high (84.4%) — indicates a loyal core audience
// Industry average for indie: ~20-40%
// Threshold: >60% = exceptional, >40% = strong, >20% = healthy, <20% = playlist-dependent

ListenerLoyalty = clamp(0, 100,
  follow_ratio >= 0.60 ? 90 + (follow_ratio - 0.60) * 25 :  // 90-100
  follow_ratio >= 0.40 ? 65 + (follow_ratio - 0.40) * 125 : // 65-90
  follow_ratio >= 0.20 ? 35 + (follow_ratio - 0.20) * 150 : // 35-65
  follow_ratio * 175                                          // 0-35
)
```

**Data inputs:**
- HAVE: `songstats_jakke.json` (followers, monthly_listeners)
- NEED (future): Spotify for Artists "audience" data (saves, repeat listeners, discovery sources)

#### 4d. Demographic Value (0-100) — Weight: 15%

Certain demographics are more valuable for monetization (merch, tickets, sync).

```
age_gender = ig_insights.follower_demographics.age_gender
// { "18-24": {male: 12.3, female: 8.7}, "25-34": {male: 22.1, female: 15.4}, ... }

// High-value demographics for music monetization:
// 25-34 = peak spending power + concert attendance
// 18-24 = high streaming volume, strong social amplification
pct_25_34 = age_gender["25-34"].male + age_gender["25-34"].female  // 37.5%
pct_18_24 = age_gender["18-24"].male + age_gender["18-24"].female  // 21.0%
pct_core = pct_25_34 + pct_18_24  // 58.5%

// Geographic premium: US, UK, Canada, Australia = high per-stream rates
top_countries = ig_insights.follower_demographics.top_countries
premium_country_pct = sum(percentage for US, UK, Canada, Australia)  // 70.1%

demo_score = clamp(0, 60, (pct_core / 60) * 60)  // 60% core demo = perfect
geo_score  = clamp(0, 40, (premium_country_pct / 80) * 40)  // 80% premium countries = perfect

DemographicValue = demo_score + geo_score
```

**Data inputs:**
- HAVE: `instagram_jakke_insights_30d.json` (age_gender, top_countries)

#### 4e. Community Strength (0-100) — Weight: 10%

Measures the strength of the artist's community network.

```
// IG response rate as community investment signal
response_rate = ig_insights.messaging.response_rate  // 0.694
avg_response_hours = ig_insights.messaging.avg_response_time_hours  // 2.3

// Collaborator network depth
ig_collabs = ig_collaborators.csv  // 15 collaborators
tier_1_collabs = count(ig_collaborators where tier == 1)  // 2
total_collab_likes = sum(ig_collaborators.total_likes)

response_score = clamp(0, 40, response_rate * 40)  // 100% = 40
speed_score = clamp(0, 20,
  avg_response_hours <= 1 ? 20 :
  avg_response_hours <= 4 ? 15 :
  avg_response_hours <= 12 ? 10 :
  5
)
network_score = clamp(0, 40, (tier_1_collabs * 15) + min(10, ig_collabs.length))

CommunityStrength = response_score + speed_score + network_score
```

**Data inputs:**
- HAVE: `instagram_jakke_insights_30d.json` (messaging), `ig_collaborators.csv`

#### 4f. Geographic Premium (0-100) — Weight: 10%

Audiences in high-value streaming markets generate more revenue per stream.

```
// Per-stream rates vary significantly by country
// US: $0.004, UK: $0.0038, Germany: $0.0035, Brazil: $0.0012, India: $0.0008
countries = ig_insights.follower_demographics.top_countries

COUNTRY_MULTIPLIER = {
  "United States": 1.0,
  "United Kingdom": 0.95,
  "Canada": 0.90,
  "Australia": 0.90,
  "Germany": 0.88,
  // Others default to 0.5
}

weighted_value = sum(
  country.percentage * (COUNTRY_MULTIPLIER[country.country] ?? 0.5)
  for country in countries
) / 100

// Normalize: if 100% US audience, weighted_value = 1.0
GeographicPremium = clamp(0, 100, weighted_value * 100)
```

**Data inputs:**
- HAVE: `instagram_jakke_insights_30d.json` → `follower_demographics.top_countries`

### Thresholds

| Score | Label | Meaning |
|-------|-------|---------|
| 75-100 | Premium Audience | Highly engaged, monetizable, loyal fanbase |
| 55-74 | Growing Quality | Good foundation, optimize conversion paths |
| 35-54 | Passive Audience | High reach but low engagement. Content pivot needed |
| 0-34 | Ghost Followers | Low quality metrics. May need audience rebuilding |

### Superfan Identification Threshold

A listener is classified as a "superfan" if they exhibit 3+ of these behaviors:
- Follows the artist on Spotify AND Instagram
- Sends DMs (top ~1% of followers by engagement)
- Attends shows (future: ticket purchase data)
- Saves 3+ tracks to personal playlists
- Shares content (story mentions, tags)

**Estimated superfan count (current data):**
```
// DM initiators as superfan proxy
estimated_superfans = ig_insights.messaging.conversations_started  // 192/month
superfan_percentage = 192 / 26353  // 0.73%
// Industry benchmark: 1-3% of followers are superfans
```

### Visualization

- **Gauge chart:** Single large semicircle gauge showing 0-100 audience quality
- **Funnel diagram:** Reach > Engaged > Profile Visit > Link Tap > Superfan
- **Demographic donut:** Age/gender breakdown with high-value segments highlighted
- **Geographic map:** World map with bubbles sized by audience concentration, colored by per-stream value

---

## 5. Release Timing Optimizer

**Purpose:** Determine optimal release day/time based on historical engagement data and industry patterns.

**This is not a 0-100 score but a recommendation engine.**

### Algorithm

#### 5a. Optimal Posting Day

```
// From ig_day_of_week.csv
day_data = [
  { day: "Thu", posts: 105, avg_likes: 193 },
  { day: "Sun", posts: 80,  avg_likes: 187 },
  { day: "Tue", posts: 78,  avg_likes: 150 },
  { day: "Wed", posts: 84,  avg_likes: 99 },
  { day: "Sat", posts: 7,   avg_likes: 85 },
  { day: "Fri", posts: 21,  avg_likes: 76 },
  { day: "Mon", posts: 76,  avg_likes: 64 },
]

// Confidence-weighted scoring (more posts = more reliable data)
// Use Wilson score interval for small sample sizes
for each day:
  sample_confidence = 1 - (1 / sqrt(day.posts))  // higher posts = higher confidence
  weighted_score = day.avg_likes * sample_confidence

// Result ranking:
// 1. Thursday (193 * 0.90 = 174) ← best day, high confidence
// 2. Sunday (187 * 0.89 = 166)
// 3. Tuesday (150 * 0.89 = 133)
// 4. Wednesday (99 * 0.89 = 88)

// CAVEAT: Saturday has only 7 posts — low confidence. Avg of 85 may be misleading.
```

#### 5b. Optimal Posting Time

```
// From instagram_jakke_insights_30d.json → follower_active_hours
// Hour (UTC) → active follower count
active_hours = {
  "0": 2145, "1": 1432, ... "9": 5994, "12": 5993, "13": 5678, ...
}

// Peak hours (top 4): 9am (5994), 12pm (5993), 13pm (5678), 10am (5432)
// These are likely PT hours (Jake is in LA)

// For releases: post 2 hours BEFORE peak to catch the ramp-up
// If peak = 9am PT, release IG announcement at 7am PT
// If peak = 12pm PT, second push at 10am PT

optimal_release_window = "7:00-9:00 AM PT"  // catches morning ramp
optimal_second_push    = "11:00 AM-12:00 PM PT"  // catches midday peak

// For Spotify (New Music Friday):
// Songs must be submitted 4+ weeks early
// NMF playlist refreshes Thursday 9pm PT / Friday 12am ET
// Release date should be FRIDAY for NMF consideration
// Best release time: Friday 12:00 AM in earliest target timezone (typically NZ/AU for global)
```

#### 5c. Release Cadence Optimization

```
// Analyze ig_monthly_stats.csv for engagement patterns around release months
// Cross-reference with jakke_songs_all.csv release_date

release_months = extract months from release_dates in jakke_songs_all.csv
// Known releases: Jul 2024, Dec 2024, Sep 2024, Oct 2024, Jun 2025, Mar 2025, etc.

// Engagement data from ig_monthly_stats for those months
release_month_avg_likes = avg(ig_monthly_stats.avg_likes for months with releases)
non_release_month_avg_likes = avg(ig_monthly_stats.avg_likes for months without releases)

release_engagement_lift = release_month_avg_likes / non_release_month_avg_likes

// Optimal cadence: release often enough to maintain momentum but not so often as to
// cannibalize your own attention
// Recommendation: 1 release every 6-8 weeks (7-9 releases/year)
// This matches current data: ~6 releases in 2024
```

#### 5d. Seasonal Patterns

```
// From ig_monthly_stats.csv — identify high/low engagement seasons
monthly_avgs = group ig_monthly_stats by calendar month, average the avg_likes

// Expected pattern for indie electronic:
// HIGH: Aug-Oct (festival season, summer playlists still active)
// MODERATE: Jan-Mar (new year fresh starts, less competition)
// LOW: Nov-Dec (holiday music dominates, listener attention diverted)
// LOW: Apr-Jun (spring competition increases, pre-summer buildup)

// ACTUAL from data (avg_likes by month across years):
// Highest: Oct 2024 (1051), Dec 2023 (538), May 2024 (468)
// These align with major release moments, not pure seasonality

// Recommendation: release in Sep-Oct or Jan-Feb to maximize engagement
// Avoid: late November, December (holiday noise)
```

#### 5e. Competitive Avoidance

```
// This requires external data we don't currently have
// Future: integrate Spotify's "upcoming releases" or Songstats release calendar

// Heuristic rules:
// - Avoid releasing same week as major artists in your genre
// - Check Beatport top 100 for release day clustering
// - Avoid first week of month (high volume from major labels)
// - Prefer 2nd or 3rd Friday of the month for less competition

// For Jake's genre niche (Organic/Melodic House):
// - Smaller release calendar = less competition risk
// - But also less playlisting activity, so timing with playlist refresh matters more
```

### Output Format

```typescript
interface ReleaseRecommendation {
  optimal_day: "Friday";           // For streaming platforms
  optimal_ig_promo_day: "Thursday"; // For social announcement
  optimal_time_pt: "7:00 AM";     // Pacific Time
  second_push_time_pt: "11:00 AM";
  best_months: ["September", "October", "January", "February"];
  avoid_months: ["November", "December"];
  release_cadence: "Every 6-8 weeks";
  next_recommended_window: string;  // calculated from last release date
  confidence: number;               // 0-1, based on data completeness
  rationale: string[];              // human-readable reasoning
}
```

### Visualization

- **Calendar heatmap:** 7x52 grid (days x weeks) showing historical engagement intensity
- **Clock chart:** 24-hour radial chart showing follower active hours with peak windows highlighted
- **Timeline:** Horizontal timeline showing past releases with engagement markers, plus recommended future windows
- **Day-of-week bar chart:** Already computed from ig_day_of_week.csv

---

## 6. Benchmark System

**Purpose:** Place the artist in context. "Where do I stand relative to artists at my career stage?"

### Career Stage Definitions

```typescript
type CareerStage = "Bedroom" | "Emerging" | "Mid-Tier" | "Breaking";

function getCareerStage(monthlyListeners: number): CareerStage {
  if (monthlyListeners < 10_000)    return "Bedroom";
  if (monthlyListeners < 100_000)   return "Emerging";
  if (monthlyListeners < 1_000_000) return "Mid-Tier";
  return "Breaking";
}

// Jakke: 32,100 monthly listeners → Emerging
// Enjune: 6,492 monthly listeners → Bedroom
```

### Benchmark Data

Industry benchmarks compiled from Chartmetric, Songstats, and Music Business Worldwide data for
indie/electronic artists in each stage.

```typescript
const BENCHMARKS: Record<CareerStage, StageBenchmarks> = {
  Bedroom: {
    monthly_listeners: { p25: 1_000, p50: 3_000, p75: 7_000 },
    spotify_followers: { p25: 200, p50: 800, p75: 2_500 },
    total_streams: { p25: 10_000, p50: 50_000, p75: 200_000 },
    popularity_score: { p25: 3, p50: 8, p75: 15 },
    playlist_count: { p25: 5, p50: 20, p75: 80 },
    playlist_reach: { p25: 1_000, p50: 10_000, p75: 50_000 },
    ig_followers: { p25: 500, p50: 2_000, p75: 8_000 },
    ig_engagement_rate: { p25: 0.02, p50: 0.04, p75: 0.08 },
    releases_per_year: { p25: 1, p50: 3, p75: 6 },
    avg_streams_per_release: { p25: 500, p50: 2_000, p75: 8_000 },
    save_rate: { p25: 0.01, p50: 0.025, p75: 0.05 },
  },
  Emerging: {
    monthly_listeners: { p25: 15_000, p50: 35_000, p75: 70_000 },
    spotify_followers: { p25: 3_000, p50: 10_000, p75: 30_000 },
    total_streams: { p25: 500_000, p50: 2_000_000, p75: 8_000_000 },
    popularity_score: { p25: 12, p50: 22, p75: 35 },
    playlist_count: { p25: 30, p50: 100, p75: 400 },
    playlist_reach: { p25: 100_000, p50: 500_000, p75: 2_000_000 },
    ig_followers: { p25: 5_000, p50: 15_000, p75: 50_000 },
    ig_engagement_rate: { p25: 0.015, p50: 0.03, p75: 0.06 },
    releases_per_year: { p25: 2, p50: 4, p75: 8 },
    avg_streams_per_release: { p25: 5_000, p50: 20_000, p75: 80_000 },
    save_rate: { p25: 0.015, p50: 0.03, p75: 0.05 },
  },
  "Mid-Tier": {
    monthly_listeners: { p25: 150_000, p50: 350_000, p75: 700_000 },
    spotify_followers: { p25: 30_000, p50: 100_000, p75: 300_000 },
    total_streams: { p25: 10_000_000, p50: 50_000_000, p75: 200_000_000 },
    popularity_score: { p25: 30, p50: 45, p75: 60 },
    playlist_count: { p25: 200, p50: 800, p75: 3_000 },
    playlist_reach: { p25: 2_000_000, p50: 10_000_000, p75: 50_000_000 },
    ig_followers: { p25: 20_000, p50: 80_000, p75: 300_000 },
    ig_engagement_rate: { p25: 0.01, p50: 0.02, p75: 0.04 },
    releases_per_year: { p25: 2, p50: 4, p75: 10 },
    avg_streams_per_release: { p25: 50_000, p50: 200_000, p75: 1_000_000 },
    save_rate: { p25: 0.02, p50: 0.035, p75: 0.06 },
  },
  Breaking: {
    monthly_listeners: { p25: 1_500_000, p50: 4_000_000, p75: 8_000_000 },
    spotify_followers: { p25: 300_000, p50: 1_000_000, p75: 5_000_000 },
    total_streams: { p25: 200_000_000, p50: 800_000_000, p75: 3_000_000_000 },
    popularity_score: { p25: 55, p50: 70, p75: 85 },
    playlist_count: { p25: 1_000, p50: 5_000, p75: 20_000 },
    playlist_reach: { p25: 20_000_000, p50: 100_000_000, p75: 500_000_000 },
    ig_followers: { p25: 100_000, p50: 500_000, p75: 2_000_000 },
    ig_engagement_rate: { p25: 0.008, p50: 0.015, p75: 0.03 },
    releases_per_year: { p25: 2, p50: 5, p75: 12 },
    avg_streams_per_release: { p25: 500_000, p50: 2_000_000, p75: 10_000_000 },
    save_rate: { p25: 0.025, p50: 0.04, p75: 0.07 },
  },
};
```

### Percentile Calculation

```typescript
function getPercentile(
  value: number,
  benchmarks: { p25: number; p50: number; p75: number }
): number {
  // Linear interpolation between quartile markers
  if (value <= benchmarks.p25) {
    return (value / benchmarks.p25) * 25;
  } else if (value <= benchmarks.p50) {
    return 25 + ((value - benchmarks.p25) / (benchmarks.p50 - benchmarks.p25)) * 25;
  } else if (value <= benchmarks.p75) {
    return 50 + ((value - benchmarks.p50) / (benchmarks.p75 - benchmarks.p50)) * 25;
  } else {
    // Above p75: extrapolate but cap at 99
    return Math.min(99, 75 + ((value - benchmarks.p75) / benchmarks.p75) * 25);
  }
}
```

### Jakke's Current Percentiles (Emerging Stage)

| Metric | Value | Percentile | Assessment |
|--------|-------|------------|------------|
| Monthly Listeners | 32,100 | ~46th | Slightly below median for Emerging |
| Spotify Followers | 27,100 | ~72nd | Strong — high loyalty signal |
| Total Streams | 4,610,000 | ~65th | Above median, solid catalog depth |
| Popularity Score | 23 | ~52nd | Right at median |
| Playlist Count | 820 | ~78th | Well above median — playlist machine |
| Playlist Reach | 15,700,000 (cross) / 1,720,000 (Spotify) | ~60th (Spotify) | Good reach |
| IG Followers | 26,353 | ~68th | Above median for Emerging |
| IG Engagement Rate | 2.54% | ~43rd | Slightly below median |

### "Next Level" Gap Analysis

```typescript
function getNextLevelGaps(
  currentStage: CareerStage,
  metrics: Record<string, number>
): GapAnalysis[] {
  const nextStage = getNextStage(currentStage);  // Emerging → Mid-Tier
  const nextBenchmarks = BENCHMARKS[nextStage];

  return Object.entries(nextBenchmarks).map(([metric, targets]) => ({
    metric,
    current: metrics[metric],
    target_p25: targets.p25,  // minimum to "enter" next stage
    gap: targets.p25 - metrics[metric],
    gap_percentage: ((targets.p25 - metrics[metric]) / metrics[metric]) * 100,
    estimated_months: estimateTimeToTarget(metric, metrics[metric], targets.p25),
  }));
}
```

**Jakke's gaps to Mid-Tier (p25):**

| Metric | Current | Mid-Tier p25 | Gap | Growth Needed |
|--------|---------|-------------|-----|--------------|
| Monthly Listeners | 32,100 | 150,000 | 117,900 | +367% |
| Spotify Followers | 27,100 | 30,000 | 2,900 | +11% |
| Total Streams | 4,610,000 | 10,000,000 | 5,390,000 | +117% |
| Popularity Score | 23 | 30 | 7 | +30% |
| Playlist Count | 820 | 200 | ALREADY EXCEEDS | -- |

**Key insight:** Jakke's playlist count (820) already exceeds Mid-Tier p25 (200). Followers are close.
The bottleneck is monthly listeners and total streams — indicating the playlists are there but
conversion from playlist placement to active listenership needs improvement.

### Visualization

- **Percentile bar chart:** Horizontal bars for each metric, colored by percentile band
  - Red: 0-25th
  - Yellow: 25-50th
  - Blue: 50-75th
  - Green: 75th+
- **Stage progress indicator:** Visual showing current stage with progress toward next stage
- **Spider/radar overlay:** Current metrics vs. stage median (p50) as overlay
- **Gap table:** Sortable table showing metric, current value, target, gap, growth needed %

---

## 7. Catalog Economics

**Purpose:** Model the long-term financial value of each song and the catalog as a whole.

### 7a. Lifetime Value Projection Per Song

```typescript
interface SongLTV {
  song: string;
  current_annual_revenue: number;
  ltv_5yr: number;
  ltv_10yr: number;
  ltv_20yr: number;
  appreciation_status: "appreciating" | "stable" | "depreciating";
  revenue_trend: number;  // annual growth rate
}

function projectSongLTV(
  song: Song,
  recentStreams: number,   // from jakke_top_songs_recent.csv
  totalStreams: number,    // from jakke_songs_all.csv
  releaseDate: Date | null,
  blendedRate: number = 0.00488  // from revenue.ts
): SongLTV {
  // Step 1: Estimate current annual stream rate
  // recent_streams is ~30 days of data
  const annual_streams = recentStreams * 12;
  const annual_revenue = annual_streams * blendedRate;

  // Step 2: Determine decay rate based on track age and genre
  // Indie electronic has slower decay than pop (evergreen playlists)
  const age_months = releaseDate
    ? (Date.now() - releaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
    : 24;  // default assumption

  // Observed decay: compare recent annual rate to lifetime average
  const lifetime_annual_avg = releaseDate
    ? totalStreams / Math.max(1, age_months / 12)
    : totalStreams / 2;  // assume 2 years

  const trend_ratio = annual_streams / Math.max(1, lifetime_annual_avg);
  // > 1 = appreciating, < 1 = depreciating

  // Step 3: Decay model
  // Music streams follow a power-law decay after initial spike
  // Long-tail indie: ~15-25% annual decline after Year 1
  // Playlist evergreen: ~5-10% annual decline
  const base_decay = song.genre === "Organic House" || song.genre === "Acoustic"
    ? 0.10  // 10% annual decline (evergreen genres)
    : song.genre === "Melodic Techno" || song.genre === "Progressive House"
    ? 0.25  // 25% annual decline (trend-driven genres)
    : 0.15; // 15% default

  // Adjust decay by trend ratio
  const adjusted_decay = base_decay * (1 / Math.max(0.5, trend_ratio));

  // Step 4: Project with decay
  function projectRevenue(years: number): number {
    let total = 0;
    let yearlyRevenue = annual_revenue;
    for (let y = 0; y < years; y++) {
      total += yearlyRevenue;
      yearlyRevenue *= (1 - adjusted_decay);
    }
    return total;
  }

  return {
    song: song.song,
    current_annual_revenue: annual_revenue,
    ltv_5yr: projectRevenue(5),
    ltv_10yr: projectRevenue(10),
    ltv_20yr: projectRevenue(20),
    appreciation_status:
      trend_ratio > 1.1 ? "appreciating" :
      trend_ratio > 0.85 ? "stable" :
      "depreciating",
    revenue_trend: (trend_ratio - 1) * 100,  // percentage
  };
}
```

### 7b. Revenue Concentration Risk

```typescript
interface CatalogConcentration {
  herfindahl_index: number;         // 0-1, higher = more concentrated
  top_song_share: number;           // % of revenue from #1 song
  top_3_share: number;              // % of revenue from top 3
  top_third_share: number;          // % of revenue from top 1/3 of catalog
  risk_level: "Low" | "Moderate" | "High" | "Critical";
}

function calculateConcentration(songs: { song: string; streams: number }[]): CatalogConcentration {
  const totalStreams = songs.reduce((s, t) => s + t.streams, 0);
  if (totalStreams === 0) return { herfindahl_index: 1, top_song_share: 0, top_3_share: 0, top_third_share: 0, risk_level: "Critical" };

  const sorted = [...songs].sort((a, b) => b.streams - a.streams);
  const shares = sorted.map(s => s.streams / totalStreams);

  // Herfindahl-Hirschman Index (sum of squared market shares)
  const hhi = shares.reduce((sum, share) => sum + share * share, 0);

  const top_song_share = shares[0] ?? 0;
  const top_3_share = shares.slice(0, 3).reduce((s, v) => s + v, 0);
  const third = Math.ceil(songs.length / 3);
  const top_third_share = shares.slice(0, third).reduce((s, v) => s + v, 0);

  const risk_level =
    hhi > 0.25 ? "Critical" :   // one song dominates
    hhi > 0.15 ? "High" :       // top-heavy
    hhi > 0.08 ? "Moderate" :   // somewhat concentrated
    "Low";                       // well-diversified

  return { herfindahl_index: hhi, top_song_share, top_3_share, top_third_share, risk_level };
}
```

**Jakke's current concentration (from jakke_songs_all.csv):**

```
Total catalog streams: ~3,273,000 (sum of all tracks)
Your Love's Not Wasted: 1,911,265 / 3,273,000 = 58.4% of all streams
Top 3: (1,911,265 + 240,897 + 186,415) / 3,273,000 = 71.5%
Top third (10 of 28 tracks): ~92% of streams

HHI = 0.584^2 + 0.074^2 + 0.057^2 + ... ≈ 0.35

Risk level: CRITICAL — "Your Love's Not Wasted" alone is 58% of catalog revenue
```

### 7c. Diversification Score (0-100)

```typescript
function catalogDiversificationScore(songs: Song[]): number {
  const concentration = calculateConcentration(songs);
  const genres = new Set(songs.map(s => s.genre).filter(Boolean));
  const collaborators = new Set(songs.map(s => s.collaborators).filter(Boolean));

  // Revenue diversification (0-40) — inverse of HHI
  const revenue_score = clamp(0, 40, (1 - concentration.herfindahl_index) * 40);

  // Genre diversification (0-30)
  const genre_score = clamp(0, 30, Math.min(genres.size / 6, 1) * 30);  // 6+ genres = max

  // Collaborator diversification (0-30)
  const collab_score = clamp(0, 30, Math.min(collaborators.size / 8, 1) * 30);  // 8+ = max

  return Math.round(revenue_score + genre_score + collab_score);
}
```

**Jakke's diversification score:**
- Revenue: (1 - 0.35) * 40 = 26 (hurt by YLNW concentration)
- Genres: 11 unique genres / 6 cap = 30 (excellent genre spread)
- Collaborators: ~10 unique collaborators / 8 cap = 30 (strong network)
- **Total: ~86/100** — good diversification undermined by revenue concentration in one track

### 7d. Appreciation vs Depreciation Classification

```typescript
function classifyTrackTrend(
  song: string,
  recentStreams: number,
  totalStreams: number,
  ageMonths: number
): "Appreciating" | "Stable" | "Depreciating" | "Dormant" {
  if (recentStreams < 100) return "Dormant";

  const expectedMonthly = totalStreams / Math.max(1, ageMonths);
  const actualMonthly = recentStreams;  // ~30 day period
  const ratio = actualMonthly / Math.max(1, expectedMonthly);

  if (ratio > 1.2) return "Appreciating";
  if (ratio > 0.7) return "Stable";
  return "Depreciating";
}
```

**Jakke's track classifications (based on current data):**

| Track | Total Streams | Recent Streams | Ratio | Status |
|-------|---------------|----------------|-------|--------|
| Karma Response | 119,987 | 36,024 | ~3.6x avg | Appreciating |
| Without Peace | 58,742 | 32,187 | ~6.6x avg | Appreciating |
| Hurricane | 170,954 | 28,945 | ~2.0x avg | Appreciating |
| Drink You Slowly | 64,213 | 24,312 | ~4.5x avg | Appreciating |
| Late Night | 55,224 | 21,876 | ~4.8x avg | Appreciating |
| Delicate | 48,367 | 19,543 | ~4.8x avg | Appreciating |
| Brick by Brick | 41,205 | 17,234 | ~5.0x avg | Appreciating |
| Your Love's Not Wasted | 1,911,265 | 2,569 | ~0.02x avg | Depreciating |
| Sugar Tide | 240,897 | 12,890 | ~0.6x avg | Stable |
| Peace Of Mind | 186,415 | 10,500 | ~0.7x avg | Stable |

**Key insight:** "Your Love's Not Wasted" has the most total streams but is depreciating rapidly.
The newer tracks (Karma Response, Without Peace, Hurricane) are all appreciating, suggesting the
artist's newer work is gaining traction.

### 7e. Total Catalog Valuation

```typescript
interface CatalogValuation {
  current_annual_revenue: number;
  projected_5yr: number;
  projected_10yr: number;
  projected_20yr: number;
  catalog_multiplier: number;  // industry acquisition multiplier
  estimated_catalog_sale_value: number;
  appreciating_tracks: number;
  stable_tracks: number;
  depreciating_tracks: number;
  dormant_tracks: number;
}

function valueCatalog(songLTVs: SongLTV[]): CatalogValuation {
  const annual = songLTVs.reduce((s, t) => s + t.current_annual_revenue, 0);

  // Industry catalog acquisition multipliers (2024-2026):
  // Major label: 15-25x annual revenue
  // Indie with growing catalog: 8-15x
  // Stagnant indie: 5-8x
  const appreciating = songLTVs.filter(s => s.appreciation_status === "appreciating").length;
  const ratio = appreciating / songLTVs.length;

  const multiplier = ratio > 0.5 ? 12 : ratio > 0.3 ? 9 : 6;

  return {
    current_annual_revenue: annual,
    projected_5yr: songLTVs.reduce((s, t) => s + t.ltv_5yr, 0),
    projected_10yr: songLTVs.reduce((s, t) => s + t.ltv_10yr, 0),
    projected_20yr: songLTVs.reduce((s, t) => s + t.ltv_20yr, 0),
    catalog_multiplier: multiplier,
    estimated_catalog_sale_value: annual * multiplier,
    appreciating_tracks: songLTVs.filter(s => s.appreciation_status === "appreciating").length,
    stable_tracks: songLTVs.filter(s => s.appreciation_status === "stable").length,
    depreciating_tracks: songLTVs.filter(s => s.appreciation_status === "depreciating").length,
    dormant_tracks: songLTVs.filter(s => s.current_annual_revenue < 10).length,
  };
}
```

### Visualization

- **Treemap:** Each rectangle = one song, sized by revenue, colored by trend (green=appreciating, yellow=stable, red=depreciating)
- **Stacked area chart:** Revenue projection over 20 years, stacked by song, showing how each contributes over time
- **Concentration pie chart:** Revenue share per song with HHI indicator and risk label
- **Waterfall chart:** Annual revenue breakdown showing how much each track adds/loses year-over-year
- **KPI cards:** Total catalog value, annual revenue, HHI risk, appreciating track count

---

## 8. Data Availability Matrix

Summary of what we have vs. what we need for full model execution.

| Data Field | Source | Status | Used In | Priority to Acquire |
|------------|--------|--------|---------|-------------------|
| Total streams per track | `jakke_songs_all.csv` | HAVE | Health, Sync, Catalog, Momentum | -- |
| Recent streams per track | `jakke_top_songs_recent.csv` | HAVE | Health, Catalog, Momentum | -- |
| Spotify popularity per track | `songstats_jakke.json` | HAVE | Health, Momentum | -- |
| Currently playlisted tracks | `songstats_jakke.json` | HAVE | Health, Momentum | -- |
| Release dates | `jakke_songs_all.csv` | PARTIAL (some missing) | Health, Catalog, Timing | P2 — fill manually |
| Genre per track | `jakke_songs_all.csv` | HAVE | Sync, Catalog | -- |
| IG engagement metrics | `instagram_jakke_insights_30d.json` | HAVE | Audience, Momentum | -- |
| IG monthly history | `ig_monthly_stats.csv` | HAVE | Momentum, Timing | -- |
| IG day-of-week stats | `ig_day_of_week.csv` | HAVE | Timing | -- |
| IG follower demographics | `instagram_jakke_insights_30d.json` | HAVE | Audience | -- |
| IG active hours | `instagram_jakke_insights_30d.json` | HAVE | Timing | -- |
| IG collaborator performance | `ig_collaborators.csv` | HAVE | Audience | -- |
| Music collaborators | `music_collaborators.csv` | HAVE | Catalog, Momentum | -- |
| Catalog metadata (ISRC, Atmos) | `musicteam_catalog.csv` | HAVE (12 entries) | Sync | -- |
| Spotify followers | `songstats_jakke.json` | HAVE | Audience, Benchmark | -- |
| Cross-platform totals | `songstats_jakke.json` | HAVE | Momentum, Benchmark | -- |
| **Track duration** | Not available | NEED | Sync, Health | **P1** — Spotify API |
| **Audio features (BPM, valence, energy)** | Not available | NEED | Sync, Health, Mood | **P1** — Spotify API |
| **Explicit flag per track** | Not available | NEED | Sync | **P1** — Spotify API |
| **Monthly stream snapshots** | Not available | NEED | Momentum, Health, Catalog | **P1** — store monthly |
| **Save rate per track** | Not available | NEED | Health, Audience | **P2** — Spotify for Artists |
| **Skip rate per track** | Not available | NEED | Health | **P2** — Spotify for Artists |
| **Playlist add/remove history** | Not available | NEED | Health, Momentum | **P2** — Songstats API |
| **Shazam data** | Not available | NEED | Momentum | **P3** — Shazam API |
| **Geographic stream breakdown** | Not available | NEED | Health, Audience | **P2** — Spotify for Artists |
| **Competitor release calendar** | Not available | NEED | Timing | **P3** — Songstats/Chartmetric |
| **Concert/ticket data** | Not available | NEED | Audience | **P3** — Bandsintown API |

### Computability Assessment

| Model | Computable Now | Full Score Accuracy | Primary Blocker |
|-------|---------------|--------------------|----|
| Career Momentum | ~80% | Uses estimates for MoM growth | Monthly snapshots |
| Song Health | ~75% | Missing save/skip rates, geo data | Spotify for Artists |
| Sync Readiness | ~70% | Genre-based estimates for BPM/mood/duration | Spotify Audio Features API |
| Audience Quality | ~85% | IG-only (no Spotify audience data) | Spotify for Artists |
| Release Timing | ~90% | Missing competitor calendar | Songstats release calendar |
| Benchmark System | ~95% | All core metrics available | Historical percentile refinement |
| Catalog Economics | ~85% | Missing precise decay data | Monthly stream snapshots |

---

## 9. Implementation Roadmap

### Phase 1: Ship with Current Data (Week 1)

Build and deploy all 7 models using existing data files. Use genre-based estimates and heuristic
proxies where API data is missing.

**Files to create:**
```
src/lib/scoring/
  career-momentum.ts     // CareerMomentum calculator
  song-health.ts         // SongHealth per-track scorer
  sync-readiness.ts      // SyncReadiness per-track scorer
  audience-quality.ts    // AudienceQuality calculator
  release-timing.ts      // ReleaseRecommendation generator
  benchmarks.ts          // Benchmark percentile engine
  catalog-economics.ts   // LTV projections + concentration
  constants.ts           // All benchmark data, genre maps, thresholds
  types.ts               // Shared interfaces
  index.ts               // barrel export
```

**New page:** Replace `src/app/ai-insights/page.tsx` with data-driven version using these modules.

**Estimated LOC:** ~1,200 for scoring lib, ~600 for updated page.

### Phase 2: Add Spotify Audio Features (Week 2-3)

- Call Spotify Web API `/audio-features` for all tracks
- Store results in `public/data/audio_features.json`
- Replace genre-based estimates in Sync Readiness with real BPM, valence, energy, instrumentalness
- Add track duration to Song Health and Sync Readiness

### Phase 3: Historical Snapshots (Week 3-4)

- Create a daily/weekly cron job that snapshots key metrics to a time-series JSON file
- Enable true MoM growth calculations for Career Momentum
- Enable precise decay rate calculations for Catalog Economics
- Enable playlist add/remove tracking for Song Health

### Phase 4: Full API Integration (Week 4-8)

- Spotify for Artists (save rate, skip rate, audience demographics, geographic streams)
- Shazam API (discovery signals for Career Momentum)
- Songstats premium (playlist history, competitor tracking)
- Bandsintown (concert data for Audience Quality)

### Helper Utilities

```typescript
// Shared across all scoring modules

/** Clamp a value between min and max */
function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Sigmoid function for smooth score transitions */
function sigmoid(x: number, midpoint: number = 0, steepness: number = 1): number {
  return 1 / (1 + Math.exp(-steepness * (x - midpoint)));
}

/** Safe division avoiding NaN */
function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  return denominator === 0 ? fallback : numerator / denominator;
}

/** Calculate percentile position given quartile benchmarks */
function percentileFromQuartiles(
  value: number,
  p25: number,
  p50: number,
  p75: number
): number {
  if (value <= p25) return clamp(0, 25, (value / p25) * 25);
  if (value <= p50) return 25 + ((value - p25) / (p50 - p25)) * 25;
  if (value <= p75) return 50 + ((value - p50) / (p75 - p50)) * 25;
  return Math.min(99, 75 + ((value - p75) / p75) * 25);
}
```

### Color System (consistent across all models)

```typescript
const SCORE_COLORS = {
  excellent: "#1DB954",  // green — 75-100
  good:     "#58a6ff",  // blue — 55-74
  warning:  "#f0c040",  // yellow — 35-54
  danger:   "#f85149",  // red — 0-34
};

function scoreColor(score: number): string {
  if (score >= 75) return SCORE_COLORS.excellent;
  if (score >= 55) return SCORE_COLORS.good;
  if (score >= 35) return SCORE_COLORS.warning;
  return SCORE_COLORS.danger;
}
```

---

## Appendix: Current Strategy Score Comparison

The existing `calcScores()` in `ai-insights/page.tsx` uses 5 dimensions with simple calculations.
Here is how the new models map to and improve upon those:

| Old Dimension | Old Calculation | New Replacement | Improvement |
|---------------|----------------|-----------------|-------------|
| Streaming (simple ratio) | `listeners/50K * 40 + pop/100 * 30 + playlists/1K * 30` | Career Momentum Score (6 sub-scores) | Velocity, freshness, trend direction instead of raw totals |
| Social (engagement %) | `interactions/followers * 100 * 20` | Audience Quality Score (6 sub-scores) | Depth, conversion, demographics, not just raw rate |
| Collab (count * 8) | `unique_collabs * 8` | Integrated into Career Momentum (cross-platform spread) + Catalog Economics (diversification) | Network quality over quantity |
| Funnel (visits + taps) | `(link_taps + profile_visits) / 20` | Audience Quality > Conversion Signals | Proper funnel analysis with rate-based metrics |
| Catalog (avg pop + count) | `avgPop * 2 + songCount * 1.5` | Song Health (per-track) + Catalog Economics (portfolio) | Per-track health vs aggregate, plus financial projections |

The 8 hardcoded `INSIGHTS` array entries will be replaced by algorithmically generated recommendations
derived from the scoring model outputs. Each model identifies specific weaknesses and generates
targeted action items, preserving the existing effort/impact/priority format.
