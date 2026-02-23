"""Pipeline funnel visualization using Plotly."""

import plotly.graph_objects as go

COLOR_PRIMARY = "#FF6B35"


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
        connector=dict(line=dict(color="#e0e0e0", width=1)),
    ))

    fig.update_layout(
        margin=dict(l=0, r=0, t=10, b=10),
        height=350,
        font=dict(family="system-ui, -apple-system, sans-serif"),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
    )

    return fig


def _gradient_color(index: int, total: int) -> str:
    """Generate orange gradient from dark to light."""
    if total <= 1:
        return COLOR_PRIMARY
    ratio = index / (total - 1)
    # Blend from #FF6B35 (dark orange) to #FFD4BC (light peach)
    r = int(255 + (255 - 255) * ratio)
    g = int(107 + (212 - 107) * ratio)
    b = int(53 + (188 - 53) * ratio)
    return f"rgb({r},{g},{b})"
