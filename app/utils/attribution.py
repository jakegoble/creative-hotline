"""Multi-touch attribution engine for lead source analysis.

Supports 4 models: First Touch, Last Touch, Linear, Time Decay.
All models use the lead_source field from Payments DB records.

For a single-channel consultancy pipeline (one lead source per client),
first_touch, last_touch, and linear all give 100% credit to the source
channel — because pipeline stages (paid, booked, intake) are NOT
independent marketing touchpoints.

Time decay weights by recency of the payment event.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime


ATTRIBUTION_MODELS = ["first_touch", "last_touch", "linear", "time_decay"]

# Half-life for time decay model (days)
TIME_DECAY_HALF_LIFE = 7.0

# Minimum leads per channel before conversion_rate is considered reliable
MIN_SAMPLE_SIZE = 10


@dataclass
class ChannelMetrics:
    channel: str = ""
    lead_count: int = 0
    paid_count: int = 0
    revenue: float = 0.0
    avg_deal_size: float = 0.0
    conversion_rate: float = 0.0
    sample_sufficient: bool = False

    def as_dict(self) -> dict:
        return {
            "channel": self.channel,
            "lead_count": self.lead_count,
            "paid_count": self.paid_count,
            "revenue": round(self.revenue, 2),
            "avg_deal_size": round(self.avg_deal_size, 2),
            "conversion_rate": round(self.conversion_rate, 1),
            "sample_sufficient": self.sample_sufficient,
        }


def attribute_conversions(
    payments: list[dict], model: str = "linear"
) -> dict[str, ChannelMetrics]:
    """Attribute conversions across channels using the specified model.

    Args:
        payments: List of payment dicts from NotionService.get_all_payments()
        model: One of 'first_touch', 'last_touch', 'linear', 'time_decay'

    Returns:
        Dict mapping channel name to ChannelMetrics.
    """
    if model not in ATTRIBUTION_MODELS:
        model = "linear"

    channels: dict[str, ChannelMetrics] = {}

    for payment in payments:
        source = payment.get("lead_source") or "Unknown"
        amount = payment.get("payment_amount", 0)
        has_paid = amount > 0

        if source not in channels:
            channels[source] = ChannelMetrics(channel=source)

        channels[source].lead_count += 1

        if has_paid:
            credit = _compute_credit(payment, model)
            channels[source].paid_count += 1
            channels[source].revenue += amount * credit

    # Compute derived metrics
    for ch in channels.values():
        if ch.paid_count > 0:
            ch.avg_deal_size = ch.revenue / ch.paid_count
        if ch.lead_count > 0:
            ch.conversion_rate = (ch.paid_count / ch.lead_count) * 100
        ch.sample_sufficient = ch.lead_count >= MIN_SAMPLE_SIZE

    return channels


def compare_models(payments: list[dict]) -> dict[str, dict[str, ChannelMetrics]]:
    """Run all 4 attribution models and return comparison.

    Returns:
        Dict mapping model name to its channel metrics dict.
    """
    return {
        model: attribute_conversions(payments, model=model)
        for model in ATTRIBUTION_MODELS
    }


def channel_roi(
    payments: list[dict],
    channel_costs: dict[str, float] | None = None,
) -> list[dict]:
    """Calculate ROI per channel.

    Args:
        payments: Payment records.
        channel_costs: Optional dict of channel -> spend amount.

    Returns:
        List of dicts with channel, revenue, cost, roi, leads, conversions.
    """
    costs = channel_costs or {}
    metrics = attribute_conversions(payments, model="linear")

    results = []
    for channel, m in sorted(metrics.items(), key=lambda x: x[1].revenue, reverse=True):
        cost = costs.get(channel, 0)
        roi = ((m.revenue - cost) / cost * 100) if cost > 0 else None
        results.append({
            "channel": channel,
            "leads": m.lead_count,
            "conversions": m.paid_count,
            "revenue": round(m.revenue, 2),
            "cost": cost,
            "roi": round(roi, 1) if roi is not None else None,
            "conversion_rate": round(m.conversion_rate, 1),
            "avg_deal_size": round(m.avg_deal_size, 2),
            "sample_sufficient": m.sample_sufficient,
        })

    return results


def get_revenue_by_source_over_time(payments: list[dict]) -> dict[str, dict[str, float]]:
    """Group revenue by source and month.

    Returns:
        Dict of {month: {source: revenue}}, e.g. {"2026-02": {"IG DM": 499.0}}.
    """
    result: dict[str, dict[str, float]] = {}

    for p in payments:
        amount = p.get("payment_amount", 0)
        if amount <= 0:
            continue
        source = p.get("lead_source") or "Unknown"
        created = p.get("created", "") or p.get("payment_date", "")
        if not created:
            continue
        month = created[:7]
        if month not in result:
            result[month] = {}
        result[month][source] = result[month].get(source, 0) + amount

    return dict(sorted(result.items()))


# ── Credit Computation ────────────────────────────────────────────


def _compute_credit(payment: dict, model: str) -> float:
    """Compute the credit multiplier for a single payment.

    In a single-channel consultancy pipeline, each client has ONE lead source.
    Pipeline stages (paid, booked, intake, call) are conversion events within
    that single channel — NOT independent marketing touchpoints. Therefore
    first_touch, last_touch, and linear all give 100% credit to the source.

    Time decay weights by recency of the payment event, useful for comparing
    recent vs older channel performance.
    """
    if model in ("first_touch", "last_touch", "linear"):
        return 1.0

    if model == "time_decay":
        return _time_decay_weight(payment)

    return 1.0


def _time_decay_weight(payment: dict) -> float:
    """Compute time decay weight based on recency of the payment.

    More recent payments get higher weight. Uses exponential decay
    with a configurable half-life.
    """
    created = payment.get("created", "")
    if not created:
        return 1.0

    try:
        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        now = datetime.now(created_dt.tzinfo) if created_dt.tzinfo else datetime.now()
        days_ago = (now - created_dt).total_seconds() / 86400

        # Exponential decay: weight = 2^(-days/half_life)
        weight = math.pow(2, -days_ago / TIME_DECAY_HALF_LIFE)
        return max(weight, 0.1)  # Floor at 10% credit
    except (ValueError, TypeError):
        return 1.0
