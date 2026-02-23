"""Smoke tests — verify all modules import without error."""

from __future__ import annotations


def test_import_config():
    from app import config
    assert hasattr(config, "load_settings")
    assert hasattr(config, "PIPELINE_STATUSES")


def test_import_theme():
    from app.utils.theme import inject_custom_css
    assert callable(inject_custom_css)


def test_import_all_utils():
    from app.utils import formatters
    from app.utils import lead_scorer
    from app.utils import segment_builder
    from app.utils import attribution
    from app.utils import keyword_extractor
    from app.utils import ltv_calculator
    from app.utils import revenue_modeler
    from app.utils import sequence_tracker
    from app.utils import referral_tracker
    from app.utils import frankie_prompts
    from app.utils import exporters
    from app.utils import plan_delivery
    from app.utils import transcript_processor
    from app.utils import demo_data
    from app.utils import theme


def test_import_all_services():
    from app.services import cache_manager
    from app.services import health_checker
    from app.services import demo_service


def test_import_all_components():
    from app.components import kpi_cards
    from app.components import client_timeline
    from app.components import funnel_chart
    from app.components import cohort_table
    from app.components import revenue_forecast
    from app.components import growth_chart
    from app.components import scenario_cards
    from app.components import segment_cards
    from app.components import channel_chart
    from app.components import heatmap
    from app.components import sankey_chart


def test_config_extended_palette():
    from app.config import Settings
    s = Settings()
    assert s.COLOR_PRIMARY == "#FF6B35"
    assert s.COLOR_PRIMARY_DARK == "#E55A24"
    assert s.COLOR_BG_SIDEBAR == "#141414"
    assert s.COLOR_BORDER == "#f0ede8"


def test_config_validate_settings():
    from app.config import Settings, validate_settings
    empty = Settings()
    warnings = validate_settings(empty)
    assert len(warnings) >= 3
    assert any("NOTION" in w for w in warnings)

    full = Settings(
        NOTION_API_KEY="ntn_test",
        STRIPE_SECRET_KEY="sk_test",
        ANTHROPIC_API_KEY="sk-ant-test",
        CALENDLY_API_KEY="cal_test",
    )
    assert validate_settings(full) == []
