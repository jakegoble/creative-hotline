"""Main KPI Dashboard — revenue, pipeline, attribution, bookings."""

import streamlit as st
import plotly.express as px
import pandas as pd

from app.components.funnel_chart import render_funnel
from app.components.revenue_forecast import render_revenue_chart
from app.config import PIPELINE_STATUSES
from app.utils.formatters import format_currency, format_percentage
from app.utils import design_tokens as t
from app.utils.ui import page_header, section_header, empty_state, activity_feed
from app.utils.activity_feed import build_activity_feed


def render():
    page_header("Command Center", "Real-time overview of revenue, pipeline, and client activity.")

    notion = st.session_state.get("notion")
    stripe_svc = st.session_state.get("stripe")
    calendly = st.session_state.get("calendly")

    # ── Gather data ──────────────────────────────────────────────

    payments = notion.get_all_payments() if notion else []
    pipeline = notion.get_pipeline_stats() if notion else {}
    revenue_summary = stripe_svc.get_revenue_summary(days=30) if stripe_svc else {}
    monthly_revenue = stripe_svc.get_monthly_revenue(months=6) if stripe_svc else []
    booking_rate = calendly.get_booking_rate(days=30) if calendly else {}
    avg_time = calendly.get_avg_time_to_book() if calendly else None

    # ── Compute metrics ──────────────────────────────────────────

    active_clients = sum(
        1 for p in payments if p.get("status") not in ("Lead - Laylo", "")
    )
    total_leads = len(payments)
    completed = sum(1 for p in payments if p.get("status") in ("Call Complete", "Follow-Up Sent"))
    funnel_conversion = (completed / total_leads * 100) if total_leads > 0 else 0
    total_revenue = revenue_summary.get("total_revenue", 0)
    needs_action = sum(
        1 for p in payments
        if p.get("status") in ("Paid - Needs Booking", "Booked - Needs Intake")
    )

    avg_hours = avg_time
    if avg_hours is not None:
        time_display = f"{avg_hours:.1f}h" if avg_hours < 24 else f"{avg_hours / 24:.1f}d"
    else:
        time_display = "\u2014"

    booking_pct = format_percentage(booking_rate.get("rate", 0))

    # ── KPI Row ──────────────────────────────────────────────────

    k1, k2, k3, k4, k5 = st.columns(5, gap="medium")
    k1.metric("Revenue (30d)", format_currency(total_revenue))
    k2.metric("Active Clients", active_clients)
    k3.metric("Funnel Conversion", f"{funnel_conversion:.0f}%")
    k4.metric("Booking Rate", booking_pct)
    k5.metric("Needs Action", needs_action)

    st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)

    # ── Charts Row 1: Revenue + Pipeline ─────────────────────────

    col1, col2 = st.columns(2, gap="medium")

    with col1:
        section_header("Revenue Trend")
        if monthly_revenue:
            fig = render_revenue_chart(monthly_revenue)
            st.plotly_chart(fig, use_container_width=True)
        else:
            empty_state("Connect Stripe to see revenue data.")

    with col2:
        section_header("Pipeline Funnel")
        if pipeline:
            funnel_data = [
                {"stage": stage, "count": pipeline.get(stage, 0)}
                for stage in PIPELINE_STATUSES
                if pipeline.get(stage, 0) > 0
            ]
            if funnel_data:
                fig = render_funnel(funnel_data)
                st.plotly_chart(fig, use_container_width=True)
            else:
                empty_state("No pipeline data yet.")
        else:
            empty_state("Connect Notion to see pipeline data.")

    # ── Charts Row 2: Product + Source ────────────────────────────

    col3, col4 = st.columns(2, gap="medium")

    with col3:
        section_header("Revenue by Product")
        by_product = revenue_summary.get("by_product", {})
        if by_product:
            df = pd.DataFrame([
                {"Product": k, "Revenue": v["revenue"], "Count": v["count"]}
                for k, v in by_product.items()
            ])
            fig = px.bar(
                df, x="Revenue", y="Product", orientation="h",
                text=df["Revenue"].apply(lambda x: format_currency(x)),
                color_discrete_sequence=[t.PRIMARY],
            )
            fig.update_layout(
                height=280,
                showlegend=False,
                yaxis=dict(autorange="reversed"),
            )
            fig.update_traces(textposition="auto")
            st.plotly_chart(fig, use_container_width=True)
        else:
            empty_state("No product data yet.")

    with col4:
        section_header("Leads by Source")
        source_data = {}
        for p in payments:
            source = p.get("lead_source") or "Unknown"
            amount = p.get("payment_amount", 0)
            if source not in source_data:
                source_data[source] = {"count": 0, "revenue": 0}
            source_data[source]["count"] += 1
            source_data[source]["revenue"] += amount

        if source_data:
            df = pd.DataFrame([
                {"Source": k, "Leads": v["count"], "Revenue": v["revenue"]}
                for k, v in source_data.items()
            ])
            fig = px.pie(
                df, values="Revenue", names="Source",
                color_discrete_sequence=t.CHART_COLORS,
            )
            fig.update_layout(height=280)
            st.plotly_chart(fig, use_container_width=True)
        else:
            empty_state("No lead source data yet.")

    # ── Activity Feed (compact) ──────────────────────────────────

    st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)
    section_header("Recent Activity")
    intakes = notion.get_all_intakes() if notion else []
    events = build_activity_feed(payments, intakes, limit=6)
    activity_feed(events, max_items=6)
