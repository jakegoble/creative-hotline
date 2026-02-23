"""Conversion Path Analysis — Sankey flows, bottlenecks, and keyword themes."""

from __future__ import annotations

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

from app.components.sankey_chart import render_sankey
from app.utils.keyword_extractor import (
    extract_themes,
    extract_all_pain_points,
    get_industry_distribution,
    get_outcome_demand,
)
from app.config import PIPELINE_STATUSES
from app.utils.formatters import format_percentage


def render():
    st.header("Conversion Paths")

    notion = st.session_state.get("notion")
    if not notion:
        st.warning("Notion not connected. Add NOTION_API_KEY to .env.")
        return

    payments = notion.get_all_payments()
    intakes = notion.get_all_intakes()

    if not payments:
        st.info("No data yet.")
        return

    # ── Sankey Flow Diagram ───────────────────────────────────────

    st.subheader("Client Flow Diagram")
    st.caption("How clients move from lead source through the pipeline to outcome.")

    fig = render_sankey(payments)
    st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # ── Path Comparison by Source ─────────────────────────────────

    st.subheader("Path Comparison by Lead Source")
    st.caption("Average pipeline progression by channel.")

    # Group payments by source and compute how far they got
    source_progress: dict[str, dict[str, int]] = {}
    for p in payments:
        source = p.get("lead_source") or "Unknown"
        status = p.get("status", "")
        if source not in source_progress:
            source_progress[source] = {s: 0 for s in PIPELINE_STATUSES}
        if status in PIPELINE_STATUSES:
            idx = PIPELINE_STATUSES.index(status)
            for s in PIPELINE_STATUSES[:idx + 1]:
                source_progress[source][s] += 1

    if source_progress:
        rows = []
        for source, stage_counts in source_progress.items():
            total = sum(1 for p in payments if (p.get("lead_source") or "Unknown") == source)
            for stage, count in stage_counts.items():
                rows.append({
                    "Source": source,
                    "Stage": stage,
                    "Reached": count,
                    "Rate": f"{count/total*100:.0f}%" if total > 0 else "0%",
                })

        df = pd.DataFrame(rows)
        pivot = df.pivot_table(index="Source", columns="Stage", values="Reached", fill_value=0)
        # Reorder columns to match pipeline
        ordered_cols = [s for s in PIPELINE_STATUSES if s in pivot.columns]
        if ordered_cols:
            pivot = pivot[ordered_cols]
            st.dataframe(pivot, use_container_width=True)
    else:
        st.info("No source data available.")

    st.divider()

    # ── Bottleneck Detection ──────────────────────────────────────

    st.subheader("Bottleneck Detection")
    st.caption("Where is the biggest drop-off in each channel?")

    bottlenecks = []
    for source, stage_counts in source_progress.items():
        total = sum(1 for p in payments if (p.get("lead_source") or "Unknown") == source)
        if total < 2:
            continue
        worst_drop = 0
        worst_stage = ""
        prev_count = total
        for stage in PIPELINE_STATUSES:
            count = stage_counts.get(stage, 0)
            drop = prev_count - count
            if drop > worst_drop and prev_count > 0:
                worst_drop = drop
                worst_stage = stage
            prev_count = count

        if worst_stage:
            drop_rate = (worst_drop / total * 100)
            bottlenecks.append({
                "Channel": source,
                "Bottleneck Stage": worst_stage,
                "Dropped": worst_drop,
                "Drop Rate": f"{drop_rate:.0f}%",
            })

    if bottlenecks:
        bottlenecks.sort(key=lambda x: int(x["Drop Rate"].rstrip("%")), reverse=True)
        df = pd.DataFrame(bottlenecks)
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("Not enough data for bottleneck analysis.")

    st.divider()

    # ── Keyword Themes (from Intake Data) ─────────────────────────

    if intakes:
        col1, col2 = st.columns(2)

        with col1:
            st.subheader("Creative Themes")
            st.caption("What are clients asking for help with?")
            themes = extract_themes(intakes)
            if themes:
                theme_df = pd.DataFrame([
                    {"Theme": t.theme, "Count": t.count, "% of Intakes": f"{t.percentage:.0f}%"}
                    for t in themes
                ])
                fig = px.bar(
                    theme_df, x="Count", y="Theme", orientation="h",
                    color_discrete_sequence=["#FF6B35"],
                )
                fig.update_layout(
                    margin=dict(l=0, r=0, t=10, b=10),
                    height=300,
                    yaxis=dict(autorange="reversed"),
                    showlegend=False,
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No theme data yet.")

        with col2:
            st.subheader("Pain Points")
            st.caption("What are clients struggling with?")
            pain_points = extract_all_pain_points(intakes)
            if pain_points:
                top_10 = dict(list(pain_points.items())[:10])
                pp_df = pd.DataFrame([
                    {"Pain Point": pp, "Count": count}
                    for pp, count in top_10.items()
                ])
                fig = px.bar(
                    pp_df, x="Count", y="Pain Point", orientation="h",
                    color_discrete_sequence=["#E74C3C"],
                )
                fig.update_layout(
                    margin=dict(l=0, r=0, t=10, b=10),
                    height=300,
                    yaxis=dict(autorange="reversed"),
                    showlegend=False,
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No pain point data yet.")

        st.divider()

        col3, col4 = st.columns(2)

        with col3:
            st.subheader("Industry Breakdown")
            industries = get_industry_distribution(intakes)
            if industries:
                ind_df = pd.DataFrame([
                    {"Industry": k, "Count": v}
                    for k, v in industries.items()
                ])
                fig = px.pie(
                    ind_df, values="Count", names="Industry",
                    color_discrete_sequence=px.colors.sequential.Oranges_r,
                )
                fig.update_layout(
                    margin=dict(l=0, r=0, t=10, b=10),
                    height=300,
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No industry data yet.")

        with col4:
            st.subheader("Outcome Demand")
            st.caption("What do clients want from their calls?")
            outcomes = get_outcome_demand(intakes)
            if outcomes:
                out_df = pd.DataFrame([
                    {"Outcome": k, "Count": v}
                    for k, v in outcomes.items()
                ])
                fig = px.bar(
                    out_df, x="Count", y="Outcome", orientation="h",
                    color_discrete_sequence=["#4A90D9"],
                )
                fig.update_layout(
                    margin=dict(l=0, r=0, t=10, b=10),
                    height=300,
                    yaxis=dict(autorange="reversed"),
                    showlegend=False,
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No outcome data yet.")
    else:
        st.info("No intake data yet. Keyword themes and industry breakdown will appear once intake forms are submitted.")
