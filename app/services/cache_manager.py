"""3-tier TTL cache with webhook invalidation support.

Tiers:
- Hot (60s): Stripe sessions, Calendly events
- Warm (5min): Notion pipeline stats, ManyChat stats
- Cold (30min): Historical data, cohort analysis

Webhook invalidation: n8n writes a JSON signal file that Streamlit polls.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from typing import Any

SIGNAL_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "plans", ".cache_signal.json")


@dataclass
class CacheEntry:
    data: Any
    timestamp: float
    ttl: float

    @property
    def is_expired(self) -> bool:
        return (time.time() - self.timestamp) > self.ttl

    @property
    def age_seconds(self) -> float:
        return time.time() - self.timestamp


class CacheManager:
    """In-memory cache with 3 TTL tiers and webhook invalidation."""

    def __init__(self, hot_ttl: float = 60, warm_ttl: float = 300, cold_ttl: float = 1800):
        self._store: dict[str, CacheEntry] = {}
        self._ttls = {"hot": hot_ttl, "warm": warm_ttl, "cold": cold_ttl}
        self._last_signal_check: float = 0

    def get(self, key: str) -> Any | None:
        """Get cached value if not expired. Returns None on miss."""
        self._check_webhook_signal()
        entry = self._store.get(key)
        if entry is None or entry.is_expired:
            return None
        return entry.data

    def get_with_age(self, key: str) -> tuple[Any | None, float]:
        """Get cached value and its age in seconds. Returns (None, 0) on miss."""
        self._check_webhook_signal()
        entry = self._store.get(key)
        if entry is None or entry.is_expired:
            return None, 0
        return entry.data, entry.age_seconds

    def set(self, key: str, data: Any, tier: str = "warm") -> None:
        """Cache data with the specified tier's TTL."""
        ttl = self._ttls.get(tier, self._ttls["warm"])
        self._store[key] = CacheEntry(data=data, timestamp=time.time(), ttl=ttl)

    def invalidate(self, key: str) -> None:
        """Remove a specific key from cache."""
        self._store.pop(key, None)

    def invalidate_tier(self, tier: str) -> None:
        """Invalidate all entries matching a tier's TTL."""
        ttl = self._ttls.get(tier)
        if ttl is None:
            return
        keys_to_remove = [
            k for k, v in self._store.items() if v.ttl == ttl
        ]
        for k in keys_to_remove:
            del self._store[k]

    def invalidate_all(self) -> None:
        """Clear entire cache."""
        self._store.clear()

    def stats(self) -> dict:
        """Return cache statistics."""
        now = time.time()
        total = len(self._store)
        expired = sum(1 for v in self._store.values() if v.is_expired)
        return {
            "total_entries": total,
            "active_entries": total - expired,
            "expired_entries": expired,
            "tiers": {
                tier: sum(1 for v in self._store.values() if v.ttl == ttl and not v.is_expired)
                for tier, ttl in self._ttls.items()
            },
        }

    def _check_webhook_signal(self) -> None:
        """Poll the signal file for webhook-triggered invalidation.
        Only checks once per second to avoid excessive I/O.
        """
        now = time.time()
        if now - self._last_signal_check < 1:
            return
        self._last_signal_check = now

        try:
            if not os.path.exists(SIGNAL_FILE):
                return
            with open(SIGNAL_FILE) as f:
                signal = json.load(f)
            os.remove(SIGNAL_FILE)

            event = signal.get("event", "")
            if event in ("payment_completed", "booking_created"):
                self.invalidate_tier("hot")
                self.invalidate_tier("warm")
            elif event in ("intake_submitted", "new_lead", "action_plan_sent"):
                self.invalidate_tier("warm")
            else:
                self.invalidate_all()
        except (json.JSONDecodeError, OSError):
            pass


# Singleton instance
cache = CacheManager()
