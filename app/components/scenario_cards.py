"""Side-by-side scenario comparison cards and product ladder visualization."""

from __future__ import annotations

import streamlit as st

from app.utils import design_tokens as t
from app.utils.formatters import format_currency
from app.utils.ui import badge, empty_state


def render_scenario_comparison(scenarios: list[dict]) -> None:
    """Render up to 3 scenario cards side by side.

    Each scenario dict should have: name, monthly_revenue, annual_revenue,
    clients_per_month, calls_per_week, gap_to_goal, feasible.
    """
    if not scenarios:
        empty_state("No scenarios configured.")
        return

    cols = st.columns(min(len(scenarios), 3))

    for col, scenario in zip(cols, scenarios[:3]):
        feasible = scenario.get("feasible", True)
        badge_color = t.SUCCESS if feasible else t.DANGER
        badge_text = "Feasible" if feasible else "Over Capacity"
        gap = scenario.get("gap_to_goal", 0)
        gap_color = t.SUCCESS if gap <= 0 else t.DANGER
        gap_text = "Goal Reached!" if gap <= 0 else f"${gap:,.0f} gap"

        with col:
            st.markdown(
                f'<div class="ch-card ch-card--accent-top" style="--accent-color:{badge_color}">'
                f'<div class="ch-flex-between">'
                f'<span class="ch-font-bold" style="font-size:15px">'
                f'{scenario.get("name", "Scenario")}</span>'
                f'{badge(badge_text, badge_color)}'
                f'</div>'
                f'<div class="ch-text-2xl ch-font-bold ch-mt-sm">'
                f'{format_currency(scenario.get("annual_revenue", 0))}'
                f'<span class="ch-text-sm ch-text-muted">/yr</span></div>'
                f'<div class="ch-text-sm ch-text-secondary ch-mt-sm">'
                f'{format_currency(scenario.get("monthly_revenue", 0))}/mo</div>'
                f'<div class="ch-text-sm ch-text-secondary">'
                f'{scenario.get("clients_per_month", 0)} clients/mo '
                f'&middot; {scenario.get("calls_per_week", 0)} calls/wk</div>'
                f'<div class="ch-text-sm ch-font-bold ch-mt-sm" style="color:{gap_color}">'
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
        empty_state("No product data.")
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

        accent = t.BORDER_STRONG if proposed else t.PRIMARY
        label_extra = (
            f' <span class="ch-text-caption" style="font-size:10px">(proposed)</span>'
            if proposed else ""
        )

        st.markdown(
            f'<div class="ch-card ch-card--accent-left" style="--accent-color:{accent};padding:12px 16px">'
            f'<div class="ch-flex-between">'
            f'<span class="ch-font-bold ch-text-md">{product}{label_extra}</span>'
            f'<span class="ch-text-sm ch-text-muted">${price:,}</span>'
            f'</div>'
            f'<div style="background:var(--border);border-radius:3px;height:20px;'
            f'margin:6px 0;overflow:hidden">'
            f'<div style="background:{accent};height:100%;width:{bar_width}%;'
            f'border-radius:3px;display:flex;align-items:center;padding-left:8px">'
            f'<span style="color:white;font-size:11px;font-weight:bold">'
            f'{format_currency(revenue)}</span>'
            f'</div></div>'
            f'<div class="ch-flex-between ch-text-xs ch-text-muted">'
            f'<span>{volume} sold</span>'
            f'<span>{conv:.0f}% upgrade to next tier</span>'
            f'</div></div>',
            unsafe_allow_html=True,
        )
