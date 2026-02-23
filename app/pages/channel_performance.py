"""Channel Performance Dashboard — attribution, ROI, and channel comparison."""

from __future__ import annotations

import streamlit as st
import plotly.graph_objects as go

from app.utils.attribution import (
    attribute_conversions,
    compare_models,
    channel_roi,
    get_revenue_by_source_over_time,
    ATTRIBUTION_MODELS,
)
from app.utils.lead_scorer import score_all_clients, get_tier_color
from app.components.channel_chart import (
    render_channel_bars,
    render_channel_radar,
    render_revenue_by_source,
    CHANNEL_COLORS,
)
from app.components.heatmap import render_activity_heatmap
from app.utils.formatters import format_currency, format_percentage
from app.utils import design_tokens as t
from app.utils.ui import page_header, section_header, stat_card, empty_state


def render():
    page_header("Channel Performance", "Attribution, ROI, and channel comparison across lead sources.")

    notion = st.session_state.get("notion")
    if not notion:
        st.warning("Notion not connected. Add NOTION_API_KEY to .env.")
        return

    payments = notion.get_all_payments()
    if not payments:
        empty_state("No payment data yet.")
        return

    merged = notion.get_merged_clients()
    scored = score_all_clients(merged)

    # ── Channel ROI Cards ─────────────────────────────────────────

    section_header("Channel ROI Overview")

    roi_data = channel_roi(payments)
    if roi_data:
        # Build score averages per channel
        source_scores: dict[str, list[int]] = {}
        for item in scored:
            src = item["payment"].get("lead_source") or "Unknown"
            source_scores.setdefault(src, []).append(item["score"]["total"])

        cols = st.columns(min(len(roi_data), 4))
        for i, ch in enumerate(roi_data[:4]):
            with cols[i]:
                color = CHANNEL_COLORS.get(ch["channel"], "#95A5A6")
                avg_score = 0
                if ch["channel"] in source_scores:
                    scores = source_scores[ch["channel"]]
                    avg_score = sum(scores) / len(scores)

                stat_card(
                    label=ch["channel"],
                    value=format_currency(ch["revenue"]),
                    subtitle=(
                        f"{ch['leads']} leads \u00b7 {ch['conversions']} converted \u00b7 "
                        f"{format_percentage(ch['conversion_rate'])} rate \u00b7 "
                        f"Avg score: {avg_score:.0f} \u00b7 Deal: {format_currency(ch['avg_deal_size'])}"
                    ),
                    accent_color=color,
                )

        # Show remaining channels if > 4
        if len(roi_data) > 4:
            with st.expander(f"+ {len(roi_data) - 4} more channels"):
                for ch in roi_data[4:]:
                    st.markdown(
                        f"**{ch['channel']}** \u2014 {ch['leads']} leads, "
                        f"{ch['conversions']} converted, {format_currency(ch['revenue'])}"
                    )

    st.divider()

    # ── Attribution Model Comparison ──────────────────────────────

    section_header("Attribution Model Comparison", "See how different models attribute revenue credit across channels.")

    model_choice = st.selectbox(
        "Attribution Model",
        options=["first_touch", "last_touch", "linear", "time_decay"],
        format_func=lambda x: x.replace("_", " ").title(),
    )

    metrics = attribute_conversions(payments, model=model_choice)
    if metrics:
        # Build channel_metrics dict for chart components
        chart_data = {}
        for channel, m in metrics.items():
            avg_score = 0
            if channel in source_scores:
                scores_list = source_scores[channel]
                avg_score = sum(scores_list) / len(scores_list)
            chart_data[channel] = {
                "leads": m.lead_count,
                "conversions": m.paid_count,
                "revenue": m.revenue,
                "avg_score": avg_score,
                "conversion_rate": m.conversion_rate,
                "avg_deal_size": m.avg_deal_size,
            }

        col1, col2 = st.columns(2)
        with col1:
            st.markdown("**Revenue by Channel**")
            fig = render_channel_bars(chart_data)
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.markdown("**Channel Comparison Radar**")
            # Only show top 5 channels to keep radar readable
            top_channels = dict(list(chart_data.items())[:5])
            fig = render_channel_radar(top_channels)
            st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # ── Revenue by Channel Over Time ──────────────────────────────

    section_header("Revenue by Channel Over Time")
    revenue_over_time = get_revenue_by_source_over_time(payments)
    if revenue_over_time:
        fig = render_revenue_by_source(revenue_over_time)
        st.plotly_chart(fig, use_container_width=True)
    else:
        empty_state("Need more data to show revenue trends by channel.")

    st.divider()

    # ── Activity Heatmap ──────────────────────────────────────────

    section_header("Payment Activity Heatmap", "When are clients paying? Useful for ad scheduling and content timing.")

    fig = render_activity_heatmap(payments, date_field="created", title="Payment Activity by Day & Hour")
    st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # ── AI Channel Insights ───────────────────────────────────────

    section_header("AI Channel Insights")
    claude = st.session_state.get("claude")
    if not claude:
        empty_state("Add ANTHROPIC_API_KEY to .env to enable AI channel analysis.")
        return

    if st.button("Analyze Channels", type="primary"):
        # Build context for Claude
        channel_summary = []
        for ch in roi_data[:8]:
            channel_summary.append(
                f"- {ch['channel']}: {ch['leads']} leads, {ch['conversions']} conversions, "
                f"{format_currency(ch['revenue'])} revenue, {format_percentage(ch['conversion_rate'])} rate"
            )

        prompt = (
            "You are Frankie, the Creative Hotline's brand voice. "
            "Analyze this channel performance data and give actionable recommendations "
            "on where to invest more time/money. Be specific and direct. "
            "No buzzwords, no fluff.\n\n"
            "Channel data:\n" + "\n".join(channel_summary)
        )

        with st.spinner("Frankie is analyzing your channels..."):
            analysis = claude.generate_text(prompt)
        st.session_state["channel_analysis"] = analysis

    if "channel_analysis" in st.session_state:
        st.markdown(st.session_state["channel_analysis"])
