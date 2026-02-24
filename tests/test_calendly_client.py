"""Unit tests for CalendlyService — all HTTP requests mocked."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.services.calendly_client import CalendlyService


# ── Fixtures ─────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def clear_cache():
    from app.services.cache_manager import cache
    cache.invalidate_all()
    yield
    cache.invalidate_all()


@pytest.fixture
def svc():
    """CalendlyService with a test key."""
    return CalendlyService(
        api_key="test-key",
        org_uri="https://api.calendly.com/organizations/org-123",
        event_type_uri="",
    )


def _ok_response(json_data: dict, status_code: int = 200) -> MagicMock:
    """Build a mock requests.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data
    resp.raise_for_status.return_value = None
    return resp


def _error_response(status_code: int = 500) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    return resp


def _make_event(
    uuid: str = "evt-1",
    name: str = "Creative Hotline Call",
    status: str = "active",
    start_time: str = "2026-02-20T14:00:00Z",
    end_time: str = "2026-02-20T14:45:00Z",
    created_at: str = "2026-02-18T10:00:00Z",
    invitees_total: int = 1,
) -> dict:
    return {
        "uri": f"https://api.calendly.com/scheduled_events/{uuid}",
        "name": name,
        "status": status,
        "start_time": start_time,
        "end_time": end_time,
        "created_at": created_at,
        "location": {"type": "zoom"},
        "event_type": "https://api.calendly.com/event_types/et-1",
        "invitees_counter": {"total": invitees_total},
    }


# ── is_healthy ───────────────────────────────────────────────────────


@patch("app.services.calendly_client.requests.get")
def test_is_healthy_success(mock_get, svc):
    mock_get.return_value = _ok_response({"resource": {}})
    assert svc.is_healthy() is True


@patch("app.services.calendly_client.requests.get")
def test_is_healthy_failure(mock_get, svc):
    mock_get.return_value = _error_response(401)
    mock_get.return_value.status_code = 401
    assert svc.is_healthy() is False


def test_is_healthy_no_api_key():
    service = CalendlyService(api_key="")
    assert service.is_healthy() is False


@patch("app.services.calendly_client.requests.get")
def test_is_healthy_exception(mock_get, svc):
    mock_get.side_effect = Exception("Connection refused")
    assert svc.is_healthy() is False


# ── get_user_info ────────────────────────────────────────────────────


@patch("app.services.calendly_client.requests.get")
def test_get_user_info(mock_get, svc):
    mock_get.return_value = _ok_response({
        "resource": {
            "uri": "https://api.calendly.com/users/u-1",
            "name": "Jake Goble",
            "email": "jake@radanimal.co",
            "current_organization": "https://api.calendly.com/organizations/org-123",
        }
    })
    info = svc.get_user_info()
    assert info["name"] == "Jake Goble"
    assert info["email"] == "jake@radanimal.co"
    assert "org-123" in info["org_uri"]


@patch("app.services.calendly_client.requests.get")
def test_get_user_info_error(mock_get, svc):
    mock_get.return_value = _error_response(401)
    assert svc.get_user_info() == {}


# ── get_scheduled_events ─────────────────────────────────────────────


@patch("app.services.calendly_client.requests.get")
def test_get_scheduled_events_basic(mock_get, svc):
    mock_get.return_value = _ok_response({
        "collection": [_make_event()],
    })
    events = svc.get_scheduled_events()
    assert len(events) == 1
    e = events[0]
    assert e["uuid"] == "evt-1"
    assert e["name"] == "Creative Hotline Call"
    assert e["status"] == "active"
    assert e["start_time"] == "2026-02-20T14:00:00Z"
    assert e["location_type"] == "zoom"
    assert e["invitees_count"] == 1


@patch("app.services.calendly_client.requests.get")
def test_get_scheduled_events_multiple(mock_get, svc):
    mock_get.return_value = _ok_response({
        "collection": [_make_event(uuid="e1"), _make_event(uuid="e2"), _make_event(uuid="e3")],
    })
    assert len(svc.get_scheduled_events()) == 3


@patch("app.services.calendly_client.requests.get")
def test_get_scheduled_events_cached(mock_get, svc):
    mock_get.return_value = _ok_response({"collection": [_make_event()]})
    svc.get_scheduled_events(days_back=30, days_forward=30)
    svc.get_scheduled_events(days_back=30, days_forward=30)
    assert mock_get.call_count == 1


@patch("app.services.calendly_client.requests.get")
def test_get_scheduled_events_api_error(mock_get, svc):
    mock_get.return_value = _error_response(500)
    assert svc.get_scheduled_events() == []


def test_get_scheduled_events_no_org_uri():
    """Without an org URI and no way to discover, returns empty."""
    service = CalendlyService(api_key="test-key", org_uri="")
    with patch("app.services.calendly_client.requests.get") as mock_get:
        # get_user_info returns empty — can't discover org
        mock_get.return_value = _error_response(401)
        assert service.get_scheduled_events() == []


# ── get_event_invitees ───────────────────────────────────────────────


@patch("app.services.calendly_client.requests.get")
def test_get_event_invitees(mock_get, svc):
    mock_get.return_value = _ok_response({
        "collection": [
            {
                "email": "sarah@example.com",
                "name": "Sarah Chen",
                "status": "active",
                "created_at": "2026-02-18T10:00:00Z",
                "canceled": False,
                "rescheduled": False,
            }
        ]
    })
    invitees = svc.get_event_invitees("evt-1")
    assert len(invitees) == 1
    assert invitees[0]["email"] == "sarah@example.com"
    assert invitees[0]["name"] == "Sarah Chen"
    assert invitees[0]["canceled"] is False


@patch("app.services.calendly_client.requests.get")
def test_get_event_invitees_error(mock_get, svc):
    mock_get.return_value = _error_response(404)
    assert svc.get_event_invitees("missing-evt") == []


# ── get_no_shows ─────────────────────────────────────────────────────


@patch("app.services.calendly_client.requests.get")
def test_get_no_shows(mock_get, svc):
    mock_get.return_value = _ok_response({
        "collection": [_make_event(status="canceled")],
    })
    no_shows = svc.get_no_shows(days=30)
    assert len(no_shows) == 1
    assert no_shows[0]["status"] == "canceled"


@patch("app.services.calendly_client.requests.get")
def test_get_no_shows_empty(mock_get, svc):
    mock_get.return_value = _ok_response({"collection": []})
    assert svc.get_no_shows() == []


@patch("app.services.calendly_client.requests.get")
def test_get_no_shows_no_org(mock_get):
    service = CalendlyService(api_key="test", org_uri="")
    mock_get.return_value = _error_response(401)
    assert service.get_no_shows() == []


# ── get_booking_rate ─────────────────────────────────────────────────


@patch("app.services.calendly_client.requests.get")
def test_get_booking_rate(mock_get, svc):
    # First call = scheduled events (active), second call = no-shows (canceled)
    mock_get.side_effect = [
        _ok_response({"collection": [_make_event(), _make_event(uuid="e2")]}),
        _ok_response({"collection": [_make_event(uuid="e3", status="canceled")]}),
    ]
    rate = svc.get_booking_rate(days=30)
    assert rate["booked"] == 2
    assert rate["cancelled"] == 1
    assert rate["total"] == 3
    assert rate["rate"] == pytest.approx(66.67, abs=0.1)


@patch("app.services.calendly_client.requests.get")
def test_get_booking_rate_no_events(mock_get, svc):
    mock_get.return_value = _ok_response({"collection": []})
    rate = svc.get_booking_rate()
    assert rate["total"] == 0
    assert rate["rate"] == 0


# ── get_avg_time_to_book ─────────────────────────────────────────────


@patch("app.services.calendly_client.requests.get")
def test_get_avg_time_to_book(mock_get, svc):
    mock_get.return_value = _ok_response({
        "collection": [
            _make_event(
                created_at="2026-02-18T10:00:00Z",
                start_time="2026-02-20T10:00:00Z",
            ),
            _make_event(
                uuid="e2",
                created_at="2026-02-19T12:00:00Z",
                start_time="2026-02-20T12:00:00Z",
            ),
        ]
    })
    avg = svc.get_avg_time_to_book()
    assert avg is not None
    # First event: 48 hours, Second event: 24 hours, avg = 36
    assert avg == pytest.approx(36.0, abs=0.1)


@patch("app.services.calendly_client.requests.get")
def test_get_avg_time_to_book_no_data(mock_get, svc):
    mock_get.return_value = _ok_response({"collection": []})
    assert svc.get_avg_time_to_book() is None


@patch("app.services.calendly_client.requests.get")
def test_get_avg_time_to_book_missing_dates(mock_get, svc):
    mock_get.return_value = _ok_response({
        "collection": [_make_event(created_at="", start_time="")],
    })
    assert svc.get_avg_time_to_book() is None


# ── _discover_org_uri ────────────────────────────────────────────────


@patch("app.services.calendly_client.requests.get")
def test_discover_org_uri(mock_get):
    service = CalendlyService(api_key="test", org_uri="")
    mock_get.return_value = _ok_response({
        "resource": {
            "uri": "https://api.calendly.com/users/u-1",
            "name": "Jake",
            "email": "jake@test.com",
            "current_organization": "https://api.calendly.com/organizations/org-abc",
        }
    })
    org = service._discover_org_uri()
    assert "org-abc" in org
    assert service._org_uri == org


# ── _parse_event ─────────────────────────────────────────────────────


def test_parse_event_static():
    result = CalendlyService._parse_event(_make_event(uuid="test-uuid"))
    assert result["uuid"] == "test-uuid"
    assert result["name"] == "Creative Hotline Call"
    assert result["location_type"] == "zoom"


def test_parse_event_no_location():
    event = _make_event()
    event["location"] = None
    result = CalendlyService._parse_event(event)
    assert result["location_type"] == ""


def test_parse_event_no_uri():
    event = _make_event()
    event["uri"] = ""
    result = CalendlyService._parse_event(event)
    assert result["uuid"] == ""
