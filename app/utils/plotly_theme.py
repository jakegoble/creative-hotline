"""Global Plotly template — import once in main.py to register.

Every chart automatically inherits fonts, colors, margins, grid styling.
Individual components only need to override what's chart-specific.
"""

from __future__ import annotations

import plotly.graph_objects as go
import plotly.io as pio

from app.utils.design_tokens import (
    BG_CARD,
    BG_MUTED,
    BORDER_DEFAULT,
    CHART_COLORS,
    FONT_FAMILY,
    FONT_SIZE_MD,
    FONT_SIZE_SM,
    FONT_SIZE_XS,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
)

_TEMPLATE = go.layout.Template(
    layout=go.Layout(
        font=dict(
            family=FONT_FAMILY,
            size=FONT_SIZE_MD,
            color=TEXT_SECONDARY,
        ),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=8, r=8, t=36, b=28),
        colorway=CHART_COLORS,
        hoverlabel=dict(
            bgcolor=BG_CARD,
            bordercolor=BORDER_DEFAULT,
            font=dict(
                family=FONT_FAMILY,
                size=FONT_SIZE_SM,
                color=TEXT_PRIMARY,
            ),
        ),
        xaxis=dict(
            gridcolor=BG_MUTED,
            gridwidth=1,
            linecolor=BORDER_DEFAULT,
            zerolinecolor=BORDER_DEFAULT,
            tickfont=dict(size=FONT_SIZE_XS, color=TEXT_SECONDARY),
        ),
        yaxis=dict(
            gridcolor=BG_MUTED,
            gridwidth=1,
            linecolor=BORDER_DEFAULT,
            zerolinecolor=BORDER_DEFAULT,
            tickfont=dict(size=FONT_SIZE_XS, color=TEXT_SECONDARY),
        ),
        bargap=0.3,
        legend=dict(
            font=dict(size=FONT_SIZE_SM, color=TEXT_SECONDARY),
            bgcolor="rgba(0,0,0,0)",
            borderwidth=0,
            orientation="h",
            yanchor="bottom",
            y=1.02,
        ),
        title=dict(
            font=dict(
                family=FONT_FAMILY,
                size=FONT_SIZE_MD,
                color=TEXT_PRIMARY,
            ),
            x=0,
            xanchor="left",
        ),
    )
)

pio.templates["hotline"] = _TEMPLATE
pio.templates.default = "hotline"
