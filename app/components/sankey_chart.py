"""Sankey diagram for conversion flow visualization.

Shows how clients flow from Lead Source -> Pipeline Status -> Outcome.
"""

from __future__ import annotations

import plotly.graph_objects as go

from app.config import PIPELINE_STATUSES
from app.utils.design_tokens import (
    CHANNEL_COLORS_MAP,
    DANGER,
    FONT_FAMILY,
    FONT_SIZE_SM,
    SUCCESS,
    TEXT_PRIMARY,
    WARNING,
    hex_to_rgba,
)


# Outcome buckets
COMPLETED_STATUSES = {"Call Complete", "Follow-Up Sent"}
IN_PROGRESS_STATUSES = {"Intake Complete", "Ready for Call", "Booked - Needs Intake"}
EARLY_STATUSES = {"Lead - Laylo", "Paid - Needs Booking"}

# Derive rgba colors from canonical channel map
SOURCE_COLORS = {ch: hex_to_rgba(c, 0.5) for ch, c in CHANNEL_COLORS_MAP.items()}


def render_sankey(payments: list[dict]) -> go.Figure:
    """Build a Sankey diagram showing client flow through the pipeline."""
    if not payments:
        fig = go.Figure()
        fig.update_layout(
            annotations=[dict(text="No data yet", showarrow=False,
                              xref="paper", yref="paper", x=0.5, y=0.5)],
            height=420,
        )
        return fig

    sources = sorted(set(
        p.get("lead_source") or "Unknown" for p in payments
    ))

    outcomes = ["Completed", "In Progress", "Stalled"]
    active_statuses = [
        s for s in PIPELINE_STATUSES
        if any(p.get("status") == s for p in payments)
    ]

    labels = sources + active_statuses + outcomes
    label_index = {label: i for i, label in enumerate(labels)}

    source_links = []
    status_links = []

    for p in payments:
        src = p.get("lead_source") or "Unknown"
        status = p.get("status", "")

        if src not in label_index or status not in label_index:
            continue

        source_links.append((label_index[src], label_index[status]))

        if status in COMPLETED_STATUSES:
            status_links.append((label_index[status], label_index["Completed"]))
        elif status in IN_PROGRESS_STATUSES:
            status_links.append((label_index[status], label_index["In Progress"]))
        elif status in EARLY_STATUSES:
            status_links.append((label_index[status], label_index["Stalled"]))

    link_counts: dict[tuple[int, int], int] = {}
    for link in source_links + status_links:
        link_counts[link] = link_counts.get(link, 0) + 1

    link_sources = [k[0] for k in link_counts]
    link_targets = [k[1] for k in link_counts]
    link_values = list(link_counts.values())

    _fallback_link = "rgba(200,200,200,0.3)"
    link_colors = []
    for src_idx, _ in link_counts:
        if src_idx < len(sources):
            src_name = sources[src_idx]
            link_colors.append(SOURCE_COLORS.get(src_name, _fallback_link))
        else:
            link_colors.append(_fallback_link)

    _node_fallback = hex_to_rgba(CHANNEL_COLORS_MAP["Unknown"], 0.8)
    node_colors = []
    for label in labels:
        if label in CHANNEL_COLORS_MAP:
            node_colors.append(hex_to_rgba(CHANNEL_COLORS_MAP[label], 0.8))
        elif label == "Completed":
            node_colors.append(hex_to_rgba(SUCCESS, 0.8))
        elif label == "In Progress":
            node_colors.append(hex_to_rgba(WARNING, 0.8))
        elif label == "Stalled":
            node_colors.append(hex_to_rgba(DANGER, 0.8))
        else:
            node_colors.append(_node_fallback)

    fig = go.Figure(go.Sankey(
        arrangement="snap",
        node=dict(
            pad=20,
            thickness=20,
            label=labels,
            color=node_colors,
        ),
        link=dict(
            source=link_sources,
            target=link_targets,
            value=link_values,
            color=link_colors,
        ),
    ))

    fig.update_layout(
        margin=dict(l=10, r=10, t=10, b=10),
        height=420,
    )

    fig.update_traces(
        textfont=dict(size=FONT_SIZE_SM, color=TEXT_PRIMARY, family=FONT_FAMILY),
    )

    return fig
