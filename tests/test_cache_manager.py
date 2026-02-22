"""Tests for the cache manager."""

import time

from app.services.cache_manager import CacheManager


def test_set_and_get():
    c = CacheManager(hot_ttl=1, warm_ttl=5, cold_ttl=30)
    c.set("key1", {"data": "value"}, tier="warm")
    assert c.get("key1") == {"data": "value"}


def test_expired_returns_none():
    c = CacheManager(hot_ttl=0.05)
    c.set("key1", "value", tier="hot")
    time.sleep(0.06)
    assert c.get("key1") is None


def test_invalidate_key():
    c = CacheManager()
    c.set("key1", "value")
    c.invalidate("key1")
    assert c.get("key1") is None


def test_invalidate_all():
    c = CacheManager()
    c.set("a", 1)
    c.set("b", 2)
    c.invalidate_all()
    assert c.get("a") is None
    assert c.get("b") is None


def test_invalidate_tier():
    c = CacheManager(hot_ttl=60, warm_ttl=300)
    c.set("hot_key", "hot_val", tier="hot")
    c.set("warm_key", "warm_val", tier="warm")
    c.invalidate_tier("hot")
    assert c.get("hot_key") is None
    assert c.get("warm_key") == "warm_val"


def test_stats():
    c = CacheManager(hot_ttl=60, warm_ttl=300)
    c.set("a", 1, tier="hot")
    c.set("b", 2, tier="warm")
    stats = c.stats()
    assert stats["total_entries"] == 2
    assert stats["active_entries"] == 2
    assert stats["tiers"]["hot"] == 1
    assert stats["tiers"]["warm"] == 1


def test_get_with_age():
    c = CacheManager()
    c.set("key", "value")
    data, age = c.get_with_age("key")
    assert data == "value"
    assert age >= 0


def test_get_with_age_miss():
    c = CacheManager()
    data, age = c.get_with_age("missing")
    assert data is None
    assert age == 0
