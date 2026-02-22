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
    COLOR_BG: str = "#f7f5f2"
    COLOR_TEXT: str = "#1a1a1a"


def load_settings() -> Settings:
    """Load settings from environment variables."""
    return Settings(
        NOTION_API_KEY=os.getenv("NOTION_API_KEY", os.getenv("NOTION_API_TOKEN", "")),
        NOTION_PAYMENTS_DB=os.getenv("NOTION_PAYMENTS_DB", "3030e73ffadc80bcb9dde15f51a9caf2"),
        NOTION_INTAKE_DB=os.getenv("NOTION_INTAKE_DB", "2f60e73ffadc806bbf5ddca2f5c256a3"),
        STRIPE_SECRET_KEY=os.getenv("STRIPE_SECRET_KEY", ""),
        STRIPE_WEBHOOK_SECRET=os.getenv("STRIPE_WEBHOOK_SECRET", ""),
        CALENDLY_API_KEY=os.getenv("CALENDLY_API_KEY", ""),
        CALENDLY_EVENT_TYPE_URI=os.getenv("CALENDLY_EVENT_TYPE_URI", ""),
        CALENDLY_ORG_URI=os.getenv("CALENDLY_ORG_URI", ""),
        MANYCHAT_API_KEY=os.getenv("MANYCHAT_API_KEY", ""),
        ANTHROPIC_API_KEY=os.getenv("ANTHROPIC_API_KEY", ""),
        ANTHROPIC_MODEL=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929"),
        N8N_BASE_URL=os.getenv("N8N_BASE_URL", "https://creativehotline.app.n8n.cloud"),
        N8N_API_KEY=os.getenv("N8N_API_KEY", ""),
        APP_PASSWORD=os.getenv("APP_PASSWORD", ""),
        LOG_LEVEL=os.getenv("LOG_LEVEL", "INFO"),
    )


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
