"""Tests for referral tracker utility."""

from app.utils.referral_tracker import (
    identify_referral_clients,
    referral_conversion_rate,
    top_referrers,
    referral_revenue_share,
)

# ── Fixtures ──────────────────────────────────────────────────────

PAYMENTS = [
    {"email": "a@test.com", "payment_amount": 699, "lead_source": "Referral", "client_name": "Alice", "status": "Call Complete"},
    {"email": "b@test.com", "payment_amount": 499, "lead_source": "Referral", "client_name": "Bob", "status": "Follow-Up Sent"},
    {"email": "c@test.com", "payment_amount": 499, "lead_source": "IG DM", "client_name": "Charlie", "status": "Call Complete"},
    {"email": "d@test.com", "payment_amount": 0, "lead_source": "Referral", "client_name": "Diana", "status": "Lead - Laylo"},
    {"email": "e@test.com", "payment_amount": 1495, "lead_source": "Website", "client_name": "Eve", "status": "Call Complete"},
    {"email": "f@test.com", "payment_amount": 0, "lead_source": "IG DM", "client_name": "Frank", "status": "Lead - Laylo"},
]

REFERRAL_MAP = {
    "a@test.com": "jake@radanimal.co",
    "b@test.com": "jake@radanimal.co",
    "d@test.com": "megha@theanecdote.co",
}


# ── Identify Referral Clients ───────────────────────────────────

def test_identify_referral_clients():
    result = identify_referral_clients(PAYMENTS)
    emails = [p["email"] for p in result]
    assert "a@test.com" in emails
    assert "b@test.com" in emails
    assert "d@test.com" in emails  # unpaid but still a referral lead
    assert "c@test.com" not in emails


def test_identify_no_referrals():
    payments = [{"email": "x@test.com", "lead_source": "IG DM"}]
    assert identify_referral_clients(payments) == []


# ── Referral Conversion Rate ───────────────────────────────────

def test_referral_conversion_rate():
    result = referral_conversion_rate(PAYMENTS)
    # 3 referral leads, 2 paid → 66.7%
    assert result["referral_leads"] == 3
    assert result["referral_paid"] == 2
    assert round(result["referral_conversion"], 1) == 66.7
    assert result["referral_avg_deal"] == (699 + 499) / 2
    # 3 other leads, 2 paid (Charlie $499, Eve $1495)
    assert result["other_leads"] == 3
    assert result["other_paid"] == 2


# ── Top Referrers ───────────────────────────────────────────────

def test_top_referrers_without_map():
    result = top_referrers(PAYMENTS)
    assert len(result) == 1
    assert result[0]["referrer"] == "(aggregate)"
    assert result[0]["referrals"] == 3


def test_top_referrers_with_map():
    result = top_referrers(PAYMENTS, REFERRAL_MAP)
    # Jake referred Alice ($699) + Bob ($499) = $1198
    jake = next(r for r in result if r["referrer"] == "jake@radanimal.co")
    assert jake["referrals"] == 2
    assert jake["revenue_generated"] == 1198
    # Megha referred Diana ($0 — unpaid lead)
    megha = next(r for r in result if r["referrer"] == "megha@theanecdote.co")
    assert megha["referrals"] == 1
    assert megha["revenue_generated"] == 0


def test_top_referrers_sorted_by_revenue():
    result = top_referrers(PAYMENTS, REFERRAL_MAP)
    revenues = [r["revenue_generated"] for r in result]
    assert revenues == sorted(revenues, reverse=True)


# ── Referral Revenue Share ──────────────────────────────────────

def test_referral_revenue_share():
    result = referral_revenue_share(PAYMENTS)
    # Referral revenue: $699 + $499 = $1198
    assert result["referral_revenue"] == 1198
    # Total revenue: $699 + $499 + $499 + $1495 = $3192
    assert result["total_revenue"] == 3192
    pct = result["referral_pct"]
    assert 37 < pct < 38, f"Expected ~37.5%, got {pct}"


def test_referral_revenue_share_no_payments():
    result = referral_revenue_share([])
    assert result["referral_pct"] == 0
