"""Client lifetime value and cohort economics calculator.

Groups payments by email to calculate per-client revenue to date,
then slices by source, entry product, and signup cohort. Includes
projected LTV using observed upsell rates.

Note: With small client counts (<20), these metrics are directional
rather than statistically significant. Cohort analysis requires
MIN_COHORT_SIZE clients per bucket to be meaningful.
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime

# Minimum clients in a cohort before stats are meaningful
MIN_COHORT_SIZE = 5


@dataclass
class ClientLTV:
    email: str
    total_revenue: float
    purchase_count: int
    first_purchase_date: str
    last_purchase_date: str
    products: list[str] = field(default_factory=list)
    days_as_client: float = 0.0
    projected_ltv: float = 0.0

    def as_dict(self) -> dict:
        return {
            "email": self.email,
            "total_revenue": self.total_revenue,
            "purchase_count": self.purchase_count,
            "first_purchase_date": self.first_purchase_date,
            "last_purchase_date": self.last_purchase_date,
            "products": self.products,
            "days_as_client": self.days_as_client,
            "projected_ltv": self.projected_ltv,
        }


@dataclass
class CohortLTV:
    cohort_month: str
    client_count: int
    total_revenue: float
    avg_ltv: float
    upsell_count: int
    median_ltv: float = 0.0
    sample_sufficient: bool = False

    def as_dict(self) -> dict:
        return {
            "cohort_month": self.cohort_month,
            "client_count": self.client_count,
            "total_revenue": self.total_revenue,
            "avg_ltv": self.avg_ltv,
            "median_ltv": self.median_ltv,
            "upsell_count": self.upsell_count,
            "sample_sufficient": self.sample_sufficient,
        }


def _parse_date(date_str: str | None) -> datetime | None:
    """Parse ISO date string to datetime."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except (ValueError, TypeError):
            continue
    return None


def _group_by_email(payments: list[dict]) -> dict[str, list[dict]]:
    """Group payments by lowercase email, filtering out unpaid and no-email."""
    groups: dict[str, list[dict]] = defaultdict(list)
    for p in payments:
        email = (p.get("email") or "").strip().lower()
        if not email:
            continue
        amount = p.get("payment_amount", 0) or 0
        if amount <= 0:
            continue
        groups[email].append(p)
    return dict(groups)


def calculate_ltv(payments: list[dict]) -> list[ClientLTV]:
    """Calculate per-client revenue to date and projected LTV.

    projected_ltv = total_revenue * (1 + upsell_probability) where
    upsell_probability comes from the observed upsell rate across
    all clients. For single-purchase clients, this adds the expected
    value of a future purchase.
    """
    groups = _group_by_email(payments)
    now = datetime.now()

    # Compute observed upsell rate for projection
    total_clients = len(groups)
    multi_purchase = sum(1 for recs in groups.values() if len(recs) > 1)
    upsell_prob = multi_purchase / total_clients if total_clients > 0 else 0.0

    results = []

    for email, records in groups.items():
        total = sum(r.get("payment_amount", 0) or 0 for r in records)
        products = [r.get("product_purchased", "Unknown") for r in records if r.get("product_purchased")]

        dates = []
        for r in records:
            d = _parse_date(r.get("payment_date") or r.get("created"))
            if d:
                dates.append(d)
        dates.sort()

        first = dates[0].strftime("%Y-%m-%d") if dates else ""
        last = dates[-1].strftime("%Y-%m-%d") if dates else ""
        days = (now - dates[0]).days if dates else 0.0

        # Projected LTV: current revenue + expected future value
        projected = total * (1 + upsell_prob) if len(records) == 1 else total

        results.append(ClientLTV(
            email=email,
            total_revenue=total,
            purchase_count=len(records),
            first_purchase_date=first,
            last_purchase_date=last,
            products=products,
            days_as_client=days,
            projected_ltv=round(projected, 2),
        ))

    results.sort(key=lambda c: c.total_revenue, reverse=True)
    return results


def ltv_by_source(payments: list[dict]) -> dict[str, dict]:
    """Average and median LTV per lead source."""
    groups = _group_by_email(payments)
    source_ltvs: dict[str, list[float]] = defaultdict(list)

    for email, records in groups.items():
        total = sum(r.get("payment_amount", 0) or 0 for r in records)
        source = records[0].get("lead_source") or "Unknown"
        source_ltvs[source].append(total)

    result = {}
    for source, ltvs in source_ltvs.items():
        result[source] = {
            "avg_ltv": sum(ltvs) / len(ltvs),
            "median_ltv": statistics.median(ltvs) if ltvs else 0,
            "client_count": len(ltvs),
            "total_revenue": sum(ltvs),
            "sample_sufficient": len(ltvs) >= MIN_COHORT_SIZE,
        }
    return result


def ltv_by_entry_product(payments: list[dict]) -> dict[str, dict]:
    """Average LTV grouped by first product purchased."""
    groups = _group_by_email(payments)
    product_ltvs: dict[str, list[dict]] = defaultdict(list)

    for email, records in groups.items():
        # Sort by date to find first purchase
        sorted_recs = sorted(records, key=lambda r: r.get("payment_date") or r.get("created") or "")
        entry_product = sorted_recs[0].get("product_purchased") or "Unknown"
        total = sum(r.get("payment_amount", 0) or 0 for r in records)
        upsold = len(records) > 1
        product_ltvs[entry_product].append({"ltv": total, "upsold": upsold})

    result = {}
    for product, clients in product_ltvs.items():
        ltvs = [c["ltv"] for c in clients]
        upsold_count = sum(1 for c in clients if c["upsold"])
        result[product] = {
            "avg_ltv": sum(ltvs) / len(ltvs),
            "count": len(ltvs),
            "total_revenue": sum(ltvs),
            "upsell_rate": (upsold_count / len(ltvs) * 100) if ltvs else 0,
        }
    return result


def ltv_by_cohort(
    payments: list[dict], period: str = "monthly"
) -> list[CohortLTV]:
    """LTV by signup cohort.

    Args:
        payments: Payment records.
        period: "monthly" (default) or "quarterly" grouping.

    Cohorts with fewer than MIN_COHORT_SIZE clients are still returned
    but flagged with sample_sufficient=False to indicate the stats
    are directional only.
    """
    groups = _group_by_email(payments)
    cohort_data: dict[str, list[dict]] = defaultdict(list)

    for email, records in groups.items():
        total = sum(r.get("payment_amount", 0) or 0 for r in records)
        sorted_recs = sorted(records, key=lambda r: r.get("payment_date") or r.get("created") or "")
        first_date = _parse_date(sorted_recs[0].get("payment_date") or sorted_recs[0].get("created"))
        if not first_date:
            continue

        if period == "quarterly":
            quarter = (first_date.month - 1) // 3 + 1
            key = f"{first_date.year}-Q{quarter}"
        else:
            key = first_date.strftime("%Y-%m")

        upsold = len(records) > 1
        cohort_data[key].append({"ltv": total, "upsold": upsold})

    results = []
    for key in sorted(cohort_data.keys()):
        clients = cohort_data[key]
        ltvs = [c["ltv"] for c in clients]
        sufficient = len(clients) >= MIN_COHORT_SIZE
        results.append(CohortLTV(
            cohort_month=key,
            client_count=len(clients),
            total_revenue=sum(ltvs),
            avg_ltv=sum(ltvs) / len(ltvs),
            median_ltv=statistics.median(ltvs) if ltvs else 0,
            upsell_count=sum(1 for c in clients if c["upsold"]),
            sample_sufficient=sufficient,
        ))
    return results


def upsell_rate(payments: list[dict]) -> dict:
    """Calculate upsell/repeat purchase rate."""
    groups = _group_by_email(payments)
    if not groups:
        return {"total_clients": 0, "upsell_clients": 0, "upsell_rate": 0.0, "upgrade_paths": {}}

    total = len(groups)
    upsold = 0
    paths: dict[str, int] = defaultdict(int)

    for email, records in groups.items():
        if len(records) > 1:
            upsold += 1
            sorted_recs = sorted(records, key=lambda r: r.get("payment_date") or r.get("created") or "")
            products = [r.get("product_purchased") or "Unknown" for r in sorted_recs]
            for i in range(len(products) - 1):
                path = f"{products[i]} -> {products[i + 1]}"
                paths[path] += 1

    return {
        "total_clients": total,
        "upsell_clients": upsold,
        "upsell_rate": (upsold / total * 100) if total > 0 else 0.0,
        "upgrade_paths": dict(paths),
    }


def expansion_revenue(payments: list[dict]) -> dict:
    """Split revenue into new client vs expansion (repeat/upsell)."""
    groups = _group_by_email(payments)
    new_rev = 0.0
    exp_rev = 0.0

    for email, records in groups.items():
        sorted_recs = sorted(records, key=lambda r: r.get("payment_date") or r.get("created") or "")
        for i, r in enumerate(sorted_recs):
            amount = r.get("payment_amount", 0) or 0
            if i == 0:
                new_rev += amount
            else:
                exp_rev += amount

    total = new_rev + exp_rev
    return {
        "new_revenue": new_rev,
        "expansion_revenue": exp_rev,
        "total_revenue": total,
        "expansion_pct": (exp_rev / total * 100) if total > 0 else 0.0,
    }


def payback_period(
    payments: list[dict], channel_costs: dict[str, float] | None = None
) -> dict[str, dict]:
    """Payback analysis per channel.

    For high-ticket consultancies, revenue arrives in lump-sum payments
    (not monthly subscriptions). "Immediate payback" means the first
    purchase covers the CAC. "Full LTV payback" considers all future
    purchases.
    """
    if not channel_costs:
        return {}

    source_data = ltv_by_source(payments)

    # Compute average first-purchase value per source
    groups = _group_by_email(payments)
    source_first_vals: dict[str, list[float]] = defaultdict(list)
    for email, records in groups.items():
        source = records[0].get("lead_source") or "Unknown"
        sorted_recs = sorted(records, key=lambda r: r.get("payment_date") or r.get("created") or "")
        first_val = sorted_recs[0].get("payment_amount", 0) or 0
        source_first_vals[source].append(first_val)

    result = {}
    for channel, cost in channel_costs.items():
        if cost <= 0:
            continue
        channel_info = source_data.get(channel, {})
        avg_ltv = channel_info.get("avg_ltv", 0)
        client_count = channel_info.get("client_count", 0)
        cac = cost / client_count if client_count > 0 else cost

        # First-purchase payback: does the first sale cover CAC?
        first_vals = source_first_vals.get(channel, [])
        avg_first_purchase = sum(first_vals) / len(first_vals) if first_vals else 0
        immediate_payback = avg_first_purchase >= cac

        # For lump-sum businesses, payback is either immediate (first sale)
        # or requires multiple purchases
        if avg_first_purchase >= cac:
            payback_months = 0  # Immediate — first purchase covers CAC
        elif avg_ltv > 0:
            # Estimated months until cumulative revenue covers CAC
            # based on purchase frequency
            payback_months = cac / (avg_ltv / 12) if avg_ltv > 0 else None
        else:
            payback_months = None

        result[channel] = {
            "cac": round(cac, 2),
            "avg_ltv": avg_ltv,
            "avg_first_purchase": round(avg_first_purchase, 2),
            "client_count": client_count,
            "immediate_payback": immediate_payback,
            "payback_months": round(payback_months, 1) if payback_months is not None else None,
        }

    return result
