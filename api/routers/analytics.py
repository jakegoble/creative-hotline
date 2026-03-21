"""Analytics endpoints — channels, funnel, LTV, revenue."""

from __future__ import annotations

from fastapi import APIRouter

from app.utils.demo_data import DEMO_PAYMENTS
from app.utils.attribution import attribute_conversions
from app.utils.ltv_calculator import calculate_ltv

router = APIRouter()


@router.get("/channels")
def get_channels():
    merged = [{"payment": p} for p in DEMO_PAYMENTS]
    metrics = attribute_conversions(merged)
    return [
        {
            "channel": m.channel,
            "leads": m.total_leads,
            "conversions": m.conversions,
            "revenue": m.revenue,
            "conversion_rate": m.conversion_rate,
            "avg_deal_size": m.avg_deal_size,
        }
        for m in metrics
    ]


@router.get("/revenue/monthly")
def get_monthly_revenue():
    # Aggregate from demo payments by month
    monthly: dict[str, float] = {}
    for p in DEMO_PAYMENTS:
        date = p.get("payment_date", "")
        if date:
            month = date[:7]  # "2026-02"
            monthly[month] = monthly.get(month, 0) + p.get("payment_amount", 0)
    return [
        {"month": m, "revenue": r}
        for m, r in sorted(monthly.items())
    ]


@router.get("/funnel")
def get_funnel():
    stages = [
        ("Leads", len(DEMO_PAYMENTS)),
        ("Paid", sum(1 for p in DEMO_PAYMENTS if p.get("payment_amount", 0) > 0)),
        ("Booked", sum(1 for p in DEMO_PAYMENTS if p.get("call_date"))),
        ("Intake Done", sum(1 for p in DEMO_PAYMENTS if p.get("status") in ("Intake Complete", "Ready for Call", "Call Complete", "Follow-Up Sent"))),
        ("Call Complete", sum(1 for p in DEMO_PAYMENTS if p.get("status") in ("Call Complete", "Follow-Up Sent"))),
        ("Follow-Up Sent", sum(1 for p in DEMO_PAYMENTS if p.get("status") == "Follow-Up Sent")),
    ]
    result = []
    for i, (name, count) in enumerate(stages):
        prev = stages[i - 1][1] if i > 0 else count
        rate = count / prev if prev > 0 else 0
        result.append({"stage": name, "count": count, "conversion_rate": round(rate, 3)})
    return result


@router.get("/ltv")
def get_ltv():
    paid = [p for p in DEMO_PAYMENTS if p.get("payment_amount", 0) > 0]
    ltv_result = calculate_ltv(paid)
    return {
        "overall_ltv": ltv_result.overall_ltv,
        "by_source": ltv_result.by_source,
        "by_product": ltv_result.by_product,
        "projected_12mo": ltv_result.projected_12mo if hasattr(ltv_result, "projected_12mo") else 0,
    }
