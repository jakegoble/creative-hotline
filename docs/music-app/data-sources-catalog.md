# Music Command Center — Data Sources Catalog

> Comprehensive catalog of every data source for music intelligence.
> Written 2026-02-26. Covers APIs, auth, rate limits, data freshness, cost, and what each source provides that we don't already have.

---

## Table of Contents

1. [Current Data Inventory](#1-current-data-inventory)
2. [Streaming Platform APIs](#2-streaming-platform-apis)
3. [Social Media APIs](#3-social-media-apis)
4. [Discovery & Playlist Intelligence](#4-discovery--playlist-intelligence)
5. [Radio Monitoring](#5-radio-monitoring)
6. [Sync & Licensing Platforms](#6-sync--licensing-platforms)
7. [Financial & Distribution](#7-financial--distribution)
8. [Live & Touring](#8-live--touring)
9. [Industry Intelligence Platforms](#9-industry-intelligence-platforms)
10. [Email & CRM](#10-email--crm)
11. [Press & Media Monitoring](#11-press--media-monitoring)
12. [Metadata & Identity](#12-metadata--identity)
13. [Data Pipeline Architecture](#13-data-pipeline-architecture)
14. [Stream Normalization Model](#14-stream-normalization-model)
15. [Priority Implementation Roadmap](#15-priority-implementation-roadmap)

---

## 1. Current Data Inventory

What we already have in `/public/data/` (static CSV/JSON files, no live APIs):

| File | Data | Source |
|------|------|--------|
| `jakke_songs_all.csv` | 12 tracks: song, listeners, streams, saves, release_date, artist, collaborators, popularity, genre | Manual / Spotify for Artists export |
| `jakke_top_songs_recent.csv` | Recent streaming counts per track | Manual export |
| `songstats_jakke.json` | Spotify stats (3.32M streams, 32.1K monthly listeners, 27.1K followers, 84 playlists, 1.72M playlist reach), cross-platform totals (4.61M streams, 142K followers, 820 playlists, 15.7M reach, 640 radio plays), track popularity scores, top playlists | Songstats export |
| `songstats_enjune.json` | Same structure for Enjune project | Songstats export |
| `artist_profiles.json` | Bio, genres, social links, collaborator list, performance KPIs for Jakke + Enjune | Manual |
| `musicteam_catalog.csv` | 12 recordings + 12 works: ISRC, ISWC, writers, Stereo/Atmos status, type | Manual catalog management |
| `ig_*.csv` (6 files) | Instagram: yearly/monthly stats, top posts, collaborators, content type performance, day-of-week | Manual scrape / Instagram insights export |
| `instagram_jakke_insights_30d.json` | 30-day IG insights: views, reach, interactions, demographics, messaging stats | Instagram Insights export |
| `music_collaborators.csv` | Collaborator names, track count, role, total/avg streams | Manual |

### What's Missing (Gaps driving this research)

- **No live API connections** — all data is manually exported snapshots
- **No time-series history** — can't see trends over time (streams/day, listeners/week)
- **No Apple Music data** — zero visibility into ~15% of estimated streams
- **No YouTube analytics** — missing music video views, watch time, subscriber data
- **No TikTok data** — no visibility into viral potential or sound usage
- **No Shazam data** — can't see discovery signals
- **No actual revenue data** — only estimates using assumed per-stream rates
- **No playlist addition/removal tracking** — only current snapshot
- **No geographic streaming data** — don't know where listeners are by platform
- **No real-time alerts** — no notifications for playlist adds, viral spikes, press mentions
- **No release-day analytics** — can't compare first-week performance across releases
- **No sync/licensing tracking** — no visibility into placements
- **No live performance data** — no ticket sales, attendance, booking history

---

## 2. Streaming Platform APIs

### 2.1 Spotify Web API

| Field | Details |
|-------|---------|
| **URL** | `https://api.spotify.com/v1/` |
| **Docs** | https://developer.spotify.com/documentation/web-api |
| **Auth** | OAuth 2.0 (Authorization Code flow for user data, Client Credentials for public catalog data) |
| **Rate Limits** | ~180 requests/minute (rolling window). 429 responses include `Retry-After` header. No published hard limit — Spotify uses adaptive rate limiting based on app usage patterns |
| **Cost** | Free. Requires approved app in Spotify Developer Dashboard. Extended Quota Mode requires submission for apps serving >10K users |
| **Data Freshness** | Real-time for catalog/search. Popularity scores update every few hours. Follower counts near-real-time |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /v1/artists/{id}` | Name, followers, genres, images, popularity (0-100) | **Partial** — we have popularity but not live |
| `GET /v1/artists/{id}/albums` | Full discography with release dates, markets, album type | **YES** — full album/single/compilation breakdown |
| `GET /v1/artists/{id}/top-tracks` | Top 10 tracks by market with preview URLs | **Partial** — we have this data but static |
| `GET /v1/artists/{id}/related-artists` | 20 related artists with their metrics | **YES** — competitor/similar artist mapping |
| `GET /v1/audio-features/{id}` | Danceability, energy, key, loudness, tempo, valence, acousticness, instrumentalness, liveness, speechiness | **YES** — entire audio analysis layer |
| `GET /v1/audio-analysis/{id}` | Detailed audio segments, beats, bars, tatums, sections with confidence scores | **YES** — deep music analysis |
| `GET /v1/search` | Search catalog by artist/track/album/playlist | Utility |
| `GET /v1/playlists/{id}` | Playlist details, tracks, follower count, description | **YES** — live playlist monitoring |
| `GET /v1/playlists/{id}/tracks` | Full track listing with added_at timestamps | **YES** — playlist addition date tracking |
| `GET /v1/tracks/{id}` | Track metadata, popularity, explicit flag, markets | **Partial** — live popularity updates |
| `GET /v1/me/player/recently-played` | User's recent listening (requires user auth) | N/A for artist analytics |

**What this unlocks that we don't have:**
- Live popularity score tracking (currently static snapshot)
- Audio features for entire catalog (danceability, energy, tempo, key)
- Related artist discovery and competitive mapping
- Live playlist follower counts for playlist tracking
- Full discography management (albums, singles, compilations, markets)

**Implementation notes:**
- Need TWO Spotify artist IDs: one for Jakke, one for Enjune
- Client Credentials flow sufficient for all catalog/artist endpoints
- Audio Features endpoint is being deprecated in some regions — monitor status
- Popularity score refreshes every ~24hrs, based on recent play velocity

---

### 2.2 Spotify for Artists (Private Analytics)

| Field | Details |
|-------|---------|
| **URL** | No public API |
| **Auth** | Login-gated dashboard only |
| **Rate Limits** | N/A |
| **Cost** | Free (artist must claim profile) |
| **Data Freshness** | ~48 hour delay for streams, real-time for some metrics |

**Data available (dashboard only, no API):**

| Metric | Granularity | New for Us? |
|--------|-------------|-------------|
| Daily streams per track | Daily, 7/28/90/365/lifetime | **YES** — time-series streaming data |
| Listener demographics (age, gender) | Aggregate | **YES** |
| Geographic breakdown (city, country) | Per track, per time period | **YES** |
| Source of streams (playlist, artist page, search, etc.) | Per track | **YES** |
| Playlist additions/removals | Real-time | **YES** |
| Save rate (saves / streams) | Per track | **YES** |
| Spotify Canvas/video views | Per track | **YES** |
| Upcoming releases schedule | N/A | Already managed manually |

**How to access programmatically:**
- **Songstats API** (see Section 9.3) — official Spotify for Artists data partner, exposes most of this via API
- **Chartmetric** (see Section 9.1) — aggregates Spotify for Artists data
- **Manual CSV export** — Spotify for Artists allows CSV download of streaming history

**Implementation approach:** Use Songstats or Chartmetric API as proxy. Do NOT scrape the Spotify for Artists dashboard.

---

### 2.3 Apple Music API / MusicKit

| Field | Details |
|-------|---------|
| **URL** | `https://api.music.apple.com/v1/` |
| **Docs** | https://developer.apple.com/documentation/applemusicapi |
| **Auth** | Developer Token (JWT signed with MusicKit private key from Apple Developer account). User Token required for personalized data (Apple Music Connect for Artists analytics) |
| **Rate Limits** | Not publicly documented. Observed: ~200 requests/minute. Responses include rate limit headers |
| **Cost** | Requires Apple Developer Program ($99/year). API itself is free |
| **Data Freshness** | Catalog data: near real-time. Charts: daily. Analytics (Apple Music for Artists): ~48hr delay |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /v1/catalog/{storefront}/artists/{id}` | Artist profile, genres, albums | **YES** — Apple Music presence |
| `GET /v1/catalog/{storefront}/artists/{id}/albums` | Full Apple Music discography | **YES** |
| `GET /v1/catalog/{storefront}/songs/{id}` | Track metadata, ISRC, preview, artwork | **Partial** — enriches catalog |
| `GET /v1/catalog/{storefront}/charts` | Top charts by genre/storefront | **YES** — chart position tracking |
| `GET /v1/catalog/{storefront}/search` | Cross-catalog search | Utility |
| `GET /v1/me/library/` | User's library (requires user auth) | N/A |

**Apple Music for Artists (Analytics):**
- Like Spotify for Artists: login-gated dashboard, no public API
- Provides: plays, listeners, Shazams, radio spins, purchase data, geographic breakdown
- **Shazam data is exclusive to Apple Music for Artists** (Apple acquired Shazam in 2018)
- Access via Chartmetric or Songstats as proxy

**What this unlocks:**
- Apple Music catalog presence and availability by storefront (country)
- Chart positions on Apple Music charts
- ISRC cross-referencing for catalog management
- Shazam discovery data (via Apple Music for Artists dashboard or Chartmetric)

---

### 2.4 YouTube Data API v3 / YouTube Analytics API

| Field | Details |
|-------|---------|
| **URL** | `https://www.googleapis.com/youtube/v3/` (Data API), `https://youtubeanalytics.googleapis.com/v2/` (Analytics API) |
| **Docs** | https://developers.google.com/youtube/v3 |
| **Auth** | API Key (public data), OAuth 2.0 (channel owner analytics) |
| **Rate Limits** | 10,000 units/day quota (free). Each endpoint costs different units: search = 100 units, video details = 1 unit, channel stats = 1 unit |
| **Cost** | Free tier: 10,000 units/day. Additional quota: apply to Google (no standard pricing, evaluated case-by-case). For our use case, 10K units/day is sufficient |
| **Data Freshness** | Public data: near real-time. Analytics: 1-2 day delay. Revenue data: 2-3 day delay |

**Key Endpoints (Data API v3):**

| Endpoint | Units | Data | New for Us? |
|----------|-------|------|-------------|
| `GET /channels?id={id}` | 1 | Subscriber count, view count, video count, description | **YES** — YouTube channel metrics |
| `GET /search?channelId={id}` | 100 | Find all videos on a channel | **YES** |
| `GET /videos?id={id}` | 1 | View count, like count, comment count, duration, tags, description | **YES** — per-video analytics |
| `GET /videos?chart=mostPopular` | 1 | Trending videos by region/category | **YES** — trending detection |
| `GET /playlistItems?playlistId={id}` | 1 | Videos in a playlist (uploads = channel's upload playlist) | Utility |

**Key Endpoints (Analytics API — requires channel owner OAuth):**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /reports?dimensions=day` | Daily views, watch time, subscribers gained/lost | **YES** — YouTube time-series |
| `GET /reports?dimensions=country` | Geographic breakdown of views | **YES** |
| `GET /reports?dimensions=video` | Per-video analytics | **YES** |
| `GET /reports?dimensions=deviceType` | Device breakdown (mobile, desktop, TV) | **YES** |
| `GET /reports?dimensions=trafficSource` | How viewers find videos (search, suggested, external, etc.) | **YES** |
| `GET /reports?metrics=estimatedRevenue` | Actual YouTube ad revenue | **YES** — real revenue data |

**What this unlocks:**
- Music video view counts, engagement rates, comment sentiment
- YouTube subscriber growth tracking
- Actual YouTube ad revenue (not estimates)
- Traffic source analysis (YouTube search, suggested videos, external links)
- Geographic view distribution
- Watch time and audience retention data

**Implementation notes:**
- Need YouTube channel ID for Jakke
- Data API (API key) for public stats; Analytics API (OAuth) for revenue/demographics
- Search endpoint is expensive (100 units) — cache results, use playlist listing instead
- Daily quota resets at midnight Pacific Time

---

### 2.5 Amazon Music

| Field | Details |
|-------|---------|
| **URL** | No public API for artist analytics |
| **Auth** | N/A |
| **Cost** | N/A |
| **Data Freshness** | N/A |

**Status:** Amazon Music does NOT provide a public API for artist analytics or streaming data. Amazon Music for Artists (launched 2019) has a dashboard but no API access.

**How to get Amazon Music data:**
- **Chartmetric** — tracks Amazon Music chart positions and playlist placements
- **Songstats** — pulls some Amazon Music data
- **DistroKid / distributor dashboard** — shows Amazon Music streams in royalty reports
- **Manual export** — Amazon Music for Artists dashboard allows CSV export

**What Amazon Music data would give us:**
- Stream counts on Amazon Music (est. 5% of Jake's total streams)
- Alexa voice request data (unique to Amazon)
- Amazon Music playlist placements
- Chart positions on Amazon Music charts

---

### 2.6 Tidal

| Field | Details |
|-------|---------|
| **URL** | `https://openapi.tidal.com/v2/` |
| **Docs** | https://developer.tidal.com/ |
| **Auth** | OAuth 2.0 (Client Credentials for catalog, Authorization Code for user data) |
| **Rate Limits** | Varies by endpoint. Catalog: ~60 req/min. Documented in response headers |
| **Cost** | Free developer access for catalog endpoints. Artist analytics requires Tidal for Artists claim |
| **Data Freshness** | Catalog: real-time. Analytics: not available via API |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /artists/{id}` | Artist profile, image, popularity | **YES** |
| `GET /artists/{id}/albums` | Tidal discography | **YES** |
| `GET /tracks/{id}` | Track metadata, ISRC, quality tiers (HiFi, MQA, Atmos) | **YES** — Dolby Atmos availability confirmation |
| `GET /search` | Cross-catalog search | Utility |

**What this unlocks:**
- Tidal catalog presence verification
- Dolby Atmos / MQA availability status per track (relevant — catalog shows Atmos support)
- Tidal premium tier per-stream rates ($0.013, highest of any platform)

**Limitations:** No streaming analytics API. Use Chartmetric/Songstats for Tidal streaming data.

---

### 2.7 Deezer API

| Field | Details |
|-------|---------|
| **URL** | `https://api.deezer.com/` |
| **Docs** | https://developers.deezer.com/api |
| **Auth** | OAuth 2.0 for user data. Public endpoints (artist/track/album) require no auth |
| **Rate Limits** | 50 requests per 5 seconds (per IP). Documented |
| **Cost** | Free |
| **Data Freshness** | Near real-time for catalog data |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /artist/{id}` | Name, fans (followers), albums count, picture | **YES** — Deezer fan count |
| `GET /artist/{id}/top` | Top 5 tracks with rank | **YES** |
| `GET /artist/{id}/albums` | Full Deezer discography | **YES** |
| `GET /artist/{id}/related` | Similar artists | **YES** |
| `GET /track/{id}` | BPM, duration, rank, ISRC, preview | **YES** — BPM data |
| `GET /chart` | Global charts | **YES** |
| `GET /search` | Search across catalog | Utility |

**What this unlocks:**
- Deezer fan count (unique metric)
- BPM data per track (Deezer provides this; useful for DJ/playlist curation analysis)
- Deezer chart positions
- Related artist discovery from another algorithm's perspective

**Implementation notes:**
- No auth needed for public endpoints — easiest API to integrate
- Rate limit is per-IP, not per-app — be careful in serverless environments
- Fan count is Deezer's equivalent of Spotify followers

---

### 2.8 SoundCloud API

| Field | Details |
|-------|---------|
| **URL** | `https://api.soundcloud.com/` (legacy), `https://api-v2.soundcloud.com/` (unofficial) |
| **Docs** | https://developers.soundcloud.com/ |
| **Auth** | OAuth 2.0. New app registrations have been closed/reopened intermittently since 2017 |
| **Rate Limits** | 15,000 requests/day (when API access is granted) |
| **Cost** | Free (when accessible) |
| **Data Freshness** | Near real-time |

**Status:** SoundCloud's API has been in a semi-frozen state since ~2017. New app registrations are periodically closed. The official API (v1) is deprecated. The unofficial v2 API is used by many tools but not officially supported.

**Key Endpoints (when accessible):**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /users/{id}` | Followers, track count, description, city | **Partial** — we have some SoundCloud data via Songstats |
| `GET /users/{id}/tracks` | All tracks with play count, like count, repost count, comment count, download count | **YES** — SoundCloud-specific engagement |
| `GET /tracks/{id}` | Play count, like count, waveform data, genre tags | **YES** |
| `GET /users/{id}/playlists` | User's playlists | **YES** |

**What this unlocks:**
- SoundCloud play counts, reposts, comments per track
- SoundCloud follower growth (if we can access the API)
- Download counts (unique to SoundCloud)
- Waveform data for visual embedding

**Implementation approach:**
- Try to register for official API access
- If unavailable, use Songstats/Chartmetric as proxy for SoundCloud data
- Do NOT use the unofficial v2 API in production (can break without notice)

---

### 2.9 Bandcamp

| Field | Details |
|-------|---------|
| **URL** | No public API |
| **Auth** | N/A |
| **Cost** | N/A |
| **Data Freshness** | N/A |

**Status:** Bandcamp does NOT have a public API. They had a very limited API for label/artist accounts that was deprecated.

**How to get Bandcamp data:**
- **Manual export** — Bandcamp for Artists dashboard shows sales, plays, fan data
- **Bandcamp sales notifications** — email webhooks (parse purchase confirmation emails)
- **Chartmetric** — does NOT track Bandcamp
- **Web scraping** — Bandcamp pages are relatively scrapable (public sales counts, tags) but against ToS

**What Bandcamp data would give us:**
- Direct sales revenue (Bandcamp takes 15% cut vs streaming's fraction-of-a-cent)
- Fan email collection (Bandcamp collects emails on purchase)
- Geographic distribution of purchasers
- Merch sales data (if selling merch through Bandcamp)

**Priority:** LOW for Jake/Jakke (electronic/house music ecosystem is more streaming-focused than Bandcamp-focused). Would be higher priority for indie rock/punk artists.

---

## 3. Social Media APIs

### 3.1 Instagram Graph API

| Field | Details |
|-------|---------|
| **URL** | `https://graph.instagram.com/` (Basic Display), `https://graph.facebook.com/v19.0/` (Graph API via Meta) |
| **Docs** | https://developers.facebook.com/docs/instagram-api |
| **Auth** | OAuth 2.0 via Meta (Facebook) Login. Requires Meta App, Facebook Page linked to IG Business/Creator account |
| **Rate Limits** | 200 calls/user/hour (Graph API). 240 calls/user/hour (Basic Display). Sliding window |
| **Cost** | Free |
| **Data Freshness** | Insights: ~15 minute delay. Profile data: near real-time. Media: near real-time |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /{user-id}?fields=biography,followers_count,follows_count,media_count` | Profile stats | **Partial** — we have static snapshot |
| `GET /{user-id}/media?fields=timestamp,media_type,like_count,comments_count,caption,permalink` | All media with engagement | **Partial** — we have CSV export, API gives live data |
| `GET /{user-id}/insights?metric=impressions,reach,profile_views&period=day` | Account-level daily insights | **YES** — live time-series |
| `GET /{media-id}/insights?metric=engagement,impressions,reach,saved` | Per-post insights | **YES** — saves data, impressions |
| `GET /{user-id}/insights?metric=audience_city,audience_country,audience_gender_age` | Follower demographics | **Partial** — we have static snapshot |
| `GET /{user-id}/insights?metric=follower_count&period=day` | Daily follower count changes | **YES** — follower growth tracking |
| `GET /{user-id}/stories` | Active stories with engagement | **YES** |
| `GET /{ig-media-id}?fields=children` | Carousel slides data | **YES** |

**What this unlocks vs current static data:**
- Live engagement tracking (not just CSV snapshots)
- Daily follower growth/loss trend
- Story performance metrics (views, replies, exits, taps)
- Saves per post (high-signal engagement metric)
- Impression and reach data per post
- Reel play counts and shares
- Automated data collection replacing manual exports

**Implementation notes:**
- Requires Facebook Developer App with `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement` permissions
- Long-lived tokens last 60 days — need refresh flow
- Carousel/Reel insights only available for Business/Creator accounts
- 30-day data retention window for some insights metrics — must poll and store regularly

---

### 3.2 TikTok Creator API (Content Posting API / Research API)

| Field | Details |
|-------|---------|
| **URL** | `https://open.tiktokapis.com/v2/` |
| **Docs** | https://developers.tiktok.com/doc/overview |
| **Auth** | OAuth 2.0 (Login Kit). Creator must authorize the app |
| **Rate Limits** | Varies by endpoint: 100-600 requests/minute depending on scope. Research API: 1000 queries/day |
| **Cost** | Free. Research API requires academic/business application |
| **Data Freshness** | Near real-time for public data. Analytics: 1-2 day delay |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /user/info/` | Follower count, following count, likes count, video count, bio | **YES** — entire TikTok presence |
| `GET /video/list/` | User's videos with view count, like count, comment count, share count | **YES** |
| `POST /research/video/query/` | Search public videos by keyword, sound, hashtag | **YES** — sound usage tracking |
| `POST /research/video/comments/` | Comments on videos | **YES** |
| `GET /video/query/` | Video details including sound/music used | **YES** — track how Jake's music is used on TikTok |

**What this unlocks (entirely new data category):**
- TikTok sound usage tracking — how many videos use Jake's music
- Viral detection — spikes in sound usage
- TikTok follower count and engagement rates
- Video performance metrics (views, likes, shares, comments)
- Hashtag and trend analysis for music marketing

**Critical for music artists because:**
- TikTok drives the majority of viral music discovery in 2025-2026
- A single TikTok trend can multiply Spotify streams 10-100x
- Sound usage count is the leading indicator of viral potential

**Implementation notes:**
- Creator API requires the artist to authorize via TikTok login
- Research API requires separate application with business justification
- Sound usage tracking is the highest-value data point — this tells us when a track is trending on TikTok before it hits streaming spikes

---

### 3.3 Twitter/X API v2

| Field | Details |
|-------|---------|
| **URL** | `https://api.x.com/2/` |
| **Docs** | https://developer.x.com/en/docs/x-api |
| **Auth** | OAuth 2.0 (PKCE) or OAuth 1.0a. API Key + Bearer Token for app-level access |
| **Rate Limits** | Free: 1,500 tweets read/month (effectively useless). Basic ($200/mo): 10,000 tweets/month. Pro ($5,000/mo): 1M tweets/month |
| **Cost** | Free tier: 1,500 read + 1,500 write/month. **Basic: $200/month.** Pro: $5,000/month |
| **Data Freshness** | Real-time (streaming endpoints available on Pro tier) |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /users/{id}` | Follower count, tweet count, description | **YES** |
| `GET /users/{id}/tweets` | User's tweets with engagement | **YES** |
| `GET /tweets/search/recent` | Search mentions of artist/tracks | **YES** — brand monitoring |
| `GET /tweets/counts/recent` | Volume of tweets mentioning a keyword | **YES** — buzz tracking |

**What this unlocks:**
- Twitter/X follower tracking
- Mention monitoring (fans, press, playlist curators talking about Jake's music)
- Buzz volume around releases

**Recommendation:** SKIP for now. The $200/month Basic tier is expensive for limited value. Jake's audience is IG/TikTok-centric, not Twitter-centric. Revisit if/when Twitter presence grows. Use Chartmetric's social tracking instead (includes Twitter data in their aggregation).

---

### 3.4 Facebook Pages API

| Field | Details |
|-------|---------|
| **URL** | `https://graph.facebook.com/v19.0/` |
| **Docs** | https://developers.facebook.com/docs/pages-api |
| **Auth** | OAuth 2.0 (same Meta app as Instagram). Page Access Token required |
| **Rate Limits** | 200 calls/user/hour, 4800 calls/user/24hours |
| **Cost** | Free |
| **Data Freshness** | Near real-time |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /{page-id}?fields=fan_count,followers_count` | Page likes and followers | **YES** |
| `GET /{page-id}/insights` | Page views, post reach, engagement | **YES** |
| `GET /{page-id}/posts` | All posts with engagement metrics | **YES** |

**Recommendation:** LOW PRIORITY. Facebook Pages are declining in relevance for music artists. Only integrate if Jake has an active Facebook Page. The same Meta Developer App used for Instagram gives Facebook access too, so marginal additional effort.

---

## 4. Discovery & Playlist Intelligence

### 4.1 Shazam (via Apple)

| Field | Details |
|-------|---------|
| **URL** | No public API for artist analytics. Limited catalog API at `https://www.shazam.com/services/` (undocumented) |
| **Auth** | N/A for analytics |
| **Cost** | N/A |
| **Data Freshness** | Shazam charts update daily |

**Status:** Apple acquired Shazam in 2018. Shazam data is available through:
1. **Apple Music for Artists dashboard** — shows Shazam count per track, geographic breakdown
2. **Chartmetric API** — exposes Shazam chart positions and historical Shazam counts
3. **Songstats** — includes Shazam data in their aggregation

**What Shazam data gives us:**
- Shazam count per track (leading indicator of organic discovery)
- Geographic hotspots where people are Shazaming the music
- Shazam-to-stream conversion rate (how many Shazams lead to actual streams)
- Early detection of sync placements (spikes in Shazams from a geographic area = likely TV/film/ad placement)

**Implementation:** Access via Chartmetric API (Section 9.1) or Songstats API (Section 9.3).

---

### 4.2 Spotify Playlist Tracking

No dedicated API — this is a derived capability built on top of the Spotify Web API.

**Approach:**
1. Use `GET /v1/search?type=playlist&q={track_name}` to find playlists containing Jake's tracks
2. Use `GET /v1/playlists/{id}` to get playlist follower counts
3. Poll daily to detect additions and removals
4. Track follower count changes over time for each playlist

**Better approach:** Use Chartmetric or Songstats, which already do this tracking continuously.

**What this data gives us:**
- Playlist add/removal dates with timestamps
- Playlist follower count trend (is the playlist growing or dying?)
- Playlist curator identification (who added the track?)
- Algorithmic vs editorial vs user-generated playlist classification
- Estimated stream contribution per playlist

---

### 4.3 Spotify Algorithmic Signals

These are derived metrics, not a separate API:

| Signal | How to Detect | Source |
|--------|--------------|--------|
| Discover Weekly placement | Poll Spotify's public Discover Weekly playlists (impractical at scale) | Chartmetric tracks this |
| Release Radar appearance | Same as above | Chartmetric |
| Popularity score spike | Track via `GET /v1/artists/{id}` daily | Spotify Web API |
| Save-to-stream ratio | Spotify for Artists or distributor analytics | Manual or Songstats |
| Skip rate | Spotify for Artists only | No API access |
| Radio seeding | Spotify for Artists only | No API access |

---

## 5. Radio Monitoring

### 5.1 RadioTracker / Mediabase

| Field | Details |
|-------|---------|
| **URL** | No public API |
| **Provider** | Luminate (formerly MRC/Nielsen, owns Mediabase) |
| **Auth** | Enterprise license required |
| **Cost** | $5,000-$50,000+/year depending on scope |
| **Data Freshness** | Previous day's spins available next morning |

**Status:** Mediabase is the industry standard for radio airplay tracking in the US. It monitors ~2,000 US radio stations and detects songs via audio fingerprinting.

**What it provides:**
- Spin count per station, per day
- Audience impressions per spin
- Market-by-market radio performance
- Chart positions (Billboard uses Luminate/Mediabase data)

**How to access for indie artists:**
- **Chartmetric** includes some radio tracking data
- **Songstats** reports radio play counts (640 radio plays shown in current data)
- **PlayMPE** — radio promotion service that provides tracking
- Direct Mediabase license is cost-prohibitive for indie artists

**Recommendation:** Access radio data through Chartmetric or Songstats. Do NOT pursue a direct Mediabase license.

---

### 5.2 BDS (Broadcast Data Systems)

| Field | Details |
|-------|---------|
| **URL** | No public API |
| **Provider** | Luminate (same parent as Mediabase) |
| **Cost** | Enterprise pricing |

**Status:** BDS tracks radio airplay internationally. Same parent company as Mediabase. Access through Chartmetric/Songstats aggregation.

---

## 6. Sync & Licensing Platforms

### 6.1 Musicbed

| Field | Details |
|-------|---------|
| **URL** | No public API for artist analytics |
| **Portal** | https://www.musicbed.com/ (artist dashboard) |
| **Cost** | Free to submit; Musicbed takes a licensing fee cut |
| **Data** | License count, earnings, usage by project type (film, commercial, etc.) |

**Status:** Dashboard-only access. No API. Would need manual export or email parsing for licensing notifications.

---

### 6.2 Artlist

| Field | Details |
|-------|---------|
| **URL** | No public API for artist analytics |
| **Portal** | https://www.artlist.io/ |
| **Cost** | Artist receives flat fee per track accepted + usage royalties |
| **Data** | Download count, earnings, geographic usage |

**Status:** No API. Dashboard access only. Artlist uses a subscription model so artist analytics are limited.

---

### 6.3 Epidemic Sound

| Field | Details |
|-------|---------|
| **URL** | No public artist analytics API |
| **Portal** | https://www.epidemicsound.com/ |
| **Cost** | Artists receive royalties based on usage |
| **Data** | Track usage in YouTube/podcast/social content |

**Status:** No API. Dashboard access only.

---

### 6.4 Songtradr

| Field | Details |
|-------|---------|
| **URL** | `https://api.songtradr.com/` (B2B licensing API, not artist analytics) |
| **Docs** | https://docs.songtradr.com/ |
| **Auth** | API Key |
| **Cost** | Free for artist submissions; Songtradr takes commission on licenses |
| **Data** | Licensing opportunities, sync placements, earnings |

**What Songtradr's API provides:**
- Music catalog management (upload, tag, organize)
- Auto-tagging (genre, mood, tempo via AI)
- Licensing opportunity matching
- Earnings tracking

**Note:** Songtradr acquired Bandcamp in 2023, potentially giving more data access in the future.

---

### Sync Licensing Summary

**Recommendation:** For now, track sync/licensing earnings manually or via distributor reports. The sync market is fragmented with no unified API. Consider building a simple licensing tracker in the app where Jake can manually log placements from Musicbed, Artlist, etc. This becomes a data entry feature rather than an API integration.

---

## 7. Financial & Distribution

### 7.1 DistroKid Analytics

| Field | Details |
|-------|---------|
| **URL** | No public API |
| **Portal** | https://distrokid.com/ (dashboard) |
| **Cost** | $22.99/year (Musician plan) — $35.99/year (Musician Plus) |
| **Data Freshness** | Revenue data: 2-4 week delay (platform-dependent). Stream counts: varies by platform |

**What DistroKid provides (dashboard only):**
- Per-platform stream counts (Spotify, Apple Music, Amazon, YouTube Music, Tidal, Deezer, etc.)
- Revenue per platform per track
- Geographic breakdown of streams
- Trending tracks
- Splits/collaborator payments
- ISRC management
- Release scheduling

**How to access programmatically:**
- **CSV export** — DistroKid allows manual CSV downloads of streaming/revenue data
- **DistroKid Stats page** — has a "Download All Data" button
- **No API** — DistroKid has explicitly stated they have no plans for a public API
- **Potential:** Parse DistroKid email notifications (daily/weekly stats emails)

**What this gives us that estimates can't:**
- **Actual revenue numbers** instead of our blended-rate estimates ($0.004-$0.013 range)
- Per-platform stream counts (we currently estimate 60% Spotify, 15% Apple, etc.)
- Real geographic data per platform
- Exact split payments between collaborators

**Implementation approach:**
- Build a CSV import feature in the app (drag-and-drop DistroKid CSV upload)
- Parse the DistroKid CSV format (columns: Reporting Date, Sale Period, Store, Artist, Title, ISRC, UPC, Quantity, Per-Unit, Currency, Revenue)
- Replace estimate-based revenue calculations with actual data where available

---

### 7.2 TuneCore

| Field | Details |
|-------|---------|
| **URL** | No public API |
| **Portal** | https://www.tunecore.com/ |
| **Cost** | $9.99/single/year, $29.99/album/year (Classic), or $14.99-$49.99/month (Unlimited) |

**Status:** Similar to DistroKid — dashboard with CSV export, no API. TuneCore is owned by Believe Music, which has enterprise APIs but not for individual artists.

**Relevance:** Only relevant if Jake uses TuneCore as a distributor (currently appears to use DistroKid based on catalog data patterns). Note for completeness.

---

### 7.3 CD Baby

| Field | Details |
|-------|---------|
| **URL** | No public API |
| **Portal** | https://cdbaby.com/ |
| **Cost** | $9.95/single, $29/album (one-time) |

**Status:** Similar to above. Downtown Music (parent) has enterprise APIs. Not relevant unless Jake uses CD Baby.

---

### 7.4 ASCAP / BMI / SESAC (Performance Rights)

| Field | Details |
|-------|---------|
| **URLs** | ASCAP: https://www.ascap.com/ | BMI: https://www.bmi.com/ | SESAC: https://www.sesac.com/ |
| **API** | ASCAP ACE database has a limited search: `https://www.ascap.com/repertory` BMI Repertoire search: `https://repertoire.bmi.com/` Neither has a proper REST API |
| **Auth** | Member login for earnings; public search for repertoire |
| **Cost** | Free membership for songwriters |
| **Data Freshness** | Royalty statements: quarterly (3-9 month delay from performance date) |

**What PRO data provides:**
- Performance royalty earnings (radio, TV, live venue, streaming mechanical)
- Work registration confirmations
- Songwriter/publisher splits verification
- International collection reporting (via reciprocal agreements)

**How to access:**
- **ASCAP Member Access portal** — quarterly statements with CSV export
- **BMI Online Services** — similar quarterly reporting
- **Both have public repertoire search** — can verify work registrations
- **No REST APIs** — manual export only

**What this unlocks:**
- Actual performance royalty income (separate from streaming revenue)
- Verification that all works are properly registered
- International royalty collection visibility

**Implementation approach:** Build a royalty import feature (CSV upload from ASCAP/BMI quarterly statements). This is separate from streaming revenue — it's the publishing/performance side.

---

### 7.5 SoundExchange (Digital Performance Royalties)

| Field | Details |
|-------|---------|
| **URL** | https://www.soundexchange.com/ |
| **API** | No public API |
| **Auth** | Member portal login |
| **Cost** | Free registration |
| **Data Freshness** | Quarterly distributions, ~6 month delay |

**What SoundExchange provides:**
- Digital performance royalties for sound recordings (non-interactive streams: Pandora, SiriusXM, internet radio)
- Not the same as Spotify/Apple Music mechanical royalties
- Pays both artist (45%) and rights holder (50%), with 5% to backup musicians/vocalists

**Relevance:** Medium. If Jake's music plays on Pandora, SiriusXM, or internet radio stations, SoundExchange collects and distributes those royalties. The 640 radio plays shown in Songstats data suggest there IS radio play activity.

---

### 7.6 Merch Platforms (Shopify / Bandcamp)

**Shopify API:**

| Field | Details |
|-------|---------|
| **URL** | `https://{store}.myshopify.com/admin/api/2024-01/` |
| **Auth** | Custom App with Admin API access token |
| **Rate Limits** | Standard: 2 requests/second, Plus: 4/second. Burst: 40 requests/bucket (leaky bucket) |
| **Cost** | Shopify: $39-$399/month. API access: free with store |
| **Data Freshness** | Real-time |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /orders.json` | All orders with customer info, items, revenue | **YES** — merch revenue |
| `GET /products.json` | Product catalog, inventory, pricing | **YES** |
| `GET /customers.json` | Customer list, order history, total spend | **YES** — fan purchase behavior |
| `GET /reports.json` | Sales reports by product, geography, time | **YES** |
| `GET /analytics/` | Store analytics, conversion rates | **YES** |

**What merch data unlocks:**
- Total merch revenue alongside streaming revenue
- Fan geography from shipping addresses
- Product performance (what merch sells best)
- Customer lifetime value across music + merch

**Relevance:** Only if Jake has a Shopify store. If not, note for future.

---

## 8. Live & Touring

### 8.1 Bandsintown API

| Field | Details |
|-------|---------|
| **URL** | `https://rest.bandsintown.com/artists/` |
| **Docs** | https://artists.bandsintown.com/ (Manager API) |
| **Auth** | API Key (app_id parameter) |
| **Rate Limits** | Not publicly documented. Observed: ~120 requests/minute |
| **Cost** | Free (public artist events endpoint). Manager API requires verified artist claim |
| **Data Freshness** | Real-time for event listings. RSVP counts near real-time |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /artists/{name}?app_id={key}` | Artist profile, tracker (follower) count, upcoming event count, image | **YES** — Bandsintown follower count |
| `GET /artists/{name}/events?app_id={key}` | Upcoming and past events with venue, date, lineup, ticket links, RSVP count | **YES** — live show calendar |
| `GET /artists/{name}/events?date=past` | Past events | **YES** — touring history |

**What this unlocks:**
- Live show calendar in the app
- RSVP/tracker counts per show
- Touring history and geographic reach
- Venue data (capacity, location)
- Bandsintown follower count (separate from Spotify/IG followers)

---

### 8.2 Songkick API

| Field | Details |
|-------|---------|
| **URL** | `https://api.songkick.com/api/3.0/` |
| **Docs** | https://www.songkick.com/developer |
| **Auth** | API Key |
| **Rate Limits** | Not publicly documented |
| **Cost** | Free (requires application approval) |
| **Data Freshness** | Real-time for event listings |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /artists/{id}/calendar.json` | Upcoming events | Same as Bandsintown |
| `GET /artists/{id}/gigography.json` | Past events (complete touring history) | **YES** — historical tour data |
| `GET /events/{id}.json` | Event details with venue capacity, lineup | **YES** |
| `GET /search/artists.json?query={name}` | Artist search | Utility |

**Note:** Songkick was acquired by Warner Music Group in 2020. API access may be more restricted. Bandsintown is the safer bet for live data.

---

### 8.3 Pollstar

| Field | Details |
|-------|---------|
| **URL** | No public API |
| **Cost** | Subscription: $499-$999+/year |

**Status:** Pollstar is the industry standard for touring data (box office grosses, ticket prices, venue data). No public API — enterprise access only. Not worth the cost for an indie artist dashboard.

---

### 8.4 SeatGeek API

| Field | Details |
|-------|---------|
| **URL** | `https://api.seatgeek.com/2/` |
| **Auth** | API Key (client_id) |
| **Rate Limits** | 1000 requests/day (free tier) |
| **Cost** | Free |
| **Data Freshness** | Real-time for listings |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /events?performers.slug={artist}` | Events with ticket prices, venue, date | **YES** — secondary market ticket data |
| `GET /performers?slug={artist}` | Artist profile, score, event count | **YES** |

**What this unlocks:**
- Secondary market ticket prices (supply/demand indicator)
- SeatGeek performer score (popularity metric)

---

## 9. Industry Intelligence Platforms

These are the highest-value integrations — they aggregate data from dozens of individual sources into unified APIs.

### 9.1 Chartmetric API

| Field | Details |
|-------|---------|
| **URL** | `https://api.chartmetric.com/api/` |
| **Docs** | https://api.chartmetric.com/apidoc/ |
| **Auth** | Bearer Token (refresh token flow — POST to `/api/token` with refresh_token) |
| **Rate Limits** | Varies by plan: Free: 500 req/day. Pro: 5,000 req/day. Enterprise: 50,000+ req/day |
| **Cost** | **Free tier: limited.** **Pro: $160/month** (billed annually at $1,920/year) or $200/month monthly. Enterprise: custom |
| **Data Freshness** | Daily updates for most metrics. Some charts update hourly |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /artist/{id}/stat/spotify` | Spotify followers, listeners, popularity over time | **YES** — time-series Spotify data |
| `GET /artist/{id}/stat/applemusic` | Apple Music plays, chart positions | **YES** — Apple Music data |
| `GET /artist/{id}/stat/youtube` | YouTube views, subscribers over time | **YES** — YouTube time-series |
| `GET /artist/{id}/stat/shazam` | Shazam count over time | **YES** — Shazam discovery data |
| `GET /artist/{id}/stat/tiktok` | TikTok sound usage, video count | **YES** — TikTok data |
| `GET /artist/{id}/stat/instagram` | IG follower count over time | **YES** — IG time-series |
| `GET /artist/{id}/stat/deezer` | Deezer fan count over time | **YES** |
| `GET /artist/{id}/stat/soundcloud` | SoundCloud follower/play history | **YES** |
| `GET /artist/{id}/spotify-playlist-history` | Complete playlist add/remove history | **YES** — playlist intelligence |
| `GET /artist/{id}/spotify-playlist-current` | Current playlist placements | **Partial** — we have snapshot |
| `GET /track/{id}/stat/spotify` | Track-level Spotify stats over time | **YES** |
| `GET /artist/{id}/charts` | Chart positions across all charts globally | **YES** |
| `GET /artist/{id}/related-artists` | Similar/related artists with metrics | **YES** |
| `GET /artist/{id}/fan-metrics` | Cross-platform audience demographics | **YES** |
| `GET /artist/{id}/albums` | Full discography metadata | **Partial** |
| `GET /chart/{type}/{id}` | Chart data (Spotify viral, Apple Music, Shazam, etc.) | **YES** |

**What Chartmetric uniquely provides:**
- **Time-series data across ALL platforms** (the single biggest gap in our current app)
- **Playlist intelligence** — every playlist add/remove with dates, curator info, playlist follower history
- **Cross-platform correlation** — see how a TikTok trend affects Spotify streams
- **Competitive analysis** — compare Jake's metrics to any other artist
- **Geographic hotspots** — where is the music growing fastest
- **Chart tracking** — positions on 30+ chart types globally
- **Audience overlap** — find artists with similar fan bases

**This is the single most impactful integration for the Music Command Center. Chartmetric replaces the need for individual integrations with 10+ platforms.**

---

### 9.2 Soundcharts

| Field | Details |
|-------|---------|
| **URL** | `https://api.soundcharts.com/api/v2.25/` |
| **Docs** | https://doc.soundcharts.com/ |
| **Auth** | API Key (x-app-id + x-api-key headers) |
| **Rate Limits** | Varies by plan. Pro: ~1,000 requests/day |
| **Cost** | **Starts at ~$150/month** (Indie plan). Pro: ~$300/month. Enterprise: custom |
| **Data Freshness** | Daily for most metrics. Playlist tracking: multiple times per day |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /artist/{uuid}/streaming/spotify/listening` | Spotify listeners over time | Same as Chartmetric |
| `GET /artist/{uuid}/social/overview` | Cross-platform social stats | Same as Chartmetric |
| `GET /artist/{uuid}/playlist/current` | Current playlist placements | Same as Chartmetric |
| `GET /artist/{uuid}/playlist/past` | Historical playlist data | Same as Chartmetric |
| `GET /artist/{uuid}/audience` | Audience demographics | Same as Chartmetric |
| `GET /artist/{uuid}/chart` | Chart positions | Same as Chartmetric |

**Comparison vs Chartmetric:** Similar data coverage. Soundcharts has slightly better radio tracking in Europe. Chartmetric has better TikTok and Shazam integration. For a US-based indie electronic artist, Chartmetric is the better choice.

**Recommendation:** Choose Chartmetric OR Soundcharts, not both. They largely overlap.

---

### 9.3 Songstats

| Field | Details |
|-------|---------|
| **URL** | `https://api.songstats.com/` |
| **Docs** | https://api.songstats.com/docs |
| **Auth** | API Key (Bearer token) |
| **Rate Limits** | 100 requests/minute (standard), 1000/minute (enterprise) |
| **Cost** | **Free tier: limited (artist profile only).** **Pro: $9.99/month** per artist. Enterprise: custom |
| **Data Freshness** | Daily for streaming. Playlist tracking: multiple times per day |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /artists/{id}/stats` | Cross-platform stats overview | **Partial** — we have static export |
| `GET /artists/{id}/historic` | Historical stats over time | **YES** — time-series |
| `GET /artists/{id}/playlists` | Current + historical playlist data | **YES** |
| `GET /artists/{id}/tracks` | Per-track stats | **Partial** |
| `GET /artists/{id}/milestones` | Significant milestones (1M streams, etc.) | **YES** |

**Important context:** We already use Songstats data (our `songstats_jakke.json` and `songstats_enjune.json` files are Songstats exports). Upgrading to API access would give us live data instead of manual exports.

**Comparison vs Chartmetric:**
- Songstats: cheaper ($9.99/mo vs $160/mo), simpler API, good for individual artist tracking
- Chartmetric: vastly more data (TikTok, Shazam, charts, competitive analysis, demographics), better for intelligence

**Recommendation:** If budget is tight, start with Songstats Pro ($9.99/mo) for live streaming data. Upgrade to Chartmetric ($160/mo) when the app needs competitive analysis, TikTok tracking, and audience demographics.

---

### 9.4 Viberate

| Field | Details |
|-------|---------|
| **URL** | `https://api.viberate.com/` (limited public access) |
| **Docs** | https://www.viberate.com/analytics |
| **Auth** | API Key |
| **Rate Limits** | Not publicly documented |
| **Cost** | Pro: ~$19.90/month. Enterprise: custom |
| **Data Freshness** | Daily |

**What Viberate provides:** Similar to Chartmetric/Soundcharts but with a stronger focus on electronic music and live events. Has good Beatport chart tracking (relevant for Jakke's genre).

**Recommendation:** Consider Viberate as an alternative to Chartmetric if the electronic music / Beatport focus is valued. However, Chartmetric's broader data coverage is generally more useful.

---

### 9.5 MusicBrainz API

| Field | Details |
|-------|---------|
| **URL** | `https://musicbrainz.org/ws/2/` |
| **Docs** | https://musicbrainz.org/doc/MusicBrainz_API |
| **Auth** | None required. Custom User-Agent header required |
| **Rate Limits** | 1 request/second (strict). Must include contact info in User-Agent |
| **Cost** | Free (open source, community maintained) |
| **Data Freshness** | Community-edited, varies. Core data very accurate |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /artist/{mbid}?inc=releases` | Artist with full release discography | **YES** — canonical metadata |
| `GET /release/{mbid}?inc=recordings+artist-credits` | Release details with all tracks | **YES** |
| `GET /recording/{mbid}?inc=isrcs` | Recording with ISRC codes | **Partial** — enriches catalog |
| `GET /artist/{mbid}?inc=url-rels` | All linked URLs (Spotify, Apple, Discogs, Wikidata, etc.) | **YES** — cross-platform ID mapping |
| `GET /artist/{mbid}?inc=artist-rels` | Collaborator relationships | **Partial** — enriches collaborator data |

**What this unlocks:**
- Canonical metadata source (MusicBrainz is the authority for music metadata)
- Cross-platform ID mapping (MBID to Spotify ID, Apple Music ID, Discogs ID, etc.)
- Complete discography with accurate release dates
- ISRC/ISWC verification against authoritative source
- Genre/tag data from community
- Collaborator relationship mapping

**Critical for:** Catalog page enrichment and cross-platform ID resolution.

---

### 9.6 Discogs API

| Field | Details |
|-------|---------|
| **URL** | `https://api.discogs.com/` |
| **Docs** | https://www.discogs.com/developers |
| **Auth** | OAuth 1.0a or Personal Access Token |
| **Rate Limits** | Authenticated: 60 requests/minute. Unauthenticated: 25 requests/minute |
| **Cost** | Free |
| **Data Freshness** | Community-maintained; data lags real-time by days to weeks |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /artists/{id}` | Artist profile, aliases, groups, members, images | **YES** — Discogs presence |
| `GET /artists/{id}/releases` | Full discography with labels, formats, year | **YES** — physical release tracking |
| `GET /releases/{id}` | Detailed release info, tracklist, credits, labels, formats | **YES** |
| `GET /database/search` | Search across Discogs database | Utility |
| `GET /marketplace/stats/{id}` | Marketplace stats (lowest/median/highest price for vinyl/CD) | **YES** — physical media valuation |

**What this unlocks:**
- Physical release tracking (vinyl, CD pressings)
- Label association data
- Detailed credits (producer, engineer, mastering, etc.)
- Marketplace value of physical releases
- Genre classification from the Discogs community (very granular for electronic music)

---

## 10. Email & CRM

### 10.1 Mailchimp API

| Field | Details |
|-------|---------|
| **URL** | `https://{dc}.api.mailchimp.com/3.0/` |
| **Docs** | https://mailchimp.com/developer/marketing/api/ |
| **Auth** | API Key (Basic auth with `anystring:{api_key}`) |
| **Rate Limits** | 10 concurrent connections. Max 10 requests/second |
| **Cost** | Free: up to 500 contacts, 1,000 sends/month. Standard: $13-$350/month based on contacts |
| **Data Freshness** | Real-time |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /lists/{id}/members` | Subscriber list with email, status, location, engagement score | **YES** — fan email list |
| `GET /reports/{id}` | Campaign open rate, click rate, bounce rate, unsubscribes | **YES** — email performance |
| `GET /reports/{id}/click-details` | Which links were clicked | **YES** |
| `GET /lists/{id}/growth-history` | Subscriber growth over time | **YES** — list growth trend |
| `GET /lists/{id}/locations` | Geographic distribution of subscribers | **YES** — fan geography |
| `GET /lists/{id}/segments` | Audience segments | **YES** |

**What this unlocks:**
- Fan email list size and growth
- Email engagement metrics (open rates, click rates for music releases)
- Fan geography from email list
- Campaign performance for release announcements

---

### 10.2 ConvertKit (Kit) API

| Field | Details |
|-------|---------|
| **URL** | `https://api.convertkit.com/v3/` (being rebranded as Kit) |
| **Docs** | https://developers.convertkit.com/ |
| **Auth** | API Key or API Secret |
| **Rate Limits** | 120 requests/minute |
| **Cost** | Free: up to 10,000 subscribers. Creator: $29/month. Creator Pro: $59/month |
| **Data Freshness** | Real-time |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /subscribers` | Subscriber list with tags, created date | **YES** |
| `GET /sequences/{id}/subscribers` | Subscribers in a specific email sequence | **YES** |
| `GET /tags` | All tags (used for segmentation) | **YES** |
| `GET /forms/{id}/subscriptions` | Form conversion data | **YES** |
| `GET /broadcasts/stats` | Broadcast (campaign) performance | **YES** |

**Relevance:** Only if Jake uses ConvertKit/Kit for fan email. If using Mailchimp, skip this.

---

## 11. Press & Media Monitoring

### 11.1 Hype Machine

| Field | Details |
|-------|---------|
| **URL** | `https://api.hypem.com/v2/` |
| **Auth** | API Key (limited access) |
| **Rate Limits** | Not publicly documented |
| **Cost** | Free (limited API) |
| **Data Freshness** | Real-time blog aggregation |

**Key Endpoints:**

| Endpoint | Data | New for Us? |
|----------|------|-------------|
| `GET /artists/{name}/tracks` | Tracks that have been blogged about | **YES** — blog coverage |
| `GET /tracks/{id}` | Blog post count, loved count | **YES** |
| `GET /popular` | Currently popular tracks in blogosphere | **YES** |

**What this unlocks:**
- Music blog coverage tracking
- Blog buzz metrics
- Discovery of new blog features

**Status note:** Hype Machine's influence has declined significantly since its peak in 2010-2015. Less relevant for electronic music discovery in 2026, but still a signal.

---

### 11.2 Google News API / NewsAPI

**Google Custom Search API (for news):**

| Field | Details |
|-------|---------|
| **URL** | `https://www.googleapis.com/customsearch/v1` |
| **Auth** | API Key + Custom Search Engine ID |
| **Rate Limits** | 100 queries/day (free). $5 per 1,000 queries after |
| **Cost** | Free: 100 queries/day. Paid: $5/1,000 queries |

**NewsAPI.org:**

| Field | Details |
|-------|---------|
| **URL** | `https://newsapi.org/v2/` |
| **Auth** | API Key |
| **Rate Limits** | Free: 100 requests/day, 1 month old articles max. Business: 250,000 requests/month |
| **Cost** | Free (limited). Business: $449/month |

**What this unlocks:**
- Press mention monitoring (articles mentioning Jakke, Enjune, Jake Goble)
- Music publication coverage tracking (Pitchfork, Resident Advisor, DJ Mag, etc.)
- Release review detection

**Recommendation:** Use the free tier of Google Custom Search or NewsAPI to do a daily scan for artist mentions. 100 queries/day is sufficient for monitoring one artist.

---

### 11.3 Google Alerts / Mention.com

**Google Alerts:** Free, email-based. Set up alerts for "Jakke music", "Enjune music", "Jake Goble". Parse emails for links.

**Mention.com API:**

| Field | Details |
|-------|---------|
| **URL** | `https://api.mention.com/api/` |
| **Auth** | OAuth 2.0 |
| **Cost** | Solo: $49/month. Pro: $99/month |
| **Data** | Social + web mentions, sentiment analysis, geographic breakdown |

**Recommendation:** Start with free Google Alerts. Upgrade to Mention.com only if press monitoring becomes a priority.

---

## 12. Metadata & Identity

### 12.1 ISRC Lookup

| Field | Details |
|-------|---------|
| **URL** | `https://isrcsearch.ifpi.org/` (IFPI ISRC search portal — web only, no API) |
| **Alternatives** | MusicBrainz API (has ISRC data), Spotify API (returns ISRC in track metadata), Gracenote |
| **Auth** | N/A (web portal) or per-API auth |
| **Cost** | Free |

**What ISRC data provides:**
- Unique recording identifier verification
- Cross-platform track matching (same ISRC = same recording on Spotify, Apple, YouTube, etc.)
- Deduplication of catalog entries
- Royalty tracking anchor

**We already have ISRCs** in `musicteam_catalog.csv`. Use MusicBrainz or Spotify API to verify and cross-reference.

---

### 12.2 ISWC Lookup

| Field | Details |
|-------|---------|
| **URL** | `https://iswcnet.cisac.org/` (CISAC ISWC database — web only) |
| **Auth** | N/A |
| **Cost** | Free |

**What ISWC data provides:**
- Unique composition (work) identifier
- Links the underlying composition to all recordings of it
- Publishing rights verification

**We already have ISWCs** in `musicteam_catalog.csv`. Use for verification.

---

### 12.3 Gracenote (Nielsen)

| Field | Details |
|-------|---------|
| **URL** | Enterprise API only (acquired by Nielsen/Luminate) |
| **Auth** | Enterprise license |
| **Cost** | Enterprise pricing ($10K+/year) |

**Status:** Gracenote is the backbone of music recognition (used by car infotainment, smart speakers, etc.). Not accessible for indie artist dashboards. Data available indirectly through Chartmetric.

---

### 12.4 Beatport API

| Field | Details |
|-------|---------|
| **URL** | No public API for artist analytics. Catalog search available at `https://www.beatport.com/` |
| **Auth** | N/A |
| **Cost** | N/A |

**What Beatport data would provide:**
- DJ chart positions (critical for electronic music)
- Genre-specific ranking (Organic House, Melodic House, etc.)
- Beatport Top 100 placement
- DJ support tracking

**How to access:** Chartmetric and Viberate track Beatport chart positions. No direct API.

**Relevance:** HIGH for Jakke specifically. Beatport is the primary marketplace for electronic music DJs. Chart positions here directly influence DJ pickups and club play.

---

## 13. Data Pipeline Architecture

### Scheduling Tiers

#### Hourly (real-time-ish monitoring)
| Data Source | Endpoint | Reason |
|-------------|----------|--------|
| Spotify Web API | Artist popularity, follower count | Detect sudden spikes (playlist feature, viral moment) |
| Chartmetric | Playlist additions/removals | Time-sensitive — playlist adds drive immediate stream spikes |
| TikTok (if integrated) | Sound usage count | Viral detection — TikTok trends move in hours |

#### Daily (main analytics refresh)
| Data Source | Endpoint | Reason |
|-------------|----------|--------|
| Chartmetric/Songstats | All streaming stats, chart positions | Core metrics. Most platforms update daily |
| Instagram Graph API | Follower count, post insights | Daily cadence is sufficient |
| YouTube Data API | Channel stats, video view counts | YouTube data updates daily |
| Deezer API | Fan count, track ranks | Daily is sufficient |
| Bandsintown API | Event listings | Shows don't change more than daily |
| MusicBrainz | Catalog verification | Low-frequency check |
| Google News/NewsAPI | Artist mention scan | Daily press check |

#### Weekly (deep analytics)
| Data Source | Endpoint | Reason |
|-------------|----------|--------|
| Chartmetric | Competitive analysis, audience demographics | Demographics don't change fast |
| Spotify Web API | Audio features for new tracks | Only when new releases |
| Discogs API | Catalog sync, marketplace stats | Physical media changes slowly |
| Email (Mailchimp/Kit) | List growth, campaign performance | Weekly digest is sufficient |

#### Monthly (financial reconciliation)
| Data Source | Endpoint | Reason |
|-------------|----------|--------|
| DistroKid CSV import | Revenue data, per-platform streams | Revenue reports have 2-4 week delay |
| ASCAP/BMI portal | Performance royalty statements | Quarterly, check monthly |
| SoundExchange | Digital performance royalties | Quarterly |

### Real-Time Alert Triggers

| Event | Detection Method | Alert Priority |
|-------|-----------------|----------------|
| **Playlist addition (major)** | Chartmetric playlist tracking — new playlist with >50K followers | HIGH |
| **Playlist removal (major)** | Same — removed from playlist with >50K followers | HIGH |
| **Viral spike** | Spotify popularity score jumps >5 points in a day, OR stream velocity doubles vs 7-day avg | HIGH |
| **TikTok trend** | Sound usage count increases >200% in 24hrs | HIGH |
| **Shazam spike** | Shazam count increases >300% in 24hrs (indicates sync placement) | HIGH |
| **Press mention** | Google News/NewsAPI finds article mentioning artist | MEDIUM |
| **Chart entry** | Chartmetric detects new chart position | MEDIUM |
| **Milestone** | Total streams crosses round number (5M, etc.) | LOW |
| **New release detected** | Spotify Web API shows new release not in our catalog | MEDIUM |
| **Follower milestone** | Any platform crosses round number | LOW |

### Pipeline Architecture Diagram

```
                     ┌─────────────────────────────────────────┐
                     │            SCHEDULER (cron)              │
                     │  Hourly │ Daily │ Weekly │ Monthly       │
                     └────┬────┴───┬───┴────┬───┴─────┬────────┘
                          │        │        │         │
              ┌───────────▼────────▼────────▼─────────▼──────────┐
              │              INGESTION LAYER                       │
              │                                                    │
              │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
              │  │ Chartmetric│ │ Spotify  │ │ YouTube  │          │
              │  │ Client    │ │ Client   │ │ Client   │ ...      │
              │  └─────┬─────┘ └─────┬────┘ └────┬─────┘          │
              │        │             │           │                 │
              │        ▼             ▼           ▼                 │
              │  ┌──────────────────────────────────────┐         │
              │  │        NORMALIZATION LAYER            │         │
              │  │  - Platform → canonical schema        │         │
              │  │  - Stream normalization (see §14)     │         │
              │  │  - Deduplication by ISRC              │         │
              │  │  - Timestamp standardization (UTC)    │         │
              │  └─────────────┬────────────────────────┘         │
              └────────────────┼──────────────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────────────────────────┐
              │              STORAGE LAYER                          │
              │                                                     │
              │  ┌────────────────┐  ┌─────────────────────┐       │
              │  │  Time-Series DB │  │   Relational DB      │       │
              │  │  (daily metrics) │  │   (catalog, config)  │       │
              │  └────────┬───────┘  └──────────┬──────────┘       │
              │           │                     │                   │
              │  ┌────────▼─────────────────────▼──────────┐       │
              │  │           CACHE LAYER                     │       │
              │  │  Redis / in-memory for dashboard KPIs     │       │
              │  └────────────────┬──────────────────────────┘      │
              └───────────────────┼────────────────────────────────┘
                                  │
                                  ▼
              ┌────────────────────────────────────────────────────┐
              │              ALERT ENGINE                           │
              │                                                     │
              │  Compare new data vs thresholds & historical avg    │
              │  If triggered → push notification / email / webhook │
              └──────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
              ┌────────────────────────────────────────────────────┐
              │              NEXT.JS API ROUTES                     │
              │                                                     │
              │  GET /api/streaming     → streaming page data       │
              │  GET /api/catalog       → catalog + metadata        │
              │  GET /api/revenue       → financial rollup          │
              │  GET /api/social        → IG + TikTok + YT          │
              │  GET /api/playlists     → playlist intelligence     │
              │  GET /api/alerts        → recent alerts             │
              │  GET /api/competitors   → competitive analysis      │
              │  GET /api/sync          → trigger manual refresh    │
              └────────────────────────────────────────────────────┘
```

### Recommended Database

For a Next.js app, the simplest production-ready setup:

| Component | Recommendation | Why |
|-----------|---------------|-----|
| **Primary DB** | PostgreSQL (via Supabase or Neon) | Free tier, SQL, time-series via `timescaledb` extension, works with Prisma |
| **Cache** | Vercel KV (Redis) or in-memory | Dashboard KPIs need sub-100ms response |
| **File Storage** | Vercel Blob or S3 | For CSV imports (DistroKid data) |
| **Job Scheduler** | Vercel Cron (free) or Inngest | Trigger daily/hourly data fetches |

---

## 14. Stream Normalization Model

### The Problem

A "stream" means different things on different platforms:

| Platform | What Counts as a "Stream" | Min Duration |
|----------|--------------------------|-------------|
| Spotify | Must play for 30+ seconds | 30s |
| Apple Music | Must play for 30+ seconds (with some exceptions) | 30s |
| YouTube Music | Must play for 30+ seconds | 30s |
| YouTube (video) | Varies — generally any view counts, but monetized views require 30s+ | ~30s for monetization |
| Tidal | Must play for 30+ seconds | 30s |
| Deezer | Must play for 30+ seconds | 30s |
| Amazon Music | Must play for 30+ seconds | 30s |
| SoundCloud | Must play past the first second (effectively any play) | ~1s |
| Pandora | Any play (non-interactive radio) | N/A |

### Normalization Formula

We define a **Normalized Stream Unit (NSU)** to compare across platforms:

```
NSU = raw_stream_count * platform_weight
```

| Platform | Weight | Rationale |
|----------|--------|-----------|
| Spotify | 1.00 | Baseline — most transparent counting |
| Apple Music | 1.00 | Same 30s threshold |
| YouTube Music | 1.00 | Same 30s threshold |
| YouTube (video) | 0.50 | Video views have lower intent than music-only streams |
| Tidal | 1.00 | Same 30s threshold |
| Deezer | 1.00 | Same 30s threshold |
| Amazon Music | 1.00 | Same 30s threshold |
| SoundCloud | 0.33 | Much lower threshold (~1s), many casual/accidental plays |
| Pandora | 0.75 | Non-interactive (user didn't choose the song) |

### Revenue-Weighted Stream Equivalent (RWSE)

For revenue comparisons, normalize by per-stream rate:

```
RWSE = raw_streams * (platform_rate / spotify_rate)
```

Example: 1,000 Tidal streams at $0.013/stream = 3,250 Spotify-equivalent streams at $0.004/stream.

This lets us answer: "What's the Spotify-equivalent stream count that would generate the same revenue?"

### Combined Platform Reporting

For dashboard KPIs, report three numbers:

1. **Raw Total Streams** — sum of all platform streams (what we show now: 4.61M)
2. **Normalized Stream Units (NSU)** — quality-adjusted total
3. **Revenue-Equivalent Streams** — revenue-normalized to Spotify baseline

---

## 15. Priority Implementation Roadmap

### Phase 1: Foundation (Week 1-2) — Cost: ~$10/month

| Integration | Source | Effort | Impact | Cost |
|-------------|--------|--------|--------|------|
| **Songstats API** | Live streaming data replacing static JSON | Low (already have data format) | HIGH — instant live data | $9.99/mo |
| **Spotify Web API** | Audio features, related artists, live popularity | Low (well-documented, free) | HIGH — catalog enrichment | Free |
| **DistroKid CSV Import** | Real revenue data replacing estimates | Medium (build file upload + parser) | HIGH — accurate financials | Free |
| **MusicBrainz API** | Canonical metadata, ISRC verification | Low (free, simple REST) | Medium — data integrity | Free |

### Phase 2: Social + Discovery (Week 3-4) — Cost: ~$10/month

| Integration | Source | Effort | Impact | Cost |
|-------------|--------|--------|--------|------|
| **Instagram Graph API** | Live IG data replacing CSV snapshots | Medium (OAuth flow, token refresh) | HIGH — automates manual process | Free |
| **YouTube Data API** | Video metrics, channel stats | Low (API key auth, generous free quota) | HIGH — missing data category | Free |
| **Deezer API** | Fan count, BPM data, related artists | Low (no auth for public data) | Medium — minor enrichment | Free |
| **Bandsintown API** | Live show calendar | Low (API key, simple REST) | Medium — new feature | Free |

### Phase 3: Intelligence Layer (Week 5-8) — Cost: ~$160/month

| Integration | Source | Effort | Impact | Cost |
|-------------|--------|--------|--------|------|
| **Chartmetric API** | Time-series across ALL platforms, playlist intel, competitive analysis, TikTok, Shazam, charts | High (complex API, many endpoints) | **TRANSFORMATIVE** — replaces 10+ individual integrations | $160/mo |
| **Alert Engine** | Real-time notifications for playlist adds, viral spikes, press mentions | Medium (build threshold + notification system) | HIGH — proactive intelligence | Free (infra cost only) |
| **Discogs API** | Physical release tracking, marketplace data | Low (simple REST, free) | Low — nice to have | Free |

### Phase 4: Advanced (Month 2-3) — Cost: ~$160/month + infra

| Integration | Source | Effort | Impact | Cost |
|-------------|--------|--------|--------|------|
| **YouTube Analytics API** | Actual YouTube revenue, demographics, traffic sources | Medium (OAuth flow with channel owner) | HIGH — real revenue data | Free |
| **TikTok Creator API** | Sound usage tracking, video metrics | Medium (OAuth, application process) | HIGH — viral detection | Free |
| **NewsAPI / Google Alerts** | Press mention monitoring | Low (API key, daily cron) | Medium — brand awareness | Free |
| **Email CRM API** | Fan list analytics | Low (depending on provider) | Medium — CRM integration | Free (Mailchimp) |

### Cost Summary

| Phase | Monthly Cost | Cumulative |
|-------|-------------|------------|
| Phase 1 | ~$10 | $10/mo |
| Phase 2 | ~$0 (free APIs) | $10/mo |
| Phase 3 | ~$160 (Chartmetric) | $170/mo |
| Phase 4 | ~$0 (free APIs) | $170/mo |

**Ongoing cost at full build: approximately $170/month** (Songstats Pro + Chartmetric Pro). This gives comprehensive coverage of streaming, social, discovery, playlists, charts, competitive analysis, TikTok, Shazam, and radio across 20+ platforms.

---

## Appendix A: API Authentication Quick Reference

| API | Auth Type | Token Lifetime | Refresh Flow |
|-----|-----------|---------------|-------------|
| Spotify Web API | OAuth 2.0 Client Credentials | 1 hour | Auto-refresh with client_id + client_secret |
| Apple Music API | JWT Developer Token | Up to 6 months | Generate new JWT with MusicKit private key |
| YouTube Data API | API Key | Permanent | N/A |
| YouTube Analytics | OAuth 2.0 | 1 hour | Refresh token (offline access) |
| Instagram Graph API | OAuth 2.0 (Meta) | 60 days (long-lived) | Exchange for new long-lived token before expiry |
| TikTok Creator API | OAuth 2.0 | 24 hours | Refresh token (valid 365 days) |
| Chartmetric | Bearer Token | 7 days | POST /api/token with refresh_token |
| Songstats | API Key | Permanent | N/A |
| Deezer | None (public) / OAuth | Permanent / varies | N/A / standard OAuth |
| MusicBrainz | None (User-Agent required) | N/A | N/A |
| Discogs | Personal Access Token | Permanent | N/A |
| Bandsintown | API Key | Permanent | N/A |
| YouTube Data API | API Key | Permanent | N/A |
| Mailchimp | API Key | Permanent | N/A |
| Shopify | Custom App Token | Permanent | N/A |
| Twitter/X | OAuth 2.0 / Bearer | 2 hours | Refresh token |

## Appendix B: Artist IDs to Collect

Before any integration, we need to collect Jake's artist IDs on each platform:

| Platform | ID Type | Where to Find | Current Status |
|----------|---------|---------------|---------------|
| Spotify (Jakke) | Artist URI | `open.spotify.com/artist/{id}` | NEEDED |
| Spotify (Enjune) | Artist URI | `open.spotify.com/artist/{id}` | NEEDED |
| Apple Music | Artist ID | `music.apple.com/artist/{id}` | NEEDED |
| YouTube | Channel ID | `youtube.com/channel/{id}` | NEEDED |
| Chartmetric | CM Artist ID | Search in Chartmetric | NEEDED |
| MusicBrainz | MBID | Search `musicbrainz.org` | NEEDED |
| Discogs | Artist ID | Search `discogs.com` | NEEDED |
| Deezer | Artist ID | Search `deezer.com/artist/{id}` | NEEDED |
| Tidal | Artist ID | Search in Tidal | NEEDED |
| Bandsintown | Artist name (slug) | `bandsintown.com/{name}` | NEEDED |
| SoundCloud | User ID / permalink | `soundcloud.com/{name}` | Exists in profiles JSON |
| Instagram | Business Account ID | Meta Business Suite | NEEDED |
| TikTok | Creator ID | TikTok developer portal | NEEDED |
| Beatport | Artist ID | `beatport.com/artist/{name}/{id}` | Exists in profiles JSON |

**First action item:** Collect all platform IDs and store them in a `config/artist-ids.json` file.

## Appendix C: Data We Can NOT Get Via API

Some valuable data has no API path and requires manual processes:

| Data | Why No API | Workaround |
|------|-----------|------------|
| Spotify for Artists daily streams | Dashboard-only, no API | Songstats/Chartmetric as proxy |
| Apple Music for Artists analytics | Dashboard-only, no API | Chartmetric as proxy |
| DistroKid actual revenue | No API | CSV import feature |
| ASCAP/BMI royalty statements | No API | CSV import feature |
| SoundExchange royalties | No API | CSV import feature |
| Sync placement notifications | Fragmented across platforms | Manual entry or email parsing |
| Bandcamp sales | No API | Manual entry |
| Amazon Music for Artists | No API | Chartmetric as proxy |
| Skip rate (Spotify) | Spotify for Artists only | No proxy available |
| Radio airplay details | Enterprise-only (Luminate) | Chartmetric for chart-level data |

---

*This catalog should be re-audited quarterly. APIs change their terms, rate limits, and pricing. Last verified: 2026-02-26.*
