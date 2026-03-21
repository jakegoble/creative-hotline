"""AI Brand Audit — score brands across 6 dimensions with radar chart."""

from __future__ import annotations

import streamlit as st
import plotly.graph_objects as go

from app.utils.brand_auditor import (
    score_brand,
    compare_brands,
    BrandAuditResult,
)
from app.utils.benchmarks import BRAND_AUDIT_BENCHMARKS
from app.utils import design_tokens as t
from app.utils.ui import (
    page_header,
    section_header,
    stat_card,
    empty_state,
    badge,
    progress_bar,
)


TIER_COLORS: dict[str, str] = {
    "Strong": t.SUCCESS,
    "Developing": t.INFO,
    "Needs Work": t.WARNING,
    "Critical": t.DANGER,
}


def _tier_color(tier: str) -> str:
    return TIER_COLORS.get(tier, t.TEXT_MUTED)


def _radar_chart(result: BrandAuditResult) -> go.Figure:
    """Build a radar chart showing 6 dimension scores."""
    labels = [d.label for d in result.dimensions]
    scores = [d.raw_score for d in result.dimensions]

    labels_closed = labels + [labels[0]]
    scores_closed = scores + [scores[0]]

    bench_val = BRAND_AUDIT_BENCHMARKS["avg_score_creative_services"]
    bench_closed = [bench_val] * (len(labels) + 1)

    fig = go.Figure()

    fig.add_trace(go.Scatterpolar(
        r=bench_closed,
        theta=labels_closed,
        name=f"Industry Avg ({bench_val})",
        line=dict(color=t.TEXT_MUTED, dash="dot", width=1),
        fill="none",
        opacity=0.5,
    ))

    color = _tier_color(result.tier)
    fig.add_trace(go.Scatterpolar(
        r=scores_closed,
        theta=labels_closed,
        name=result.brand_name,
        fill="toself",
        fillcolor=t.hex_to_rgba(color, 0.15),
        line=dict(color=color, width=2),
    ))

    fig.update_layout(
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 100], tickfont_size=10),
        ),
        showlegend=True,
        legend=dict(orientation="h", y=-0.15),
        height=400,
        margin=dict(t=40, b=60, l=60, r=60),
    )
    return fig


def _render_dimension_cards(result: BrandAuditResult) -> None:
    """Render expandable cards for each dimension."""
    sorted_dims = sorted(result.dimensions, key=lambda d: d.raw_score, reverse=True)

    for dim in sorted_dims:
        color = t.SUCCESS if dim.raw_score >= 78 else (
            t.INFO if dim.raw_score >= 55 else (
                t.WARNING if dim.raw_score >= 35 else t.DANGER
            )
        )

        with st.expander(f"{dim.label} — {dim.raw_score:.0f}/100", expanded=False):
            progress_bar(dim.raw_score, 100, color=color, label="Score", show_value=True)
            st.caption(f"Weight: {dim.weight:.0%}")

            if dim.signals:
                st.markdown("**Signals detected:**")
                for signal in dim.signals:
                    st.markdown(f"- {signal}")

            if dim.recommendation:
                st.info(dim.recommendation)


def _build_audit_data_from_client(item: dict) -> dict:
    """Extract audit input from a merged client record."""
    payment = item.get("payment", {})
    intake = item.get("intake", {})
    return {
        "brand": intake.get("brand") or payment.get("client_name", ""),
        "role": intake.get("role", ""),
        "website": intake.get("website", ""),
        "creative_emergency": intake.get("creative_emergency", ""),
        "desired_outcome": intake.get("desired_outcome", []),
        "what_tried": intake.get("what_tried", ""),
        "deadline": intake.get("deadline", ""),
        "constraints": intake.get("constraints", ""),
        "payment_amount": payment.get("payment_amount", 0),
    }


def _render_results(result: BrandAuditResult, notion=None) -> None:
    """Render the full audit results section."""
    tier_color = _tier_color(result.tier)

    cols = st.columns(4)
    with cols[0]:
        stat_card("Composite Score", f"{result.composite_score:.0f}/100", accent_color=tier_color)
    with cols[1]:
        stat_card("Brand Tier", result.tier, accent_color=tier_color)
    with cols[2]:
        stat_card("Top Strength", result.top_strength, accent_color=t.SUCCESS)
    with cols[3]:
        stat_card("Top Weakness", result.top_weakness, accent_color=t.DANGER)

    st.caption(result.percentile)

    col_radar, col_dims = st.columns([3, 2])

    with col_radar:
        section_header("Dimension Radar")
        fig = _radar_chart(result)
        st.plotly_chart(fig, use_container_width=True)

    with col_dims:
        section_header("Dimension Breakdown")
        _render_dimension_cards(result)

    if result.priority_actions:
        section_header("Priority Actions", "Top recommendations based on lowest-scoring dimensions.")
        for i, action in enumerate(result.priority_actions, 1):
            st.markdown(f"{i}. {action}")

    section_header("How You Compare")
    bench_cols = st.columns(4)
    benchmarks = [
        ("Top 25%", BRAND_AUDIT_BENCHMARKS["top_quartile"]),
        ("Creative Avg", BRAND_AUDIT_BENCHMARKS["avg_score_creative_services"]),
        ("All Industries", BRAND_AUDIT_BENCHMARKS["avg_score_all_industries"]),
        ("Bottom 25%", BRAND_AUDIT_BENCHMARKS["bottom_quartile"]),
    ]
    for col, (label, bench_val) in zip(bench_cols, benchmarks):
        delta = result.composite_score - bench_val
        direction = "up" if delta > 0 else "down" if delta < 0 else "neutral"
        with col:
            stat_card(
                label=label,
                value=str(int(bench_val)),
                subtitle=f"Your score: {result.composite_score:.0f}",
                delta=f"{delta:+.0f}",
                delta_direction=direction,
            )

    section_header("Scoring Weights", "How each dimension contributes to your composite score.")
    weight_fig = go.Figure(go.Bar(
        x=[d.weighted_score for d in result.dimensions],
        y=[d.label for d in result.dimensions],
        orientation="h",
        text=[f"{d.weighted_score:.1f}" for d in result.dimensions],
        textposition="outside",
        marker_color=[
            t.SUCCESS if d.raw_score >= 78 else (
                t.INFO if d.raw_score >= 55 else (
                    t.WARNING if d.raw_score >= 35 else t.DANGER
                )
            )
            for d in result.dimensions
        ],
    ))
    weight_fig.update_layout(
        xaxis_title="Weighted Score Contribution",
        height=280,
        margin=dict(l=0, r=40),
    )
    st.plotly_chart(weight_fig, use_container_width=True)

    if notion:
        merged = notion.get_merged_clients()
        if merged and len(merged) >= 2:
            with st.expander("Compare Against All Clients", expanded=False):
                all_results = [score_brand(_build_audit_data_from_client(m)) for m in merged]
                comparison = compare_brands(all_results)

                comp_cols = st.columns(3)
                with comp_cols[0]:
                    stat_card("Avg Score", f"{comparison['avg_composite']:.0f}", accent_color=t.INFO)
                with comp_cols[1]:
                    stat_card("Highest", f"{comparison['max_composite']:.0f}", accent_color=t.SUCCESS)
                with comp_cols[2]:
                    stat_card("Lowest", f"{comparison['min_composite']:.0f}", accent_color=t.DANGER)

                dist = comparison.get("tier_distribution", {})
                if dist:
                    st.markdown("**Tier distribution across all clients:**")
                    for tier_name, count in dist.items():
                        if count > 0:
                            st.markdown(
                                f"- {badge(tier_name, color=TIER_COLORS.get(tier_name, t.TEXT_MUTED))} "
                                f"**{count}** client{'s' if count != 1 else ''}",
                                unsafe_allow_html=True,
                            )


def render():
    page_header(
        "AI Brand Audit",
        "Score any brand across 6 dimensions. Select an existing client or enter details manually.",
    )

    notion = st.session_state.get("notion")

    tab_existing, tab_manual = st.tabs(["From Existing Client", "Manual Entry"])
    audit_data: dict | None = None

    with tab_existing:
        if not notion:
            st.warning("Notion not connected. Use Manual Entry tab instead.")
        else:
            merged = notion.get_merged_clients()
            if not merged:
                empty_state("No client records found.")
            else:
                client_names = []
                client_map: dict[str, dict] = {}
                for item in merged:
                    p = item.get("payment", {})
                    name = p.get("client_name") or p.get("email", "Unknown")
                    client_names.append(name)
                    client_map[name] = item

                selected = st.selectbox("Select a client", options=client_names)
                if selected and st.button("Run Brand Audit", type="primary", key="audit_existing"):
                    audit_data = _build_audit_data_from_client(client_map[selected])

    with tab_manual:
        with st.form("manual_audit"):
            brand = st.text_input("Brand Name", placeholder="e.g., Acme Creative Studio")
            role = st.text_input("Your Role", placeholder="e.g., Founder & Creative Director")
            website = st.text_input("Website or Instagram", placeholder="e.g., https://acmecreative.com")
            emergency = st.text_area(
                "Creative Emergency",
                placeholder="What's the #1 brand/creative challenge you're facing right now?",
                height=100,
            )
            outcomes = st.multiselect(
                "Desired Outcomes",
                options=[
                    "Brand positioning", "Visual identity", "Content strategy",
                    "Audience growth", "Revenue increase", "Launch strategy",
                    "Rebrand", "Social media presence", "Differentiation",
                ],
            )
            tried = st.text_area(
                "What You've Tried",
                placeholder="What approaches have you already tried?",
                height=80,
            )
            constraints = st.text_input(
                "Constraints / Things to Avoid",
                placeholder="e.g., No TikTok, budget under $5K",
            )

            submitted = st.form_submit_button("Run Brand Audit", type="primary")
            if submitted and brand:
                audit_data = {
                    "brand": brand,
                    "role": role,
                    "website": website,
                    "creative_emergency": emergency,
                    "desired_outcome": outcomes,
                    "what_tried": tried,
                    "constraints": constraints,
                    "payment_amount": 0,
                }

    if audit_data:
        result = score_brand(audit_data)
        st.session_state["last_brand_audit"] = result

    result: BrandAuditResult | None = st.session_state.get("last_brand_audit")
    if not result:
        empty_state("Enter brand details above to generate an audit.")
        return

    st.markdown("---")
    section_header(f"Brand Audit: {result.brand_name}")
    _render_results(result, notion)
