"""Tests for app.utils.activity_feed module."""

from __future__ import annotations

from datetime import datetime, timedelta

from app.utils.activity_feed import (
    ActivityEvent,
    build_activity_feed,
    format_activity_time,
    EVENT_CONFIG,
)


def _ago(days: int) -> str:
    return (datetime.now() - timedelta(days=days)).isoformat() + "Z"


def _make_payment(**overrides) -> dict:
    base = {
        "id": "p1",
        "client_name": "Test User",
        "email": "test@example.com",
        "payment_amount": 699,
        "product_purchased": "Single Call",
        "payment_date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
        "status": "Paid - Needs Booking",
        "call_date": "",
        "lead_source": "Website",
        "created": _ago(7),
    }
    base.update(overrides)
    return base


def _make_intake(**overrides) -> dict:
    base = {
        "id": "i1",
        "client_name": "Test User",
        "email": "test@example.com",
        "creative_emergency": "Need help ASAP",
        "desired_outcome": ["A clear decision"],
        "created": _ago(4),
    }
    base.update(overrides)
    return base


class TestBuildActivityFeed:
    def test_returns_list(self):
        events = build_activity_feed([])
        assert isinstance(events, list)

    def test_empty_payments(self):
        events = build_activity_feed([])
        assert events == []

    def test_generates_lead_event(self):
        payment = _make_payment()
        events = build_activity_feed([payment])
        lead_events = [e for e in events if e.event_type == "lead"]
        assert len(lead_events) == 1
        assert "Test User" in lead_events[0].title

    def test_generates_payment_event(self):
        payment = _make_payment()
        events = build_activity_feed([payment])
        pay_events = [e for e in events if e.event_type == "payment"]
        assert len(pay_events) == 1
        assert "$699" in pay_events[0].subtitle

    def test_generates_booking_event(self):
        payment = _make_payment(
            status="Booked - Needs Intake",
            call_date=(datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
        )
        events = build_activity_feed([payment])
        book_events = [e for e in events if e.event_type == "booking"]
        assert len(book_events) == 1

    def test_generates_intake_event(self):
        payment = _make_payment()
        intake = _make_intake()
        events = build_activity_feed([payment], [intake])
        intake_events = [e for e in events if e.event_type == "intake"]
        assert len(intake_events) == 1

    def test_generates_call_event(self):
        payment = _make_payment(
            status="Call Complete",
            call_date=(datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
        )
        events = build_activity_feed([payment])
        call_events = [e for e in events if e.event_type == "call"]
        assert len(call_events) == 1

    def test_generates_followup_event(self):
        payment = _make_payment(
            status="Follow-Up Sent",
            call_date=(datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
        )
        events = build_activity_feed([payment])
        followup_events = [e for e in events if e.event_type == "followup"]
        assert len(followup_events) == 1

    def test_limit_caps_results(self):
        payments = [_make_payment(id=f"p{i}", email=f"user{i}@test.com") for i in range(20)]
        events = build_activity_feed(payments, limit=5)
        assert len(events) == 5

    def test_sorted_newest_first(self):
        p1 = _make_payment(id="p1", email="a@test.com", created=_ago(10))
        p2 = _make_payment(id="p2", email="b@test.com", created=_ago(1))
        events = build_activity_feed([p1, p2])
        # Most recent should be first
        assert events[0].email == "b@test.com" or events[0].timestamp >= events[-1].timestamp

    def test_no_booking_for_lead(self):
        payment = _make_payment(
            status="Lead - Laylo",
            payment_amount=0,
            call_date="",
        )
        events = build_activity_feed([payment])
        book_events = [e for e in events if e.event_type == "booking"]
        assert len(book_events) == 0

    def test_event_has_all_fields(self):
        payment = _make_payment()
        events = build_activity_feed([payment])
        for event in events:
            assert event.timestamp
            assert event.event_type
            assert event.title
            assert event.client_name
            assert event.icon
            assert event.color


class TestFormatActivityTime:
    def test_empty_string(self):
        assert format_activity_time("") == ""

    def test_recent_shows_minutes(self):
        ts = (datetime.now() - timedelta(minutes=5)).isoformat()
        result = format_activity_time(ts)
        assert "m ago" in result

    def test_hours_ago(self):
        ts = (datetime.now() - timedelta(hours=3)).isoformat()
        result = format_activity_time(ts)
        assert "h ago" in result

    def test_days_ago(self):
        ts = (datetime.now() - timedelta(days=2)).isoformat()
        result = format_activity_time(ts)
        assert "d ago" in result

    def test_weeks_ago(self):
        ts = (datetime.now() - timedelta(days=14)).isoformat()
        result = format_activity_time(ts)
        assert "w ago" in result

    def test_future_shows_in(self):
        ts = (datetime.now() + timedelta(days=2)).isoformat()
        result = format_activity_time(ts)
        assert result.startswith("in ")


class TestEventConfig:
    def test_all_event_types_have_config(self):
        expected = {"payment", "booking", "intake", "call", "followup", "lead"}
        assert set(EVENT_CONFIG.keys()) == expected

    def test_config_has_required_fields(self):
        for key, config in EVENT_CONFIG.items():
            assert "icon" in config
            assert "color" in config
            assert "label" in config
