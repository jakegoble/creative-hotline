# Platform Reliability Specification — Music Command Center

> Architecture, testing, caching, security, monitoring, and performance for a Next.js 15 platform connecting to 20+ external APIs.
> Written 2026-02-26 by Platform Reliability Engineer.

---

## Table of Contents

1. [System Overview & Constraints](#1-system-overview--constraints)
2. [API Reliability Architecture](#2-api-reliability-architecture)
3. [Testing Strategy](#3-testing-strategy)
4. [Data Freshness & Caching](#4-data-freshness--caching)
5. [Security Model](#5-security-model)
6. [Monitoring & Alerting](#6-monitoring--alerting)
7. [Performance Optimization](#7-performance-optimization)
8. [Deployment & Infrastructure](#8-deployment--infrastructure)
9. [Incident Response & Error Budgets](#9-incident-response--error-budgets)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. System Overview & Constraints

### Current State

The app at `/Users/bronteruiz/music-command-center-next/` is a Next.js 15 + React 19 + TypeScript + TailwindCSS v4 + Recharts application. Today it reads static CSV/JSON files from `/public/data/` via client-side fetch. There are zero live API connections, no database, no authentication, no caching layer, and no background jobs.

### Target State

A production platform that:
- Connects to 20+ external APIs across 4 scheduling tiers (hourly, daily, weekly, monthly)
- Serves pre-aggregated dashboard data with sub-200ms page loads
- Degrades gracefully when any external API is unavailable
- Tracks two artist profiles (Jakke, Enjune) across all platforms
- Supports future multi-tenant expansion (other artists/labels)
- Runs on Vercel with a Supabase PostgreSQL backend

### Key Constraints

| Constraint | Value | Source |
|-----------|-------|--------|
| Spotify rate limit | ~180 req/min rolling | Spotify docs |
| YouTube daily quota | 10,000 units/day | Google API console |
| YouTube search cost | 100 units/call | Must minimize search usage |
| Instagram rate limit | 200 calls/user/hr | Meta Graph API |
| Chartmetric Pro daily limit | 5,000 req/day | Chartmetric pricing |
| Songstats rate limit | 100 req/min | Songstats docs |
| Deezer rate limit | 50 req/5s (per IP) | Deezer docs |
| MusicBrainz rate limit | 1 req/s (strict) | MusicBrainz docs |
| Spotify token lifetime | 1 hour | OAuth spec |
| Instagram token lifetime | 60 days (long-lived) | Meta docs |
| TikTok token lifetime | 24 hours | TikTok docs |
| Chartmetric token lifetime | 7 days | Chartmetric docs |
| Vercel serverless timeout | 60s (Pro), 300s (Enterprise) | Vercel docs |
| Vercel cron granularity | 1/day (Hobby), 1/hr (Pro) | Vercel docs |
| Supabase free tier | 500MB DB, 1GB file storage | Supabase pricing |
| Target page load | < 200ms for cached data | Internal SLA |
| Target data freshness | Streaming: 1x/day, Social: 1x/hr, Financial: 1x/week | See Section 4 |

---

## 2. API Reliability Architecture

### 2.1 Unified API Client Layer

Every external API gets a dedicated client class in `src/lib/api/`. All clients extend a base class that enforces rate limiting, circuit breaking, retries, and observability.

**File structure:**

```
src/lib/api/
  base-client.ts          # Abstract base: rate limiter, circuit breaker, retry, logging
  spotify-client.ts       # Spotify Web API (Client Credentials flow)
  youtube-client.ts       # YouTube Data API v3
  instagram-client.ts     # Instagram Graph API (Meta OAuth)
  tiktok-client.ts        # TikTok Creator API
  chartmetric-client.ts   # Chartmetric (refresh token flow)
  songstats-client.ts     # Songstats API
  deezer-client.ts        # Deezer (public, no auth)
  musicbrainz-client.ts   # MusicBrainz (User-Agent required)
  bandsintown-client.ts   # Bandsintown (API key)
  discogs-client.ts       # Discogs (Personal Access Token)
  tidal-client.ts         # Tidal (OAuth Client Credentials)
  mailchimp-client.ts     # Mailchimp (API key)
  types.ts                # Shared API response types
  errors.ts               # Custom error classes (RateLimitError, AuthError, CircuitOpenError)
  health.ts               # Health check runner
```

### 2.2 Base Client Implementation

```typescript
// src/lib/api/base-client.ts — pseudocode specification

abstract class BaseApiClient {
  // -- Configuration --
  abstract readonly name: string;           // e.g. "spotify", "youtube"
  abstract readonly baseUrl: string;
  abstract readonly maxRequestsPerWindow: number;
  abstract readonly windowMs: number;       // rate limit window in ms
  abstract readonly maxRetries: number;     // default: 3
  abstract readonly baseDelayMs: number;    // default: 1000
  abstract readonly circuitThreshold: number;  // failures before circuit opens (default: 5)
  abstract readonly circuitResetMs: number;    // time before half-open (default: 60_000)

  // -- Rate Limiter (Token Bucket) --
  // In-memory for single-instance, Redis-backed for multi-instance
  private tokens: number;
  private lastRefill: number;

  protected async rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
    await this.acquireToken();   // blocks until a token is available
    return this.fetchWithCircuitBreaker(url, init);
  }

  private async acquireToken(): Promise<void> {
    // Refill tokens based on elapsed time
    // If no tokens available, sleep until next refill
    // Throw RateLimitError if wait would exceed 30s
  }

  // -- Circuit Breaker (three states: CLOSED, OPEN, HALF_OPEN) --
  private circuitState: "closed" | "open" | "half_open" = "closed";
  private consecutiveFailures: number = 0;
  private circuitOpenedAt: number = 0;

  private async fetchWithCircuitBreaker(url: string, init?: RequestInit): Promise<Response> {
    if (this.circuitState === "open") {
      if (Date.now() - this.circuitOpenedAt > this.circuitResetMs) {
        this.circuitState = "half_open";
      } else {
        throw new CircuitOpenError(this.name);
      }
    }

    try {
      const response = await this.fetchWithRetry(url, init);
      this.onSuccess();
      return response;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.circuitState = "closed";
  }

  private onFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.circuitThreshold) {
      this.circuitState = "open";
      this.circuitOpenedAt = Date.now();
    }
  }

  // -- Retry with Exponential Backoff + Jitter --
  private async fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...init,
          headers: { ...this.getDefaultHeaders(), ...init?.headers },
          signal: AbortSignal.timeout(15_000),  // 15s per-request timeout
        });

        // Handle rate limit responses
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("Retry-After") ?? "5", 10);
          await this.sleep(retryAfter * 1000);
          continue;
        }

        // Handle auth failures
        if (response.status === 401) {
          await this.refreshAuth();
          continue;  // retry with new token
        }

        if (!response.ok) {
          throw new ApiError(this.name, response.status, await response.text());
        }

        // Record metrics
        this.recordLatency(Date.now() - startTime);
        this.recordSuccess();
        return response;
      } catch (error) {
        if (attempt === this.maxRetries) throw error;

        // Exponential backoff: 1s, 2s, 4s + random jitter 0-500ms
        const delay = this.baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        await this.sleep(delay);
      }
    }
    throw new Error("unreachable");
  }

  // -- Auth (overridden by subclasses that need token refresh) --
  protected async refreshAuth(): Promise<void> {
    // No-op by default. Overridden by Spotify, Instagram, Chartmetric, TikTok
  }

  protected abstract getDefaultHeaders(): Record<string, string>;

  // -- Observability --
  private recordLatency(ms: number): void { /* push to metrics collector */ }
  private recordSuccess(): void { /* increment counter */ }
  private recordFailure(status: number): void { /* increment counter by status */ }
}
```

### 2.3 Rate Limit Strategy Per API

| API | Algorithm | Config | Notes |
|-----|-----------|--------|-------|
| Spotify | Token bucket: 3 req/s (180/min) | `maxRequests: 150`, `windowMs: 60_000` | Leave 30 req/min headroom. Adaptive — if we get 429s, halve the rate |
| YouTube Data | Daily quota tracker | `maxUnits: 8_000/day` | Reserve 2K units for ad-hoc. Search capped at 10 calls/day (1000 units) |
| Instagram | Token bucket: 3 req/s (200/hr) | `maxRequests: 180`, `windowMs: 3_600_000` | Leave 20 req/hr headroom for manual browsing |
| TikTok | Token bucket: 1 req/s (100/min) | `maxRequests: 80`, `windowMs: 60_000` | Conservative. Research API separate: 1000 queries/day |
| Chartmetric | Daily quota: 5000/day | `maxRequests: 4500`, `windowMs: 86_400_000` | Spread across 24 cron runs = ~187 req/run max |
| Songstats | Token bucket: 80 req/min | `maxRequests: 80`, `windowMs: 60_000` | Leave 20% headroom |
| Deezer | Token bucket: 8 req/5s | `maxRequests: 8`, `windowMs: 5_000` | Per-IP limit. In serverless, IPs rotate — monitor carefully |
| MusicBrainz | Fixed: 1 req/s | `maxRequests: 1`, `windowMs: 1_000` | Strict. Use aggressive caching. Batch weekly |
| Bandsintown | Token bucket: 2 req/s | `maxRequests: 100`, `windowMs: 60_000` | Conservative (undocumented limit, observed ~120/min) |
| Discogs | Token bucket: 1 req/s (60/min auth) | `maxRequests: 55`, `windowMs: 60_000` | Documented at 60/min auth, 25/min unauth |

### 2.4 Circuit Breaker Configuration

| API | Failure Threshold | Reset Timeout | Half-Open Probes | Rationale |
|-----|------------------|---------------|-----------------|-----------|
| Spotify | 5 failures | 60s | 1 request | Core API, fast recovery expected |
| YouTube | 3 failures | 120s | 1 request | Quota exhaustion needs longer cooldown |
| Instagram | 5 failures | 60s | 1 request | Standard |
| TikTok | 3 failures | 300s | 1 request | Less reliable API, longer cooldown |
| Chartmetric | 3 failures | 120s | 1 request | Paid API, contact support if persistent |
| Songstats | 3 failures | 120s | 1 request | Standard |
| All others | 5 failures | 60s | 1 request | Default |

Circuit states are stored in-memory per serverless function invocation. For cross-invocation persistence, use Vercel KV (Redis):

```typescript
// Circuit state in Redis for serverless persistence
interface CircuitState {
  state: "closed" | "open" | "half_open";
  failures: number;
  openedAt: number | null;
  lastCheckedAt: number;
}

// Key pattern: circuit:{api_name}
// TTL: 10 minutes (auto-close if no activity)
```

### 2.5 Graceful Degradation Strategy

When an API is down (circuit open), the app does NOT show errors. It falls back through a defined hierarchy:

```
Live API data (freshest)
  -> Cached data from last successful fetch (database)
    -> Static fallback data (public/data/ files)
      -> Placeholder UI with "Data temporarily unavailable" message
```

**Per-section degradation rules:**

| Dashboard Section | Primary Source | Fallback 1 (DB Cache) | Fallback 2 (Static) | Fallback 3 (UI) |
|------------------|---------------|----------------------|---------------------|-----------------|
| Streaming KPIs | Songstats/Chartmetric API | Last DB snapshot (show "as of {date}") | songstats_jakke.json | Gray cards with "Updating..." |
| Track Popularity | Spotify Web API | Last DB snapshot | songstats_jakke.json track_popularity | Static chart from JSON |
| Playlist Intelligence | Chartmetric API | Last DB snapshot | songstats_jakke.json top_playlists | "Playlist data syncing" |
| Instagram Metrics | Instagram Graph API | Last DB snapshot | instagram_jakke_insights_30d.json | Static IG data |
| YouTube Metrics | YouTube Data API | Last DB snapshot | N/A (no static data) | "Connect YouTube" CTA |
| Revenue | DistroKid CSV import | Last import in DB | Estimated from stream counts | Estimate badge shown |
| Scoring Models | Computed from above | Computed from cached data | Computed from static data | "Insufficient data" |

**Staleness indicators:** Every metric card that uses cached data shows a small timestamp: "Updated 2h ago" in dim text. If data is >24h stale for hourly metrics or >48h stale for daily metrics, the timestamp turns amber.

### 2.6 Token Refresh Management

Four APIs require proactive token refresh:

#### Spotify (hourly expiry)

```typescript
class SpotifyClient extends BaseApiClient {
  private tokenExpiresAt: number = 0;
  private accessToken: string = "";

  protected async refreshAuth(): Promise<void> {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    });
    const { access_token, expires_in } = await response.json();
    this.accessToken = access_token;
    // Refresh 5 minutes before expiry
    this.tokenExpiresAt = Date.now() + (expires_in - 300) * 1000;
  }

  protected getDefaultHeaders() {
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  protected async rateLimitedFetch(url: string, init?: RequestInit) {
    if (Date.now() > this.tokenExpiresAt) {
      await this.refreshAuth();
    }
    return super.rateLimitedFetch(url, init);
  }
}
```

#### Instagram (60-day long-lived tokens)

```typescript
// Refresh when token age > 50 days (10-day buffer)
// Store token + refresh date in database
// Cron job checks daily: if token_age > 50 days, exchange for new long-lived token
// POST https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token={token}
// Alert if token_age > 55 days and refresh has not succeeded
```

#### Chartmetric (7-day tokens)

```typescript
// Refresh when token age > 6 days (1-day buffer)
// POST https://api.chartmetric.com/api/token { refreshtoken: stored_refresh_token }
// Store new access_token + refresh_token in database
// Alert if refresh fails
```

#### TikTok (24-hour tokens)

```typescript
// Refresh daily via cron
// POST https://open.tiktokapis.com/v2/oauth/token/
// body: { client_key, client_secret, grant_type: "refresh_token", refresh_token }
// Refresh token valid 365 days — alert at 350 days to re-authorize
```

**Token storage:** All tokens are stored in Supabase with server-side encryption. Never exposed to the client. Accessed only from server components, API routes, and cron jobs.

### 2.7 Health Check System

```typescript
// src/lib/api/health.ts

interface HealthCheckResult {
  api: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  lastSuccessAt: string;         // ISO timestamp
  lastErrorAt: string | null;
  circuitState: "closed" | "open" | "half_open";
  rateLimitRemaining: number;    // estimated remaining quota
  rateLimitResetAt: string;      // when the window resets
  errorRate: number;             // errors / total in last hour
  tokenExpiresAt: string | null; // for OAuth APIs
}

// Health check endpoints (lightweight, read-only):
const HEALTH_CHECKS: Record<string, { url: string; unitCost: number }> = {
  spotify:      { url: "/v1/artists/{jakke_id}", unitCost: 0 },
  youtube:      { url: "/channels?id={channel_id}&part=id", unitCost: 1 },
  instagram:    { url: "/{user_id}?fields=id", unitCost: 1 },
  chartmetric:  { url: "/api/artist/{cm_id}", unitCost: 1 },
  songstats:    { url: "/artists/{id}/stats", unitCost: 1 },
  deezer:       { url: "/artist/{id}", unitCost: 0 },
  musicbrainz:  { url: "/artist/{mbid}?fmt=json", unitCost: 0 },
  bandsintown:  { url: "/artists/{name}?app_id={key}", unitCost: 0 },
  discogs:      { url: "/artists/{id}", unitCost: 0 },
};

// Run all health checks in parallel, 10s timeout each
// Aggregate into /api/health endpoint
// Status rules:
//   healthy:  response < 2s, no errors in last 5 min
//   degraded: response 2-10s, or error rate > 5% in last hour
//   down:     circuit open, or no successful response in last 15 min
```

**Health check schedule:** Every 5 minutes via Vercel Cron (Pro plan). Results stored in `api_health_checks` table with 30-day retention.

**Health dashboard:** Dedicated `/health` page in the app shows all API statuses, latency sparklines, and quota usage. Accessible without auth for uptime monitoring tools.

---

## 3. Testing Strategy

### 3.1 Test Pyramid

```
                  ┌────────────┐
                  │    E2E     │  5-10 tests: critical user paths
                  │  (Playwright) │
                 ┌┴────────────┴┐
                 │  Integration  │  30-50 tests: API client + DB + cache
                 │  (Vitest + MSW) │
                ┌┴──────────────┴┐
                │    Unit Tests    │  200+ tests: scoring, formatting, transforms
                │    (Vitest)      │
               ┌┴──────────────────┴┐
               │   Type Checking     │  Continuous: tsc --noEmit
               └────────────────────┘
```

### 3.2 Unit Tests

**Framework:** Vitest (native ESM support, compatible with Next.js 15)

**Scope:** All pure functions in `src/lib/`. Zero network calls, zero database access.

```
src/lib/
  __tests__/
    scoring.test.ts           # Career momentum, song health, sync readiness, audience quality
    revenue.test.ts           # Revenue estimation, stream normalization, RWSE
    format.test.ts            # Number/currency/date formatting
    transforms.test.ts        # API response -> internal type transformations
    rate-limiter.test.ts      # Token bucket algorithm correctness
    circuit-breaker.test.ts   # State transitions, timing
    cache-keys.test.ts        # Cache key generation, TTL rules
```

**Key test patterns:**

```typescript
// Scoring model tests: boundary values, known outputs
describe("CareerMomentumScore", () => {
  it("returns 0 for artist with zero activity", () => { /* ... */ });
  it("returns 100 for artist with maximal velocity across all dimensions", () => { /* ... */ });
  it("handles missing data gracefully (partial inputs)", () => { /* ... */ });
  it("weights streaming velocity at 30%", () => { /* ... */ });
  it("clamps sub-scores to 0-100 range", () => { /* ... */ });
});

// Rate limiter tests: timing behavior
describe("TokenBucketRateLimiter", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("allows burst up to max tokens", async () => { /* ... */ });
  it("blocks when tokens exhausted", async () => { /* ... */ });
  it("refills tokens over time", async () => { /* ... */ });
  it("respects per-API configuration", async () => { /* ... */ });
});

// Circuit breaker tests: state machine
describe("CircuitBreaker", () => {
  it("opens after N consecutive failures", () => { /* ... */ });
  it("transitions to half-open after reset timeout", () => { /* ... */ });
  it("closes on success during half-open", () => { /* ... */ });
  it("re-opens on failure during half-open", () => { /* ... */ });
});
```

**Target:** 200+ unit tests. Run on every commit via `vitest run`.

### 3.3 Integration Tests

**Framework:** Vitest + MSW (Mock Service Worker) for API mocking

**Why MSW:** Intercepts fetch requests at the network level. Tests exercise the full client code path (auth headers, rate limiting, retry logic, response parsing) without touching real APIs. Works in Node.js (server components, API routes) and in browser (client components).

**Setup:**

```typescript
// src/lib/api/__tests__/setup.ts
import { setupServer } from "msw/node";
import { spotifyHandlers } from "./handlers/spotify";
import { youtubeHandlers } from "./handlers/youtube";
import { chartmetricHandlers } from "./handlers/chartmetric";
// ... all API handlers

export const server = setupServer(
  ...spotifyHandlers,
  ...youtubeHandlers,
  ...chartmetricHandlers,
);
```

**Mock handler pattern:**

```typescript
// src/lib/api/__tests__/handlers/spotify.ts
import { http, HttpResponse } from "msw";
import { MOCK_ARTIST, MOCK_TOP_TRACKS, MOCK_AUDIO_FEATURES } from "../fixtures/spotify";

export const spotifyHandlers = [
  // Happy path: artist data
  http.get("https://api.spotify.com/v1/artists/:id", ({ params }) => {
    if (params.id === "JAKKE_ID") return HttpResponse.json(MOCK_ARTIST);
    return new HttpResponse(null, { status: 404 });
  }),

  // Rate limit simulation
  http.get("https://api.spotify.com/v1/artists/:id/top-tracks", ({ request }) => {
    const rateLimitHeader = request.headers.get("X-Test-Force-429");
    if (rateLimitHeader === "true") {
      return new HttpResponse(null, {
        status: 429,
        headers: { "Retry-After": "2" },
      });
    }
    return HttpResponse.json(MOCK_TOP_TRACKS);
  }),

  // Token endpoint
  http.post("https://accounts.spotify.com/api/token", () => {
    return HttpResponse.json({
      access_token: "mock_token_" + Date.now(),
      token_type: "Bearer",
      expires_in: 3600,
    });
  }),
];
```

**Test scenarios per API client:**

| Scenario | What It Tests |
|----------|--------------|
| Happy path fetch | Correct URL construction, header injection, response parsing |
| 429 rate limit response | Retry-After header respected, request retried successfully |
| 401 unauthorized | Token refresh triggered, request retried with new token |
| 500 server error | Exponential backoff retry, eventual circuit breaker trip |
| Network timeout | 15s timeout fires, retry kicks in |
| Circuit breaker open | Immediate CircuitOpenError, fallback path exercised |
| Malformed response | Graceful error handling, no crash |
| Empty response | Default/zero values, no NaN propagation |
| Concurrent requests | Rate limiter queues correctly, no burst violation |

**Fixture data:**

```
src/lib/api/__tests__/fixtures/
  spotify.ts        # 2 mock artists, 12 mock tracks with audio features, 10 playlists
  youtube.ts        # 1 mock channel, 5 mock videos with stats
  instagram.ts      # 1 mock profile, 20 mock posts with insights, demographics
  chartmetric.ts    # Time-series data (90 days), playlist history, chart positions
  songstats.ts      # Mirror of songstats_jakke.json structure with test values
  deezer.ts         # 1 mock artist, 5 tracks with BPM
  musicbrainz.ts    # 1 mock artist with releases, ISRCs, relationships
```

**Generating realistic mock data:**

Fixtures are derived from real API response shapes but with synthetic values. A `generate-fixtures.ts` script exists to:
1. Read actual API documentation schemas
2. Generate TypeScript fixtures with realistic but fake data
3. Ensure edge cases are covered (zero values, very large numbers, unicode artist names, missing optional fields)

For music catalog realism, the fixtures include:
- 12 tracks matching the existing catalog structure
- Popularity scores distributed 0-100 with realistic clustering (most between 15-40 for indie artists)
- Stream counts following a long-tail distribution (top track has 5-10x the median)
- Dates spanning 2022-2026 for release cadence testing

**Target:** 30-50 integration tests. Run on every PR via CI.

### 3.4 End-to-End Tests

**Framework:** Playwright

**Scope:** Test the full user experience from browser through Next.js to mocked APIs. NOT testing real external APIs.

```
e2e/
  dashboard.spec.ts        # KPIs load, charts render, fallback on API failure
  streaming.spec.ts        # Streaming page data, catalog table, playlist section
  catalog.spec.ts          # Catalog browsing, search, filtering
  revenue.spec.ts          # Revenue estimates, CSV import flow
  instagram.spec.ts        # IG metrics, demographics, top posts
  scoring.spec.ts          # AI insights replacement page with live scores
  health.spec.ts           # Health dashboard shows all API statuses
  offline-mode.spec.ts     # App works with all APIs down (static fallback)
  navigation.spec.ts       # Sidebar navigation, page transitions, no state loss
```

**E2E test patterns:**

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("displays KPI cards with streaming data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("kpi-total-streams")).toBeVisible();
    await expect(page.getByTestId("kpi-total-streams")).not.toContainText("0");
  });

  test("shows staleness indicator when data is cached", async ({ page }) => {
    // MSW handler returns data with last_updated = 3 hours ago
    await page.goto("/");
    await expect(page.getByTestId("staleness-badge")).toContainText("3h ago");
  });

  test("degrades gracefully when Spotify API is down", async ({ page }) => {
    // MSW handler returns 503 for all Spotify endpoints
    await page.goto("/streaming");
    // Should show cached data, not an error page
    await expect(page.getByTestId("kpi-total-streams")).toBeVisible();
    await expect(page.getByText("Data temporarily unavailable")).not.toBeVisible();
  });
});
```

**Target:** 5-10 E2E tests covering critical paths. Run nightly or on release branches.

### 3.5 Testing OAuth-Protected APIs

Problem: Instagram, YouTube Analytics, and TikTok require artist-account OAuth tokens that cannot be generated in CI.

**Solution: Three-layer approach**

1. **Unit tests:** Test everything except the actual HTTP call. Token refresh logic, request construction, response parsing — all tested with mocked fetch.

2. **Integration tests (MSW):** Full client exercised against mock servers. Covers 95% of real behavior including auth flows.

3. **Manual smoke tests (quarterly):** A `scripts/smoke-test-apis.ts` script that runs once against real APIs with real tokens. Executed manually by a developer who has OAuth access. Results logged to `tests/smoke-results/` for audit.

```typescript
// scripts/smoke-test-apis.ts
// Usage: SPOTIFY_TOKEN=xxx INSTAGRAM_TOKEN=xxx npx tsx scripts/smoke-test-apis.ts
// Runs one lightweight request per API, logs response shape + latency
// Does NOT run in CI — manual only
```

### 3.6 Performance Testing

**Load testing for data sync jobs:**

```typescript
// scripts/perf/sync-benchmark.ts
// Simulates a full daily sync cycle against MSW mock servers
// Measures:
//   - Total wall clock time
//   - Peak memory usage
//   - Requests per API
//   - Rate limiter queue depth over time
// Assertion: full daily sync completes in < 5 minutes
// Assertion: peak memory < 512MB (Vercel serverless limit)
```

**Rendering performance:**

```typescript
// e2e/performance.spec.ts
test("dashboard loads in under 2 seconds", async ({ page }) => {
  const start = Date.now();
  await page.goto("/");
  await page.waitForSelector("[data-testid='kpi-total-streams']");
  expect(Date.now() - start).toBeLessThan(2000);
});

test("streaming page with 12 tracks renders charts in under 1 second", async ({ page }) => {
  await page.goto("/streaming");
  const metrics = await page.evaluate(() => {
    return JSON.parse(
      JSON.stringify(window.performance.getEntriesByType("navigation")[0])
    );
  });
  expect(metrics.domContentLoadedEventEnd - metrics.fetchStart).toBeLessThan(1000);
});
```

### 3.7 Test Configuration

```
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: "node",                 // Server-side testing by default
    include: ["src/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
    setupFiles: ["src/lib/api/__tests__/setup.ts"],
  },
});
```

**CI pipeline:**

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx tsc --noEmit          # Type check
      - run: npx vitest run --coverage  # Unit + integration
      - run: npx next build             # Build check
  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx next build
      - run: npx playwright test
```

---

## 4. Data Freshness & Caching

### 4.1 Freshness SLAs

| Data Category | Target Freshness | Update Frequency | Acceptable Staleness | Cache TTL |
|--------------|-----------------|-----------------|---------------------|-----------|
| Streaming KPIs (followers, listeners, popularity) | < 1 hour | Hourly (Spotify, Chartmetric) | 4 hours | 3600s |
| Social metrics (IG followers, engagement) | < 1 hour | Hourly (IG Graph API) | 4 hours | 3600s |
| TikTok sound usage | < 1 hour | Hourly (if TikTok API available) | 6 hours | 3600s |
| Streaming daily totals (per-track streams) | < 24 hours | Daily (Songstats/Chartmetric) | 48 hours | 86400s |
| Playlist intelligence (adds/removes) | < 4 hours | Every 4 hours (Chartmetric) | 12 hours | 14400s |
| Chart positions | < 24 hours | Daily (Chartmetric) | 48 hours | 86400s |
| YouTube metrics | < 24 hours | Daily (YouTube Data API) | 48 hours | 86400s |
| Financial/revenue | < 7 days | Weekly (DistroKid import) | 30 days | 604800s |
| Catalog metadata | < 7 days | Weekly (MusicBrainz, Discogs) | 30 days | 604800s |
| Scoring model outputs | < 1 hour | Recomputed on data change | 4 hours | 3600s |
| Audio features | < 30 days | On new release only | 90 days | 2592000s |

### 4.2 Caching Architecture (4 Layers)

```
┌───────────────────────────────────────────────────────────┐
│  Layer 1: React Server Components (RSC) Cache             │
│  Built into Next.js 15. fetch() in server components      │
│  has automatic deduplication + revalidation.               │
│  Scope: per-request deduplication during SSR               │
│  TTL: request lifetime                                     │
└────────────────────────┬──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│  Layer 2: Next.js Data Cache (Full Route Cache / ISR)     │
│  Pages and API routes cached at the edge.                  │
│  Revalidated on schedule or on-demand.                     │
│  Scope: edge CDN, all users                                │
│  TTL: per-route (see table below)                          │
└────────────────────────┬──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│  Layer 3: Vercel KV (Redis) — Hot Cache                   │
│  Pre-aggregated dashboard KPIs, scoring outputs.           │
│  Written by cron sync jobs, read by API routes.            │
│  Scope: cross-request, cross-invocation                    │
│  TTL: matches freshness SLA per data category              │
└────────────────────────┬──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│  Layer 4: Supabase PostgreSQL — Source of Truth            │
│  All raw API responses stored with timestamps.             │
│  Time-series tables for historical trends.                 │
│  Scope: permanent storage, offline mode fallback           │
│  TTL: no expiry (historical data retained permanently)     │
└───────────────────────────────────────────────────────────┘
```

### 4.3 Next.js Caching Configuration

#### Route-Level Caching (ISR)

```typescript
// src/app/page.tsx (Dashboard)
// Revalidate every 5 minutes — shows near-real-time KPIs from Redis cache
export const revalidate = 300;

// src/app/streaming/page.tsx
// Revalidate every hour — streaming data updates hourly
export const revalidate = 3600;

// src/app/catalog/page.tsx
// Revalidate daily — catalog doesn't change often
export const revalidate = 86400;

// src/app/revenue/page.tsx
// Revalidate weekly — financial data is weekly
export const revalidate = 604800;
```

#### API Route Caching

```typescript
// src/app/api/streaming/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // Read from Redis cache (Layer 3), fall back to DB (Layer 4)
  const data = await getStreamingData();

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      // s-maxage=3600: CDN caches for 1 hour
      // stale-while-revalidate=7200: serve stale for 2 more hours while refreshing
    },
  });
}
```

#### On-Demand Revalidation

```typescript
// src/app/api/revalidate/route.ts
// Called by cron jobs after successful data sync
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const { secret, paths, tags } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Revalidate specific paths
  for (const path of paths ?? []) {
    revalidatePath(path);
  }

  // Revalidate by tag (e.g., "streaming", "social", "catalog")
  for (const tag of tags ?? []) {
    revalidateTag(tag);
  }

  return Response.json({ revalidated: true, now: Date.now() });
}
```

#### fetch() Tag-Based Caching in Server Components

```typescript
// src/lib/data-server.ts — server-side data fetchers (replacing client-side data.ts)
export async function getStreamingKPIs() {
  // Uses Next.js fetch cache with tag-based revalidation
  const res = await fetch(`${process.env.API_BASE_URL}/api/streaming`, {
    next: {
      tags: ["streaming"],
      revalidate: 3600,
    },
  });
  return res.json();
}

export async function getSocialMetrics() {
  const res = await fetch(`${process.env.API_BASE_URL}/api/social`, {
    next: {
      tags: ["social"],
      revalidate: 3600,
    },
  });
  return res.json();
}
```

### 4.4 Cache Invalidation Strategy

**Event-driven invalidation:** When a cron sync job writes new data to the database, it calls the revalidation endpoint:

```typescript
// Inside cron sync job (e.g., daily streaming sync)
async function syncStreamingData() {
  const data = await fetchFromChartmetric();
  await writeToDatabase(data);
  await writeToRedisCache(data);

  // Trigger Next.js cache invalidation
  await fetch(`${process.env.APP_URL}/api/revalidate`, {
    method: "POST",
    body: JSON.stringify({
      secret: process.env.REVALIDATION_SECRET,
      tags: ["streaming"],
      paths: ["/", "/streaming"],
    }),
  });
}
```

**TTL-based expiry:** Each Redis key has a TTL matching its freshness SLA. If a cron job fails, the key expires and the next read falls through to the database.

**Manual override:** The `/health` page includes a "Force Refresh" button per data category that triggers an immediate re-sync and cache invalidation. Rate-limited to 1 manual refresh per category per 5 minutes.

### 4.5 Offline / Fallback Mode

When ALL external APIs are unavailable (e.g., during a network outage):

1. **Database layer still works** — Supabase is independent of the data source APIs
2. **Redis cache still works** — Vercel KV is independent
3. **Static fallback always available** — `/public/data/` files are deployed with the app

The app automatically detects offline mode by checking the health endpoint. When 3+ APIs are down simultaneously:

```typescript
// Detected in middleware or layout server component
const health = await checkHealth();
const downCount = health.filter(h => h.status === "down").length;

if (downCount >= 3) {
  // Add banner: "Some data sources are temporarily unavailable. Showing cached data."
  // Log alert to monitoring
}
```

**No explicit offline toggle needed** — the degradation is automatic per-section, per the fallback table in Section 2.5.

---

## 5. Security Model

### 5.1 OAuth Token Management

**Storage:** All API tokens stored in Supabase in an `api_tokens` table:

```sql
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,             -- 'spotify', 'instagram', 'chartmetric', etc.
  artist_id TEXT NOT NULL,            -- 'jakke', 'enjune' (future: per-tenant artist)
  access_token TEXT NOT NULL,         -- encrypted at rest via Supabase column encryption
  refresh_token TEXT,                 -- encrypted
  expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[],                      -- OAuth scopes granted
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, artist_id)
);

-- Row Level Security: only service role can access
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON api_tokens
  USING (auth.role() = 'service_role');
```

**Access pattern:** Tokens are NEVER read from client components. Only accessed in:
- Server Components (via server-only imports)
- API Routes (`src/app/api/`)
- Cron job handlers

```typescript
// src/lib/api/token-store.ts
// Marked with 'server-only' to prevent client-side import
import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // service role for RLS bypass
);

export async function getToken(provider: string, artistId: string): Promise<string> {
  const { data, error } = await supabase
    .from("api_tokens")
    .select("access_token, expires_at, refresh_token")
    .eq("provider", provider)
    .eq("artist_id", artistId)
    .single();

  if (error || !data) throw new Error(`No token for ${provider}/${artistId}`);

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    return refreshAndStoreToken(provider, artistId, data.refresh_token);
  }

  return data.access_token;
}
```

### 5.2 Secret Management

**Environment variables (never committed):**

```
# .env.local (gitignored)
# -- Infrastructure --
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
KV_REST_API_URL=
KV_REST_API_TOKEN=
REVALIDATION_SECRET=

# -- API Keys (non-OAuth) --
YOUTUBE_API_KEY=
SONGSTATS_API_KEY=
BANDSINTOWN_APP_ID=
DISCOGS_TOKEN=
MUSICBRAINZ_USER_AGENT=
MAILCHIMP_API_KEY=
NEWSAPI_KEY=

# -- OAuth Credentials (used to generate tokens, stored in DB) --
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
META_APP_ID=
META_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
CHARTMETRIC_REFRESH_TOKEN=

# -- Artist IDs --
JAKKE_SPOTIFY_ID=
ENJUNE_SPOTIFY_ID=
JAKKE_YOUTUBE_CHANNEL_ID=
JAKKE_INSTAGRAM_BUSINESS_ID=
JAKKE_CHARTMETRIC_ID=
JAKKE_MUSICBRAINZ_ID=
JAKKE_DEEZER_ID=
JAKKE_BANDSINTOWN_SLUG=
JAKKE_DISCOGS_ID=
```

**Vercel deployment:** All env vars set via Vercel Dashboard (encrypted at rest, scoped to Production/Preview/Development).

**Never expose to client:** Use `NEXT_PUBLIC_` prefix ONLY for non-sensitive values (e.g., `NEXT_PUBLIC_APP_URL`). All API keys and tokens use server-only access patterns.

### 5.3 Multi-Tenant Data Isolation

Current scope: Single-tenant (Jake's artists only). But the architecture supports multi-tenancy:

```
api_tokens    → scoped by artist_id
streaming_data → scoped by artist_id
social_data    → scoped by artist_id
cache keys     → prefixed with artist_id (e.g., "jakke:streaming:kpis")
```

If we add a second user (another artist or label), data isolation is enforced at:
1. **Database:** Row Level Security policies filter by authenticated user's artist_ids
2. **Redis:** Key prefix includes artist_id
3. **API routes:** Middleware validates the user has access to the requested artist_id
4. **Cron jobs:** Per-artist job configs in a `sync_config` table

### 5.4 PII Handling

**What PII we process:**

| Data | Source | Classification | Handling |
|------|--------|---------------|----------|
| Fan email addresses | Mailchimp/Kit list | PII | Stored encrypted. Displayed only in aggregate (list size, growth). Individual emails never shown in UI |
| Fan geographic data | IG demographics, Mailchimp locations | Aggregate PII | Stored as city/country aggregates only. No individual-level geo |
| Fan age/gender distribution | IG insights, Chartmetric | Aggregate PII | Percentage breakdowns only, no individual data |
| Artist email/contact | Config | PII | Stored in env vars, not in database |
| OAuth tokens | Multiple | Sensitive | Encrypted in DB, never logged, never exposed to client |

**PII rules:**
- No individual fan records stored (only aggregates)
- All API responses are stripped of PII before storage (emails, IP addresses)
- Log sanitization: a middleware strips tokens and emails from log output
- Data retention: aggregate social data retained indefinitely; raw API responses purged after 90 days

### 5.5 Content Security Policy

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Required by Next.js
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https://*.scdn.co https://*.mzstatic.com https://*.ytimg.com",
            "connect-src 'self' https://*.supabase.co",
            "frame-ancestors 'none'",
          ].join("; "),
        },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
};
```

---

## 6. Monitoring & Alerting

### 6.1 Metrics to Track

#### API Health Metrics (per API)

| Metric | Type | Description |
|--------|------|-------------|
| `api.request.count` | Counter | Total requests per API per hour |
| `api.request.success` | Counter | Successful (2xx) responses |
| `api.request.failure` | Counter | Non-2xx responses, by status code |
| `api.request.latency_ms` | Histogram | P50, P95, P99 latency per API |
| `api.rate_limit.remaining` | Gauge | Estimated remaining quota |
| `api.rate_limit.utilization` | Gauge | Quota used / quota total (0-1) |
| `api.circuit.state` | Gauge | 0=closed, 1=half_open, 2=open |
| `api.circuit.trips` | Counter | Number of times circuit opened |
| `api.token.expires_in_hours` | Gauge | Hours until OAuth token expires |
| `api.retry.count` | Counter | Number of retries per API |

#### Data Freshness Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `data.age_seconds` | Gauge | Seconds since last successful sync, per category |
| `data.sync.duration_ms` | Histogram | How long each sync job takes |
| `data.sync.records_written` | Counter | Rows written per sync |
| `data.sync.errors` | Counter | Sync job failures |
| `data.cache.hit_rate` | Gauge | Redis cache hit rate (0-1) |
| `data.cache.miss_rate` | Gauge | Redis cache miss rate |
| `data.staleness.violations` | Counter | Times data exceeded acceptable staleness |

#### Application Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `app.page.load_ms` | Histogram | Page load time per route (via Web Vitals) |
| `app.page.lcp_ms` | Histogram | Largest Contentful Paint per route |
| `app.page.fid_ms` | Histogram | First Input Delay |
| `app.page.cls` | Histogram | Cumulative Layout Shift |
| `app.error.count` | Counter | Unhandled errors per route |
| `app.render.server_ms` | Histogram | Server component render time |
| `scoring.compute_ms` | Histogram | Time to compute each scoring model |

### 6.2 Metrics Collection

**Primary:** Vercel Analytics (built-in Web Vitals, serverless function metrics)

**Application metrics:** Custom lightweight metrics collector that writes to Supabase:

```typescript
// src/lib/monitoring/metrics.ts
import "server-only";

interface MetricEvent {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: string;
}

// Batch metrics and flush every 30 seconds or 100 events
class MetricsCollector {
  private buffer: MetricEvent[] = [];
  private flushInterval = 30_000;

  record(name: string, value: number, tags: Record<string, string> = {}): void {
    this.buffer.push({
      name,
      value,
      tags,
      timestamp: new Date().toISOString(),
    });

    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = [...this.buffer];
    this.buffer = [];

    // Insert to Supabase metrics table
    await supabase.from("metrics").insert(batch);
  }
}

export const metrics = new MetricsCollector();
```

**For serverless persistence:** Since each Vercel function invocation is stateless, use `waitUntil()` (available in Next.js 15 via `unstable_after`) to flush metrics after the response is sent:

```typescript
// src/app/api/streaming/route.ts
import { after } from "next/server";

export async function GET() {
  const start = Date.now();
  const data = await getStreamingData();

  after(() => {
    metrics.record("api.route.latency_ms", Date.now() - start, { route: "/api/streaming" });
    metrics.flush();
  });

  return NextResponse.json(data);
}
```

### 6.3 Alert Thresholds

| Alert | Condition | Severity | Notification |
|-------|-----------|----------|-------------|
| API circuit open | Any API circuit stays open > 5 min | P1 - High | Email + Slack |
| Streaming data stale | `data.age_seconds` for streaming > 48h | P1 - High | Email |
| Social data stale | `data.age_seconds` for social > 6h | P2 - Medium | Slack |
| Token expiring soon | `api.token.expires_in_hours` < 24h (for 60-day tokens) | P1 - High | Email + Slack |
| Token refresh failed | Token refresh returns non-2xx | P1 - High | Email + Slack |
| High error rate | `api.request.failure` / `api.request.count` > 10% over 15 min | P2 - Medium | Slack |
| Rate limit near exhaustion | `api.rate_limit.utilization` > 80% | P2 - Medium | Slack |
| Rate limit hit | `api.rate_limit.utilization` = 100% | P1 - High | Email + Slack |
| Page load slow | P95 page load > 3s for 10 consecutive minutes | P3 - Low | Slack |
| Sync job failed | Cron job returned non-zero exit | P2 - Medium | Email |
| Sync job timeout | Cron job exceeded 60s (Vercel limit) | P1 - High | Email + Slack |
| Scoring model NaN | Any scoring model produces NaN or Infinity | P2 - Medium | Slack |
| Database connection error | Supabase connection fails | P1 - High | Email + Slack |
| Vercel deployment failed | Build or deploy error | P1 - High | Email (Vercel built-in) |

### 6.4 Alert Routing

```
P1 (High)  → Email to jake@radanimal.co + Slack #alerts channel
P2 (Medium) → Slack #alerts channel only
P3 (Low)   → Slack #monitoring channel (daily digest)
```

**Alert suppression:** If the same alert fires continuously, suppress after 3 notifications in 1 hour. Resume alerting after a 1-hour quiet period.

**Implementation:** Use Vercel's native alerting for deployment failures and function errors. For custom alerts (data freshness, circuit breakers, token expiry), a dedicated cron job (`/api/cron/check-alerts`) runs every 5 minutes and sends notifications via a simple webhook to Slack and/or email.

### 6.5 Uptime Targets & Error Budgets

| Component | Target Uptime | Error Budget (30 days) | Measurement |
|-----------|-------------|----------------------|-------------|
| Dashboard page load | 99.9% | 43 min downtime/month | Vercel Analytics |
| API data sync (hourly) | 99.5% | 3.6 hours missed syncs/month | Cron success rate |
| API data sync (daily) | 99.0% | 7.2 hours missed syncs/month | Cron success rate |
| Redis cache availability | 99.9% | 43 min/month | Vercel KV SLA |
| Database availability | 99.9% | 43 min/month | Supabase SLA |
| Health endpoint | 99.99% | 4.3 min/month | External uptime monitor |

**Error budget policy:**
- If error budget is < 25% remaining, freeze non-critical feature work and focus on reliability
- If error budget is exhausted, halt all deployments except reliability fixes

### 6.6 Dashboards

Build a `/health` page in the app with:

1. **API Status Grid:** Traffic light (green/amber/red) per API with latency sparkline
2. **Data Freshness Table:** Per-category age, last sync time, next scheduled sync
3. **Rate Limit Usage:** Bar chart showing % used per API for current window
4. **Token Expiry Timeline:** Horizontal bar showing days until each OAuth token expires
5. **Sync Job History:** Last 24 hours of cron executions with duration and status
6. **Error Rate Chart:** Line chart of error rate per API over last 7 days

---

## 7. Performance Optimization

### 7.1 Initial Data Load Strategy

When a new artist profile is onboarded, we need to backfill historical data. Chartmetric provides up to 2 years of daily time-series data per metric. For one artist, this could be:

```
Spotify listeners/day:  730 data points
Spotify followers/day:  730 data points
IG followers/day:       730 data points
YouTube views/day:      730 data points
Shazam count/day:       730 data points
Chart positions:        ~50-200 entries
Playlist history:       ~100-500 events
```

**Total estimate:** 5,000-10,000 records for a 2-year backfill per artist.

**Strategy:**

```typescript
// src/lib/sync/backfill.ts

async function backfillArtist(artistConfig: ArtistConfig): Promise<void> {
  // Step 1: Fetch current data (low cost, immediate value)
  await syncCurrentData(artistConfig);  // ~20 API calls

  // Step 2: Queue historical backfill as background job
  // Split into monthly chunks to respect rate limits
  for (const month of getLast24Months()) {
    await enqueueJob("backfill-month", {
      artistId: artistConfig.id,
      startDate: month.start,
      endDate: month.end,
    });
  }
  // Each job makes ~10 Chartmetric calls, spread across rate limit windows
  // Total: ~240 calls over ~2 hours (within 5000/day Chartmetric limit)
}
```

**Key principle:** Show current data immediately. Backfill history in the background. Charts show "Loading historical data..." for empty time ranges.

### 7.2 Server vs Client Rendering Strategy

```
Pages that should be Server Components (SSR/ISR):
  / (Dashboard)        — Data-heavy, benefits from server-side fetch + caching
  /streaming           — Same
  /catalog             — Same
  /revenue             — Same
  /instagram           — Same
  /cross-platform      — Same
  /health              — Same

Interactive islands (Client Components):
  Chart components     — Recharts requires client-side rendering (use "use client")
  Filters/sorting      — User interaction
  Date range picker    — User interaction
  CSV upload           — File handling
  Score detail panels  — Expandable/collapsible
```

**Pattern:** Server Component fetches data, passes it as props to Client Component chart:

```typescript
// src/app/streaming/page.tsx (Server Component)
import { getStreamingKPIs, getTopTracks } from "@/lib/data-server";
import StreamingCharts from "@/components/streaming/StreamingCharts";
import KpiRow from "@/components/ui/KpiRow";

export const revalidate = 3600;

export default async function StreamingPage() {
  const [kpis, tracks] = await Promise.all([
    getStreamingKPIs(),
    getTopTracks(),
  ]);

  return (
    <>
      <KpiRow data={kpis} />
      {/* Client Component for interactive charts */}
      <StreamingCharts tracks={tracks} />
    </>
  );
}
```

This eliminates the current pattern of `useEffect` + `useState` + loading spinner on every page. Data is fetched on the server, cached, and streamed to the client as HTML.

### 7.3 Database Schema

```sql
-- Core tables

CREATE TABLE artists (
  id TEXT PRIMARY KEY,                    -- 'jakke', 'enjune'
  name TEXT NOT NULL,
  spotify_id TEXT,
  youtube_channel_id TEXT,
  instagram_business_id TEXT,
  chartmetric_id TEXT,
  musicbrainz_id TEXT,
  deezer_id TEXT,
  tidal_id TEXT,
  bandsintown_slug TEXT,
  discogs_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  config JSONB DEFAULT '{}'               -- per-artist sync config
);

-- Time-series metrics (partitioned by month for query performance)
CREATE TABLE daily_metrics (
  id BIGSERIAL,
  artist_id TEXT NOT NULL REFERENCES artists(id),
  date DATE NOT NULL,
  platform TEXT NOT NULL,                 -- 'spotify', 'youtube', 'instagram', etc.
  metric TEXT NOT NULL,                   -- 'streams', 'listeners', 'followers', 'views', etc.
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (artist_id, date, platform, metric)
) PARTITION BY RANGE (date);

-- Create monthly partitions
CREATE TABLE daily_metrics_2026_01 PARTITION OF daily_metrics
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE daily_metrics_2026_02 PARTITION OF daily_metrics
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... (auto-create partitions via cron or extension)

-- Indexes for common queries
CREATE INDEX idx_daily_metrics_artist_date ON daily_metrics (artist_id, date DESC);
CREATE INDEX idx_daily_metrics_platform ON daily_metrics (platform, metric);

-- Playlist events
CREATE TABLE playlist_events (
  id BIGSERIAL PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id),
  track_name TEXT NOT NULL,
  playlist_name TEXT NOT NULL,
  playlist_id TEXT,
  playlist_followers INTEGER,
  event_type TEXT NOT NULL,              -- 'added', 'removed'
  event_date DATE NOT NULL,
  platform TEXT DEFAULT 'spotify',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_playlist_events_artist ON playlist_events (artist_id, event_date DESC);

-- Chart positions
CREATE TABLE chart_positions (
  id BIGSERIAL PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id),
  chart_name TEXT NOT NULL,              -- 'spotify_viral_50_us', 'apple_music_top_100_us', etc.
  track_name TEXT,
  position INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Catalog (songs/recordings)
CREATE TABLE catalog (
  id BIGSERIAL PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id),
  title TEXT NOT NULL,
  isrc TEXT,
  iswc TEXT,
  release_date DATE,
  genre TEXT,
  collaborators TEXT[],
  spotify_id TEXT,
  apple_music_id TEXT,
  audio_features JSONB,                  -- danceability, energy, tempo, key, etc.
  popularity INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_catalog_isrc ON catalog (isrc) WHERE isrc IS NOT NULL;

-- Revenue (from DistroKid CSV imports)
CREATE TABLE revenue (
  id BIGSERIAL PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id),
  reporting_date DATE NOT NULL,
  sale_period TEXT,
  store TEXT NOT NULL,                   -- 'Spotify', 'Apple Music', etc.
  title TEXT NOT NULL,
  isrc TEXT,
  quantity INTEGER NOT NULL,
  per_unit NUMERIC,
  currency TEXT DEFAULT 'USD',
  revenue NUMERIC NOT NULL,
  import_batch_id UUID NOT NULL,         -- links to the CSV import
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_revenue_artist_date ON revenue (artist_id, reporting_date DESC);

-- API health checks (30-day retention)
CREATE TABLE api_health_checks (
  id BIGSERIAL PRIMARY KEY,
  api_name TEXT NOT NULL,
  status TEXT NOT NULL,                  -- 'healthy', 'degraded', 'down'
  latency_ms INTEGER NOT NULL,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_health_api_time ON api_health_checks (api_name, checked_at DESC);

-- Sync job history
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,                -- 'hourly_streaming', 'daily_social', etc.
  artist_id TEXT REFERENCES artists(id),
  status TEXT NOT NULL,                  -- 'running', 'success', 'failed'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  records_written INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Alerts (30-day retention)
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,              -- 'playlist_add', 'viral_spike', 'token_expiring', etc.
  severity TEXT NOT NULL,                -- 'high', 'medium', 'low'
  title TEXT NOT NULL,
  description TEXT,
  artist_id TEXT REFERENCES artists(id),
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.4 Background Job Processing

**For Vercel (serverless):**

Vercel does not support long-running background jobs natively. Options:

| Approach | Pros | Cons | Recommendation |
|----------|------|------|---------------|
| **Vercel Cron** | Built-in, free on Pro | 60s timeout, limited schedule granularity | Use for simple sync jobs |
| **Inngest** | Event-driven, retries, long-running steps, free tier | External dependency | Use for complex multi-step syncs |
| **QStash (Upstash)** | Serverless message queue, works with Vercel | Simple queue only | Use for fire-and-forget tasks |

**Recommended architecture:**

```
Vercel Cron (schedule triggers)
  → API Route handler (coordination)
    → Inngest functions (actual sync work, with step functions for rate limit compliance)
```

**Cron schedule:**

```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-hourly",
      "schedule": "0 * * * *"          // Every hour
    },
    {
      "path": "/api/cron/sync-daily",
      "schedule": "0 6 * * *"          // 6 AM UTC daily
    },
    {
      "path": "/api/cron/sync-weekly",
      "schedule": "0 6 * * 1"          // Monday 6 AM UTC
    },
    {
      "path": "/api/cron/check-alerts",
      "schedule": "*/5 * * * *"        // Every 5 minutes
    },
    {
      "path": "/api/cron/check-tokens",
      "schedule": "0 */6 * * *"        // Every 6 hours
    }
  ]
}
```

**Inngest step function pattern for rate-limited syncs:**

```typescript
// src/lib/sync/daily-streaming.ts
import { inngest } from "@/lib/inngest";

export const dailyStreamingSync = inngest.createFunction(
  { id: "daily-streaming-sync", retries: 3 },
  { cron: "0 6 * * *" },
  async ({ step }) => {
    // Step 1: Fetch Songstats data
    const songstatsData = await step.run("fetch-songstats", async () => {
      const client = new SongstatsClient();
      return client.getArtistStats("jakke");
    });

    // Step 2: Fetch Chartmetric data (separate step = separate timeout)
    const chartmetricData = await step.run("fetch-chartmetric", async () => {
      const client = new ChartmetricClient();
      return client.getArtistStats("jakke");
    });

    // Step 3: Normalize and write to DB
    await step.run("write-to-db", async () => {
      const normalized = normalizeStreamingData(songstatsData, chartmetricData);
      await writeToDatabase(normalized);
    });

    // Step 4: Update Redis cache
    await step.run("update-cache", async () => {
      await updateRedisCache("streaming", computeKPIs(songstatsData, chartmetricData));
    });

    // Step 5: Revalidate Next.js cache
    await step.run("revalidate", async () => {
      await triggerRevalidation(["streaming"]);
    });

    // Step 6: Check for alerts (playlist changes, viral spikes)
    await step.run("check-alerts", async () => {
      await checkStreamingAlerts(chartmetricData);
    });
  }
);
```

### 7.5 Redis Cache Key Design

```
// Key pattern: {artist_id}:{category}:{subcategory}
// Example keys:

jakke:streaming:kpis                    // Pre-computed KPI cards
jakke:streaming:top_tracks              // Top tracks array
jakke:streaming:popularity_scores       // Track popularity map
jakke:social:instagram:kpis             // IG KPIs
jakke:social:instagram:demographics     // IG demographics
jakke:playlists:current                 // Current playlist placements
jakke:playlists:recent_events           // Last 30 days of playlist adds/removes
jakke:scoring:career_momentum           // Career Momentum Score output
jakke:scoring:song_health               // Song Health Score per track
jakke:catalog:full                      // Full catalog with audio features
jakke:revenue:summary                   // Revenue summary KPIs

// TTLs match freshness SLAs:
// streaming/social/scoring → 3600s (1 hour)
// playlists → 14400s (4 hours)
// catalog/revenue → 604800s (7 days)

// Health/circuit state:
circuit:spotify                         // Circuit breaker state
circuit:youtube                         // etc.
health:last_check                       // Timestamp of last health check run
```

### 7.6 Edge Function Considerations

For the lowest-latency reads, serve pre-aggregated data from Vercel Edge Functions (runs on Cloudflare Workers at 300+ PoPs):

```typescript
// src/app/api/kpis/route.ts
export const runtime = "edge";  // Run at the edge, not in a single region

export async function GET() {
  // Read from Vercel KV (Redis) — globally replicated
  const kpis = await kv.get("jakke:streaming:kpis");

  if (!kpis) {
    // Fallback to origin (Supabase query)
    // This is slower but ensures data availability
    return NextResponse.json(await getKPIsFromDB(), {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  }

  return NextResponse.json(kpis, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
```

**Edge vs Node.js runtime decision:**

| Route | Runtime | Reason |
|-------|---------|--------|
| `/api/kpis` | Edge | Read-only from Redis, latency-critical |
| `/api/health` | Edge | Read-only from Redis, must be fast |
| `/api/streaming` | Node.js | May need DB fallback, larger response |
| `/api/cron/*` | Node.js | Needs full Node.js APIs for sync work |
| `/api/revalidate` | Node.js | Needs Next.js revalidation APIs |
| Page routes | Node.js (default) | RSC rendering needs full Node.js |

### 7.7 Bundle Size Optimization

The current app uses Recharts (client-side charting). To minimize bundle impact:

```typescript
// Dynamic imports for chart components (code-split per page)
const StreamingCharts = dynamic(() => import("@/components/streaming/StreamingCharts"), {
  loading: () => <ChartSkeleton />,
  ssr: false,  // Charts are client-only
});
```

**Target bundle sizes:**
- First Load JS: < 100KB (shared)
- Per-page JS: < 50KB each
- Recharts tree-shaking: import only used chart types

---

## 8. Deployment & Infrastructure

### 8.1 Infrastructure Map

```
┌─────────────────────────────────────────────────┐
│                   VERCEL                          │
│                                                   │
│  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  Edge Network │  │  Serverless Functions      │ │
│  │  (CDN + Edge  │  │  (Node.js 20)              │ │
│  │   Functions)  │  │  - Page SSR/ISR            │ │
│  │               │  │  - API Routes              │ │
│  │  - Static     │  │  - Cron Handlers           │ │
│  │    assets     │  │                            │ │
│  │  - ISR cache  │  └─────────────┬──────────────┘ │
│  │  - Edge KPIs  │                │               │
│  └──────┬────────┘                │               │
│         │                         │               │
│  ┌──────▼─────────────────────────▼──────────────┐│
│  │            Vercel KV (Redis)                   ││
│  │  - Dashboard KPIs (pre-aggregated)             ││
│  │  - Circuit breaker states                      ││
│  │  - Rate limit counters                         ││
│  └────────────────────────────────────────────────┘│
└─────────────────────┬─────────────────────────────┘
                      │
┌─────────────────────▼─────────────────────────────┐
│                  SUPABASE                          │
│                                                    │
│  ┌──────────────────┐  ┌────────────────────────┐ │
│  │  PostgreSQL       │  │  Auth (future)          │ │
│  │  - daily_metrics  │  │  - User sessions        │ │
│  │  - playlist_events│  │  - RLS policies         │ │
│  │  - catalog        │  └────────────────────────┘ │
│  │  - revenue        │                             │
│  │  - api_tokens     │  ┌────────────────────────┐ │
│  │  - sync_jobs      │  │  Storage (future)       │ │
│  │  - alerts         │  │  - CSV imports          │ │
│  │  - health_checks  │  │  - PDF exports          │ │
│  └──────────────────┘  └────────────────────────┘ │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│                  INNGEST                            │
│  - Multi-step sync jobs with retry                  │
│  - Backfill orchestration                           │
│  - Rate limit-aware step functions                  │
└────────────────────────────────────────────────────┘
```

### 8.2 Environment Tiers

| Tier | Branch | URL | APIs | Database |
|------|--------|-----|------|----------|
| Production | `main` | music.enjune.com (or custom domain) | Live APIs, real tokens | Supabase Production |
| Preview | PR branches | `*.vercel.app` | Mock APIs (MSW in middleware) | Supabase Preview (separate project) |
| Development | Local | `localhost:3000` | Mock APIs (MSW) or `.env.local` real tokens | Local Supabase (Docker) or Preview DB |

### 8.3 Deployment Pipeline

```
Push to branch
  → Vercel Preview Deployment (automatic)
  → GitHub Actions: type check + unit tests + integration tests
  → GitHub Actions: E2E tests against preview URL
  → Manual review + merge to main
  → Vercel Production Deployment (automatic)
  → Post-deploy health check (automated)
  → If health check fails → auto-rollback via Vercel Instant Rollback
```

---

## 9. Incident Response & Error Budgets

### 9.1 Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|---------|
| P1 - Critical | App is down or all data is stale | 15 min | Database down, all circuits open, Vercel outage |
| P2 - High | Major feature degraded | 1 hour | Primary API down (Chartmetric), token refresh failing |
| P3 - Medium | Minor feature degraded | 4 hours | Single secondary API down, slow page loads |
| P4 - Low | Cosmetic or non-urgent | Next business day | Stale metadata, formatting issue, minor UI bug |

### 9.2 Runbooks

Create runbooks at `docs/runbooks/` for common incidents:

| Runbook | Trigger |
|---------|---------|
| `spotify-token-refresh-failure.md` | Spotify 401 errors, token refresh fails |
| `chartmetric-quota-exhausted.md` | Chartmetric 429 responses, rate limit hit |
| `instagram-token-expiring.md` | IG token < 5 days until expiry |
| `database-connection-failure.md` | Supabase connection errors |
| `sync-job-timeout.md` | Cron job exceeds 60s limit |
| `circuit-breaker-stuck-open.md` | Circuit stays open > 30 min |
| `data-staleness-violation.md` | Any data category exceeds acceptable staleness |
| `vercel-deployment-failure.md` | Build or deploy error |

### 9.3 Post-Incident Process

After any P1 or P2 incident:
1. Write a brief post-mortem in `docs/postmortems/YYYY-MM-DD-title.md`
2. Identify root cause and contributing factors
3. List action items with owners and due dates
4. Update monitoring/alerting if the incident was not detected promptly
5. Update the relevant runbook if the resolution steps were unclear

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

| Task | Priority | Effort |
|------|----------|--------|
| Set up Vitest + initial test config | P0 | 2h |
| Implement `BaseApiClient` with rate limiter + circuit breaker + retry | P0 | 8h |
| Write unit tests for rate limiter and circuit breaker | P0 | 4h |
| Implement `SpotifyClient` extending base (first real API) | P0 | 4h |
| Set up MSW mock server + Spotify handlers | P0 | 4h |
| Write integration tests for Spotify client | P0 | 4h |
| Set up Supabase schema (core tables) | P0 | 4h |
| Set up Vercel KV for dashboard KPI caching | P0 | 2h |
| Convert Dashboard page from client-side fetch to Server Component | P0 | 4h |
| Implement health check endpoint (`/api/health`) | P1 | 4h |
| Set up Vercel Cron for hourly + daily schedules | P1 | 2h |
| **Phase 1 total** | | **~42h** |

### Phase 2: Core API Clients (Week 3-4)

| Task | Priority | Effort |
|------|----------|--------|
| Implement `SongstatsClient` + tests + MSW handlers | P0 | 6h |
| Implement `ChartmetricClient` + token refresh + tests | P0 | 8h |
| Implement `YouTubeClient` (quota-aware) + tests | P1 | 6h |
| Implement `InstagramClient` + long-lived token refresh + tests | P1 | 8h |
| Build daily sync job (Inngest step function) | P0 | 8h |
| Build hourly sync job (lightweight KPI refresh) | P0 | 4h |
| Implement on-demand revalidation endpoint | P1 | 2h |
| Convert all pages from `useEffect` to Server Components | P1 | 8h |
| Build token management system (Supabase + auto-refresh) | P0 | 6h |
| **Phase 2 total** | | **~56h** |

### Phase 3: Reliability & Monitoring (Week 5-6)

| Task | Priority | Effort |
|------|----------|--------|
| Build `/health` dashboard page | P1 | 8h |
| Implement metrics collector + Supabase metrics table | P1 | 6h |
| Set up alert checking cron + Slack/email notifications | P1 | 6h |
| Implement graceful degradation (fallback chain per section) | P0 | 8h |
| Build staleness indicators on all metric cards | P1 | 4h |
| Implement Redis circuit breaker state persistence | P1 | 4h |
| Write E2E tests (Playwright) | P1 | 8h |
| Build CSV import for DistroKid revenue data | P2 | 8h |
| Security hardening (CSP headers, server-only guards, RLS) | P1 | 4h |
| Performance audit + bundle optimization | P2 | 4h |
| Write runbooks for top 5 incident scenarios | P2 | 4h |
| **Phase 3 total** | | **~64h** |

### Phase 4: Remaining APIs + Polish (Week 7-8)

| Task | Priority | Effort |
|------|----------|--------|
| Implement `DeezerClient`, `MusicBrainzClient`, `BandsintownClient`, `DiscogsClient` | P2 | 12h |
| Implement `TikTokClient` + OAuth flow | P2 | 8h |
| Build backfill orchestration (Inngest multi-step) | P2 | 8h |
| Build alert engine (playlist adds, viral spikes, milestones) | P2 | 8h |
| Implement scoring models consuming live data | P2 | 8h |
| Performance testing (sync benchmark, load test) | P2 | 4h |
| Edge function optimization for KPI endpoints | P3 | 4h |
| Documentation cleanup + architecture diagram | P3 | 4h |
| **Phase 4 total** | | **~56h** |

### Total Estimated Effort: ~218 hours (5.5 weeks at 40h/week)

---

## Appendix A: Decision Log

| Decision | Options Considered | Choice | Rationale |
|----------|--------------------|--------|-----------|
| Test framework | Jest, Vitest | Vitest | Native ESM, faster, better Next.js 15 compat |
| API mocking | nock, MSW, manual mocks | MSW | Network-level interception, works in browser + Node |
| E2E framework | Cypress, Playwright | Playwright | Better Next.js integration, faster, multi-browser |
| Background jobs | Vercel Cron only, Inngest, QStash, BullMQ | Vercel Cron + Inngest | Cron for scheduling, Inngest for multi-step with retry |
| Database | Supabase (Postgres), PlanetScale (MySQL), Neon (Postgres), Vercel Postgres | Supabase (Postgres) | Free tier generous, built-in auth/storage/RLS, good DX |
| Cache | Vercel KV, Upstash Redis, in-memory | Vercel KV | Native Vercel integration, globally replicated |
| Metrics | Datadog, New Relic, custom | Custom (Supabase) | No additional cost, sufficient for current scale |
| Token storage | Env vars, Vault, Database | Supabase (encrypted) | Simple, server-only access, RLS protected |
| Rate limiter | Per-invocation in-memory, Redis-backed | In-memory + Redis hybrid | In-memory for fast path, Redis for cross-invocation accuracy |

## Appendix B: Dependency Inventory

```json
{
  "production": {
    "next": "^15.3.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "recharts": "^2.15.3",
    "@supabase/supabase-js": "^2.x",
    "@vercel/kv": "^2.x",
    "inngest": "^3.x",
    "papaparse": "^5.5.3",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "vitest": "^2.x",
    "msw": "^2.x",
    "@playwright/test": "^1.x",
    "typescript": "^5.8.3",
    "tailwindcss": "^4.1.8",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.3.3"
  }
}
```

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **Circuit Breaker** | Pattern that stops calling a failing API to prevent cascading failures. Three states: closed (normal), open (blocked), half-open (testing recovery) |
| **Token Bucket** | Rate limiting algorithm. Tokens refill at a fixed rate. Each request consumes one token. If empty, request waits |
| **ISR** | Incremental Static Regeneration. Next.js feature that caches server-rendered pages and revalidates on a schedule |
| **RSC** | React Server Components. Components that render on the server, reducing client-side JavaScript |
| **NSU** | Normalized Stream Unit. Quality-adjusted stream count across platforms (defined in data-sources-catalog.md) |
| **RWSE** | Revenue-Weighted Stream Equivalent. Stream count normalized by per-stream rate |
| **MSW** | Mock Service Worker. Library for mocking APIs at the network level in tests |
| **RLS** | Row Level Security. Supabase/PostgreSQL feature that enforces access control at the database row level |
| **Edge Function** | Serverless function deployed to CDN edge locations (300+ PoPs) for lowest latency |

---

*This spec should be revisited when API integrations move from planning to implementation. Rate limits and API terms change. Last verified: 2026-02-26.*
