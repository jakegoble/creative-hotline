"""Client listing and lead scoring endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.utils.demo_data import DEMO_PAYMENTS
from app.utils.lead_scorer import score_all_clients

router = APIRouter()


def _to_client(p: dict) -> dict:
    return {
        "id": p.get("stripe_session_id", p.get("email", "")),
        "name": p.get("client_name", "Unknown"),
        "email": p.get("email", ""),
        "phone": p.get("phone", ""),
        "status": p.get("status", ""),
        "product": p.get("product_purchased", ""),
        "amount": p.get("payment_amount", 0),
        "payment_date": p.get("payment_date", ""),
        "call_date": p.get("call_date", ""),
        "lead_source": p.get("lead_source", ""),
        "days_to_convert": p.get("days_to_convert"),
        "created": p.get("created", ""),
    }


@router.get("/clients")
def get_clients():
    return [_to_client(p) for p in DEMO_PAYMENTS]


@router.get("/clients/scored")
def get_scored_clients():
    merged = [{"payment": p} for p in DEMO_PAYMENTS]
    scored = score_all_clients(merged)
    results = []
    for item in scored:
        client = _to_client(item.get("payment", {}))
        score = item.get("score", {})
        tier = score.get("tier", "Cold")
        client.update({
            "score": score.get("total", 0),
            "tier": tier,
            "engagement": score.get("engagement", 0),
            "recency": score.get("recency", 0),
            "value": score.get("value", 0),
            "fit": score.get("fit", 0),
        })
        results.append(client)
    return results
