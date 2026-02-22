"""Settings page — configuration status and preferences."""

import streamlit as st

from app.config import load_settings


def render():
    st.header("Settings")

    settings = load_settings()

    # ── Connection Status ────────────────────────────────────────

    st.subheader("API Connections")

    connections = [
        ("Notion", bool(settings.NOTION_API_KEY), "NOTION_API_KEY"),
        ("Stripe", bool(settings.STRIPE_SECRET_KEY), "STRIPE_SECRET_KEY"),
        ("Calendly", bool(settings.CALENDLY_API_KEY), "CALENDLY_API_KEY"),
        ("ManyChat", bool(settings.MANYCHAT_API_KEY), "MANYCHAT_API_KEY"),
        ("Claude AI", bool(settings.ANTHROPIC_API_KEY), "ANTHROPIC_API_KEY"),
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

    st.divider()

    # ── Database IDs ─────────────────────────────────────────────

    st.subheader("Notion Databases")
    st.code(f"Payments DB: {settings.NOTION_PAYMENTS_DB}", language=None)
    st.code(f"Intake DB:   {settings.NOTION_INTAKE_DB}", language=None)

    st.divider()

    # ── App Info ─────────────────────────────────────────────────

    st.subheader("About")
    st.caption("Creative Hotline Command Center v1.0")
    st.caption("Built for Jake Goble & Megha")
    st.caption("Stack: Streamlit + Plotly + Notion + Stripe + Calendly + ManyChat + Claude")

    st.divider()

    # ── Cache Management ─────────────────────────────────────────

    st.subheader("Cache")
    if st.button("Clear All Caches"):
        from app.services.cache_manager import cache
        cache.invalidate_all()
        st.success("All caches cleared.")


def _mask(value: str) -> str:
    """Mask a secret, showing only last 4 chars."""
    if len(value) <= 4:
        return "****"
    return value[-4:]
