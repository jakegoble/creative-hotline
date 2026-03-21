# Music Command Center — Data Model Specification

> Complete database schema, relationships, storage architecture, and migration plan.
> The data model IS the product. Every song, stream, fan interaction, and dollar — structured, connected, queryable.

**Last updated:** 2026-02-26
**Author:** CRM & Data Operations Lead
**Target stack:** Next.js 15 + Supabase (PostgreSQL) + Vercel KV

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Entity Relationship Overview](#2-entity-relationship-overview)
3. [Core Schema: Artists & Identity](#3-core-schema-artists--identity)
4. [Core Schema: Catalog](#4-core-schema-catalog)
5. [Core Schema: Streaming & Metrics](#5-core-schema-streaming--metrics)
6. [Core Schema: Audience](#6-core-schema-audience)
7. [Core Schema: Financial](#7-core-schema-financial)
8. [Core Schema: Social](#8-core-schema-social)
9. [Core Schema: Sync & Licensing](#9-core-schema-sync--licensing)
10. [Core Schema: Live & Touring](#10-core-schema-live--touring)
11. [Core Schema: Goals & Planning](#11-core-schema-goals--planning)
12. [Core Schema: Scores & Insights](#12-core-schema-scores--insights)
13. [Relationship Diagram](#13-relationship-diagram)
14. [Data Quality & Deduplication](#14-data-quality--deduplication)
15. [Storage Architecture](#15-storage-architecture)
16. [Migration & Import Plan](#16-migration--import-plan)
17. [Supabase Implementation Notes](#17-supabase-implementation-notes)
18. [Index Strategy](#18-index-strategy)
19. [Row-Level Security](#19-row-level-security)
20. [Appendix: Current Data File Mapping](#20-appendix-current-data-file-mapping)

---

## 1. Design Principles

1. **ISRC is the universal song key.** Every recording gets an ISRC. When ISRC is missing, we generate a deterministic internal ID (`int__{artist_slug}__{title_slug}`) and backfill the real ISRC later.
2. **Platform IDs are stored, not inferred.** Each external platform gets its own ID column on the entity it identifies. No generic "platform_id" polymorphism.
3. **Time-series data lives in dedicated tables.** Daily/weekly metrics get their own tables with `(entity_id, date)` composite keys. Never overwrite — always append.
4. **Soft deletes everywhere.** `deleted_at TIMESTAMPTZ NULL` on mutable tables. Hard delete only on orphaned time-series rows during compaction.
5. **UTC timestamps.** All `TIMESTAMPTZ` columns store UTC. Client converts for display.
6. **Multi-artist from day one.** The schema supports multiple artists under one account (Jakke + Enjune + iLU today, potentially more later). Every major entity links to `artist_id`.
7. **Enum tables over CHECK constraints.** Allows adding new values without migrations. Use lookup tables for statuses, genres, platforms, etc.
8. **Immutable IDs.** All primary keys are `UUID DEFAULT gen_random_uuid()`. No serial integers exposed to clients.

---

## 2. Entity Relationship Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                           ACCOUNT (user)                             │
│  owns 1+ artists                                                     │
└────────┬─────────────────────────────────────────────────────────────┘
         │ 1:N
         ▼
┌──────────────────┐       ┌──────────────────┐
│     ARTIST       │──1:N──│  ARTIST_PLATFORM  │ (Spotify ID, Apple ID, etc.)
└──────┬───────────┘       └──────────────────┘
       │
       ├──1:N──▶ RELEASE ──1:N──▶ TRACK ──1:N──▶ TRACK_PLATFORM (per-platform IDs)
       │                            │
       │                            ├──1:N──▶ DAILY_STREAMS (time-series)
       │                            ├──1:N──▶ TRACK_AUDIO_FEATURES
       │                            ├──N:M──▶ PLAYLIST_TRACK (join)
       │                            ├──N:M──▶ TRACK_CREDIT (collaborators)
       │                            ├──1:N──▶ SYNC_PLACEMENT
       │                            └──1:N──▶ SETLIST_TRACK (join)
       │
       ├──1:N──▶ DAILY_ARTIST_STATS (time-series: followers, listeners)
       ├──1:N──▶ SOCIAL_ACCOUNT ──1:N──▶ SOCIAL_POST
       │                          └──1:N──▶ DAILY_SOCIAL_STATS
       ├──1:N──▶ AUDIENCE_SNAPSHOT (demographics, geo)
       ├──1:N──▶ REVENUE_ENTRY
       ├──1:N──▶ EXPENSE
       ├──1:N──▶ SHOW
       ├──1:N──▶ GOAL
       ├──1:N──▶ SCORE_SNAPSHOT (computed scores)
       └──1:N──▶ INSIGHT (AI-generated)

COLLABORATOR ──N:M──▶ TRACK (via TRACK_CREDIT)
PLAYLIST ──N:M──▶ TRACK (via PLAYLIST_TRACK)
VENUE ──1:N──▶ SHOW
```

---

## 3. Core Schema: Artists & Identity

### 3.1 `accounts`

The top-level user/team. Maps to Supabase Auth user.

```sql
CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  plan        TEXT NOT NULL DEFAULT 'free',  -- 'free', 'pro', 'team'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 `artists`

Each artist project under an account. Jakke, Enjune, and iLU are three separate rows.

```sql
CREATE TABLE artists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                -- 'Jakke'
  slug            TEXT NOT NULL,                -- 'jakke' (URL-safe, unique per account)
  bio             TEXT,
  country         TEXT,                         -- ISO 3166-1 alpha-2: 'US'
  career_stage    TEXT DEFAULT 'emerging',      -- 'bedroom','emerging','mid_tier','breaking'
  genre_tags      TEXT[] DEFAULT '{}',          -- {'Organic House','Deep House','Melodic House'}
  image_url       TEXT,
  verified        BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(account_id, slug)
);

CREATE INDEX idx_artists_account ON artists(account_id) WHERE deleted_at IS NULL;
```

### 3.3 `artist_platforms`

External platform identifiers for each artist. One row per platform.

```sql
CREATE TABLE artist_platforms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,   -- 'spotify','apple_music','youtube','soundcloud','instagram','tiktok','deezer','tidal','bandsintown','musicbrainz','discogs','beatport'
  platform_id     TEXT NOT NULL,   -- The actual ID on that platform
  platform_url    TEXT,            -- Full profile URL
  verified        BOOLEAN DEFAULT false,
  connected_at    TIMESTAMPTZ,     -- When OAuth was connected (if applicable)
  token_expires   TIMESTAMPTZ,     -- For OAuth tokens that expire
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_id, platform)
);

CREATE INDEX idx_artist_platforms_artist ON artist_platforms(artist_id);
```

### 3.4 `team_members`

People associated with an artist (manager, producer, publicist, etc.).

```sql
CREATE TABLE team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,        -- 'manager','producer','publicist','agent','lawyer','label_contact'
  email       TEXT,
  phone       TEXT,
  company     TEXT,
  notes       TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_members_artist ON team_members(artist_id);
```

---

## 4. Core Schema: Catalog

### 4.1 `releases`

An album, EP, single, or compilation. Groups one or more tracks.

```sql
CREATE TABLE releases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  release_type    TEXT NOT NULL,            -- 'single','ep','album','compilation','remix_single'
  release_date    DATE,
  upc             TEXT,                     -- Universal Product Code
  label           TEXT,
  cover_art_url   TEXT,
  total_tracks    INT DEFAULT 1,
  is_published    BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_releases_artist ON releases(artist_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_releases_date ON releases(release_date DESC);
CREATE INDEX idx_releases_upc ON releases(upc) WHERE upc IS NOT NULL;
```

### 4.2 `tracks`

Individual recordings. The core entity that everything connects to.

```sql
CREATE TABLE tracks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id        UUID REFERENCES releases(id) ON DELETE SET NULL,
  artist_id         UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  isrc              TEXT,                          -- USRC12400001
  iswc              TEXT,                          -- T0012345696 (links to the composition/work)
  duration_ms       INT,                           -- Track length in milliseconds
  track_number      INT,                           -- Position on release
  disc_number       INT DEFAULT 1,
  genre             TEXT,                          -- Primary genre
  sub_genre         TEXT,                          -- Finer classification
  bpm               NUMERIC(6,2),                  -- Beats per minute
  musical_key       TEXT,                          -- 'C', 'Am', 'F#m', etc.
  energy            NUMERIC(4,3),                  -- 0.000-1.000 (Spotify audio feature)
  danceability      NUMERIC(4,3),
  valence           NUMERIC(4,3),                  -- Musical positivity
  acousticness      NUMERIC(4,3),
  instrumentalness  NUMERIC(4,3),
  speechiness       NUMERIC(4,3),
  loudness_db       NUMERIC(6,2),                  -- dB
  is_explicit       BOOLEAN DEFAULT false,
  has_stereo        BOOLEAN DEFAULT true,
  has_dolby_atmos   BOOLEAN DEFAULT false,
  has_instrumental   BOOLEAN DEFAULT false,         -- Instrumental version available
  master_owner      TEXT,                           -- Who owns the master recording
  publisher         TEXT,                           -- Publishing entity
  release_date      DATE,                           -- Denormalized from release for query convenience
  is_original       BOOLEAN DEFAULT true,           -- false for remixes, live versions, acoustic versions
  original_track_id UUID REFERENCES tracks(id),     -- Points to original if this is a remix/variant
  variant_type      TEXT,                           -- 'remix','acoustic','live','club_mix','lofi_remix','deluxe'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_tracks_isrc ON tracks(isrc) WHERE isrc IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_tracks_artist ON tracks(artist_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tracks_release ON tracks(release_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tracks_genre ON tracks(genre);
CREATE INDEX idx_tracks_release_date ON tracks(release_date DESC);
CREATE INDEX idx_tracks_original ON tracks(original_track_id) WHERE original_track_id IS NOT NULL;
```

### 4.3 `track_platforms`

Per-platform identifiers and URLs for each track.

```sql
CREATE TABLE track_platforms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id      UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,         -- 'spotify','apple_music','youtube_music','youtube','deezer','tidal','soundcloud','amazon_music','beatport'
  platform_id   TEXT NOT NULL,         -- Spotify track URI, Apple Music track ID, etc.
  platform_url  TEXT,                  -- Direct link to the track on the platform
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(track_id, platform)
);

CREATE INDEX idx_track_platforms_track ON track_platforms(track_id);
CREATE INDEX idx_track_platforms_lookup ON track_platforms(platform, platform_id);
```

### 4.4 `collaborators`

People who appear on tracks (featured artists, producers, remixers, songwriters).

```sql
CREATE TABLE collaborators (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  spotify_id      TEXT,
  instagram_handle TEXT,
  is_artist       BOOLEAN DEFAULT false,  -- true if they are also an artist in our system
  linked_artist_id UUID REFERENCES artists(id), -- if they map to one of our artists
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, slug)
);

CREATE INDEX idx_collaborators_account ON collaborators(account_id);
```

### 4.5 `track_credits`

Join table: which collaborators worked on which tracks, in what role.

```sql
CREATE TABLE track_credits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id        UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,   -- 'writer','producer','featured','remixer','vocalist','instrumentalist','engineer','mixer','masterer'
  ownership_pct   NUMERIC(5,2),   -- Percentage ownership split (e.g., 50.00)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(track_id, collaborator_id, role)
);

CREATE INDEX idx_track_credits_track ON track_credits(track_id);
CREATE INDEX idx_track_credits_collaborator ON track_credits(collaborator_id);
```

---

## 5. Core Schema: Streaming & Metrics

### 5.1 `daily_streams`

One row per track per platform per territory per day. The heartbeat of the app.

```sql
CREATE TABLE daily_streams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id      UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,        -- 'spotify','apple_music','youtube_music', etc.
  territory     TEXT DEFAULT 'GLOBAL', -- ISO 3166-1 alpha-2 or 'GLOBAL'
  date          DATE NOT NULL,
  streams       BIGINT NOT NULL DEFAULT 0,
  saves         INT DEFAULT 0,
  playlist_adds INT DEFAULT 0,
  skip_rate     NUMERIC(5,4),         -- 0.0000-1.0000
  completion_rate NUMERIC(5,4),       -- 0.0000-1.0000
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(track_id, platform, territory, date)
);

-- Partition by month for large-scale time-series performance
-- (Supabase supports declarative partitioning)
CREATE INDEX idx_daily_streams_track_date ON daily_streams(track_id, date DESC);
CREATE INDEX idx_daily_streams_date ON daily_streams(date DESC);
CREATE INDEX idx_daily_streams_platform ON daily_streams(platform, date DESC);
```

**Storage estimate:** 28 tracks x 7 platforms x 1 territory x 365 days = ~71,540 rows/year at global level. With per-territory breakdown (top 10 countries), ~715,400 rows/year. Very manageable in PostgreSQL.

### 5.2 `daily_artist_stats`

Artist-level daily metrics (followers, monthly listeners, popularity).

```sql
CREATE TABLE daily_artist_stats (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id         UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL,     -- 'spotify','instagram','youtube','tiktok','soundcloud','deezer','tidal','bandsintown'
  date              DATE NOT NULL,
  followers         BIGINT,
  monthly_listeners BIGINT,            -- Spotify-specific
  popularity_score  INT,               -- 0-100 (Spotify)
  artist_rank       INT,               -- Platform-specific ranking
  current_playlists INT,               -- Number of playlists currently on
  playlist_reach    BIGINT,            -- Total followers across all playlists
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_id, platform, date)
);

CREATE INDEX idx_daily_artist_stats_artist_date ON daily_artist_stats(artist_id, date DESC);
```

### 5.3 `playlists`

Playlists that contain the artist's tracks.

```sql
CREATE TABLE playlists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        TEXT NOT NULL,          -- 'spotify','apple_music','deezer','youtube_music','amazon_music'
  platform_id     TEXT NOT NULL,          -- Spotify playlist ID, etc.
  name            TEXT NOT NULL,
  description     TEXT,
  curator         TEXT,                   -- Curator name or 'algorithmic','editorial','user'
  playlist_type   TEXT DEFAULT 'user',    -- 'editorial','algorithmic','user','radio'
  followers       BIGINT DEFAULT 0,
  platform_url    TEXT,
  cover_art_url   TEXT,
  last_checked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(platform, platform_id)
);

CREATE INDEX idx_playlists_platform ON playlists(platform);
CREATE INDEX idx_playlists_followers ON playlists(followers DESC);
```

### 5.4 `playlist_tracks`

Join table: which tracks are on which playlists, with add/remove tracking.

```sql
CREATE TABLE playlist_tracks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id   UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id      UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ,
  removed_at    TIMESTAMPTZ,          -- NULL = still on playlist
  position      INT,                  -- Track position in playlist
  is_active     BOOLEAN DEFAULT true, -- Denormalized: true if removed_at IS NULL
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_playlist_tracks_track ON playlist_tracks(track_id) WHERE is_active = true;
CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id) WHERE is_active = true;
CREATE INDEX idx_playlist_tracks_added ON playlist_tracks(added_at DESC);
```

### 5.5 `daily_playlist_stats`

Follower count history for playlists we track.

```sql
CREATE TABLE daily_playlist_stats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id   UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  followers     BIGINT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, date)
);

CREATE INDEX idx_daily_playlist_stats_playlist ON daily_playlist_stats(playlist_id, date DESC);
```

---

## 6. Core Schema: Audience

### 6.1 `audience_snapshots`

Periodic demographic and geographic audience breakdowns. Stored as snapshots because this data changes slowly and comes from multiple sources.

```sql
CREATE TABLE audience_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,       -- 'spotify','instagram','youtube','tiktok'
  snapshot_date   DATE NOT NULL,
  -- Demographics (stored as JSONB for flexibility across platforms)
  age_gender      JSONB,               -- {"18-24":{"male":12.3,"female":8.7},...}
  top_cities      JSONB,               -- [{"city":"Los Angeles","percentage":8.2},...]
  top_countries   JSONB,               -- [{"country":"United States","percentage":52.3},...]
  -- Engagement metrics specific to this snapshot
  total_reach     BIGINT,
  total_engaged   BIGINT,
  engagement_rate NUMERIC(6,4),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_id, platform, snapshot_date)
);

CREATE INDEX idx_audience_snapshots_artist ON audience_snapshots(artist_id, snapshot_date DESC);
```

### 6.2 `listener_territories`

Per-track geographic streaming breakdown. Separate from audience_snapshots because this is track-level.

```sql
CREATE TABLE listener_territories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL,
  territory   TEXT NOT NULL,      -- ISO 3166-1 alpha-2
  period_start DATE NOT NULL,
  period_end  DATE NOT NULL,
  streams     BIGINT NOT NULL,
  listeners   BIGINT,
  percentage  NUMERIC(5,2),       -- % of total streams from this territory
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(track_id, platform, territory, period_start)
);

CREATE INDEX idx_listener_territories_track ON listener_territories(track_id);
```

---

## 7. Core Schema: Financial

### 7.1 `revenue_entries`

Individual revenue line items. One row per track per source per reporting period. Imported from DistroKid CSV, ASCAP/BMI statements, sync licensing payments, etc.

```sql
CREATE TABLE revenue_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id         UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  track_id          UUID REFERENCES tracks(id) ON DELETE SET NULL,  -- NULL for non-track revenue (merch, live)
  source            TEXT NOT NULL,       -- 'streaming','sync','performance_royalty','mechanical_royalty','merch','live','other'
  platform          TEXT,                -- 'spotify','apple_music','distrokid','ascap','bmi','musicbed', etc.
  reporting_period  DATERANGE NOT NULL,  -- [2026-01-01,2026-02-01) for January 2026
  amount            NUMERIC(12,2) NOT NULL, -- Gross revenue in USD
  currency          TEXT DEFAULT 'USD',
  quantity          BIGINT,              -- Stream count, ticket count, unit count
  per_unit_rate     NUMERIC(10,6),       -- Per-stream or per-unit rate
  territory         TEXT DEFAULT 'GLOBAL',
  description       TEXT,
  import_batch_id   UUID,                -- Links to the CSV import that created this row
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_revenue_entries_artist ON revenue_entries(artist_id);
CREATE INDEX idx_revenue_entries_track ON revenue_entries(track_id) WHERE track_id IS NOT NULL;
CREATE INDEX idx_revenue_entries_source ON revenue_entries(source);
CREATE INDEX idx_revenue_entries_period ON revenue_entries USING GIST (reporting_period);
CREATE INDEX idx_revenue_entries_batch ON revenue_entries(import_batch_id) WHERE import_batch_id IS NOT NULL;
```

### 7.2 `expenses`

```sql
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,       -- 'production','marketing','distribution','legal','merch_cost','touring','studio','gear','subscription','other'
  amount      NUMERIC(12,2) NOT NULL,
  currency    TEXT DEFAULT 'USD',
  date        DATE NOT NULL,
  description TEXT,
  vendor      TEXT,
  receipt_url TEXT,                 -- File storage link
  track_id    UUID REFERENCES tracks(id), -- NULL if not track-specific
  show_id     UUID,                -- References shows(id), added after shows table creation
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_artist ON expenses(artist_id);
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
```

### 7.3 `royalty_splits`

Defines who gets what percentage of revenue per track. Different from track_credits ownership_pct because splits can differ from writing credits (e.g., label takes a cut).

```sql
CREATE TABLE royalty_splits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id        UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  recipient_name  TEXT NOT NULL,
  recipient_type  TEXT NOT NULL,    -- 'artist','collaborator','label','publisher','distributor'
  split_pct       NUMERIC(5,2) NOT NULL, -- 50.00 = 50%
  revenue_type    TEXT DEFAULT 'all', -- 'all','streaming','sync','performance','mechanical'
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_royalty_splits_track ON royalty_splits(track_id);
```

### 7.4 `import_batches`

Tracks CSV/file imports for auditability and re-import capability.

```sql
CREATE TABLE import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source          TEXT NOT NULL,     -- 'distrokid','tunecore','ascap','bmi','manual','csv_upload'
  filename        TEXT,
  file_url        TEXT,              -- Supabase Storage path
  rows_imported   INT DEFAULT 0,
  rows_skipped    INT DEFAULT 0,
  rows_errored    INT DEFAULT 0,
  error_log       JSONB,             -- [{row: 5, error: "Missing ISRC"}, ...]
  status          TEXT DEFAULT 'pending', -- 'pending','processing','completed','failed'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_import_batches_account ON import_batches(account_id);
```

---

## 8. Core Schema: Social

### 8.1 `social_accounts`

Connected social media accounts for an artist.

```sql
CREATE TABLE social_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,     -- 'instagram','tiktok','youtube','twitter','facebook'
  platform_id     TEXT NOT NULL,
  username        TEXT NOT NULL,
  profile_url     TEXT,
  followers       BIGINT DEFAULT 0,  -- Latest known count (denormalized)
  is_connected    BOOLEAN DEFAULT false,  -- OAuth connected for live data
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_id, platform)
);

CREATE INDEX idx_social_accounts_artist ON social_accounts(artist_id);
```

### 8.2 `daily_social_stats`

Daily social media metrics per platform.

```sql
CREATE TABLE daily_social_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  followers       BIGINT,
  following       BIGINT,
  posts_count     BIGINT,
  views           BIGINT,
  reach           BIGINT,
  impressions     BIGINT,
  interactions    BIGINT,
  profile_visits  BIGINT,
  link_taps       BIGINT,
  engagement_rate NUMERIC(6,4),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(social_account_id, date)
);

CREATE INDEX idx_daily_social_stats_account ON daily_social_stats(social_account_id, date DESC);
```

### 8.3 `social_posts`

Individual social media posts with engagement metrics.

```sql
CREATE TABLE social_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform_post_id TEXT NOT NULL,      -- The platform's ID for this post
  post_type       TEXT,                -- 'photo','video','reel','carousel','story','tweet'
  caption         TEXT,
  permalink       TEXT,
  posted_at       TIMESTAMPTZ NOT NULL,
  likes           INT DEFAULT 0,
  comments        INT DEFAULT 0,
  shares          INT DEFAULT 0,
  saves           INT DEFAULT 0,
  views           BIGINT DEFAULT 0,
  reach           BIGINT DEFAULT 0,
  impressions     BIGINT DEFAULT 0,
  -- Content classification
  content_tag     TEXT,                -- 'release_promo','behind_scenes','live_show','personal','collab','music_video'
  related_track_id UUID REFERENCES tracks(id),  -- If this post promotes a specific track
  collaborator_tags TEXT[],            -- IG handles tagged
  last_refreshed  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(social_account_id, platform_post_id)
);

CREATE INDEX idx_social_posts_account ON social_posts(social_account_id, posted_at DESC);
CREATE INDEX idx_social_posts_track ON social_posts(related_track_id) WHERE related_track_id IS NOT NULL;
CREATE INDEX idx_social_posts_posted ON social_posts(posted_at DESC);
```

---

## 9. Core Schema: Sync & Licensing

### 9.1 `sync_placements`

Tracks placed in TV, film, ads, games, podcasts, etc.

```sql
CREATE TABLE sync_placements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id        UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  placement_type  TEXT NOT NULL,      -- 'tv_show','film','commercial','video_game','podcast','trailer','social_ad','web_series'
  title           TEXT NOT NULL,      -- Name of the show/film/brand
  season_episode  TEXT,               -- 'S2E05' for TV
  brand           TEXT,               -- Brand name for commercials
  network         TEXT,               -- 'Netflix','NBC','YouTube'
  air_date        DATE,
  territory       TEXT DEFAULT 'GLOBAL',
  fee             NUMERIC(12,2),      -- Licensing fee received
  fee_type        TEXT,               -- 'flat','per_use','royalty','buyout'
  status          TEXT DEFAULT 'placed', -- 'pitched','pending','placed','rejected','expired'
  licensing_agent TEXT,               -- 'musicbed','artlist','songtradr','direct'
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_placements_track ON sync_placements(track_id);
CREATE INDEX idx_sync_placements_artist ON sync_placements(artist_id);
CREATE INDEX idx_sync_placements_status ON sync_placements(status);
```

### 9.2 `sync_opportunities`

Pending or open sync briefs the artist could pitch to.

```sql
CREATE TABLE sync_opportunities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  placement_type  TEXT,               -- Same options as sync_placements
  mood_tags       TEXT[],             -- {'uplifting','warm','energetic'}
  genre_tags      TEXT[],             -- {'organic_house','acoustic'}
  tempo_range     INT4RANGE,          -- [90,130] BPM
  deadline        DATE,
  budget_range    TEXT,               -- '$500-$2000', 'TBD'
  source          TEXT,               -- 'musicbed','songtradr','direct','referral'
  status          TEXT DEFAULT 'open', -- 'open','pitched','won','lost','expired'
  tracks_pitched  UUID[],             -- Array of track IDs submitted
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_opportunities_artist ON sync_opportunities(artist_id);
CREATE INDEX idx_sync_opportunities_status ON sync_opportunities(status);
```

---

## 10. Core Schema: Live & Touring

### 10.1 `venues`

```sql
CREATE TABLE venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  city        TEXT,
  state       TEXT,
  country     TEXT,                 -- ISO 3166-1 alpha-2
  capacity    INT,
  venue_type  TEXT,                 -- 'club','theater','arena','festival','bar','outdoor','private'
  latitude    NUMERIC(9,6),
  longitude   NUMERIC(9,6),
  website     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_city ON venues(city, country);
```

### 10.2 `shows`

Past and upcoming live performances.

```sql
CREATE TABLE shows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  venue_id        UUID REFERENCES venues(id),
  title           TEXT NOT NULL,           -- 'Jakke Live at The Standard'
  show_date       DATE NOT NULL,
  show_time       TIME,
  doors_time      TIME,
  status          TEXT DEFAULT 'confirmed', -- 'tentative','confirmed','cancelled','completed'
  show_type       TEXT DEFAULT 'headline',  -- 'headline','support','festival','dj_set','private','residency'
  ticket_price    NUMERIC(8,2),
  tickets_sold    INT,
  tickets_available INT,
  gross_revenue   NUMERIC(12,2),
  guarantee       NUMERIC(12,2),           -- Guaranteed payment from promoter
  merch_revenue   NUMERIC(12,2),
  ticket_url      TEXT,
  bandsintown_id  TEXT,
  songkick_id     TEXT,
  notes           TEXT,
  setlist_notes   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shows_artist ON shows(artist_id);
CREATE INDEX idx_shows_date ON shows(show_date DESC);
CREATE INDEX idx_shows_venue ON shows(venue_id);
CREATE INDEX idx_shows_status ON shows(status);
```

### 10.3 `setlist_tracks`

Which tracks were played at which show.

```sql
CREATE TABLE setlist_tracks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id     UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position    INT NOT NULL,        -- Order in setlist
  notes       TEXT,                -- 'Extended mix', 'VIP edit', etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(show_id, position)
);

CREATE INDEX idx_setlist_tracks_show ON setlist_tracks(show_id);
CREATE INDEX idx_setlist_tracks_track ON setlist_tracks(track_id);
```

---

## 11. Core Schema: Goals & Planning

### 11.1 `goals`

Revenue targets, streaming milestones, release schedules, tour plans.

```sql
CREATE TABLE goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,     -- 'revenue','streams','followers','releases','shows','sync','custom'
  title           TEXT NOT NULL,     -- 'Hit 50K monthly listeners'
  description     TEXT,
  target_value    NUMERIC(14,2),     -- 50000
  current_value   NUMERIC(14,2),     -- 32100
  unit            TEXT,              -- 'dollars','streams','followers','releases','shows'
  target_date     DATE,
  status          TEXT DEFAULT 'active', -- 'active','achieved','missed','paused'
  achieved_at     TIMESTAMPTZ,
  track_id        UUID REFERENCES tracks(id), -- If goal is track-specific
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_artist ON goals(artist_id);
CREATE INDEX idx_goals_status ON goals(status);
```

### 11.2 `release_plan`

Planned upcoming releases with marketing timeline.

```sql
CREATE TABLE release_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  track_id        UUID REFERENCES tracks(id),  -- Can link to a track already in catalog (pre-release)
  title           TEXT NOT NULL,
  release_type    TEXT NOT NULL,            -- 'single','ep','album'
  planned_date    DATE,
  distributor_submitted BOOLEAN DEFAULT false,
  playlist_pitched BOOLEAN DEFAULT false,
  press_sent       BOOLEAN DEFAULT false,
  social_assets_ready BOOLEAN DEFAULT false,
  pre_save_url     TEXT,
  status           TEXT DEFAULT 'planning', -- 'planning','submitted','released','cancelled'
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_release_plans_artist ON release_plans(artist_id);
CREATE INDEX idx_release_plans_date ON release_plans(planned_date);
```

---

## 12. Core Schema: Scores & Insights

### 12.1 `score_snapshots`

Computed scores from the 7 GROWTH scoring models. Stored as snapshots so we can track score trends.

```sql
CREATE TABLE score_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  track_id        UUID REFERENCES tracks(id),   -- NULL for artist-level scores, set for per-track scores
  score_type      TEXT NOT NULL,  -- 'career_momentum','song_health','sync_readiness','audience_quality','release_timing','catalog_diversification','catalog_economics'
  score           NUMERIC(5,1) NOT NULL,  -- 0.0-100.0
  sub_scores      JSONB NOT NULL,         -- {"streaming_velocity":72,"playlist_momentum":58,...}
  tier            TEXT,                    -- 'breaking_out','building','coasting','stalling' (varies by model)
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Inputs snapshot for reproducibility
  input_hash      TEXT,                    -- Hash of input data for change detection
  UNIQUE(artist_id, track_id, score_type, computed_at)
);

CREATE INDEX idx_score_snapshots_artist ON score_snapshots(artist_id, score_type, computed_at DESC);
CREATE INDEX idx_score_snapshots_track ON score_snapshots(track_id, score_type, computed_at DESC)
  WHERE track_id IS NOT NULL;
```

### 12.2 `insights`

AI-generated or rule-based insights with action items.

```sql
CREATE TABLE insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,     -- 'streaming','social','financial','sync','audience','catalog','growth','alert'
  priority        TEXT DEFAULT 'medium', -- 'critical','high','medium','low','info'
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,     -- Markdown-formatted insight text
  action_items    JSONB,             -- [{"text":"Pitch 'Delicate' to Musicbed","done":false},...]
  related_track_id UUID REFERENCES tracks(id),
  related_score_type TEXT,           -- Links to score_snapshots score_type
  trigger_type    TEXT,              -- 'score_change','threshold','trend','alert','manual','ai_generated'
  is_read         BOOLEAN DEFAULT false,
  is_dismissed    BOOLEAN DEFAULT false,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insights_artist ON insights(artist_id, created_at DESC);
CREATE INDEX idx_insights_unread ON insights(artist_id) WHERE is_read = false AND is_dismissed = false;
CREATE INDEX idx_insights_category ON insights(category);
```

---

## 13. Relationship Diagram

```
ACCOUNT
  │
  ├── ARTIST ─────────────┬── RELEASE ──── TRACK ──┬── TRACK_PLATFORM
  │     │                  │                  │      ├── TRACK_CREDIT ── COLLABORATOR
  │     │                  │                  │      ├── DAILY_STREAMS
  │     │                  │                  │      ├── PLAYLIST_TRACK ── PLAYLIST ── DAILY_PLAYLIST_STATS
  │     │                  │                  │      ├── SYNC_PLACEMENT
  │     │                  │                  │      ├── SETLIST_TRACK ── SHOW ── VENUE
  │     │                  │                  │      ├── LISTENER_TERRITORIES
  │     │                  │                  │      └── REVENUE_ENTRY
  │     │                  │                  │
  │     │                  │                  └── (self-ref: original_track_id for remixes)
  │     │                  │
  │     ├── ARTIST_PLATFORM
  │     ├── TEAM_MEMBER
  │     ├── DAILY_ARTIST_STATS
  │     ├── SOCIAL_ACCOUNT ──┬── DAILY_SOCIAL_STATS
  │     │                    └── SOCIAL_POST
  │     ├── AUDIENCE_SNAPSHOT
  │     ├── EXPENSE
  │     ├── SHOW
  │     ├── GOAL
  │     ├── RELEASE_PLAN
  │     ├── SYNC_OPPORTUNITY
  │     ├── SCORE_SNAPSHOT
  │     └── INSIGHT
  │
  ├── COLLABORATOR
  └── IMPORT_BATCH ── REVENUE_ENTRY (via import_batch_id)
```

### Key Relationships Explained

**Song to streaming data:** `tracks.id` -> `daily_streams.track_id`. One track has many daily stream rows (one per platform per territory per day).

**Song to financial data:** `tracks.id` -> `revenue_entries.track_id`. Revenue is attributed to tracks where possible. Non-track revenue (merch, live) has `track_id = NULL`.

**Song to sync placements:** `tracks.id` -> `sync_placements.track_id`. A track can have multiple placements across different media.

**Song to setlists:** `tracks.id` -> `setlist_tracks.track_id` -> `shows.id`. Shows what was played live and how often.

**Fan cross-platform linking:** We do NOT try to link individual fans across platforms. Instead, we use `audience_snapshots` for demographic overlaps and `daily_artist_stats` per platform for follower trends. True cross-platform fan identity requires user authentication (out of scope for v1).

**Collaborator relationships:** `collaborators` table holds unique people. `track_credits` is the N:M join between tracks and collaborators. A collaborator with `is_artist = true` and `linked_artist_id` set means they are one of our tracked artists (e.g., "Enjune" as a collaborator on Jakke's tracks).

**Re-releases, remixes, deluxe editions:** The `tracks.original_track_id` self-reference links variants to their originals. "Sugar Tide (Club Mix)" has `original_track_id` pointing to "Sugar Tide", with `variant_type = 'club_mix'`. This lets us aggregate all versions or show them separately.

---

## 14. Data Quality & Deduplication

### 14.1 ISRC as Universal Identifier

ISRC (International Standard Recording Code) uniquely identifies a specific recording across all platforms. It is the primary deduplication key.

**Rules:**
- Every track SHOULD have an ISRC. It is the strongest cross-platform join key.
- When importing from DistroKid or a distributor, ISRC is always present.
- When importing from Spotify API, ISRC is returned in track metadata.
- When ISRC is missing (manual entry, legacy tracks), generate an internal ID: `INT__{ARTIST_SLUG}__{TITLE_SLUG}__{YYYY}` (e.g., `INT__jakke__how_do_you_love__2023`).
- The `tracks.isrc` column has a unique index. Attempting to insert a duplicate ISRC will fail, forcing deduplication at import time.

**ISWC for compositions:** ISWC identifies the underlying musical work (composition), not the recording. One ISWC can have many ISRCs (original + remixes all share the same ISWC). We store ISWC on `tracks.iswc` for publishing rights tracking.

### 14.2 Deduplication Strategy

```
IMPORT PIPELINE:

1. Receive row (from CSV, API, or manual)
2. Extract ISRC (if present)
3. IF ISRC exists in tracks table:
     → Match to existing track
     → Update metadata if newer (title casing, genre, etc.)
     → Append streaming/revenue data (never overwrite time-series)
4. IF ISRC not present:
     → Fuzzy match on (artist_name + title + release_year)
     → Normalize: lowercase, strip parenthetical suffixes, strip "feat." text
     → Levenshtein distance < 3 on title = probable match
     → If match found: merge, prompt user to confirm
     → If no match: create new track with internal ID
5. Log all matches and conflicts in import_batches.error_log
```

### 14.3 Handling Variants

| Variant Type | Strategy |
|---|---|
| **Remix** | Separate `tracks` row. `is_original = false`, `variant_type = 'remix'`, `original_track_id` points to original. Different ISRC. |
| **Acoustic version** | Same as remix. `variant_type = 'acoustic'`. |
| **Live version** | Same. `variant_type = 'live'`. |
| **Deluxe edition track** | If same recording, same ISRC = same row. If re-recorded, new ISRC = new row linked to original. |
| **Re-release on new label** | Same ISRC = same track. Different UPC = different release. Track links to new release via `release_id` update. |
| **Radio edit** | New ISRC (different duration). `variant_type = 'radio_edit'`, linked to original. |

### 14.4 Validation Rules

```sql
-- Enforced at database level
ALTER TABLE tracks ADD CONSTRAINT chk_bpm CHECK (bpm IS NULL OR (bpm > 0 AND bpm < 300));
ALTER TABLE tracks ADD CONSTRAINT chk_energy CHECK (energy IS NULL OR (energy >= 0 AND energy <= 1));
ALTER TABLE tracks ADD CONSTRAINT chk_danceability CHECK (danceability IS NULL OR (danceability >= 0 AND danceability <= 1));
ALTER TABLE tracks ADD CONSTRAINT chk_valence CHECK (valence IS NULL OR (valence >= 0 AND valence <= 1));
ALTER TABLE tracks ADD CONSTRAINT chk_duration CHECK (duration_ms IS NULL OR duration_ms > 0);

ALTER TABLE daily_streams ADD CONSTRAINT chk_streams_positive CHECK (streams >= 0);
ALTER TABLE daily_streams ADD CONSTRAINT chk_skip_rate CHECK (skip_rate IS NULL OR (skip_rate >= 0 AND skip_rate <= 1));

ALTER TABLE revenue_entries ADD CONSTRAINT chk_quantity_positive CHECK (quantity IS NULL OR quantity >= 0);

ALTER TABLE royalty_splits ADD CONSTRAINT chk_split_range CHECK (split_pct >= 0 AND split_pct <= 100);

ALTER TABLE score_snapshots ADD CONSTRAINT chk_score_range CHECK (score >= 0 AND score <= 100);
```

**Application-level validation (enforced in Next.js API routes):**

- ISRC format: `^[A-Z]{2}[A-Z0-9]{3}\d{7}$` (2 letter country + 3 char registrant + 7 digit year/designation)
- ISWC format: `^T\d{10}$`
- UPC format: `^\d{12,13}$`
- Date ranges: `release_date` cannot be in the future by more than 365 days
- Reporting periods: `period_end > period_start`
- Split totals: Sum of `royalty_splits.split_pct` per track should equal 100.00 (warn, do not hard-fail)

---

## 15. Storage Architecture

### 15.1 PostgreSQL (Supabase) — Primary Store

**What goes here:** Everything. PostgreSQL is the single source of truth.

| Data Category | Tables | Estimated Rows/Year | Notes |
|---|---|---|---|
| Core entities | artists, tracks, releases, collaborators | ~100-500 | Slow growth |
| Time-series (streams) | daily_streams | ~100K-1M | Largest table; consider partitioning at 10M+ |
| Time-series (stats) | daily_artist_stats, daily_social_stats, daily_playlist_stats | ~10K-50K | Moderate |
| Social posts | social_posts | ~5K-10K | One row per post, updated periodically |
| Financial | revenue_entries, expenses | ~1K-5K | Monthly import batches |
| Scores | score_snapshots | ~5K-10K | Daily/weekly computation |
| Insights | insights | ~500-2K | Generated by scoring engine |

**Supabase plan recommendation:** Pro plan ($25/month) gives 8GB database, 250GB bandwidth, 100GB file storage. More than sufficient for this workload.

### 15.2 Vercel KV (Redis) — Cache Layer

**What goes here:** Expensive computations and frequently-read aggregates that do not need real-time accuracy.

| Cache Key Pattern | TTL | Data |
|---|---|---|
| `artist:{id}:dashboard` | 5 min | Pre-computed dashboard KPIs (total streams, followers, revenue) |
| `artist:{id}:scores` | 1 hour | Latest score_snapshots for all 7 models |
| `track:{id}:stats` | 15 min | Aggregated streaming stats for a single track |
| `artist:{id}:catalog_valuation` | 1 hour | Catalog economics computation result |
| `import:{batch_id}:progress` | 10 min | Real-time import progress for upload UI |

**When to use KV vs PostgreSQL:**
- Use KV when: the same query runs on every page load, the data changes at most hourly, and the computation is expensive (aggregations across time-series tables).
- Use PostgreSQL directly when: the data is user-specific, requires transactional consistency, or is written more often than read.

### 15.3 Supabase Storage — File Store

**What goes here:** Uploaded files that are not queryable data.

| Bucket | Contents | Access |
|---|---|---|
| `imports` | DistroKid CSVs, ASCAP/BMI PDFs, uploaded spreadsheets | Private (authenticated) |
| `artwork` | Cover art, artist photos | Public (CDN-cached) |
| `receipts` | Expense receipt images | Private |
| `exports` | Generated reports, PDFs | Private (time-limited URLs) |

### 15.4 Time-Series Handling

For daily_streams (the highest-volume table):

**Phase 1 (< 1M rows):** Standard PostgreSQL table with composite index on `(track_id, date DESC)`. No partitioning needed.

**Phase 2 (1M-50M rows):** Enable PostgreSQL declarative partitioning by month:

```sql
CREATE TABLE daily_streams (
  -- same columns as above
) PARTITION BY RANGE (date);

CREATE TABLE daily_streams_2026_01 PARTITION OF daily_streams
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE daily_streams_2026_02 PARTITION OF daily_streams
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- Auto-create future partitions via pg_partman or a cron function
```

**Phase 3 (50M+ rows):** If we reach this scale (multiple artists with per-territory daily data over years), consider TimescaleDB extension on Supabase or a dedicated time-series service. This is unlikely for a single-team music dashboard.

**Rollup tables for fast aggregation:**

```sql
-- Materialized view or cron-populated table for weekly/monthly aggregates
CREATE TABLE monthly_stream_rollups (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id  UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  platform  TEXT NOT NULL,
  month     DATE NOT NULL,        -- First day of month
  streams   BIGINT NOT NULL,
  saves     BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(track_id, platform, month)
);

CREATE INDEX idx_monthly_rollups_track ON monthly_stream_rollups(track_id, month DESC);
```

Rollups are populated by a Supabase Edge Function or Vercel Cron that runs on the 1st of each month summing the previous month's daily_streams.

---

## 16. Migration & Import Plan

### 16.1 Initial Migration: Static Files to PostgreSQL

The current app reads from `/public/data/*.csv` and `*.json`. Here is the mapping from current files to database tables.

| Source File | Target Table(s) | Mapping Notes |
|---|---|---|
| `artist_profiles.json` | `artists`, `artist_platforms`, `collaborators` | Split the nested JSON into normalized rows |
| `jakke_songs_all.csv` | `tracks`, `releases` (auto-generated singles) | Create a release per track (single type) where missing |
| `jakke_top_songs_recent.csv` | `daily_streams` (single snapshot row per track) | Use import date as the date; platform = 'all_platforms' |
| `musicteam_catalog.csv` | `tracks` (update ISRC/ISWC), `track_credits` | Match by title+artist, merge ISRC/ISWC/Atmos flags |
| `music_collaborators.csv` | `collaborators`, `track_credits` | Create collaborator rows, link to tracks by name matching |
| `songstats_jakke.json` | `daily_artist_stats` (single snapshot), `playlists`, `playlist_tracks` | Playlist data becomes playlist rows |
| `songstats_enjune.json` | Same as above for Enjune | |
| `ig_monthly_stats.csv` | `daily_social_stats` (monthly granularity) | One row per month, date = first of month |
| `ig_yearly_stats.csv` | `daily_social_stats` (yearly granularity) | One row per year |
| `ig_top_posts.csv` | `social_posts` | Map columns directly |
| `ig_collaborators.csv` | Cross-reference with `collaborators` table | Enrich collaborator records with IG handles |
| `ig_content_type_performance.csv` | Aggregated view (not stored as a table) | Derive from social_posts |
| `ig_day_of_week.csv` | Aggregated view | Derive from social_posts |
| `instagram_jakke_insights_30d.json` | `audience_snapshots`, `daily_social_stats` | Demographics go to audience_snapshots |

### 16.2 Seed Script

A TypeScript seed script runs once to populate the database from static files.

```
scripts/
  seed.ts                 -- Main orchestrator
  seed/
    artists.ts            -- Create artist + platform records
    catalog.ts            -- Create releases, tracks, credits
    streaming.ts          -- Import stream snapshots
    social.ts             -- Import IG data
    playlists.ts          -- Import playlist data from songstats
```

**Execution:**

```bash
npx tsx scripts/seed.ts
```

The seed script:
1. Creates the account (Jake Goble)
2. Creates artists (Jakke, Enjune, iLU)
3. Creates collaborators from `music_collaborators.csv` and `artist_profiles.json`
4. Creates releases and tracks from `jakke_songs_all.csv` + `musicteam_catalog.csv`
5. Links tracks to collaborators via `track_credits`
6. Imports streaming snapshots
7. Imports social data
8. Imports playlist data

### 16.3 DistroKid CSV Import

DistroKid exports have this column structure:

```
Reporting Date, Sale Period, Store, Artist, Title, ISRC, UPC, Quantity, Per-Unit, Currency, Revenue
```

**Import flow:**

1. User uploads CSV via drag-and-drop in the app
2. API route creates an `import_batches` row (status = 'processing')
3. File is stored in Supabase Storage `imports` bucket
4. Server parses CSV with papaparse
5. For each row:
   a. Look up track by ISRC (exact match)
   b. If no ISRC match, fuzzy match on title + artist
   c. Create `revenue_entries` row with `source = 'streaming'`, `platform` = Store column
   d. Map `Sale Period` to `reporting_period` daterange
   e. Set `amount` = Revenue, `quantity` = Quantity, `per_unit_rate` = Per-Unit
6. Update `import_batches` with counts and status = 'completed'
7. Invalidate Vercel KV cache for affected artist

### 16.4 Platform API Backfill

When Chartmetric or Songstats API is connected:

1. Fetch historical daily data for the past 365 days (API permitting)
2. Insert into `daily_streams`, `daily_artist_stats` using UPSERT (`ON CONFLICT DO UPDATE`)
3. Store the high-water mark (latest date fetched) in `artist_platforms.connected_at`
4. Daily cron job fetches new data from the high-water mark forward

### 16.5 Data Portability / Export

The app must support full data export:

```
GET /api/export?format=csv&tables=tracks,revenue_entries,daily_streams
GET /api/export?format=json&artist_id={id}
```

Exports generate a ZIP file containing:
- `tracks.csv` — Full catalog with all metadata
- `streams.csv` — All daily_streams data
- `revenue.csv` — All revenue_entries
- `social_stats.csv` — All social metrics
- `metadata.json` — Account info, export date, schema version

---

## 17. Supabase Implementation Notes

### 17.1 Supabase Client Setup (Next.js 15)

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### 17.2 Type Generation

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
```

This generates full TypeScript types for every table, enabling type-safe queries:

```typescript
import { Database } from './database.types';
type Track = Database['public']['Tables']['tracks']['Row'];
type TrackInsert = Database['public']['Tables']['tracks']['Insert'];
```

### 17.3 Supabase Migrations

Store migrations in `supabase/migrations/` using the Supabase CLI:

```
supabase/
  migrations/
    20260226000001_create_accounts.sql
    20260226000002_create_artists.sql
    20260226000003_create_catalog.sql
    20260226000004_create_streaming.sql
    20260226000005_create_audience.sql
    20260226000006_create_financial.sql
    20260226000007_create_social.sql
    20260226000008_create_sync.sql
    20260226000009_create_live.sql
    20260226000010_create_goals.sql
    20260226000011_create_scores.sql
    20260226000012_create_indexes.sql
    20260226000013_create_rls_policies.sql
    20260226000014_seed_initial_data.sql
```

### 17.4 Supabase Edge Functions for Cron Jobs

```typescript
// supabase/functions/daily-stats-refresh/index.ts
// Runs daily via Supabase Cron (pg_cron)
// 1. Fetches latest data from Chartmetric/Songstats
// 2. Inserts into daily_streams, daily_artist_stats
// 3. Recomputes scores and inserts score_snapshots
// 4. Generates insights for significant changes
// 5. Invalidates Vercel KV cache
```

---

## 18. Index Strategy

### Summary of All Indexes

| Table | Index | Purpose |
|---|---|---|
| `artists` | `(account_id) WHERE deleted_at IS NULL` | Dashboard artist list |
| `tracks` | `(isrc) WHERE isrc IS NOT NULL` (UNIQUE) | Cross-platform dedup |
| `tracks` | `(artist_id) WHERE deleted_at IS NULL` | Catalog listing |
| `tracks` | `(release_date DESC)` | Recent releases |
| `tracks` | `(original_track_id)` | Find all variants |
| `daily_streams` | `(track_id, date DESC)` | Stream history for a track |
| `daily_streams` | `(date DESC)` | Latest data across all tracks |
| `daily_streams` | `(platform, date DESC)` | Per-platform queries |
| `daily_artist_stats` | `(artist_id, date DESC)` | Artist trend charts |
| `playlist_tracks` | `(track_id) WHERE is_active` | Current playlists for a track |
| `revenue_entries` | `(artist_id)` | Revenue by artist |
| `revenue_entries` | `USING GIST (reporting_period)` | Date range queries |
| `score_snapshots` | `(artist_id, score_type, computed_at DESC)` | Latest scores |
| `insights` | `(artist_id) WHERE NOT is_read AND NOT is_dismissed` | Unread insights badge |
| `social_posts` | `(social_account_id, posted_at DESC)` | Feed display |
| `shows` | `(artist_id), (show_date DESC)` | Show calendar |

### Query Patterns and Expected Performance

| Query | Tables | Expected Time |
|---|---|---|
| Dashboard KPIs (total streams, followers, revenue) | Vercel KV cache (backed by aggregation query) | < 5ms (cached), < 200ms (cold) |
| Track catalog page | tracks + track_credits + collaborators | < 50ms |
| Stream chart (single track, 365 days) | daily_streams | < 100ms |
| Revenue by month (12 months) | revenue_entries with GIST index | < 100ms |
| Latest scores for all models | score_snapshots | < 50ms |
| Unread insights count | insights partial index | < 10ms |

---

## 19. Row-Level Security

Supabase RLS ensures users only see their own data.

```sql
-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
-- ... (all tables)

-- Policy: users can only access their own account
CREATE POLICY "Users see own account"
  ON accounts FOR ALL
  USING (id = auth.uid());

-- Policy: users can only access artists under their account
CREATE POLICY "Users see own artists"
  ON artists FOR ALL
  USING (account_id = auth.uid());

-- Policy: users can only access tracks for their artists
CREATE POLICY "Users see own tracks"
  ON tracks FOR ALL
  USING (artist_id IN (
    SELECT id FROM artists WHERE account_id = auth.uid()
  ));

-- Policy pattern for all artist-scoped tables:
-- USING (artist_id IN (SELECT id FROM artists WHERE account_id = auth.uid()))

-- For join tables (track_credits, playlist_tracks, etc.):
-- USING (track_id IN (
--   SELECT id FROM tracks WHERE artist_id IN (
--     SELECT id FROM artists WHERE account_id = auth.uid()
--   )
-- ))

-- Service role (for cron jobs and API routes) bypasses RLS
-- Use supabase.createClient(url, SERVICE_ROLE_KEY) in server-side code
```

---

## 20. Appendix: Current Data File Mapping

Detailed field-by-field mapping from current static files to new schema columns.

### `jakke_songs_all.csv` -> `tracks`

| CSV Column | DB Column | Transform |
|---|---|---|
| `song` | `tracks.title` | Direct |
| `listeners` | (not stored — derived from daily_artist_stats) | Skip |
| `streams` | Insert one `daily_streams` row with date = import date | Move to time-series |
| `saves` | (all zeros in current data) | Skip |
| `release_date` | `tracks.release_date` | Parse as DATE; NULL if empty |
| `artist` | `tracks.artist_id` | Look up artist by name |
| `collaborators` | `track_credits` rows | Split on comma, create collaborator + credit |
| `popularity` | Insert one `daily_artist_stats` row | Move to time-series |
| `genre` | `tracks.genre` | Direct |

### `musicteam_catalog.csv` -> `tracks` (merge)

| CSV Column | DB Column | Transform |
|---|---|---|
| `Title` | Match existing `tracks.title` | Join key |
| `Artist/Project` | Match existing `tracks.artist_id` | Join key |
| `Writers` | `track_credits` with role = 'writer' | Split on comma |
| `ISRC` | `tracks.isrc` | Only for Type = 'Recording' |
| `ISWC` | `tracks.iswc` | Only for Type = 'Work' |
| `Stereo` | `tracks.has_stereo` | 'Yes' -> true |
| `Dolby Atmos` | `tracks.has_dolby_atmos` | 'Yes' -> true |
| `Type` | Used to determine which fields to update | 'Recording' = ISRC, 'Work' = ISWC |

### `songstats_jakke.json` -> multiple tables

| JSON Path | DB Table | DB Column |
|---|---|---|
| `spotify.total_streams` | `daily_artist_stats` | (derive: sum of daily_streams) |
| `spotify.monthly_listeners` | `daily_artist_stats` | `monthly_listeners` |
| `spotify.followers` | `daily_artist_stats` | `followers` |
| `spotify.popularity_score` | `daily_artist_stats` | `popularity_score` |
| `spotify.artist_rank` | `daily_artist_stats` | `artist_rank` |
| `spotify.current_playlists` | `daily_artist_stats` | `current_playlists` |
| `spotify.playlist_reach` | `daily_artist_stats` | `playlist_reach` |
| `track_popularity.*` | `score_snapshots` (input to song health) | Used in computation |
| `currently_playlisted` | `playlist_tracks.is_active = true` | Match by title |
| `top_playlists[*]` | `playlists` rows | One row per playlist |

### `instagram_jakke_insights_30d.json` -> multiple tables

| JSON Path | DB Table | Notes |
|---|---|---|
| `account.*` | `social_accounts` | Update follower count |
| `overview.*` | `daily_social_stats` | Single row for the 30-day period |
| `follower_demographics.*` | `audience_snapshots` | One snapshot row |
| `follower_active_hours` | `audience_snapshots` (stored in JSONB) | Part of audience snapshot |
| `messaging.*` | `daily_social_stats` | Additional columns |

---

## Schema Summary

| Table | Rows (Est. Year 1) | Growth Rate | Primary Query Pattern |
|---|---|---|---|
| accounts | 1 | Static | Auth lookup |
| artists | 3 | Rare additions | Dashboard, all pages |
| artist_platforms | 15 | Rare | Platform connection |
| team_members | 5-10 | Slow | Settings page |
| releases | 20-30 | ~10/year | Catalog page |
| tracks | 30-50 | ~10/year | Everywhere |
| track_platforms | 150-350 | ~7x tracks | Cross-platform linking |
| collaborators | 15-25 | ~5/year | Catalog, collaborator page |
| track_credits | 50-80 | ~2x tracks | Catalog detail |
| daily_streams | 100K-1M | ~200K/year | Streaming charts, dashboard |
| daily_artist_stats | 5K-10K | ~3K/year | Growth charts |
| playlists | 100-500 | ~50/year | Playlist intelligence |
| playlist_tracks | 200-1000 | ~100/year | Track detail |
| daily_playlist_stats | 50K-180K | Proportional to playlists | Playlist trends |
| audience_snapshots | 50-200 | ~4/month | Demographics page |
| listener_territories | 1K-5K | Depends on API | Geographic page |
| revenue_entries | 1K-5K | Monthly imports | Revenue page |
| expenses | 50-200 | Manual entry | Financial page |
| royalty_splits | 50-100 | Proportional to tracks | Revenue detail |
| import_batches | 20-50 | ~2/month | Import history |
| social_accounts | 3-5 | Rare | Settings |
| daily_social_stats | 2K-4K | ~1K/year | Social page |
| social_posts | 5K-10K | ~2K/year | Social page |
| sync_placements | 0-20 | Depends on activity | Sync page |
| sync_opportunities | 0-50 | Depends on activity | Sync page |
| venues | 10-50 | As shows added | Live page |
| shows | 10-50 | ~20/year | Live page |
| setlist_tracks | 100-500 | ~10x shows | Show detail |
| goals | 5-20 | ~5/quarter | Goals page |
| release_plans | 5-15 | ~10/year | Release calendar |
| score_snapshots | 5K-10K | ~20/day (7 models x 3 artists) | AI Insights page |
| insights | 500-2K | ~5/day | Insights feed |
| monthly_stream_rollups | 2K-5K | ~200/month | Fast aggregation |

**Total estimated storage (Year 1):** ~200MB-500MB PostgreSQL, well within Supabase Pro plan limits.

---

## Next Steps

1. **ARCH (Command Center Engineer):** Initialize Supabase project, run migration scripts, update `src/lib/data.ts` to read from Supabase instead of static files
2. **AUTO (Automation Architect):** Design the data ingestion cron jobs (Chartmetric/Songstats daily fetch, monthly rollup)
3. **GROWTH (Growth Intelligence):** Implement scoring models as Supabase Edge Functions that write to `score_snapshots`
4. **DATA (CRM & Data Ops):** Build the DistroKid CSV import UI and seed script
5. **SRE (Platform Reliability):** Set up Supabase monitoring, backup verification, migration CI
