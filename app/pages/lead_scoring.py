"""Lead Intelligence Panel — scored client cards + attribution charts."""

import streamlit as st
import plotly.graph_objects as go

from app.utils.lead_scorer import score_all_clients, get_tier_color, TIER_HOT, TIER_WARM, TIER_COOL
from app.utils.formatters import format_currency
from app.utils import design_tokens as t
from app.utils.ui import (
    page_header,
    section_header,
    stat_card,
    empty_state,
    badge,
    progress_bar,
)


def render():
    page_header("Lead Intelligence", "Scored leads with tier analysis and attribution insights.")

    notion = st.session_state.get("notion")
    if not notion:
        st.warning("Notion not connected. Add NOTION_API_KEY to .env.")
        return

    merged = notion.get_merged_clients()
    if not merged:
        empty_state("No client records found.")
        return

    scored = score_all_clients(merged)

    # ── Tier Summary ──────────────────────────────────────────────

    tiers = {"Hot": 0, "Warm": 0, "Cool": 0, "Cold": 0}
    for s in scored:
        tiers[s["score"]["tier"]] += 1

    cols = st.columns(4)
    for col, (tier, count) in zip(cols, tiers.items()):
        color = get_tier_color(tier)
        with col:
            stat_card(
                label=f"{tier} Leads",
                value=str(count),
                accent_color=color,
            )

    # ── Filter Controls ───────────────────────────────────────────

    col_tier, col_sort = st.columns(2)

    with col_tier:
        tier_filter = st.selectbox(
            "Filter by Tier",
            options=["All", "Hot", "Warm", "Cool", "Cold"],
        )

    with col_sort:
        sort_by = st.selectbox(
            "Sort by",
            options=["Total Score", "Engagement", "Velocity", "Urgency", "Source", "Upsell"],
        )

    # Apply filters
    filtered = scored
    if tier_filter != "All":
        filtered = [s for s in scored if s["score"]["tier"] == tier_filter]

    # Apply sort
    sort_keys = {
        "Total Score": lambda x: x["score"]["total"],
        "Engagement": lambda x: x["score"]["engagement"]["score"],
        "Velocity": lambda x: x["score"]["velocity"]["score"],
        "Urgency": lambda x: x["score"]["urgency"]["score"],
        "Source": lambda x: x["score"]["source"]["score"],
        "Upsell": lambda x: x["score"]["upsell"]["score"],
    }
    filtered.sort(key=sort_keys[sort_by], reverse=True)

    st.caption(f"Showing {len(filtered)} of {len(scored)} leads")

    # ── Scored Client Cards ───────────────────────────────────────

    for item in filtered:
        payment = item["payment"]
        intake = item.get("intake")
        score = item["score"]

        tier = score["tier"]
        color = get_tier_color(tier)
        name = payment.get("client_name") or payment.get("email", "Unknown")
        total = score["total"]

        with st.container():
            st.markdown(
                f'<div style="display:flex; align-items:center; gap:12px; margin-bottom:4px;">'
                f'{badge(tier, color=color)}'
                f'<span style="font-size:18px; font-weight:bold;">{name}</span>'
                f'<span style="font-size:14px; color:{t.TEXT_MUTED}; margin-left:auto;">{total}/100</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

            # Score breakdown bar
            categories = [
                ("Engagement", score["engagement"]["score"], score["engagement"]["max"], t.PRIMARY),
                ("Velocity", score["velocity"]["score"], score["velocity"]["max"], t.INFO),
                ("Urgency", score["urgency"]["score"], score["urgency"]["max"], t.DANGER),
                ("Source", score["source"]["score"], score["source"]["max"], t.SUCCESS),
                ("Upsell", score["upsell"]["score"], score["upsell"]["max"], "#8B5CF6"),
            ]

            score_cols = st.columns(5)
            for col, (cat_name, cat_score, cat_max, cat_color) in zip(score_cols, categories):
                with col:
                    progress_bar(cat_score, cat_max, color=cat_color, label=cat_name, show_value=True)

            # Quick details
            detail_cols = st.columns(4)
            with detail_cols[0]:
                st.caption(f"Product: {payment.get('product_purchased') or '\u2014'}")
            with detail_cols[1]:
                st.caption(f"Amount: {format_currency(payment.get('payment_amount', 0))}")
            with detail_cols[2]:
                st.caption(f"Status: {payment.get('status') or '\u2014'}")
            with detail_cols[3]:
                st.caption(f"Source: {payment.get('lead_source') or '\u2014'}")

            # Expandable score reasons
            with st.expander("Score Details"):
                for cat_name, cat_score, cat_max, _ in categories:
                    key = cat_name.lower()
                    reason = score[key]["reason"]
                    st.markdown(f"**{cat_name}** ({cat_score}/{cat_max}): {reason}")

    # ── Attribution Charts ────────────────────────────────────────

    section_header("Lead Source Attribution")

    col_chart1, col_chart2 = st.columns(2)

    # Score by lead source
    with col_chart1:
        source_scores: dict[str, list[int]] = {}
        for item in scored:
            source = item["payment"].get("lead_source") or "Unknown"
            source_scores.setdefault(source, []).append(item["score"]["total"])

        sources = list(source_scores.keys())
        avg_scores = [sum(v) / len(v) for v in source_scores.values()]
        counts = [len(v) for v in source_scores.values()]

        fig = go.Figure(go.Bar(
            x=sources,
            y=avg_scores,
            text=[f"{s:.0f}" for s in avg_scores],
            textposition="outside",
            marker_color=t.PRIMARY,
        ))
        fig.update_layout(
            title="Avg Score by Lead Source",
            yaxis_title="Average Score",
            height=350,
        )
        st.plotly_chart(fig, use_container_width=True)

    # Tier distribution
    with col_chart2:
        tier_labels = list(tiers.keys())
        tier_values = list(tiers.values())
        tier_colors = [get_tier_color(tier_l) for tier_l in tier_labels]

        fig = go.Figure(go.Pie(
            labels=tier_labels,
            values=tier_values,
            marker=dict(colors=tier_colors),
            hole=0.4,
            textinfo="label+value",
        ))
        fig.update_layout(
            title="Tier Distribution",
            height=350,
            showlegend=False,
        )
        st.plotly_chart(fig, use_container_width=True)

    # ── ICP Analysis ──────────────────────────────────────────────

    section_header("Ideal Client Profile Analysis")

    claude = st.session_state.get("claude")
    if not claude:
        empty_state("Add ANTHROPIC_API_KEY to .env to enable AI-powered ICP analysis.")
        return

    if st.button("Run ICP Analysis", type="primary"):
        with st.spinner("Analyzing client patterns..."):
            analysis = claude.analyze_icp(merged)
        st.session_state["icp_analysis"] = analysis

    if "icp_analysis" in st.session_state:
        st.markdown(st.session_state["icp_analysis"])

    # ── Keyword Insights ──────────────────────────────────────────

    section_header("Keyword Insights")

    intakes = [item.get("intake") for item in merged if item.get("intake")]
    if intakes:
        from app.utils.keyword_extractor import extract_themes, get_industry_distribution

        with st.expander("Top Creative Themes", expanded=False):
            themes = extract_themes(intakes)
            if themes:
                for theme in themes[:8]:
                    progress_bar(
                        theme.count,
                        max(th.count for th in themes),
                        color=t.PRIMARY,
                        label=theme.theme,
                        show_value=True,
                    )
            else:
                empty_state("No theme data yet.")

        with st.expander("Industry Distribution", expanded=False):
            industries = get_industry_distribution(intakes)
            if industries:
                import plotly.express as px_ind
                import pandas as pd_ind
                ind_df = pd_ind.DataFrame([
                    {"Industry": k, "Count": v} for k, v in industries.items()
                ])
                fig = px_ind.pie(
                    ind_df, values="Count", names="Industry",
                    color_discrete_sequence=t.CHART_COLORS,
                )
                fig.update_layout(height=250)
                st.plotly_chart(fig, use_container_width=True)
            else:
                empty_state("No industry data yet.")
    else:
        empty_state("No intake data available for keyword analysis.")
