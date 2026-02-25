"""Retargeting & Segments — segment builder + re-engagement queue."""

from __future__ import annotations

import streamlit as st

from app.utils.segment_builder import build_all_segments, segment_summary
from app.utils.lead_scorer import score_all_clients, get_tier_color
from app.components.segment_cards import render_segment_cards, render_segment_detail
from app.utils.formatters import format_currency
from html import escape

from app.utils.ui import page_header, section_header, metric_row, empty_state, badge


def render():
    page_header("Retargeting & Segments", "Segment builder and re-engagement queue.")

    notion = st.session_state.get("notion")
    if not notion:
        st.warning("Notion not connected. Add NOTION_API_KEY to .env.")
        return

    payments = notion.get_all_payments()
    if not payments:
        st.info("No payment data yet.")
        return

    merged = notion.get_merged_clients()
    scored = score_all_clients(merged)

    segments = build_all_segments(payments, scores=scored)
    summary = segment_summary(segments)

    # ── Summary Bar ───────────────────────────────────────────────

    metric_row([
        {"label": "Total in Segments", "value": summary["total_clients"]},
        {"label": "Potential Revenue", "value": format_currency(summary["total_value"])},
        {"label": "High Priority", "value": summary["by_priority"].get("high", 0)},
        {"label": "Segments Active", "value": sum(1 for s in segments if s.count > 0)},
    ])


    # ── Segment Overview Cards ────────────────────────────────────

    section_header("Segment Overview")
    render_segment_cards(segments)


    # ── Segment Detail ────────────────────────────────────────────

    section_header("Segment Detail")

    segment_names = [s.name for s in segments]
    selected = st.selectbox("Select a segment", options=segment_names)

    selected_seg = next((s for s in segments if s.name == selected), None)
    if selected_seg:
        render_segment_detail(selected_seg, scored_clients=scored)


    # ── Re-engagement Queue ───────────────────────────────────────

    section_header("Re-engagement Queue", "Priority contacts to reach out to today, sorted by score and recency.")

    # Collect all segment clients into a flat list, dedupe by email
    queue: dict[str, dict] = {}
    for seg in segments:
        if seg.priority != "high":
            continue
        for client in seg.clients:
            email = client.get("email", "")
            if email and email not in queue:
                queue[email] = {
                    "client": client,
                    "segment": seg.name,
                    "action": seg.action,
                }

    if not queue:
        empty_state("No high-priority re-engagement targets right now.")
    else:
        # Look up scores
        score_map = {}
        for sc in scored:
            email = (sc.get("payment", {}).get("email") or "").lower()
            if email:
                score_map[email] = sc.get("score", {}).get("total", 0)

        # Sort by score descending
        sorted_queue = sorted(
            queue.items(),
            key=lambda x: score_map.get(x[0].lower(), 0),
            reverse=True,
        )

        items_html = ""
        for email, info in sorted_queue:
            client = info["client"]
            name = client.get("client_name") or email
            score = score_map.get(email.lower(), 0)
            tier_color = get_tier_color(
                "Hot" if score >= 80 else "Warm" if score >= 50 else "Cool" if score >= 25 else "Cold"
            )
            items_html += (
                f'<div class="ch-feed-item">'
                f'<div class="ch-feed-dot" style="background:{tier_color}"></div>'
                f'<div class="ch-feed-content">'
                f'<div class="ch-feed-title">{escape(name)}</div>'
                f'<div class="ch-feed-subtitle">{escape(email)}</div>'
                f'</div>'
                f'<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'
                f'{badge(f"{score}/100", color=tier_color)}'
                f'<span class="ch-text-xs ch-text-muted">{escape(info["segment"])}</span>'
                f'</div>'
                f'</div>'
            )
        st.markdown(
            f'<div class="ch-card" style="padding:0;overflow:hidden">'
            f'<div class="ch-feed">{items_html}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )


    # ── Win-Back Analysis ─────────────────────────────────────────

    section_header("Win-Back Analysis")
    claude = st.session_state.get("claude")
    if not claude:
        st.info("Add ANTHROPIC_API_KEY to .env for AI win-back analysis.")
        return

    stale_segments = [s for s in segments if s.name in ("Stale Leads", "Window Shoppers")]
    stale_count = sum(s.count for s in stale_segments)

    if stale_count == 0:
        st.success("No stale leads right now — great job keeping the pipeline moving!")
        return

    if st.button("Generate Win-Back Strategy", type="primary"):
        context_lines = []
        for seg in stale_segments:
            context_lines.append(f"- {seg.name}: {seg.count} clients")
            for c in seg.clients[:5]:
                source = c.get("lead_source", "unknown")
                status = c.get("status", "")
                context_lines.append(f"  - {c.get('email', '?')} (source: {source}, status: {status})")

        prompt = (
            "You are Frankie, the Creative Hotline's brand voice — warm, witty, confident, zero buzzwords. "
            "You have stale leads who showed interest but haven't converted. "
            "Analyze these segments and suggest specific win-back messaging and tactics. "
            "Give me 3 concrete re-engagement approaches, each with a sample DM or email hook.\n\n"
            "Stale segments:\n" + "\n".join(context_lines)
        )

        with st.spinner("Frankie is crafting your win-back strategy..."):
            analysis = claude.generate_text(prompt)
        st.session_state["winback_analysis"] = analysis

    if "winback_analysis" in st.session_state:
        st.markdown(st.session_state["winback_analysis"])
