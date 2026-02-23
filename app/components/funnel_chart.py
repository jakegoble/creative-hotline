"""Pipeline funnel visualization using Plotly."""

from __future__ import annotations

import plotly.graph_objects as go

from app.utils.design_tokens import BORDER_DEFAULT, PRIMARY


def render_funnel(stage_data: list[dict]) -> go.Figure:
    """Render a horizontal funnel chart.

    Args:
        stage_data: list of {"stage": str, "count": int}
    """
    stages = [d["stage"] for d in stage_data]
    counts = [d["count"] for d in stage_data]

    fig = go.Figure(go.Funnel(
        y=stages,
        x=counts,
        textposition="inside",
        textinfo="value+percent initial",
        marker=dict(
            color=[_gradient_color(i, len(stages)) for i in range(len(stages))],
        ),
        connector=dict(line=dict(color=BORDER_DEFAULT, width=1)),
    ))

    fig.update_layout(height=350)

    return fig


def _gradient_color(index: int, total: int) -> str:
    """Generate orange gradient from dark to light."""
    if total <= 1:
        return PRIMARY
    ratio = index / (total - 1)
    r = int(255 + (255 - 255) * ratio)
    g = int(107 + (212 - 107) * ratio)
    b = int(53 + (188 - 53) * ratio)
    return f"rgb({r},{g},{b})"
