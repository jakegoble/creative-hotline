"""Funnel Analytics — micro-conversion tracking, speed analysis, A/B tests."""

from __future__ import annotations

import json
import os
from collections import defaultdict
from datetime import datetime

import streamlit as st
import plotly.graph_objects as go

from app.config import PIPELINE_STATUSES, LEAD_SOURCES, CHANNEL_COLORS
from app.utils.formatters import format_currency, format_percentage, days_between
from app.utils.sequence_tracker import (
    build_sequence_map,
    sequence_completion_rates,
    sequence_conversion_rates,
)


AB_TEST_FILE = os.path.join("plans", "ab_tests.json")


def _load_ab_tests() -> list[dict]:
    """Load A/B test log from JSON file."""
    if os.path.exists(AB_TEST_FILE):
        try:
            with open(AB_TEST_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return []


def _save_ab_tests(tests: list[dict]) -> None:
    """Save A/B test log to JSON file."""
    os.makedirs(os.path.dirname(AB_TEST_FILE), exist_ok=True)
    with open(AB_TEST_FILE, "w") as f:
        json.dump(tests, f, indent=2)


def _chi_squared_significance(a_conv: int, a_total: int, b_conv: int, b_total: int) -> dict:
    """Simple chi-squared test for A/B significance."""
    if a_total == 0 or b_total == 0:
        return {"significant": False, "p_approx": 1.0, "winner": None}

    total = a_total + b_total
    total_conv = a_conv + b_conv
    total_no = total - total_conv

    if total_conv == 0 or total_no == 0:
        return {"significant": False, "p_approx": 1.0, "winner": None}

    # Expected values
    e_a_conv = a_total * total_conv / total
    e_a_no = a_total * total_no / total
    e_b_conv = b_total * total_conv / total
    e_b_no = b_total * total_no / total

    # Chi-squared statistic
    chi2 = 0
    for obs, exp in [
        (a_conv, e_a_conv), (a_total - a_conv, e_a_no),
        (b_conv, e_b_conv), (b_total - b_conv, e_b_no),
    ]:
        if exp > 0:
            chi2 += (obs - exp) ** 2 / exp

    # Approximate p-value (1 df) — rough thresholds
    significant = chi2 > 3.841  # p < 0.05
    if chi2 > 6.635:
        p_approx = 0.01
    elif chi2 > 3.841:
        p_approx = 0.05
    else:
        p_approx = 0.10 if chi2 > 2.706 else 1.0

    a_rate = a_conv / a_total
    b_rate = b_conv / b_total
    winner = "A" if a_rate > b_rate else "B" if b_rate > a_rate else None

    return {"significant": significant, "p_approx": p_approx, "chi2": round(chi2, 2), "winner": winner}


def render():
    st.header("Funnel Analytics")

    notion = st.session_state.get("notion")

    if not notion:
        st.warning("Connect Notion to see funnel analytics.")
        return

    payments = notion.get_all_payments()
    if not payments:
        st.info("No payment data yet.")
        return

    # ── Micro-Conversion Funnel ──────────────────────────────────

    st.subheader("Pipeline Funnel")

    # Filter controls
    col_src, col_prod = st.columns(2)
    with col_src:
        source_filter = st.selectbox("Filter by Source", ["All"] + LEAD_SOURCES, key="funnel_source")
    with col_prod:
        products = sorted(set(p.get("product_purchased", "") for p in payments if p.get("product_purchased")))
        product_filter = st.selectbox("Filter by Product", ["All"] + products, key="funnel_product")

    filtered = payments
    if source_filter != "All":
        filtered = [p for p in filtered if p.get("lead_source") == source_filter]
    if product_filter != "All":
        filtered = [p for p in filtered if p.get("product_purchased") == product_filter]

    # Count at each stage
    status_order = {s: i for i, s in enumerate(PIPELINE_STATUSES)}
    stage_counts = []
    total = len(filtered)

    for status in PIPELINE_STATUSES:
        idx = status_order[status]
        count = sum(
            1 for p in filtered
            if status_order.get(p.get("status", ""), -1) >= idx
        )
        stage_counts.append({"stage": status, "count": count})

    # Display funnel with drop-off
    prev_count = total
    for i, sc in enumerate(stage_counts):
        count = sc["count"]
        drop = prev_count - count if i > 0 else 0
        drop_pct = (drop / prev_count * 100) if prev_count > 0 else 0
        bar_pct = (count / total * 100) if total > 0 else 0

        color = "#FF6B35" if bar_pct > 50 else "#FFA564" if bar_pct > 25 else "#FFD4BC"
        st.markdown(
            f'<div style="margin-bottom:4px;">'
            f'<div style="display:flex; justify-content:space-between; font-size:13px;">'
            f'<span style="font-weight:bold;">{sc["stage"]}</span>'
            f'<span>{count} '
            f'{"" if i == 0 else f"<span style=&quot;color:#E74C3C;&quot;>(-{drop}, {drop_pct:.0f}% drop)</span>"}'
            f'</span></div>'
            f'<div style="background:#e8e4e0; border-radius:3px; height:16px; overflow:hidden;">'
            f'<div style="background:{color}; height:100%; width:{bar_pct:.0f}%; '
            f'border-radius:3px;"></div></div></div>',
            unsafe_allow_html=True,
        )
        prev_count = count

    st.divider()

    # ── Speed-to-Convert ─────────────────────────────────────────

    st.subheader("Speed to Convert")

    # Calculate time between key steps
    speed_metrics = {
        "Lead → Paid": [],
        "Paid → Booked": [],
        "Booked → Intake": [],
        "Intake → Call": [],
    }

    for p in filtered:
        created = p.get("created", "")
        payment_date = p.get("payment_date", "")
        call_date = p.get("call_date", "")
        amount = p.get("payment_amount", 0) or 0

        if created and payment_date and amount > 0:
            d = days_between(created, payment_date)
            if d is not None and d >= 0:
                speed_metrics["Lead → Paid"].append(d)

        if payment_date and call_date and amount > 0:
            d = days_between(payment_date, call_date)
            if d is not None and d >= 0:
                speed_metrics["Paid → Booked"].append(d)

    col1, col2, col3, col4 = st.columns(4)
    metric_cols = [col1, col2, col3, col4]

    for col, (label, days_list) in zip(metric_cols, speed_metrics.items()):
        with col:
            if days_list:
                avg = sum(days_list) / len(days_list)
                median = sorted(days_list)[len(days_list) // 2]
                st.metric(label, f"{avg:.1f}d avg")
                st.caption(f"Median: {median:.1f}d | n={len(days_list)}")
            else:
                st.metric(label, "—")
                st.caption("No data")

    # Speed histogram
    with st.expander("Time Distribution Details"):
        for label, days_list in speed_metrics.items():
            if days_list:
                fig = go.Figure(go.Histogram(
                    x=days_list,
                    nbinsx=10,
                    marker_color="#FF6B35",
                    opacity=0.8,
                ))
                fig.update_layout(
                    title=label,
                    xaxis_title="Days",
                    yaxis_title="Clients",
                    margin=dict(l=0, r=0, t=30, b=10),
                    height=200,
                    plot_bgcolor="rgba(0,0,0,0)",
                    paper_bgcolor="rgba(0,0,0,0)",
                )
                st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # ── Email Sequence Performance ───────────────────────────────

    st.subheader("Email Sequence Performance")

    seq_map = build_sequence_map(payments)
    comp_rates = sequence_completion_rates(payments)
    conv_rates = sequence_conversion_rates(payments)

    if comp_rates:
        cols = st.columns(len(comp_rates))
        for col, (seq_name, rates) in zip(cols, comp_rates.items()):
            conv = conv_rates.get(seq_name, {})
            with col:
                st.markdown(
                    f'<div style="border:1px solid #e0dcd8; padding:12px; border-radius:6px; '
                    f'background:#faf8f5;">'
                    f'<div style="font-weight:bold; font-size:14px;">{seq_name}</div>'
                    f'<div style="font-size:24px; font-weight:bold; color:#FF6B35; margin:4px 0;">'
                    f'{rates["rate"]:.0f}%</div>'
                    f'<div style="font-size:11px; color:#888;">Completion rate</div>'
                    f'<div style="font-size:12px; margin-top:6px;">'
                    f'{rates["entered"]} entered &middot; {rates["completed"]} completed</div>'
                    f'<div style="font-size:12px; color:#2ECC71;">'
                    f'{conv.get("conversion_rate", 0):.0f}% advanced to next stage</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

        # Client position detail
        with st.expander("Client Sequence Positions"):
            for seq_name, positions in seq_map.items():
                st.markdown(f"**{seq_name}** ({len(positions)} clients)")
                for pos in positions:
                    status = "done" if pos.completed else f"step {pos.current_step}/{pos.total_steps}"
                    st.markdown(f"- {pos.client_name} ({pos.email}) — {status}")
    else:
        st.info("No active email sequences detected.")

    st.divider()

    # ── A/B Test Log ─────────────────────────────────────────────

    st.subheader("A/B Test Log")

    tests = _load_ab_tests()

    with st.expander("Log a New Test"):
        test_name = st.text_input("Test Name", placeholder="e.g., CTA Button Color")
        col_a, col_b = st.columns(2)
        with col_a:
            a_desc = st.text_input("Variant A", placeholder="e.g., Orange button")
            a_total = st.number_input("A: Total visitors", min_value=0, value=0, key="a_total")
            a_conv = st.number_input("A: Conversions", min_value=0, value=0, key="a_conv")
        with col_b:
            b_desc = st.text_input("Variant B", placeholder="e.g., Green button")
            b_total = st.number_input("B: Total visitors", min_value=0, value=0, key="b_total")
            b_conv = st.number_input("B: Conversions", min_value=0, value=0, key="b_conv")

        if st.button("Save Test"):
            if test_name and a_total > 0 and b_total > 0:
                sig = _chi_squared_significance(a_conv, a_total, b_conv, b_total)
                tests.append({
                    "name": test_name,
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "variant_a": {"desc": a_desc, "total": a_total, "conversions": a_conv},
                    "variant_b": {"desc": b_desc, "total": b_total, "conversions": b_conv},
                    "result": sig,
                })
                _save_ab_tests(tests)
                st.success(f"Test saved! Winner: {sig['winner'] or 'No clear winner'} "
                           f"(p ≈ {sig['p_approx']})")

    # Display test history
    if tests:
        for test in reversed(tests):
            a = test["variant_a"]
            b = test["variant_b"]
            result = test.get("result", {})
            winner = result.get("winner")
            sig = result.get("significant", False)

            a_rate = (a["conversions"] / a["total"] * 100) if a["total"] > 0 else 0
            b_rate = (b["conversions"] / b["total"] * 100) if b["total"] > 0 else 0

            badge = (
                f'<span style="background:#2ECC71; color:white; padding:2px 8px; '
                f'border-radius:10px; font-size:11px;">Significant — {winner} wins</span>'
                if sig and winner else
                '<span style="background:#95A5A6; color:white; padding:2px 8px; '
                'border-radius:10px; font-size:11px;">Not significant</span>'
            )

            st.markdown(
                f'<div style="border:1px solid #e0dcd8; padding:12px; border-radius:6px; '
                f'background:#faf8f5; margin-bottom:8px;">'
                f'<div style="display:flex; justify-content:space-between; align-items:center;">'
                f'<span style="font-weight:bold;">{test["name"]}</span>'
                f'<span>{badge} <span style="font-size:11px; color:#888;">{test.get("date", "")}</span></span>'
                f'</div>'
                f'<div style="display:flex; gap:20px; margin-top:8px; font-size:13px;">'
                f'<div><b>A:</b> {a.get("desc", "")} — {a_rate:.1f}% ({a["conversions"]}/{a["total"]})</div>'
                f'<div><b>B:</b> {b.get("desc", "")} — {b_rate:.1f}% ({b["conversions"]}/{b["total"]})</div>'
                f'</div></div>',
                unsafe_allow_html=True,
            )

        # Test velocity
        st.caption(f"{len(tests)} tests logged total")
    else:
        st.info("No A/B tests logged yet. Use the form above to track experiments.")

    st.divider()

    # ── Bottleneck Alerts ────────────────────────────────────────

    st.subheader("Bottleneck Alerts")

    if len(stage_counts) > 1:
        # Find biggest drop-off
        max_drop = 0
        bottleneck_stage = ""
        bottleneck_idx = 0

        for i in range(1, len(stage_counts)):
            prev = stage_counts[i - 1]["count"]
            curr = stage_counts[i]["count"]
            drop_pct = ((prev - curr) / prev * 100) if prev > 0 else 0
            if drop_pct > max_drop:
                max_drop = drop_pct
                bottleneck_stage = stage_counts[i]["stage"]
                bottleneck_idx = i

        if max_drop > 0:
            suggestions = {
                "Paid - Needs Booking": "Clients are paying but not booking. Speed up the Calendly link delivery. Consider an immediate redirect to booking after payment.",
                "Booked - Needs Intake": "Clients book but don't fill the intake form. Send the Tally link immediately after booking confirmation. Add urgency: 'Complete this before your call for best results.'",
                "Intake Complete": "Intake is done but clients aren't moving to ready status. This may be a team bottleneck — check if intake review is happening promptly.",
                "Ready for Call": "Clients are ready but calls aren't happening. Check Calendly availability and scheduling gaps.",
                "Call Complete": "Calls happen but follow-ups aren't sent. Automate the post-call action plan delivery.",
                "Follow-Up Sent": "Follow-ups are sent but the pipeline ends here. This is the upsell opportunity — add a Sprint offer in the follow-up.",
            }
            suggestion = suggestions.get(bottleneck_stage, "Review this stage for improvement opportunities.")

            st.warning(
                f"**Biggest drop-off: {stage_counts[bottleneck_idx - 1]['stage']} → {bottleneck_stage}** "
                f"({max_drop:.0f}% drop)\n\n{suggestion}"
            )
        else:
            st.success("No significant bottlenecks detected.")
    else:
        st.info("Need more pipeline data to detect bottlenecks.")
