"""Tests for lead scorer v2 enhancements: recency, frequency, negative signals."""

from datetime import datetime, timedelta

from app.utils.lead_scorer import score_client


# ── Helpers ──────────────────────────────────────────────────────

def _payment(days_ago=1, amount=499, product="First Call", status="Paid - Needs Booking"):
    created = (datetime.now() - timedelta(days=days_ago)).isoformat()
    return {
        "created": created,
        "payment_amount": amount,
        "product_purchased": product,
        "status": status,
        "payment_date": created,
        "call_date": "",
        "lead_source": "IG DM",
    }


def _intake():
    return {
        "role": "Designer",
        "brand": "Test Brand",
        "creative_emergency": "I need help with my brand identity and social media presence urgently.",
        "what_tried": "Tried hiring freelancers but nothing worked out well.",
        "deadline": "ASAP, launching next week",
        "constraints": "Limited budget",
        "desired_outcome": ["A clear decision", "Stronger positioning"],
        "created": datetime.now().isoformat(),
    }


# ── Frequency Bonus Tests ─────────────────────────────────────────


def test_frequency_bonus_sprint():
    payment = _payment(amount=1495, product="3-Session Clarity Sprint")
    result = score_client(payment, _intake())
    assert result["frequency"]["bonus"] == 5


def test_frequency_bonus_standard():
    payment = _payment(amount=699, product="Single Call")
    result = score_client(payment, _intake())
    assert result["frequency"]["bonus"] == 2


def test_frequency_bonus_first_call():
    payment = _payment(amount=499, product="First Call")
    result = score_client(payment, _intake())
    assert result["frequency"]["bonus"] == 0


# ── Recency Decay Tests ──────────────────────────────────────────


def test_recency_fresh_lead():
    payment = _payment(days_ago=2)
    result = score_client(payment, _intake())
    assert result["recency"]["multiplier"] == 1.0


def test_recency_week_old():
    payment = _payment(days_ago=10)
    result = score_client(payment, _intake())
    assert result["recency"]["multiplier"] == 0.95


def test_recency_aging():
    # Use Intake Complete status so negative cap doesn't trigger
    payment = _payment(days_ago=20, status="Intake Complete")
    result = score_client(payment, _intake())
    assert result["recency"]["multiplier"] == 0.85


def test_recency_stale():
    # Use Call Complete status so negative cap doesn't trigger
    # (negative cap only applies to Lead - Laylo and Paid - Needs Booking)
    payment = _payment(days_ago=45, status="Call Complete")
    result = score_client(payment, _intake())
    assert result["recency"]["multiplier"] == 0.7


# ── Negative Signal Tests ────────────────────────────────────────


def test_negative_stale_laylo_lead():
    payment = _payment(days_ago=35, amount=0, status="Lead - Laylo")
    result = score_client(payment, None)
    assert result["negative"]["capped"] is True
    assert result["total"] <= 40


def test_negative_stalled_paid():
    payment = _payment(days_ago=16, amount=499, status="Paid - Needs Booking")
    result = score_client(payment, _intake())
    assert result["negative"]["capped"] is True


def test_no_negative_healthy_client():
    payment = _payment(days_ago=3, amount=499, status="Intake Complete")
    result = score_client(payment, _intake())
    assert result["negative"]["capped"] is False


# ── Integration Tests ─────────────────────────────────────────────


def test_score_clamped_0_100():
    # Even with bonuses, should never exceed 100
    payment = _payment(days_ago=1, amount=1495, product="3-Session Clarity Sprint", status="Call Complete")
    result = score_client(payment, _intake())
    assert 0 <= result["total"] <= 100


def test_score_includes_new_keys():
    payment = _payment()
    result = score_client(payment, _intake())
    assert "frequency" in result
    assert "recency" in result
    assert "negative" in result


def test_cold_lead_still_scores():
    """A Laylo lead with no intake should still get some points from source."""
    payment = _payment(days_ago=5, amount=0, status="Lead - Laylo")
    result = score_client(payment, None)
    assert result["total"] >= 0
    assert result["source"]["score"] > 0
