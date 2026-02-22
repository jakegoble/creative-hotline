"""KPI metric card components for the dashboard."""

import streamlit as st

from app.utils.formatters import format_currency, format_percentage


def render_kpi_row(metrics: dict) -> None:
    """Render a row of 6 KPI cards.

    Expected keys: total_revenue, active_clients, booking_rate,
    avg_time_to_book, funnel_conversion, system_health
    """
    cols = st.columns(6)

    with cols[0]:
        _metric_card(
            "Total Revenue",
            format_currency(metrics.get("total_revenue", 0)),
            delta=metrics.get("revenue_delta"),
            delta_label="vs prev period",
        )

    with cols[1]:
        _metric_card(
            "Active Clients",
            str(metrics.get("active_clients", 0)),
            delta=metrics.get("clients_delta"),
        )

    with cols[2]:
        _metric_card(
            "Booking Rate",
            format_percentage(metrics.get("booking_rate", 0)),
        )

    with cols[3]:
        avg_hours = metrics.get("avg_time_to_book")
        if avg_hours is not None:
            if avg_hours < 24:
                display = f"{avg_hours:.1f}h"
            else:
                display = f"{avg_hours / 24:.1f}d"
        else:
            display = "—"
        _metric_card("Avg Time to Book", display)

    with cols[4]:
        _metric_card(
            "Funnel Conversion",
            format_percentage(metrics.get("funnel_conversion", 0)),
            help_text="Lead → Call Complete",
        )

    with cols[5]:
        health = metrics.get("system_health", "—")
        _metric_card("System Health", health)


def _metric_card(
    label: str,
    value: str,
    delta: float | None = None,
    delta_label: str = "",
    help_text: str = "",
) -> None:
    """Render a single metric card using Streamlit's metric widget."""
    delta_str = None
    if delta is not None:
        if isinstance(delta, float):
            delta_str = f"{delta:+.1f}%"
        else:
            delta_str = str(delta)

    st.metric(
        label=label,
        value=value,
        delta=delta_str,
        help=help_text or None,
    )
