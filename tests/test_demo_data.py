"""Tests for demo data completeness and consistency."""

from __future__ import annotations

from app.utils.demo_data import (
    DEMO_PAYMENTS,
    DEMO_INTAKES,
    get_demo_payments,
    get_demo_intakes,
    get_demo_merged_clients,
    get_demo_pipeline_stats,
    get_demo_revenue_summary,
    get_demo_monthly_revenue,
    get_demo_booking_rate,
    get_demo_avg_time_to_book,
    get_demo_recent_sessions,
    get_demo_scheduled_events,
)
from app.config import PIPELINE_STATUSES


def test_demo_payments_count():
    assert len(DEMO_PAYMENTS) == 15


def test_all_pipeline_statuses_covered():
    statuses = {p["status"] for p in DEMO_PAYMENTS}
    for s in PIPELINE_STATUSES:
        assert s in statuses, f"Missing pipeline status: {s}"


def test_all_products_covered():
    products = {p["product_purchased"] for p in DEMO_PAYMENTS if p["payment_amount"] > 0}
    for product in ("First Call", "Single Call", "3-Session Clarity Sprint"):
        assert product in products, f"Missing product: {product}"


def test_multiple_lead_sources():
    sources = {p["lead_source"] for p in DEMO_PAYMENTS if p["lead_source"]}
    assert len(sources) >= 5, f"Only {len(sources)} sources: {sources}"


def test_intakes_have_matching_payments():
    payment_emails = {p["email"].lower() for p in DEMO_PAYMENTS}
    for intake in DEMO_INTAKES:
        assert intake["email"].lower() in payment_emails, (
            f"Intake {intake['email']} has no matching payment"
        )


def test_merged_clients_count():
    merged = get_demo_merged_clients()
    assert len(merged) == len(DEMO_PAYMENTS)


def test_merged_clients_have_intakes():
    merged = get_demo_merged_clients()
    has_intake = [m for m in merged if m["intake"] is not None]
    assert len(has_intake) == len(DEMO_INTAKES)


def test_pipeline_stats_sum():
    stats = get_demo_pipeline_stats()
    assert sum(stats.values()) == len(DEMO_PAYMENTS)


def test_revenue_summary_has_keys():
    summary = get_demo_revenue_summary()
    assert "total_revenue" in summary
    assert "session_count" in summary
    assert "avg_deal_size" in summary
    assert "by_product" in summary


def test_monthly_revenue_length():
    data = get_demo_monthly_revenue(months=6)
    assert len(data) == 6
    for entry in data:
        assert "month" in entry
        assert "revenue" in entry


def test_booking_rate_has_keys():
    rate = get_demo_booking_rate()
    assert "rate" in rate
    assert "booked" in rate
    assert rate["rate"] > 0


def test_avg_time_to_book():
    avg = get_demo_avg_time_to_book()
    assert isinstance(avg, float)
    assert avg > 0


def test_recent_sessions_match_paid_payments():
    sessions = get_demo_recent_sessions()
    paid = [p for p in DEMO_PAYMENTS if p["payment_amount"] > 0]
    assert len(sessions) == len(paid)


def test_scheduled_events_have_call_dates():
    events = get_demo_scheduled_events()
    assert len(events) > 0
    for e in events:
        assert "uuid" in e
        assert "start_time" in e


def test_payments_return_copy():
    a = get_demo_payments()
    b = get_demo_payments()
    assert a is not b


def test_unique_emails():
    emails = [p["email"].lower() for p in DEMO_PAYMENTS]
    assert len(emails) == len(set(emails)), "Duplicate emails in demo payments"
