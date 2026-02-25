"""Creative Hotline Command Center — Streamlit entry point."""

import streamlit as st

from app.config import load_settings, validate_settings
from app.utils.theme import inject_custom_css, inject_dark_mode
import app.utils.plotly_theme as _plotly_theme  # noqa: F401 — registers global template

st.set_page_config(
    page_title="Creative Hotline Command Center",
    page_icon="\U0000260E",
    layout="wide",
    initial_sidebar_state="expanded",
)

inject_custom_css()

settings = load_settings()
_startup_warnings = validate_settings(settings)


def _init_demo_services():
    """Initialize demo service layer for Demo Mode."""
    from app.services.demo_service import (
        DemoNotionService,
        DemoStripeService,
        DemoCalendlyService,
        DemoClaudeService,
        DemoFirefliesService,
        DemoN8nService,
    )
    from app.services.health_checker import HealthChecker

    st.session_state.notion = DemoNotionService()
    st.session_state.stripe = DemoStripeService()
    st.session_state.calendly = DemoCalendlyService()
    st.session_state.manychat = None
    st.session_state.claude = DemoClaudeService()
    st.session_state.fireflies = DemoFirefliesService()
    st.session_state.n8n = DemoN8nService()
    st.session_state.health = HealthChecker()
    st.session_state.services_initialized = True


def init_services():
    """Initialize all service clients (cached in session state)."""
    # Auto-enable demo mode when no API keys are configured
    if "demo_mode" not in st.session_state:
        if not any([settings.NOTION_API_KEY, settings.STRIPE_SECRET_KEY,
                     settings.CALENDLY_API_KEY, settings.ANTHROPIC_API_KEY]):
            st.session_state.demo_mode = True

    if st.session_state.get("demo_mode", False):
        if not st.session_state.get("services_initialized"):
            _init_demo_services()
        return

    if "services_initialized" in st.session_state:
        return

    from app.services.notion_client import NotionService
    from app.services.stripe_client import StripeService
    from app.services.calendly_client import CalendlyService
    from app.services.manychat_client import ManyChatService
    from app.services.claude_client import ClaudeService
    from app.services.fireflies_client import FirefliesService
    from app.services.n8n_client import N8nService
    from app.services.health_checker import HealthChecker

    st.session_state.notion = (
        NotionService(settings.NOTION_API_KEY, settings.NOTION_PAYMENTS_DB, settings.NOTION_INTAKE_DB)
        if settings.NOTION_API_KEY else None
    )
    st.session_state.stripe = (
        StripeService(settings.STRIPE_SECRET_KEY)
        if settings.STRIPE_SECRET_KEY else None
    )
    st.session_state.calendly = (
        CalendlyService(settings.CALENDLY_API_KEY, settings.CALENDLY_ORG_URI, settings.CALENDLY_EVENT_TYPE_URI)
        if settings.CALENDLY_API_KEY else None
    )
    st.session_state.manychat = (
        ManyChatService(settings.MANYCHAT_API_KEY)
        if settings.MANYCHAT_API_KEY else None
    )
    st.session_state.claude = (
        ClaudeService(settings.ANTHROPIC_API_KEY, settings.ANTHROPIC_MODEL)
        if settings.ANTHROPIC_API_KEY else None
    )
    st.session_state.fireflies = (
        FirefliesService(settings.FIREFLIES_API_KEY)
        if settings.FIREFLIES_API_KEY else None
    )
    st.session_state.n8n = (
        N8nService(settings.N8N_BASE_URL, settings.N8N_API_KEY)
        if settings.N8N_API_KEY else None
    )
    st.session_state.health = HealthChecker()
    st.session_state.services_initialized = True


# ── Page imports (lazy, for st.navigation) ──────────────────────


def _dashboard():
    from app.pages.dashboard import render
    render()


def _clients():
    from app.pages.clients import render
    render()


def _pipeline():
    from app.pages.pipeline import render
    render()


def _action_plans():
    from app.pages.action_plans import render
    render()


def _lead_scoring():
    from app.pages.lead_scoring import render
    render()


def _channel_performance():
    from app.pages.channel_performance import render
    render()


def _retargeting():
    from app.pages.retargeting import render
    render()


def _conversion_paths():
    from app.pages.conversion_paths import render
    render()


def _revenue_goals():
    from app.pages.revenue_goals import render
    render()


def _funnel_analytics():
    from app.pages.funnel_analytics import render
    render()


def _outcomes():
    from app.pages.outcomes import render
    render()


def _health():
    from app.pages.health import render
    render()


def _settings():
    from app.pages.settings import render
    render()


def main():
    init_services()

    # ── Navigation ──────────────────────────────────────────────
    pages = {
        "Overview": [
            st.Page(_dashboard, title="Dashboard", icon=":material/dashboard:", default=True),
            st.Page(_clients, title="Clients", icon=":material/people:"),
            st.Page(_pipeline, title="Pipeline", icon=":material/filter_alt:"),
            st.Page(_action_plans, title="Action Plan Studio", icon=":material/edit_note:"),
        ],
        "Analytics": [
            st.Page(_lead_scoring, title="Lead Scoring", icon=":material/star:"),
            st.Page(_channel_performance, title="Channel Performance", icon=":material/bar_chart:"),
            st.Page(_retargeting, title="Retargeting", icon=":material/replay:"),
            st.Page(_conversion_paths, title="Conversion Paths", icon=":material/route:"),
        ],
        "Growth": [
            st.Page(_revenue_goals, title="Revenue Goals", icon=":material/trending_up:"),
            st.Page(_funnel_analytics, title="Funnel Analytics", icon=":material/filter_list:"),
            st.Page(_outcomes, title="Outcomes", icon=":material/emoji_events:"),
        ],
        "System": [
            st.Page(_health, title="System Health", icon=":material/monitor_heart:"),
            st.Page(_settings, title="Settings", icon=":material/settings:"),
        ],
    }

    nav = st.navigation(pages)

    # Sidebar branding (below nav)
    with st.sidebar:
        st.markdown("---")
        if st.session_state.get("demo_mode", False):
            st.markdown(
                '<div style="background:#FF6B35;color:white;text-align:center;'
                'padding:6px 12px;border-radius:8px;font-size:11px;'
                'font-weight:700;letter-spacing:0.5px;margin-bottom:12px;">'
                'DEMO MODE</div>',
                unsafe_allow_html=True,
            )

        # Dark mode toggle
        dark_on = st.toggle(
            "Dark Mode",
            value=st.session_state.get("dark_mode", False),
            key="dark_mode_toggle",
        )
        if dark_on != st.session_state.get("dark_mode", False):
            st.session_state.dark_mode = dark_on
            st.rerun()

        if st.button("Refresh All Data", use_container_width=True):
            from app.services.cache_manager import cache
            cache.invalidate_all()
            st.session_state.pop("services_initialized", None)
            st.rerun()

        # Show config warnings (not in demo mode)
        if _startup_warnings and not st.session_state.get("demo_mode", False):
            with st.expander("Config Warnings", expanded=False):
                for w in _startup_warnings:
                    st.caption(f"— {w}")

        st.caption("v5.1 | Built for Jake & Megha")

    # Inject dark mode CSS + dark Plotly template based on toggle state
    inject_dark_mode(st.session_state.get("dark_mode", False))

    nav.run()


if __name__ == "__main__":
    main()
