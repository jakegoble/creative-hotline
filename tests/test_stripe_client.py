"""Unit tests for StripeService — all Stripe SDK calls mocked."""

from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from app.services.stripe_client import StripeService


# ── Fixtures ─────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def clear_cache():
    from app.services.cache_manager import cache
    cache.invalidate_all()
    yield
    cache.invalidate_all()


@pytest.fixture
def svc():
    """StripeService with a test key — SDK calls are mocked per-test."""
    with patch("app.services.stripe_client.stripe_sdk") as mock_stripe:
        service = StripeService(secret_key="sk_test_123")
        yield service, mock_stripe


def _make_session(
    session_id: str = "cs_test_abc",
    email: str = "sarah@example.com",
    name: str = "Sarah Chen",
    amount_cents: int = 69900,
    status: str = "complete",
    payment_status: str = "paid",
    created_ts: int | None = None,
    metadata: dict | None = None,
) -> SimpleNamespace:
    """Build a fake Stripe checkout session object."""
    if created_ts is None:
        created_ts = int(datetime(2026, 2, 18, 12, 0).timestamp())
    return SimpleNamespace(
        id=session_id,
        amount_total=amount_cents,
        status=status,
        payment_status=payment_status,
        created=created_ts,
        metadata=metadata or {},
        customer_details=SimpleNamespace(email=email, name=name),
    )


def _make_refund(
    refund_id: str = "re_test_1",
    amount_cents: int = 49900,
    status: str = "succeeded",
    created_ts: int | None = None,
) -> SimpleNamespace:
    if created_ts is None:
        created_ts = int(datetime(2026, 2, 20, 10, 0).timestamp())
    return SimpleNamespace(
        id=refund_id,
        amount=amount_cents,
        status=status,
        created=created_ts,
    )


def _list_response(data: list, has_more: bool = False) -> SimpleNamespace:
    """Fake Stripe list response."""
    return SimpleNamespace(data=data, has_more=has_more)


# ── is_healthy ───────────────────────────────────────────────────────


def test_is_healthy_success(svc):
    service, mock_stripe = svc
    mock_stripe.Balance.retrieve.return_value = {"available": []}
    assert service.is_healthy() is True


def test_is_healthy_failure(svc):
    service, mock_stripe = svc
    mock_stripe.Balance.retrieve.side_effect = Exception("Invalid API key")
    assert service.is_healthy() is False


# ── get_recent_sessions ──────────────────────────────────────────────


def test_get_recent_sessions_basic(svc):
    service, mock_stripe = svc
    session = _make_session()
    mock_stripe.checkout.Session.list.return_value = _list_response([session])

    result = service.get_recent_sessions(days=30)
    assert len(result) == 1
    assert result[0]["id"] == "cs_test_abc"
    assert result[0]["email"] == "sarah@example.com"
    assert result[0]["amount"] == 699.0
    assert result[0]["product_name"] == "Single Call"


def test_get_recent_sessions_pagination(svc):
    service, mock_stripe = svc
    s1 = _make_session(session_id="cs_1", email="a@test.com")
    s2 = _make_session(session_id="cs_2", email="b@test.com")
    mock_stripe.checkout.Session.list.side_effect = [
        _list_response([s1], has_more=True),
        _list_response([s2], has_more=False),
    ]

    result = service.get_recent_sessions(days=30)
    assert len(result) == 2


def test_get_recent_sessions_cached(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.list.return_value = _list_response([_make_session()])
    service.get_recent_sessions(days=30)
    service.get_recent_sessions(days=30)
    assert mock_stripe.checkout.Session.list.call_count == 1


def test_get_recent_sessions_api_error(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.list.side_effect = Exception("Network error")
    result = service.get_recent_sessions(days=30)
    assert result == []


def test_get_recent_sessions_empty(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.list.return_value = _list_response([])
    assert service.get_recent_sessions(days=30) == []


# ── get_session_by_id ────────────────────────────────────────────────


def test_get_session_by_id_success(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.retrieve.return_value = _make_session(session_id="cs_123")
    result = service.get_session_by_id("cs_123")
    assert result is not None
    assert result["id"] == "cs_123"


def test_get_session_by_id_not_found(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.retrieve.side_effect = Exception("Not found")
    assert service.get_session_by_id("cs_missing") is None


# ── _parse_session & _amount_to_product ──────────────────────────────


def test_parse_first_call(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.list.return_value = _list_response([
        _make_session(amount_cents=49900),
    ])
    result = service.get_recent_sessions()
    assert result[0]["amount"] == 499.0
    assert result[0]["product_name"] == "First Call"


def test_parse_sprint(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.list.return_value = _list_response([
        _make_session(amount_cents=149500),
    ])
    result = service.get_recent_sessions()
    assert result[0]["product_name"] == "3-Session Clarity Sprint"


def test_parse_unknown_amount(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.list.return_value = _list_response([
        _make_session(amount_cents=12345),
    ])
    result = service.get_recent_sessions()
    assert result[0]["product_name"] == "Unknown"


def test_parse_metadata_product_type_override(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.list.return_value = _list_response([
        _make_session(amount_cents=49900, metadata={"product_type": "VIP Day"}),
    ])
    result = service.get_recent_sessions()
    assert result[0]["product_name"] == "VIP Day"


def test_parse_no_customer_details(svc):
    service, mock_stripe = svc
    session = _make_session()
    session.customer_details = None
    mock_stripe.checkout.Session.list.return_value = _list_response([session])
    result = service.get_recent_sessions()
    assert result[0]["email"] == ""
    assert result[0]["name"] == ""


# ── get_revenue_summary ──────────────────────────────────────────────


def test_get_revenue_summary(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.list.return_value = _list_response([
        _make_session(session_id="cs_1", amount_cents=49900),
        _make_session(session_id="cs_2", amount_cents=69900),
        _make_session(session_id="cs_3", amount_cents=69900),
    ])
    summary = service.get_revenue_summary(days=30)
    assert summary["total_revenue"] == 499 + 699 + 699
    assert summary["session_count"] == 3
    assert summary["avg_deal_size"] == pytest.approx((499 + 699 + 699) / 3, abs=0.01)
    assert "Single Call" in summary["by_product"]
    assert summary["by_product"]["Single Call"]["count"] == 2


def test_get_revenue_summary_empty(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.list.return_value = _list_response([])
    summary = service.get_revenue_summary()
    assert summary["total_revenue"] == 0
    assert summary["session_count"] == 0
    assert summary["avg_deal_size"] == 0
    assert summary["by_product"] == {}


# ── get_monthly_revenue ──────────────────────────────────────────────


def test_get_monthly_revenue(svc):
    service, mock_stripe = svc
    jan_ts = int(datetime(2026, 1, 15).timestamp())
    feb_ts = int(datetime(2026, 2, 15).timestamp())
    mock_stripe.checkout.Session.list.return_value = _list_response([
        _make_session(session_id="cs_1", amount_cents=49900, created_ts=jan_ts),
        _make_session(session_id="cs_2", amount_cents=69900, created_ts=feb_ts),
        _make_session(session_id="cs_3", amount_cents=49900, created_ts=feb_ts),
    ])
    monthly = service.get_monthly_revenue(months=3)
    assert len(monthly) == 2
    assert monthly[0]["month"] == "2026-01"
    assert monthly[0]["revenue"] == 499.0
    assert monthly[1]["month"] == "2026-02"
    assert monthly[1]["revenue"] == 699.0 + 499.0


def test_get_monthly_revenue_empty(svc):
    service, mock_stripe = svc
    mock_stripe.checkout.Session.list.return_value = _list_response([])
    assert service.get_monthly_revenue() == []


# ── get_refunds ──────────────────────────────────────────────────────


def test_get_refunds(svc):
    service, mock_stripe = svc
    mock_stripe.Refund.list.return_value = _list_response([
        _make_refund(amount_cents=49900),
    ])
    refunds = service.get_refunds(days=30)
    assert len(refunds) == 1
    assert refunds[0]["amount"] == 499.0
    assert refunds[0]["status"] == "succeeded"


def test_get_refunds_cached(svc):
    service, mock_stripe = svc
    mock_stripe.Refund.list.return_value = _list_response([_make_refund()])
    service.get_refunds(days=30)
    service.get_refunds(days=30)
    assert mock_stripe.Refund.list.call_count == 1


def test_get_refunds_api_error(svc):
    service, mock_stripe = svc
    mock_stripe.Refund.list.side_effect = Exception("Network error")
    assert service.get_refunds(days=30) == []


def test_get_refunds_empty(svc):
    service, mock_stripe = svc
    mock_stripe.Refund.list.return_value = _list_response([])
    assert service.get_refunds() == []
