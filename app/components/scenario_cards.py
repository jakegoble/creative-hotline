"""Side-by-side scenario comparison cards and product ladder visualization."""

from __future__ import annotations

import streamlit as st

from app.utils.formatters import format_currency


def render_scenario_comparison(scenarios: list[dict]) -> None:
    """Render up to 3 scenario cards side by side.

    Each scenario dict should have: name, monthly_revenue, annual_revenue,
    clients_per_month, calls_per_week, gap_to_goal, feasible.
    """
    if not scenarios:
        st.info("No scenarios configured.")
        return

    cols = st.columns(min(len(scenarios), 3))

    for col, scenario in zip(cols, scenarios[:3]):
        feasible = scenario.get("feasible", True)
        badge_color = "#2ECC71" if feasible else "#E74C3C"
        badge_text = "Feasible" if feasible else "Over Capacity"
        gap = scenario.get("gap_to_goal", 0)
        gap_color = "#2ECC71" if gap <= 0 else "#E74C3C"
        gap_text = "Goal Reached!" if gap <= 0 else f"${gap:,.0f} gap"

        with col:
            st.markdown(
                f'<div style="border:1px solid #e0dcd8; border-top:3px solid {badge_color}; '
                f'padding:16px; border-radius:6px; background:#faf8f5;">'
                f'<div style="display:flex; justify-content:space-between; align-items:center;">'
                f'<span style="font-weight:bold; font-size:15px;">{scenario.get("name", "Scenario")}</span>'
                f'<span style="background:{badge_color}; color:white; padding:2px 8px; '
                f'border-radius:10px; font-size:11px;">{badge_text}</span>'
                f'</div>'
                f'<div style="font-size:28px; font-weight:bold; color:#1a1a1a; margin:8px 0;">'
                f'{format_currency(scenario.get("annual_revenue", 0))}<span style="font-size:13px; '
                f'color:#888;">/yr</span></div>'
                f'<div style="font-size:13px; color:#666; margin:4px 0;">'
                f'{format_currency(scenario.get("monthly_revenue", 0))}/mo</div>'
                f'<div style="font-size:13px; color:#666; margin:4px 0;">'
                f'{scenario.get("clients_per_month", 0)} clients/mo '
                f'&middot; {scenario.get("calls_per_week", 0)} calls/wk</div>'
                f'<div style="font-size:13px; color:{gap_color}; font-weight:bold; margin-top:8px;">'
                f'{gap_text}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )


def render_product_ladder(ladder_data: list[dict]) -> None:
    """Render horizontal product ladder visualization.

    Each dict: product, price, current_volume, revenue, pct_of_total,
    next_tier_conversion, proposed (bool).
    """
    if not ladder_data:
        st.info("No product data.")
        return

    max_rev = max((p["revenue"] for p in ladder_data), default=1) or 1

    for item in ladder_data:
        product = item["product"]
        price = item["price"]
        volume = item["current_volume"]
        revenue = item["revenue"]
        bar_width = max(5, int((revenue / max_rev) * 100))
        proposed = item.get("proposed", False)
        conv = item.get("next_tier_conversion", 0)

        border_color = "#95A5A6" if proposed else "#FF6B35"
        bg = "#f0f0f0" if proposed else "#faf8f5"
        label_extra = ' <span style="color:#95A5A6; font-size:10px;">(proposed)</span>' if proposed else ""

        st.markdown(
            f'<div style="border-left:3px solid {border_color}; padding:8px 12px; '
            f'background:{bg}; border-radius:4px; margin-bottom:8px;">'
            f'<div style="display:flex; justify-content:space-between; align-items:center;">'
            f'<span style="font-weight:bold; font-size:14px;">{product}{label_extra}</span>'
            f'<span style="font-size:13px; color:#888;">${price:,}</span>'
            f'</div>'
            f'<div style="background:#e8e4e0; border-radius:3px; height:20px; margin:6px 0; '
            f'overflow:hidden;">'
            f'<div style="background:{border_color}; height:100%; width:{bar_width}%; '
            f'border-radius:3px; display:flex; align-items:center; padding-left:8px;">'
            f'<span style="color:white; font-size:11px; font-weight:bold;">'
            f'{format_currency(revenue)}</span>'
            f'</div></div>'
            f'<div style="display:flex; justify-content:space-between; font-size:11px; color:#888;">'
            f'<span>{volume} sold</span>'
            f'<span>{conv:.0f}% upgrade to next tier</span>'
            f'</div></div>',
            unsafe_allow_html=True,
        )
