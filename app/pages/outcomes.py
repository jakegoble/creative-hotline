"""Client Outcomes & Testimonials — LTV, NPS, testimonials, case studies, referrals."""

from __future__ import annotations

import json
import os
from datetime import datetime

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

from app.config import CHANNEL_COLORS, NPS_SCALE
from app.utils.formatters import format_currency, format_percentage
from app.utils.ltv_calculator import (
    calculate_ltv,
    ltv_by_source,
    ltv_by_entry_product,
    ltv_by_cohort,
    upsell_rate,
    expansion_revenue,
)
from app.utils.referral_tracker import (
    referral_conversion_rate,
    referral_revenue_share,
)
from app.utils.benchmarks import sample_size_warning, FIRST_YEAR_LTV, LTV_TO_CAC_TARGET
from app.utils import design_tokens as t
from app.utils.ui import page_header, section_header, metric_row, stat_card, empty_state


_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTCOMES_DIR = os.path.join(_PROJECT_ROOT, "plans", "outcomes")


def _load_outcomes() -> list[dict]:
    """Load all saved outcomes."""
    if not os.path.exists(OUTCOMES_DIR):
        return []
    outcomes = []
    for f in sorted(os.listdir(OUTCOMES_DIR)):
        if f.endswith(".json"):
            try:
                with open(os.path.join(OUTCOMES_DIR, f), "r") as fh:
                    outcomes.append(json.load(fh))
            except (json.JSONDecodeError, IOError):
                continue
    return outcomes


def _save_outcome(outcome: dict) -> str:
    """Save outcome to JSON file."""
    os.makedirs(OUTCOMES_DIR, exist_ok=True)
    email_slug = outcome["email"].replace("@", "_at_").replace(".", "_")
    filename = f"{email_slug}_{datetime.now().strftime('%Y-%m-%d')}.json"
    filepath = os.path.join(OUTCOMES_DIR, filename)
    with open(filepath, "w") as f:
        json.dump(outcome, f, indent=2)
    return filepath


def render():
    page_header("Outcomes & Testimonials", "Track client results, NPS, testimonials, and referral intelligence.")

    notion = st.session_state.get("notion")
    claude = st.session_state.get("claude")

    payments = notion.get_all_payments() if notion else []
    outcomes = _load_outcomes()

    # ── LTV Leaderboard ──────────────────────────────────────────

    section_header("Client Lifetime Value")

    if payments:
        ltv_data = calculate_ltv(payments)
        upsell_data = upsell_rate(payments)
        exp_data = expansion_revenue(payments)

        # Summary metrics
        avg_ltv = sum(c.total_revenue for c in ltv_data) / len(ltv_data) if ltv_data else 0
        avg_projected = sum(c.projected_ltv for c in ltv_data) / len(ltv_data) if ltv_data else 0
        metric_row([
            {"label": "Avg LTV (Actual)", "value": format_currency(avg_ltv)},
            {
                "label": "Avg LTV (Projected)",
                "value": format_currency(avg_projected),
                "delta": f"benchmark: {format_currency(FIRST_YEAR_LTV)}",
            },
            {"label": "Upsell Rate", "value": f"{upsell_data.get('upsell_rate', 0):.0f}%"},
            {"label": "Expansion %", "value": f"{exp_data.get('expansion_pct', 0):.0f}%"},
        ])

        # Sample size context
        warning = sample_size_warning(len(ltv_data), "LTV")
        if warning:
            st.caption(f"*{warning}*")

        # LTV leaderboard
        with st.expander("Top Clients by LTV"):
            for i, client in enumerate(ltv_data[:10], 1):
                products_str = ", ".join(client.products) if client.products else "—"
                stat_card(
                    label=f"#{i} {client.email}",
                    value=format_currency(client.total_revenue),
                    subtitle=f"{client.purchase_count} purchases \u00b7 {products_str} \u00b7 {client.days_as_client:.0f}d as client",
                    accent_color=t.PRIMARY,
                )

        # LTV by source chart
        col1, col2 = st.columns(2)

        with col1:
            section_header("LTV by Lead Source")
            source_data = ltv_by_source(payments)
            if source_data:
                # Flag low-sample sources
                low_sources = [k for k, v in source_data.items() if not v.get("sample_sufficient", True)]
                if low_sources:
                    st.caption(f"*Low confidence: {', '.join(low_sources)} (<5 clients)*")

                df = pd.DataFrame([
                    {"Source": k, "Avg LTV": v["avg_ltv"], "Clients": v["client_count"]}
                    for k, v in source_data.items()
                ])
                fig = px.bar(
                    df, x="Avg LTV", y="Source", orientation="h",
                    text=df["Avg LTV"].apply(lambda x: format_currency(x)),
                    color_discrete_sequence=[t.PRIMARY],
                )
                # Add benchmark reference line
                fig.add_vline(
                    x=FIRST_YEAR_LTV, line_dash="dash", line_color=t.TEXT_MUTED,
                    annotation_text=f"Benchmark: {format_currency(FIRST_YEAR_LTV)}",
                    annotation_position="top",
                )
                fig.update_layout(
                    height=250,
                    showlegend=False, yaxis=dict(autorange="reversed"),
                )
                fig.update_traces(textposition="auto")
                st.plotly_chart(fig, use_container_width=True)

        with col2:
            section_header("LTV by Entry Product")
            product_data = ltv_by_entry_product(payments)
            if product_data:
                df = pd.DataFrame([
                    {"Product": k, "Avg LTV": v["avg_ltv"], "Upsell Rate": v["upsell_rate"]}
                    for k, v in product_data.items()
                ])
                fig = px.bar(
                    df, x="Avg LTV", y="Product", orientation="h",
                    text=df["Avg LTV"].apply(lambda x: format_currency(x)),
                    color_discrete_sequence=[t.PRIMARY_LIGHT],
                )
                fig.update_layout(
                    height=250,
                    showlegend=False, yaxis=dict(autorange="reversed"),
                )
                fig.update_traces(textposition="auto")
                st.plotly_chart(fig, use_container_width=True)

        # Expansion revenue pie
        if exp_data.get("total_revenue", 0) > 0:
            section_header("Revenue Composition")
            fig = go.Figure(go.Pie(
                labels=["New Client Revenue", "Expansion Revenue"],
                values=[exp_data["new_revenue"], exp_data["expansion_revenue"]],
                marker=dict(colors=[t.PRIMARY, t.PRIMARY_LIGHT]),
                hole=0.4,
            ))
            fig.update_layout(height=250)
            st.plotly_chart(fig, use_container_width=True)
        # ── Cohort LTV Trends ──────────────────────────────────────

        section_header("Cohort LTV Trends", "LTV progression by signup cohort.")

        cohort_period = st.radio(
            "Group by", ["Monthly", "Quarterly"],
            horizontal=True, key="cohort_period",
        )
        cohorts = ltv_by_cohort(payments, period=cohort_period.lower())
        if cohorts:
            cohort_df = pd.DataFrame([c.as_dict() for c in cohorts])
            fig = go.Figure()
            fig.add_trace(go.Bar(
                x=cohort_df["cohort_month"],
                y=cohort_df["avg_ltv"],
                name="Avg LTV",
                marker_color=t.PRIMARY,
                text=cohort_df["avg_ltv"].apply(lambda x: format_currency(x)),
                textposition="auto",
            ))
            fig.add_trace(go.Scatter(
                x=cohort_df["cohort_month"],
                y=cohort_df["median_ltv"],
                name="Median LTV",
                mode="lines+markers",
                line=dict(color=t.PRIMARY_LIGHT, dash="dot"),
            ))
            # Benchmark line
            fig.add_hline(
                y=FIRST_YEAR_LTV, line_dash="dash", line_color=t.TEXT_MUTED,
                annotation_text=f"Benchmark: {format_currency(FIRST_YEAR_LTV)}",
            )
            fig.update_layout(
                height=300, xaxis_title="Signup Cohort", yaxis_title="LTV",
                legend=dict(orientation="h", y=-0.2),
            )
            st.plotly_chart(fig, use_container_width=True)

            # Cohort detail table
            with st.expander("Cohort Details"):
                for c in cohorts:
                    confidence = "" if c.sample_sufficient else " (low confidence)"
                    st.markdown(
                        f"**{c.cohort_month}**: {c.client_count} clients, "
                        f"Avg {format_currency(c.avg_ltv)}, "
                        f"Median {format_currency(c.median_ltv)}, "
                        f"{c.upsell_count} upsells{confidence}"
                    )
        else:
            empty_state("Need more purchase data for cohort analysis.")

    else:
        empty_state("Connect Notion to see LTV data.")

    # ── Outcome Capture ──────────────────────────────────────────

    with st.expander("Capture Client Outcome"):
        completed_clients = [
            p for p in payments
            if p.get("status") in ("Call Complete", "Follow-Up Sent")
        ]

        if completed_clients:
            client_options = {
                f"{p['client_name']} ({p['email']})": p for p in completed_clients
            }
            selected = st.selectbox("Select Client", list(client_options.keys()), key="outcome_client")
            client = client_options[selected]

            results = st.text_area("What results did the client achieve?", key="outcome_results",
                                   placeholder="e.g., Launched rebrand in 2 weeks, grew IG by 40%")
            what_changed = st.text_area("What changed for them?", key="outcome_changed",
                                        placeholder="e.g., Went from paralyzed to clear on positioning")
            nps = st.slider("Would they recommend us? (0-10)", 0, 10, 8, key="outcome_nps")

            if st.button("Save Outcome"):
                if results:
                    outcome = {
                        "email": client["email"],
                        "client_name": client["client_name"],
                        "product_purchased": client.get("product_purchased", ""),
                        "results_achieved": results,
                        "what_changed": what_changed,
                        "nps_score": nps,
                        "date": datetime.now().strftime("%Y-%m-%d"),
                    }
                    filepath = _save_outcome(outcome)
                    outcomes = _load_outcomes()  # Refresh
                    st.success(f"Outcome saved for {client['client_name']}.")
                else:
                    st.warning("Please enter the results achieved.")
        else:
            empty_state("No completed clients yet.")

    # ── NPS Tracker ──────────────────────────────────────────────

    section_header("NPS Tracker")

    if outcomes:
        nps_scores = [o.get("nps_score", 0) for o in outcomes if "nps_score" in o]
        if nps_scores:
            promoters = sum(1 for s in nps_scores if s >= NPS_SCALE["promoter"][0])
            passives = sum(1 for s in nps_scores if NPS_SCALE["passive"][0] <= s <= NPS_SCALE["passive"][1])
            detractors = sum(1 for s in nps_scores if s <= NPS_SCALE["detractor"][1])
            total = len(nps_scores)
            nps = ((promoters - detractors) / total * 100) if total > 0 else 0

            metric_row([
                {"label": "NPS Score", "value": f"{nps:.0f}"},
                {"label": "Promoters (9-10)", "value": f"{promoters}"},
                {"label": "Passives (7-8)", "value": f"{passives}"},
                {"label": "Detractors (0-6)", "value": f"{detractors}"},
            ])

            # Distribution chart
            fig = go.Figure(go.Histogram(
                x=nps_scores, nbinsx=11,
                marker_color=t.PRIMARY, opacity=0.85,
            ))
            fig.update_layout(
                xaxis_title="Score", yaxis_title="Count",
                height=200,
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            empty_state("No NPS scores recorded yet.")
    else:
        empty_state("Capture client outcomes above to start tracking NPS.")

    # ── Content Generators ───────────────────────────────────────

    section_header("Content Generators")

    if outcomes and claude:
        gen_tab1, gen_tab2 = st.tabs(["Testimonial", "Case Study"])

        intakes = notion.get_all_intakes() if notion else []

        with gen_tab1:
            outcome_options = {
                f"{o['client_name']} ({o['date']})": o for o in outcomes
            }
            selected_outcome = st.selectbox("Select Client Outcome", list(outcome_options.keys()),
                                             key="testimonial_outcome")
            outcome = outcome_options[selected_outcome]

            intake = next((i for i in intakes if (i.get("email") or "").lower() == outcome["email"].lower()), {})

            if st.button("Generate Testimonial", type="primary"):
                with st.spinner("Writing testimonial in Frankie's voice..."):
                    testimonial = claude.generate_testimonial(
                        client_name=outcome["client_name"],
                        brand=intake.get("brand", ""),
                        creative_emergency=intake.get("creative_emergency", ""),
                        outcome_text=outcome.get("results_achieved", ""),
                        product_purchased=outcome.get("product_purchased", ""),
                    )
                    st.session_state["generated_testimonial"] = testimonial

            if "generated_testimonial" in st.session_state:
                st.markdown(f'> *"{st.session_state["generated_testimonial"]}"*')
                st.markdown(f"**\u2014 {outcome['client_name']}**")

        with gen_tab2:
            outcome_options_cs = {
                f"{o['client_name']} ({o['date']})": o for o in outcomes
            }
            selected_cs = st.selectbox("Select Client", list(outcome_options_cs.keys()),
                                        key="case_study_outcome")
            cs_outcome = outcome_options_cs[selected_cs]

            intake_cs = next((i for i in intakes if (i.get("email") or "").lower() == cs_outcome["email"].lower()), {})

            if st.button("Generate Case Study", type="primary"):
                with st.spinner("Building case study..."):
                    case_study = claude.generate_case_study(
                        client_name=cs_outcome["client_name"],
                        brand=intake_cs.get("brand", ""),
                        role=intake_cs.get("role", ""),
                        creative_emergency=intake_cs.get("creative_emergency", ""),
                        action_plan_summary=intake_cs.get("ai_summary", ""),
                        outcome_text=cs_outcome.get("results_achieved", ""),
                        product_purchased=cs_outcome.get("product_purchased", ""),
                    )
                    st.session_state["generated_case_study"] = case_study

            if "generated_case_study" in st.session_state:
                st.markdown(st.session_state["generated_case_study"])

                if st.button("Download as PDF"):
                    from app.utils.exporters import generate_action_plan_pdf
                    pdf_bytes = generate_action_plan_pdf(
                        cs_outcome["client_name"],
                        cs_outcome.get("product_purchased", ""),
                        st.session_state["generated_case_study"],
                    )
                    st.download_button(
                        "Download PDF",
                        data=pdf_bytes,
                        file_name=f"case_study_{cs_outcome['client_name'].replace(' ', '_')}.pdf",
                        mime="application/pdf",
                    )
    elif not outcomes:
        empty_state("Capture client outcomes first to generate testimonials and case studies.")
    else:
        empty_state("Connect Claude API to generate content.")

    # ── Referral Intelligence ────────────────────────────────────

    section_header("Referral Intelligence")

    if payments:
        ref_conv = referral_conversion_rate(payments)
        ref_share = referral_revenue_share(payments)

        metric_row([
            {
                "label": "Referral Conversion",
                "value": f"{ref_conv.get('referral_conversion', 0):.0f}%",
                "delta": f"vs {ref_conv.get('other_conversion', 0):.0f}% others",
            },
            {
                "label": "Referral Avg Deal",
                "value": format_currency(ref_conv.get("referral_avg_deal", 0)),
                "delta": f"vs {format_currency(ref_conv.get('other_avg_deal', 0))} others",
            },
            {
                "label": "Referral Revenue Share",
                "value": f"{ref_share.get('referral_pct', 0):.0f}%",
            },
        ])

        if ref_conv.get("referral_leads", 0) > 0:
            st.success(
                f"Referrals convert at **{ref_conv['referral_conversion']:.0f}%** "
                f"vs **{ref_conv['other_conversion']:.0f}%** for other sources. "
                f"That's a **{ref_conv['referral_conversion'] - ref_conv['other_conversion']:.0f} "
                f"percentage point** advantage."
            )
        else:
            empty_state("No referral data yet. Track referral sources in Notion to see insights.")
    else:
        empty_state("Connect Notion to see referral data.")
