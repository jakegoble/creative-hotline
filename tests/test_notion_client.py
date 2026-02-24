"""Unit tests for NotionService — all API calls mocked."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.services.notion_client import NotionService


# ── Fixtures ─────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def clear_cache():
    """Ensure cache doesn't interfere between tests."""
    from app.services.cache_manager import cache
    cache.invalidate_all()
    yield
    cache.invalidate_all()


@pytest.fixture
def mock_notion_client():
    """Patch the Notion Client constructor to return a mock."""
    with patch("app.services.notion_client.Client") as MockClient:
        mock_instance = MagicMock()
        MockClient.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def svc(mock_notion_client):
    """A NotionService with a mocked Notion client."""
    return NotionService(
        api_key="test-key",
        payments_db_id="pay-db-id",
        intake_db_id="int-db-id",
    )


def _make_page(
    page_id: str = "page-1",
    title: str = "Sarah Chen",
    email: str = "sarah@example.com",
    phone: str = "+1-555-1234",
    payment_amount: float = 699,
    product_purchased: str = "Single Call",
    payment_date: str = "2026-02-18",
    status: str = "Intake Complete",
    call_date: str = "2026-02-20",
    calendly_link: str = "https://calendly.com/test",
    lead_source: str = "Referral",
    stripe_session_id: str = "cs_test_abc",
    linked_intake_id: str = "intake-1",
    booking_reminder_sent: bool = True,
    intake_reminder_sent: bool = True,
    nurture_email_sent: bool = False,
    created_time: str = "2026-02-17T10:00:00.000Z",
) -> dict:
    """Build a fake Notion page matching the Payments DB schema."""
    return {
        "id": page_id,
        "created_time": created_time,
        "url": f"https://notion.so/{page_id}",
        "properties": {
            "Client Name": {"title": [{"plain_text": title}] if title else {"title": []}},
            "Email": {"email": email if email else None},
            "Phone": {"phone_number": phone if phone else None},
            "Payment Amount": {"number": payment_amount if payment_amount else None},
            "Product Purchased": {"select": {"name": product_purchased} if product_purchased else None},
            "Payment Date": {"date": {"start": payment_date} if payment_date else None},
            "Status": {"select": {"name": status} if status else None},
            "Call Date": {"date": {"start": call_date} if call_date else None},
            "Calendly Link": {"url": calendly_link if calendly_link else None},
            "Lead Source": {"select": {"name": lead_source} if lead_source else None},
            "Stripe Session ID": {"rich_text": [{"plain_text": stripe_session_id}] if stripe_session_id else {"rich_text": []}},
            "Linked Intake": {"relation": [{"id": linked_intake_id}] if linked_intake_id else {"relation": []}},
            "Booking Reminder Sent": {"checkbox": booking_reminder_sent},
            "Intake Reminder Sent": {"checkbox": intake_reminder_sent},
            "Nurture Email Sent": {"checkbox": nurture_email_sent},
        },
    }


def _make_intake_page(
    page_id: str = "intake-1",
    title: str = "Sarah Chen",
    email: str = "sarah@example.com",
    role: str = "Creative Director",
    brand: str = "Studio Lumen",
    website_ig: str = "https://studiolumen.co",
    creative_emergency: str = "Rebranding in 2 weeks",
    desired_outcome: list[str] | None = None,
    what_tried: str = "Hired freelancer, no luck",
    deadline: str = "2 weeks",
    constraints: str = "Budget locked",
    intake_status: str = "Complete",
    ai_summary: str = "Strong candidate for Sprint.",
    action_plan_sent: bool = False,
    call_date: str = "2026-02-20",
    linked_payment_id: str = "page-1",
    created_time: str = "2026-02-19T08:00:00.000Z",
) -> dict:
    """Build a fake Notion page matching the Intake DB schema."""
    if desired_outcome is None:
        desired_outcome = ["A clear decision", "Direction I can trust"]
    return {
        "id": page_id,
        "created_time": created_time,
        "url": f"https://notion.so/{page_id}",
        "properties": {
            "Client Name": {"title": [{"plain_text": title}] if title else {"title": []}},
            "Email": {"email": email if email else None},
            "Role": {"rich_text": [{"plain_text": role}] if role else {"rich_text": []}},
            "Brand": {"rich_text": [{"plain_text": brand}] if brand else {"rich_text": []}},
            "Website / IG": {"url": website_ig if website_ig else None},
            "Creative Emergency": {"rich_text": [{"plain_text": creative_emergency}] if creative_emergency else {"rich_text": []}},
            "Desired Outcome": {"multi_select": [{"name": o} for o in desired_outcome]},
            "What They've Tried": {"rich_text": [{"plain_text": what_tried}] if what_tried else {"rich_text": []}},
            "Deadline": {"rich_text": [{"plain_text": deadline}] if deadline else {"rich_text": []}},
            "Constraints / Avoid": {"rich_text": [{"plain_text": constraints}] if constraints else {"rich_text": []}},
            "Intake Status": {"select": {"name": intake_status} if intake_status else None},
            "AI Intake Summary": {"rich_text": [{"plain_text": ai_summary}] if ai_summary else {"rich_text": []}},
            "Action Plan Sent": {"checkbox": action_plan_sent},
            "Call Date": {"date": {"start": call_date} if call_date else None},
            "Linked Payment": {"relation": [{"id": linked_payment_id}] if linked_payment_id else {"relation": []}},
        },
    }


def _mock_query_response(pages: list[dict], has_more: bool = False) -> dict:
    """Build a Notion API query response."""
    return {
        "results": pages,
        "has_more": has_more,
        "next_cursor": "cursor-123" if has_more else None,
    }


# ── is_healthy ───────────────────────────────────────────────────────


def test_is_healthy_success(svc, mock_notion_client):
    mock_notion_client.databases.retrieve.return_value = {"id": "pay-db-id"}
    assert svc.is_healthy() is True


def test_is_healthy_failure(svc, mock_notion_client):
    mock_notion_client.databases.retrieve.side_effect = Exception("Unauthorized")
    assert svc.is_healthy() is False


# ── get_all_payments ─────────────────────────────────────────────────


def test_get_all_payments_basic(svc, mock_notion_client):
    mock_notion_client.databases.query.return_value = _mock_query_response([_make_page()])
    payments = svc.get_all_payments()

    assert len(payments) == 1
    p = payments[0]
    assert p["client_name"] == "Sarah Chen"
    assert p["email"] == "sarah@example.com"
    assert p["payment_amount"] == 699
    assert p["product_purchased"] == "Single Call"
    assert p["status"] == "Intake Complete"
    assert p["lead_source"] == "Referral"
    assert p["booking_reminder_sent"] is True
    assert p["nurture_email_sent"] is False


def test_get_all_payments_pagination(svc, mock_notion_client):
    """Test that _query_all handles pagination."""
    page1 = _make_page(page_id="p1", email="a@test.com")
    page2 = _make_page(page_id="p2", email="b@test.com")
    mock_notion_client.databases.query.side_effect = [
        _mock_query_response([page1], has_more=True),
        _mock_query_response([page2], has_more=False),
    ]
    payments = svc.get_all_payments()
    assert len(payments) == 2
    assert payments[0]["email"] == "a@test.com"
    assert payments[1]["email"] == "b@test.com"


def test_get_all_payments_cached(svc, mock_notion_client):
    """Second call should return cached data without hitting API."""
    mock_notion_client.databases.query.return_value = _mock_query_response([_make_page()])
    svc.get_all_payments()
    svc.get_all_payments()
    assert mock_notion_client.databases.query.call_count == 1


def test_get_all_payments_api_error(svc, mock_notion_client):
    """API errors should return empty list, not crash."""
    mock_notion_client.databases.query.side_effect = Exception("Network error")
    payments = svc.get_all_payments()
    assert payments == []


def test_get_all_payments_empty(svc, mock_notion_client):
    mock_notion_client.databases.query.return_value = _mock_query_response([])
    assert svc.get_all_payments() == []


# ── get_payments_by_status ───────────────────────────────────────────


def test_get_payments_by_status(svc, mock_notion_client):
    pages = [
        _make_page(page_id="p1", status="Lead - Laylo"),
        _make_page(page_id="p2", status="Intake Complete"),
        _make_page(page_id="p3", status="Lead - Laylo"),
    ]
    mock_notion_client.databases.query.return_value = _mock_query_response(pages)
    leads = svc.get_payments_by_status("Lead - Laylo")
    assert len(leads) == 2


def test_get_payments_by_status_none_found(svc, mock_notion_client):
    mock_notion_client.databases.query.return_value = _mock_query_response([
        _make_page(status="Call Complete"),
    ])
    assert svc.get_payments_by_status("Lead - Laylo") == []


# ── get_pipeline_stats ───────────────────────────────────────────────


def test_get_pipeline_stats(svc, mock_notion_client):
    pages = [
        _make_page(page_id="p1", status="Lead - Laylo"),
        _make_page(page_id="p2", status="Lead - Laylo"),
        _make_page(page_id="p3", status="Intake Complete"),
        _make_page(page_id="p4", status="Call Complete"),
    ]
    mock_notion_client.databases.query.return_value = _mock_query_response(pages)
    stats = svc.get_pipeline_stats()
    assert stats["Lead - Laylo"] == 2
    assert stats["Intake Complete"] == 1
    assert stats["Call Complete"] == 1
    assert stats["Paid - Needs Booking"] == 0


def test_get_pipeline_stats_empty(svc, mock_notion_client):
    mock_notion_client.databases.query.return_value = _mock_query_response([])
    stats = svc.get_pipeline_stats()
    assert all(v == 0 for v in stats.values())


# ── get_client_by_email ──────────────────────────────────────────────


def test_get_client_by_email_found(svc, mock_notion_client):
    mock_notion_client.databases.query.return_value = _mock_query_response([
        _make_page(email="sarah@example.com"),
        _make_page(page_id="p2", email="other@example.com"),
    ])
    result = svc.get_client_by_email("sarah@example.com")
    assert result is not None
    assert result["email"] == "sarah@example.com"


def test_get_client_by_email_case_insensitive(svc, mock_notion_client):
    mock_notion_client.databases.query.return_value = _mock_query_response([
        _make_page(email="Sarah@Example.com"),
    ])
    result = svc.get_client_by_email("sarah@example.com")
    assert result is not None


def test_get_client_by_email_not_found(svc, mock_notion_client):
    mock_notion_client.databases.query.return_value = _mock_query_response([
        _make_page(email="other@example.com"),
    ])
    assert svc.get_client_by_email("missing@example.com") is None


# ── update_page ──────────────────────────────────────────────────────


def test_update_page_calls_api(svc, mock_notion_client):
    svc.update_page("page-123", {"Status": {"select": {"name": "Call Complete"}}})
    mock_notion_client.pages.update.assert_called_once_with(
        page_id="page-123",
        properties={"Status": {"select": {"name": "Call Complete"}}},
    )


def test_update_page_invalidates_cache(svc, mock_notion_client):
    """update_page should bust both payments and intakes caches."""
    from app.services.cache_manager import cache
    cache.set("notion_payments", [{"id": "old"}], tier="warm")
    cache.set("notion_intakes", [{"id": "old"}], tier="warm")

    svc.update_page("page-123", {})

    assert cache.get("notion_payments") is None
    assert cache.get("notion_intakes") is None


# ── get_all_intakes ──────────────────────────────────────────────────


def test_get_all_intakes(svc, mock_notion_client):
    # First call for get_all_payments setup (if needed) — but intakes use intake_db
    mock_notion_client.databases.query.return_value = _mock_query_response([
        _make_intake_page(),
    ])
    intakes = svc.get_all_intakes()
    assert len(intakes) == 1
    i = intakes[0]
    assert i["client_name"] == "Sarah Chen"
    assert i["email"] == "sarah@example.com"
    assert i["role"] == "Creative Director"
    assert i["brand"] == "Studio Lumen"
    assert i["desired_outcome"] == ["A clear decision", "Direction I can trust"]
    assert i["action_plan_sent"] is False


def test_get_all_intakes_cached(svc, mock_notion_client):
    mock_notion_client.databases.query.return_value = _mock_query_response([
        _make_intake_page(),
    ])
    svc.get_all_intakes()
    svc.get_all_intakes()
    assert mock_notion_client.databases.query.call_count == 1


# ── get_merged_clients ───────────────────────────────────────────────


def test_get_merged_clients_matches_by_email(svc, mock_notion_client):
    """Payments and intakes with same email should be merged."""
    payment_page = _make_page(email="sarah@example.com")
    intake_page = _make_intake_page(email="sarah@example.com")

    # First query = payments DB, second query = intakes DB
    mock_notion_client.databases.query.side_effect = [
        _mock_query_response([payment_page]),
        _mock_query_response([intake_page]),
    ]

    merged = svc.get_merged_clients()
    assert len(merged) == 1
    assert merged[0]["payment"]["email"] == "sarah@example.com"
    assert merged[0]["intake"]["email"] == "sarah@example.com"


def test_get_merged_clients_no_intake(svc, mock_notion_client):
    """Payment with no matching intake should have intake=None."""
    mock_notion_client.databases.query.side_effect = [
        _mock_query_response([_make_page(email="solo@example.com")]),
        _mock_query_response([]),
    ]

    merged = svc.get_merged_clients()
    assert len(merged) == 1
    assert merged[0]["intake"] is None


def test_get_merged_clients_case_insensitive(svc, mock_notion_client):
    """Email matching should be case-insensitive."""
    mock_notion_client.databases.query.side_effect = [
        _mock_query_response([_make_page(email="Sarah@Example.com")]),
        _mock_query_response([_make_intake_page(email="sarah@example.com")]),
    ]
    merged = svc.get_merged_clients()
    assert merged[0]["intake"] is not None


# ── Property Extractors (via _parse_payment / _parse_intake) ─────────


def test_parse_empty_title(svc, mock_notion_client):
    """Empty title field should parse to empty string."""
    page = _make_page(title="")
    page["properties"]["Client Name"] = {"title": []}
    mock_notion_client.databases.query.return_value = _mock_query_response([page])
    payments = svc.get_all_payments()
    assert payments[0]["client_name"] == ""


def test_parse_null_email(svc, mock_notion_client):
    page = _make_page()
    page["properties"]["Email"] = {"email": None}
    mock_notion_client.databases.query.return_value = _mock_query_response([page])
    payments = svc.get_all_payments()
    assert payments[0]["email"] == ""


def test_parse_null_number(svc, mock_notion_client):
    page = _make_page()
    page["properties"]["Payment Amount"] = {"number": None}
    mock_notion_client.databases.query.return_value = _mock_query_response([page])
    payments = svc.get_all_payments()
    assert payments[0]["payment_amount"] == 0.0


def test_parse_null_select(svc, mock_notion_client):
    page = _make_page()
    page["properties"]["Status"] = {"select": None}
    mock_notion_client.databases.query.return_value = _mock_query_response([page])
    payments = svc.get_all_payments()
    assert payments[0]["status"] == ""


def test_parse_null_date(svc, mock_notion_client):
    page = _make_page()
    page["properties"]["Payment Date"] = {"date": None}
    mock_notion_client.databases.query.return_value = _mock_query_response([page])
    payments = svc.get_all_payments()
    assert payments[0]["payment_date"] == ""


def test_parse_null_url(svc, mock_notion_client):
    page = _make_page()
    page["properties"]["Calendly Link"] = {"url": None}
    mock_notion_client.databases.query.return_value = _mock_query_response([page])
    payments = svc.get_all_payments()
    assert payments[0]["calendly_link"] == ""


def test_parse_empty_relation(svc, mock_notion_client):
    page = _make_page()
    page["properties"]["Linked Intake"] = {"relation": []}
    mock_notion_client.databases.query.return_value = _mock_query_response([page])
    payments = svc.get_all_payments()
    assert payments[0]["linked_intake_id"] == ""


def test_parse_multi_select(svc, mock_notion_client):
    page = _make_intake_page(desired_outcome=["A clear decision", "Stronger positioning"])
    mock_notion_client.databases.query.return_value = _mock_query_response([page])
    intakes = svc.get_all_intakes()
    assert intakes[0]["desired_outcome"] == ["A clear decision", "Stronger positioning"]


def test_parse_empty_multi_select(svc, mock_notion_client):
    page = _make_intake_page(desired_outcome=[])
    mock_notion_client.databases.query.return_value = _mock_query_response([page])
    intakes = svc.get_all_intakes()
    assert intakes[0]["desired_outcome"] == []
