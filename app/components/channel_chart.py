"""Multi-metric channel comparison charts.

Provides grouped bar and radar charts for comparing lead sources.
"""

from __future__ import annotations

import plotly.graph_objects as go

from app.config import LEAD_SOURCES
from app.utils.design_tokens import CHANNEL_COLORS_MAP, FONT_SIZE_XS, hex_to_rgba

CHANNEL_COLORS = CHANNEL_COLORS_MAP


def render_channel_bars(channel_metrics: dict[str, dict]) -> go.Figure:
    """Grouped bar chart comparing channels across metrics."""
    if not channel_metrics:
        fig = go.Figure()
        fig.update_layout(
            annotations=[dict(text="No channel data", showarrow=False,
                              xref="paper", yref="paper", x=0.5, y=0.5)],
            height=350,
        )
        return fig

    channels = list(channel_metrics.keys())
    colors = [CHANNEL_COLORS.get(ch, CHANNEL_COLORS["Unknown"]) for ch in channels]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        name="Revenue ($)",
        x=channels,
        y=[m.get("revenue", 0) for m in channel_metrics.values()],
        marker_color=[c for c in colors],
        text=[f"${m.get('revenue', 0):,.0f}" for m in channel_metrics.values()],
        textposition="outside",
    ))

    fig.update_layout(
        barmode="group",
        height=350,
        yaxis=dict(tickprefix="$"),
        xaxis_tickangle=-45,
        showlegend=False,
    )

    return fig


def render_channel_radar(channel_metrics: dict[str, dict]) -> go.Figure:
    """Radar/spider chart comparing channels on normalized metrics."""
    if not channel_metrics:
        fig = go.Figure()
        fig.update_layout(
            annotations=[dict(text="No data", showarrow=False,
                              xref="paper", yref="paper", x=0.5, y=0.5)],
            height=400,
        )
        return fig

    categories = ["Lead Volume", "Conversion Rate", "Revenue", "Avg Score", "Deal Size"]

    metrics = list(channel_metrics.values())
    max_leads = max((m.get("leads", 0) for m in metrics), default=1) or 1
    max_revenue = max((m.get("revenue", 0) for m in metrics), default=1) or 1
    max_score = max((m.get("avg_score", 0) for m in metrics), default=1) or 1
    max_deal = max((m.get("avg_deal_size", 0) for m in metrics), default=1) or 1

    fig = go.Figure()

    for channel, m in channel_metrics.items():
        values = [
            m.get("leads", 0) / max_leads * 100,
            m.get("conversion_rate", 0),
            m.get("revenue", 0) / max_revenue * 100,
            m.get("avg_score", 0) / max_score * 100,
            m.get("avg_deal_size", 0) / max_deal * 100,
        ]
        values.append(values[0])

        color = CHANNEL_COLORS.get(channel, CHANNEL_COLORS["Unknown"])
        fig.add_trace(go.Scatterpolar(
            r=values,
            theta=categories + [categories[0]],
            fill="toself",
            name=channel,
            line=dict(color=color),
            fillcolor=hex_to_rgba(color, 0.3) if "#" in color else color,
        ))

    fig.update_layout(
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 100], showticklabels=False),
            angularaxis=dict(tickfont=dict(size=FONT_SIZE_XS)),
        ),
        height=400,
        margin=dict(l=40, r=40, t=30, b=30),
        legend=dict(orientation="h", y=-0.1),
    )

    return fig


def render_revenue_by_source(revenue_data: dict[str, dict[str, float]]) -> go.Figure:
    """Stacked area chart of revenue by source over time."""
    if not revenue_data:
        fig = go.Figure()
        fig.update_layout(
            annotations=[dict(text="No revenue data", showarrow=False,
                              xref="paper", yref="paper", x=0.5, y=0.5)],
            height=350,
        )
        return fig

    months = sorted(revenue_data.keys())
    all_sources = set()
    for monthly in revenue_data.values():
        all_sources.update(monthly.keys())

    fig = go.Figure()
    for source in sorted(all_sources):
        values = [revenue_data.get(m, {}).get(source, 0) for m in months]
        color = CHANNEL_COLORS.get(source, CHANNEL_COLORS["Unknown"])
        fig.add_trace(go.Scatter(
            x=months,
            y=values,
            mode="lines",
            name=source,
            stackgroup="revenue",
            line=dict(color=color),
            hovertemplate="%{x}: $%{y:,.0f}<extra>" + source + "</extra>",
        ))

    fig.update_layout(
        height=350,
        yaxis=dict(tickprefix="$"),
        legend=dict(orientation="h", y=-0.15),
        hovermode="x unified",
    )

    return fig
