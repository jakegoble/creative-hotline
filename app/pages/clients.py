"""Client list + detail view with full journey timeline."""

import streamlit as st

from app.components.client_timeline import render_timeline, render_client_card
from app.utils.formatters import format_date, format_currency
from app.utils.ui import (
    page_header,
    section_header,
    metric_row,
    empty_state,
    key_value_inline,
)


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

    # ── Filters ──────────────────────────────────────────────────

    col_search, col_status, col_source = st.columns([3, 2, 2])

    with col_search:
        search = st.text_input("Search by name or email", placeholder="Type to filter...")

    with col_status:
        status_filter = st.selectbox(
            "Status",
            options=["All"] + list({m["payment"]["status"] for m in merged if m["payment"]["status"]}),
        )

    with col_source:
        source_filter = st.selectbox(
            "Lead Source",
            options=["All"] + list({m["payment"]["lead_source"] for m in merged if m["payment"]["lead_source"]}),
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

    # ── Client List / Detail Toggle ──────────────────────────────

    # Check if a client is selected for detail view
    if "selected_client_email" in st.session_state and st.session_state.selected_client_email:
        _render_detail_view(merged)
        return

    # ── List View ────────────────────────────────────────────────

    for m in filtered:
        payment = m["payment"]
        intake = m.get("intake")
        name = payment.get("client_name") or payment.get("email", "Unknown")

        with st.container():
            render_client_card(payment, intake)

            if st.button(f"View Details", key=f"detail_{payment['id']}"):
                st.session_state.selected_client_email = payment.get("email", "")
                st.rerun()

            st.divider()


def _render_detail_view(merged: list[dict]):
    """Render the detail view for a selected client."""
    email = st.session_state.selected_client_email

    # Find client
    client = None
    for m in merged:
        if (m["payment"].get("email", "").lower() == email.lower()):
            client = m
            break

    if not client:
        st.error(f"Client not found: {email}")
        st.session_state.selected_client_email = None
        return

    payment = client["payment"]
    intake = client.get("intake")
    name = payment.get("client_name") or email

    # Back button
    if st.button("\u2190 Back to Client List"):
        st.session_state.selected_client_email = None
        st.rerun()

    section_header(name, email)

    # ── Quick Stats ──────────────────────────────────────────────

    metric_row([
        {"label": "Status", "value": payment.get("status", "Unknown")},
        {"label": "Product", "value": payment.get("product_purchased") or "\u2014"},
        {"label": "Amount", "value": format_currency(payment.get("payment_amount", 0))},
        {"label": "Source", "value": payment.get("lead_source") or "Unknown"},
    ])

    st.divider()

    # ── Journey Timeline ─────────────────────────────────────────

    section_header("Journey Timeline")
    render_timeline(payment, intake)

    st.divider()

    # ── Intake Details ───────────────────────────────────────────

    if intake:
        section_header("Intake Form")

        detail_cols = st.columns(2)
        with detail_cols[0]:
            key_value_inline("Role", intake.get('role') or '\u2014')
            key_value_inline("Brand", intake.get('brand') or '\u2014')
            key_value_inline("Website/IG", intake.get('website_ig') or '\u2014')
            key_value_inline("Deadline", intake.get('deadline') or '\u2014')
            key_value_inline("Constraints", intake.get('constraints') or '\u2014')

        with detail_cols[1]:
            key_value_inline("Desired Outcome", ', '.join(intake.get('desired_outcome', [])) or '\u2014')
            key_value_inline("What They've Tried", intake.get('what_tried') or '\u2014')
            key_value_inline("Action Plan Sent", 'Yes' if intake.get('action_plan_sent') else 'No')

        if intake.get("creative_emergency"):
            st.markdown("**Creative Emergency:**")
            st.info(intake["creative_emergency"])

        if intake.get("ai_summary"):
            st.markdown("**AI Intake Summary:**")
            st.success(intake["ai_summary"])
    else:
        section_header("Intake Form")
        empty_state("No intake form submitted yet.")

    st.divider()

    # ── Raw Data ─────────────────────────────────────────────────

    with st.expander("Raw Payment Data"):
        st.json(payment)
    if intake:
        with st.expander("Raw Intake Data"):
            st.json(intake)
