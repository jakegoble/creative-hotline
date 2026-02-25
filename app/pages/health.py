"""System Health page — service status, n8n execution log, latency monitoring."""

import streamlit as st

from app.utils.formatters import format_relative_time
from app.utils import design_tokens as t
from app.utils.ui import page_header, section_header, stat_card, metric_row, empty_state


def render():
    page_header("System Health", "Service status, latency monitoring, and cache diagnostics.")

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
            "Claude AI": st.session_state.get("claude"),
            "Fireflies": st.session_state.get("fireflies"),
            "n8n": st.session_state.get("n8n"),
        }
        with st.spinner("Checking services..."):
            health_checker.check_all(services)

    # ── Service Status Grid ──────────────────────────────────────

    section_header("Service Status")
    statuses = health_checker.get_all_statuses()

    if not statuses:
        empty_state("Click 'Run Health Checks' to check all services.")
        return

    composite = health_checker.composite_score
    if composite == "Green":
        st.success(f"Overall: {composite} — All systems operational")
    elif composite == "Yellow":
        st.warning(f"Overall: {composite} — Some services degraded")
    else:
        st.error(f"Overall: {composite} — Critical services down")

    # Display in rows of 4 max (not 7 cramped columns)
    per_row = 4
    for row_start in range(0, len(statuses), per_row):
        row = statuses[row_start:row_start + per_row]
        cols = st.columns(per_row)
        for i, status in enumerate(row):
            with cols[i]:
                latency_text = f"{status.latency_ms:.0f}ms" if status.last_checked else "\u2014"
                error_note = f" \u00b7 {status.error[:40]}" if status.error else ""
                stat_card(
                    label=status.service,
                    value=f"{status.status_emoji} {status.status_text}",
                    subtitle=f"Latency: {latency_text}{error_note}",
                    accent_color=t.SUCCESS if status.healthy else t.DANGER,
                )

    # ── Service Details ──────────────────────────────────────────

    with st.expander("Service Details"):
        for status in statuses:
            age = status.age_seconds
            if age < 60:
                age_str = f"{age:.0f}s ago"
            elif age < 3600:
                age_str = f"{age / 60:.0f}m ago"
            else:
                age_str = f"{age / 3600:.1f}h ago"

            st.markdown(
                f"**{status.status_emoji} {status.service}** \u2014 "
                f"{status.status_text} \u00b7 {status.latency_ms:.0f}ms \u00b7 {age_str}"
            )
            if status.error:
                st.code(status.error, language=None)

    # ── Cache Stats ──────────────────────────────────────────────

    section_header("Cache Status")
    from app.services.cache_manager import cache
    stats = cache.stats()

    metric_row([
        {"label": "Total Entries", "value": str(stats["total_entries"])},
        {"label": "Active", "value": str(stats["active_entries"])},
        {"label": "Expired", "value": str(stats["expired_entries"])},
    ])

    st.caption("Cache tiers:")
    for tier, count in stats["tiers"].items():
        st.caption(f"  {tier}: {count} active entries")


def _timestamp_to_iso(ts: float) -> str:
    """Convert Unix timestamp to ISO string."""
    from datetime import datetime
    return datetime.fromtimestamp(ts).isoformat()
