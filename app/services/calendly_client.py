"""Calendly API client — booking data, no-shows, time-to-book metrics.

Event type: Creative Hotline Call (45 min, Stripe-gated $499).
Calendly API uses Personal Access Token auth.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

import requests

from app.services.cache_manager import cache

logger = logging.getLogger(__name__)

CALENDLY_API_BASE = "https://api.calendly.com"


class CalendlyService:
    def __init__(self, api_key: str, org_uri: str = "", event_type_uri: str = ""):
        self._api_key = api_key
        self._org_uri = org_uri
        self._event_type_uri = event_type_uri
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def is_healthy(self) -> bool:
        """Check if Calendly API is reachable."""
        if not self._api_key:
            return False
        try:
            resp = requests.get(
                f"{CALENDLY_API_BASE}/users/me",
                headers=self._headers,
                timeout=10,
            )
            return resp.status_code == 200
        except Exception:
            return False

    def get_user_info(self) -> dict:
        """Get current user info (also discovers org URI)."""
        try:
            resp = requests.get(
                f"{CALENDLY_API_BASE}/users/me",
                headers=self._headers,
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json().get("resource", {})
            return {
                "uri": data.get("uri", ""),
                "name": data.get("name", ""),
                "email": data.get("email", ""),
                "org_uri": data.get("current_organization", ""),
            }
        except Exception as e:
            logger.error(f"Calendly user info failed: {e}")
            return {}

    def get_scheduled_events(self, days_back: int = 30, days_forward: int = 30) -> list[dict]:
        """Fetch scheduled events. Cached hot (60s)."""
        cache_key = f"calendly_events_{days_back}_{days_forward}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        org_uri = self._org_uri or self._discover_org_uri()
        if not org_uri:
            return []

        min_start = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%dT%H:%M:%SZ")
        max_start = (datetime.utcnow() + timedelta(days=days_forward)).strftime("%Y-%m-%dT%H:%M:%SZ")

        events = []
        try:
            params: dict[str, Any] = {
                "organization": org_uri,
                "min_start_time": min_start,
                "max_start_time": max_start,
                "count": 100,
                "status": "active",
            }
            if self._event_type_uri:
                params["event_type"] = self._event_type_uri

            resp = requests.get(
                f"{CALENDLY_API_BASE}/scheduled_events",
                headers=self._headers,
                params=params,
                timeout=15,
            )
            resp.raise_for_status()
            for event in resp.json().get("collection", []):
                events.append(self._parse_event(event))
        except Exception as e:
            logger.error(f"Calendly events query failed: {e}")

        cache.set(cache_key, events, tier="hot")
        return events

    def get_event_invitees(self, event_uuid: str) -> list[dict]:
        """Get invitees for a specific event."""
        try:
            resp = requests.get(
                f"{CALENDLY_API_BASE}/scheduled_events/{event_uuid}/invitees",
                headers=self._headers,
                timeout=10,
            )
            resp.raise_for_status()
            invitees = []
            for inv in resp.json().get("collection", []):
                invitees.append({
                    "email": inv.get("email", ""),
                    "name": inv.get("name", ""),
                    "status": inv.get("status", ""),
                    "created_at": inv.get("created_at", ""),
                    "canceled": inv.get("canceled", False),
                    "rescheduled": inv.get("rescheduled", False),
                })
            return invitees
        except Exception as e:
            logger.error(f"Calendly invitees query failed: {e}")
            return []

    def get_no_shows(self, days: int = 30) -> list[dict]:
        """Get cancelled events (proxy for no-shows)."""
        org_uri = self._org_uri or self._discover_org_uri()
        if not org_uri:
            return []

        min_start = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
        try:
            resp = requests.get(
                f"{CALENDLY_API_BASE}/scheduled_events",
                headers=self._headers,
                params={
                    "organization": org_uri,
                    "min_start_time": min_start,
                    "count": 100,
                    "status": "canceled",
                },
                timeout=15,
            )
            resp.raise_for_status()
            return [self._parse_event(e) for e in resp.json().get("collection", [])]
        except Exception as e:
            logger.error(f"Calendly no-shows query failed: {e}")
            return []

    def get_booking_rate(self, days: int = 30) -> dict:
        """Calculate booking vs cancellation rate."""
        active = self.get_scheduled_events(days_back=days, days_forward=0)
        cancelled = self.get_no_shows(days=days)
        total = len(active) + len(cancelled)
        return {
            "booked": len(active),
            "cancelled": len(cancelled),
            "total": total,
            "rate": len(active) / total * 100 if total > 0 else 0,
        }

    def get_avg_time_to_book(self) -> float | None:
        """Average hours from event creation to event start (proxy for time-to-book).
        Returns None if no data available.
        """
        events = self.get_scheduled_events(days_back=90, days_forward=0)
        deltas = []
        for e in events:
            if e.get("created_at") and e.get("start_time"):
                try:
                    created = datetime.fromisoformat(e["created_at"].replace("Z", "+00:00"))
                    start = datetime.fromisoformat(e["start_time"].replace("Z", "+00:00"))
                    hours = (start - created).total_seconds() / 3600
                    if hours > 0:
                        deltas.append(hours)
                except (ValueError, TypeError):
                    continue
        return sum(deltas) / len(deltas) if deltas else None

    def _discover_org_uri(self) -> str:
        """Auto-discover org URI from current user."""
        info = self.get_user_info()
        org = info.get("org_uri", "")
        if org:
            self._org_uri = org
        return org

    @staticmethod
    def _parse_event(event: dict) -> dict:
        """Parse a Calendly event into a flat dict."""
        uri = event.get("uri", "")
        uuid = uri.split("/")[-1] if uri else ""
        return {
            "uuid": uuid,
            "uri": uri,
            "name": event.get("name", ""),
            "status": event.get("status", ""),
            "start_time": event.get("start_time", ""),
            "end_time": event.get("end_time", ""),
            "created_at": event.get("created_at", ""),
            "location_type": (event.get("location") or {}).get("type", ""),
            "event_type": event.get("event_type", ""),
            "invitees_count": event.get("invitees_counter", {}).get("total", 0),
        }
