"""Tests for multi-touch attribution engine."""

from app.utils.attribution import (
    attribute_conversions,
    compare_models,
    channel_roi,
    get_revenue_by_source_over_time,
    ChannelMetrics,
)


# ── Fixtures ──────────────────────────────────────────────────────

PAYMENTS = [
    {
        "lead_source": "IG DM",
        "payment_amount": 499,
        "status": "Call Complete",
        "created": "2026-02-10T10:00:00Z",
        "call_date": "2026-02-15",
        "linked_intake_id": "abc123",
    },
    {
        "lead_source": "IG DM",
        "payment_amount": 699,
        "status": "Booked - Needs Intake",
        "created": "2026-02-12T14:00:00Z",
        "call_date": "2026-02-20",
        "linked_intake_id": "",
    },
    {
        "lead_source": "Referral",
        "payment_amount": 1495,
        "status": "Call Complete",
        "created": "2026-02-08T09:00:00Z",
        "call_date": "2026-02-14",
        "linked_intake_id": "def456",
    },
    {
        "lead_source": "Website",
        "payment_amount": 0,
        "status": "Lead - Laylo",
        "created": "2026-02-18T16:00:00Z",
        "call_date": "",
        "linked_intake_id": "",
    },
    {
        "lead_source": "IG DM",
        "payment_amount": 0,
        "status": "Lead - Laylo",
        "created": "2026-02-19T11:00:00Z",
        "call_date": "",
        "linked_intake_id": "",
    },
]


# ── Tests ─────────────────────────────────────────────────────────


def test_attribute_first_touch():
    result = attribute_conversions(PAYMENTS, model="first_touch")
    assert "IG DM" in result
    assert result["IG DM"].lead_count == 3
    assert result["IG DM"].paid_count == 2
    assert result["IG DM"].revenue == 499 + 699


def test_attribute_linear():
    result = attribute_conversions(PAYMENTS, model="linear")
    assert result["Referral"].revenue == 1495
    assert result["Referral"].paid_count == 1
    assert result["Referral"].conversion_rate == 100.0


def test_attribute_time_decay():
    result = attribute_conversions(PAYMENTS, model="time_decay")
    # Time decay should still attribute something
    assert result["IG DM"].revenue > 0
    assert result["Referral"].revenue > 0


def test_unpaid_leads_counted():
    result = attribute_conversions(PAYMENTS, model="first_touch")
    assert result["Website"].lead_count == 1
    assert result["Website"].paid_count == 0
    assert result["Website"].revenue == 0


def test_conversion_rate_calculation():
    result = attribute_conversions(PAYMENTS, model="linear")
    # IG DM: 2 paid out of 3 leads = 66.7%
    assert 66 <= result["IG DM"].conversion_rate <= 67


def test_avg_deal_size():
    result = attribute_conversions(PAYMENTS, model="first_touch")
    assert result["Referral"].avg_deal_size == 1495.0
    assert result["IG DM"].avg_deal_size == (499 + 699) / 2


def test_compare_models():
    comparison = compare_models(PAYMENTS)
    assert len(comparison) == 4
    assert "first_touch" in comparison
    assert "time_decay" in comparison
    for model_results in comparison.values():
        assert "IG DM" in model_results


def test_channel_roi_no_costs():
    results = channel_roi(PAYMENTS)
    assert len(results) > 0
    # Without costs, ROI should be None
    for r in results:
        assert r["roi"] is None


def test_channel_roi_with_costs():
    costs = {"IG DM": 100, "Referral": 50}
    results = channel_roi(PAYMENTS, channel_costs=costs)
    ig = next(r for r in results if r["channel"] == "IG DM")
    assert ig["cost"] == 100
    assert ig["roi"] is not None
    # ROI = (revenue - cost) / cost * 100
    expected_roi = (ig["revenue"] - 100) / 100 * 100
    assert abs(ig["roi"] - expected_roi) < 0.2


def test_empty_payments():
    result = attribute_conversions([], model="first_touch")
    assert result == {}


def test_unknown_source():
    payments = [{"payment_amount": 499, "status": "Paid", "created": "2026-02-10"}]
    result = attribute_conversions(payments, model="first_touch")
    assert "Unknown" in result


def test_invalid_model_falls_back():
    result = attribute_conversions(PAYMENTS, model="invalid")
    assert len(result) > 0  # Falls back to linear


def test_revenue_by_source_over_time():
    result = get_revenue_by_source_over_time(PAYMENTS)
    assert "2026-02" in result
    assert result["2026-02"]["IG DM"] == 499 + 699
    assert result["2026-02"]["Referral"] == 1495


def test_channel_metrics_as_dict():
    m = ChannelMetrics(channel="Test", lead_count=5, paid_count=2, revenue=998.0)
    m.avg_deal_size = 499.0
    m.conversion_rate = 40.0
    d = m.as_dict()
    assert d["channel"] == "Test"
    assert d["revenue"] == 998.0
