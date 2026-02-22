"""Notion API client for Payments DB and Intake DB.

Follows the established n8n pattern: fetch all records, filter/aggregate in Python.
Parses all Notion property types into clean Python dicts.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from notion_client import Client

from app.config import PIPELINE_STATUSES
from app.services.cache_manager import cache

logger = logging.getLogger(__name__)


class NotionService:
    def __init__(self, api_key: str, payments_db_id: str, intake_db_id: str):
        self._client = Client(auth=api_key)
        self._payments_db = payments_db_id
        self._intake_db = intake_db_id

    def is_healthy(self) -> bool:
        """Check if Notion API is reachable."""
        try:
            self._client.databases.retrieve(database_id=self._payments_db)
            return True
        except Exception:
            return False

    # ── Payments DB ──────────────────────────────────────────────

    def get_all_payments(self) -> list[dict]:
        """Fetch all records from Payments DB. Cached warm (5min)."""
        cached = cache.get("notion_payments")
        if cached is not None:
            return cached
        records = self._query_all(self._payments_db)
        parsed = [self._parse_payment(r) for r in records]
        cache.set("notion_payments", parsed, tier="warm")
        return parsed

    def get_payments_by_status(self, status: str) -> list[dict]:
        """Filter payments by pipeline status."""
        return [p for p in self.get_all_payments() if p["status"] == status]

    def get_pipeline_stats(self) -> dict[str, int]:
        """Count records per pipeline status."""
        payments = self.get_all_payments()
        counts = {s: 0 for s in PIPELINE_STATUSES}
        for p in payments:
            status = p.get("status", "")
            if status in counts:
                counts[status] += 1
        return counts

    def get_client_by_email(self, email: str) -> dict | None:
        """Find a payment record by email."""
        for p in self.get_all_payments():
            if p.get("email", "").lower() == email.lower():
                return p
        return None

    def update_page(self, page_id: str, properties: dict) -> None:
        """Update a Notion page's properties."""
        self._client.pages.update(page_id=page_id, properties=properties)
        cache.invalidate("notion_payments")
        cache.invalidate("notion_intakes")

    # ── Intake DB ────────────────────────────────────────────────

    def get_all_intakes(self) -> list[dict]:
        """Fetch all records from Intake DB. Cached warm (5min)."""
        cached = cache.get("notion_intakes")
        if cached is not None:
            return cached
        records = self._query_all(self._intake_db)
        parsed = [self._parse_intake(r) for r in records]
        cache.set("notion_intakes", parsed, tier="warm")
        return parsed

    # ── Merged Client View ───────────────────────────────────────

    def get_merged_clients(self) -> list[dict]:
        """Join Payments + Intake on email. Returns combined records."""
        payments = self.get_all_payments()
        intakes = self.get_all_intakes()
        intake_by_email = {}
        for i in intakes:
            email = (i.get("email") or "").lower()
            if email:
                intake_by_email[email] = i

        merged = []
        for p in payments:
            email = (p.get("email") or "").lower()
            intake = intake_by_email.get(email)
            merged.append({
                "payment": p,
                "intake": intake,
            })
        return merged

    # ── Internal Helpers ─────────────────────────────────────────

    def _query_all(self, database_id: str) -> list[dict]:
        """Paginate through all pages in a database."""
        results = []
        has_more = True
        start_cursor = None
        while has_more:
            kwargs: dict[str, Any] = {"database_id": database_id, "page_size": 100}
            if start_cursor:
                kwargs["start_cursor"] = start_cursor
            try:
                response = self._client.databases.query(**kwargs)
            except Exception as e:
                logger.error(f"Notion query failed for {database_id}: {e}")
                return results
            results.extend(response.get("results", []))
            has_more = response.get("has_more", False)
            start_cursor = response.get("next_cursor")
        return results

    def _parse_payment(self, page: dict) -> dict:
        """Parse a Payments DB page into a flat dict."""
        props = page.get("properties", {})
        return {
            "id": page["id"],
            "client_name": self._get_title(props.get("Client Name", {})),
            "email": self._get_email(props.get("Email", {})),
            "phone": self._get_phone(props.get("Phone", {})),
            "payment_amount": self._get_number(props.get("Payment Amount", {})),
            "product_purchased": self._get_select(props.get("Product Purchased", {})),
            "payment_date": self._get_date(props.get("Payment Date", {})),
            "status": self._get_select(props.get("Status", {})),
            "call_date": self._get_date(props.get("Call Date", {})),
            "calendly_link": self._get_url(props.get("Calendly Link", {})),
            "lead_source": self._get_select(props.get("Lead Source", {})),
            "stripe_session_id": self._get_rich_text(props.get("Stripe Session ID", {})),
            "linked_intake_id": self._get_relation_id(props.get("Linked Intake", {})),
            "booking_reminder_sent": self._get_checkbox(props.get("Booking Reminder Sent", {})),
            "intake_reminder_sent": self._get_checkbox(props.get("Intake Reminder Sent", {})),
            "nurture_email_sent": self._get_checkbox(props.get("Nurture Email Sent", {})),
            "created": self._get_created_time(page),
            "url": page.get("url", ""),
        }

    def _parse_intake(self, page: dict) -> dict:
        """Parse an Intake DB page into a flat dict."""
        props = page.get("properties", {})
        return {
            "id": page["id"],
            "client_name": self._get_title(props.get("Client Name", {})),
            "email": self._get_email(props.get("Email", {})),
            "role": self._get_rich_text(props.get("Role", {})),
            "brand": self._get_rich_text(props.get("Brand", {})),
            "website_ig": self._get_url(props.get("Website / IG", {})),
            "creative_emergency": self._get_rich_text(props.get("Creative Emergency", {})),
            "desired_outcome": self._get_multi_select(props.get("Desired Outcome", {})),
            "what_tried": self._get_rich_text(props.get("What They've Tried", {})),
            "deadline": self._get_rich_text(props.get("Deadline", {})),
            "constraints": self._get_rich_text(props.get("Constraints / Avoid", {})),
            "intake_status": self._get_select(props.get("Intake Status", {})),
            "ai_summary": self._get_rich_text(props.get("AI Intake Summary", {})),
            "action_plan_sent": self._get_checkbox(props.get("Action Plan Sent", {})),
            "call_date": self._get_date(props.get("Call Date", {})),
            "linked_payment_id": self._get_relation_id(props.get("Linked Payment", {})),
            "created": self._get_created_time(page),
            "url": page.get("url", ""),
        }

    # ── Property Type Extractors ─────────────────────────────────

    @staticmethod
    def _get_title(prop: dict) -> str:
        items = prop.get("title", [])
        return items[0]["plain_text"] if items else ""

    @staticmethod
    def _get_rich_text(prop: dict) -> str:
        items = prop.get("rich_text", [])
        return "".join(item.get("plain_text", "") for item in items)

    @staticmethod
    def _get_email(prop: dict) -> str:
        return prop.get("email") or ""

    @staticmethod
    def _get_phone(prop: dict) -> str:
        return prop.get("phone_number") or ""

    @staticmethod
    def _get_number(prop: dict) -> float:
        val = prop.get("number")
        return float(val) if val is not None else 0.0

    @staticmethod
    def _get_select(prop: dict) -> str:
        sel = prop.get("select")
        return sel["name"] if sel else ""

    @staticmethod
    def _get_multi_select(prop: dict) -> list[str]:
        items = prop.get("multi_select", [])
        return [item["name"] for item in items]

    @staticmethod
    def _get_checkbox(prop: dict) -> bool:
        return prop.get("checkbox", False)

    @staticmethod
    def _get_date(prop: dict) -> str:
        date_obj = prop.get("date")
        if date_obj and date_obj.get("start"):
            return date_obj["start"]
        return ""

    @staticmethod
    def _get_url(prop: dict) -> str:
        return prop.get("url") or ""

    @staticmethod
    def _get_relation_id(prop: dict) -> str:
        items = prop.get("relation", [])
        return items[0]["id"] if items else ""

    @staticmethod
    def _get_created_time(page: dict) -> str:
        return page.get("created_time", "")
