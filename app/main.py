"""Creative Hotline Command Center — Streamlit entry point."""

import streamlit as st

from app.config import load_settings

st.set_page_config(
    page_title="Creative Hotline Command Center",
    page_icon="\U0000260E",
    layout="wide",
    initial_sidebar_state="expanded",
)

settings = load_settings()


def init_services():
    """Initialize all service clients (cached in session state)."""
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

        page = st.radio(
            "Navigate",
            options=[
                "Dashboard",
                "Clients",
                "Pipeline",
                "Action Plans",
                "Lead Scoring",
                "Channel Performance",
                "Retargeting",
                "Conversion Paths",
                "System Health",
                "Settings",
            ],
            label_visibility="collapsed",
        )

        st.divider()

        if st.button("Refresh All Data", use_container_width=True):
            from app.services.cache_manager import cache
            cache.invalidate_all()
            st.rerun()

        st.caption(f"v2.0 | Built for Jake & Megha")

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
    elif page == "Action Plans":
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
    elif page == "System Health":
        from app.pages.health import render
        render()
    elif page == "Settings":
        from app.pages.settings import render
        render()


if __name__ == "__main__":
    main()
