"""Visual client timeline component — shows full journey per client.

Stages: DM/Lead → Payment → Booking → Intake → Call → Action Plan → Follow-Up
Each stage shows source system, date, and key details.
"""

from __future__ import annotations

import streamlit as st

from app.config import PIPELINE_STATUSES
from app.utils.formatters import format_date, format_currency, truncate


# Map pipeline statuses to ordered journey stages
JOURNEY_STAGES = [
    {"key": "lead", "label": "Lead Captured", "icon": "1", "min_status": "Lead - Laylo"},
    {"key": "paid", "label": "Payment Received", "icon": "2", "min_status": "Paid - Needs Booking"},
    {"key": "booked", "label": "Call Booked", "icon": "3", "min_status": "Booked - Needs Intake"},
    {"key": "intake", "label": "Intake Submitted", "icon": "4", "min_status": "Intake Complete"},
    {"key": "call", "label": "Call Completed", "icon": "5", "min_status": "Call Complete"},
    {"key": "followup", "label": "Action Plan Sent", "icon": "6", "min_status": "Follow-Up Sent"},
]


def render_timeline(payment: dict, intake: dict | None = None) -> None:
    """Render a vertical timeline showing a client's journey.

    Args:
        payment: Parsed payment record from Notion
        intake: Parsed intake record from Notion (if available)
    """
    current_status = payment.get("status", "")
    current_index = (
        PIPELINE_STATUSES.index(current_status)
        if current_status in PIPELINE_STATUSES
        else -1
    )

    for stage in JOURNEY_STAGES:
        stage_index = PIPELINE_STATUSES.index(stage["min_status"])
        is_completed = current_index >= stage_index
        is_current = current_index == stage_index

        # Determine visual state
        if is_current:
            color = "#FF6B35"  # orange — active
            badge = "CURRENT"
        elif is_completed:
            color = "#28a745"  # green — done
            badge = "DONE"
        else:
            color = "#ccc"  # gray — future
            badge = ""

        # Build stage details
        details = _get_stage_details(stage["key"], payment, intake)

        # Render stage
        col_line, col_content = st.columns([1, 11])

        with col_line:
            connector = (
                '<div style="width:2px;height:40px;background:#e0e0e0;margin:0 auto;"></div>'
                if stage != JOURNEY_STAGES[-1] else ""
            )
            st.markdown(
                f'<div style="text-align:center;">'
                f'<div style="width:32px;height:32px;border-radius:50%;'
                f'background:{color};color:white;display:inline-flex;'
                f'align-items:center;justify-content:center;font-weight:bold;'
                f'font-size:14px;">{stage["icon"]}</div>'
                f'{connector}'
                f'</div>',
                unsafe_allow_html=True,
            )

        with col_content:
            label = stage["label"]
            if badge:
                label += f"  `{badge}`"
            st.markdown(f"**{label}**")

            if details:
                for detail in details:
                    st.caption(detail)
            elif not is_completed:
                st.caption("Pending")


def _get_stage_details(key: str, payment: dict, intake: dict | None) -> list[str]:
    """Get detail strings for a journey stage."""
    details = []

    if key == "lead":
        source = payment.get("lead_source") or "Direct"
        created = format_date(payment.get("created", ""))
        details.append(f"Source: {source}")
        details.append(f"Date: {created}")
        if payment.get("email"):
            details.append(f"Email: {payment['email']}")

    elif key == "paid":
        amount = payment.get("payment_amount", 0)
        product = payment.get("product_purchased") or "Unknown product"
        date = format_date(payment.get("payment_date", ""))
        if amount > 0:
            details.append(f"{product} — {format_currency(amount)}")
            details.append(f"Date: {date}")
            if payment.get("stripe_session_id"):
                details.append(f"Stripe: {payment['stripe_session_id'][:20]}...")

    elif key == "booked":
        call_date = format_date(payment.get("call_date", ""))
        if call_date != "—":
            details.append(f"Call date: {call_date}")
        if payment.get("calendly_link"):
            details.append(f"Calendly: {payment['calendly_link'][:50]}...")

    elif key == "intake":
        if intake:
            if intake.get("creative_emergency"):
                details.append(f"Emergency: {truncate(intake['creative_emergency'], 80)}")
            if intake.get("desired_outcome"):
                outcomes = ", ".join(intake["desired_outcome"])
                details.append(f"Desired: {truncate(outcomes, 80)}")
            if intake.get("ai_summary"):
                details.append(f"AI Summary: {truncate(intake['ai_summary'], 100)}")
        else:
            details.append("No intake form received")

    elif key == "call":
        # Call completion is tracked by status change
        if payment.get("status") in ("Call Complete", "Follow-Up Sent"):
            details.append("Call completed")

    elif key == "followup":
        if intake and intake.get("action_plan_sent"):
            details.append("Action plan delivered")
        elif payment.get("status") == "Follow-Up Sent":
            details.append("Follow-up email sent")

    return details


def render_client_card(payment: dict, intake: dict | None = None, show_score: bool = False) -> None:
    """Render a compact client card for list views."""
    name = payment.get("client_name") or payment.get("email", "Unknown")
    email = payment.get("email", "")
    status = payment.get("status", "Unknown")
    amount = payment.get("payment_amount", 0)
    product = payment.get("product_purchased") or ""
    source = payment.get("lead_source") or "Unknown"
    created = format_date(payment.get("created", ""))

    col1, col2, col3 = st.columns([3, 4, 2])

    with col1:
        st.markdown(f"**{name}**")
        st.caption(email)

    with col2:
        st.caption(f"Status: {status}")
        if product and amount > 0:
            st.caption(f"{product} — {format_currency(amount)}")
        st.caption(f"Source: {source} | Joined: {created}")

    with col3:
        if amount > 0:
            st.markdown(f"### {format_currency(amount)}")
        emergency = (intake or {}).get("creative_emergency", "")
        if emergency:
            st.caption(truncate(emergency, 60))
