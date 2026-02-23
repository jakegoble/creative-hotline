"""Lead scoring algorithm — restructured to weight engagement over budget.

Scoring breakdown (100 points total):
  Engagement Depth:   30 pts — Intake completeness, response length, detail level
  Pipeline Velocity:  25 pts — Time from DM → payment → booking → intake
  Urgency Signals:    20 pts — Keywords in intake: deadline, launch, urgent, ASAP
  Lead Source Quality: 15 pts — Referral source, ManyChat keyword, direct vs funnel
  Upsell Potential:   10 pts — Multiple brands, ongoing needs, team size
"""

from __future__ import annotations

import re
from datetime import datetime


# Score tier thresholds
TIER_HOT = 80
TIER_WARM = 50
TIER_COOL = 25


def score_client(payment: dict, intake: dict | None) -> dict:
    """Score a single client and return breakdown.

    Returns dict with total, tier, and per-category scores.
    """
    engagement = _score_engagement(intake)
    velocity = _score_velocity(payment, intake)
    urgency = _score_urgency(intake)
    source = _score_source(payment)
    upsell = _score_upsell(intake, payment)

    base_total = (
        engagement["score"]
        + velocity["score"]
        + urgency["score"]
        + source["score"]
        + upsell["score"]
    )

    # Apply modifiers
    frequency = _frequency_bonus(payment)
    total = base_total + frequency["bonus"]

    negative = _apply_negative_signals(total, payment, intake)
    total = negative["adjusted_score"]

    recency = _apply_recency_decay(total, payment)
    total = recency["adjusted_score"]

    # Clamp to 0-100
    total = max(0, min(100, total))

    if total >= TIER_HOT:
        tier = "Hot"
    elif total >= TIER_WARM:
        tier = "Warm"
    elif total >= TIER_COOL:
        tier = "Cool"
    else:
        tier = "Cold"

    return {
        "total": total,
        "tier": tier,
        "engagement": engagement,
        "velocity": velocity,
        "urgency": urgency,
        "source": source,
        "upsell": upsell,
        "frequency": frequency,
        "recency": recency,
        "negative": negative,
    }


def score_all_clients(merged_clients: list[dict]) -> list[dict]:
    """Score all clients and return sorted by score descending.

    Each item gets a 'score' key added alongside 'payment' and 'intake'.
    """
    scored = []
    for client in merged_clients:
        payment = client["payment"]
        intake = client.get("intake")
        result = score_client(payment, intake)
        scored.append({
            "payment": payment,
            "intake": intake,
            "score": result,
        })
    scored.sort(key=lambda x: x["score"]["total"], reverse=True)
    return scored


def get_tier_color(tier: str) -> str:
    """Return hex color for a score tier."""
    return {
        "Hot": "#FF6B35",
        "Warm": "#FFA500",
        "Cool": "#4A90D9",
        "Cold": "#999999",
    }.get(tier, "#999999")


# ── Category Scorers ──────────────────────────────────────────────


def _score_engagement(intake: dict | None) -> dict:
    """Engagement Depth — 0 to 30 points.

    Measures intake completeness and response quality.
    """
    if not intake:
        return {"score": 0, "max": 30, "reason": "No intake submitted"}

    points = 0
    reasons = []

    # Field completeness (up to 12 pts — 2 per field)
    fields = [
        "role", "brand", "creative_emergency",
        "what_tried", "deadline", "constraints",
    ]
    filled = sum(1 for f in fields if intake.get(f))
    field_pts = min(filled * 2, 12)
    points += field_pts
    reasons.append(f"{filled}/6 fields filled")

    # Desired outcome selections (up to 5 pts)
    outcomes = intake.get("desired_outcome", [])
    outcome_pts = min(len(outcomes) * 2, 5)
    points += outcome_pts

    # Response depth — creative emergency length (up to 8 pts)
    emergency = intake.get("creative_emergency", "")
    word_count = len(emergency.split()) if emergency else 0
    if word_count >= 50:
        depth_pts = 8
    elif word_count >= 30:
        depth_pts = 6
    elif word_count >= 15:
        depth_pts = 4
    elif word_count > 0:
        depth_pts = 2
    else:
        depth_pts = 0
    points += depth_pts
    reasons.append(f"{word_count} words in emergency")

    # What they've tried depth (up to 5 pts)
    tried = intake.get("what_tried", "")
    tried_words = len(tried.split()) if tried else 0
    if tried_words >= 30:
        tried_pts = 5
    elif tried_words >= 15:
        tried_pts = 3
    elif tried_words > 0:
        tried_pts = 1
    else:
        tried_pts = 0
    points += tried_pts

    return {"score": min(points, 30), "max": 30, "reason": "; ".join(reasons)}


def _score_velocity(payment: dict, intake: dict | None) -> dict:
    """Pipeline Velocity — 0 to 25 points.

    Measures how quickly they moved through the pipeline.
    """
    created = payment.get("created", "")
    payment_date = payment.get("payment_date", "")
    call_date = payment.get("call_date", "")
    intake_created = intake.get("created", "") if intake else ""

    if not created:
        return {"score": 0, "max": 25, "reason": "No creation date"}

    points = 0
    reasons = []

    try:
        created_dt = _parse_date(created)
    except ValueError:
        return {"score": 0, "max": 25, "reason": "Invalid creation date"}

    # Time to payment (up to 10 pts)
    if payment_date:
        try:
            payment_dt = _parse_date(payment_date)
            hours = (payment_dt - created_dt).total_seconds() / 3600
            if hours < 24:
                points += 10
                reasons.append(f"Paid in {hours:.0f}h")
            elif hours < 48:
                points += 7
            elif hours < 168:  # 1 week
                points += 4
            else:
                points += 1
        except ValueError:
            pass

    # Time to booking (up to 8 pts)
    if call_date and payment_date:
        try:
            call_dt = _parse_date(call_date)
            payment_dt = _parse_date(payment_date)
            days = (call_dt - payment_dt).days
            if days <= 3:
                points += 8
                reasons.append(f"Booked {days}d after payment")
            elif days <= 7:
                points += 5
            elif days <= 14:
                points += 3
            else:
                points += 1
        except ValueError:
            pass

    # Time to intake (up to 7 pts)
    if intake_created and call_date:
        try:
            intake_dt = _parse_date(intake_created)
            call_dt = _parse_date(call_date)
            hours_before = (call_dt - intake_dt).total_seconds() / 3600
            if hours_before > 24:
                points += 7
                reasons.append("Intake >24h before call")
            elif hours_before > 0:
                points += 4
            else:
                points += 1
        except ValueError:
            pass

    return {"score": min(points, 25), "max": 25, "reason": "; ".join(reasons) or "Calculating..."}


def _score_urgency(intake: dict | None) -> dict:
    """Urgency Signals — 0 to 20 points.

    Detects time pressure from intake language and deadline field.
    """
    if not intake:
        return {"score": 0, "max": 20, "reason": "No intake data"}

    points = 0
    reasons = []

    # Deadline urgency (up to 12 pts)
    deadline = intake.get("deadline", "")
    if deadline:
        deadline_lower = deadline.lower()
        urgent_keywords = ["asap", "urgent", "immediately", "this week", "tomorrow"]
        soon_keywords = ["next week", "2 weeks", "two weeks", "end of month"]
        timeline_keywords = ["month", "quarter", "weeks"]

        if any(kw in deadline_lower for kw in urgent_keywords):
            points += 12
            reasons.append("Urgent deadline")
        elif any(kw in deadline_lower for kw in soon_keywords):
            points += 8
            reasons.append("Near-term deadline")
        elif any(kw in deadline_lower for kw in timeline_keywords):
            points += 5
            reasons.append("Has timeline")
        else:
            points += 3
            reasons.append("Deadline mentioned")

    # Urgency language in creative emergency (up to 8 pts)
    emergency = (intake.get("creative_emergency", "") or "").lower()
    urgency_phrases = [
        "launch", "deadline", "urgent", "asap", "running out of time",
        "need help now", "stuck", "behind schedule", "can't wait",
        "time sensitive", "crunch", "last minute",
    ]
    matches = [p for p in urgency_phrases if p in emergency]
    if len(matches) >= 3:
        points += 8
        reasons.append(f"{len(matches)} urgency signals")
    elif len(matches) >= 2:
        points += 5
    elif matches:
        points += 3

    return {"score": min(points, 20), "max": 20, "reason": "; ".join(reasons) or "No urgency detected"}


def _score_source(payment: dict) -> dict:
    """Lead Source Quality — 0 to 15 points.

    Referrals and returning clients score highest.
    """
    source = payment.get("lead_source", "")
    status = payment.get("status", "")

    # Check if returning client (has prior purchases — approximated by Sprint purchase)
    product = payment.get("product_purchased", "")
    is_returning = product in ("3-Pack Sprint", "3-Session Clarity Sprint")

    if is_returning:
        return {"score": 15, "max": 15, "reason": "Returning/high-tier client"}

    source_scores = {
        "Referral": 14,
        "Direct": 12,
        "Website": 10,
        "IG DM": 9,
        "IG Story": 8,
        "IG Comment": 7,
        "LinkedIn": 8,
        "Meta Ad": 5,
    }

    score = source_scores.get(source, 3)
    reason = f"Source: {source}" if source else "Unknown source"

    return {"score": min(score, 15), "max": 15, "reason": reason}


def _score_upsell(intake: dict | None, payment: dict) -> dict:
    """Upsell Potential — 0 to 10 points.

    Detects signals of multi-project or ongoing needs.
    """
    points = 0
    reasons = []

    # Current product tier (higher tier = less upsell potential but still valuable)
    product = payment.get("product_purchased", "")
    amount = payment.get("payment_amount", 0)

    if product == "First Call" or (amount > 0 and amount < 600):
        points += 3
        reasons.append("Entry-tier purchase")

    # Intake signals for ongoing work
    if intake:
        emergency = (intake.get("creative_emergency", "") or "").lower()
        tried = (intake.get("what_tried", "") or "").lower()
        all_text = emergency + " " + tried

        multi_signals = [
            "multiple", "several projects", "ongoing", "long-term",
            "team", "rebrand", "full brand", "website and",
            "social media and", "everything",
        ]
        matches = [s for s in multi_signals if s in all_text]
        if len(matches) >= 2:
            points += 5
            reasons.append("Multi-project signals")
        elif matches:
            points += 3

        # Multiple desired outcomes suggests broader needs
        outcomes = intake.get("desired_outcome", [])
        if len(outcomes) >= 3:
            points += 2
            reasons.append(f"{len(outcomes)} desired outcomes")

    return {"score": min(points, 10), "max": 10, "reason": "; ".join(reasons) or "Low upsell signal"}


# ── Score Modifiers ────────────────────────────────────────────────


def _frequency_bonus(payment: dict) -> dict:
    """Frequency bonus — up to 5 points for repeat/high-tier purchases."""
    product = payment.get("product_purchased", "")
    amount = payment.get("payment_amount", 0)

    if product in ("3-Pack Sprint", "3-Session Clarity Sprint") or amount >= 1495:
        return {"bonus": 5, "reason": "Sprint/repeat purchaser"}
    if product == "Standard Call" or (amount >= 699 and amount < 1495):
        return {"bonus": 2, "reason": "Standard tier client"}
    return {"bonus": 0, "reason": ""}


def _apply_recency_decay(score: float, payment: dict) -> dict:
    """Recency decay — multiplier based on how recently the lead was active.

    <7 days: 1.0x, 7-14 days: 0.95x, 14-30 days: 0.85x, >30 days: 0.7x.
    """
    created = payment.get("created", "")
    if not created:
        return {"adjusted_score": score, "multiplier": 1.0, "reason": "No date"}

    try:
        created_dt = _parse_date(created)
        now = datetime.now()
        days = (now - created_dt).total_seconds() / 86400

        if days < 7:
            mult = 1.0
            reason = f"Active ({days:.0f}d ago)"
        elif days < 14:
            mult = 0.95
            reason = f"Recent ({days:.0f}d ago)"
        elif days < 30:
            mult = 0.85
            reason = f"Aging ({days:.0f}d ago)"
        else:
            mult = 0.7
            reason = f"Stale ({days:.0f}d ago)"

        return {
            "adjusted_score": round(score * mult),
            "multiplier": mult,
            "reason": reason,
        }
    except (ValueError, TypeError):
        return {"adjusted_score": score, "multiplier": 1.0, "reason": "Parse error"}


def _apply_negative_signals(score: float, payment: dict, intake: dict | None) -> dict:
    """Detect red flags that cap the score at 40.

    Triggers: stale >30 days with no pipeline progress, or lead with
    zero engagement (no intake, no booking, no payment) after 14 days.
    """
    created = payment.get("created", "")
    status = payment.get("status", "")
    amount = payment.get("payment_amount", 0)

    if not created:
        return {"adjusted_score": score, "capped": False, "reason": ""}

    try:
        created_dt = _parse_date(created)
        now = datetime.now()
        days = (now - created_dt).total_seconds() / 86400
    except (ValueError, TypeError):
        return {"adjusted_score": score, "capped": False, "reason": ""}

    # Stale lead with zero progress
    if (
        status == "Lead - Laylo"
        and amount == 0
        and not intake
        and days > 30
    ):
        return {
            "adjusted_score": min(score, 40),
            "capped": True,
            "reason": "Stale 30d+ with no progress",
        }

    # Paid but completely stalled (no booking after 14 days)
    if status == "Paid - Needs Booking" and days > 14:
        return {
            "adjusted_score": min(score, 40),
            "capped": True,
            "reason": "Paid but stalled 14d+",
        }

    return {"adjusted_score": score, "capped": False, "reason": ""}


# ── Helpers ────────────────────────────────────────────────────────


def _parse_date(date_str: str) -> datetime:
    """Parse ISO date string (handles both date-only and datetime formats)."""
    date_str = date_str.strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str[:len(fmt) + 5], fmt)
        except ValueError:
            continue
    # Final fallback: just parse the date portion
    return datetime.strptime(date_str[:10], "%Y-%m-%d")
