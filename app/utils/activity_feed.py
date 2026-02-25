"""Activity feed — generates chronological event stream from all data sources.

Pulls recent events from payments, intakes, Stripe sessions, and Calendly
bookings into a unified timeline of activity items.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class ActivityEvent:
    """A single event in the activity feed."""
    timestamp: str
    event_type: str  # payment, booking, intake, call, followup, lead
    title: str
    subtitle: str
    client_name: str
    email: str
    icon: str
    color: str


# ── Event type config ─────────────────────────────────────────────

EVENT_CONFIG = {
    "payment": {"icon": "💳", "color": "#22C55E", "label": "Payment"},
    "booking": {"icon": "📅", "color": "#3B82F6", "label": "Booking"},
    "intake": {"icon": "📋", "color": "#8B5CF6", "label": "Intake"},
    "call": {"icon": "📞", "color": "#FF6B35", "label": "Call"},
    "followup": {"icon": "📨", "color": "#F59E0B", "label": "Follow-up"},
    "lead": {"icon": "✨", "color": "#EC4899", "label": "New Lead"},
}


def build_activity_feed(
    payments: list[dict],
    intakes: list[dict] | None = None,
    limit: int = 15,
) -> list[ActivityEvent]:
    """Build a chronological activity feed from payment + intake records.

    Returns events sorted newest-first, capped at limit.
    """
    events: list[ActivityEvent] = []
    intake_map = {}
    if intakes:
        intake_map = {i["email"].lower(): i for i in intakes}

    for p in payments:
        name = p.get("client_name") or p.get("email", "Unknown")
        email = p.get("email", "")
        status = p.get("status", "")
        created = p.get("created", "")

        # Lead captured
        if created:
            source = p.get("lead_source") or "Direct"
            events.append(ActivityEvent(
                timestamp=created,
                event_type="lead",
                title=f"{name} entered the pipeline",
                subtitle=f"Source: {source}",
                client_name=name,
                email=email,
                icon=EVENT_CONFIG["lead"]["icon"],
                color=EVENT_CONFIG["lead"]["color"],
            ))

        # Payment received
        if p.get("payment_amount", 0) > 0 and p.get("payment_date"):
            product = p.get("product_purchased") or "Unknown"
            amount = p["payment_amount"]
            events.append(ActivityEvent(
                timestamp=_date_to_iso(p["payment_date"]),
                event_type="payment",
                title=f"{name} purchased {product}",
                subtitle=f"${amount:,.0f}",
                client_name=name,
                email=email,
                icon=EVENT_CONFIG["payment"]["icon"],
                color=EVENT_CONFIG["payment"]["color"],
            ))

        # Call booked
        if p.get("call_date") and status not in ("Lead - Laylo", "Paid - Needs Booking"):
            events.append(ActivityEvent(
                timestamp=_date_to_iso(p["call_date"]),
                event_type="booking",
                title=f"{name} booked a call",
                subtitle=f"Scheduled for {p['call_date'][:10]}",
                client_name=name,
                email=email,
                icon=EVENT_CONFIG["booking"]["icon"],
                color=EVENT_CONFIG["booking"]["color"],
            ))

        # Intake submitted
        intake = intake_map.get(email.lower())
        if intake and intake.get("created"):
            emergency = intake.get("creative_emergency", "")
            sub = emergency[:80] + "..." if len(emergency) > 80 else emergency
            events.append(ActivityEvent(
                timestamp=intake["created"],
                event_type="intake",
                title=f"{name} submitted intake form",
                subtitle=sub or "Form completed",
                client_name=name,
                email=email,
                icon=EVENT_CONFIG["intake"]["icon"],
                color=EVENT_CONFIG["intake"]["color"],
            ))

        # Call completed
        if status in ("Call Complete", "Follow-Up Sent") and p.get("call_date"):
            events.append(ActivityEvent(
                timestamp=_date_to_iso(p["call_date"]),
                event_type="call",
                title=f"Call with {name} completed",
                subtitle=p.get("product_purchased") or "",
                client_name=name,
                email=email,
                icon=EVENT_CONFIG["call"]["icon"],
                color=EVENT_CONFIG["call"]["color"],
            ))

        # Follow-up sent
        if status == "Follow-Up Sent":
            events.append(ActivityEvent(
                timestamp=_date_to_iso(p.get("call_date", "")),
                event_type="followup",
                title=f"Action plan sent to {name}",
                subtitle="Post-call follow-up delivered",
                client_name=name,
                email=email,
                icon=EVENT_CONFIG["followup"]["icon"],
                color=EVENT_CONFIG["followup"]["color"],
            ))

    # Sort newest first
    events.sort(key=lambda e: _parse_ts(e.timestamp), reverse=True)
    return events[:limit]


def _date_to_iso(date_str: str) -> str:
    """Convert YYYY-MM-DD to ISO timestamp, pass through if already ISO."""
    if not date_str:
        return ""
    if "T" in date_str:
        return date_str
    return date_str + "T12:00:00Z"


def _parse_ts(ts: str) -> datetime:
    """Parse an ISO-ish timestamp for sorting."""
    if not ts:
        return datetime.min
    clean = ts.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(clean)
    except (ValueError, TypeError):
        return datetime.min


def format_activity_time(ts: str) -> str:
    """Format timestamp as relative time (e.g. '2h ago', '3d ago')."""
    parsed = _parse_ts(ts)
    if parsed == datetime.min:
        return ""
    now = datetime.now(parsed.tzinfo) if parsed.tzinfo else datetime.now()
    delta = now - parsed
    seconds = delta.total_seconds()

    if seconds < 0:
        # Future event
        abs_seconds = abs(seconds)
        if abs_seconds < 3600:
            return f"in {abs_seconds / 60:.0f}m"
        if abs_seconds < 86400:
            return f"in {abs_seconds / 3600:.0f}h"
        return f"in {abs_seconds / 86400:.0f}d"

    if seconds < 60:
        return "just now"
    if seconds < 3600:
        return f"{seconds / 60:.0f}m ago"
    if seconds < 86400:
        return f"{seconds / 3600:.0f}h ago"
    if seconds < 604800:
        return f"{seconds / 86400:.0f}d ago"
    return f"{seconds / 604800:.0f}w ago"
