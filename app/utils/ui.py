"""Shared UI component library for the Creative Hotline Command Center.

Every page imports from here instead of building inline HTML.
All rendering uses st.markdown(unsafe_allow_html=True) with CSS classes
defined in theme.py.
"""

from __future__ import annotations

from html import escape

import streamlit as st

from app.utils import design_tokens as t


# ── Page & Section Headers ─────────────────────────────────────────


def page_header(title: str, description: str = "") -> None:
    """Render a page-level header with optional description."""
    desc_html = f"<p>{escape(description)}</p>" if description else ""
    st.markdown(
        f'<div class="ch-page-header">'
        f"<h1>{escape(title)}</h1>"
        f"{desc_html}"
        f"</div>",
        unsafe_allow_html=True,
    )


def section_header(title: str, description: str = "") -> None:
    """Render a section header (h3) with optional description."""
    desc_html = f"<p>{escape(description)}</p>" if description else ""
    st.markdown(
        f'<div class="ch-section-header">'
        f"<h3>{escape(title)}</h3>"
        f"{desc_html}"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── Cards ──────────────────────────────────────────────────────────


def stat_card(
    label: str,
    value: str,
    subtitle: str = "",
    accent_color: str = "",
) -> None:
    """Render an accent-bordered stat card (left accent by default)."""
    style = f' style="--accent-color:{accent_color}"' if accent_color else ""
    color_style = f' style="color:{accent_color}"' if accent_color else ""
    sub = (
        f'<div class="ch-text-sm ch-text-muted ch-mt-sm">{escape(subtitle)}</div>'
        if subtitle
        else ""
    )
    st.markdown(
        f'<div class="ch-card ch-card--accent-left"{style}>'
        f'<div class="ch-text-sm ch-text-muted ch-uppercase">{escape(label)}</div>'
        f'<div class="ch-text-2xl ch-font-bold"{color_style}>{escape(value)}</div>'
        f"{sub}"
        f"</div>",
        unsafe_allow_html=True,
    )


def stat_card_top(
    label: str,
    value: str,
    subtitle: str = "",
    accent_color: str = "",
) -> None:
    """Render a stat card with top accent border."""
    style = f' style="--accent-color:{accent_color}"' if accent_color else ""
    color_style = f' style="color:{accent_color}"' if accent_color else ""
    sub = (
        f'<div class="ch-text-sm ch-text-muted ch-mt-sm">{escape(subtitle)}</div>'
        if subtitle
        else ""
    )
    st.markdown(
        f'<div class="ch-card ch-card--accent-top"{style}>'
        f'<div class="ch-text-sm ch-text-muted ch-uppercase">{escape(label)}</div>'
        f'<div class="ch-text-2xl ch-font-bold"{color_style}>{escape(value)}</div>'
        f"{sub}"
        f"</div>",
        unsafe_allow_html=True,
    )


def data_card(
    title: str,
    body_html: str,
    accent_color: str = "",
) -> None:
    """Render a card with a title and arbitrary HTML body.

    Unlike stat_card, body_html is NOT escaped — caller is responsible
    for building safe HTML (typically from other ui.* helpers).
    """
    style = f' style="--accent-color:{accent_color}"' if accent_color else ""
    accent_cls = " ch-card--accent-left" if accent_color else ""
    st.markdown(
        f'<div class="ch-card{accent_cls}"{style}>'
        f'<div class="ch-text-sm ch-font-semibold ch-mb-sm">{escape(title)}</div>'
        f"{body_html}"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── Metric Row ─────────────────────────────────────────────────────


def metric_row(metrics: list[dict]) -> None:
    """Render a row of metric cards using st.metric inside st.columns.

    Each dict: {label, value, delta?, help?}
    """
    cols = st.columns(len(metrics))
    for col, m in zip(cols, metrics):
        with col:
            delta = m.get("delta")
            delta_str = None
            if delta is not None:
                if isinstance(delta, float):
                    delta_str = f"{delta:+.1f}%"
                else:
                    delta_str = str(delta)
            st.metric(
                label=m["label"],
                value=m["value"],
                delta=delta_str,
                help=m.get("help"),
            )


# ── Badge / Pill ───────────────────────────────────────────────────


def badge(
    text: str,
    color: str = t.PRIMARY,
    variant: str = "filled",
) -> str:
    """Return HTML string for an inline badge. Call with st.markdown().

    Returns the HTML string so it can be composed into larger HTML blocks.
    For standalone use, wrap in st.markdown(..., unsafe_allow_html=True).
    """
    if variant == "outline":
        return (
            f'<span class="ch-badge ch-badge--outline" '
            f'style="color:{color};border-color:{color}">'
            f"{escape(text)}</span>"
        )
    return (
        f'<span class="ch-badge" style="background:{color};color:white">'
        f"{escape(text)}</span>"
    )


def render_badge(
    text: str,
    color: str = t.PRIMARY,
    variant: str = "filled",
) -> None:
    """Render a badge directly (calls st.markdown)."""
    st.markdown(badge(text, color, variant), unsafe_allow_html=True)


# ── Progress Bar ───────────────────────────────────────────────────


def progress_bar(
    value: float,
    max_val: float,
    color: str = t.PRIMARY,
    label: str = "",
    show_value: bool = False,
) -> None:
    """Render a thin inline progress bar with optional label."""
    pct = min(value / max_val * 100, 100) if max_val > 0 else 0
    label_html = ""
    if label or show_value:
        val_text = f"{value:.0f}/{max_val:.0f}" if show_value else ""
        label_html = (
            f'<div class="ch-flex-between ch-mb-sm">'
            f'<span class="ch-text-sm ch-font-semibold">{escape(label)}</span>'
            f'<span class="ch-text-xs ch-text-muted">{val_text}</span>'
            f"</div>"
        )
    st.markdown(
        f"{label_html}"
        f'<div class="ch-progress">'
        f'<div class="ch-progress-fill" style="width:{pct:.1f}%;background:{color}"></div>'
        f"</div>",
        unsafe_allow_html=True,
    )


# ── Key-Value Display ──────────────────────────────────────────────


def key_value(label: str, value: str) -> None:
    """Render a label: value pair in a clean format."""
    st.markdown(
        f'<div class="ch-kv">'
        f'<span class="ch-kv-label">{escape(label)}</span>'
        f'<span class="ch-kv-value">{escape(str(value))}</span>'
        f"</div>",
        unsafe_allow_html=True,
    )


def key_value_inline(label: str, value: str) -> None:
    """Render a simple bold label: value inline."""
    st.markdown(f"**{escape(label)}:** {escape(str(value))}")


# ── Empty State ────────────────────────────────────────────────────


def empty_state(message: str, icon: str = "") -> None:
    """Render a centered empty state with optional icon."""
    icon_html = (
        f'<div class="ch-empty-icon">{icon}</div>' if icon else ""
    )
    st.markdown(
        f'<div class="ch-empty">'
        f"{icon_html}"
        f'<div class="ch-empty-message">{escape(message)}</div>'
        f"</div>",
        unsafe_allow_html=True,
    )
