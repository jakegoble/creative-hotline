"""Tests for brand audit scoring model."""

from __future__ import annotations

from app.utils.brand_auditor import (
    score_brand,
    compare_brands,
    BrandAuditResult,
    DimensionScore,
    SCORING_WEIGHTS,
    DIMENSION_LABELS,
    TIER_STRONG,
    TIER_DEVELOPING,
    TIER_NEEDS_WORK,
    _get_tier,
    _get_percentile,
)


# ── Fixtures ─────────────────────────────────────────────────────

def _rich_intake():
    """A well-articulated intake with strong brand signals."""
    return {
        "brand": "Studio Lumen",
        "role": "Creative Director",
        "website": "https://www.studiolumen.co",
        "creative_emergency": (
            "We need to rebrand our visual identity. Our current look feels "
            "disconnected from our target audience. We specialize in luxury "
            "hospitality design and our competitors are outpacing us visually. "
            "We need a content strategy that stands out and a clear positioning "
            "that differentiates us in the market."
        ),
        "desired_outcome": ["A clear decision", "Direction I can trust", "Brand positioning"],
        "what_tried": (
            "Hired a freelance designer. Got 3 concepts but none felt right. "
            "Tried posting on Instagram 3x/week but engagement dropped. "
            "We have a newsletter that goes out monthly."
        ),
        "deadline": "2 weeks",
        "constraints": "Budget locked at $5K. Can't change our name.",
        "payment_amount": 699,
    }


def _sparse_intake():
    """Minimal intake with little brand articulation."""
    return {
        "brand": "",
        "role": "",
        "website": "",
        "creative_emergency": "Need help.",
        "desired_outcome": [],
        "what_tried": "",
        "deadline": "",
        "constraints": "",
        "payment_amount": 0,
    }


# ── Weight Tests ─────────────────────────────────────────────────

class TestScoringWeights:
    def test_weights_sum_to_one(self):
        total = sum(SCORING_WEIGHTS.values())
        assert abs(total - 1.0) < 1e-9

    def test_all_dimensions_have_labels(self):
        for dim in SCORING_WEIGHTS:
            assert dim in DIMENSION_LABELS

    def test_six_dimensions(self):
        assert len(SCORING_WEIGHTS) == 6


# ── Tier Tests ───────────────────────────────────────────────────

class TestTiers:
    def test_strong_tier(self):
        assert _get_tier(80) == "Strong"
        assert _get_tier(78) == "Strong"
        assert _get_tier(100) == "Strong"

    def test_developing_tier(self):
        assert _get_tier(60) == "Developing"
        assert _get_tier(55) == "Developing"
        assert _get_tier(77) == "Developing"

    def test_needs_work_tier(self):
        assert _get_tier(40) == "Needs Work"
        assert _get_tier(35) == "Needs Work"

    def test_critical_tier(self):
        assert _get_tier(34) == "Critical"
        assert _get_tier(0) == "Critical"

    def test_percentile_top(self):
        assert "Top 25%" in _get_percentile(80)

    def test_percentile_above_avg(self):
        assert "Above average" in _get_percentile(65)

    def test_percentile_average(self):
        assert "Average" in _get_percentile(55)

    def test_percentile_below(self):
        assert "Below average" in _get_percentile(45)

    def test_percentile_bottom(self):
        assert "Bottom 25%" in _get_percentile(30)


# ── Score Brand Tests ────────────────────────────────────────────

class TestScoreBrand:
    def test_rich_intake_scores_higher(self):
        rich = score_brand(_rich_intake())
        sparse = score_brand(_sparse_intake())
        assert rich.composite_score > sparse.composite_score

    def test_returns_brand_audit_result(self):
        result = score_brand(_rich_intake())
        assert isinstance(result, BrandAuditResult)

    def test_has_all_dimensions(self):
        result = score_brand(_rich_intake())
        assert len(result.dimensions) == 6
        dim_names = {d.dimension for d in result.dimensions}
        assert dim_names == set(SCORING_WEIGHTS.keys())

    def test_composite_within_range(self):
        result = score_brand(_rich_intake())
        assert 0 <= result.composite_score <= 100

    def test_sparse_composite_within_range(self):
        result = score_brand(_sparse_intake())
        assert 0 <= result.composite_score <= 100

    def test_has_tier(self):
        result = score_brand(_rich_intake())
        assert result.tier in ("Strong", "Developing", "Needs Work", "Critical")

    def test_has_percentile(self):
        result = score_brand(_rich_intake())
        assert result.percentile  # non-empty string

    def test_has_top_strength_and_weakness(self):
        result = score_brand(_rich_intake())
        assert result.top_strength
        assert result.top_weakness

    def test_has_priority_actions(self):
        result = score_brand(_sparse_intake())
        # Sparse intake should generate recommendations
        assert len(result.priority_actions) > 0

    def test_max_three_priority_actions(self):
        result = score_brand(_sparse_intake())
        assert len(result.priority_actions) <= 3

    def test_brand_name_from_data(self):
        result = score_brand({"brand": "TestBrand"})
        assert result.brand_name == "TestBrand"

    def test_missing_brand_name_defaults(self):
        result = score_brand({})
        assert result.brand_name == "Unknown Brand"

    def test_as_dict_round_trip(self):
        result = score_brand(_rich_intake())
        d = result.as_dict()
        assert "composite_score" in d
        assert "dimensions" in d
        assert len(d["dimensions"]) == 6
        assert "brand_name" in d


# ── Dimension Score Tests ────────────────────────────────────────

class TestDimensionScores:
    def test_dimension_raw_score_capped_at_100(self):
        result = score_brand(_rich_intake())
        for dim in result.dimensions:
            assert dim.raw_score <= 100

    def test_dimension_weighted_score_within_range(self):
        result = score_brand(_rich_intake())
        for dim in result.dimensions:
            assert dim.weighted_score <= dim.raw_score * dim.weight + 0.01

    def test_dimension_has_signals(self):
        result = score_brand(_rich_intake())
        for dim in result.dimensions:
            assert isinstance(dim.signals, list)

    def test_dimension_as_dict(self):
        result = score_brand(_rich_intake())
        d = result.dimensions[0].as_dict()
        assert "dimension" in d
        assert "raw_score" in d
        assert "weighted_score" in d
        assert "signals" in d

    def test_visual_identity_website_boost(self):
        with_site = score_brand({"website": "https://example.com"})
        without_site = score_brand({})
        vi_with = next(d for d in with_site.dimensions if d.dimension == "visual_identity")
        vi_without = next(d for d in without_site.dimensions if d.dimension == "visual_identity")
        assert vi_with.raw_score > vi_without.raw_score

    def test_messaging_clarity_emergency_depth(self):
        deep = score_brand({"creative_emergency": "word " * 60})
        shallow = score_brand({"creative_emergency": "help"})
        mc_deep = next(d for d in deep.dimensions if d.dimension == "messaging_clarity")
        mc_shallow = next(d for d in shallow.dimensions if d.dimension == "messaging_clarity")
        assert mc_deep.raw_score > mc_shallow.raw_score

    def test_competitive_positioning_payment_tier(self):
        premium = score_brand({"payment_amount": 1495})
        entry = score_brand({"payment_amount": 499})
        cp_prem = next(d for d in premium.dimensions if d.dimension == "competitive_positioning")
        cp_entry = next(d for d in entry.dimensions if d.dimension == "competitive_positioning")
        assert cp_prem.raw_score > cp_entry.raw_score


# ── Compare Brands Tests ─────────────────────────────────────────

class TestCompareBrands:
    def test_empty_list(self):
        result = compare_brands([])
        assert result == {"count": 0}

    def test_single_brand(self):
        audit = score_brand(_rich_intake())
        result = compare_brands([audit])
        assert result["count"] == 1
        assert result["avg_composite"] == audit.composite_score

    def test_multiple_brands(self):
        rich = score_brand(_rich_intake())
        sparse = score_brand(_sparse_intake())
        result = compare_brands([rich, sparse])
        assert result["count"] == 2
        assert result["min_composite"] <= result["avg_composite"] <= result["max_composite"]
        assert "tier_distribution" in result
        assert "dimension_averages" in result

    def test_tier_distribution_sums(self):
        results = [score_brand(_rich_intake()), score_brand(_sparse_intake())]
        comp = compare_brands(results)
        tier_total = sum(comp["tier_distribution"].values())
        assert tier_total == 2
