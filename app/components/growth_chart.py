"""Interactive growth projection chart with confidence bands and scenario overlay."""

from __future__ import annotations

from datetime import datetime

import plotly.graph_objects as go

from app.utils.design_tokens import DANGER, PRIMARY, PRIMARY_SUBTLE, SCENARIO_COLORS, SUCCESS


def render_growth_projection(
    monthly_actuals: list[dict],
    annual_goal: float = 800_000,
    scenarios: list[dict] | None = None,
    monthly_costs: float = 0,
) -> go.Figure:
    """Build revenue projection chart with actuals, forecast, and goal line.

    Args:
        monthly_actuals: [{"month": "2026-02", "revenue": 1234.0}]
        annual_goal: Annual revenue target
        scenarios: [{"name": "With Retainer", "monthly_target": 66667}]
        monthly_costs: Monthly operating costs for break-even line
    """
    fig = go.Figure()

    actuals = sorted(monthly_actuals, key=lambda d: d["month"])

    if actuals:
        months = [d["month"] for d in actuals]
        revenues = [d["revenue"] for d in actuals]

        fig.add_trace(go.Bar(
            x=months,
            y=revenues,
            name="Actual Revenue",
            marker_color=PRIMARY,
            opacity=0.9,
            hovertemplate="%{x}: $%{y:,.0f}<extra></extra>",
        ))

        recent = revenues[-3:] if len(revenues) >= 3 else revenues
        avg_monthly = sum(recent) / len(recent) if recent else 0

        if avg_monthly > 0:
            last_month = actuals[-1]["month"]
            try:
                last_dt = datetime.strptime(last_month, "%Y-%m")
            except ValueError:
                last_dt = datetime.now()

            proj_months = []
            proj_values = []
            proj_upper = []
            proj_lower = []

            for i in range(1, 13):
                month_num = (last_dt.month - 1 + i) % 12 + 1
                year = last_dt.year + (last_dt.month - 1 + i) // 12
                m_str = f"{year}-{month_num:02d}"
                proj_months.append(m_str)
                proj_values.append(avg_monthly)
                proj_upper.append(avg_monthly * 1.2)
                proj_lower.append(avg_monthly * 0.8)

            fig.add_trace(go.Scatter(
                x=proj_months, y=proj_upper,
                mode="lines", line=dict(width=0),
                showlegend=False, hoverinfo="skip",
            ))
            fig.add_trace(go.Scatter(
                x=proj_months, y=proj_lower,
                mode="lines", line=dict(width=0),
                fill="tonexty", fillcolor=PRIMARY_SUBTLE,
                showlegend=False, hoverinfo="skip",
            ))
            fig.add_trace(go.Scatter(
                x=proj_months, y=proj_values,
                mode="lines+markers",
                name="Projected (3-mo avg)",
                line=dict(color=PRIMARY, dash="dash", width=2.5, shape="spline"),
                marker=dict(size=5, symbol="diamond"),
                hovertemplate="%{x}: $%{y:,.0f}<extra></extra>",
            ))

    monthly_goal = annual_goal / 12
    fig.add_hline(
        y=monthly_goal, line_dash="dot", line_color=SUCCESS,
        annotation_text=f"Goal: ${monthly_goal:,.0f}/mo",
        annotation_position="top right",
    )

    if monthly_costs > 0:
        fig.add_hline(
            y=monthly_costs, line_dash="dot", line_color=DANGER,
            annotation_text=f"Break-even: ${monthly_costs:,.0f}/mo",
            annotation_position="bottom right",
        )

    scenario_colors = SCENARIO_COLORS
    if scenarios:
        for i, scenario in enumerate(scenarios[:3]):
            color = scenario_colors[i % len(scenario_colors)]
            target = scenario.get("monthly_target", 0)
            fig.add_hline(
                y=target, line_dash="dashdot", line_color=color,
                annotation_text=scenario.get("name", f"Scenario {i + 1}"),
                annotation_position="top left" if i % 2 == 0 else "bottom left",
            )

    fig.update_layout(
        height=420,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5),
        yaxis=dict(tickprefix="$", tickformat=","),
        barmode="overlay",
    )

    return fig
