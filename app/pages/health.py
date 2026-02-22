"""System Health page — service status, n8n execution log, latency monitoring."""

import streamlit as st

from app.utils.formatters import format_relative_time


def render():
    st.header("System Health")

    health_checker = st.session_state.get("health")
    if not health_checker:
        st.error("Health checker not initialized.")
        return

    # ── Run Health Checks ────────────────────────────────────────

    if st.button("Run Health Checks", use_container_width=False):
        services = {
            "Notion": st.session_state.get("notion"),
            "Stripe": st.session_state.get("stripe"),
            "Calendly": st.session_state.get("calendly"),
            "ManyChat": st.session_state.get("manychat"),
        }
        with st.spinner("Checking services..."):
            health_checker.check_all(services)

    # ── Service Status Grid ──────────────────────────────────────

    st.subheader("Service Status")
    statuses = health_checker.get_all_statuses()

    if not statuses:
        st.info("Click 'Run Health Checks' to check all services.")
        return

    composite = health_checker.composite_score
    if composite == "Green":
        st.success(f"Overall: {composite} — All systems operational")
    elif composite == "Yellow":
        st.warning(f"Overall: {composite} — Some services degraded")
    else:
        st.error(f"Overall: {composite} — Critical services down")

    cols = st.columns(len(statuses))
    for i, status in enumerate(statuses):
        with cols[i]:
            st.markdown(f"### {status.status_emoji} {status.service}")
            st.caption(status.status_text)
            if status.last_checked:
                st.caption(f"Latency: {status.latency_ms:.0f}ms")
                st.caption(f"Checked: {format_relative_time(_timestamp_to_iso(status.last_checked))}")
            if status.error:
                st.caption(f"Error: {status.error[:100]}")

    st.divider()

    # ── Service Details ──────────────────────────────────────────

    st.subheader("Service Details")

    for status in statuses:
        with st.expander(f"{status.status_emoji} {status.service} — {status.status_text}"):
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Status", "Healthy" if status.healthy else "Down")
            with col2:
                st.metric("Latency", f"{status.latency_ms:.0f}ms")
            with col3:
                age = status.age_seconds
                if age < 60:
                    age_str = f"{age:.0f}s ago"
                elif age < 3600:
                    age_str = f"{age / 60:.0f}m ago"
                else:
                    age_str = f"{age / 3600:.1f}h ago"
                st.metric("Last Check", age_str)

            if status.error:
                st.code(status.error, language=None)

    st.divider()

    # ── Cache Stats ──────────────────────────────────────────────

    st.subheader("Cache Status")
    from app.services.cache_manager import cache
    stats = cache.stats()

    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Total Entries", stats["total_entries"])
    with c2:
        st.metric("Active", stats["active_entries"])
    with c3:
        st.metric("Expired", stats["expired_entries"])

    st.caption("Cache tiers:")
    for tier, count in stats["tiers"].items():
        st.caption(f"  {tier}: {count} active entries")


def _timestamp_to_iso(ts: float) -> str:
    """Convert Unix timestamp to ISO string."""
    from datetime import datetime
    return datetime.fromtimestamp(ts).isoformat()
