"""Shared test fixtures for Creative Hotline tests."""

from __future__ import annotations

import pytest


@pytest.fixture
def hot_payment():
    """A 'hot' client payment — paid, booked, intake complete, referral source."""
    return {
        "id": "p-hot",
        "client_name": "Sarah Chen",
        "email": "sarah@example.com",
        "phone": "+1-310-555-1234",
        "payment_amount": 699,
        "product_purchased": "Standard Call",
        "payment_date": "2026-02-18",
        "status": "Intake Complete",
        "call_date": "2026-02-20",
        "calendly_link": "",
        "lead_source": "Referral",
        "stripe_session_id": "cs_test_abc",
        "linked_intake_id": "i-hot",
        "booking_reminder_sent": True,
        "intake_reminder_sent": True,
        "nurture_email_sent": False,
        "created": "2026-02-17T10:00:00.000Z",
        "url": "",
    }


@pytest.fixture
def hot_intake():
    """A rich intake form with full details."""
    return {
        "id": "i-hot",
        "client_name": "Sarah Chen",
        "email": "sarah@example.com",
        "role": "Creative Director",
        "brand": "Studio Lumen",
        "website_ig": "https://www.studiolumen.co",
        "creative_emergency": "Rebranding in 2 weeks. Visual identity feels disconnected.",
        "desired_outcome": ["A clear decision", "Direction I can trust"],
        "what_tried": "Hired freelance designer, 3 concepts, none felt right.",
        "deadline": "2 weeks",
        "constraints": "Budget locked",
        "intake_status": "Complete",
        "ai_summary": "Strong candidate for Sprint upsell.",
        "action_plan_sent": False,
        "call_date": "2026-02-20",
        "linked_payment_id": "p-hot",
        "created": "2026-02-19T08:00:00.000Z",
        "url": "",
    }


@pytest.fixture
def cold_payment():
    """A cold lead — Laylo signup, no payment."""
    return {
        "id": "p-cold",
        "client_name": "",
        "email": "cold@example.com",
        "phone": "",
        "payment_amount": 0,
        "product_purchased": "",
        "payment_date": "",
        "status": "Lead - Laylo",
        "call_date": "",
        "calendly_link": "",
        "lead_source": "IG DM",
        "stripe_session_id": "",
        "linked_intake_id": "",
        "booking_reminder_sent": False,
        "intake_reminder_sent": False,
        "nurture_email_sent": False,
        "created": "2026-01-01T10:00:00.000Z",
        "url": "",
    }


@pytest.fixture
def sample_payments(hot_payment, cold_payment):
    """A set of 6 payments covering varied pipeline stages."""
    return [
        hot_payment,
        cold_payment,
        {
            **hot_payment, "id": "p-paid", "email": "paid@example.com",
            "status": "Paid - Needs Booking", "lead_source": "Website",
            "payment_amount": 499, "product_purchased": "First Call",
        },
        {
            **hot_payment, "id": "p-booked", "email": "booked@example.com",
            "status": "Booked - Needs Intake", "lead_source": "Meta Ad",
        },
        {
            **hot_payment, "id": "p-done", "email": "done@example.com",
            "status": "Call Complete", "lead_source": "LinkedIn",
            "payment_amount": 1495, "product_purchased": "3-Session Clarity Sprint",
        },
        {
            **hot_payment, "id": "p-sent", "email": "sent@example.com",
            "status": "Follow-Up Sent", "lead_source": "Referral",
        },
    ]


@pytest.fixture
def sample_merged(hot_payment, hot_intake, cold_payment):
    """Merged payment+intake pairs for testing scoring/segmentation."""
    return [
        {"payment": hot_payment, "intake": hot_intake},
        {"payment": cold_payment, "intake": None},
    ]
