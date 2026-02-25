"""Tests for app.utils.template_library module."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from app.utils.template_library import (
    PlanTemplate,
    STARTER_TEMPLATES,
    list_templates,
    get_template,
    save_template,
    delete_template,
    get_categories,
)


class TestStarterTemplates:
    def test_has_starter_templates(self):
        assert len(STARTER_TEMPLATES) >= 4

    def test_starter_templates_have_required_fields(self):
        for tpl in STARTER_TEMPLATES:
            assert tpl.id
            assert tpl.name
            assert tpl.description
            assert tpl.category
            assert tpl.product_tier
            assert tpl.plan_text
            assert len(tpl.plan_text) > 50

    def test_starter_template_ids_unique(self):
        ids = [t.id for t in STARTER_TEMPLATES]
        assert len(ids) == len(set(ids))

    def test_categories_valid(self):
        valid = set(get_categories())
        for tpl in STARTER_TEMPLATES:
            assert tpl.category in valid


class TestListTemplates:
    def test_includes_starters(self):
        templates = list_templates()
        starter_ids = {t.id for t in STARTER_TEMPLATES}
        listed_ids = {t.id for t in templates}
        assert starter_ids.issubset(listed_ids)

    def test_returns_plan_template_objects(self):
        templates = list_templates()
        for t in templates:
            assert isinstance(t, PlanTemplate)


class TestGetTemplate:
    def test_finds_starter(self):
        tpl = get_template("tpl-rebrand")
        assert tpl is not None
        assert tpl.name == "Brand Refresh Playbook"

    def test_not_found(self):
        tpl = get_template("nonexistent-id")
        assert tpl is None


class TestSaveAndDelete:
    def test_save_and_load(self, tmp_path):
        with patch("app.utils.template_library.TEMPLATES_DIR", tmp_path):
            tpl = PlanTemplate(
                id="tpl-test-save",
                name="Test Template",
                description="For testing",
                category="general",
                product_tier="First Call",
                plan_text="## Test Plan\nDo the thing.",
                tags=["test"],
            )
            path = save_template(tpl)
            assert path.exists()

            # Should be loadable
            data = json.loads(path.read_text())
            assert data["name"] == "Test Template"
            assert data["created_at"]  # Should be set automatically

    def test_delete_saved_template(self, tmp_path):
        with patch("app.utils.template_library.TEMPLATES_DIR", tmp_path):
            tpl = PlanTemplate(
                id="tpl-test-delete",
                name="Delete Me",
                description="",
                category="general",
                product_tier="First Call",
                plan_text="## Delete",
            )
            save_template(tpl)
            assert (tmp_path / "tpl-test-delete.json").exists()

            result = delete_template("tpl-test-delete")
            assert result is True
            assert not (tmp_path / "tpl-test-delete.json").exists()

    def test_cannot_delete_starter(self):
        result = delete_template("tpl-rebrand")
        assert result is False

    def test_delete_nonexistent(self, tmp_path):
        with patch("app.utils.template_library.TEMPLATES_DIR", tmp_path):
            result = delete_template("tpl-does-not-exist")
            assert result is False


class TestGetCategories:
    def test_returns_list(self):
        cats = get_categories()
        assert isinstance(cats, list)
        assert len(cats) >= 4

    def test_includes_expected(self):
        cats = get_categories()
        assert "rebrand" in cats
        assert "launch" in cats
        assert "content" in cats
        assert "general" in cats
