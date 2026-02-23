"""Revenue scenario modeling and goal tracking.

Calculates paths to $800K with product mix scenarios, monthly targets,
channel investment requirements, and current pace analysis.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from app.config import PRODUCT_TYPES


# Products that involve scheduled calls (affects capacity calculation)
CALL_PRODUCTS = {"First Call", "Standard Call", "3-Session Clarity Sprint", "3-Pack Sprint"}
CALLS_PER_PRODUCT = {
    "First Call": 1,
    "Standard Call": 1,
    "3-Session Clarity Sprint": 3,
    "3-Pack Sprint": 3,
}

# Default team capacity
DEFAULT_MAX_CALLS_PER_WEEK = 20


@dataclass
class Scenario:
    name: str
    products: dict[str, dict] = field(default_factory=dict)
    monthly_revenue: float = 0.0
    annual_revenue: float = 0.0
    clients_per_month: int = 0
    calls_per_week: float = 0.0
    gap_to_goal: float = 0.0
    feasible: bool = True

    def as_dict(self) -> dict:
        return {
            "name": self.name,
            "products": self.products,
            "monthly_revenue": self.monthly_revenue,
            "annual_revenue": self.annual_revenue,
            "clients_per_month": self.clients_per_month,
            "calls_per_week": self.calls_per_week,
            "gap_to_goal": self.gap_to_goal,
            "feasible": self.feasible,
        }


@dataclass
class MonthlyTarget:
    month: str
    target_revenue: float
    actual_revenue: float
    cumulative_target: float
    cumulative_actual: float
    on_track: bool

    def as_dict(self) -> dict:
        return {
            "month": self.month,
            "target_revenue": self.target_revenue,
            "actual_revenue": self.actual_revenue,
            "cumulative_target": self.cumulative_target,
            "cumulative_actual": self.cumulative_actual,
            "on_track": self.on_track,
        }


def build_scenario(
    name: str,
    product_mix: dict[str, dict],
    annual_goal: float = 800_000,
    max_calls_per_week: int = DEFAULT_MAX_CALLS_PER_WEEK,
) -> Scenario:
    """Build a revenue scenario from a product mix.

    Args:
        name: Scenario label (e.g., "Current Mix", "With Retainer")
        product_mix: {product_name: {"price": int, "monthly_volume": int}}
        annual_goal: Revenue target (default $800K)
        max_calls_per_week: Team call capacity
    """
    monthly_rev = 0.0
    total_clients = 0
    monthly_calls = 0.0

    for product, info in product_mix.items():
        price = info.get("price", 0)
        volume = info.get("monthly_volume", 0)
        monthly_rev += price * volume
        total_clients += volume
        calls = CALLS_PER_PRODUCT.get(product, 0) * volume
        monthly_calls += calls

    annual_rev = monthly_rev * 12
    calls_per_week = monthly_calls / 4.33  # avg weeks per month

    return Scenario(
        name=name,
        products=product_mix,
        monthly_revenue=monthly_rev,
        annual_revenue=annual_rev,
        clients_per_month=total_clients,
        calls_per_week=round(calls_per_week, 1),
        gap_to_goal=annual_goal - annual_rev,
        feasible=calls_per_week <= max_calls_per_week,
    )


def compare_scenarios(scenarios: list[Scenario]) -> dict:
    """Compare up to 3 scenarios side by side."""
    if not scenarios:
        return {"scenarios": [], "best": None}

    best = max(scenarios, key=lambda s: s.annual_revenue if s.feasible else 0)
    return {
        "scenarios": [s.as_dict() for s in scenarios],
        "best": best.name if best.feasible else None,
        "revenue_range": {
            "min": min(s.annual_revenue for s in scenarios),
            "max": max(s.annual_revenue for s in scenarios),
        },
        "all_feasible": all(s.feasible for s in scenarios),
    }


def product_ladder(
    payments: list[dict], proposed_products: dict[str, int] | None = None
) -> list[dict]:
    """Build the value ladder showing volume + conversion at each tier."""
    # Count current volume per product
    product_counts: dict[str, dict] = {}
    product_revenue: dict[str, float] = {}

    for p in payments:
        product = p.get("product_purchased")
        amount = p.get("payment_amount", 0) or 0
        if not product or amount <= 0:
            continue
        if product not in product_counts:
            product_counts[product] = {"count": 0, "emails": set()}
        product_counts[product]["count"] += 1
        product_counts[product]["emails"].add((p.get("email") or "").lower())
        product_revenue[product] = product_revenue.get(product, 0) + amount

    # Build ladder from existing products
    all_products = dict(PRODUCT_TYPES)
    if proposed_products:
        all_products.update(proposed_products)

    # Sort by price ascending
    sorted_products = sorted(all_products.items(), key=lambda x: x[1])

    total_revenue = sum(product_revenue.values()) or 1  # avoid division by zero
    ladder = []

    for i, (product, price) in enumerate(sorted_products):
        info = product_counts.get(product, {"count": 0, "emails": set()})
        revenue = product_revenue.get(product, 0)

        # Conversion to next tier: how many clients at this tier also bought next tier?
        next_tier_conversion = 0.0
        if i < len(sorted_products) - 1:
            next_product = sorted_products[i + 1][0]
            next_info = product_counts.get(next_product, {"count": 0, "emails": set()})
            overlap = info["emails"] & next_info.get("emails", set())
            if info["count"] > 0:
                next_tier_conversion = len(overlap) / info["count"] * 100

        ladder.append({
            "product": product,
            "price": price,
            "current_volume": info["count"],
            "revenue": revenue,
            "pct_of_total": (revenue / total_revenue * 100) if total_revenue else 0,
            "next_tier_conversion": round(next_tier_conversion, 1),
            "proposed": product not in PRODUCT_TYPES,
        })

    return ladder


def monthly_targets(
    annual_goal: float,
    start_month: str,
    monthly_revenue_data: list[dict],
    growth_rate: float = 0.0,
) -> list[MonthlyTarget]:
    """Break annual goal into 12 monthly milestones.

    Args:
        annual_goal: Revenue target
        start_month: "YYYY-MM" format
        monthly_revenue_data: [{"month": "YYYY-MM", "revenue": float}]
        growth_rate: Monthly growth rate (0.05 = 5% month-over-month)
    """
    # Build actual revenue lookup
    actual_lookup = {d["month"]: d["revenue"] for d in monthly_revenue_data}

    # Parse start month
    try:
        start = datetime.strptime(start_month, "%Y-%m")
    except (ValueError, TypeError):
        start = datetime.now().replace(day=1)

    # Calculate monthly targets
    if growth_rate > 0:
        # Ramp: first month gets base, each subsequent month grows
        # Solve: base * sum(1 + g)^i for i=0..11 = annual_goal
        geo_sum = sum((1 + growth_rate) ** i for i in range(12))
        base = annual_goal / geo_sum
        targets = [base * (1 + growth_rate) ** i for i in range(12)]
    else:
        even = annual_goal / 12
        targets = [even] * 12

    results = []
    cum_target = 0.0
    cum_actual = 0.0

    for i in range(12):
        month_num = (start.month - 1 + i) % 12 + 1
        year = start.year + (start.month - 1 + i) // 12
        month_str = f"{year}-{month_num:02d}"

        target = targets[i]
        actual = actual_lookup.get(month_str, 0)
        cum_target += target
        cum_actual += actual

        results.append(MonthlyTarget(
            month=month_str,
            target_revenue=round(target, 2),
            actual_revenue=actual,
            cumulative_target=round(cum_target, 2),
            cumulative_actual=cum_actual,
            on_track=cum_actual >= cum_target * 0.9,  # within 10% of target
        ))

    return results


def channel_investment_plan(
    annual_goal: float, channel_metrics: list[dict]
) -> list[dict]:
    """Calculate leads needed per channel to hit revenue target.

    Args:
        annual_goal: Revenue target
        channel_metrics: From attribution.channel_roi() — each has
            channel, leads, conversions, revenue, conversion_rate, avg_deal_size
    """
    if not channel_metrics:
        return []

    # Distribute goal proportionally to current revenue share
    total_current = sum(c.get("revenue", 0) for c in channel_metrics) or 1
    result = []

    for ch in channel_metrics:
        revenue = ch.get("revenue", 0)
        conv_rate = ch.get("conversion_rate", 0) / 100 if ch.get("conversion_rate") else 0
        avg_deal = ch.get("avg_deal_size", 0)
        current_leads = ch.get("leads", 0)

        # Allocate goal proportionally
        share = revenue / total_current if total_current > 0 else 0
        channel_target = annual_goal * share

        # How many leads needed?
        if conv_rate > 0 and avg_deal > 0:
            leads_needed = channel_target / (conv_rate * avg_deal)
        else:
            leads_needed = 0

        result.append({
            "channel": ch["channel"],
            "current_leads": current_leads,
            "current_revenue": revenue,
            "target_revenue": round(channel_target),
            "leads_needed": round(leads_needed),
            "lead_gap": max(0, round(leads_needed - current_leads)),
            "conversion_rate": ch.get("conversion_rate", 0),
            "avg_deal_size": avg_deal,
        })

    result.sort(key=lambda x: x["target_revenue"], reverse=True)
    return result


def current_pace(monthly_revenue_data: list[dict]) -> dict:
    """Calculate current revenue run rate from recent data."""
    if not monthly_revenue_data:
        return {
            "monthly_avg": 0,
            "annual_pace": 0,
            "months_of_data": 0,
        }

    # Use most recent 3 months (or whatever is available)
    sorted_data = sorted(monthly_revenue_data, key=lambda d: d["month"], reverse=True)
    recent = sorted_data[:3]
    revenues = [d["revenue"] for d in recent]

    avg = sum(revenues) / len(revenues) if revenues else 0

    return {
        "monthly_avg": round(avg, 2),
        "annual_pace": round(avg * 12, 2),
        "months_of_data": len(monthly_revenue_data),
    }
