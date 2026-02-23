"""Tests for sequence tracker utility."""

from app.utils.sequence_tracker import (
    get_client_sequence,
    build_sequence_map,
    sequence_completion_rates,
    sequence_conversion_rates,
)

# ── Fixtures ──────────────────────────────────────────────────────

LAYLO_LEAD = {
    "email": "lead@test.com",
    "client_name": "Lead User",
    "status": "Lead - Laylo",
    "nurture_email_sent": False,
    "booking_reminder_sent": False,
    "intake_reminder_sent": False,
}

LAYLO_NURTURED = {
    "email": "nurtured@test.com",
    "client_name": "Nurtured User",
    "status": "Lead - Laylo",
    "nurture_email_sent": True,
    "booking_reminder_sent": False,
    "intake_reminder_sent": False,
}

PAID_NO_BOOKING = {
    "email": "paid@test.com",
    "client_name": "Paid User",
    "status": "Paid - Needs Booking",
    "nurture_email_sent": False,
    "booking_reminder_sent": False,
    "intake_reminder_sent": False,
}

PAID_REMINDED = {
    "email": "reminded@test.com",
    "client_name": "Reminded User",
    "status": "Paid - Needs Booking",
    "nurture_email_sent": False,
    "booking_reminder_sent": True,
    "intake_reminder_sent": False,
}

BOOKED_NO_INTAKE = {
    "email": "booked@test.com",
    "client_name": "Booked User",
    "status": "Booked - Needs Intake",
    "nurture_email_sent": False,
    "booking_reminder_sent": True,
    "intake_reminder_sent": False,
}

CALL_COMPLETE = {
    "email": "done@test.com",
    "client_name": "Done User",
    "status": "Call Complete",
    "nurture_email_sent": False,
    "booking_reminder_sent": True,
    "intake_reminder_sent": True,
}

ALL_PAYMENTS = [LAYLO_LEAD, LAYLO_NURTURED, PAID_NO_BOOKING, PAID_REMINDED, BOOKED_NO_INTAKE, CALL_COMPLETE]


# ── Client Sequence Detection ───────────────────────────────────

def test_laylo_lead_in_nurture():
    pos = get_client_sequence(LAYLO_LEAD)
    assert pos is not None
    assert pos.sequence_name == "Laylo Nurture"
    assert pos.current_step == 0
    assert not pos.completed


def test_laylo_nurtured_completed():
    pos = get_client_sequence(LAYLO_NURTURED)
    assert pos is not None
    assert pos.sequence_name == "Laylo Nurture"
    assert pos.completed
    assert pos.last_touchpoint == "Nurture Email"


def test_paid_in_post_payment():
    pos = get_client_sequence(PAID_NO_BOOKING)
    assert pos is not None
    assert pos.sequence_name == "Post-Payment"
    assert pos.current_step == 0
    assert not pos.completed


def test_paid_reminded_completed():
    pos = get_client_sequence(PAID_REMINDED)
    assert pos is not None
    assert pos.sequence_name == "Post-Payment"
    assert pos.completed


def test_booked_in_prep():
    pos = get_client_sequence(BOOKED_NO_INTAKE)
    assert pos is not None
    assert pos.sequence_name == "Pre-Call Prep"
    assert not pos.completed


def test_call_complete_no_sequence():
    """Call Complete clients are past all tracked sequences."""
    pos = get_client_sequence(CALL_COMPLETE)
    assert pos is None


def test_no_email_returns_none():
    pos = get_client_sequence({"status": "Lead - Laylo"})
    assert pos is None


# ── Sequence Map ────────────────────────────────────────────────

def test_build_sequence_map():
    seq_map = build_sequence_map(ALL_PAYMENTS)
    assert "Laylo Nurture" in seq_map
    assert "Post-Payment" in seq_map
    assert "Pre-Call Prep" in seq_map
    assert len(seq_map["Laylo Nurture"]) == 2  # lead + nurtured
    assert len(seq_map["Post-Payment"]) == 2   # paid + reminded


def test_sequence_map_empty():
    result = build_sequence_map([])
    assert result == {}


# ── Completion Rates ────────────────────────────────────────────

def test_completion_rates():
    rates = sequence_completion_rates(ALL_PAYMENTS)
    # Laylo Nurture: 2 entered, 1 completed (nurtured) = 50%
    assert rates["Laylo Nurture"]["entered"] == 2
    assert rates["Laylo Nurture"]["completed"] == 1
    assert rates["Laylo Nurture"]["rate"] == 50.0
    # Post-Payment: 2 entered, 1 completed (reminded) = 50%
    assert rates["Post-Payment"]["rate"] == 50.0


# ── Conversion Rates ───────────────────────────────────────────

def test_conversion_rates():
    # Add a payment for the nurtured lead that shows they advanced
    payments = ALL_PAYMENTS + [
        {
            "email": "nurtured@test.com",
            "client_name": "Nurtured User",
            "status": "Paid - Needs Booking",
            "payment_amount": 499,
        },
    ]
    rates = sequence_conversion_rates(payments)
    # Nurtured lead completed nurture AND advanced to Paid
    assert rates["Laylo Nurture"]["completed"] == 1
    assert rates["Laylo Nurture"]["advanced"] == 1
    assert rates["Laylo Nurture"]["conversion_rate"] == 100.0
