"""Tests for PDF and version export utilities."""

import json
import os
import tempfile

from app.utils.exporters import (
    generate_action_plan_pdf,
    save_action_plan_version,
    _md_to_reportlab,
)


SAMPLE_PLAN = """## Hey Sarah,

Great call today. Your rebrand timeline is tight but doable.

## The Situation

Studio Lumen's visual identity doesn't match the positioning you've built.

## What to Do Next

1. **Lock the color palette** (Deadline: Feb 25)
Pick 3 colors max. Use Coolors.co to generate options.

2. **Brief your designer with a one-pager** (Deadline: Feb 27)
Write a single page: what the brand stands for, who it's for, what it's not.

## Tools & Resources

- Coolors.co for palette generation
- Notion template for brand brief

## What's Next

If you want hands-on help, the 3-Session Sprint exists for exactly that.

—Frankie
"""


def test_generate_pdf_returns_bytes():
    pdf = generate_action_plan_pdf("Sarah Chen", "Standard Call", SAMPLE_PLAN)
    assert isinstance(pdf, bytes)
    assert len(pdf) > 100
    assert pdf[:5] == b"%PDF-"


def test_save_action_plan_version():
    with tempfile.TemporaryDirectory() as tmpdir:
        path = save_action_plan_version("sarah@example.com", "Test plan", plans_dir=tmpdir)
        assert os.path.exists(path)
        with open(path) as f:
            data = json.load(f)
        assert data["email"] == "sarah@example.com"
        assert data["content"] == "Test plan"
        assert data["version"] == 1


def test_save_action_plan_increments_version():
    with tempfile.TemporaryDirectory() as tmpdir:
        p1 = save_action_plan_version("test@example.com", "v1", plans_dir=tmpdir)
        p2 = save_action_plan_version("test@example.com", "v2", plans_dir=tmpdir)
        assert "v1" in p1
        assert "v2" in p2


def test_md_to_reportlab_bold():
    assert _md_to_reportlab("**bold**") == "<b>bold</b>"


def test_md_to_reportlab_italic():
    assert _md_to_reportlab("*italic*") == "<i>italic</i>"


def test_md_to_reportlab_link():
    result = _md_to_reportlab("[click](https://example.com)")
    assert "href" in result
    assert "example.com" in result
