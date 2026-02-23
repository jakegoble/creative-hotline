"""Tests for intake text mining utility."""

from app.utils.keyword_extractor import (
    extract_themes,
    extract_pain_points,
    extract_all_pain_points,
    get_industry_distribution,
    get_outcome_demand,
)


# ── Fixtures ──────────────────────────────────────────────────────

INTAKES = [
    {
        "role": "Fashion designer",
        "brand": "Luxe Threads",
        "creative_emergency": "I need help with my brand identity and social media strategy. My instagram is inconsistent and I'm stuck.",
        "what_tried": "I tried hiring a social media manager but it didn't work. I'm overwhelmed.",
        "constraints": "Budget is tight, need results in 2 months.",
        "desired_outcome": ["A clear decision", "Stronger positioning"],
    },
    {
        "role": "Chef and restaurant owner",
        "brand": "Ember Kitchen",
        "creative_emergency": "Launching a new restaurant concept. Need brand positioning and a content plan for the launch.",
        "what_tried": "DIY branding with Canva. No direction on messaging.",
        "constraints": "Opening in 6 weeks.",
        "desired_outcome": ["A short action plan", "Direction I can trust"],
    },
    {
        "role": "Music producer",
        "brand": "Night Shift Records",
        "creative_emergency": "Rebranding my label. Need visual identity and website overhaul.",
        "what_tried": "Worked with a designer but the results were inconsistent.",
        "constraints": "Need it done before festival season.",
        "desired_outcome": ["A clear decision", "Stronger positioning", "A short action plan"],
    },
    {
        "role": "Life coach",
        "brand": "Aligned Living Co",
        "creative_emergency": "I'm second-guessing everything. My brand feels scattered and I'm not converting clients.",
        "what_tried": "Took an online course. Still confused.",
        "constraints": "",
        "desired_outcome": ["Someone to tell me the truth"],
    },
]


# ── Theme Tests ───────────────────────────────────────────────────


def test_extract_themes():
    themes = extract_themes(INTAKES)
    assert len(themes) > 0
    theme_names = [t.theme for t in themes]
    assert "Branding" in theme_names
    assert "Social Media" in theme_names


def test_theme_counts_correct():
    themes = extract_themes(INTAKES)
    branding = next(t for t in themes if t.theme == "Branding")
    # All 4 intakes mention branding-related keywords
    assert branding.count >= 2


def test_theme_keywords_found():
    themes = extract_themes(INTAKES)
    branding = next(t for t in themes if t.theme == "Branding")
    assert len(branding.keywords_found) > 0


def test_themes_empty_intakes():
    assert extract_themes([]) == []


def test_theme_percentage():
    themes = extract_themes(INTAKES)
    for theme in themes:
        assert 0 <= theme.percentage <= 100


# ── Pain Point Tests ──────────────────────────────────────────────


def test_extract_pain_points_single():
    points = extract_pain_points(INTAKES[0])
    assert "stuck" in points
    assert "inconsistent" in points
    assert "overwhelmed" in points


def test_extract_pain_points_empty():
    assert extract_pain_points({}) == []


def test_extract_all_pain_points():
    all_points = extract_all_pain_points(INTAKES)
    assert "inconsistent" in all_points
    assert all_points["inconsistent"] >= 2  # mentioned in intake 0 and 2


def test_pain_points_second_guessing():
    points = extract_pain_points(INTAKES[3])
    assert "second-guessing" in points


# ── Industry Tests ────────────────────────────────────────────────


def test_industry_distribution():
    dist = get_industry_distribution(INTAKES)
    assert "Fashion" in dist
    assert "Food & Beverage" in dist
    assert "Music" in dist
    # "Life coach" matches Wellness (coach keyword) before Coaching
    assert "Wellness" in dist or "Coaching" in dist


def test_industry_empty():
    assert get_industry_distribution([]) == {}


# ── Outcome Demand Tests ──────────────────────────────────────────


def test_outcome_demand():
    demand = get_outcome_demand(INTAKES)
    assert "A clear decision" in demand
    assert demand["A clear decision"] == 2
    assert "Stronger positioning" in demand
    assert demand["Stronger positioning"] == 2
    assert "A short action plan" in demand
    assert demand["A short action plan"] == 2


def test_outcome_demand_empty():
    assert get_outcome_demand([]) == {}
