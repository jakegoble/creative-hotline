# Test Coverage Audit & Expansion Plan

**Date:** 2026-02-24
**Author:** Platform Reliability Engineer
**Baseline:** 272 tests, 100% passing, 1.51s execution

---

## 1. Test Suite Status

```
272 passed, 1 warning in 1.51s
Python 3.9.6, pytest 8.4.2
```

| Test File | Tests | Domain |
|-----------|-------|--------|
| test_attribution.py | 14 | Channel attribution models |
| test_cache_manager.py | 8 | 3-tier cache operations |
| test_demo_data.py | 16 | Demo data integrity |
| test_exporters.py | 6 | PDF generation |
| test_formatters.py | 5 | Display formatting |
| test_keyword_extractor.py | 13 | Text analysis |
| test_lead_scorer.py | 18 | ICP scoring v1 |
| test_lead_scorer_v2.py | 13 | ICP scoring v2 (frequency/recency/negative) |
| test_ltv_calculator.py | 15 | LTV + cohort analysis |
| test_plan_delivery.py | 16 | Client HTML pages |
| test_referral_tracker.py | 8 | Referral analytics |
| test_revenue_modeler.py | 15 | Scenario builder |
| test_segment_builder.py | 12 | Client segmentation |
| test_sequence_tracker.py | 11 | Email sequence mapping |
| test_services.py | 78 | Services + health + cache + demo |
| test_smoke.py | 7 | Import smoke tests |
| test_transcript_processor.py | 17 | Transcript parsing |

---

## 2. Coverage Audit Results

### Layer Summary

| Layer | Modules | Tested | Coverage |
|-------|---------|--------|----------|
| **app/utils/** (business logic) | 15 testable | 12 fully, 3 partial | ~85% |
| **app/services/** (API clients) | 10 | 4 fully, 3 partial, 3 at 0% | ~45% |
| **app/components/** (chart renders) | 11 | 0 (smoke only) | 0% |
| **app/pages/** (page renders) | 13 | 0 (smoke only) | 0% |
| **app/config.py** | 1 | 1 | ~60% |

### Services — Detailed

| Service | Public Methods | Tested | Coverage | Gap Priority |
|---------|---------------|--------|----------|-------------|
| NotionService | 9 public | 0 | **0%** | P1 CRITICAL |
| StripeService | 7 public | 0 | **0%** | P1 CRITICAL |
| CalendlyService | 8 public | 0 | **0%** | P1 CRITICAL |
| ClaudeService | 8 public | 3 | 30% | P2 |
| ManyChatService | 7 public | 4 | 55% | P2 |
| FirefliesService | 4 public | 3 | 60% | P3 |
| N8nService | 2 public | 1 | 50% | P3 |
| HealthChecker | 8 public | 8 | **100%** | Done |
| CacheManager | 8 public | 8 | **95%+** | Done |
| Demo Services (6) | 32 total | 32 | **100%** | Done |

### Utils — Gaps

| Module | Coverage | Untested Functions |
|--------|----------|-------------------|
| ui.py | **0%** | page_header, section_header, stat_card, stat_card_top, data_card, metric_row, badge, progress_bar, empty_state, key_value |
| theme.py | **0%** | inject_custom_css |
| frankie_prompts.py | **0%** | build_action_plan_prompt, build_icp_prompt, TRANSCRIPT_PROCESSING_PROMPT (constant) |
| exporters.py | 25% | generate_premium_pdf, _parse_markdown_to_story, _build_appendix_sections |
| formatters.py | 62% | format_currency_short, format_datetime, format_relative_time, format_percentage |
| plan_delivery.py | 85% | _markdown_to_html (private helper) |

### Components — All Untested

12 chart/component modules with ~20 public render functions. All accept data as params and return Plotly figures or call `st.plotly_chart()`. Currently covered only by import smoke test.

### Pages — All Untested

13 page modules, each with a `render()` function. Covered only by import smoke tests. Pages are thin (call services, render components) but contain some extractable logic:
- `funnel_analytics.py`: `_chi_squared_significance()`, `_load_ab_tests()`, `_save_ab_tests()`
- `outcomes.py`: `_load_outcomes()`, `_save_outcome()`
- `health.py`: `_timestamp_to_iso()`
- `settings.py`: `_mask()`

---

## 3. Streamlit AppTest — Key Findings

Streamlit ships `streamlit.testing.v1.AppTest` for headless page testing. Critical patterns:

### What Works
- `AppTest.from_file("page.py")` — renders a page, inspect elements
- `at.session_state["key"] = value` — set state before `.run()`
- `at.secrets["KEY"] = "value"` — inject secrets
- Widget interaction: `.click()`, `.set_value()`, `.check()`, always followed by `.run()`
- Element inspection: `at.title`, `at.metric`, `at.error`, `at.exception`, `at.markdown`

### Critical Pitfalls
1. **`from_file()` breaks `unittest.mock.patch`** — file is copied internally, breaking patch paths. Use `from_function()` when mocking.
2. **Must call `.run()` after every interaction** — no auto-rerun.
3. **`st.cache_data` persists across tests** — must clear in fixture.
4. **Exceptions are swallowed** — always assert `at.exception == []`.
5. **Multipage `st.navigation` not supported** — test each page separately.
6. **Charts (Plotly/Altair) not inspectable** — can only verify no exceptions.
7. **Default timeout is 3s** — use `default_timeout=15` for pages with service calls.

### Recommended Pattern for Our App

```python
# Demo mode page smoke test (cleanest — uses existing DemoServices)
@pytest.mark.parametrize("page_path", PAGE_PATHS)
def test_page_renders_in_demo_mode(page_path):
    at = AppTest.from_file(page_path, default_timeout=15)
    at.session_state["demo_mode"] = True
    at.run()
    assert at.exception == [], f"{page_path}: {at.exception}"

# Service integration test (use from_function + mock.patch)
@patch("app.services.notion_client.NotionService.get_all_payments")
def test_dashboard_with_mock(mock_payments):
    mock_payments.return_value = [SAMPLE_PAYMENT]
    def runner():
        from app.pages import dashboard
        dashboard.render()
    at = AppTest.from_function(runner, default_timeout=15)
    at.run()
    assert at.exception == []
```

---

## 4. Prioritized Test Plan

### Phase 1: Service Unit Tests (P1 — biggest risk gap)
**Target: +60 tests | Estimated: 3 hours**

These three services are the backbone of the app and have zero test coverage.

#### 1a. NotionService Tests (`tests/test_notion_client.py`)
Mock: `unittest.mock.patch("requests.post")` on the Notion API

| # | Test Case | What It Verifies |
|---|-----------|-----------------|
| 1 | `test_is_healthy_success` | Returns True when API responds 200 |
| 2 | `test_is_healthy_failure` | Returns False on ConnectionError |
| 3 | `test_get_all_payments_parses_correctly` | Full payment dict from Notion page response |
| 4 | `test_get_all_payments_handles_pagination` | Multiple pages of results concatenated |
| 5 | `test_get_all_payments_empty_db` | Returns [] when database is empty |
| 6 | `test_get_all_intakes_parses_correctly` | Full intake dict from Notion page |
| 7 | `test_get_all_intakes_empty_db` | Returns [] |
| 8 | `test_get_pipeline_stats_counts` | Correct count per status |
| 9 | `test_get_pipeline_stats_empty` | All zeros when no payments |
| 10 | `test_get_client_by_email_found` | Returns matching payment dict |
| 11 | `test_get_client_by_email_not_found` | Returns None |
| 12 | `test_get_client_by_email_case_insensitive` | Matches regardless of case |
| 13 | `test_get_payments_by_status` | Filters to matching status |
| 14 | `test_get_merged_clients` | Joins payments + intakes on linked_intake_id |
| 15 | `test_get_merged_clients_no_intake` | Payment with no linked intake returns intake=None |
| 16 | `test_update_page_sends_correct_payload` | Verify PATCH request body |
| 17 | `test_parse_payment_missing_fields` | Handles missing/null Notion properties gracefully |
| 18 | `test_parse_intake_multi_select` | Desired Outcome parsed as list |
| 19 | `test_parse_payment_select_field` | Product Purchased parsed from select |
| 20 | `test_query_all_pagination_cursor` | Follows has_more/next_cursor correctly |

#### 1b. StripeService Tests (`tests/test_stripe_client.py`)
Mock: `unittest.mock.patch("stripe.checkout.Session.list")`, `stripe.Balance.retrieve`, etc.

| # | Test Case | What It Verifies |
|---|-----------|-----------------|
| 1 | `test_is_healthy_success` | Returns True on successful balance retrieve |
| 2 | `test_is_healthy_failure` | Returns False on AuthenticationError |
| 3 | `test_get_recent_sessions` | Parses checkout sessions correctly |
| 4 | `test_get_recent_sessions_empty` | Returns [] when no sessions |
| 5 | `test_get_session_by_id_found` | Returns parsed session dict |
| 6 | `test_get_session_by_id_not_found` | Returns None |
| 7 | `test_get_revenue_summary` | Totals, count, average computed correctly |
| 8 | `test_get_revenue_summary_empty` | Returns zeros |
| 9 | `test_get_monthly_revenue` | Groups by month, sums correctly |
| 10 | `test_get_refunds` | Parses refund objects |
| 11 | `test_parse_session_amount_mapping` | $499 → "First Call", $699 → "Standard Call", $1495 → "3-Session Clarity Sprint" |
| 12 | `test_parse_session_missing_customer_email` | Handles null email gracefully |

#### 1c. CalendlyService Tests (`tests/test_calendly_client.py`)
Mock: `unittest.mock.patch("requests.get")`

| # | Test Case | What It Verifies |
|---|-----------|-----------------|
| 1 | `test_is_healthy_success` | Returns True on /users/me 200 |
| 2 | `test_is_healthy_failure` | Returns False on auth error |
| 3 | `test_get_scheduled_events` | Parses event list correctly |
| 4 | `test_get_scheduled_events_empty` | Returns [] |
| 5 | `test_get_scheduled_events_date_range` | Correct min/max_start_time params |
| 6 | `test_get_event_invitees` | Returns invitee details |
| 7 | `test_get_no_shows` | Filters to canceled/no-show events |
| 8 | `test_get_booking_rate` | Computes scheduled vs capacity ratio |
| 9 | `test_get_booking_rate_no_events` | Returns 0 rate |
| 10 | `test_get_avg_time_to_book` | Computes average days from payment to booking |
| 11 | `test_get_avg_time_to_book_no_data` | Returns None |
| 12 | `test_discover_org_uri` | Extracts org from /users/me response |
| 13 | `test_parse_event` | Maps Calendly event to our dict shape |

---

### Phase 2: Utils Gap Fill (P2 — partial coverage completion)
**Target: +25 tests | Estimated: 1.5 hours**

#### 2a. Formatters — Missing Functions (`tests/test_formatters.py` expansion)

| # | Test Case |
|---|-----------|
| 1 | `test_format_currency_short_thousands` — e.g., $1.5K |
| 2 | `test_format_currency_short_millions` — e.g., $1.2M |
| 3 | `test_format_currency_short_zero` |
| 4 | `test_format_datetime_valid` |
| 5 | `test_format_datetime_empty` |
| 6 | `test_format_relative_time_minutes_ago` |
| 7 | `test_format_relative_time_hours_ago` |
| 8 | `test_format_relative_time_days_ago` |
| 9 | `test_format_percentage_basic` |
| 10 | `test_format_percentage_zero` |

#### 2b. Frankie Prompts (`tests/test_frankie_prompts.py` — new file)

| # | Test Case |
|---|-----------|
| 1 | `test_build_action_plan_prompt_includes_client_name` |
| 2 | `test_build_action_plan_prompt_includes_intake_data` |
| 3 | `test_build_action_plan_prompt_includes_frankie_voice` |
| 4 | `test_build_icp_prompt_includes_clients` |
| 5 | `test_transcript_processing_prompt_is_string` |

#### 2c. ClaudeService — Missing Methods (add to `tests/test_services.py`)

| # | Test Case |
|---|-----------|
| 1 | `test_claude_generate_action_plan` |
| 2 | `test_claude_generate_action_plan_from_transcript` |
| 3 | `test_claude_analyze_icp` |
| 4 | `test_claude_generate_testimonial` |
| 5 | `test_claude_generate_case_study` |
| 6 | `test_claude_analyze_growth` |

#### 2d. ManyChatService — Missing Methods (add to `tests/test_services.py`)

| # | Test Case |
|---|-----------|
| 1 | `test_manychat_get_new_subscribers` |
| 2 | `test_manychat_get_keyword_stats` |
| 3 | `test_manychat_get_flow_stats` |
| 4 | `test_manychat_get_tag_distribution` |

---

### Phase 3: Page Smoke Tests with AppTest (P2 — rendering verification)
**Target: +15 tests | Estimated: 2 hours**

Requires: `streamlit>=1.28.0` (for `streamlit.testing.v1.AppTest`)

#### 3a. Shared Fixture (`tests/conftest.py` addition)

```python
import pytest

@pytest.fixture(autouse=True)
def clear_streamlit_cache():
    """Prevent cache leaking between tests."""
    yield
    try:
        import streamlit as st
        st.cache_data.clear()
        st.cache_resource.clear()
    except Exception:
        pass
```

#### 3b. Page Render Tests (`tests/test_pages.py` — new file)

| # | Test Case | Page |
|---|-----------|------|
| 1 | `test_dashboard_renders` | dashboard.py |
| 2 | `test_clients_renders` | clients.py |
| 3 | `test_pipeline_renders` | pipeline.py |
| 4 | `test_action_plans_renders` | action_plans.py |
| 5 | `test_lead_scoring_renders` | lead_scoring.py |
| 6 | `test_channel_performance_renders` | channel_performance.py |
| 7 | `test_retargeting_renders` | retargeting.py |
| 8 | `test_conversion_paths_renders` | conversion_paths.py |
| 9 | `test_revenue_goals_renders` | revenue_goals.py |
| 10 | `test_funnel_analytics_renders` | funnel_analytics.py |
| 11 | `test_outcomes_renders` | outcomes.py |
| 12 | `test_health_renders` | health.py |
| 13 | `test_settings_renders` | settings.py |

Each test: create AppTest, set `demo_mode=True`, `.run()`, assert `at.exception == []`.

#### 3c. Extractable Page Logic Tests

| # | Test Case | Module |
|---|-----------|--------|
| 1 | `test_chi_squared_significance` | funnel_analytics.py |
| 2 | `test_timestamp_to_iso` | health.py |
| 3 | `test_mask_short_string` | settings.py |
| 4 | `test_mask_long_string` | settings.py |

---

### Phase 4: Component Render Tests (P3 — lower priority)
**Target: +12 tests | Estimated: 1 hour**

Test that chart components don't raise exceptions when given valid demo data.

| # | Test Case | Component |
|---|-----------|-----------|
| 1 | `test_render_channel_bars` | channel_chart.py |
| 2 | `test_render_channel_radar` | channel_chart.py |
| 3 | `test_render_revenue_by_source` | channel_chart.py |
| 4 | `test_render_timeline` | client_timeline.py |
| 5 | `test_render_funnel` | funnel_chart.py |
| 6 | `test_render_growth_projection` | growth_chart.py |
| 7 | `test_render_activity_heatmap` | heatmap.py |
| 8 | `test_render_kpi_row` | kpi_cards.py |
| 9 | `test_render_revenue_chart` | revenue_forecast.py |
| 10 | `test_render_sankey` | sankey_chart.py |
| 11 | `test_render_scenario_comparison` | scenario_cards.py |
| 12 | `test_render_segment_cards` | segment_cards.py |

Pattern: Call component with demo data, assert returns a Plotly Figure (not None, no exception).

---

### Phase 5: Advanced (P3 — future)
**Target: +20 tests | Estimated: ongoing**

| Category | Tests | Notes |
|----------|-------|-------|
| Property-based (Hypothesis) | 10 | Fuzz lead_scorer, attribution, ltv with random data |
| Widget interaction (AppTest) | 5 | Settings demo toggle, client selector, action plan tabs |
| Edge cases | 5 | N=0 clients, all-same-status, unicode in names |

---

## 5. Projected Test Count

| Phase | New Tests | Running Total |
|-------|-----------|---------------|
| Current baseline | — | 272 |
| Phase 1: Service unit tests | +45 | ~317 |
| Phase 2: Utils gap fill | +25 | ~342 |
| Phase 3: Page smoke tests | +17 | ~359 |
| Phase 4: Component renders | +12 | ~371 |
| Phase 5: Advanced | +20 | ~391 |

**Target: 370+ tests with all critical paths covered.**

---

## 6. Implementation Order

1. **Phase 1a** — NotionService tests (highest risk: it's the CRM backbone)
2. **Phase 1b** — StripeService tests (revenue data integrity)
3. **Phase 1c** — CalendlyService tests (booking metrics)
4. **Phase 2a** — Formatters gap fill (quick wins)
5. **Phase 2b** — Frankie prompts tests (prompt integrity)
6. **Phase 2c+d** — Claude + ManyChat method gaps
7. **Phase 3** — Page smoke tests (requires verifying Streamlit AppTest compatibility)
8. **Phase 4** — Component render tests
9. **Phase 5** — Property-based and interaction tests

---

## 7. Testing Infrastructure Notes

### Dependencies to Add
```
# requirements-dev.txt (or in requirements.txt under [dev])
pytest>=8.0
pytest-cov>=4.0
hypothesis>=6.0      # Phase 5 property testing
# streamlit already includes streamlit.testing.v1
```

### Run Commands
```bash
# Full suite
python3 -m pytest tests/ -v --tb=short

# With coverage
python3 -m pytest tests/ --cov=app --cov-report=term-missing

# Single phase
python3 -m pytest tests/test_notion_client.py -v

# Only page tests (slow)
python3 -m pytest tests/test_pages.py -v --timeout=60
```

### CI Integration
- Run unit tests (Phase 1-2) on every push — fast (<5s)
- Run page tests (Phase 3) on PRs only — slower (~30s with AppTest)
- Coverage gate: fail if coverage drops below 70%
