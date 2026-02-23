"""Revenue projection component — trailing 30-day trend extrapolation."""

from __future__ import annotations

from datetime import datetime, timedelta

import plotly.graph_objects as go

from app.utils.design_tokens import BORDER_DEFAULT, PRIMARY


def render_revenue_chart(monthly_data: list[dict]) -> go.Figure:
    """Render revenue trend line with trailing projection.

    Args:
        monthly_data: list of {"month": "2026-02", "revenue": 1234.0}
    """
    if not monthly_data:
        fig = go.Figure()
        fig.update_layout(
            annotations=[dict(text="No revenue data yet", showarrow=False,
                            xref="paper", yref="paper", x=0.5, y=0.5)],
            height=350,
        )
        return fig

    months = [d["month"] for d in monthly_data]
    revenues = [d["revenue"] for d in monthly_data]

    fig = go.Figure()

    # Actual revenue line
    fig.add_trace(go.Scatter(
        x=months,
        y=revenues,
        mode="lines+markers",
        name="Revenue",
        line=dict(color=PRIMARY, width=3),
        marker=dict(size=8),
    ))

    # Simple projection: average of last 2 months
    if len(revenues) >= 2:
        avg_recent = sum(revenues[-2:]) / 2
        last_month = months[-1]
        try:
            last_dt = datetime.strptime(last_month, "%Y-%m")
            next_month = (last_dt + timedelta(days=32)).strftime("%Y-%m")
            fig.add_trace(go.Scatter(
                x=[months[-1], next_month],
                y=[revenues[-1], avg_recent],
                mode="lines+markers",
                name="Projected",
                line=dict(color=PRIMARY, width=2, dash="dot"),
                marker=dict(size=8, symbol="diamond"),
            ))
        except ValueError:
            pass

    fig.update_layout(
        height=350,
        yaxis=dict(tickprefix="$", gridcolor=BORDER_DEFAULT),
        xaxis=dict(gridcolor=BORDER_DEFAULT),
        legend=dict(orientation="h", y=-0.15),
        hovermode="x unified",
    )

    return fig
