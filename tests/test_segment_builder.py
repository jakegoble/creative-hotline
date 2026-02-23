"""Tests for retargeting segment builder."""

from datetime import datetime, timedelta

from app.utils.segment_builder import (
    build_all_segments,
    get_segment,
    segment_summary,
)


# ── Fixtures ──────────────────────────────────────────────────────

NOW = datetime(2026, 2, 22, 12, 0, 0)


def _make_payment(status, amount=0, days_ago=0, product="First Call", email="test@test.com"):
    created = (NOW - timedelta(days=days_ago)).isoformat()
    return {
        "email": email,
        "client_name": f"Client ({email})",
        "status": status,
        "payment_amount": amount,
        "product_purchased": product,
        "created": created,
        "call_date": "",
        "linked_intake_id": "",
        "lead_source": "IG DM",
    }


PAYMENTS = [
    # Stale lead: Laylo, 10 days old, no payment
    _make_payment("Lead - Laylo", amount=0, days_ago=10, email="stale@test.com"),
    # Window shopper: Laylo, 20 days old, no payment
    _make_payment("Lead - Laylo", amount=0, days_ago=20, email="window@test.com"),
    # Booking ghost: paid but not booked, 7 days
    _make_payment("Paid - Needs Booking", amount=499, days_ago=7, email="ghost@test.com"),
    # Intake dropoff: booked but no intake
    _make_payment("Booked - Needs Intake", amount=499, days_ago=3, email="dropoff@test.com"),
    # Comeback kid: call complete, single call
    _make_payment("Call Complete", amount=499, days_ago=14, product="First Call", email="comeback@test.com"),
    # NOT a comeback kid: already on Sprint
    _make_payment("Call Complete", amount=1495, days_ago=14, product="3-Pack Sprint", email="sprint@test.com"),
    # Recent lead (too new for stale)
    _make_payment("Lead - Laylo", amount=0, days_ago=2, email="fresh@test.com"),
    # Healthy client mid-pipeline
    _make_payment("Intake Complete", amount=699, days_ago=5, email="healthy@test.com"),
]


# ── Tests ─────────────────────────────────────────────────────────


def test_build_all_segments():
    segments = build_all_segments(PAYMENTS)
    assert len(segments) == 6
    names = [s.name for s in segments]
    assert "Stale Leads" in names
    assert "Window Shoppers" in names
    assert "Booking Ghosts" in names
    assert "Intake Dropoffs" in names
    assert "Comeback Kids" in names
    assert "High-Value Prospects" in names


def test_stale_leads():
    seg = get_segment("Stale Leads", PAYMENTS)
    assert seg is not None
    assert seg.count == 1
    assert seg.clients[0]["email"] == "stale@test.com"


def test_window_shoppers():
    seg = get_segment("Window Shoppers", PAYMENTS)
    assert seg is not None
    assert seg.count == 1
    assert seg.clients[0]["email"] == "window@test.com"


def test_booking_ghosts():
    seg = get_segment("Booking Ghosts", PAYMENTS)
    assert seg is not None
    assert seg.count == 1
    assert seg.clients[0]["email"] == "ghost@test.com"


def test_intake_dropoffs():
    seg = get_segment("Intake Dropoffs", PAYMENTS)
    assert seg is not None
    assert seg.count == 1
    assert seg.clients[0]["email"] == "dropoff@test.com"


def test_comeback_kids_excludes_sprint():
    seg = get_segment("Comeback Kids", PAYMENTS)
    assert seg is not None
    assert seg.count == 1
    assert seg.clients[0]["email"] == "comeback@test.com"
    # Sprint client should not be included
    emails = [c["email"] for c in seg.clients]
    assert "sprint@test.com" not in emails


def test_high_value_prospects_with_scores():
    scores = [
        {"payment": {"email": "stale@test.com"}, "score": {"total": 75}},
        {"payment": {"email": "window@test.com"}, "score": {"total": 40}},
        {"payment": {"email": "fresh@test.com"}, "score": {"total": 80}},
    ]
    seg = get_segment("High-Value Prospects", PAYMENTS, scores=scores)
    assert seg is not None
    # stale@test.com (75) and fresh@test.com (80) are unpaid with score >= 70
    assert seg.count == 2


def test_high_value_excludes_paid():
    scores = [
        {"payment": {"email": "ghost@test.com"}, "score": {"total": 90}},
    ]
    seg = get_segment("High-Value Prospects", PAYMENTS, scores=scores)
    assert seg is not None
    emails = [c["email"] for c in seg.clients]
    # ghost@test.com has payment_amount=499, should be excluded
    assert "ghost@test.com" not in emails


def test_segment_summary():
    segments = build_all_segments(PAYMENTS)
    summary = segment_summary(segments)
    assert "total_clients" in summary
    assert "total_value" in summary
    assert "by_priority" in summary
    assert summary["total_clients"] >= 0


def test_segment_estimated_value():
    seg = get_segment("Comeback Kids", PAYMENTS)
    assert seg is not None
    # 1 client * $1495 = $1495
    assert seg.estimated_value == 1495.0


def test_empty_payments():
    segments = build_all_segments([])
    for seg in segments:
        assert seg.count == 0


def test_segment_priorities():
    segments = build_all_segments(PAYMENTS)
    priority_map = {s.name: s.priority for s in segments}
    assert priority_map["Booking Ghosts"] == "high"
    assert priority_map["Intake Dropoffs"] == "high"
    assert priority_map["Window Shoppers"] == "low"
