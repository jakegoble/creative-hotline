"""Lightweight n8n client — health check and workflow listing."""

from __future__ import annotations

import logging

import requests

logger = logging.getLogger(__name__)


class N8nService:
    def __init__(self, base_url: str, api_key: str):
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key

    def is_healthy(self) -> bool:
        """Check if n8n API is reachable."""
        try:
            resp = requests.get(
                f"{self._base_url}/api/v1/workflows",
                headers={"X-N8N-API-KEY": self._api_key},
                params={"limit": 1},
                timeout=10,
            )
            return resp.status_code == 200
        except Exception:
            return False
