"""Visual segment cards for retargeting display.

Renders styled cards showing segment name, count, priority, and suggested action.
"""

from __future__ import annotations

import streamlit as st

from app.utils import design_tokens as t
from app.utils.formatters import format_currency
from html import escape

from app.utils.ui import badge, empty_state


PRIORITY_COLORS = {
    "high": t.DANGER,
    "medium": t.PRIMARY,
    "low": t.BORDER_STRONG,
}

PRIORITY_LABELS = {
    "high": "HIGH",
    "medium": "MED",
    "low": "LOW",
}


def render_segment_cards(segments: list) -> None:
    """Render segment overview cards in a 3-column grid."""
    if not segments:
        empty_state("No segments to display.")
        return

    cols = st.columns(3)
    for i, seg in enumerate(segments):
        col = cols[i % 3]
        with col:
            _render_card(seg)


def render_segment_detail(segment, scored_clients: list[dict] | None = None) -> None:
    """Render detailed view of a single segment with client list."""
    if not segment:
        return

    color = PRIORITY_COLORS.get(segment.priority, t.BORDER_STRONG)

    st.markdown(
        f'<div class="ch-card ch-card--accent-left" style="--accent-color:{color}">'
        f'<div class="ch-text-lg ch-font-bold">{segment.name}</div>'
        f'<div class="ch-text-sm ch-text-secondary ch-mt-sm">{segment.description}</div>'
        f'<div class="ch-text-sm ch-font-semibold ch-mt-sm" style="color:{color}">'
        f'Action: {segment.action}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    if not segment.clients:
        st.caption("No clients in this segment right now.")
        return

    score_map = {}
    if scored_clients:
        for sc in scored_clients:
            email = (sc.get("payment", {}).get("email") or "").lower()
            if email:
                score_map[email] = sc.get("score", {}).get("total", 0)

    items_html = ""
    for client in segment.clients:
        name = client.get("client_name") or client.get("email", "Unknown")
        email = client.get("email", "")
        status = client.get("status", "")
        amount = client.get("payment_amount", 0)
        score = score_map.get(email.lower(), "\u2014")
        items_html += (
            f'<div class="ch-feed-item">'
            f'<div class="ch-feed-dot" style="background:{color}"></div>'
            f'<div class="ch-feed-content">'
            f'<div class="ch-feed-title">{escape(name)}</div>'
            f'<div class="ch-feed-subtitle">{escape(email)}</div>'
            f'</div>'
            f'<div class="ch-text-xs ch-text-muted" style="flex-shrink:0">'
            f'{escape(status)} &middot; {format_currency(amount)} &middot; Score: {score}'
            f'</div>'
            f'</div>'
        )

    st.markdown(
        f'<div class="ch-card" style="padding:0;overflow:hidden">'
        f'<div class="ch-feed">{items_html}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )
    st.caption(f"{segment.count} clients | Est. value: {format_currency(segment.estimated_value)}")


def _render_card(segment) -> None:
    """Render a single segment card."""
    color = PRIORITY_COLORS.get(segment.priority, t.BORDER_STRONG)
    badge_label = PRIORITY_LABELS.get(segment.priority, "")

    top_names = []
    for c in segment.clients[:3]:
        name = c.get("client_name") or c.get("email", "?").split("@")[0]
        top_names.append(name)
    names_html = ", ".join(top_names) if top_names else "\u2014"
    if segment.count > 3:
        names_html += f" +{segment.count - 3} more"

    st.markdown(
        f'<div class="ch-card ch-card--accent-top" style="--accent-color:{color}">'
        f'<div class="ch-flex-between">'
        f'<span class="ch-font-bold" style="font-size:{t.FONT_SIZE_LG}px">{segment.name}</span>'
        f'{badge(badge_label, color)}'
        f'</div>'
        f'<div class="ch-text-2xl ch-font-bold ch-mt-sm" style="color:{color}">'
        f'{segment.count}</div>'
        f'<div class="ch-text-xs ch-text-muted">clients</div>'
        f'<div class="ch-text-xs ch-text-secondary ch-mt-sm">{names_html}</div>'
        f'<div class="ch-text-xs ch-text-muted ch-mt-sm">'
        f'Est. value: {format_currency(segment.estimated_value)}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )
