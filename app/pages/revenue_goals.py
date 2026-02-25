"""Revenue Goals — $800K path calculator with scenario modeling."""

from __future__ import annotations

import streamlit as st
import plotly.graph_objects as go

from app.config import (
    PRODUCT_TYPES,
    PROPOSED_PRODUCTS,
    ALL_PRODUCTS,
    REVENUE_GOAL_DEFAULT,
    MAX_CALLS_PER_WEEK,
    CHANNEL_COLORS,
)
from app.utils.formatters import format_currency, format_percentage
from app.utils.revenue_modeler import (
    build_scenario,
    compare_scenarios,
    product_ladder,
    monthly_targets,
    channel_investment_plan,
    current_pace,
    capacity_reality_check,
    gap_closer,
)
from app.utils.attribution import channel_roi
from app.utils.ltv_calculator import upsell_rate
from app.utils.benchmarks import REVENUE_MIX, sample_size_warning
from app.components.growth_chart import render_growth_projection
from app.components.scenario_cards import render_scenario_comparison, render_product_ladder
from app.utils.ui import page_header, section_header, metric_row, stat_card, empty_state, data_card
from app.utils import design_tokens as t


def render():
    page_header("Revenue Goals", "$800K path calculator with scenario modeling.")

    notion = st.session_state.get("notion")
    stripe_svc = st.session_state.get("stripe")
    claude = st.session_state.get("claude")

    # ── Gather data ──────────────────────────────────────────────

    payments = notion.get_all_payments() if notion else []
    monthly_revenue = stripe_svc.get_monthly_revenue(months=12) if stripe_svc else []
    revenue_summary = stripe_svc.get_revenue_summary(days=90) if stripe_svc else {}

    # ── Revenue Goal Dashboard ───────────────────────────────────

    section_header("Goal Dashboard")

    col_goal, col_pace, col_gap, col_pct = st.columns(4)

    annual_goal = st.session_state.get("revenue_goal", REVENUE_GOAL_DEFAULT)

    pace = current_pace(monthly_revenue)
    gap = annual_goal - pace["annual_pace"]
    pct = (pace["annual_pace"] / annual_goal * 100) if annual_goal > 0 else 0

    with col_goal:
        new_goal = st.number_input(
            "Annual Target",
            min_value=100_000,
            max_value=10_000_000,
            value=annual_goal,
            step=50_000,
            format="%d",
        )
        if new_goal != annual_goal:
            st.session_state["revenue_goal"] = new_goal
            annual_goal = new_goal

    with col_pace:
        st.metric("Current Pace", format_currency(pace["annual_pace"]))
    with col_gap:
        st.metric(
            "Gap to Goal", format_currency(abs(gap)),
            delta=f"{'ahead' if gap <= 0 else 'behind'}",
            delta_color="normal" if gap <= 0 else "inverse",
        )
    with col_pct:
        st.metric("Progress", f"{pct:.0f}%")

    # Progress bar
    st.progress(min(pct / 100, 1.0))

    # Confidence note
    warning = sample_size_warning(pace["months_of_data"], "revenue pace")
    if warning:
        st.caption(f"*{warning}*")

    st.divider()

    # ── Capacity Reality Check ────────────────────────────────────

    section_header("Capacity Reality Check", "Can your team's call capacity alone hit the revenue goal?")

    cap = capacity_reality_check(annual_goal)

    col_ceil, col_gap, col_util = st.columns(3)
    with col_ceil:
        stat_card(
            label="Call Revenue Ceiling",
            value=format_currency(cap["blended_annual_ceiling"]),
            subtitle=f"{cap['max_calls_per_week']} calls/week \u00b7 ~{format_currency(cap['avg_revenue_per_call'])}/call avg",
            accent_color=t.PRIMARY,
        )
    with col_gap:
        gap_color = t.SUCCESS if cap["achievable_with_calls_only"] else t.DANGER
        stat_card(
            label="Gap to Goal (Calls Only)",
            value=format_currency(cap["gap_to_goal"]),
            subtitle="Covered" if cap["achievable_with_calls_only"] else "Needs non-call products",
            accent_color=gap_color,
        )
    with col_util:
        util_color = t.SUCCESS if cap["utilization_needed"] <= 100 else t.DANGER
        stat_card(
            label="Utilization Needed",
            value=f"{cap['utilization_needed']}%",
            subtitle="of call capacity" if cap["utilization_needed"] <= 100 else "exceeds capacity",
            accent_color=util_color,
        )

    if not cap["achievable_with_calls_only"]:
        # Show gap closer options
        options = gap_closer(annual_goal)
        if options:
            st.markdown(f"**Non-call products needed to close the ${cap['gap_to_goal']:,.0f} gap:**")
            opt_cols = st.columns(min(len(options), 3))
            for i, opt in enumerate(options):
                with opt_cols[i % len(opt_cols)]:
                    data_card(
                        title=opt["product"],
                        body_html=(
                            f'<div class="ch-text-sm">'
                            f'<b>{opt["clients_needed"]}</b> clients at '
                            f'<b>{format_currency(opt["monthly_price"])}</b>/mo<br>'
                            f'= {format_currency(opt["annual_revenue_added"])}/yr added'
                            f'</div>'
                        ),
                        accent_color=t.PRIMARY_LIGHT,
                    )

        # Revenue mix context
        with st.expander("Industry revenue mix by scale"):
            for tier, mix in REVENUE_MIX.items():
                st.markdown(
                    f"**${tier}/yr:** {mix['calls']:.0%} calls \u00b7 "
                    f"{mix['packages']:.0%} packages \u00b7 {mix['other']:.0%} other"
                )

    st.divider()

    # ── Scenario Modeler ─────────────────────────────────────────

    section_header("Scenario Modeler", "Adjust the product mix to see different paths to your goal.")

    tab1, tab2, tab3 = st.tabs(["Current Mix", "With Retainer", "Custom"])

    scenarios_list = []

    with tab1:
        st.markdown("**Current product lineup**")
        c1_first = st.slider("First Call ($499)/mo", 0, 50, 8, key="s1_first")
        c1_std = st.slider("Single Call ($699)/mo", 0, 50, 5, key="s1_std")
        c1_sprint = st.slider("3-Session Sprint ($1,495)/mo", 0, 20, 2, key="s1_sprint")
        s1 = build_scenario("Current Mix", {
            "First Call": {"price": 499, "monthly_volume": c1_first},
            "Single Call": {"price": 699, "monthly_volume": c1_std},
            "3-Session Clarity Sprint": {"price": 1495, "monthly_volume": c1_sprint},
        }, annual_goal)
        scenarios_list.append(s1)

    with tab2:
        st.markdown("**Add a monthly retainer tier**")
        c2_first = st.slider("First Call ($499)/mo", 0, 50, 6, key="s2_first")
        c2_std = st.slider("Single Call ($699)/mo", 0, 50, 4, key="s2_std")
        c2_sprint = st.slider("3-Session Sprint ($1,495)/mo", 0, 20, 2, key="s2_sprint")
        c2_retainer = st.slider("Monthly Retainer ($2,997)/mo", 0, 20, 3, key="s2_retainer")
        s2 = build_scenario("With Retainer", {
            "First Call": {"price": 499, "monthly_volume": c2_first},
            "Single Call": {"price": 699, "monthly_volume": c2_std},
            "3-Session Clarity Sprint": {"price": 1495, "monthly_volume": c2_sprint},
            "Monthly Retainer": {"price": 2997, "monthly_volume": c2_retainer},
        }, annual_goal)
        scenarios_list.append(s2)

    with tab3:
        st.markdown("**Build your own mix**")
        c3_products = {}
        for product, price in sorted(ALL_PRODUCTS.items(), key=lambda x: x[1]):
            vol = st.slider(f"{product} (${price:,})/mo", 0, 50, 0, key=f"s3_{product}")
            if vol > 0:
                c3_products[product] = {"price": price, "monthly_volume": vol}
        if c3_products:
            s3 = build_scenario("Custom", c3_products, annual_goal)
            scenarios_list.append(s3)

    st.divider()

    # Scenario comparison
    section_header("Scenario Comparison")
    render_scenario_comparison([s.as_dict() for s in scenarios_list])

    st.divider()

    # ── Product Ladder ───────────────────────────────────────────

    section_header("Product Value Ladder")
    ladder = product_ladder(payments, PROPOSED_PRODUCTS)
    render_product_ladder(ladder)

    st.divider()

    # ── Monthly Milestones ───────────────────────────────────────

    section_header("Monthly Milestones")

    growth_rate = st.slider(
        "Monthly growth rate",
        min_value=0.0, max_value=0.20, value=0.05, step=0.01,
        format="%.0f%%",
        help="Expected month-over-month revenue growth. 0% = even distribution.",
    )

    from datetime import datetime
    start = datetime.now().strftime("%Y-%m")
    targets = monthly_targets(annual_goal, start, monthly_revenue, growth_rate)

    # Growth projection chart
    fig = render_growth_projection(
        monthly_actuals=monthly_revenue,
        annual_goal=annual_goal,
        scenarios=[
            {"name": s.name, "monthly_target": s.monthly_revenue}
            for s in scenarios_list if s.feasible
        ],
    )
    st.plotly_chart(fig, use_container_width=True)

    # Milestone grid
    cols = st.columns(4)
    for i, tgt in enumerate(targets[:12]):
        with cols[i % 4]:
            color = t.SUCCESS if tgt.on_track else t.DANGER
            actual_str = format_currency(tgt.actual_revenue) if tgt.actual_revenue > 0 else "\u2014"
            stat_card(
                label=tgt.month,
                value=f"Target: {format_currency(tgt.target_revenue)}",
                subtitle=f"Actual: {actual_str}",
                accent_color=color,
            )

    st.divider()

    # ── Channel Investment Planner ───────────────────────────────

    section_header("Channel Investment Planner", "How many leads does each channel need to generate?")

    if payments:
        roi_data = channel_roi(payments)
        plan = channel_investment_plan(annual_goal, roi_data)

        if plan:
            for ch in plan:
                color = CHANNEL_COLORS.get(ch["channel"], "#94A3B8")
                body_html = (
                    f'<div class="ch-flex-between ch-mb-sm">'
                    f'<span class="ch-font-semibold">{ch["channel"]}</span>'
                    f'<span class="ch-text-sm ch-text-muted">'
                    f'{format_percentage(ch["conversion_rate"])} conv. rate</span>'
                    f'</div>'
                    f'<div class="ch-text-sm">'
                    f'Need: <b>{ch["leads_needed"]}</b> leads/yr '
                    f'&middot; Have: <b>{ch["current_leads"]}</b> '
                    f'&middot; Gap: <b style="color:{t.DANGER};">{ch["lead_gap"]}</b>'
                    f'</div>'
                )
                data_card(title="", body_html=body_html, accent_color=color)
        else:
            empty_state("Need more conversion data to plan channel investment.")
    else:
        empty_state("Connect Notion to see channel investment plan.")

    st.divider()

    # ── AI Growth Strategy ───────────────────────────────────────

    section_header("AI Growth Strategy")

    if claude and payments:
        if st.button("Generate Growth Recommendations", type="primary"):
            with st.spinner("Frankie is thinking about your growth strategy..."):
                roi_data = channel_roi(payments)
                upsell = upsell_rate(payments)
                by_product = revenue_summary.get("by_product", {})

                analysis = claude.analyze_growth({
                    "pace": pace,
                    "goal": annual_goal,
                    "channels": roi_data,
                    "product_mix": by_product,
                    "upsell_rate": upsell.get("upsell_rate", 0),
                })
                st.session_state["growth_analysis"] = analysis

        if "growth_analysis" in st.session_state:
            st.markdown(st.session_state["growth_analysis"])
    elif not claude:
        empty_state("Connect Claude API to get AI growth recommendations.")
    else:
        empty_state("Need payment data to analyze growth strategy.")
