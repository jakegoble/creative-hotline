"""Pipeline stages endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.utils.demo_data import DEMO_PAYMENTS

router = APIRouter()

PIPELINE_ORDER = [
    "Lead - Laylo",
    "Paid - Needs Booking",
    "Booked - Needs Intake",
    "Intake Complete",
    "Ready for Call",
    "Call Complete",
    "Follow-Up Sent",
]


@router.get("/pipeline")
def get_pipeline():
    result = []
    for stage in PIPELINE_ORDER:
        clients = [p for p in DEMO_PAYMENTS if p.get("status") == stage]
        result.append({
            "stage": stage,
            "count": len(clients),
            "value": sum(p.get("payment_amount", 0) for p in clients),
            "clients": [
                {
                    "id": p.get("stripe_session_id", p.get("email", "")),
                    "name": p.get("client_name", "Unknown"),
                    "email": p.get("email", ""),
                    "status": stage,
                    "product": p.get("product_purchased", ""),
                    "amount": p.get("payment_amount", 0),
                    "lead_source": p.get("lead_source", ""),
                    "created": p.get("created", ""),
                }
                for p in clients
            ],
        })
    return result
