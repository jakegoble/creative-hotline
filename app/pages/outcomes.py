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
    upsell_rate,
    expansion_revenue,
)
from app.utils.referral_tracker import (
    referral_conversion_rate,
    referral_revenue_share,
)


OUTCOMES_DIR = os.path.join("plans", "outcomes")


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
    st.header("Outcomes & Testimonials")

    notion = st.session_state.get("notion")
    claude = st.session_state.get("claude")

    payments = notion.get_all_payments() if notion else []
    outcomes = _load_outcomes()

    # ── LTV Leaderboard ──────────────────────────────────────────

    st.subheader("Client Lifetime Value")

    if payments:
        ltv_data = calculate_ltv(payments)
        upsell_data = upsell_rate(payments)
        exp_data = expansion_revenue(payments)

        # Summary metrics
        m1, m2, m3, m4 = st.columns(4)
        with m1:
            avg_ltv = sum(c.total_revenue for c in ltv_data) / len(ltv_data) if ltv_data else 0
            st.metric("Avg LTV", format_currency(avg_ltv))
        with m2:
            st.metric("Upsell Rate", f"{upsell_data.get('upsell_rate', 0):.0f}%")
        with m3:
            st.metric("Expansion Revenue", format_currency(exp_data.get("expansion_revenue", 0)))
        with m4:
            st.metric("Expansion %", f"{exp_data.get('expansion_pct', 0):.0f}%")

        # LTV leaderboard
        with st.expander("Top Clients by LTV"):
            for i, client in enumerate(ltv_data[:10], 1):
                products_str = ", ".join(client.products) if client.products else "—"
                st.markdown(
                    f'<div style="border-left:3px solid #FF6B35; padding:6px 10px; '
                    f'background:#faf8f5; border-radius:4px; margin-bottom:4px;">'
                    f'<div style="display:flex; justify-content:space-between;">'
                    f'<span style="font-weight:bold;">#{i} {client.email}</span>'
                    f'<span style="font-weight:bold; color:#FF6B35;">'
                    f'{format_currency(client.total_revenue)}</span>'
                    f'</div>'
                    f'<div style="font-size:11px; color:#888;">'
                    f'{client.purchase_count} purchases &middot; {products_str} '
                    f'&middot; {client.days_as_client:.0f}d as client</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

        # LTV by source chart
        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**LTV by Lead Source**")
            source_data = ltv_by_source(payments)
            if source_data:
                df = pd.DataFrame([
                    {"Source": k, "Avg LTV": v["avg_ltv"], "Clients": v["client_count"]}
                    for k, v in source_data.items()
                ])
                fig = px.bar(
                    df, x="Avg LTV", y="Source", orientation="h",
                    text=df["Avg LTV"].apply(lambda x: format_currency(x)),
                    color_discrete_sequence=["#FF6B35"],
                )
                fig.update_layout(
                    margin=dict(l=0, r=0, t=10, b=10), height=250,
                    showlegend=False, yaxis=dict(autorange="reversed"),
                    plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                )
                fig.update_traces(textposition="auto")
                st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.markdown("**LTV by Entry Product**")
            product_data = ltv_by_entry_product(payments)
            if product_data:
                df = pd.DataFrame([
                    {"Product": k, "Avg LTV": v["avg_ltv"], "Upsell Rate": v["upsell_rate"]}
                    for k, v in product_data.items()
                ])
                fig = px.bar(
                    df, x="Avg LTV", y="Product", orientation="h",
                    text=df["Avg LTV"].apply(lambda x: format_currency(x)),
                    color_discrete_sequence=["#FFA564"],
                )
                fig.update_layout(
                    margin=dict(l=0, r=0, t=10, b=10), height=250,
                    showlegend=False, yaxis=dict(autorange="reversed"),
                    plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                )
                fig.update_traces(textposition="auto")
                st.plotly_chart(fig, use_container_width=True)

        # Expansion revenue pie
        if exp_data.get("total_revenue", 0) > 0:
            st.markdown("**Revenue Composition**")
            fig = go.Figure(go.Pie(
                labels=["New Client Revenue", "Expansion Revenue"],
                values=[exp_data["new_revenue"], exp_data["expansion_revenue"]],
                marker=dict(colors=["#FF6B35", "#FFA564"]),
                hole=0.4,
            ))
            fig.update_layout(
                margin=dict(l=0, r=0, t=10, b=10), height=250,
                plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            )
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Connect Notion to see LTV data.")

    st.divider()

    # ── Outcome Capture ──────────────────────────────────────────

    st.subheader("Capture Client Outcome")

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
        st.info("No completed clients yet.")

    st.divider()

    # ── NPS Tracker ──────────────────────────────────────────────

    st.subheader("NPS Tracker")

    if outcomes:
        nps_scores = [o.get("nps_score", 0) for o in outcomes if "nps_score" in o]
        if nps_scores:
            promoters = sum(1 for s in nps_scores if s >= NPS_SCALE["promoter"][0])
            passives = sum(1 for s in nps_scores if NPS_SCALE["passive"][0] <= s <= NPS_SCALE["passive"][1])
            detractors = sum(1 for s in nps_scores if s <= NPS_SCALE["detractor"][1])
            total = len(nps_scores)
            nps = ((promoters - detractors) / total * 100) if total > 0 else 0

            c1, c2, c3, c4 = st.columns(4)
            with c1:
                st.metric("NPS Score", f"{nps:.0f}")
            with c2:
                st.metric("Promoters (9-10)", f"{promoters}")
            with c3:
                st.metric("Passives (7-8)", f"{passives}")
            with c4:
                st.metric("Detractors (0-6)", f"{detractors}")

            # Distribution chart
            fig = go.Figure(go.Histogram(
                x=nps_scores, nbinsx=11,
                marker_color="#FF6B35", opacity=0.85,
            ))
            fig.update_layout(
                xaxis_title="Score", yaxis_title="Count",
                margin=dict(l=0, r=0, t=10, b=10), height=200,
                plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No NPS scores recorded yet.")
    else:
        st.info("Capture client outcomes above to start tracking NPS.")

    st.divider()

    # ── Testimonial Generator ────────────────────────────────────

    st.subheader("Testimonial Generator")

    if outcomes and claude:
        outcome_options = {
            f"{o['client_name']} ({o['date']})": o for o in outcomes
        }
        selected_outcome = st.selectbox("Select Client Outcome", list(outcome_options.keys()),
                                         key="testimonial_outcome")
        outcome = outcome_options[selected_outcome]

        # Find matching intake data
        intakes = notion.get_all_intakes() if notion else []
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
            st.markdown(f"**— {outcome['client_name']}**")
    elif not outcomes:
        st.info("Capture client outcomes first, then generate testimonials.")
    else:
        st.info("Connect Claude API to generate testimonials.")

    st.divider()

    # ── Case Study Builder ───────────────────────────────────────

    st.subheader("Case Study Builder")

    if outcomes and claude:
        outcome_options_cs = {
            f"{o['client_name']} ({o['date']})": o for o in outcomes
        }
        selected_cs = st.selectbox("Select Client", list(outcome_options_cs.keys()),
                                    key="case_study_outcome")
        cs_outcome = outcome_options_cs[selected_cs]

        intakes_cs = notion.get_all_intakes() if notion else []
        intake_cs = next((i for i in intakes_cs if (i.get("email") or "").lower() == cs_outcome["email"].lower()), {})

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

            # PDF export
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
        st.info("Capture client outcomes first.")
    else:
        st.info("Connect Claude API to build case studies.")

    st.divider()

    # ── Referral Intelligence ────────────────────────────────────

    st.subheader("Referral Intelligence")

    if payments:
        ref_conv = referral_conversion_rate(payments)
        ref_share = referral_revenue_share(payments)

        c1, c2, c3 = st.columns(3)
        with c1:
            st.metric("Referral Conversion",
                       f"{ref_conv.get('referral_conversion', 0):.0f}%",
                       delta=f"vs {ref_conv.get('other_conversion', 0):.0f}% others")
        with c2:
            st.metric("Referral Avg Deal",
                       format_currency(ref_conv.get("referral_avg_deal", 0)),
                       delta=f"vs {format_currency(ref_conv.get('other_avg_deal', 0))} others")
        with c3:
            st.metric("Referral Revenue Share",
                       f"{ref_share.get('referral_pct', 0):.0f}%")

        if ref_conv.get("referral_leads", 0) > 0:
            st.success(
                f"Referrals convert at **{ref_conv['referral_conversion']:.0f}%** "
                f"vs **{ref_conv['other_conversion']:.0f}%** for other sources. "
                f"That's a **{ref_conv['referral_conversion'] - ref_conv['other_conversion']:.0f} "
                f"percentage point** advantage."
            )
        else:
            st.info("No referral data yet. Track referral sources in Notion to see insights.")
    else:
        st.info("Connect Notion to see referral data.")
