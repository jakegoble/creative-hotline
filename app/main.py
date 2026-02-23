"""Creative Hotline Command Center — Streamlit entry point."""

import streamlit as st

from app.config import load_settings, validate_settings
from app.utils.theme import inject_custom_css

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
    )
    from app.services.health_checker import HealthChecker

    st.session_state.notion = DemoNotionService()
    st.session_state.stripe = DemoStripeService()
    st.session_state.calendly = DemoCalendlyService()
    st.session_state.manychat = None
    st.session_state.claude = DemoClaudeService()
    st.session_state.health = HealthChecker()
    st.session_state.services_initialized = True


def init_services():
    """Initialize all service clients (cached in session state)."""
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
    st.session_state.health = HealthChecker()
    st.session_state.services_initialized = True


def main():
    init_services()

    # Sidebar
    with st.sidebar:
        st.markdown("### THE CREATIVE HOTLINE")
        st.caption("Command Center")
        st.divider()

        if st.session_state.get("demo_mode", False):
            st.markdown(
                '<div style="background:#FF6B35;color:white;text-align:center;'
                'padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;'
                'margin-bottom:12px;">DEMO MODE</div>',
                unsafe_allow_html=True,
            )

        page = st.radio(
            "Navigate",
            options=[
                "Dashboard",
                "Clients",
                "Pipeline",
                "Action Plan Studio",
                "Lead Scoring",
                "Channel Performance",
                "Retargeting",
                "Conversion Paths",
                "Revenue Goals",
                "Funnel Analytics",
                "Outcomes & Testimonials",
                "System Health",
                "Settings",
            ],
            label_visibility="collapsed",
        )

        st.divider()

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

        st.caption("v4.1 | Built for Jake & Megha")

    # Route to selected page
    if page == "Dashboard":
        from app.pages.dashboard import render
        render()
    elif page == "Clients":
        from app.pages.clients import render
        render()
    elif page == "Pipeline":
        from app.pages.pipeline import render
        render()
    elif page == "Action Plan Studio":
        from app.pages.action_plans import render
        render()
    elif page == "Lead Scoring":
        from app.pages.lead_scoring import render
        render()
    elif page == "Channel Performance":
        from app.pages.channel_performance import render
        render()
    elif page == "Retargeting":
        from app.pages.retargeting import render
        render()
    elif page == "Conversion Paths":
        from app.pages.conversion_paths import render
        render()
    elif page == "Revenue Goals":
        from app.pages.revenue_goals import render
        render()
    elif page == "Funnel Analytics":
        from app.pages.funnel_analytics import render
        render()
    elif page == "Outcomes & Testimonials":
        from app.pages.outcomes import render
        render()
    elif page == "System Health":
        from app.pages.health import render
        render()
    elif page == "Settings":
        from app.pages.settings import render
        render()


if __name__ == "__main__":
    main()
