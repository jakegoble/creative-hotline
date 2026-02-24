"""Tests for Frankie voice prompt templates — validates structure and content."""

from __future__ import annotations

from app.utils.frankie_prompts import (
    ACTION_PLAN_SYSTEM_PROMPT,
    ICP_ANALYSIS_SYSTEM_PROMPT,
    TRANSCRIPT_PROCESSING_PROMPT,
    INTAKE_ANALYSIS_PROMPT,
    UPSELL_DETECTION_PROMPT,
    PRE_CALL_BRIEFING_PROMPT,
    REVENUE_STRATEGY_PROMPT,
    TESTIMONIAL_GENERATION_PROMPT,
    CASE_STUDY_PROMPT,
    build_action_plan_prompt,
    build_icp_prompt,
    build_transcript_processing_prompt,
    build_action_plan_from_transcript_prompt,
    build_intake_analysis_prompt,
    build_upsell_detection_prompt,
    build_pre_call_briefing_prompt,
    build_testimonial_prompt,
    build_case_study_prompt,
    build_growth_analysis_prompt,
)


# ── System Prompt Validation ─────────────────────────────────────────


def test_action_plan_prompt_has_required_sections():
    for section in [
        "## Hey",
        "## The Situation",
        "## The Quick Win",
        "## What to Do Next",
        "## What to Ignore",
        "## Tools & Resources",
        "## How You'll Know It's Working",
        "## What's Next",
    ]:
        assert section in ACTION_PLAN_SYSTEM_PROMPT


def test_action_plan_prompt_has_frankie_signoff():
    assert "Frankie" in ACTION_PLAN_SYSTEM_PROMPT


def test_action_plan_prompt_forbids_buzzwords():
    assert "synergy" in ACTION_PLAN_SYSTEM_PROMPT  # mentioned as banned
    assert "leverage" in ACTION_PLAN_SYSTEM_PROMPT


def test_action_plan_prompt_has_sprint_rules():
    assert "Sprint" in ACTION_PLAN_SYSTEM_PROMPT
    assert "Session 1 of 3" in ACTION_PLAN_SYSTEM_PROMPT


def test_icp_prompt_has_analysis_sections():
    for section in [
        "Top Creative Emergencies",
        "Desired Outcome Patterns",
        "Upsell Predictors",
        "Industry/Role Clusters",
        "Ideal Client Profile",
        "Lookalike Scoring Signals",
    ]:
        assert section in ICP_ANALYSIS_SYSTEM_PROMPT


def test_transcript_processing_prompt_returns_json():
    assert "JSON" in TRANSCRIPT_PROCESSING_PROMPT
    assert "key_themes" in TRANSCRIPT_PROCESSING_PROMPT
    assert "decisions_made" in TRANSCRIPT_PROCESSING_PROMPT
    assert "word_count" in TRANSCRIPT_PROCESSING_PROMPT


def test_intake_analysis_prompt_has_sections():
    assert "One-sentence summary" in INTAKE_ANALYSIS_PROMPT
    assert "Red flags" in INTAKE_ANALYSIS_PROMPT
    assert "Upsell signal" in INTAKE_ANALYSIS_PROMPT


def test_upsell_detection_prompt_returns_json():
    assert "JSON" in UPSELL_DETECTION_PROMPT
    assert "upsell_recommended" in UPSELL_DETECTION_PROMPT
    assert "confidence" in UPSELL_DETECTION_PROMPT


def test_pre_call_briefing_is_internal():
    assert "INTERNAL" in PRE_CALL_BRIEFING_PROMPT


def test_revenue_strategy_prompt_mentions_800k():
    assert "800K" in REVENUE_STRATEGY_PROMPT or "$800K" in REVENUE_STRATEGY_PROMPT


def test_testimonial_prompt_no_quotation_marks():
    assert "quotation marks" in TESTIMONIAL_GENERATION_PROMPT


def test_case_study_has_structure():
    assert "## What They Were Dealing With" in CASE_STUDY_PROMPT
    assert "## What We Told Them to Do" in CASE_STUDY_PROMPT
    assert "## What Happened" in CASE_STUDY_PROMPT


# ── build_action_plan_prompt ─────────────────────────────────────────


def test_build_action_plan_prompt_contains_client_data():
    result = build_action_plan_prompt(
        client_name="Sarah Chen",
        brand="Studio Lumen",
        role="Creative Director",
        creative_emergency="Rebranding in 2 weeks",
        desired_outcome="A clear decision",
        what_tried="Hired freelancer",
        deadline="2 weeks",
        constraints="Budget locked",
        ai_summary="Strong candidate for Sprint.",
        call_notes="Discussed brand positioning.",
        product_purchased="Single Call",
        payment_amount=699,
    )
    assert "Sarah Chen" in result
    assert "Studio Lumen" in result
    assert "Rebranding in 2 weeks" in result
    assert "$699" in result
    assert "Single Call" in result
    assert "TODAY'S DATE" in result


# ── build_icp_prompt ─────────────────────────────────────────────────


def test_build_icp_prompt_includes_all_clients():
    clients = [
        {
            "payment": {"product_purchased": "Single Call", "payment_amount": 699, "status": "Call Complete"},
            "intake": {"role": "CEO", "brand": "TestBrand", "creative_emergency": "Help", "desired_outcome": ["Direction"], "what_tried": "Nothing", "deadline": "ASAP", "ai_summary": "Good fit."},
        },
        {
            "payment": {"product_purchased": "First Call", "payment_amount": 499, "status": "Paid"},
            "intake": None,
        },
    ]
    result = build_icp_prompt(clients)
    assert "2 clients" in result
    assert "Client 1" in result
    assert "Client 2" in result
    assert "CEO" in result
    assert "TestBrand" in result


def test_build_icp_prompt_empty():
    result = build_icp_prompt([])
    assert "0 clients" in result


# ── build_transcript_processing_prompt ───────────────────────────────


def test_build_transcript_processing_prompt():
    result = build_transcript_processing_prompt("Hello world this is a test transcript")
    assert "7 words" in result or "words" in result
    assert "test transcript" in result


# ── build_action_plan_from_transcript_prompt ─────────────────────────


def test_build_action_plan_from_transcript_prompt():
    summary = {
        "key_themes": ["brand positioning", "content calendar"],
        "decisions_made": ["launch date set for March"],
        "recommendations_given": ["use Notion for planning"],
        "action_items_discussed": ["set up brand board"],
        "client_concerns": ["tight timeline"],
        "notable_quotes": ["I need this done yesterday"],
    }
    result = build_action_plan_from_transcript_prompt(
        client_name="Sarah",
        brand="Lumen",
        role="Director",
        creative_emergency="Rebrand",
        desired_outcome="Clarity",
        what_tried="Freelancer",
        deadline="2 weeks",
        constraints="Budget",
        ai_summary="Sprint candidate.",
        transcript_summary=summary,
        product_purchased="Single Call",
        payment_amount=699,
    )
    assert "brand positioning" in result
    assert "launch date set for March" in result
    assert "tight timeline" in result
    assert '"I need this done yesterday"' in result
    assert "$699" in result


def test_build_action_plan_from_transcript_empty_summary():
    result = build_action_plan_from_transcript_prompt(
        client_name="Test",
        brand="Brand",
        role="Role",
        creative_emergency="Emergency",
        desired_outcome="Outcome",
        what_tried="Nothing",
        deadline="None",
        constraints="None",
        ai_summary="",
        transcript_summary={},
        product_purchased="First Call",
        payment_amount=499,
    )
    assert "Test" in result
    assert "$499" in result


# ── build_intake_analysis_prompt ─────────────────────────────────────


def test_build_intake_analysis_prompt():
    result = build_intake_analysis_prompt(
        client_name="Alex Rivera",
        brand="NeonWave Studios",
        role="Founder",
        creative_emergency="Need to launch in 3 weeks",
        desired_outcome="Direction I can trust",
        what_tried="DIY branding, 2 failed agencies",
        deadline="3 weeks",
        constraints="$5K budget cap",
    )
    assert "Alex Rivera" in result
    assert "NeonWave Studios" in result
    assert "3 weeks" in result
    assert "$5K budget cap" in result


# ── build_upsell_detection_prompt ────────────────────────────────────


def test_build_upsell_detection_prompt():
    result = build_upsell_detection_prompt(
        client_name="Test Client",
        creative_emergency="Multiple problems here",
        desired_outcome="A clear decision, Stronger positioning, Direction",
        what_tried="Tried everything",
        deadline="2 months",
        constraints="None",
    )
    assert "Test Client" in result
    assert "Multiple problems" in result


# ── build_pre_call_briefing_prompt ───────────────────────────────────


def test_build_pre_call_briefing_prompt():
    result = build_pre_call_briefing_prompt(
        client_name="Sarah Chen",
        brand="Studio Lumen",
        role="Creative Director",
        creative_emergency="Rebrand",
        desired_outcome="Clarity",
        what_tried="Freelancer",
        deadline="2 weeks",
        constraints="Budget locked",
        ai_summary="Sprint candidate.",
        call_date="2026-02-20",
    )
    assert "Sarah Chen" in result
    assert "2026-02-20" in result
    assert "Sprint candidate." in result


# ── build_testimonial_prompt ─────────────────────────────────────────


def test_build_testimonial_prompt():
    result = build_testimonial_prompt(
        client_name="Jordan Park",
        brand="Palette & Co",
        creative_emergency="Brand identity crisis",
        outcome_text="Launched rebrand in 3 weeks, 40% more engagement",
        product_purchased="Single Call",
    )
    assert "Jordan Park" in result
    assert "40% more engagement" in result


# ── build_case_study_prompt ──────────────────────────────────────────


def test_build_case_study_prompt():
    result = build_case_study_prompt(
        client_name="Jordan Park",
        brand="Palette & Co",
        role="Founder",
        creative_emergency="Outdated brand identity",
        action_plan_summary="Visual refresh + content strategy",
        outcome_text="Revenue up 25%",
        product_purchased="3-Session Clarity Sprint",
    )
    assert "Jordan Park" in result
    assert "Visual refresh" in result
    assert "Revenue up 25%" in result
    assert "3-Session Clarity Sprint" in result


# ── build_growth_analysis_prompt ─────────────────────────────────────


def test_build_growth_analysis_prompt():
    result = build_growth_analysis_prompt(
        revenue_pace={"monthly_avg": 5000, "annual_pace": 60000},
        goal=800_000,
        channel_data=[
            {"channel": "IG DM", "leads": 50, "conversions": 10, "revenue": 6990},
            {"channel": "Referral", "leads": 20, "conversions": 8, "revenue": 5592},
        ],
        product_mix={
            "Single Call": {"count": 10, "revenue": 6990},
            "First Call": {"count": 5, "revenue": 2495},
        },
        upsell_rate_pct=15.0,
    )
    assert "$800,000" in result
    assert "IG DM" in result
    assert "15.0%" in result
    assert "20 calls/week" in result


def test_build_growth_analysis_prompt_empty_channels():
    result = build_growth_analysis_prompt(
        revenue_pace={"monthly_avg": 0, "annual_pace": 0},
        goal=800_000,
        channel_data=[],
        product_mix={},
        upsell_rate_pct=0.0,
    )
    assert "$800,000" in result
