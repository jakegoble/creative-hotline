"""Referral tracking and attribution.

Tracks referral source performance, identifies top referrers,
and calculates referral revenue share.
"""

from __future__ import annotations

from collections import defaultdict


def identify_referral_clients(payments: list[dict]) -> list[dict]:
    """Filter payments where lead_source is Referral."""
    return [p for p in payments if (p.get("lead_source") or "").lower() == "referral"]


def referral_conversion_rate(payments: list[dict]) -> dict:
    """Compare Referral leads vs other sources on conversion and deal size."""
    referral_leads = 0
    referral_paid = 0
    referral_revenue = 0.0
    other_leads = 0
    other_paid = 0
    other_revenue = 0.0

    for p in payments:
        source = (p.get("lead_source") or "").lower()
        amount = p.get("payment_amount", 0) or 0
        is_paid = amount > 0

        if source == "referral":
            referral_leads += 1
            if is_paid:
                referral_paid += 1
                referral_revenue += amount
        else:
            other_leads += 1
            if is_paid:
                other_paid += 1
                other_revenue += amount

    return {
        "referral_leads": referral_leads,
        "referral_paid": referral_paid,
        "referral_conversion": (referral_paid / referral_leads * 100) if referral_leads > 0 else 0,
        "referral_avg_deal": (referral_revenue / referral_paid) if referral_paid > 0 else 0,
        "referral_revenue": referral_revenue,
        "other_leads": other_leads,
        "other_paid": other_paid,
        "other_conversion": (other_paid / other_leads * 100) if other_leads > 0 else 0,
        "other_avg_deal": (other_revenue / other_paid) if other_paid > 0 else 0,
        "other_revenue": other_revenue,
    }


def top_referrers(
    payments: list[dict], referral_map: dict[str, str] | None = None
) -> list[dict]:
    """Identify top referrers.

    If referral_map is provided (referred_email → referrer_email),
    returns per-referrer breakdown. Otherwise returns aggregate stats.
    """
    referral_clients = identify_referral_clients(payments)

    if not referral_map:
        # Aggregate-only mode
        total_revenue = sum(p.get("payment_amount", 0) or 0 for p in referral_clients)
        return [{
            "referrer": "(aggregate)",
            "referrals": len(referral_clients),
            "revenue_generated": total_revenue,
        }] if referral_clients else []

    # Per-referrer mode
    referrer_stats: dict[str, dict] = defaultdict(lambda: {"referrals": 0, "revenue": 0.0, "clients": []})

    for p in referral_clients:
        email = (p.get("email") or "").lower()
        referrer = referral_map.get(email)
        if referrer:
            referrer = referrer.lower()
            referrer_stats[referrer]["referrals"] += 1
            referrer_stats[referrer]["revenue"] += p.get("payment_amount", 0) or 0
            referrer_stats[referrer]["clients"].append(p.get("client_name", email))

    result = [
        {
            "referrer": email,
            "referrals": stats["referrals"],
            "revenue_generated": stats["revenue"],
            "clients": stats["clients"],
        }
        for email, stats in referrer_stats.items()
    ]
    result.sort(key=lambda x: x["revenue_generated"], reverse=True)
    return result


def referral_revenue_share(payments: list[dict]) -> dict:
    """Calculate what % of total revenue comes from referrals."""
    total = 0.0
    referral = 0.0

    for p in payments:
        amount = p.get("payment_amount", 0) or 0
        if amount <= 0:
            continue
        total += amount
        if (p.get("lead_source") or "").lower() == "referral":
            referral += amount

    return {
        "referral_revenue": referral,
        "total_revenue": total,
        "referral_pct": (referral / total * 100) if total > 0 else 0,
    }
