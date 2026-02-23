"""Central configuration — loads all API keys and constants from .env."""

import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    # Notion
    NOTION_API_KEY: str = ""
    NOTION_PAYMENTS_DB: str = "3030e73ffadc80bcb9dde15f51a9caf2"
    NOTION_INTAKE_DB: str = "2f60e73ffadc806bbf5ddca2f5c256a3"

    # Stripe (source of truth for revenue)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Calendly
    CALENDLY_API_KEY: str = ""
    CALENDLY_EVENT_TYPE_URI: str = ""
    CALENDLY_ORG_URI: str = ""

    # ManyChat
    MANYCHAT_API_KEY: str = ""

    # Anthropic (action plan generation)
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-5-20250929"

    # n8n (health checks)
    N8N_BASE_URL: str = "https://creativehotline.app.n8n.cloud"
    N8N_API_KEY: str = ""

    # App
    APP_PASSWORD: str = ""
    LOG_LEVEL: str = "INFO"

    # Product pricing (from Stripe)
    PRICE_FIRST_CALL: int = 499
    PRICE_STANDARD_CALL: int = 699
    PRICE_SPRINT: int = 1495

    # Brand
    COLOR_PRIMARY: str = "#FF6B35"
    COLOR_PRIMARY_DARK: str = "#E55A24"
    COLOR_PRIMARY_LIGHT: str = "#FF8C5A"
    COLOR_BG: str = "#f7f5f2"
    COLOR_BG_CARD: str = "#ffffff"
    COLOR_BG_SIDEBAR: str = "#141414"
    COLOR_TEXT: str = "#1a1a1a"
    COLOR_TEXT_SECONDARY: str = "#666666"
    COLOR_TEXT_MUTED: str = "#999999"
    COLOR_BORDER: str = "#f0ede8"
    COLOR_BORDER_HOVER: str = "#e0dcd8"


def _get_secret(key: str, default: str = "") -> str:
    """Get a secret from env vars OR Streamlit secrets (Cloud deployment)."""
    val = os.getenv(key, "")
    if val:
        return val
    try:
        import streamlit as st
        if hasattr(st, "secrets") and key in st.secrets:
            return str(st.secrets[key])
    except Exception:
        pass
    return default


def load_settings() -> Settings:
    """Load settings from environment variables or Streamlit secrets."""
    return Settings(
        NOTION_API_KEY=_get_secret("NOTION_API_KEY", _get_secret("NOTION_API_TOKEN")),
        NOTION_PAYMENTS_DB=_get_secret("NOTION_PAYMENTS_DB", "3030e73ffadc80bcb9dde15f51a9caf2"),
        NOTION_INTAKE_DB=_get_secret("NOTION_INTAKE_DB", "2f60e73ffadc806bbf5ddca2f5c256a3"),
        STRIPE_SECRET_KEY=_get_secret("STRIPE_SECRET_KEY"),
        STRIPE_WEBHOOK_SECRET=_get_secret("STRIPE_WEBHOOK_SECRET"),
        CALENDLY_API_KEY=_get_secret("CALENDLY_API_KEY"),
        CALENDLY_EVENT_TYPE_URI=_get_secret("CALENDLY_EVENT_TYPE_URI"),
        CALENDLY_ORG_URI=_get_secret("CALENDLY_ORG_URI"),
        MANYCHAT_API_KEY=_get_secret("MANYCHAT_API_KEY"),
        ANTHROPIC_API_KEY=_get_secret("ANTHROPIC_API_KEY"),
        ANTHROPIC_MODEL=_get_secret("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929"),
        N8N_BASE_URL=_get_secret("N8N_BASE_URL", "https://creativehotline.app.n8n.cloud"),
        N8N_API_KEY=_get_secret("N8N_API_KEY"),
        APP_PASSWORD=_get_secret("APP_PASSWORD"),
        LOG_LEVEL=_get_secret("LOG_LEVEL", "INFO"),
    )


def validate_settings(settings: Settings) -> list:
    """Validate critical settings and return list of warnings."""
    warnings = []
    if not settings.NOTION_API_KEY:
        warnings.append("NOTION_API_KEY not set — Notion features disabled")
    if not settings.STRIPE_SECRET_KEY:
        warnings.append("STRIPE_SECRET_KEY not set — Revenue data disabled")
    if not settings.ANTHROPIC_API_KEY:
        warnings.append("ANTHROPIC_API_KEY not set — AI features disabled")
    if not settings.CALENDLY_API_KEY:
        warnings.append("CALENDLY_API_KEY not set — Booking data disabled")
    return warnings


# Pipeline statuses in lifecycle order
PIPELINE_STATUSES = [
    "Lead - Laylo",
    "Paid - Needs Booking",
    "Booked - Needs Intake",
    "Intake Complete",
    "Ready for Call",
    "Call Complete",
    "Follow-Up Sent",
]

# Product types
PRODUCT_TYPES = {
    "First Call": 499,
    "Standard Call": 699,
    "3-Pack Sprint": 1495,
    "3-Session Clarity Sprint": 1495,
}

# Lead sources
LEAD_SOURCES = [
    "IG DM", "IG Comment", "IG Story", "Meta Ad",
    "LinkedIn", "Website", "Referral", "Direct",
]

# Desired outcomes (Intake DB multi_select options)
DESIRED_OUTCOMES = [
    "A clear decision",
    "Direction I can trust",
    "A short action plan",
    "Stronger positioning",
    "Someone to tell me the truth",
]

# Cache TTLs (seconds)
CACHE_HOT = 60
CACHE_WARM = 300
CACHE_COLD = 1800

# Attribution models
ATTRIBUTION_MODELS = ["first_touch", "last_touch", "linear", "time_decay"]

# Channel colors for consistent visualization across all charts
CHANNEL_COLORS = {
    "IG DM": "#FF6B35",
    "IG Comment": "#FF8C50",
    "IG Story": "#FFA564",
    "Meta Ad": "#6495ED",
    "LinkedIn": "#0077B5",
    "Website": "#2ECC71",
    "Referral": "#9B59B6",
    "Direct": "#34495E",
    "Unknown": "#95A5A6",
}

# Revenue goal defaults
REVENUE_GOAL_DEFAULT = 800_000
MAX_CALLS_PER_WEEK = 20
CALL_DURATION_MINUTES = 45

# Proposed products (not yet in Stripe — for scenario modeling)
PROPOSED_PRODUCTS = {
    "Monthly Retainer": 2997,
    "VIP Day": 3500,
    "Monthly Membership": 197,
}

# Combined product catalog (existing + proposed)
ALL_PRODUCTS = {**PRODUCT_TYPES, **PROPOSED_PRODUCTS}

# NPS configuration
NPS_SCALE = {"promoter": (9, 10), "passive": (7, 8), "detractor": (0, 6)}
