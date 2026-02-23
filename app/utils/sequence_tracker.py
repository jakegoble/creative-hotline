"""Email sequence position tracking.

Maps Notion checkbox fields to email sequence steps.
Tracks which sequence each client is in and their progress.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from app.config import PIPELINE_STATUSES


# Sequence definitions: maps status → sequence with checkbox steps
SEQUENCES = {
    "Laylo Nurture": {
        "trigger_status": "Lead - Laylo",
        "steps": [
            {"checkbox": "nurture_email_sent", "label": "Nurture Email"},
        ],
    },
    "Post-Payment": {
        "trigger_status": "Paid - Needs Booking",
        "steps": [
            {"checkbox": "booking_reminder_sent", "label": "Booking Reminder"},
        ],
    },
    "Pre-Call Prep": {
        "trigger_status": "Booked - Needs Intake",
        "steps": [
            {"checkbox": "intake_reminder_sent", "label": "Intake Reminder"},
        ],
    },
}

# Map statuses to the sequence they belong to
STATUS_TO_SEQUENCE = {
    seq["trigger_status"]: name for name, seq in SEQUENCES.items()
}

# Status progression for conversion tracking
STATUS_ORDER = {s: i for i, s in enumerate(PIPELINE_STATUSES)}


@dataclass
class SequencePosition:
    email: str
    client_name: str
    sequence_name: str
    current_step: int
    total_steps: int
    last_touchpoint: str
    completed: bool

    def as_dict(self) -> dict:
        return {
            "email": self.email,
            "client_name": self.client_name,
            "sequence_name": self.sequence_name,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "last_touchpoint": self.last_touchpoint,
            "completed": self.completed,
        }


def get_client_sequence(payment: dict) -> SequencePosition | None:
    """Determine which sequence a client is in based on status + checkboxes."""
    status = payment.get("status", "")
    email = payment.get("email", "")
    name = payment.get("client_name", "")

    if not status or not email:
        return None

    seq_name = STATUS_TO_SEQUENCE.get(status)
    if not seq_name:
        return None

    seq_def = SEQUENCES[seq_name]
    steps = seq_def["steps"]
    total = len(steps)

    # Figure out current step and completion
    current = 0
    last_touch = ""
    completed = True

    for i, step in enumerate(steps):
        checkbox = step["checkbox"]
        sent = payment.get(checkbox, False)
        if sent:
            current = i + 1
            last_touch = step["label"]
        else:
            completed = False

    return SequencePosition(
        email=email,
        client_name=name,
        sequence_name=seq_name,
        current_step=current,
        total_steps=total,
        last_touchpoint=last_touch,
        completed=completed,
    )


def build_sequence_map(
    payments: list[dict],
) -> dict[str, list[SequencePosition]]:
    """Group all clients by their current sequence."""
    result: dict[str, list[SequencePosition]] = defaultdict(list)

    for p in payments:
        pos = get_client_sequence(p)
        if pos:
            result[pos.sequence_name].append(pos)

    return dict(result)


def sequence_completion_rates(payments: list[dict]) -> dict[str, dict]:
    """Calculate completion rate per sequence."""
    seq_map = build_sequence_map(payments)
    result = {}

    for seq_name, positions in seq_map.items():
        total = len(positions)
        completed = sum(1 for p in positions if p.completed)
        result[seq_name] = {
            "entered": total,
            "completed": completed,
            "rate": (completed / total * 100) if total > 0 else 0,
        }

    return result


def sequence_conversion_rates(payments: list[dict]) -> dict[str, dict]:
    """Calculate what % of clients who completed a sequence advanced to next stage."""
    seq_map = build_sequence_map(payments)

    # Build email→status lookup from ALL payments
    email_status: dict[str, str] = {}
    for p in payments:
        email = (p.get("email") or "").lower()
        if email:
            status = p.get("status", "")
            # Keep the most advanced status
            if email not in email_status or STATUS_ORDER.get(status, 0) > STATUS_ORDER.get(email_status[email], 0):
                email_status[email] = status

    result = {}
    for seq_name, positions in seq_map.items():
        completed = [p for p in positions if p.completed]
        if not completed:
            result[seq_name] = {"completed": 0, "advanced": 0, "conversion_rate": 0}
            continue

        trigger_status = SEQUENCES[seq_name]["trigger_status"]
        trigger_order = STATUS_ORDER.get(trigger_status, 0)

        advanced = 0
        for pos in completed:
            current_status = email_status.get(pos.email.lower(), "")
            if STATUS_ORDER.get(current_status, 0) > trigger_order:
                advanced += 1

        result[seq_name] = {
            "completed": len(completed),
            "advanced": advanced,
            "conversion_rate": (advanced / len(completed) * 100) if completed else 0,
        }

    return result
