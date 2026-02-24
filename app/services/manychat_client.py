"""ManyChat API client — top-of-funnel IG DM stats.

ManyChat handles Instagram DM automation for @creative.hotline.
Provides subscriber counts, keyword trigger stats, and flow completion rates.
Falls back to CSV import if API is unavailable.
"""

from __future__ import annotations

import csv
import io
import logging
from typing import Any

import requests

from app.services.cache_manager import cache

logger = logging.getLogger(__name__)

MANYCHAT_API_BASE = "https://api.manychat.com"


class ManyChatService:
    def __init__(self, api_key: str):
        self._api_key = api_key
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self._csv_data: list[dict] | None = None

    def is_healthy(self) -> bool:
        """Check if ManyChat API is reachable."""
        if not self._api_key:
            return False
        try:
            resp = requests.get(
                f"{MANYCHAT_API_BASE}/fb/page/getInfo",
                headers=self._headers,
                timeout=10,
            )
            return resp.status_code == 200
        except Exception:
            return False

    def get_subscriber_count(self) -> int:
        """Get total subscriber count. Cached warm (5min)."""
        cached = cache.get("manychat_subscriber_count")
        if cached is not None:
            return cached

        try:
            resp = requests.get(
                f"{MANYCHAT_API_BASE}/fb/page/getInfo",
                headers=self._headers,
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json().get("data", {})
            count = data.get("subscribers", 0)
            cache.set("manychat_subscriber_count", count, tier="warm")
            return count
        except Exception as e:
            logger.error(f"ManyChat subscriber count failed: {e}")
            return self._csv_subscriber_count()

    def get_new_subscribers(self, days: int = 30) -> list[dict]:
        """Get subscribers added in the last N days. Cached warm (5min)."""
        cache_key = f"manychat_new_subs_{days}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            resp = requests.post(
                f"{MANYCHAT_API_BASE}/fb/subscriber/getSubscribers",
                headers=self._headers,
                json={
                    "filter": {
                        "date_added": {"from": f"-{days} days", "to": "now"},
                    },
                    "limit": 100,
                },
                timeout=15,
            )
            resp.raise_for_status()
            subscribers = []
            for sub in resp.json().get("data", []):
                subscribers.append({
                    "id": sub.get("id", ""),
                    "name": sub.get("name", ""),
                    "email": sub.get("email", ""),
                    "subscribed_at": sub.get("subscribed_time", ""),
                    "tags": [t.get("name", "") for t in sub.get("tags", [])],
                })
            cache.set(cache_key, subscribers, tier="warm")
            return subscribers
        except Exception as e:
            logger.error(f"ManyChat new subscribers failed: {e}")
            return []

    def get_keyword_stats(self) -> dict[str, int]:
        """Get trigger keyword hit counts.
        Note: ManyChat doesn't expose keyword stats directly via API.
        Returns stats from automations that use keyword triggers.
        """
        cached = cache.get("manychat_keywords")
        if cached is not None:
            return cached

        try:
            resp = requests.get(
                f"{MANYCHAT_API_BASE}/fb/sending/getFlows",
                headers=self._headers,
                timeout=10,
            )
            resp.raise_for_status()
            flows = resp.json().get("data", [])
            keyword_stats = {}
            for flow in flows:
                name = flow.get("name", "")
                triggers = flow.get("triggers", [])
                for trigger in triggers:
                    if trigger.get("type") == "keyword":
                        keyword = trigger.get("keyword", name)
                        keyword_stats[keyword] = flow.get("sent_count", 0)
            cache.set("manychat_keywords", keyword_stats, tier="warm")
            return keyword_stats
        except Exception as e:
            logger.error(f"ManyChat keyword stats failed: {e}")
            return {}

    def get_flow_stats(self) -> list[dict]:
        """Get automation flow completion rates."""
        cached = cache.get("manychat_flows")
        if cached is not None:
            return cached

        try:
            resp = requests.get(
                f"{MANYCHAT_API_BASE}/fb/sending/getFlows",
                headers=self._headers,
                timeout=10,
            )
            resp.raise_for_status()
            flows = []
            for flow in resp.json().get("data", []):
                flows.append({
                    "id": flow.get("id", ""),
                    "name": flow.get("name", ""),
                    "status": flow.get("status", ""),
                    "sent_count": flow.get("sent_count", 0),
                })
            cache.set("manychat_flows", flows, tier="warm")
            return flows
        except Exception as e:
            logger.error(f"ManyChat flow stats failed: {e}")
            return []

    def get_tag_distribution(self) -> dict[str, int]:
        """Get subscriber count per tag."""
        cached = cache.get("manychat_tags")
        if cached is not None:
            return cached

        try:
            resp = requests.get(
                f"{MANYCHAT_API_BASE}/fb/page/getTags",
                headers=self._headers,
                timeout=10,
            )
            resp.raise_for_status()
            tags = {}
            for tag in resp.json().get("data", []):
                tags[tag.get("name", "")] = tag.get("count", 0)
            cache.set("manychat_tags", tags, tier="warm")
            return tags
        except Exception as e:
            logger.error(f"ManyChat tag distribution failed: {e}")
            return {}

    # ── CSV Fallback ─────────────────────────────────────────────

    def load_csv_data(self, csv_content: str) -> int:
        """Load subscriber data from CSV export (fallback when API unavailable).
        Returns number of records loaded.
        """
        reader = csv.DictReader(io.StringIO(csv_content))
        self._csv_data = list(reader)
        return len(self._csv_data)

    def _csv_subscriber_count(self) -> int:
        """Count subscribers from loaded CSV data."""
        if self._csv_data is None:
            return 0
        return len(self._csv_data)

    def get_ig_to_booking_rate(self, days: int = 30, payments: list[dict] | None = None) -> float:
        """Calculate IG DM subscriber to booking conversion rate.

        Cross-references ManyChat subscriber emails with Notion payment records
        to find how many IG DM subscribers ended up booking a call.

        Args:
            days: Look-back window for new subscribers.
            payments: Notion payment records (must be passed by the caller).

        Returns:
            Conversion rate as a percentage (0-100), or 0.0 if insufficient data.
        """
        new_subs = self.get_new_subscribers(days=days)
        if not new_subs or not payments:
            return 0.0

        sub_emails = {s.get("email", "").lower() for s in new_subs if s.get("email")}
        if not sub_emails:
            return 0.0

        booked = sum(
            1 for p in payments
            if p.get("email", "").lower() in sub_emails
            and p.get("call_date")
        )

        return (booked / len(sub_emails)) * 100
