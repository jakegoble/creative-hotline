"""Client list + detail view with full journey timeline."""

import streamlit as st

from app.components.client_timeline import render_timeline, render_client_card
from app.utils.formatters import format_date, format_currency


def render():
    st.header("Clients")

    notion = st.session_state.get("notion")
    if not notion:
        st.warning("Notion not connected. Add NOTION_API_KEY to .env.")
        return

    merged = notion.get_merged_clients()

    if not merged:
        st.info("No client records found.")
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
    if st.button("← Back to Client List"):
        st.session_state.selected_client_email = None
        st.rerun()

    st.subheader(name)
    st.caption(email)

    # ── Quick Stats ──────────────────────────────────────────────

    cols = st.columns(4)
    with cols[0]:
        st.metric("Status", payment.get("status", "Unknown"))
    with cols[1]:
        st.metric("Product", payment.get("product_purchased") or "—")
    with cols[2]:
        st.metric("Amount", format_currency(payment.get("payment_amount", 0)))
    with cols[3]:
        st.metric("Source", payment.get("lead_source") or "Unknown")

    st.divider()

    # ── Journey Timeline ─────────────────────────────────────────

    st.subheader("Journey Timeline")
    render_timeline(payment, intake)

    st.divider()

    # ── Intake Details ───────────────────────────────────────────

    if intake:
        st.subheader("Intake Form")

        detail_cols = st.columns(2)
        with detail_cols[0]:
            st.markdown(f"**Role:** {intake.get('role') or '—'}")
            st.markdown(f"**Brand:** {intake.get('brand') or '—'}")
            st.markdown(f"**Website/IG:** {intake.get('website_ig') or '—'}")
            st.markdown(f"**Deadline:** {intake.get('deadline') or '—'}")
            st.markdown(f"**Constraints:** {intake.get('constraints') or '—'}")

        with detail_cols[1]:
            st.markdown(f"**Desired Outcome:** {', '.join(intake.get('desired_outcome', [])) or '—'}")
            st.markdown(f"**What They've Tried:** {intake.get('what_tried') or '—'}")
            st.markdown(f"**Action Plan Sent:** {'Yes' if intake.get('action_plan_sent') else 'No'}")

        if intake.get("creative_emergency"):
            st.markdown("**Creative Emergency:**")
            st.info(intake["creative_emergency"])

        if intake.get("ai_summary"):
            st.markdown("**AI Intake Summary:**")
            st.success(intake["ai_summary"])
    else:
        st.subheader("Intake Form")
        st.info("No intake form submitted yet.")

    st.divider()

    # ── Raw Data ─────────────────────────────────────────────────

    with st.expander("Raw Payment Data"):
        st.json(payment)
    if intake:
        with st.expander("Raw Intake Data"):
            st.json(intake)
