"""Tests for revenue modeler utility."""

from app.utils.revenue_modeler import (
    build_scenario,
    compare_scenarios,
    product_ladder,
    monthly_targets,
    channel_investment_plan,
    current_pace,
)

# ── Fixtures ──────────────────────────────────────────────────────

PAYMENTS = [
    {"email": "a@test.com", "payment_amount": 499, "product_purchased": "First Call", "payment_date": "2026-01-15", "created": "2026-01-10", "lead_source": "IG DM"},
    {"email": "a@test.com", "payment_amount": 1495, "product_purchased": "3-Session Clarity Sprint", "payment_date": "2026-02-01", "created": "2026-01-10", "lead_source": "IG DM"},
    {"email": "b@test.com", "payment_amount": 699, "product_purchased": "Standard Call", "payment_date": "2026-01-20", "created": "2026-01-18", "lead_source": "Referral"},
    {"email": "c@test.com", "payment_amount": 499, "product_purchased": "First Call", "payment_date": "2026-02-05", "created": "2026-02-03", "lead_source": "Website"},
]

MONTHLY_REVENUE = [
    {"month": "2025-11", "revenue": 2500},
    {"month": "2025-12", "revenue": 3000},
    {"month": "2026-01", "revenue": 4000},
    {"month": "2026-02", "revenue": 3500},
]

CHANNEL_METRICS = [
    {"channel": "IG DM", "leads": 10, "conversions": 3, "revenue": 2500, "conversion_rate": 30.0, "avg_deal_size": 833},
    {"channel": "Referral", "leads": 5, "conversions": 4, "revenue": 3000, "conversion_rate": 80.0, "avg_deal_size": 750},
    {"channel": "Website", "leads": 8, "conversions": 1, "revenue": 499, "conversion_rate": 12.5, "avg_deal_size": 499},
]


# ── Scenario Builder ────────────────────────────────────────────

def test_build_scenario_basic():
    mix = {
        "First Call": {"price": 499, "monthly_volume": 10},
        "Standard Call": {"price": 699, "monthly_volume": 5},
    }
    s = build_scenario("Test", mix)
    expected_monthly = 499 * 10 + 699 * 5
    assert s.monthly_revenue == expected_monthly
    assert s.annual_revenue == expected_monthly * 12
    assert s.clients_per_month == 15


def test_build_scenario_feasibility():
    # 50 calls/week should be infeasible
    mix = {
        "First Call": {"price": 499, "monthly_volume": 100},
    }
    s = build_scenario("Overloaded", mix)
    # 100 calls/month / 4.33 weeks = ~23.1 calls/week
    assert not s.feasible


def test_build_scenario_with_retainer():
    # Retainers don't count as calls (not in CALL_PRODUCTS)
    mix = {
        "Monthly Retainer": {"price": 2997, "monthly_volume": 5},
    }
    s = build_scenario("Retainer Only", mix)
    assert s.monthly_revenue == 2997 * 5
    assert s.calls_per_week == 0  # retainers aren't calls
    assert s.feasible


def test_build_scenario_gap():
    mix = {"First Call": {"price": 499, "monthly_volume": 5}}
    s = build_scenario("Small", mix, annual_goal=800_000)
    assert s.gap_to_goal == 800_000 - (499 * 5 * 12)


# ── Compare Scenarios ───────────────────────────────────────────

def test_compare_scenarios():
    s1 = build_scenario("A", {"First Call": {"price": 499, "monthly_volume": 10}})
    s2 = build_scenario("B", {"Standard Call": {"price": 699, "monthly_volume": 10}})
    result = compare_scenarios([s1, s2])
    assert result["best"] == "B"  # higher revenue
    assert len(result["scenarios"]) == 2


def test_compare_scenarios_empty():
    result = compare_scenarios([])
    assert result["best"] is None


# ── Product Ladder ──────────────────────────────────────────────

def test_product_ladder_existing():
    ladder = product_ladder(PAYMENTS)
    products = [p["product"] for p in ladder]
    assert "First Call" in products
    assert "Standard Call" in products
    # Should be sorted by price ascending
    prices = [p["price"] for p in ladder]
    assert prices == sorted(prices)


def test_product_ladder_with_proposed():
    proposed = {"Monthly Retainer": 2997}
    ladder = product_ladder(PAYMENTS, proposed)
    retainer = next(p for p in ladder if p["product"] == "Monthly Retainer")
    assert retainer["current_volume"] == 0
    assert retainer["proposed"] is True


# ── Monthly Targets ─────────────────────────────────────────────

def test_monthly_targets_even():
    targets = monthly_targets(120_000, "2026-01", [])
    assert len(targets) == 12
    assert targets[0].target_revenue == 10_000
    assert targets[11].cumulative_target == 120_000


def test_monthly_targets_with_growth():
    targets = monthly_targets(120_000, "2026-01", [], growth_rate=0.05)
    assert len(targets) == 12
    # First month should be less than even split
    assert targets[0].target_revenue < 10_000
    # Last month should be more
    assert targets[11].target_revenue > 10_000


def test_monthly_targets_on_track():
    actuals = [{"month": "2026-01", "revenue": 10_000}]
    targets = monthly_targets(120_000, "2026-01", actuals)
    assert targets[0].on_track is True
    assert targets[0].actual_revenue == 10_000


# ── Channel Investment Plan ────────────────────────────────────

def test_channel_investment_plan():
    plan = channel_investment_plan(800_000, CHANNEL_METRICS)
    assert len(plan) == 3
    # All channels should have leads_needed > 0
    for ch in plan:
        assert ch["leads_needed"] >= 0
        assert "lead_gap" in ch


def test_channel_investment_plan_empty():
    assert channel_investment_plan(800_000, []) == []


# ── Current Pace ────────────────────────────────────────────────

def test_current_pace():
    pace = current_pace(MONTHLY_REVENUE)
    # Most recent 3: 4000, 3500, 3000 → avg 3500
    assert pace["monthly_avg"] == 3500
    assert pace["annual_pace"] == 42_000
    assert pace["months_of_data"] == 4


def test_current_pace_empty():
    pace = current_pace([])
    assert pace["monthly_avg"] == 0
    assert pace["annual_pace"] == 0
