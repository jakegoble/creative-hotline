"""Global Plotly template — import once in main.py to register.

Every chart automatically inherits fonts, colors, margins, grid styling.
Individual components only need to override what's chart-specific.

Design patterns from Linear, Stripe, Tremor:
- X-axis: no vertical grid (cleaner)
- Y-axis: dotted horizontal grid, barely visible
- Rounded bar corners (4px)
- Thicker line traces (2.5px)
- No tick marks, no zero lines
- Legend above chart, horizontal
"""

from __future__ import annotations

import plotly.graph_objects as go
import plotly.io as pio

from app.utils.design_tokens import (
    BG_CARD,
    BG_MUTED,
    BORDER_DEFAULT,
    CHART_COLORS,
    DARK_BG_CARD,
    DARK_BG_MUTED,
    DARK_BORDER_DEFAULT,
    DARK_TEXT_CAPTION,
    DARK_TEXT_MUTED,
    DARK_TEXT_PRIMARY,
    DARK_TEXT_SECONDARY,
    FONT_FAMILY,
    FONT_SIZE_MD,
    FONT_SIZE_SM,
    FONT_SIZE_XS,
    TEXT_CAPTION,
    TEXT_MUTED,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
)

_TEMPLATE = go.layout.Template(
    layout=go.Layout(
        font=dict(
            family=FONT_FAMILY,
            size=13,                    # Vercel body default
            color=TEXT_MUTED,           # Muted secondary for general chart text
        ),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=0, r=0, t=40, b=24),  # Tight margins, room for title only
        colorway=CHART_COLORS,
        hovermode="x unified",
        hoverlabel=dict(
            bgcolor=BG_CARD,
            bordercolor=BORDER_DEFAULT,
            font=dict(
                family=FONT_FAMILY,
                size=FONT_SIZE_SM,
                color=TEXT_PRIMARY,
            ),
            namelength=-1,
        ),
        xaxis=dict(
            showgrid=False,                     # No vertical grid (Stripe/Linear pattern)
            linecolor=BORDER_DEFAULT,
            linewidth=1,
            tickfont=dict(size=FONT_SIZE_XS, color=TEXT_CAPTION),
            ticklen=0,                          # No tick marks
            zeroline=False,
        ),
        yaxis=dict(
            showgrid=True,
            gridcolor="#F0EFED",                # Very light grid (barely visible)
            gridwidth=1,
            griddash="dot",                     # Dotted grid lines (premium pattern)
            linecolor="rgba(0,0,0,0)",          # No y-axis line
            linewidth=0,
            tickfont=dict(size=FONT_SIZE_XS, color=TEXT_CAPTION),
            ticklen=0,
            zeroline=False,
        ),
        bargap=0.35,                            # More breathing room between bars
        legend=dict(
            font=dict(size=FONT_SIZE_SM, color=TEXT_SECONDARY),
            bgcolor="rgba(0,0,0,0)",
            borderwidth=0,
            orientation="h",
            yanchor="bottom",
            y=1.06,                             # Legend above chart
            xanchor="left",
            x=0,
            itemsizing="constant",
            itemwidth=30,
        ),
        title=dict(
            font=dict(
                family=FONT_FAMILY,
                size=FONT_SIZE_MD,
                color=TEXT_PRIMARY,
            ),
            x=0,
            xanchor="left",
            pad=dict(l=0, t=0),
        ),
    ),
    data=dict(
        bar=[go.Bar(
            marker=dict(
                cornerradius=4,                 # Rounded bar corners (modern pattern)
                line=dict(width=0),             # No bar outlines
            ),
            opacity=0.9,
        )],
        scatter=[go.Scatter(
            line=dict(width=2.5, shape="spline"),  # Smoother curves
        )],
        pie=[go.Pie(
            hole=0.4,                           # Donut by default
            textinfo="label+percent",
            textfont=dict(size=12),
        )],
    ),
)

pio.templates["hotline"] = _TEMPLATE

# Dark variant — same structure, dark colors for text/grids/hover.
_DARK_TEMPLATE = go.layout.Template(
    layout=go.Layout(
        font=dict(
            family=FONT_FAMILY,
            size=13,
            color=DARK_TEXT_MUTED,
        ),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=0, r=0, t=40, b=24),
        colorway=CHART_COLORS,
        hovermode="x unified",
        hoverlabel=dict(
            bgcolor=DARK_BG_CARD,
            bordercolor=DARK_BORDER_DEFAULT,
            font=dict(
                family=FONT_FAMILY,
                size=FONT_SIZE_SM,
                color=DARK_TEXT_PRIMARY,
            ),
            namelength=-1,
        ),
        xaxis=dict(
            showgrid=False,
            linecolor=DARK_BORDER_DEFAULT,
            linewidth=1,
            tickfont=dict(size=FONT_SIZE_XS, color=DARK_TEXT_CAPTION),
            ticklen=0,
            zeroline=False,
        ),
        yaxis=dict(
            showgrid=True,
            gridcolor=DARK_BG_MUTED,
            gridwidth=1,
            griddash="dot",
            linecolor="rgba(0,0,0,0)",
            linewidth=0,
            tickfont=dict(size=FONT_SIZE_XS, color=DARK_TEXT_CAPTION),
            ticklen=0,
            zeroline=False,
        ),
        bargap=0.35,
        legend=dict(
            font=dict(size=FONT_SIZE_SM, color=DARK_TEXT_SECONDARY),
            bgcolor="rgba(0,0,0,0)",
            borderwidth=0,
            orientation="h",
            yanchor="bottom",
            y=1.06,
            xanchor="left",
            x=0,
            itemsizing="constant",
            itemwidth=30,
        ),
        title=dict(
            font=dict(
                family=FONT_FAMILY,
                size=FONT_SIZE_MD,
                color=DARK_TEXT_PRIMARY,
            ),
            x=0,
            xanchor="left",
            pad=dict(l=0, t=0),
        ),
    ),
    data=dict(
        bar=[go.Bar(
            marker=dict(cornerradius=4, line=dict(width=0)),
            opacity=0.9,
        )],
        scatter=[go.Scatter(
            line=dict(width=2.5, shape="spline"),
        )],
        pie=[go.Pie(
            hole=0.4,
            textinfo="label+percent",
            textfont=dict(size=12),
        )],
    ),
)

pio.templates["hotline_dark"] = _DARK_TEMPLATE
pio.templates.default = "hotline"
