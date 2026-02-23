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
)
from app.utils.attribution import channel_roi
from app.utils.ltv_calculator import upsell_rate
from app.components.growth_chart import render_growth_projection
from app.components.scenario_cards import render_scenario_comparison, render_product_ladder


def render():
    st.header("Revenue Goals")

    notion = st.session_state.get("notion")
    stripe_svc = st.session_state.get("stripe")
    claude = st.session_state.get("claude")

    # ── Gather data ──────────────────────────────────────────────

    payments = notion.get_all_payments() if notion else []
    monthly_revenue = stripe_svc.get_monthly_revenue(months=12) if stripe_svc else []
    revenue_summary = stripe_svc.get_revenue_summary(days=90) if stripe_svc else {}

    # ── Revenue Goal Dashboard ───────────────────────────────────

    st.subheader("Goal Dashboard")

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
        st.metric("Gap to Goal", format_currency(abs(gap)),
                   delta=f"{'ahead' if gap <= 0 else 'behind'}",
                   delta_color="normal" if gap <= 0 else "inverse")
    with col_pct:
        st.metric("Progress", f"{pct:.0f}%")

    # Progress bar
    st.progress(min(pct / 100, 1.0))

    st.divider()

    # ── Scenario Modeler ─────────────────────────────────────────

    st.subheader("Scenario Modeler")
    st.caption("Adjust the product mix to see different paths to your goal.")

    tab1, tab2, tab3 = st.tabs(["Current Mix", "With Retainer", "Custom"])

    scenarios_list = []

    with tab1:
        st.markdown("**Current product lineup**")
        c1_first = st.slider("First Call ($499)/mo", 0, 50, 8, key="s1_first")
        c1_std = st.slider("Standard Call ($699)/mo", 0, 50, 5, key="s1_std")
        c1_sprint = st.slider("3-Session Sprint ($1,495)/mo", 0, 20, 2, key="s1_sprint")
        s1 = build_scenario("Current Mix", {
            "First Call": {"price": 499, "monthly_volume": c1_first},
            "Standard Call": {"price": 699, "monthly_volume": c1_std},
            "3-Session Clarity Sprint": {"price": 1495, "monthly_volume": c1_sprint},
        }, annual_goal)
        scenarios_list.append(s1)

    with tab2:
        st.markdown("**Add a monthly retainer tier**")
        c2_first = st.slider("First Call ($499)/mo", 0, 50, 6, key="s2_first")
        c2_std = st.slider("Standard Call ($699)/mo", 0, 50, 4, key="s2_std")
        c2_sprint = st.slider("3-Session Sprint ($1,495)/mo", 0, 20, 2, key="s2_sprint")
        c2_retainer = st.slider("Monthly Retainer ($2,997)/mo", 0, 20, 3, key="s2_retainer")
        s2 = build_scenario("With Retainer", {
            "First Call": {"price": 499, "monthly_volume": c2_first},
            "Standard Call": {"price": 699, "monthly_volume": c2_std},
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
    st.subheader("Scenario Comparison")
    render_scenario_comparison([s.as_dict() for s in scenarios_list])

    st.divider()

    # ── Product Ladder ───────────────────────────────────────────

    st.subheader("Product Value Ladder")
    ladder = product_ladder(payments, PROPOSED_PRODUCTS)
    render_product_ladder(ladder)

    st.divider()

    # ── Monthly Milestones ───────────────────────────────────────

    st.subheader("Monthly Milestones")

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
    for i, t in enumerate(targets[:12]):
        with cols[i % 4]:
            on_track = "on track" if t.on_track else "behind"
            color = "#2ECC71" if t.on_track else "#E74C3C"
            actual_str = format_currency(t.actual_revenue) if t.actual_revenue > 0 else "—"
            st.markdown(
                f'<div style="border-left:3px solid {color}; padding:6px 10px; '
                f'background:#faf8f5; border-radius:4px; margin-bottom:6px;">'
                f'<div style="font-size:12px; font-weight:bold;">{t.month}</div>'
                f'<div style="font-size:11px; color:#888;">Target: {format_currency(t.target_revenue)}</div>'
                f'<div style="font-size:11px;">Actual: {actual_str}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    st.divider()

    # ── Channel Investment Planner ───────────────────────────────

    st.subheader("Channel Investment Planner")
    st.caption("How many leads does each channel need to generate?")

    if payments:
        roi_data = channel_roi(payments)
        plan = channel_investment_plan(annual_goal, roi_data)

        if plan:
            for ch in plan:
                color = CHANNEL_COLORS.get(ch["channel"], "#95A5A6")
                gap_pct = (ch["lead_gap"] / max(ch["leads_needed"], 1) * 100) if ch["leads_needed"] > 0 else 0

                st.markdown(
                    f'<div style="border-left:3px solid {color}; padding:8px 12px; '
                    f'background:#faf8f5; border-radius:4px; margin-bottom:6px;">'
                    f'<div style="display:flex; justify-content:space-between;">'
                    f'<span style="font-weight:bold;">{ch["channel"]}</span>'
                    f'<span style="font-size:12px; color:#888;">'
                    f'{format_percentage(ch["conversion_rate"])} conv. rate</span>'
                    f'</div>'
                    f'<div style="font-size:12px; margin-top:4px;">'
                    f'Need: <b>{ch["leads_needed"]}</b> leads/yr '
                    f'&middot; Have: <b>{ch["current_leads"]}</b> '
                    f'&middot; Gap: <b style="color:#E74C3C;">{ch["lead_gap"]}</b>'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )
        else:
            st.info("Need more conversion data to plan channel investment.")
    else:
        st.info("Connect Notion to see channel investment plan.")

    st.divider()

    # ── AI Growth Strategy ───────────────────────────────────────

    st.subheader("AI Growth Strategy")

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
        st.info("Connect Claude API to get AI growth recommendations.")
    else:
        st.info("Need payment data to analyze growth strategy.")
