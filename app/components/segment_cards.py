"""Visual segment cards for retargeting display.

Renders styled cards showing segment name, count, priority, and suggested action.
"""

from __future__ import annotations

import streamlit as st

from app.utils.formatters import format_currency


PRIORITY_COLORS = {
    "high": "#E74C3C",
    "medium": "#FF6B35",
    "low": "#95A5A6",
}

PRIORITY_LABELS = {
    "high": "HIGH",
    "medium": "MED",
    "low": "LOW",
}


def render_segment_cards(segments: list) -> None:
    """Render segment overview cards in a 3-column grid.

    Args:
        segments: List of Segment objects from segment_builder.
    """
    if not segments:
        st.info("No segments to display.")
        return

    # 3-column layout
    cols = st.columns(3)
    for i, seg in enumerate(segments):
        col = cols[i % 3]
        with col:
            _render_card(seg)


def render_segment_detail(segment, scored_clients: list[dict] | None = None) -> None:
    """Render detailed view of a single segment with client list.

    Args:
        segment: A Segment object from segment_builder.
        scored_clients: Optional scored client list for showing scores.
    """
    if not segment:
        return

    color = PRIORITY_COLORS.get(segment.priority, "#95A5A6")

    st.markdown(
        f'<div style="border-left:4px solid {color}; padding:12px 16px; '
        f'background:#faf8f5; border-radius:4px; margin-bottom:16px;">'
        f'<div style="font-size:18px; font-weight:bold;">{segment.name}</div>'
        f'<div style="font-size:13px; color:#666; margin-top:4px;">{segment.description}</div>'
        f'<div style="font-size:13px; color:{color}; margin-top:8px; font-weight:600;">'
        f'Action: {segment.action}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    if not segment.clients:
        st.caption("No clients in this segment right now.")
        return

    # Build score lookup if available
    score_map = {}
    if scored_clients:
        for sc in scored_clients:
            email = (sc.get("payment", {}).get("email") or "").lower()
            if email:
                score_map[email] = sc.get("score", {}).get("total", 0)

    # Client table
    for client in segment.clients:
        name = client.get("client_name") or client.get("email", "Unknown")
        email = client.get("email", "")
        status = client.get("status", "")
        amount = client.get("payment_amount", 0)
        score = score_map.get(email.lower(), "—")

        c1, c2, c3, c4 = st.columns([3, 2, 2, 1])
        with c1:
            st.markdown(f"**{name}**")
            st.caption(email)
        with c2:
            st.caption(f"Status: {status}")
        with c3:
            st.caption(f"Amount: {format_currency(amount)}")
        with c4:
            st.caption(f"Score: {score}")

    st.caption(f"{segment.count} clients | Est. value: {format_currency(segment.estimated_value)}")


def _render_card(segment) -> None:
    """Render a single segment card."""
    color = PRIORITY_COLORS.get(segment.priority, "#95A5A6")
    badge_label = PRIORITY_LABELS.get(segment.priority, "")

    # Top 3 client names
    top_names = []
    for c in segment.clients[:3]:
        name = c.get("client_name") or c.get("email", "?").split("@")[0]
        top_names.append(name)
    names_html = ", ".join(top_names) if top_names else "—"
    if segment.count > 3:
        names_html += f" +{segment.count - 3} more"

    st.markdown(
        f'<div style="border:1px solid #e0e0e0; border-top:3px solid {color}; '
        f'border-radius:8px; padding:16px; margin-bottom:12px; background:white;">'
        f'<div style="display:flex; justify-content:space-between; align-items:center;">'
        f'<span style="font-size:15px; font-weight:bold;">{segment.name}</span>'
        f'<span style="background:{color}; color:white; padding:1px 8px; '
        f'border-radius:10px; font-size:10px; font-weight:bold;">{badge_label}</span>'
        f'</div>'
        f'<div style="font-size:28px; font-weight:bold; margin:8px 0; color:{color};">'
        f'{segment.count}</div>'
        f'<div style="font-size:12px; color:#888;">clients</div>'
        f'<div style="font-size:12px; color:#666; margin-top:8px;">{names_html}</div>'
        f'<div style="font-size:11px; color:#888; margin-top:8px;">'
        f'Est. value: {format_currency(segment.estimated_value)}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )
