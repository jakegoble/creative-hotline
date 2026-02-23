"""Interactive growth projection chart with confidence bands and scenario overlay."""

from __future__ import annotations

from datetime import datetime

import plotly.graph_objects as go


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

    # Sort actuals by month
    actuals = sorted(monthly_actuals, key=lambda d: d["month"])

    if actuals:
        months = [d["month"] for d in actuals]
        revenues = [d["revenue"] for d in actuals]

        # Actual revenue bars
        fig.add_trace(go.Bar(
            x=months,
            y=revenues,
            name="Actual Revenue",
            marker_color="#FF6B35",
            opacity=0.85,
        ))

        # Projection: trailing 3-month average extrapolated 12 months
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

            # Confidence band (upper)
            fig.add_trace(go.Scatter(
                x=proj_months,
                y=proj_upper,
                mode="lines",
                line=dict(width=0),
                showlegend=False,
                hoverinfo="skip",
            ))
            # Confidence band (lower + fill)
            fig.add_trace(go.Scatter(
                x=proj_months,
                y=proj_lower,
                mode="lines",
                line=dict(width=0),
                fill="tonexty",
                fillcolor="rgba(255, 107, 53, 0.1)",
                showlegend=False,
                hoverinfo="skip",
            ))

            # Projection line
            fig.add_trace(go.Scatter(
                x=proj_months,
                y=proj_values,
                mode="lines+markers",
                name="Projected (3-mo avg)",
                line=dict(color="#FF6B35", dash="dash", width=2),
                marker=dict(size=6, symbol="diamond"),
            ))

    # Goal line
    monthly_goal = annual_goal / 12
    all_months = []
    if actuals:
        all_months = [d["month"] for d in actuals]
    if not all_months:
        all_months = [datetime.now().strftime("%Y-%m")]

    fig.add_hline(
        y=monthly_goal,
        line_dash="dot",
        line_color="#2ECC71",
        annotation_text=f"Goal: ${monthly_goal:,.0f}/mo",
        annotation_position="top right",
    )

    # Break-even line
    if monthly_costs > 0:
        fig.add_hline(
            y=monthly_costs,
            line_dash="dot",
            line_color="#E74C3C",
            annotation_text=f"Break-even: ${monthly_costs:,.0f}/mo",
            annotation_position="bottom right",
        )

    # Scenario overlay lines
    scenario_colors = ["#6495ED", "#9B59B6", "#34495E"]
    if scenarios:
        for i, scenario in enumerate(scenarios[:3]):
            color = scenario_colors[i % len(scenario_colors)]
            target = scenario.get("monthly_target", 0)
            fig.add_hline(
                y=target,
                line_dash="dashdot",
                line_color=color,
                annotation_text=scenario.get("name", f"Scenario {i + 1}"),
                annotation_position="top left" if i % 2 == 0 else "bottom left",
            )

    fig.update_layout(
        margin=dict(l=0, r=0, t=30, b=10),
        height=350,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5),
        yaxis=dict(tickprefix="$", tickformat=",", gridcolor="rgba(0,0,0,0.05)"),
        xaxis=dict(gridcolor="rgba(0,0,0,0.05)"),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font=dict(family="system-ui, -apple-system, sans-serif"),
        barmode="overlay",
    )

    return fig
