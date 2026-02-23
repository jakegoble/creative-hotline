"""KPI metric card components for the dashboard."""

from __future__ import annotations

from app.utils.formatters import format_currency, format_percentage
from app.utils.ui import metric_row


def render_kpi_row(metrics: dict) -> None:
    """Render a row of 6 KPI cards.

    Expected keys: total_revenue, active_clients, booking_rate,
    avg_time_to_book, funnel_conversion, system_health
    """
    avg_hours = metrics.get("avg_time_to_book")
    if avg_hours is not None:
        if avg_hours < 24:
            time_display = f"{avg_hours:.1f}h"
        else:
            time_display = f"{avg_hours / 24:.1f}d"
    else:
        time_display = "\u2014"

    health = metrics.get("system_health", "\u2014")

    metric_row([
        {
            "label": "Total Revenue",
            "value": format_currency(metrics.get("total_revenue", 0)),
            "delta": metrics.get("revenue_delta"),
        },
        {
            "label": "Active Clients",
            "value": str(metrics.get("active_clients", 0)),
            "delta": metrics.get("clients_delta"),
        },
        {
            "label": "Booking Rate",
            "value": format_percentage(metrics.get("booking_rate", 0)),
        },
        {
            "label": "Avg Time to Book",
            "value": time_display,
        },
        {
            "label": "Funnel Conversion",
            "value": format_percentage(metrics.get("funnel_conversion", 0)),
            "help": "Lead \u2192 Call Complete",
        },
        {
            "label": "System Health",
            "value": str(health),
        },
    ])
