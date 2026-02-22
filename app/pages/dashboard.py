"""Main KPI Dashboard — revenue, pipeline, attribution, bookings."""

import streamlit as st
import plotly.express as px
import pandas as pd

from app.components.kpi_cards import render_kpi_row
from app.components.funnel_chart import render_funnel
from app.components.revenue_forecast import render_revenue_chart
from app.config import PIPELINE_STATUSES
from app.utils.formatters import format_currency


def render():
    st.header("Command Center")

    notion = st.session_state.get("notion")
    stripe_svc = st.session_state.get("stripe")
    calendly = st.session_state.get("calendly")
    health = st.session_state.get("health")

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
    total_paid = sum(1 for p in payments if p.get("payment_amount", 0) > 0)
    total_leads = len(payments)
    lead_to_paid = (total_paid / total_leads * 100) if total_leads > 0 else 0

    completed = sum(1 for p in payments if p.get("status") in ("Call Complete", "Follow-Up Sent"))
    funnel_conversion = (completed / total_leads * 100) if total_leads > 0 else 0

    health_score = health.composite_score if health else "—"

    # ── KPI Row ──────────────────────────────────────────────────

    render_kpi_row({
        "total_revenue": revenue_summary.get("total_revenue", 0),
        "active_clients": active_clients,
        "booking_rate": booking_rate.get("rate", 0),
        "avg_time_to_book": avg_time,
        "funnel_conversion": funnel_conversion,
        "system_health": health_score,
    })

    st.divider()

    # ── Charts Row 1: Revenue + Pipeline ─────────────────────────

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Revenue Trend")
        if monthly_revenue:
            fig = render_revenue_chart(monthly_revenue)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Connect Stripe to see revenue data.")

    with col2:
        st.subheader("Pipeline Funnel")
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
                st.info("No pipeline data yet.")
        else:
            st.info("Connect Notion to see pipeline data.")

    st.divider()

    # ── Charts Row 2: Revenue by Product + Lead Source ───────────

    col3, col4 = st.columns(2)

    with col3:
        st.subheader("Revenue by Product")
        by_product = revenue_summary.get("by_product", {})
        if by_product:
            df = pd.DataFrame([
                {"Product": k, "Revenue": v["revenue"], "Count": v["count"]}
                for k, v in by_product.items()
            ])
            fig = px.bar(
                df, x="Revenue", y="Product", orientation="h",
                text=df["Revenue"].apply(lambda x: format_currency(x)),
                color_discrete_sequence=["#FF6B35"],
            )
            fig.update_layout(
                margin=dict(l=0, r=0, t=10, b=10),
                height=250,
                showlegend=False,
                yaxis=dict(autorange="reversed"),
            )
            fig.update_traces(textposition="auto")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No product data yet.")

    with col4:
        st.subheader("Lead Source Attribution")
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
                color_discrete_sequence=px.colors.sequential.Oranges_r,
            )
            fig.update_layout(
                margin=dict(l=0, r=0, t=10, b=10),
                height=250,
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No lead source data yet.")

    st.divider()

    # ── Conversion Metrics ───────────────────────────────────────

    st.subheader("Conversion Metrics")
    m1, m2, m3, m4 = st.columns(4)

    paid_count = sum(1 for p in payments if p.get("status") != "Lead - Laylo")
    booked_count = sum(
        1 for p in payments
        if p.get("status") in ("Booked - Needs Intake", "Intake Complete", "Ready for Call", "Call Complete", "Follow-Up Sent")
    )
    intake_count = sum(
        1 for p in payments
        if p.get("status") in ("Intake Complete", "Ready for Call", "Call Complete", "Follow-Up Sent")
    )

    with m1:
        rate = (paid_count / total_leads * 100) if total_leads > 0 else 0
        st.metric("Lead → Paid", f"{rate:.0f}%")
    with m2:
        rate = (booked_count / paid_count * 100) if paid_count > 0 else 0
        st.metric("Paid → Booked", f"{rate:.0f}%")
    with m3:
        rate = (intake_count / booked_count * 100) if booked_count > 0 else 0
        st.metric("Booked → Intake", f"{rate:.0f}%")
    with m4:
        rate = (completed / intake_count * 100) if intake_count > 0 else 0
        st.metric("Intake → Complete", f"{rate:.0f}%")
