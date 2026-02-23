"""Main KPI Dashboard — revenue, pipeline, attribution, bookings."""

import streamlit as st
import plotly.express as px
import pandas as pd

from app.components.kpi_cards import render_kpi_row
from app.components.funnel_chart import render_funnel
from app.components.revenue_forecast import render_revenue_chart
from app.config import PIPELINE_STATUSES, CHANNEL_COLORS
from app.utils.formatters import format_currency, format_percentage
from app.utils.attribution import channel_roi
from app.utils import design_tokens as t
from app.utils.ui import page_header, section_header, metric_row, stat_card, empty_state


def render():
    page_header("Command Center", "Real-time overview of revenue, pipeline, and client activity.")

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

    completed = sum(1 for p in payments if p.get("status") in ("Call Complete", "Follow-Up Sent"))
    funnel_conversion = (completed / total_leads * 100) if total_leads > 0 else 0

    health_score = health.composite_score if health else "\u2014"

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
        section_header("Revenue Trend", "Monthly revenue over the last 6 months")
        if monthly_revenue:
            fig = render_revenue_chart(monthly_revenue)
            st.plotly_chart(fig, use_container_width=True)
        else:
            empty_state("Connect Stripe to see revenue data.")

    with col2:
        section_header("Pipeline Funnel", "Client progression through each stage")
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

    st.divider()

    # ── Charts Row 2: Revenue by Product + Lead Source ───────────

    col3, col4 = st.columns(2)

    with col3:
        section_header("Revenue by Product", "Breakdown by product type")
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
        section_header("Lead Source Attribution", "Revenue contribution by channel")
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
            fig.update_layout(height=280)
            st.plotly_chart(fig, use_container_width=True)
        else:
            empty_state("No lead source data yet.")

    st.divider()

    # ── Conversion Metrics ───────────────────────────────────────

    section_header("Conversion Metrics", "Step-by-step funnel conversion rates")

    paid_count = sum(1 for p in payments if p.get("status") != "Lead - Laylo")
    booked_count = sum(
        1 for p in payments
        if p.get("status") in ("Booked - Needs Intake", "Intake Complete", "Ready for Call", "Call Complete", "Follow-Up Sent")
    )
    intake_count = sum(
        1 for p in payments
        if p.get("status") in ("Intake Complete", "Ready for Call", "Call Complete", "Follow-Up Sent")
    )

    r1 = (paid_count / total_leads * 100) if total_leads > 0 else 0
    r2 = (booked_count / paid_count * 100) if paid_count > 0 else 0
    r3 = (intake_count / booked_count * 100) if booked_count > 0 else 0
    r4 = (completed / intake_count * 100) if intake_count > 0 else 0

    metric_row([
        {"label": "Lead \u2192 Paid", "value": f"{r1:.0f}%"},
        {"label": "Paid \u2192 Booked", "value": f"{r2:.0f}%"},
        {"label": "Booked \u2192 Intake", "value": f"{r3:.0f}%"},
        {"label": "Intake \u2192 Complete", "value": f"{r4:.0f}%"},
    ])

    st.divider()

    # ── Top Channels ──────────────────────────────────────────────

    section_header("Top Channels", "Highest-converting lead sources")
    if payments:
        roi_data = channel_roi(payments)
        top_3 = [ch for ch in roi_data if ch["conversions"] > 0][:3]
        if top_3:
            cols = st.columns(len(top_3))
            for col, ch in zip(cols, top_3):
                color = CHANNEL_COLORS.get(ch["channel"], "#95A5A6")
                with col:
                    stat_card(
                        label=ch["channel"],
                        value=f"{format_percentage(ch['conversion_rate'])} conv.",
                        subtitle=f"{ch['leads']} leads \u00b7 {format_currency(ch['revenue'])}",
                        accent_color=color,
                    )
        else:
            empty_state("No converted channels yet.")
