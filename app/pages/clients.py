"""Client list + Client 360 detail view with full journey timeline."""

from __future__ import annotations

import streamlit as st

from app.components.client_timeline import render_timeline, render_client_card
from app.utils.formatters import format_date, format_currency
from app.utils.activity_feed import build_activity_feed
from app.utils import design_tokens as tok
from app.utils.ui import (
    page_header,
    section_header,
    metric_row,
    empty_state,
    key_value_inline,
    stat_card,
    badge,
    labeled_divider,
    activity_feed,
)


# ── Status → color mapping ────────────────────────────────────────

_STATUS_COLORS = {
    "Lead - Laylo": "#EC4899",
    "Paid - Needs Booking": "#F59E0B",
    "Booked - Needs Intake": "#3B82F6",
    "Intake Complete": "#8B5CF6",
    "Ready for Call": "#6366F1",
    "Call Complete": "#FF6B35",
    "Follow-Up Sent": "#22C55E",
}


def render():
    page_header("Clients", "Browse and manage your client roster.")

    notion = st.session_state.get("notion")
    if not notion:
        st.warning("Notion not connected. Add NOTION_API_KEY to .env.")
        return

    merged = notion.get_merged_clients()

    if not merged:
        empty_state("No client records found.")
        return

    # ── Check for detail view first ───────────────────────────────

    if "selected_client_email" in st.session_state and st.session_state.selected_client_email:
        _render_360_view(merged)
        return

    # ── Filters ──────────────────────────────────────────────────

    col_search, col_status, col_source = st.columns([3, 2, 2])

    with col_search:
        search = st.text_input("Search by name or email", placeholder="Type to filter...")

    with col_status:
        status_filter = st.selectbox(
            "Status",
            options=["All"] + sorted({m["payment"]["status"] for m in merged if m["payment"]["status"]}),
        )

    with col_source:
        source_filter = st.selectbox(
            "Lead Source",
            options=["All"] + sorted({m["payment"]["lead_source"] for m in merged if m["payment"]["lead_source"]}),
        )

    # Apply filters
    filtered = merged
    if search:
        search_lower = search.lower()
        filtered = [
            m for m in filtered
            if search_lower in (m["payment"].get("client_name", "") or "").lower()
            or search_lower in (m["payment"].get("email", "") or "").lower()
        ]
    if status_filter != "All":
        filtered = [m for m in filtered if m["payment"]["status"] == status_filter]
    if source_filter != "All":
        filtered = [m for m in filtered if m["payment"]["lead_source"] == source_filter]

    st.caption(f"Showing {len(filtered)} of {len(merged)} clients")

    # ── List View ────────────────────────────────────────────────

    for m in filtered:
        payment = m["payment"]
        intake = m.get("intake")

        with st.container():
            render_client_card(payment, intake)

            if st.button("View Details", key=f"detail_{payment['id']}"):
                st.session_state.selected_client_email = payment.get("email", "")
                st.rerun()

            st.divider()


def _render_360_view(merged: list[dict]) -> None:
    """Render Client 360 view — comprehensive single-client dashboard."""
    email = st.session_state.selected_client_email

    # Find client
    client = None
    for m in merged:
        if m["payment"].get("email", "").lower() == email.lower():
            client = m
            break

    if not client:
        st.error(f"Client not found: {email}")
        st.session_state.selected_client_email = None
        return

    payment = client["payment"]
    intake = client.get("intake")
    name = payment.get("client_name") or email
    status = payment.get("status", "Unknown")

    # Back button
    if st.button("\u2190 Back to Client List"):
        st.session_state.selected_client_email = None
        st.rerun()

    # ── Client Header (avatar + name + badges) ────────────────────

    initials = _get_initials(name)
    avatar_color = _STATUS_COLORS.get(status, tok.PRIMARY)
    status_badge = badge(status, _STATUS_COLORS.get(status, tok.TEXT_SECONDARY))
    source_badge = badge(payment.get("lead_source") or "Direct", tok.ACCENT_SECONDARY, variant="outline")
    product_badge = ""
    if payment.get("product_purchased"):
        product_badge = badge(payment["product_purchased"], tok.INFO, variant="outline")

    st.markdown(
        f'<div class="ch-client-header">'
        f'<div class="ch-client-avatar" style="background:{avatar_color}">{initials}</div>'
        f'<div class="ch-client-info">'
        f'<div class="ch-client-name">{name}</div>'
        f'<div class="ch-client-email">{email}</div>'
        f'<div class="ch-client-badges">{status_badge} {source_badge} {product_badge}</div>'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # ── Key Metrics Row ───────────────────────────────────────────

    metric_row([
        {"label": "Revenue", "value": format_currency(payment.get("payment_amount", 0))},
        {"label": "Product", "value": payment.get("product_purchased") or "\u2014"},
        {"label": "Call Date", "value": format_date(payment.get("call_date", "")) if payment.get("call_date") else "\u2014"},
        {"label": "Source", "value": payment.get("lead_source") or "Unknown"},
    ])

    # ── Two-Column Layout: Timeline + Details ─────────────────────

    labeled_divider("Client Journey")

    timeline_col, details_col = st.columns([3, 2], gap="medium")

    with timeline_col:
        section_header("Journey Timeline")
        render_timeline(payment, intake)

    with details_col:
        # ── Action Items ──────────────────────────────────────────
        section_header("Action Items")
        _render_action_items(payment, intake)

        # ── Communication Checkboxes ──────────────────────────────
        section_header("Communications Sent")
        _render_comms_status(payment)

    labeled_divider("Client Profile")

    # ── Intake Details ────────────────────────────────────────────

    if intake:
        profile_col, emergency_col = st.columns([1, 1], gap="medium")

        with profile_col:
            section_header("Intake Details")
            key_value_inline("Role", intake.get("role") or "\u2014")
            key_value_inline("Brand", intake.get("brand") or "\u2014")
            key_value_inline("Website/IG", intake.get("website_ig") or "\u2014")
            key_value_inline("Deadline", intake.get("deadline") or "\u2014")
            key_value_inline("Constraints", intake.get("constraints") or "\u2014")
            key_value_inline("Desired Outcome", ", ".join(intake.get("desired_outcome", [])) or "\u2014")
            key_value_inline("What They've Tried", intake.get("what_tried") or "\u2014")

        with emergency_col:
            if intake.get("creative_emergency"):
                section_header("Creative Emergency")
                st.info(intake["creative_emergency"])

            if intake.get("ai_summary"):
                section_header("AI Analysis")
                st.success(intake["ai_summary"])

            if not intake.get("creative_emergency") and not intake.get("ai_summary"):
                empty_state("No emergency or AI summary available.")
    else:
        empty_state("No intake form submitted yet.")

    labeled_divider("Activity Log")

    # ── Activity Feed (this client only) ──────────────────────────

    section_header("Recent Activity", f"Events for {name}")
    client_events = build_activity_feed(
        [payment],
        [intake] if intake else [],
        limit=10,
    )
    activity_feed(client_events, max_items=10)

    # ── Raw Data ──────────────────────────────────────────────────

    labeled_divider("")

    with st.expander("Raw Payment Data"):
        st.json(payment)
    if intake:
        with st.expander("Raw Intake Data"):
            st.json(intake)


def _render_action_items(payment: dict, intake: dict | None) -> None:
    """Show contextual next steps based on client status."""
    status = payment.get("status", "")
    items: list[tuple[str, str]] = []

    if status == "Paid - Needs Booking":
        items.append(("\U0001f4c5", "Send booking reminder — client hasn't scheduled yet"))
    elif status == "Booked - Needs Intake":
        items.append(("\U0001f4cb", "Send intake form reminder — call is booked but no intake"))
    elif status == "Intake Complete":
        items.append(("\U0001f4de", "Review intake before call — prep talking points"))
    elif status == "Ready for Call":
        items.append(("\u2705", "Call is imminent — all prep complete"))
    elif status == "Call Complete":
        items.append(("\U0001f4dd", "Create and send action plan within 24 hours"))
    elif status == "Follow-Up Sent":
        items.append(("\U0001f4e7", "Check if client opened action plan"))
        if payment.get("product_purchased") == "First Call":
            items.append(("\U0001f4b0", "Consider upsell to Single Call or Sprint"))
    elif status == "Lead - Laylo":
        items.append(("\u2728", "Nurture lead — send Tally form or pricing info"))

    if intake and intake.get("ai_summary") and "upsell" in intake["ai_summary"].lower():
        items.append(("\U0001f680", "AI flagged upsell opportunity in intake analysis"))

    if not items:
        st.caption("No action items right now.")
        return

    for icon, text in items:
        st.markdown(f"{icon} {text}")


def _render_comms_status(payment: dict) -> None:
    """Show which automated communications have been sent."""
    comms = [
        ("Booking Reminder", payment.get("booking_reminder_sent", False)),
        ("Intake Reminder", payment.get("intake_reminder_sent", False)),
        ("Nurture Email", payment.get("nurture_email_sent", False)),
    ]
    for label, sent in comms:
        icon = "\u2705" if sent else "\u2B1C"
        st.markdown(f"{icon} {label}")


def _get_initials(name: str) -> str:
    """Extract up to 2 initials from a name."""
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    if parts:
        return parts[0][0].upper()
    return "?"
