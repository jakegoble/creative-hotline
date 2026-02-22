"""Tests for the lead scoring algorithm."""

from app.utils.lead_scorer import (
    score_client,
    score_all_clients,
    get_tier_color,
    _score_engagement,
    _score_velocity,
    _score_urgency,
    _score_source,
    _score_upsell,
)


# ── Test Data ─────────────────────────────────────────────────────

PAYMENT_HOT = {
    "id": "p1",
    "client_name": "Sarah Chen",
    "email": "sarah@example.com",
    "payment_amount": 699,
    "product_purchased": "Standard Call",
    "payment_date": "2026-02-18",
    "status": "Intake Complete",
    "call_date": "2026-02-20",
    "lead_source": "Referral",
    "created": "2026-02-17T10:00:00.000Z",
}

INTAKE_HOT = {
    "id": "i1",
    "client_name": "Sarah Chen",
    "email": "sarah@example.com",
    "role": "Creative Director",
    "brand": "Studio Lumen",
    "creative_emergency": (
        "We're launching a rebrand in two weeks and the entire visual identity "
        "feels disconnected from our positioning. Our team is stuck on direction "
        "and we need someone external to cut through the noise. We've been going "
        "back and forth for a month and can't afford to miss this deadline."
    ),
    "desired_outcome": ["A clear decision", "Direction I can trust", "A short action plan"],
    "what_tried": (
        "Hired a freelance designer who delivered 3 concepts but none felt right. "
        "Tried Pinterest mood boards. Asked our team for input but got conflicting feedback."
    ),
    "deadline": "2 weeks — launch is March 5",
    "constraints": "Budget is locked. Can't change the name.",
    "ai_summary": "Strong candidate for Sprint upsell.",
    "action_plan_sent": False,
    "created": "2026-02-19T08:00:00.000Z",
}

PAYMENT_COLD = {
    "id": "p2",
    "client_name": "",
    "email": "cold@example.com",
    "payment_amount": 0,
    "product_purchased": "",
    "payment_date": "",
    "status": "Lead - Laylo",
    "call_date": "",
    "lead_source": "",
    "created": "2026-01-01T10:00:00.000Z",
}


# ── Engagement Tests ──────────────────────────────────────────────


def test_engagement_no_intake():
    result = _score_engagement(None)
    assert result["score"] == 0
    assert result["max"] == 30


def test_engagement_full_intake():
    result = _score_engagement(INTAKE_HOT)
    assert result["score"] > 20, f"Rich intake should score >20, got {result['score']}"
    assert result["max"] == 30


def test_engagement_sparse_intake():
    sparse = {"role": "Designer", "brand": "", "creative_emergency": "stuck", "desired_outcome": []}
    result = _score_engagement(sparse)
    assert result["score"] < 15, f"Sparse intake should score <15, got {result['score']}"


# ── Velocity Tests ────────────────────────────────────────────────


def test_velocity_fast_pipeline():
    result = _score_velocity(PAYMENT_HOT, INTAKE_HOT)
    assert result["score"] > 10, f"Fast pipeline should score >10, got {result['score']}"


def test_velocity_no_dates():
    result = _score_velocity(PAYMENT_COLD, None)
    assert result["score"] == 0


# ── Urgency Tests ─────────────────────────────────────────────────


def test_urgency_urgent_deadline():
    result = _score_urgency(INTAKE_HOT)
    assert result["score"] > 10, f"2-week deadline should score >10, got {result['score']}"


def test_urgency_no_intake():
    result = _score_urgency(None)
    assert result["score"] == 0


def test_urgency_no_deadline():
    result = _score_urgency({"deadline": "", "creative_emergency": "just exploring options"})
    assert result["score"] < 5


# ── Source Tests ──────────────────────────────────────────────────


def test_source_referral():
    result = _score_source(PAYMENT_HOT)
    assert result["score"] >= 14


def test_source_unknown():
    result = _score_source(PAYMENT_COLD)
    assert result["score"] <= 5


def test_source_sprint_client():
    sprint = {**PAYMENT_HOT, "product_purchased": "3-Pack Sprint"}
    result = _score_source(sprint)
    assert result["score"] == 15


# ── Upsell Tests ──────────────────────────────────────────────────


def test_upsell_multi_project():
    result = _score_upsell(INTAKE_HOT, PAYMENT_HOT)
    assert result["score"] > 0


def test_upsell_no_intake():
    result = _score_upsell(None, PAYMENT_COLD)
    assert result["score"] == 0


def test_upsell_entry_tier():
    first_call = {**PAYMENT_HOT, "product_purchased": "First Call", "payment_amount": 499}
    result = _score_upsell(INTAKE_HOT, first_call)
    assert result["score"] >= 3, "Entry-tier purchase should contribute to upsell score"


# ── Full Scoring Tests ────────────────────────────────────────────


def test_hot_client_scores_high():
    result = score_client(PAYMENT_HOT, INTAKE_HOT)
    assert result["total"] >= 50, f"Hot client should score >=50, got {result['total']}"
    assert result["tier"] in ("Hot", "Warm")


def test_cold_client_scores_low():
    result = score_client(PAYMENT_COLD, None)
    assert result["total"] < 25, f"Cold client should score <25, got {result['total']}"
    assert result["tier"] == "Cold"


def test_score_all_clients_sorted():
    merged = [
        {"payment": PAYMENT_COLD, "intake": None},
        {"payment": PAYMENT_HOT, "intake": INTAKE_HOT},
    ]
    scored = score_all_clients(merged)
    assert len(scored) == 2
    assert scored[0]["score"]["total"] >= scored[1]["score"]["total"]


def test_tier_colors():
    assert get_tier_color("Hot") == "#FF6B35"
    assert get_tier_color("Cold") == "#999999"
    assert get_tier_color("Unknown") == "#999999"
