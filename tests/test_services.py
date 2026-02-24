"""Comprehensive service-layer tests for the Creative Hotline Command Center.

Covers: HealthChecker, CacheManager, N8nService, ManyChatService,
ClaudeService, FirefliesService, and all DemoService variants.
No real API calls — everything is mocked.
"""

from __future__ import annotations

import json
import time
from unittest.mock import MagicMock, patch, PropertyMock

import pytest

from app.services.health_checker import HealthChecker, HealthStatus
from app.services.cache_manager import CacheManager
from app.services.n8n_client import N8nService
from app.services.manychat_client import ManyChatService
from app.services.claude_client import ClaudeService
from app.services.fireflies_client import FirefliesService
from app.services.demo_service import (
    DemoNotionService,
    DemoStripeService,
    DemoCalendlyService,
    DemoClaudeService,
    DemoFirefliesService,
    DemoN8nService,
)


# ── HealthStatus dataclass ───────────────────────────────────────────


def test_health_status_emoji_healthy():
    status = HealthStatus(service="test", healthy=True, last_checked=time.time(), latency_ms=5.0)
    assert status.status_emoji == "\U0001f7e2"  # green circle


def test_health_status_emoji_unhealthy():
    status = HealthStatus(service="test", healthy=False, last_checked=time.time(), latency_ms=5.0, error="down")
    assert status.status_emoji == "\U0001f534"  # red circle


def test_health_status_emoji_never_checked():
    status = HealthStatus(service="test", healthy=False, last_checked=0, latency_ms=0)
    assert status.status_emoji == "\u26aa"  # white circle


def test_health_status_text_healthy():
    status = HealthStatus(service="test", healthy=True, last_checked=time.time(), latency_ms=5.0)
    assert status.status_text == "Healthy"


def test_health_status_text_unhealthy():
    status = HealthStatus(service="test", healthy=False, last_checked=time.time(), latency_ms=5.0, error="Timeout")
    assert "Timeout" in status.status_text


def test_health_status_text_never_checked():
    status = HealthStatus(service="test", healthy=False, last_checked=0, latency_ms=0)
    assert status.status_text == "Not checked"


def test_health_status_age_seconds():
    ts = time.time() - 10
    status = HealthStatus(service="test", healthy=True, last_checked=ts, latency_ms=1.0)
    assert status.age_seconds >= 10


def test_health_status_age_never_checked():
    status = HealthStatus(service="test", healthy=False, last_checked=0, latency_ms=0)
    assert status.age_seconds == float("inf")


# ── HealthChecker ────────────────────────────────────────────────────


def test_health_checker_check_service_healthy():
    hc = HealthChecker()
    result = hc.check_service("notion", lambda: True)
    assert result.healthy is True
    assert result.service == "notion"
    assert result.latency_ms >= 0


def test_health_checker_check_service_unhealthy():
    hc = HealthChecker()
    result = hc.check_service("stripe", lambda: False)
    assert result.healthy is False


def test_health_checker_check_service_exception():
    hc = HealthChecker()

    def exploding_check():
        raise ConnectionError("Connection refused")

    result = hc.check_service("n8n", exploding_check)
    assert result.healthy is False
    assert "Connection refused" in result.error


def test_health_checker_check_all_mixed():
    """check_all with a mix of healthy, unhealthy, and None services."""
    hc = HealthChecker()

    healthy_svc = MagicMock()
    healthy_svc.is_healthy.return_value = True

    unhealthy_svc = MagicMock()
    unhealthy_svc.is_healthy.return_value = False

    results = hc.check_all({
        "notion": healthy_svc,
        "stripe": unhealthy_svc,
        "calendly": None,
    })

    assert len(results) == 3

    by_name = {r.service: r for r in results}
    assert by_name["notion"].healthy is True
    assert by_name["stripe"].healthy is False
    assert by_name["calendly"].healthy is False
    assert by_name["calendly"].error == "Service not configured"


def test_health_checker_check_all_none_service_latency_zero():
    """None services should report 0 latency."""
    hc = HealthChecker()
    results = hc.check_all({"missing": None})
    assert results[0].latency_ms == 0


def test_health_checker_get_status():
    hc = HealthChecker()
    hc.check_service("notion", lambda: True)
    status = hc.get_status("notion")
    assert status is not None
    assert status.service == "notion"
    assert hc.get_status("nonexistent") is None


def test_health_checker_get_all_statuses():
    hc = HealthChecker()
    hc.check_service("a", lambda: True)
    hc.check_service("b", lambda: False)
    all_statuses = hc.get_all_statuses()
    assert len(all_statuses) == 2


def test_health_checker_all_healthy_true():
    hc = HealthChecker()
    svc_a = MagicMock()
    svc_a.is_healthy.return_value = True
    svc_b = MagicMock()
    svc_b.is_healthy.return_value = True
    hc.check_all({"a": svc_a, "b": svc_b})
    assert hc.all_healthy is True


def test_health_checker_all_healthy_false_with_one_down():
    hc = HealthChecker()
    svc_a = MagicMock()
    svc_a.is_healthy.return_value = True
    hc.check_all({"a": svc_a, "b": None})
    assert hc.all_healthy is False


def test_health_checker_all_healthy_false_when_empty():
    hc = HealthChecker()
    assert hc.all_healthy is False


def test_health_checker_composite_score_green():
    """Green requires >= 90% healthy."""
    hc = HealthChecker()
    services = {}
    for i in range(10):
        svc = MagicMock()
        svc.is_healthy.return_value = True
        services[f"svc_{i}"] = svc
    hc.check_all(services)
    assert hc.composite_score == "Green"


def test_health_checker_composite_score_yellow():
    """Yellow requires >= 50% but < 90% healthy."""
    hc = HealthChecker()
    services = {}
    for i in range(6):
        svc = MagicMock()
        svc.is_healthy.return_value = True
        services[f"healthy_{i}"] = svc
    for i in range(4):
        services[f"down_{i}"] = None
    hc.check_all(services)
    assert hc.composite_score == "Yellow"


def test_health_checker_composite_score_red():
    """Red when < 50% healthy."""
    hc = HealthChecker()
    services = {}
    svc = MagicMock()
    svc.is_healthy.return_value = True
    services["only_one"] = svc
    for i in range(9):
        services[f"down_{i}"] = None
    hc.check_all(services)
    assert hc.composite_score == "Red"


def test_health_checker_composite_score_red_when_empty():
    hc = HealthChecker()
    assert hc.composite_score == "Red"


# ── CacheManager (extended) ─────────────────────────────────────────


def test_cache_ttl_expiry_with_time_mock():
    """Test TTL expiry by mocking time.time instead of sleeping."""
    cm = CacheManager(hot_ttl=60, warm_ttl=300, cold_ttl=1800)

    base_time = 1000000.0
    with patch("app.services.cache_manager.time") as mock_time:
        mock_time.time.return_value = base_time
        cm.set("data", "value", tier="hot")

        # Still fresh at +30s
        mock_time.time.return_value = base_time + 30
        assert cm.get("data") == "value"

        # Expired at +61s
        mock_time.time.return_value = base_time + 61
        assert cm.get("data") is None


def test_cache_tier_ttl_values():
    cm = CacheManager(hot_ttl=10, warm_ttl=100, cold_ttl=500)
    cm.set("h", "hot", tier="hot")
    cm.set("w", "warm", tier="warm")
    cm.set("c", "cold", tier="cold")

    assert cm._store["h"].ttl == 10
    assert cm._store["w"].ttl == 100
    assert cm._store["c"].ttl == 500


def test_cache_default_tier_is_warm():
    cm = CacheManager(warm_ttl=300)
    cm.set("key", "val")
    assert cm._store["key"].ttl == 300


def test_cache_unknown_tier_defaults_to_warm():
    cm = CacheManager(warm_ttl=300)
    cm.set("key", "val", tier="nonexistent")
    assert cm._store["key"].ttl == 300


def test_cache_invalidate_nonexistent_key_no_error():
    cm = CacheManager()
    cm.invalidate("does_not_exist")  # Should not raise


def test_cache_invalidate_tier_preserves_other_tiers():
    cm = CacheManager(hot_ttl=60, warm_ttl=300, cold_ttl=1800)
    cm.set("h1", 1, tier="hot")
    cm.set("h2", 2, tier="hot")
    cm.set("w1", 3, tier="warm")
    cm.set("c1", 4, tier="cold")

    cm.invalidate_tier("hot")

    assert cm.get("h1") is None
    assert cm.get("h2") is None
    assert cm.get("w1") == 3
    assert cm.get("c1") == 4


def test_cache_invalidate_unknown_tier_no_error():
    cm = CacheManager()
    cm.set("key", "val")
    cm.invalidate_tier("nonexistent")
    assert cm.get("key") == "val"


def test_cache_stats_with_expired():
    """Stats should distinguish active from expired entries."""
    cm = CacheManager(hot_ttl=60, warm_ttl=300, cold_ttl=1800)

    base_time = 2000000.0
    with patch("app.services.cache_manager.time") as mock_time:
        mock_time.time.return_value = base_time
        cm.set("hot_key", "val", tier="hot")
        cm.set("cold_key", "val", tier="cold")

        # Advance past hot TTL but not cold
        mock_time.time.return_value = base_time + 120
        stats = cm.stats()

    assert stats["total_entries"] == 2
    assert stats["expired_entries"] == 1
    assert stats["active_entries"] == 1
    assert stats["tiers"]["hot"] == 0
    assert stats["tiers"]["cold"] == 1


def test_cache_webhook_signal_payment_completed(tmp_path):
    """Webhook signal for payment_completed invalidates hot + warm tiers."""
    signal_file = tmp_path / ".cache_signal.json"
    signal_file.write_text(json.dumps({"event": "payment_completed"}))

    cm = CacheManager(hot_ttl=60, warm_ttl=300, cold_ttl=1800)
    cm.set("hot_data", "h", tier="hot")
    cm.set("warm_data", "w", tier="warm")
    cm.set("cold_data", "c", tier="cold")

    with patch("app.services.cache_manager.SIGNAL_FILE", str(signal_file)):
        cm._last_signal_check = 0  # Force re-check
        cm._check_webhook_signal()

    assert cm.get("hot_data") is None
    assert cm.get("warm_data") is None
    assert cm.get("cold_data") == "c"


def test_cache_webhook_signal_intake_submitted(tmp_path):
    """Webhook signal for intake_submitted only invalidates warm tier."""
    signal_file = tmp_path / ".cache_signal.json"
    signal_file.write_text(json.dumps({"event": "intake_submitted"}))

    cm = CacheManager(hot_ttl=60, warm_ttl=300, cold_ttl=1800)
    cm.set("hot_data", "h", tier="hot")
    cm.set("warm_data", "w", tier="warm")

    with patch("app.services.cache_manager.SIGNAL_FILE", str(signal_file)):
        cm._last_signal_check = 0
        cm._check_webhook_signal()

    assert cm.get("hot_data") == "h"
    assert cm.get("warm_data") is None


def test_cache_webhook_signal_unknown_event_clears_all(tmp_path):
    """Unknown webhook events invalidate everything."""
    signal_file = tmp_path / ".cache_signal.json"
    signal_file.write_text(json.dumps({"event": "something_unexpected"}))

    cm = CacheManager(hot_ttl=60, warm_ttl=300, cold_ttl=1800)
    cm.set("a", 1, tier="hot")
    cm.set("b", 2, tier="cold")

    with patch("app.services.cache_manager.SIGNAL_FILE", str(signal_file)):
        cm._last_signal_check = 0
        cm._check_webhook_signal()

    assert cm.get("a") is None
    assert cm.get("b") is None


def test_cache_webhook_signal_throttled():
    """Signal check is throttled to once per second."""
    cm = CacheManager()
    cm._last_signal_check = time.time()  # Just checked

    with patch("app.services.cache_manager.os.path.exists") as mock_exists:
        cm._check_webhook_signal()
        mock_exists.assert_not_called()


def test_cache_webhook_signal_missing_file():
    """Missing signal file is handled gracefully."""
    cm = CacheManager()
    cm._last_signal_check = 0

    with patch("app.services.cache_manager.SIGNAL_FILE", "/tmp/nonexistent_signal_12345.json"):
        cm._check_webhook_signal()  # Should not raise


# ── N8nService ───────────────────────────────────────────────────────


@patch("app.services.n8n_client.requests.get")
def test_n8n_is_healthy_success(mock_get):
    mock_get.return_value = MagicMock(status_code=200)
    svc = N8nService(base_url="https://n8n.example.com", api_key="test-key")
    assert svc.is_healthy() is True
    mock_get.assert_called_once_with(
        "https://n8n.example.com/api/v1/workflows",
        headers={"X-N8N-API-KEY": "test-key"},
        params={"limit": 1},
        timeout=10,
    )


@patch("app.services.n8n_client.requests.get")
def test_n8n_is_healthy_failure(mock_get):
    mock_get.return_value = MagicMock(status_code=401)
    svc = N8nService(base_url="https://n8n.example.com", api_key="bad-key")
    assert svc.is_healthy() is False


@patch("app.services.n8n_client.requests.get")
def test_n8n_is_healthy_exception(mock_get):
    mock_get.side_effect = ConnectionError("unreachable")
    svc = N8nService(base_url="https://n8n.example.com", api_key="key")
    assert svc.is_healthy() is False


@patch("app.services.n8n_client.requests.get")
def test_n8n_strips_trailing_slash(mock_get):
    mock_get.return_value = MagicMock(status_code=200)
    svc = N8nService(base_url="https://n8n.example.com/", api_key="key")
    svc.is_healthy()
    call_url = mock_get.call_args[0][0]
    assert call_url == "https://n8n.example.com/api/v1/workflows"


# ── ManyChatService ──────────────────────────────────────────────────


@patch("app.services.manychat_client.requests.get")
def test_manychat_is_healthy_success(mock_get):
    mock_get.return_value = MagicMock(status_code=200)
    svc = ManyChatService(api_key="mc-test-key")
    assert svc.is_healthy() is True


def test_manychat_is_healthy_no_key():
    svc = ManyChatService(api_key="")
    assert svc.is_healthy() is False


@patch("app.services.manychat_client.requests.get")
def test_manychat_is_healthy_exception(mock_get):
    mock_get.side_effect = ConnectionError("unreachable")
    svc = ManyChatService(api_key="key")
    assert svc.is_healthy() is False


def test_manychat_load_csv_data():
    svc = ManyChatService(api_key="key")
    csv_content = "name,email,subscribed\nAlice,alice@test.com,2026-01-01\nBob,bob@test.com,2026-01-02"
    count = svc.load_csv_data(csv_content)
    assert count == 2
    assert svc._csv_data is not None
    assert len(svc._csv_data) == 2


def test_manychat_csv_subscriber_count():
    svc = ManyChatService(api_key="key")
    assert svc._csv_subscriber_count() == 0  # No CSV loaded

    csv_content = "name,email\nA,a@test.com\nB,b@test.com\nC,c@test.com"
    svc.load_csv_data(csv_content)
    assert svc._csv_subscriber_count() == 3


@patch("app.services.manychat_client.cache")
def test_manychat_ig_to_booking_rate_cross_reference(mock_cache):
    """Verify the cross-referencing logic between ManyChat subscribers and Notion payments."""
    mock_cache.get.return_value = None
    mock_cache.set.return_value = None

    svc = ManyChatService(api_key="key")

    # Mock get_new_subscribers to return known subscribers
    subscribers = [
        {"id": "1", "name": "Alice", "email": "alice@test.com", "subscribed_at": "", "tags": []},
        {"id": "2", "name": "Bob", "email": "bob@test.com", "subscribed_at": "", "tags": []},
        {"id": "3", "name": "Carol", "email": "carol@test.com", "subscribed_at": "", "tags": []},
        {"id": "4", "name": "Dave", "email": "", "subscribed_at": "", "tags": []},  # No email
    ]

    with patch.object(svc, "get_new_subscribers", return_value=subscribers):
        # Payments: Alice and Bob booked (have call_date), Carol did not
        payments = [
            {"email": "alice@test.com", "call_date": "2026-02-20"},
            {"email": "bob@test.com", "call_date": "2026-02-21"},
            {"email": "carol@test.com", "call_date": ""},
            {"email": "other@test.com", "call_date": "2026-02-22"},  # Not a subscriber
        ]

        rate = svc.get_ig_to_booking_rate(days=30, payments=payments)

    # 3 subscribers with emails, 2 booked => 2/3 * 100 = 66.67%
    assert abs(rate - 66.67) < 0.1


@patch("app.services.manychat_client.cache")
def test_manychat_ig_to_booking_rate_no_subscribers(mock_cache):
    mock_cache.get.return_value = None
    mock_cache.set.return_value = None

    svc = ManyChatService(api_key="key")
    with patch.object(svc, "get_new_subscribers", return_value=[]):
        rate = svc.get_ig_to_booking_rate(days=30, payments=[{"email": "a@b.com", "call_date": "2026-01-01"}])
    assert rate == 0.0


@patch("app.services.manychat_client.cache")
def test_manychat_ig_to_booking_rate_no_payments(mock_cache):
    mock_cache.get.return_value = None

    svc = ManyChatService(api_key="key")
    with patch.object(svc, "get_new_subscribers", return_value=[{"email": "a@b.com"}]):
        rate = svc.get_ig_to_booking_rate(days=30, payments=None)
    assert rate == 0.0


@patch("app.services.manychat_client.cache")
def test_manychat_ig_to_booking_rate_case_insensitive(mock_cache):
    """Email matching should be case-insensitive."""
    mock_cache.get.return_value = None
    mock_cache.set.return_value = None

    svc = ManyChatService(api_key="key")
    subscribers = [
        {"id": "1", "name": "Alice", "email": "Alice@Test.COM", "subscribed_at": "", "tags": []},
    ]
    with patch.object(svc, "get_new_subscribers", return_value=subscribers):
        payments = [{"email": "alice@test.com", "call_date": "2026-02-20"}]
        rate = svc.get_ig_to_booking_rate(days=30, payments=payments)
    assert rate == 100.0


@patch("app.services.manychat_client.cache")
@patch("app.services.manychat_client.requests.get")
def test_manychat_get_subscriber_count_from_api(mock_get, mock_cache):
    mock_cache.get.return_value = None  # Cache miss
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {"data": {"subscribers": 1234}}
    mock_get.return_value = mock_response

    svc = ManyChatService(api_key="key")
    count = svc.get_subscriber_count()
    assert count == 1234
    mock_cache.set.assert_called_once_with("manychat_subscriber_count", 1234, tier="warm")


@patch("app.services.manychat_client.cache")
@patch("app.services.manychat_client.requests.get")
def test_manychat_get_subscriber_count_api_failure_csv_fallback(mock_get, mock_cache):
    mock_cache.get.return_value = None
    mock_get.side_effect = ConnectionError("API down")

    svc = ManyChatService(api_key="key")
    svc.load_csv_data("name,email\nA,a@t.com\nB,b@t.com")
    count = svc.get_subscriber_count()
    assert count == 2  # Falls back to CSV count


# ── ClaudeService ────────────────────────────────────────────────────


@patch("app.services.claude_client.anthropic.Anthropic")
def test_claude_is_healthy_success(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_client.models.list.return_value = [{"id": "claude-sonnet-4-5-20250929"}]
    mock_anthropic_cls.return_value = mock_client

    svc = ClaudeService(api_key="sk-ant-test")
    assert svc.is_healthy() is True
    mock_client.models.list.assert_called_once_with(limit=1)


@patch("app.services.claude_client.anthropic.Anthropic")
def test_claude_is_healthy_failure(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_client.models.list.side_effect = Exception("Invalid API key")
    mock_anthropic_cls.return_value = mock_client

    svc = ClaudeService(api_key="bad-key")
    assert svc.is_healthy() is False


@patch("app.services.claude_client.anthropic.Anthropic")
def test_claude_generate_text(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Generated text from Claude.")]
    mock_client.messages.create.return_value = mock_response
    mock_anthropic_cls.return_value = mock_client

    svc = ClaudeService(api_key="sk-ant-test")
    result = svc.generate_text("Tell me about creative direction", max_tokens=500)
    assert result == "Generated text from Claude."
    mock_client.messages.create.assert_called_once()


@patch("app.services.claude_client.anthropic.Anthropic")
def test_claude_generate_text_error_handling(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_client.messages.create.side_effect = Exception("Rate limited")
    mock_anthropic_cls.return_value = mock_client

    svc = ClaudeService(api_key="sk-ant-test")
    result = svc.generate_text("prompt")
    assert "Error" in result


@patch("app.services.claude_client.anthropic.Anthropic")
def test_claude_process_transcript(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"key_themes": ["branding"]}')]
    mock_client.messages.create.return_value = mock_response
    mock_anthropic_cls.return_value = mock_client

    svc = ClaudeService(api_key="sk-ant-test")
    result = svc.process_transcript("Jake: Let's talk about your brand...")
    parsed = json.loads(result)
    assert "key_themes" in parsed


# ── FirefliesService ─────────────────────────────────────────────────


@patch("app.services.fireflies_client.requests.post")
def test_fireflies_is_healthy_success(mock_post):
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {"data": {"user": {"email": "jake@test.com"}}}
    mock_post.return_value = mock_response

    svc = FirefliesService(api_key="ff-test-key")
    assert svc.is_healthy() is True


@patch("app.services.fireflies_client.requests.post")
def test_fireflies_is_healthy_failure(mock_post):
    mock_post.side_effect = ConnectionError("unreachable")
    svc = FirefliesService(api_key="ff-test-key")
    assert svc.is_healthy() is False


@patch("app.services.fireflies_client.requests.post")
def test_fireflies_is_healthy_no_user_data(mock_post):
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {"data": {"user": None}}
    mock_post.return_value = mock_response

    svc = FirefliesService(api_key="ff-test-key")
    assert svc.is_healthy() is False


@patch("app.services.fireflies_client.cache")
@patch("app.services.fireflies_client.requests.post")
def test_fireflies_list_transcripts(mock_post, mock_cache):
    mock_cache.get.return_value = None  # Cache miss
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "data": {
            "transcripts": [
                {
                    "id": "t-001",
                    "title": "Creative Call — Sarah",
                    "date": 1708300800000,  # epoch ms
                    "duration": 2700,  # seconds
                    "organizer_email": "jake@test.com",
                    "participants": ["Jake Goble", "Sarah Chen"],
                },
            ]
        }
    }
    mock_post.return_value = mock_response

    svc = FirefliesService(api_key="ff-test-key")
    transcripts = svc.list_transcripts(limit=5)

    assert len(transcripts) == 1
    assert transcripts[0]["id"] == "t-001"
    assert transcripts[0]["title"] == "Creative Call — Sarah"
    assert transcripts[0]["duration_min"] == 45.0  # 2700/60
    assert isinstance(transcripts[0]["date"], str)
    mock_cache.set.assert_called_once()


@patch("app.services.fireflies_client.cache")
@patch("app.services.fireflies_client.requests.post")
def test_fireflies_list_transcripts_api_error(mock_post, mock_cache):
    mock_cache.get.return_value = None
    mock_post.side_effect = ConnectionError("down")

    svc = FirefliesService(api_key="ff-test-key")
    result = svc.list_transcripts()
    assert result == []


@patch("app.services.fireflies_client.cache")
@patch("app.services.fireflies_client.requests.post")
def test_fireflies_get_transcript_text(mock_post, mock_cache):
    """get_transcript_text should format sentences as 'speaker: text'."""
    mock_cache.get.return_value = None
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "data": {
            "transcript": {
                "id": "t-002",
                "title": "Call",
                "date": "",
                "duration": 1800,
                "organizer_email": "jake@test.com",
                "participants": ["Jake", "Marcus"],
                "sentences": [
                    {"speaker_name": "Jake", "text": "Welcome Marcus", "start_time": 0, "end_time": 3},
                    {"speaker_name": "Marcus", "text": "Thanks for having me", "start_time": 3, "end_time": 6},
                ],
                "summary": {
                    "keywords": ["branding"],
                    "action_items": ["Redesign logo"],
                    "overview": "Call about branding",
                    "bullet_gist": "Quick chat",
                    "short_summary": "Branding discussion",
                },
            }
        }
    }
    mock_post.return_value = mock_response

    svc = FirefliesService(api_key="ff-test-key")
    text = svc.get_transcript_text("t-002")
    assert "Jake: Welcome Marcus" in text
    assert "Marcus: Thanks for having me" in text


def test_fireflies_parse_list_item_epoch_date():
    """Epoch ms date should be converted to ISO string."""
    item = {
        "id": "t-001",
        "title": "Test Call",
        "date": 1708300800000,
        "duration": 2700,
        "organizer_email": "test@test.com",
        "participants": ["A", "B"],
    }
    parsed = FirefliesService._parse_list_item(item)
    assert parsed["date"]  # Should be a non-empty ISO string
    assert "T" in parsed["date"]  # ISO format contains T


def test_fireflies_parse_list_item_short_duration():
    """Duration <= 60 should not be divided by 60."""
    item = {
        "id": "t-002",
        "title": "Quick Call",
        "date": "",
        "duration": 45,
        "organizer_email": "",
        "participants": [],
    }
    parsed = FirefliesService._parse_list_item(item)
    assert parsed["duration_min"] == 45


def test_fireflies_parse_list_item_missing_fields():
    """Missing fields should use safe defaults."""
    parsed = FirefliesService._parse_list_item({})
    assert parsed["id"] == ""
    assert parsed["title"] == "Untitled"
    assert parsed["date"] == ""
    assert parsed["duration_min"] == 0
    assert parsed["participants"] == []


# ── Demo Services ────────────────────────────────────────────────────


def test_demo_notion_is_healthy():
    svc = DemoNotionService()
    assert svc.is_healthy() is True


def test_demo_notion_get_all_payments():
    svc = DemoNotionService()
    payments = svc.get_all_payments()
    assert isinstance(payments, list)
    assert len(payments) > 0
    assert "email" in payments[0]


def test_demo_notion_get_all_intakes():
    svc = DemoNotionService()
    intakes = svc.get_all_intakes()
    assert isinstance(intakes, list)
    assert len(intakes) > 0


def test_demo_notion_get_merged_clients():
    svc = DemoNotionService()
    merged = svc.get_merged_clients()
    assert isinstance(merged, list)
    assert all("payment" in m and "intake" in m for m in merged)


def test_demo_notion_get_pipeline_stats():
    svc = DemoNotionService()
    stats = svc.get_pipeline_stats()
    assert isinstance(stats, dict)
    assert sum(stats.values()) > 0


def test_demo_notion_get_payments_by_status():
    svc = DemoNotionService()
    results = svc.get_payments_by_status("Intake Complete")
    assert isinstance(results, list)
    assert all(p["status"] == "Intake Complete" for p in results)


def test_demo_notion_get_client_by_email():
    svc = DemoNotionService()
    payments = svc.get_all_payments()
    if payments:
        email = payments[0]["email"]
        found = svc.get_client_by_email(email)
        assert found is not None
        assert found["email"].lower() == email.lower()

    assert svc.get_client_by_email("nonexistent@nowhere.com") is None


def test_demo_notion_update_page_noop():
    svc = DemoNotionService()
    svc.update_page("fake-id", {"Status": "Test"})  # Should not raise


def test_demo_stripe_service():
    svc = DemoStripeService()
    assert svc.is_healthy() is True
    sessions = svc.get_recent_sessions()
    assert isinstance(sessions, list)
    summary = svc.get_revenue_summary()
    assert "total_revenue" in summary
    monthly = svc.get_monthly_revenue(months=3)
    assert len(monthly) == 3
    assert svc.get_refunds() == []


def test_demo_calendly_service():
    svc = DemoCalendlyService()
    assert svc.is_healthy() is True
    events = svc.get_scheduled_events()
    assert isinstance(events, list)
    rate = svc.get_booking_rate()
    assert "rate" in rate
    user = svc.get_user_info()
    assert "name" in user
    assert svc.get_no_shows() == []
    assert svc.get_event_invitees("fake") == []


def test_demo_claude_service():
    svc = DemoClaudeService()
    assert svc.is_healthy() is True

    plan = svc.generate_action_plan(client_name="Test")
    assert isinstance(plan, str)
    assert len(plan) > 50

    transcript_result = svc.process_transcript("raw transcript text")
    parsed = json.loads(transcript_result)
    assert "key_themes" in parsed
    assert isinstance(parsed["key_themes"], list)

    icp = svc.analyze_icp([])
    assert "Ideal Client Profile" in icp

    text = svc.generate_text("test prompt")
    assert isinstance(text, str)

    testimonial = svc.generate_testimonial(client_name="Test")
    assert isinstance(testimonial, str)

    case_study = svc.generate_case_study(client_name="Test")
    assert isinstance(case_study, str)

    growth = svc.analyze_growth({})
    assert isinstance(growth, str)

    plan_from_transcript = svc.generate_action_plan_from_transcript(client_name="Test")
    assert isinstance(plan_from_transcript, str)


def test_demo_fireflies_service():
    svc = DemoFirefliesService()
    assert svc.is_healthy() is True

    transcripts = svc.list_transcripts()
    assert isinstance(transcripts, list)
    assert len(transcripts) == 2
    assert "id" in transcripts[0]
    assert "title" in transcripts[0]

    single = svc.get_transcript("demo-ff-01")
    assert single is not None
    assert single["id"] == "demo-ff-01"

    missing = svc.get_transcript("nonexistent")
    assert missing is None

    text = svc.get_transcript_text("demo-ff-01")
    assert isinstance(text, str)


def test_demo_n8n_service():
    svc = DemoN8nService()
    assert svc.is_healthy() is True


# ── Integration: HealthChecker + Demo Services ───────────────────────


def test_health_checker_with_all_demo_services():
    """HealthChecker should report all-green when using demo services."""
    hc = HealthChecker()
    results = hc.check_all({
        "Notion": DemoNotionService(),
        "Stripe": DemoStripeService(),
        "Calendly": DemoCalendlyService(),
        "Claude": DemoClaudeService(),
        "Fireflies": DemoFirefliesService(),
        "n8n": DemoN8nService(),
    })
    assert len(results) == 6
    assert all(r.healthy for r in results)
    assert hc.all_healthy is True
    assert hc.composite_score == "Green"
