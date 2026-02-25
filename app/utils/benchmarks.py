"""Industry benchmarks for high-ticket creative consultancy analytics.

Sourced from First Page Sage, ActiveCampaign, Consulting Success, and
other industry reports (Feb 2026). All functions are pure — no API calls.
"""

from __future__ import annotations

from dataclasses import dataclass


# ── Conversion Benchmarks ────────────────────────────────────────

LEAD_TO_PAID_RATE = 0.20          # 20% — prepaid model self-qualifies
BOOKING_SHOW_RATE = 0.92          # 92% — $499+ prepayment commitment
INTAKE_COMPLETION_RATE = 0.75     # 75% — post-payment motivated respondent
UPSELL_RATE = 0.20                # 20% — single call → Sprint package

# ── LTV Benchmarks ───────────────────────────────────────────────

AVG_PURCHASES_FIRST_YEAR = 1.4    # blended across single + repeat buyers
FIRST_YEAR_LTV = 910.0            # $910 — blended avg at current prices
LTV_TO_CAC_TARGET = 3.0           # minimum healthy ratio
REFERRAL_RATE = 0.30              # 30% of new clients from referrals
REPEAT_CLIENT_REVENUE_PCT = 0.50  # 50% revenue from existing clients (year 2+)

# ── CAC Benchmarks by Channel ────────────────────────────────────

CAC_BY_CHANNEL: dict[str, dict] = {
    "Referral":   {"cac": 100,  "range": (50, 150)},
    "IG DM":      {"cac": 200,  "range": (150, 300)},
    "IG Comment": {"cac": 200,  "range": (150, 300)},
    "IG Story":   {"cac": 200,  "range": (150, 300)},
    "Website":    {"cac": 300,  "range": (200, 400)},
    "LinkedIn":   {"cac": 400,  "range": (250, 600)},
    "Meta Ad":    {"cac": 800,  "range": (500, 1100)},
    "Direct":     {"cac": 150,  "range": (50, 300)},
}

# ── Email Benchmarks ─────────────────────────────────────────────

NURTURE_OPEN_RATE = 0.45          # 45% — post-purchase warm audience
NURTURE_CTR = 0.065               # 6.5%
BOOKING_REMINDER_RECOVERY = 0.25  # 25% of no-books recovered
POST_CALL_REPEAT_RATE = 0.20      # 20% post-call → repeat purchase

# ── Capacity Benchmarks (2-person team) ──────────────────────────

CALLS_PER_PERSON_PER_WEEK = 5     # sustainable with prep + follow-up
HOURS_PER_CALL_TOTAL = 3.5        # 45min call + prep + action plan + admin
TEAM_SIZE = 2
MAX_MONTHLY_CALLS = CALLS_PER_PERSON_PER_WEEK * TEAM_SIZE * 4.345

# ── Revenue Mix Benchmarks (by annual revenue tier) ──────────────

REVENUE_MIX: dict[str, dict[str, float]] = {
    "500K":  {"calls": 0.70, "packages": 0.22, "other": 0.08},
    "800K":  {"calls": 0.52, "packages": 0.28, "other": 0.20},
    "1M":    {"calls": 0.40, "packages": 0.28, "other": 0.32},
}

# ── Funnel Stage Benchmarks ──────────────────────────────────────

FUNNEL_BENCHMARKS: dict[str, dict] = {
    "Lead → Paid":            {"rate": 0.20, "label": "Lead-to-Paid"},
    "Paid → Booked":          {"rate": 0.85, "label": "Paid-to-Booked"},
    "Booked → Intake":        {"rate": 0.75, "label": "Booked-to-Intake"},
    "Intake → Call Complete":  {"rate": 0.92, "label": "Call Show Rate"},
    "Call → Follow-Up Sent":   {"rate": 0.95, "label": "Action Plan Delivery"},
    "Call → Repeat Purchase":  {"rate": 0.20, "label": "Repeat Purchase"},
}

# ── Lead Scoring Thresholds ──────────────────────────────────────

MIN_LEADS_FOR_SCORING = 50        # below this, scores are directional only
MIN_LEADS_FOR_PREDICTIVE = 200    # below this, rule-based only


# ── Data Classes ─────────────────────────────────────────────────

@dataclass
class BenchmarkComparison:
    """Result of comparing an actual metric against an industry benchmark."""
    metric_name: str
    actual: float
    benchmark: float
    benchmark_label: str
    delta: float           # actual - benchmark
    delta_pct: float       # percentage above/below benchmark
    status: str            # "above", "at", "below"

    def as_dict(self) -> dict:
        return {
            "metric_name": self.metric_name,
            "actual": self.actual,
            "benchmark": self.benchmark,
            "benchmark_label": self.benchmark_label,
            "delta": round(self.delta, 2),
            "delta_pct": round(self.delta_pct, 1),
            "status": self.status,
        }


# ── Public Functions ─────────────────────────────────────────────


def compare_to_benchmark(
    metric_name: str,
    actual: float,
    benchmark: float,
    benchmark_label: str = "Industry avg",
    tolerance: float = 0.05,
) -> BenchmarkComparison:
    """Compare an actual metric value against an industry benchmark.

    Args:
        metric_name: Human label for the metric.
        actual: Observed value (as a rate 0-1 or dollar amount).
        benchmark: Industry benchmark value.
        benchmark_label: Source label for the benchmark.
        tolerance: Fraction within which values are considered "at" benchmark.
    """
    delta = actual - benchmark
    delta_pct = (delta / benchmark * 100) if benchmark != 0 else 0

    if abs(delta_pct) <= tolerance * 100:
        status = "at"
    elif delta > 0:
        status = "above"
    else:
        status = "below"

    return BenchmarkComparison(
        metric_name=metric_name,
        actual=actual,
        benchmark=benchmark,
        benchmark_label=benchmark_label,
        delta=delta,
        delta_pct=delta_pct,
        status=status,
    )


def compare_funnel(actual_rates: dict[str, float]) -> list[BenchmarkComparison]:
    """Compare actual funnel conversion rates against benchmarks.

    Args:
        actual_rates: {stage_transition: rate} where rate is 0-1.
            Keys should match FUNNEL_BENCHMARKS keys.
    """
    results = []
    for stage, bench in FUNNEL_BENCHMARKS.items():
        if stage in actual_rates:
            results.append(compare_to_benchmark(
                metric_name=bench["label"],
                actual=actual_rates[stage],
                benchmark=bench["rate"],
                benchmark_label="Industry target",
            ))
    return results


def compare_channel_cac(actual_cac: dict[str, float]) -> list[BenchmarkComparison]:
    """Compare actual CAC per channel against industry benchmarks.

    Args:
        actual_cac: {channel_name: cac_amount}
    """
    results = []
    for channel, cac in actual_cac.items():
        bench = CAC_BY_CHANNEL.get(channel)
        if bench:
            # For CAC, lower is better, so invert the status logic
            comp = compare_to_benchmark(
                metric_name=f"{channel} CAC",
                actual=cac,
                benchmark=bench["cac"],
                benchmark_label="Industry avg",
            )
            # Flip status: above benchmark CAC is bad
            if comp.status == "above":
                comp.status = "below"
            elif comp.status == "below":
                comp.status = "above"
            results.append(comp)
    return results


def revenue_ceiling_summary(
    max_calls_per_week: int = 10,
    avg_revenue_per_call: float = 650.0,
) -> dict:
    """Quick summary of revenue ceiling from calls alone.

    Args:
        max_calls_per_week: Team weekly capacity.
        avg_revenue_per_call: Blended revenue per call.
    """
    monthly_calls = max_calls_per_week * 4.345
    annual_ceiling = monthly_calls * avg_revenue_per_call * 12
    return {
        "annual_ceiling": round(annual_ceiling),
        "monthly_ceiling": round(monthly_calls * avg_revenue_per_call),
        "calls_per_month": round(monthly_calls, 1),
        "calls_per_year": round(monthly_calls * 12),
        "needs_diversification": annual_ceiling < 800_000,
    }


def sample_size_warning(n: int, context: str = "metric") -> str | None:
    """Return a warning message if sample size is too small for reliable stats.

    Args:
        n: Number of observations.
        context: What's being measured (e.g., "channel", "cohort").

    Returns:
        Warning string, or None if sample is adequate.
    """
    if n == 0:
        return f"No data available for this {context}."
    if n < 5:
        return f"Only {n} records — too few for meaningful {context} analysis."
    if n < 10:
        return f"Only {n} records — treat this {context} data as directional, not definitive."
    if n < 30:
        return f"{n} records — moderate confidence. Trends may shift as data grows."
    return None
