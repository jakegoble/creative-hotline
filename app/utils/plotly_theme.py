"""Global Plotly template — import once in main.py to register.

Every chart automatically inherits fonts, colors, margins, grid styling.
Individual components only need to override what's chart-specific.
"""

from __future__ import annotations

import plotly.graph_objects as go
import plotly.io as pio

from app.utils.design_tokens import (
    BG_CARD,
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
        margin=dict(l=0, r=0, t=30, b=20),
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
            gridcolor=BORDER_DEFAULT,
            gridwidth=1,
            linecolor=BORDER_DEFAULT,
            zerolinecolor=BORDER_DEFAULT,
            tickfont=dict(size=FONT_SIZE_XS),
        ),
        yaxis=dict(
            gridcolor=BORDER_DEFAULT,
            gridwidth=1,
            linecolor=BORDER_DEFAULT,
            zerolinecolor=BORDER_DEFAULT,
            tickfont=dict(size=FONT_SIZE_XS),
        ),
        bargap=0.3,
        legend=dict(
            font=dict(size=FONT_SIZE_SM),
            bgcolor="rgba(0,0,0,0)",
            borderwidth=0,
            orientation="h",
            yanchor="bottom",
            y=1.02,
        ),
    )
)

pio.templates["hotline"] = _TEMPLATE
pio.templates.default = "hotline"
