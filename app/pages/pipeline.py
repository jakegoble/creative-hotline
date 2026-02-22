"""Pipeline & Funnel visualization with cohort analysis and drop-off detection."""

import streamlit as st
import plotly.express as px
import pandas as pd

from app.components.funnel_chart import render_funnel
from app.components.cohort_table import build_cohort_data
from app.config import PIPELINE_STATUSES
from app.utils.formatters import format_percentage


def render():
    st.header("Pipeline & Funnel")

    notion = st.session_state.get("notion")
    if not notion:
        st.warning("Notion not connected. Add NOTION_API_KEY to .env.")
        return

    payments = notion.get_all_payments()
    pipeline = notion.get_pipeline_stats()

    # ── Full Funnel ──────────────────────────────────────────────

    st.subheader("Customer Funnel")

    funnel_data = [
        {"stage": stage, "count": pipeline.get(stage, 0)}
        for stage in PIPELINE_STATUSES
    ]
    # Include all stages even if 0 for full funnel view
    fig = render_funnel([d for d in funnel_data if d["count"] > 0] or funnel_data)
    st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # ── Drop-off Analysis ────────────────────────────────────────

    st.subheader("Drop-off Analysis")
    st.caption("Where are clients getting stuck?")

    total = len(payments)
    if total == 0:
        st.info("No client data yet.")
    else:
        dropoff_data = []
        prev_count = total
        for stage in PIPELINE_STATUSES:
            count = sum(
                1 for p in payments
                if PIPELINE_STATUSES.index(p.get("status", "")) >= PIPELINE_STATUSES.index(stage)
                if p.get("status", "") in PIPELINE_STATUSES
            )
            drop = prev_count - count
            rate = (drop / prev_count * 100) if prev_count > 0 else 0
            dropoff_data.append({
                "stage": stage,
                "reached": count,
                "dropped": drop,
                "drop_rate": rate,
            })
            prev_count = count

        df = pd.DataFrame(dropoff_data)

        # Highlight biggest drop-off
        max_drop_idx = df["drop_rate"].idxmax() if not df.empty else None

        cols = st.columns(len(PIPELINE_STATUSES))
        for i, row in df.iterrows():
            with cols[i]:
                is_worst = i == max_drop_idx and row["drop_rate"] > 0
                color = "🔴" if is_worst else ""
                st.metric(
                    label=row["stage"].replace(" - ", "\n"),
                    value=row["reached"],
                    delta=f"-{row['dropped']}" if row["dropped"] > 0 else None,
                    delta_color="inverse",
                    help=f"{format_percentage(row['drop_rate'])} drop-off",
                )

        if max_drop_idx is not None:
            worst = df.iloc[max_drop_idx]
            if worst["drop_rate"] > 0:
                st.warning(
                    f"Biggest drop-off: **{worst['stage']}** — "
                    f"{worst['dropped']} clients ({format_percentage(worst['drop_rate'])}) "
                    f"didn't reach this stage."
                )

    st.divider()

    # ── Cohort Analysis ──────────────────────────────────────────

    st.subheader("Cohort Analysis")
    st.caption("Track each signup week's progression through the pipeline.")

    cohort_df = build_cohort_data(payments)
    if cohort_df.empty:
        st.info("Not enough data for cohort analysis yet.")
    else:
        st.dataframe(
            cohort_df,
            use_container_width=True,
            hide_index=True,
        )

    st.divider()

    # ── Status Distribution ──────────────────────────────────────

    st.subheader("Current Status Distribution")
    status_counts = []
    for stage in PIPELINE_STATUSES:
        count = pipeline.get(stage, 0)
        if count > 0:
            status_counts.append({"Status": stage, "Count": count})

    if status_counts:
        df = pd.DataFrame(status_counts)
        fig = px.bar(
            df, x="Status", y="Count",
            color_discrete_sequence=["#FF6B35"],
        )
        fig.update_layout(
            margin=dict(l=0, r=0, t=10, b=10),
            height=300,
            xaxis_tickangle=-45,
        )
        st.plotly_chart(fig, use_container_width=True)
