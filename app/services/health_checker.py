"""Service health monitoring with graceful degradation.

Each service has is_healthy() -> bool.
Health page aggregates all checks with last_checked timestamps.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class HealthStatus:
    service: str
    healthy: bool
    last_checked: float
    latency_ms: float
    error: str = ""

    @property
    def status_emoji(self) -> str:
        if not self.last_checked:
            return "⚪"  # never checked
        return "🟢" if self.healthy else "🔴"

    @property
    def status_text(self) -> str:
        if not self.last_checked:
            return "Not checked"
        return "Healthy" if self.healthy else f"Down: {self.error}"

    @property
    def age_seconds(self) -> float:
        if not self.last_checked:
            return float("inf")
        return time.time() - self.last_checked


class HealthChecker:
    """Aggregates health checks across all services."""

    def __init__(self):
        self._statuses: dict[str, HealthStatus] = {}

    def check_service(self, name: str, check_fn) -> HealthStatus:
        """Run a health check and record the result."""
        start = time.time()
        try:
            healthy = check_fn()
            latency = (time.time() - start) * 1000
            status = HealthStatus(
                service=name,
                healthy=healthy,
                last_checked=time.time(),
                latency_ms=round(latency, 1),
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            status = HealthStatus(
                service=name,
                healthy=False,
                last_checked=time.time(),
                latency_ms=round(latency, 1),
                error=str(e)[:200],
            )
        self._statuses[name] = status
        return status

    def check_all(self, services: dict) -> list[HealthStatus]:
        """Run health checks on all provided services.

        Args:
            services: dict of {name: service_instance} where each instance
                      has an is_healthy() method.
        """
        results = []
        for name, service in services.items():
            if service is None:
                status = HealthStatus(
                    service=name,
                    healthy=False,
                    last_checked=time.time(),
                    latency_ms=0,
                    error="Service not configured",
                )
                self._statuses[name] = status
                results.append(status)
            else:
                results.append(self.check_service(name, service.is_healthy))
        return results

    def get_status(self, name: str) -> HealthStatus | None:
        """Get the last recorded health status for a service."""
        return self._statuses.get(name)

    def get_all_statuses(self) -> list[HealthStatus]:
        """Get all recorded health statuses."""
        return list(self._statuses.values())

    @property
    def all_healthy(self) -> bool:
        """True if all checked services are healthy."""
        if not self._statuses:
            return False
        return all(s.healthy for s in self._statuses.values())

    @property
    def composite_score(self) -> str:
        """Overall health as Green/Yellow/Red."""
        if not self._statuses:
            return "Red"
        healthy_count = sum(1 for s in self._statuses.values() if s.healthy)
        total = len(self._statuses)
        ratio = healthy_count / total
        if ratio >= 0.9:
            return "Green"
        elif ratio >= 0.5:
            return "Yellow"
        return "Red"
