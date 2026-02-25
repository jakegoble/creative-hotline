"""Tests for industry benchmarks module."""

from app.utils.benchmarks import (
    compare_to_benchmark,
    compare_funnel,
    compare_channel_cac,
    revenue_ceiling_summary,
    sample_size_warning,
    BenchmarkComparison,
    FUNNEL_BENCHMARKS,
    CAC_BY_CHANNEL,
    LEAD_TO_PAID_RATE,
    BOOKING_SHOW_RATE,
    REVENUE_MIX,
)


# ── compare_to_benchmark ─────────────────────────────────────────


def test_above_benchmark():
    result = compare_to_benchmark("Conversion", 0.30, 0.20, "Industry avg")
    assert result.status == "above"
    assert abs(result.delta - 0.10) < 1e-9
    assert abs(result.delta_pct - 50.0) < 1e-6


def test_below_benchmark():
    result = compare_to_benchmark("Conversion", 0.10, 0.20, "Industry avg")
    assert result.status == "below"
    assert result.delta == -0.10


def test_at_benchmark():
    result = compare_to_benchmark("Conversion", 0.201, 0.20, "Industry avg")
    assert result.status == "at"


def test_at_benchmark_custom_tolerance():
    result = compare_to_benchmark("Rate", 0.22, 0.20, "avg", tolerance=0.15)
    assert result.status == "at"  # 10% delta within 15% tolerance


def test_benchmark_as_dict():
    result = compare_to_benchmark("Test", 100.0, 80.0, "baseline")
    d = result.as_dict()
    assert d["metric_name"] == "Test"
    assert d["actual"] == 100.0
    assert d["benchmark"] == 80.0
    assert d["status"] == "above"


def test_benchmark_zero_benchmark():
    result = compare_to_benchmark("Zero", 0.5, 0.0, "none")
    assert result.delta_pct == 0  # no division by zero


# ── compare_funnel ────────────────────────────────────────────────


def test_compare_funnel_all_stages():
    actual = {stage: bench["rate"] for stage, bench in FUNNEL_BENCHMARKS.items()}
    results = compare_funnel(actual)
    assert len(results) == len(FUNNEL_BENCHMARKS)
    for r in results:
        assert r.status == "at"


def test_compare_funnel_partial():
    actual = {"Lead → Paid": 0.30}
    results = compare_funnel(actual)
    assert len(results) == 1
    assert results[0].status == "above"


def test_compare_funnel_below():
    actual = {"Lead → Paid": 0.05}
    results = compare_funnel(actual)
    assert results[0].status == "below"


def test_compare_funnel_empty():
    results = compare_funnel({})
    assert results == []


# ── compare_channel_cac ───────────────────────────────────────────


def test_channel_cac_good():
    # CAC below benchmark = above (good)
    results = compare_channel_cac({"Referral": 50})
    assert len(results) == 1
    assert results[0].status == "above"  # lower CAC is better


def test_channel_cac_bad():
    # CAC above benchmark = below (bad)
    results = compare_channel_cac({"Referral": 300})
    assert len(results) == 1
    assert results[0].status == "below"  # higher CAC is worse


def test_channel_cac_unknown_channel():
    results = compare_channel_cac({"Smoke Signal": 500})
    assert len(results) == 0  # unknown channel has no benchmark


def test_channel_cac_multiple():
    results = compare_channel_cac({"IG DM": 100, "Website": 500})
    assert len(results) == 2


# ── revenue_ceiling_summary ───────────────────────────────────────


def test_ceiling_needs_diversification():
    result = revenue_ceiling_summary(max_calls_per_week=10, avg_revenue_per_call=650)
    assert result["needs_diversification"] is True
    assert result["annual_ceiling"] > 0


def test_ceiling_achievable():
    result = revenue_ceiling_summary(max_calls_per_week=50, avg_revenue_per_call=1000)
    assert result["needs_diversification"] is False


def test_ceiling_monthly():
    result = revenue_ceiling_summary(max_calls_per_week=10, avg_revenue_per_call=500)
    assert result["monthly_ceiling"] > 0
    assert result["annual_ceiling"] == result["monthly_ceiling"] * 12


# ── sample_size_warning ───────────────────────────────────────────


def test_warning_zero():
    assert sample_size_warning(0) is not None
    assert "No data" in sample_size_warning(0)


def test_warning_very_small():
    assert sample_size_warning(3) is not None
    assert "too few" in sample_size_warning(3)


def test_warning_small():
    assert sample_size_warning(7, "channel") is not None
    assert "directional" in sample_size_warning(7, "channel")


def test_warning_moderate():
    assert sample_size_warning(20) is not None
    assert "moderate" in sample_size_warning(20).lower()


def test_warning_adequate():
    assert sample_size_warning(50) is None


def test_warning_large():
    assert sample_size_warning(500) is None


# ── Constants sanity checks ───────────────────────────────────────


def test_benchmark_constants_valid():
    assert 0 < LEAD_TO_PAID_RATE <= 1.0
    assert 0 < BOOKING_SHOW_RATE <= 1.0


def test_funnel_benchmarks_all_valid():
    for stage, bench in FUNNEL_BENCHMARKS.items():
        assert 0 < bench["rate"] <= 1.0
        assert len(bench["label"]) > 0


def test_cac_benchmarks_all_valid():
    for channel, data in CAC_BY_CHANNEL.items():
        assert data["cac"] > 0
        low, high = data["range"]
        assert low <= data["cac"] <= high


def test_revenue_mix_sums_to_one():
    for tier, mix in REVENUE_MIX.items():
        total = mix["calls"] + mix["packages"] + mix["other"]
        assert abs(total - 1.0) < 0.01, f"{tier} mix sums to {total}"
