"""Brand audit scoring model for the AI Brand Audit product ($299).

Scores a brand across 6 dimensions using intake data, website presence,
and content signals. Returns a 0-100 composite score with per-dimension
breakdowns, percentile ranking, and prioritized recommendations.

Scoring weights defined by Growth Intelligence (Feb 2026).
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ── Scoring Weights ──────────────────────────────────────────────

SCORING_WEIGHTS: dict[str, float] = {
    "visual_identity": 0.20,
    "messaging_clarity": 0.20,
    "messaging_consistency": 0.15,
    "messaging_differentiation": 0.15,
    "content_strategy": 0.15,
    "competitive_positioning": 0.15,
}

DIMENSION_LABELS: dict[str, str] = {
    "visual_identity": "Visual Identity",
    "messaging_clarity": "Messaging Clarity",
    "messaging_consistency": "Messaging Consistency",
    "messaging_differentiation": "Messaging Differentiation",
    "content_strategy": "Content Strategy",
    "competitive_positioning": "Competitive Positioning",
}


# ── Data Classes ─────────────────────────────────────────────────

@dataclass
class DimensionScore:
    """Score for a single audit dimension."""
    dimension: str
    label: str
    raw_score: float      # 0-100 for this dimension
    weighted_score: float  # raw * weight
    weight: float
    signals: list[str] = field(default_factory=list)
    recommendation: str = ""

    def as_dict(self) -> dict:
        return {
            "dimension": self.dimension,
            "label": self.label,
            "raw_score": round(self.raw_score, 1),
            "weighted_score": round(self.weighted_score, 1),
            "weight": self.weight,
            "signals": self.signals,
            "recommendation": self.recommendation,
        }


@dataclass
class BrandAuditResult:
    """Complete brand audit result."""
    brand_name: str
    composite_score: float  # 0-100 weighted total
    percentile: str         # e.g., "Top 25%", "Below average"
    tier: str               # "Strong", "Developing", "Needs Work", "Critical"
    dimensions: list[DimensionScore] = field(default_factory=list)
    top_strength: str = ""
    top_weakness: str = ""
    priority_actions: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "brand_name": self.brand_name,
            "composite_score": round(self.composite_score, 1),
            "percentile": self.percentile,
            "tier": self.tier,
            "dimensions": [d.as_dict() for d in self.dimensions],
            "top_strength": self.top_strength,
            "top_weakness": self.top_weakness,
            "priority_actions": self.priority_actions,
        }


# ── Tier Thresholds ──────────────────────────────────────────────

TIER_STRONG = 78
TIER_DEVELOPING = 55
TIER_NEEDS_WORK = 35


def _get_tier(score: float) -> str:
    """Map composite score to tier label."""
    if score >= TIER_STRONG:
        return "Strong"
    if score >= TIER_DEVELOPING:
        return "Developing"
    if score >= TIER_NEEDS_WORK:
        return "Needs Work"
    return "Critical"


def _get_percentile(score: float) -> str:
    """Map composite score to percentile description.

    Based on BRAND_AUDIT_BENCHMARKS distribution:
    top_quartile=78, avg_creative=62, avg_all=55, bottom_quartile=42.
    """
    if score >= 78:
        return "Top 25% of creative services brands"
    if score >= 62:
        return "Above average for creative services"
    if score >= 55:
        return "Average across all industries"
    if score >= 42:
        return "Below average — significant upside"
    return "Bottom 25% — urgent attention needed"


# ── Dimension Scorers ────────────────────────────────────────────


def _score_visual_identity(data: dict) -> DimensionScore:
    """Visual Identity — logo, color palette, typography, brand assets.

    Signals: has_logo, has_brand_colors, has_typography, has_style_guide,
    website_exists, consistent_visuals.
    """
    points = 0
    signals = []

    if data.get("website"):
        points += 25
        signals.append("Website present")
    if data.get("brand"):
        points += 15
        signals.append("Brand name defined")
    if data.get("has_logo", True):  # Assume true unless told otherwise
        points += 20
        signals.append("Logo exists")

    # Instagram/social presence implies visual identity
    ig = data.get("website", "") or ""
    if "instagram" in ig.lower() or "ig" in ig.lower():
        points += 15
        signals.append("Social presence")

    # Intake mentions visual elements
    emergency = (data.get("creative_emergency", "") or "").lower()
    if any(w in emergency for w in ["rebrand", "logo", "visual", "design", "aesthetic"]):
        # They're aware of visual identity needs — indicates both awareness and gaps
        points += 10
        signals.append("Visual identity awareness")
    else:
        points += 15  # No visual emergency = probably stable

    recommendation = ""
    if points < 50:
        recommendation = "Invest in a cohesive visual identity system — logo, color palette, typography, and brand guidelines."
    elif points < 75:
        recommendation = "Formalize your visual standards into a style guide to ensure consistency across all touchpoints."

    return DimensionScore(
        dimension="visual_identity",
        label="Visual Identity",
        raw_score=min(points, 100),
        weighted_score=min(points, 100) * SCORING_WEIGHTS["visual_identity"],
        weight=SCORING_WEIGHTS["visual_identity"],
        signals=signals,
        recommendation=recommendation,
    )


def _score_messaging_clarity(data: dict) -> DimensionScore:
    """Messaging Clarity — can you explain what you do in one sentence?

    Signals from intake: role clarity, brand description, desired outcome
    specificity, creative emergency articulation.
    """
    points = 0
    signals = []

    # Role clarity
    role = data.get("role", "")
    if role and len(role.split()) >= 2:
        points += 20
        signals.append("Clear role definition")
    elif role:
        points += 10
        signals.append("Role stated")

    # Brand articulation
    brand = data.get("brand", "")
    if brand and len(brand.strip()) > 3:
        points += 15
        signals.append("Brand name defined")

    # Creative emergency articulation depth
    emergency = data.get("creative_emergency", "") or ""
    word_count = len(emergency.split())
    if word_count >= 50:
        points += 25
        signals.append(f"Detailed problem articulation ({word_count} words)")
    elif word_count >= 25:
        points += 18
        signals.append("Moderate problem articulation")
    elif word_count > 0:
        points += 10
        signals.append("Brief problem statement")

    # Desired outcomes specified
    outcomes = data.get("desired_outcome", [])
    if isinstance(outcomes, list) and len(outcomes) >= 2:
        points += 20
        signals.append(f"{len(outcomes)} clear desired outcomes")
    elif isinstance(outcomes, list) and outcomes:
        points += 10
        signals.append("Some outcomes defined")

    # What they've tried — shows they can articulate their journey
    tried = data.get("what_tried", "") or ""
    if len(tried.split()) >= 15:
        points += 20
        signals.append("Clear history of attempts")
    elif tried:
        points += 10

    recommendation = ""
    if points < 50:
        recommendation = "Develop a clear positioning statement: who you serve, what you do, and why it matters. Test it with 5 people outside your industry."
    elif points < 75:
        recommendation = "Your messaging has clarity but could be sharper. Distill your value proposition to one sentence."

    return DimensionScore(
        dimension="messaging_clarity",
        label="Messaging Clarity",
        raw_score=min(points, 100),
        weighted_score=min(points, 100) * SCORING_WEIGHTS["messaging_clarity"],
        weight=SCORING_WEIGHTS["messaging_clarity"],
        signals=signals,
        recommendation=recommendation,
    )


def _score_messaging_consistency(data: dict) -> DimensionScore:
    """Messaging Consistency — does the brand show up the same everywhere?

    Without access to multiple channels, we infer from intake data quality
    and constraints awareness.
    """
    points = 0
    signals = []

    # Constraints/avoid shows brand awareness
    constraints = data.get("constraints", "") or ""
    if len(constraints.split()) >= 10:
        points += 30
        signals.append("Clear brand boundaries defined")
    elif constraints:
        points += 15
        signals.append("Some constraints noted")

    # Website existence implies some consistency effort
    if data.get("website"):
        points += 25
        signals.append("Website as consistency anchor")

    # Brand name existence
    if data.get("brand"):
        points += 20
        signals.append("Consistent brand name")

    # Deadline awareness suggests organized thinking
    deadline = data.get("deadline", "")
    if deadline:
        points += 15
        signals.append("Timeline awareness")

    # Fill remaining based on overall completeness
    filled_fields = sum(1 for k in ["role", "brand", "website", "creative_emergency",
                                     "what_tried", "deadline", "constraints"]
                        if data.get(k))
    completeness_bonus = min(filled_fields * 3, 15)
    points += completeness_bonus
    if completeness_bonus > 5:
        signals.append(f"{filled_fields}/7 brand touchpoints documented")

    recommendation = ""
    if points < 50:
        recommendation = "Create a brand messaging document that every team member and freelancer references before creating content."
    elif points < 75:
        recommendation = "Audit your top 5 client touchpoints for voice and visual consistency — website, social bio, email signature, proposals, invoices."

    return DimensionScore(
        dimension="messaging_consistency",
        label="Messaging Consistency",
        raw_score=min(points, 100),
        weighted_score=min(points, 100) * SCORING_WEIGHTS["messaging_consistency"],
        weight=SCORING_WEIGHTS["messaging_consistency"],
        signals=signals,
        recommendation=recommendation,
    )


def _score_messaging_differentiation(data: dict) -> DimensionScore:
    """Messaging Differentiation — how distinct is this brand from competitors?

    Signals: unique language, specific niche, clear USP indicators.
    """
    points = 0
    signals = []

    emergency = (data.get("creative_emergency", "") or "").lower()
    tried = (data.get("what_tried", "") or "").lower()
    all_text = emergency + " " + tried

    # Niche specificity signals
    niche_words = ["niche", "specific", "specialize", "focus on", "only work with",
                   "target audience", "ideal client", "our people"]
    niche_matches = [w for w in niche_words if w in all_text]
    if niche_matches:
        points += 25
        signals.append("Niche awareness")

    # Competitive awareness
    comp_words = ["competitor", "different from", "stand out", "unique", "unlike",
                  "no one else", "our approach", "what sets us apart"]
    comp_matches = [w for w in comp_words if w in all_text]
    if comp_matches:
        points += 25
        signals.append("Competitive differentiation thinking")

    # If they mention being "stuck" or "same as everyone" — lower score
    undiff_words = ["generic", "same as everyone", "look like everyone",
                    "nothing special", "commodity", "blend in"]
    undiff_matches = [w for w in undiff_words if w in all_text]
    if undiff_matches:
        points += 5  # They're aware, but the problem exists
        signals.append("Aware of differentiation gap")
    elif not niche_matches and not comp_matches:
        points += 30  # No mention = probably not a pain point
        signals.append("No differentiation concerns raised")

    # Desired outcomes that suggest differentiation work
    outcomes = data.get("desired_outcome", [])
    if isinstance(outcomes, list):
        diff_outcomes = [o for o in outcomes if any(
            w in o.lower() for w in ["position", "brand", "differentiat", "stand out", "unique"]
        )]
        if diff_outcomes:
            points += 20
            signals.append("Seeking differentiation")

    # Base score for having a brand at all
    if data.get("brand"):
        points += 15

    recommendation = ""
    if points < 50:
        recommendation = "Define your 'Only Statement': We are the only [category] that [unique approach] for [specific audience]. If you can't fill this in, that's the first thing to fix."
    elif points < 75:
        recommendation = "You have a sense of what makes you different — now make it impossible to miss. Lead with your differentiator in every headline, bio, and intro."

    return DimensionScore(
        dimension="messaging_differentiation",
        label="Messaging Differentiation",
        raw_score=min(points, 100),
        weighted_score=min(points, 100) * SCORING_WEIGHTS["messaging_differentiation"],
        weight=SCORING_WEIGHTS["messaging_differentiation"],
        signals=signals,
        recommendation=recommendation,
    )


def _score_content_strategy(data: dict) -> DimensionScore:
    """Content Strategy — is there a plan for showing up consistently?

    Inferred from intake: what they've tried, their channels, their goals.
    """
    points = 0
    signals = []

    tried = (data.get("what_tried", "") or "").lower()
    emergency = (data.get("creative_emergency", "") or "").lower()
    all_text = tried + " " + emergency

    # Content mentions
    content_words = ["content", "post", "blog", "newsletter", "email",
                     "social media", "instagram", "tiktok", "youtube",
                     "podcast", "video", "reel"]
    content_matches = [w for w in content_words if w in all_text]
    if len(content_matches) >= 3:
        points += 30
        signals.append(f"Active across {len(content_matches)} content channels")
    elif content_matches:
        points += 15
        signals.append("Some content activity")

    # Strategy words
    strategy_words = ["strategy", "plan", "calendar", "schedule", "consistent",
                      "frequency", "audience", "analytics", "engagement"]
    strategy_matches = [w for w in strategy_words if w in all_text]
    if len(strategy_matches) >= 2:
        points += 25
        signals.append("Strategic content thinking")
    elif strategy_matches:
        points += 12

    # Website implies some content foundation
    website = data.get("website", "") or ""
    if website:
        points += 20
        signals.append("Website as content hub")

    # Outcomes related to content
    outcomes = data.get("desired_outcome", [])
    if isinstance(outcomes, list):
        content_outcomes = [o for o in outcomes if any(
            w in o.lower() for w in ["content", "social", "audience", "visibility", "awareness"]
        )]
        if content_outcomes:
            points += 20
            signals.append("Content growth as a goal")

    # Base points for engagement with process
    if data.get("creative_emergency"):
        points += 10

    recommendation = ""
    if points < 50:
        recommendation = "Start with one channel, one format, one cadence. Post 3x/week for 30 days before adding anything else."
    elif points < 75:
        recommendation = "You're creating content — now systematize it. Build a 30-day content calendar and batch-create to reduce friction."

    return DimensionScore(
        dimension="content_strategy",
        label="Content Strategy",
        raw_score=min(points, 100),
        weighted_score=min(points, 100) * SCORING_WEIGHTS["content_strategy"],
        weight=SCORING_WEIGHTS["content_strategy"],
        signals=signals,
        recommendation=recommendation,
    )


def _score_competitive_positioning(data: dict) -> DimensionScore:
    """Competitive Positioning — where do they sit in their market?

    Inferred from: role, brand maturity, urgency, price point awareness.
    """
    points = 0
    signals = []

    # Role seniority suggests market position awareness
    role = (data.get("role", "") or "").lower()
    senior_roles = ["founder", "ceo", "director", "head of", "vp", "partner",
                    "owner", "principal", "chief"]
    if any(r in role for r in senior_roles):
        points += 25
        signals.append("Senior decision-maker")
    elif role:
        points += 15
        signals.append("Defined role")

    # Price paid implies market confidence
    amount = data.get("payment_amount", 0) or 0
    if amount >= 1495:
        points += 25
        signals.append("Premium tier investment")
    elif amount >= 699:
        points += 20
        signals.append("Mid-tier investment")
    elif amount >= 499:
        points += 15
        signals.append("Entry-tier investment")

    # Brand maturity signals
    emergency = (data.get("creative_emergency", "") or "").lower()
    maturity_words = ["rebrand", "refresh", "next level", "scale", "grow",
                      "expand", "launch", "pivot"]
    maturity_matches = [w for w in maturity_words if w in emergency]
    if maturity_matches:
        points += 20
        signals.append("Growth-stage brand")

    # Tried things = market experience
    tried = data.get("what_tried", "") or ""
    if len(tried.split()) >= 20:
        points += 15
        signals.append("Market-tested approaches")
    elif tried:
        points += 8

    # Website existence
    if data.get("website"):
        points += 15
        signals.append("Established web presence")

    recommendation = ""
    if points < 50:
        recommendation = "Map your competitive landscape: list 5 competitors, note what they do well, and identify the gap only you can fill."
    elif points < 75:
        recommendation = "You know your market — now own your position. Write a competitive brief that your whole team can reference."

    return DimensionScore(
        dimension="competitive_positioning",
        label="Competitive Positioning",
        raw_score=min(points, 100),
        weighted_score=min(points, 100) * SCORING_WEIGHTS["competitive_positioning"],
        weight=SCORING_WEIGHTS["competitive_positioning"],
        signals=signals,
        recommendation=recommendation,
    )


# ── Public API ───────────────────────────────────────────────────


DIMENSION_SCORERS = {
    "visual_identity": _score_visual_identity,
    "messaging_clarity": _score_messaging_clarity,
    "messaging_consistency": _score_messaging_consistency,
    "messaging_differentiation": _score_messaging_differentiation,
    "content_strategy": _score_content_strategy,
    "competitive_positioning": _score_competitive_positioning,
}


def score_brand(data: dict) -> BrandAuditResult:
    """Score a brand across all 6 dimensions.

    Args:
        data: Dict with intake-like fields — brand, role, website,
              creative_emergency, desired_outcome, what_tried, deadline,
              constraints, payment_amount.

    Returns:
        BrandAuditResult with composite score, tier, and dimension breakdowns.
    """
    dimensions = []
    for key, scorer in DIMENSION_SCORERS.items():
        dimensions.append(scorer(data))

    composite = sum(d.weighted_score for d in dimensions)

    # Find top strength and weakness
    sorted_dims = sorted(dimensions, key=lambda d: d.raw_score, reverse=True)
    top_strength = sorted_dims[0].label if sorted_dims else ""
    top_weakness = sorted_dims[-1].label if sorted_dims else ""

    # Build priority actions from lowest-scoring dimensions
    priority_actions = []
    for dim in sorted(dimensions, key=lambda d: d.raw_score):
        if dim.recommendation and len(priority_actions) < 3:
            priority_actions.append(f"**{dim.label}:** {dim.recommendation}")

    return BrandAuditResult(
        brand_name=data.get("brand", "Unknown Brand"),
        composite_score=round(composite, 1),
        percentile=_get_percentile(composite),
        tier=_get_tier(composite),
        dimensions=dimensions,
        top_strength=top_strength,
        top_weakness=top_weakness,
        priority_actions=priority_actions,
    )


def compare_brands(results: list[BrandAuditResult]) -> dict:
    """Compare multiple brand audit results for benchmarking.

    Useful for showing how a client's brand compares to other
    Creative Hotline clients (anonymized).
    """
    if not results:
        return {"count": 0}

    scores = [r.composite_score for r in results]
    avg = sum(scores) / len(scores)

    # Per-dimension averages
    dim_avgs: dict[str, list[float]] = {}
    for result in results:
        for dim in result.dimensions:
            dim_avgs.setdefault(dim.dimension, []).append(dim.raw_score)

    return {
        "count": len(results),
        "avg_composite": round(avg, 1),
        "min_composite": round(min(scores), 1),
        "max_composite": round(max(scores), 1),
        "dimension_averages": {
            k: round(sum(v) / len(v), 1) for k, v in dim_avgs.items()
        },
        "tier_distribution": {
            "Strong": sum(1 for s in scores if s >= TIER_STRONG),
            "Developing": sum(1 for s in scores if TIER_DEVELOPING <= s < TIER_STRONG),
            "Needs Work": sum(1 for s in scores if TIER_NEEDS_WORK <= s < TIER_DEVELOPING),
            "Critical": sum(1 for s in scores if s < TIER_NEEDS_WORK),
        },
    }
