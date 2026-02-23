"""Intake text mining — extract themes, pain points, and industry signals.

Uses domain-specific keyword dictionaries (no ML dependencies).
All functions operate on parsed intake dicts from NotionService.
"""

from __future__ import annotations

from dataclasses import dataclass


# ── Domain Dictionaries ───────────────────────────────────────────

CREATIVE_THEMES = {
    "Branding": [
        "brand", "branding", "rebrand", "brand identity", "logo", "brand strategy",
        "visual identity", "brand voice", "brand guidelines",
    ],
    "Social Media": [
        "social media", "instagram", "tiktok", "content calendar", "social strategy",
        "engagement", "followers", "reels", "stories", "social presence",
    ],
    "Content Strategy": [
        "content", "content strategy", "content plan", "copywriting", "messaging",
        "storytelling", "blog", "newsletter", "email marketing",
    ],
    "Positioning": [
        "positioning", "differentiation", "competitive", "niche", "target audience",
        "ideal client", "value proposition", "unique selling",
    ],
    "Launch": [
        "launch", "launching", "new product", "product launch", "release",
        "go-to-market", "pre-launch", "soft launch",
    ],
    "Website": [
        "website", "web design", "landing page", "site", "homepage",
        "portfolio", "online presence", "seo",
    ],
    "Visual Content": [
        "photography", "photo", "video", "creative direction", "visual",
        "aesthetic", "shoot", "campaign", "lookbook",
    ],
    "Business Strategy": [
        "pricing", "revenue", "business model", "scaling", "growth",
        "monetize", "offer", "package", "service",
    ],
}

PAIN_POINT_KEYWORDS = [
    "stuck", "no direction", "inconsistent", "not working", "overwhelmed",
    "don't know where to start", "confused", "lost", "scattered",
    "no clarity", "spinning", "paralyzed", "second-guessing",
    "imposter", "behind", "falling behind", "can't decide",
    "too many ideas", "no focus", "burned out", "frustrated",
    "wasting time", "wasting money", "not converting", "no results",
]

INDUSTRY_KEYWORDS = {
    "Food & Beverage": [
        "food", "restaurant", "cafe", "bakery", "catering", "beverage",
        "chef", "recipe", "menu", "culinary", "bar", "coffee",
    ],
    "Fashion": [
        "fashion", "clothing", "apparel", "designer", "boutique", "style",
        "collection", "runway", "textile", "jewelry", "accessories",
    ],
    "Music": [
        "music", "musician", "artist", "album", "song", "producer",
        "label", "band", "recording", "concert", "tour",
    ],
    "Wellness": [
        "wellness", "fitness", "yoga", "meditation", "health", "coach",
        "therapy", "therapist", "mindfulness", "nutrition", "holistic",
    ],
    "Tech": [
        "tech", "software", "app", "startup", "saas", "developer",
        "platform", "digital product", "ai", "automation",
    ],
    "Beauty": [
        "beauty", "skincare", "makeup", "cosmetics", "hair", "salon",
        "esthetician", "lash", "nail", "spa",
    ],
    "Coaching": [
        "coaching", "life coach", "business coach", "mentor", "consultant",
        "consulting", "advisor", "course", "program", "workshop",
    ],
    "Real Estate": [
        "real estate", "realtor", "property", "agent", "broker",
        "listing", "home", "housing", "interior design",
    ],
    "Creative Services": [
        "design", "graphic design", "illustration", "studio", "agency",
        "creative agency", "freelance", "creative studio",
    ],
}


# ── Data Classes ──────────────────────────────────────────────────

@dataclass
class ThemeResult:
    theme: str
    count: int
    keywords_found: list[str]
    percentage: float = 0.0

    def as_dict(self) -> dict:
        return {
            "theme": self.theme,
            "count": self.count,
            "keywords_found": self.keywords_found,
            "percentage": round(self.percentage, 1),
        }


# ── Public Functions ──────────────────────────────────────────────


def extract_themes(intakes: list[dict]) -> list[ThemeResult]:
    """Group intake text into recurring creative themes.

    Scans creative_emergency, what_tried, and constraints fields
    against the CREATIVE_THEMES dictionary.

    Returns list of ThemeResult sorted by count descending.
    """
    if not intakes:
        return []

    theme_counts: dict[str, set[str]] = {theme: set() for theme in CREATIVE_THEMES}

    for intake in intakes:
        text = _get_intake_text(intake).lower()
        if not text:
            continue

        for theme, keywords in CREATIVE_THEMES.items():
            for kw in keywords:
                if kw in text:
                    theme_counts[theme].add(kw)

    total = len(intakes)
    results = []
    for theme, found_keywords in theme_counts.items():
        if found_keywords:
            # Count how many intakes mention at least one keyword from this theme
            count = 0
            for intake in intakes:
                text = _get_intake_text(intake).lower()
                if any(kw in text for kw in CREATIVE_THEMES[theme]):
                    count += 1

            results.append(ThemeResult(
                theme=theme,
                count=count,
                keywords_found=sorted(found_keywords),
                percentage=(count / total * 100) if total > 0 else 0,
            ))

    results.sort(key=lambda x: x.count, reverse=True)
    return results


def extract_pain_points(intake: dict) -> list[str]:
    """Pull pain points from a single intake's text fields.

    Returns list of matching pain point phrases.
    """
    text = _get_intake_text(intake).lower()
    if not text:
        return []

    return [pp for pp in PAIN_POINT_KEYWORDS if pp in text]


def extract_all_pain_points(intakes: list[dict]) -> dict[str, int]:
    """Count pain point frequency across all intakes.

    Returns dict of {pain_point: count} sorted by count descending.
    """
    counts: dict[str, int] = {}
    for intake in intakes:
        for pp in extract_pain_points(intake):
            counts[pp] = counts.get(pp, 0) + 1

    return dict(sorted(counts.items(), key=lambda x: x[1], reverse=True))


def get_industry_distribution(intakes: list[dict]) -> dict[str, int]:
    """Categorize clients by industry from Role + Brand fields.

    Returns dict of {industry: count} sorted by count descending.
    """
    counts: dict[str, int] = {}

    for intake in intakes:
        role = (intake.get("role") or "").lower()
        brand = (intake.get("brand") or "").lower()
        combined = role + " " + brand

        matched = False
        for industry, keywords in INDUSTRY_KEYWORDS.items():
            if any(kw in combined for kw in keywords):
                counts[industry] = counts.get(industry, 0) + 1
                matched = True
                break  # One industry per client

        if not matched and combined.strip():
            counts["Other"] = counts.get("Other", 0) + 1

    return dict(sorted(counts.items(), key=lambda x: x[1], reverse=True))


def get_outcome_demand(intakes: list[dict]) -> dict[str, int]:
    """Tally desired_outcome selections across all intakes.

    Returns dict of {outcome: count} sorted by count descending.
    """
    counts: dict[str, int] = {}

    for intake in intakes:
        outcomes = intake.get("desired_outcome", [])
        if isinstance(outcomes, list):
            for outcome in outcomes:
                counts[outcome] = counts.get(outcome, 0) + 1

    return dict(sorted(counts.items(), key=lambda x: x[1], reverse=True))


# ── Helpers ───────────────────────────────────────────────────────


def _get_intake_text(intake: dict) -> str:
    """Concatenate all text fields from an intake for analysis."""
    fields = [
        intake.get("creative_emergency", ""),
        intake.get("what_tried", ""),
        intake.get("constraints", ""),
        intake.get("role", ""),
        intake.get("brand", ""),
    ]
    return " ".join(f for f in fields if f)
