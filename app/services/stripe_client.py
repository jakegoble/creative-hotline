"""Stripe API client — source of truth for revenue.

Payment happens at Calendly booking via Stripe integration.
Products: First Call ($499), Standard Call ($699), Sprint ($1,495).
"""

import logging
from datetime import datetime, timedelta
from typing import Any

import stripe as stripe_sdk

from app.config import PRODUCT_TYPES
from app.services.cache_manager import cache

logger = logging.getLogger(__name__)


class StripeService:
    def __init__(self, secret_key: str):
        self._key = secret_key
        stripe_sdk.api_key = secret_key

    def is_healthy(self) -> bool:
        """Check if Stripe API is reachable."""
        try:
            stripe_sdk.Balance.retrieve()
            return True
        except Exception:
            return False

    def get_recent_sessions(self, days: int = 90) -> list[dict]:
        """Fetch completed checkout sessions. Cached hot (60s)."""
        cache_key = f"stripe_sessions_{days}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        created_after = int((datetime.now() - timedelta(days=days)).timestamp())
        sessions = []
        try:
            has_more = True
            starting_after = None
            while has_more:
                params: dict[str, Any] = {
                    "status": "complete",
                    "limit": 100,
                }
                if created_after:
                    params["created"] = {"gte": created_after}
                if starting_after:
                    params["starting_after"] = starting_after

                response = stripe_sdk.checkout.Session.list(**params)
                for s in response.data:
                    sessions.append(self._parse_session(s))
                has_more = response.has_more
                if response.data:
                    starting_after = response.data[-1].id
        except Exception as e:
            logger.error(f"Stripe sessions query failed: {e}")
            return sessions

        cache.set(cache_key, sessions, tier="hot")
        return sessions

    def get_session_by_id(self, session_id: str) -> dict | None:
        """Fetch a single checkout session."""
        try:
            s = stripe_sdk.checkout.Session.retrieve(session_id)
            return self._parse_session(s)
        except Exception as e:
            logger.error(f"Stripe session retrieve failed: {e}")
            return None

    def get_revenue_summary(self, days: int = 30) -> dict:
        """Calculate revenue metrics for the given period."""
        sessions = self.get_recent_sessions(days=days)
        if not sessions:
            return {
                "total_revenue": 0,
                "session_count": 0,
                "avg_deal_size": 0,
                "by_product": {},
            }

        total = sum(s["amount"] for s in sessions)
        by_product: dict[str, dict] = {}
        for s in sessions:
            product = s["product_name"] or "Unknown"
            if product not in by_product:
                by_product[product] = {"count": 0, "revenue": 0}
            by_product[product]["count"] += 1
            by_product[product]["revenue"] += s["amount"]

        return {
            "total_revenue": total,
            "session_count": len(sessions),
            "avg_deal_size": total / len(sessions) if sessions else 0,
            "by_product": by_product,
        }

    def get_monthly_revenue(self, months: int = 6) -> list[dict]:
        """Get revenue grouped by month."""
        sessions = self.get_recent_sessions(days=months * 31)
        monthly: dict[str, float] = {}
        for s in sessions:
            if s.get("created"):
                month_key = s["created"][:7]  # "2026-02"
                monthly[month_key] = monthly.get(month_key, 0) + s["amount"]

        result = []
        for month_key in sorted(monthly.keys()):
            result.append({"month": month_key, "revenue": monthly[month_key]})
        return result

    def get_refunds(self, days: int = 30) -> list[dict]:
        """Fetch recent refunds."""
        cache_key = f"stripe_refunds_{days}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        created_after = int((datetime.now() - timedelta(days=days)).timestamp())
        refunds = []
        try:
            response = stripe_sdk.Refund.list(
                limit=100,
                created={"gte": created_after},
            )
            for r in response.data:
                refunds.append({
                    "id": r.id,
                    "amount": r.amount / 100,
                    "status": r.status,
                    "created": datetime.fromtimestamp(r.created).isoformat(),
                })
        except Exception as e:
            logger.error(f"Stripe refunds query failed: {e}")

        cache.set(cache_key, refunds, tier="warm")
        return refunds

    def _parse_session(self, session: Any) -> dict:
        """Parse a Stripe checkout session into a flat dict."""
        amount_cents = session.amount_total or 0
        amount = amount_cents / 100

        # Map amount to product name
        product_name = self._amount_to_product(amount)

        # Check metadata for explicit product_type
        metadata = session.metadata or {}
        if metadata.get("product_type"):
            product_name = metadata["product_type"]

        return {
            "id": session.id,
            "email": session.customer_details.email if session.customer_details else "",
            "name": session.customer_details.name if session.customer_details else "",
            "amount": amount,
            "product_name": product_name,
            "status": session.status,
            "payment_status": session.payment_status,
            "created": datetime.fromtimestamp(session.created).isoformat() if session.created else "",
            "metadata": dict(metadata),
        }

    @staticmethod
    def _amount_to_product(amount: float) -> str:
        """Map payment amount to product name (fallback when metadata missing)."""
        for product, price in PRODUCT_TYPES.items():
            if abs(amount - price) < 1:
                return product
        return "Unknown"
