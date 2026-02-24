"""Settings page — configuration status, demo mode, and preferences."""

import streamlit as st

from app.config import load_settings
from app.utils.ui import page_header, section_header, key_value_inline, labeled_divider


def render():
    page_header("Settings", "Configuration, API connections, and app preferences.")

    settings = load_settings()

    # ── Demo Mode ─────────────────────────────────────────────

    section_header("Demo Mode")
    demo_on = st.toggle(
        "Show sample data on all pages",
        value=st.session_state.get("demo_mode", False),
        help="When enabled, all pages show realistic sample data instead of live API data.",
    )
    if demo_on != st.session_state.get("demo_mode", False):
        st.session_state.demo_mode = demo_on
        st.session_state.pop("services_initialized", None)
        st.rerun()

    if st.session_state.get("demo_mode", False):
        st.info("Demo Mode is ON. All data shown is sample data. Toggle off to see live data.")

    labeled_divider("")

    # ── Connection Status ────────────────────────────────────────

    section_header("API Connections")

    connections = [
        ("Notion", bool(settings.NOTION_API_KEY), "NOTION_API_KEY"),
        ("Stripe", bool(settings.STRIPE_SECRET_KEY), "STRIPE_SECRET_KEY"),
        ("Calendly", bool(settings.CALENDLY_API_KEY), "CALENDLY_API_KEY"),
        ("ManyChat", bool(settings.MANYCHAT_API_KEY), "MANYCHAT_API_KEY"),
        ("Claude AI", bool(settings.ANTHROPIC_API_KEY), "ANTHROPIC_API_KEY"),
        ("Fireflies", bool(settings.FIREFLIES_API_KEY), "FIREFLIES_API_KEY"),
        ("n8n", bool(settings.N8N_API_KEY), "N8N_API_KEY"),
    ]

    for name, connected, env_var in connections:
        col1, col2, col3 = st.columns([1, 2, 2])
        with col1:
            st.markdown(f"{'🟢' if connected else '🔴'} **{name}**")
        with col2:
            st.caption("Connected" if connected else f"Add `{env_var}` to .env")
        with col3:
            if connected:
                st.caption(f"`{env_var}` = ****{_mask(getattr(settings, env_var, ''))}")

    labeled_divider("")

    # ── Database IDs ─────────────────────────────────────────────

    section_header("Notion Databases")
    st.code(f"Payments DB: {settings.NOTION_PAYMENTS_DB}", language=None)
    st.code(f"Intake DB:   {settings.NOTION_INTAKE_DB}", language=None)

    labeled_divider("")

    # ── App Info ─────────────────────────────────────────────────

    section_header("About")
    st.caption("Creative Hotline Command Center v5.0")
    st.caption("Built for Jake Goble & Megha")
    st.caption("Stack: Streamlit + Plotly + Notion + Stripe + Calendly + ManyChat + Claude")

    labeled_divider("")

    # ── Cache Management ─────────────────────────────────────────

    section_header("Cache")
    if st.button("Clear All Caches"):
        from app.services.cache_manager import cache
        cache.invalidate_all()
        st.success("All caches cleared.")


def _mask(value: str) -> str:
    """Mask a secret, showing only last 4 chars."""
    if len(value) <= 4:
        return "****"
    return value[-4:]
