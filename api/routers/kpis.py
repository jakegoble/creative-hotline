"""KPI summary endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.utils.demo_data import DEMO_PAYMENTS

router = APIRouter()


@router.get("/kpis")
def get_kpis():
    paid = [p for p in DEMO_PAYMENTS if p.get("payment_amount", 0) > 0]
    total_revenue = sum(p.get("payment_amount", 0) for p in paid)
    active_statuses = {
        "Paid - Needs Booking",
        "Booked - Needs Intake",
        "Intake Complete",
        "Ready for Call",
    }
    active = sum(1 for p in DEMO_PAYMENTS if p.get("status") in active_statuses)

    return {
        "total_revenue": total_revenue,
        "total_clients": len(DEMO_PAYMENTS),
        "active_pipeline": active,
        "booking_rate": 0.92,
        "avg_deal_size": round(total_revenue / len(paid), 2) if paid else 0,
        "monthly_revenue": 4886,
        "revenue_trend": 0.15,
        "conversion_rate": round(len(paid) / len(DEMO_PAYMENTS), 3) if DEMO_PAYMENTS else 0,
    }
