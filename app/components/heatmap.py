"""Activity heatmap — time-of-day x day-of-week visualization.

Shows when clients are paying and booking, useful for ad scheduling.
"""

from __future__ import annotations

from datetime import datetime

import plotly.graph_objects as go

from app.utils.design_tokens import BG_MUTED, PRIMARY, PRIMARY_LIGHT


DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
HOURS = list(range(24))
HOUR_LABELS = [f"{h:02d}:00" for h in HOURS]


def render_activity_heatmap(
    events: list[dict],
    date_field: str = "created",
    title: str = "Activity Heatmap",
) -> go.Figure:
    """Render a time-of-day x day-of-week heatmap.

    Args:
        events: List of dicts with a date field containing ISO datetime strings.
        date_field: The key to extract datetime from each event.
        title: Chart title.
    """
    matrix = [[0 for _ in range(24)] for _ in range(7)]

    for event in events:
        date_str = event.get(date_field, "")
        if not date_str:
            continue
        try:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            day = dt.weekday()
            hour = dt.hour
            matrix[day][hour] += 1
        except (ValueError, TypeError):
            continue

    if all(all(v == 0 for v in row) for row in matrix):
        fig = go.Figure()
        fig.update_layout(
            annotations=[dict(text="No activity data yet", showarrow=False,
                              xref="paper", yref="paper", x=0.5, y=0.5)],
            height=350,
        )
        return fig

    fig = go.Figure(go.Heatmap(
        z=matrix,
        x=HOUR_LABELS,
        y=DAYS_OF_WEEK,
        colorscale=[
            [0, BG_MUTED],
            [0.25, "#FFD4B8"],
            [0.5, PRIMARY_LIGHT],
            [0.75, "#FF8C50"],
            [1.0, PRIMARY],
        ],
        hovertemplate="%{y} %{x}: %{z} events<extra></extra>",
        showscale=True,
        colorbar=dict(title="Events", thickness=15),
    ))

    fig.update_layout(
        height=350,
        title=dict(text=title, font=dict(size=14)),
        xaxis=dict(dtick=3),
        yaxis=dict(autorange="reversed"),
    )

    return fig
