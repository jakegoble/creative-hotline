"""Sankey diagram for conversion flow visualization.

Shows how clients flow from Lead Source → Pipeline Status → Outcome.
"""

from __future__ import annotations

import plotly.graph_objects as go

from app.config import PIPELINE_STATUSES


# Outcome buckets
COMPLETED_STATUSES = {"Call Complete", "Follow-Up Sent"}
IN_PROGRESS_STATUSES = {"Intake Complete", "Ready for Call", "Booked - Needs Intake"}
EARLY_STATUSES = {"Lead - Laylo", "Paid - Needs Booking"}

# Colors
SOURCE_COLORS = {
    "IG DM": "rgba(255,107,53,0.5)",
    "IG Comment": "rgba(255,140,80,0.5)",
    "IG Story": "rgba(255,165,100,0.5)",
    "Meta Ad": "rgba(100,149,237,0.5)",
    "LinkedIn": "rgba(0,119,181,0.5)",
    "Website": "rgba(46,204,113,0.5)",
    "Referral": "rgba(155,89,182,0.5)",
    "Direct": "rgba(52,73,94,0.5)",
    "Unknown": "rgba(149,165,166,0.5)",
}


def render_sankey(payments: list[dict]) -> go.Figure:
    """Build a Sankey diagram showing client flow through the pipeline.

    Left nodes: Lead sources
    Middle nodes: Pipeline statuses
    Right nodes: Outcomes (Completed, In Progress, Stalled)
    """
    if not payments:
        fig = go.Figure()
        fig.update_layout(
            annotations=[dict(text="No data yet", showarrow=False,
                              xref="paper", yref="paper", x=0.5, y=0.5)],
            height=400,
        )
        return fig

    # Collect unique sources
    sources = sorted(set(
        p.get("lead_source") or "Unknown" for p in payments
    ))

    # Build node labels: sources + statuses + outcomes
    outcomes = ["Completed", "In Progress", "Stalled"]
    active_statuses = [
        s for s in PIPELINE_STATUSES
        if any(p.get("status") == s for p in payments)
    ]

    labels = sources + active_statuses + outcomes
    label_index = {label: i for i, label in enumerate(labels)}

    # Build links
    source_links = []  # source -> status
    status_links = []  # status -> outcome

    for p in payments:
        src = p.get("lead_source") or "Unknown"
        status = p.get("status", "")

        if src not in label_index or status not in label_index:
            continue

        source_links.append((label_index[src], label_index[status]))

        # Status -> Outcome
        if status in COMPLETED_STATUSES:
            status_links.append((label_index[status], label_index["Completed"]))
        elif status in IN_PROGRESS_STATUSES:
            status_links.append((label_index[status], label_index["In Progress"]))
        elif status in EARLY_STATUSES:
            status_links.append((label_index[status], label_index["Stalled"]))

    # Aggregate link weights
    link_counts: dict[tuple[int, int], int] = {}
    for link in source_links + status_links:
        link_counts[link] = link_counts.get(link, 0) + 1

    link_sources = [k[0] for k in link_counts]
    link_targets = [k[1] for k in link_counts]
    link_values = list(link_counts.values())

    # Color links by source
    link_colors = []
    for src_idx, _ in link_counts:
        if src_idx < len(sources):
            src_name = sources[src_idx]
            link_colors.append(SOURCE_COLORS.get(src_name, "rgba(200,200,200,0.3)"))
        else:
            link_colors.append("rgba(200,200,200,0.3)")

    # Node colors
    node_colors = []
    for label in labels:
        if label in SOURCE_COLORS:
            node_colors.append(SOURCE_COLORS[label].replace("0.5", "0.8"))
        elif label == "Completed":
            node_colors.append("rgba(46,204,113,0.8)")
        elif label == "In Progress":
            node_colors.append("rgba(255,165,0,0.8)")
        elif label == "Stalled":
            node_colors.append("rgba(231,76,60,0.8)")
        else:
            node_colors.append("rgba(149,165,166,0.8)")

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
        font=dict(size=12, family="system-ui, -apple-system, sans-serif"),
        margin=dict(l=10, r=10, t=10, b=10),
        height=450,
        paper_bgcolor="rgba(0,0,0,0)",
    )

    return fig
