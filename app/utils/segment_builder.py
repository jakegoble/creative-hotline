"""Rule-based lead segmentation for retargeting and re-engagement.

Builds named segments of leads based on pipeline status, timing, and score.
Each segment includes a suggested action for follow-up.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Segment:
    name: str
    description: str
    clients: list[dict] = field(default_factory=list)
    action: str = ""
    priority: str = "medium"  # high, medium, low
    estimated_value: float = 0.0

    @property
    def count(self) -> int:
        return len(self.clients)

    def as_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "count": self.count,
            "action": self.action,
            "priority": self.priority,
            "estimated_value": round(self.estimated_value, 2),
            "clients": self.clients,
        }


# ── Segment Definitions ──────────────────────────────────────────

SEGMENT_DEFS = [
    {
        "name": "Stale Leads",
        "description": "Signed up via IG but haven't paid in 7+ days",
        "action": "Send nurture email or personal DM",
        "priority": "medium",
        "value_per_client": 499,
    },
    {
        "name": "Window Shoppers",
        "description": "Laylo lead for 14+ days, never paid",
        "action": "Retarget with social proof and testimonials",
        "priority": "low",
        "value_per_client": 499,
    },
    {
        "name": "Booking Ghosts",
        "description": "Paid but haven't booked in 5+ days",
        "action": "Personal outreach — they already paid, just need a nudge",
        "priority": "high",
        "value_per_client": 0,  # Already paid
    },
    {
        "name": "Intake Dropoffs",
        "description": "Booked but no intake, call coming soon",
        "action": "Urgent reminder with Tally form link",
        "priority": "high",
        "value_per_client": 0,  # Already paid
    },
    {
        "name": "Comeback Kids",
        "description": "Call complete, good candidates for 3-Pack upsell",
        "action": "Send upsell follow-up with Sprint offer",
        "priority": "medium",
        "value_per_client": 1495,
    },
    {
        "name": "High-Value Prospects",
        "description": "Score >= 70 but haven't paid yet",
        "action": "Priority outreach — these are your hottest unpaid leads",
        "priority": "high",
        "value_per_client": 699,
    },
]


# ── Public Functions ──────────────────────────────────────────────


def build_all_segments(
    payments: list[dict],
    scores: list[dict] | None = None,
) -> list[Segment]:
    """Build all 6 segments from payment data and optional scores.

    Args:
        payments: Payment records from NotionService.
        scores: Optional scored client list from score_all_clients().

    Returns:
        List of Segment objects with matching clients.
    """
    score_map = {}
    if scores:
        for s in scores:
            email = (s.get("payment", {}).get("email") or "").lower()
            if email:
                score_map[email] = s.get("score", {}).get("total", 0)

    now = datetime.now()
    segments = []

    for seg_def in SEGMENT_DEFS:
        name = seg_def["name"]
        clients = _match_segment(name, payments, score_map, now)
        estimated_value = len(clients) * seg_def["value_per_client"]

        segments.append(Segment(
            name=name,
            description=seg_def["description"],
            clients=clients,
            action=seg_def["action"],
            priority=seg_def["priority"],
            estimated_value=estimated_value,
        ))

    return segments


def get_segment(
    name: str,
    payments: list[dict],
    scores: list[dict] | None = None,
) -> Segment | None:
    """Get a single segment by name."""
    all_segments = build_all_segments(payments, scores)
    for seg in all_segments:
        if seg.name == name:
            return seg
    return None


def segment_summary(segments: list[Segment]) -> dict:
    """Summary statistics across all segments.

    Returns:
        Dict with total_clients, total_value, by_priority, and segment_counts.
    """
    total_clients = sum(s.count for s in segments)
    total_value = sum(s.estimated_value for s in segments)
    by_priority = {"high": 0, "medium": 0, "low": 0}
    segment_counts = {}

    for s in segments:
        by_priority[s.priority] = by_priority.get(s.priority, 0) + s.count
        segment_counts[s.name] = s.count

    return {
        "total_clients": total_clients,
        "total_value": round(total_value, 2),
        "by_priority": by_priority,
        "segment_counts": segment_counts,
    }


# ── Segment Matching Logic ───────────────────────────────────────


def _match_segment(
    name: str,
    payments: list[dict],
    score_map: dict[str, float],
    now: datetime,
) -> list[dict]:
    """Match payments to a named segment."""
    matchers = {
        "Stale Leads": _match_stale_leads,
        "Window Shoppers": _match_window_shoppers,
        "Booking Ghosts": _match_booking_ghosts,
        "Intake Dropoffs": _match_intake_dropoffs,
        "Comeback Kids": _match_comeback_kids,
        "High-Value Prospects": _match_high_value_prospects,
    }

    matcher = matchers.get(name)
    if not matcher:
        return []

    if name == "High-Value Prospects":
        return matcher(payments, score_map, now)

    return matcher(payments, now)


def _match_stale_leads(payments: list[dict], now: datetime) -> list[dict]:
    """Lead - Laylo, 7+ days, no payment."""
    results = []
    for p in payments:
        if p.get("status") != "Lead - Laylo":
            continue
        if p.get("payment_amount", 0) > 0:
            continue
        days = _days_since_created(p, now)
        if days is not None and 7 <= days < 14:
            results.append(p)
    return results


def _match_window_shoppers(payments: list[dict], now: datetime) -> list[dict]:
    """Laylo lead 14+ days, never paid."""
    results = []
    for p in payments:
        if p.get("status") != "Lead - Laylo":
            continue
        if p.get("payment_amount", 0) > 0:
            continue
        days = _days_since_created(p, now)
        if days is not None and days >= 14:
            results.append(p)
    return results


def _match_booking_ghosts(payments: list[dict], now: datetime) -> list[dict]:
    """Paid but never booked, 5+ days."""
    results = []
    for p in payments:
        if p.get("status") != "Paid - Needs Booking":
            continue
        if p.get("payment_amount", 0) <= 0:
            continue
        days = _days_since_created(p, now)
        if days is not None and days >= 5:
            results.append(p)
    return results


def _match_intake_dropoffs(payments: list[dict], now: datetime) -> list[dict]:
    """Booked but no intake submitted."""
    results = []
    for p in payments:
        if p.get("status") != "Booked - Needs Intake":
            continue
        results.append(p)
    return results


def _match_comeback_kids(payments: list[dict], now: datetime) -> list[dict]:
    """Call Complete, single call product (not Sprint)."""
    results = []
    for p in payments:
        if p.get("status") != "Call Complete":
            continue
        product = p.get("product_purchased", "")
        if product in ("3-Pack Sprint", "3-Session Clarity Sprint"):
            continue  # Already on highest tier
        results.append(p)
    return results


def _match_high_value_prospects(
    payments: list[dict], score_map: dict[str, float], now: datetime
) -> list[dict]:
    """Score >= 70, hasn't paid."""
    results = []
    for p in payments:
        if p.get("payment_amount", 0) > 0:
            continue
        email = (p.get("email") or "").lower()
        score = score_map.get(email, 0)
        if score >= 70:
            results.append(p)
    return results


# ── Helpers ───────────────────────────────────────────────────────


def _days_since_created(payment: dict, now: datetime) -> float | None:
    """Calculate days since the payment record was created."""
    created = payment.get("created", "")
    if not created:
        return None
    try:
        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        if created_dt.tzinfo:
            now_aware = now.astimezone(created_dt.tzinfo)
        else:
            now_aware = now
        return (now_aware - created_dt).total_seconds() / 86400
    except (ValueError, TypeError):
        return None
