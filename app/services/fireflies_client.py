"""Fireflies AI client — fetch call transcripts via GraphQL API."""

from __future__ import annotations

import logging
from datetime import datetime

import requests

from app.services.cache_manager import cache

logger = logging.getLogger(__name__)

GRAPHQL_ENDPOINT = "https://api.fireflies.ai/graphql"


class FirefliesService:
    def __init__(self, api_key: str):
        self._api_key = api_key
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def _query(self, query: str, variables: dict | None = None) -> dict:
        """Execute a GraphQL query against the Fireflies API."""
        payload: dict = {"query": query}
        if variables:
            payload["variables"] = variables
        resp = requests.post(
            GRAPHQL_ENDPOINT, json=payload, headers=self._headers, timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        if "errors" in data:
            raise RuntimeError(data["errors"][0].get("message", "GraphQL error"))
        return data.get("data", {})

    def is_healthy(self) -> bool:
        """Lightweight health check — fetch user info."""
        try:
            data = self._query("{ user { email } }")
            return bool(data.get("user"))
        except Exception:
            return False

    def list_transcripts(self, limit: int = 20) -> list[dict]:
        """Fetch recent transcripts (title, date, duration, participants).

        Returns a list of dicts sorted newest-first.
        """
        cache_key = f"fireflies_transcripts_{limit}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        query = """
        query RecentTranscripts($limit: Int) {
            transcripts(limit: $limit) {
                id
                title
                date
                duration
                organizer_email
                participants
            }
        }
        """
        try:
            data = self._query(query, {"limit": limit})
            transcripts = data.get("transcripts") or []
            parsed = [self._parse_list_item(t) for t in transcripts]
            cache.set(cache_key, parsed, tier="hot")
            return parsed
        except Exception as e:
            logger.error(f"Fireflies list_transcripts failed: {e}")
            return []

    def get_transcript(self, transcript_id: str) -> dict | None:
        """Fetch a full transcript by ID including sentences and summary."""
        cache_key = f"fireflies_transcript_{transcript_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        query = """
        query Transcript($transcriptId: String!) {
            transcript(id: $transcriptId) {
                id
                title
                date
                duration
                organizer_email
                participants
                sentences {
                    speaker_name
                    text
                    start_time
                    end_time
                }
                summary {
                    keywords
                    action_items
                    overview
                    bullet_gist
                    short_summary
                }
            }
        }
        """
        try:
            data = self._query(query, {"transcriptId": transcript_id})
            transcript = data.get("transcript")
            if not transcript:
                return None
            parsed = self._parse_full_transcript(transcript)
            cache.set(cache_key, parsed, tier="warm")
            return parsed
        except Exception as e:
            logger.error(f"Fireflies get_transcript failed: {e}")
            return None

    def get_transcript_text(self, transcript_id: str) -> str:
        """Get the full transcript as plain text (speaker: text format)."""
        full = self.get_transcript(transcript_id)
        if not full or not full.get("sentences"):
            return ""
        lines = []
        for s in full["sentences"]:
            speaker = s.get("speaker_name", "Unknown")
            text = s.get("text", "")
            if text:
                lines.append(f"{speaker}: {text}")
        return "\n".join(lines)

    # ── Parsing helpers ──────────────────────────────────────────

    @staticmethod
    def _parse_list_item(t: dict) -> dict:
        """Parse a transcript list item into a flat dict."""
        date_val = t.get("date") or ""
        # Fireflies returns epoch ms or ISO string
        if isinstance(date_val, (int, float)):
            try:
                date_val = datetime.fromtimestamp(date_val / 1000).isoformat()
            except (ValueError, OSError):
                date_val = ""

        duration = t.get("duration") or 0
        # Duration may come as seconds — convert to minutes
        duration_min = round(duration / 60, 1) if duration > 60 else duration

        return {
            "id": t.get("id", ""),
            "title": t.get("title", "Untitled"),
            "date": date_val,
            "duration_min": duration_min,
            "organizer_email": t.get("organizer_email", ""),
            "participants": t.get("participants") or [],
        }

    @staticmethod
    def _parse_full_transcript(t: dict) -> dict:
        """Parse a full transcript response."""
        date_val = t.get("date") or ""
        if isinstance(date_val, (int, float)):
            try:
                date_val = datetime.fromtimestamp(date_val / 1000).isoformat()
            except (ValueError, OSError):
                date_val = ""

        summary = t.get("summary") or {}
        return {
            "id": t.get("id", ""),
            "title": t.get("title", "Untitled"),
            "date": date_val,
            "duration": t.get("duration", 0),
            "organizer_email": t.get("organizer_email", ""),
            "participants": t.get("participants") or [],
            "sentences": t.get("sentences") or [],
            "summary": {
                "keywords": summary.get("keywords") or [],
                "action_items": summary.get("action_items") or [],
                "overview": summary.get("overview") or "",
                "bullet_gist": summary.get("bullet_gist") or "",
                "short_summary": summary.get("short_summary") or "",
            },
        }
