"""Tests for LTV calculator utility."""

from app.utils.ltv_calculator import (
    calculate_ltv,
    ltv_by_source,
    ltv_by_entry_product,
    ltv_by_cohort,
    upsell_rate,
    expansion_revenue,
    payback_period,
)

# ── Fixtures ──────────────────────────────────────────────────────

PAYMENTS = [
    # Client A: 2 purchases (First Call + Sprint upsell)
    {
        "email": "alice@test.com",
        "payment_amount": 499,
        "product_purchased": "First Call",
        "payment_date": "2026-01-15",
        "created": "2026-01-10T10:00:00.000Z",
        "lead_source": "IG DM",
        "status": "Call Complete",
    },
    {
        "email": "alice@test.com",
        "payment_amount": 1495,
        "product_purchased": "3-Session Clarity Sprint",
        "payment_date": "2026-02-01",
        "created": "2026-01-10T10:00:00.000Z",
        "lead_source": "IG DM",
        "status": "Call Complete",
    },
    # Client B: 1 purchase (Single Call)
    {
        "email": "bob@test.com",
        "payment_amount": 699,
        "product_purchased": "Single Call",
        "payment_date": "2026-01-20",
        "created": "2026-01-18T14:00:00.000Z",
        "lead_source": "Referral",
        "status": "Call Complete",
    },
    # Client C: unpaid lead
    {
        "email": "charlie@test.com",
        "payment_amount": 0,
        "status": "Lead - Laylo",
        "created": "2026-02-10T16:00:00.000Z",
        "lead_source": "Website",
    },
    # Client D: 1 purchase from Website
    {
        "email": "diana@test.com",
        "payment_amount": 499,
        "product_purchased": "First Call",
        "payment_date": "2026-02-05",
        "created": "2026-02-03T12:00:00.000Z",
        "lead_source": "Website",
        "status": "Follow-Up Sent",
    },
]


# ── LTV Calculation ──────────────────────────────────────────────

def test_calculate_ltv_groups_by_email():
    result = calculate_ltv(PAYMENTS)
    emails = [c.email for c in result]
    assert "alice@test.com" in emails
    assert "bob@test.com" in emails
    assert "diana@test.com" in emails
    # Charlie excluded (unpaid)
    assert "charlie@test.com" not in emails


def test_calculate_ltv_sums_revenue():
    result = calculate_ltv(PAYMENTS)
    alice = next(c for c in result if c.email == "alice@test.com")
    assert alice.total_revenue == 1994, f"Alice LTV should be 1994, got {alice.total_revenue}"
    assert alice.purchase_count == 2


def test_calculate_ltv_sorted_desc():
    result = calculate_ltv(PAYMENTS)
    assert result[0].total_revenue >= result[-1].total_revenue


def test_calculate_ltv_tracks_products():
    result = calculate_ltv(PAYMENTS)
    alice = next(c for c in result if c.email == "alice@test.com")
    assert "First Call" in alice.products
    assert "3-Session Clarity Sprint" in alice.products


def test_calculate_ltv_case_insensitive():
    payments = [
        {"email": "Test@EXAMPLE.com", "payment_amount": 499, "product_purchased": "First Call", "payment_date": "2026-01-01", "created": "2026-01-01"},
        {"email": "test@example.com", "payment_amount": 699, "product_purchased": "Single Call", "payment_date": "2026-02-01", "created": "2026-01-01"},
    ]
    result = calculate_ltv(payments)
    assert len(result) == 1
    assert result[0].total_revenue == 1198


def test_calculate_ltv_empty():
    assert calculate_ltv([]) == []


# ── LTV by Source ────────────────────────────────────────────────

def test_ltv_by_source():
    result = ltv_by_source(PAYMENTS)
    assert "IG DM" in result
    assert result["IG DM"]["avg_ltv"] == 1994  # Alice only IG DM client
    assert "Referral" in result
    assert result["Referral"]["avg_ltv"] == 699


# ── LTV by Entry Product ────────────────────────────────────────

def test_ltv_by_entry_product():
    result = ltv_by_entry_product(PAYMENTS)
    assert "First Call" in result
    # Alice and Diana both entered via First Call
    # Alice LTV=1994, Diana LTV=499, avg=(1994+499)/2=1246.5
    assert result["First Call"]["avg_ltv"] == 1246.5
    assert result["First Call"]["count"] == 2
    # Alice upsold, Diana didn't: upsell_rate = 50%
    assert result["First Call"]["upsell_rate"] == 50.0


# ── LTV by Cohort ───────────────────────────────────────────────

def test_ltv_by_cohort():
    result = ltv_by_cohort(PAYMENTS)
    months = [c.cohort_month for c in result]
    assert "2026-01" in months
    assert "2026-02" in months
    jan = next(c for c in result if c.cohort_month == "2026-01")
    # Jan cohort: Alice (1994) + Bob (699) = 2 clients
    assert jan.client_count == 2
    assert jan.total_revenue == 2693


def test_ltv_by_cohort_quarterly():
    result = ltv_by_cohort(PAYMENTS, period="quarterly")
    quarters = [c.cohort_month for c in result]
    assert "2026-Q1" in quarters
    q1 = next(c for c in result if c.cohort_month == "2026-Q1")
    # All 3 paid clients (Alice, Bob, Diana) are in Q1 2026
    assert q1.client_count == 3
    assert q1.total_revenue == 1994 + 699 + 499


def test_ltv_by_cohort_quarterly_sorts():
    # Should sort by quarter key
    result = ltv_by_cohort(PAYMENTS, period="quarterly")
    keys = [c.cohort_month for c in result]
    assert keys == sorted(keys)


# ── Upsell Rate ─────────────────────────────────────────────────

def test_upsell_rate():
    result = upsell_rate(PAYMENTS)
    assert result["total_clients"] == 3  # Alice, Bob, Diana
    assert result["upsell_clients"] == 1  # Alice only
    assert round(result["upsell_rate"], 1) == 33.3
    assert "First Call -> 3-Session Clarity Sprint" in result["upgrade_paths"]


def test_upsell_rate_empty():
    result = upsell_rate([])
    assert result["total_clients"] == 0
    assert result["upsell_rate"] == 0.0


# ── Expansion Revenue ───────────────────────────────────────────

def test_expansion_revenue():
    result = expansion_revenue(PAYMENTS)
    # New revenue: Alice $499 + Bob $699 + Diana $499 = $1697
    assert result["new_revenue"] == 1697
    # Expansion: Alice $1495
    assert result["expansion_revenue"] == 1495
    assert result["total_revenue"] == 3192
    pct = result["expansion_pct"]
    assert 46 < pct < 47, f"Expansion pct should be ~46.8%, got {pct}"


# ── Payback Period ──────────────────────────────────────────────

def test_payback_period_with_costs():
    costs = {"IG DM": 500, "Referral": 200}
    result = payback_period(PAYMENTS, costs)
    assert "IG DM" in result
    assert result["IG DM"]["cac"] == 500  # $500 total / 1 client
    assert result["IG DM"]["payback_months"] is not None


def test_payback_period_no_costs():
    result = payback_period(PAYMENTS, None)
    assert result == {}


# ── Dataclass ────────────────────────────────────────────────────

def test_client_ltv_as_dict():
    result = calculate_ltv(PAYMENTS)
    d = result[0].as_dict()
    assert "email" in d
    assert "total_revenue" in d
    assert "products" in d
