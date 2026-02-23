"""Tests for client-facing HTML plan delivery."""

import os
import tempfile

from app.utils.plan_delivery import (
    generate_client_html,
    save_client_page,
)


# ── Fixture ──────────────────────────────────────────────────────

SAMPLE_PLAN = """## Hey Sarah,

Great call today. Your rebrand timeline is tight but doable.

## The Situation

Studio Lumen's visual identity doesn't match the positioning you've built.

## What to Do Next

1. **Lock the color palette** (Deadline: Feb 25)
Pick 3 colors max. Use Coolors.co to generate options.

2. **Brief your designer with a one-pager** (Deadline: Feb 27)
Write a single page: what the brand stands for, who it's for, what it's not.

3. **Post the first Reel** (Deadline: Mar 1)
Film a 30-second behind-the-scenes clip. Don't overthink it.

## Tools & Resources

- Coolors.co for palette generation
- Notion template for brand brief
- Canva Pro for social templates

## What's Next

If you want hands-on help, the 3-Session Sprint exists for exactly that.

—Frankie
"""


# ── HTML Generation ──────────────────────────────────────────────

def test_generate_html_returns_string():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert isinstance(html, str)
    assert len(html) > 500


def test_generate_html_contains_doctype():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert "<!DOCTYPE html>" in html


def test_generate_html_contains_client_name():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert "Sarah" in html


def test_generate_html_contains_brand_name():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert "Studio Lumen" in html


def test_generate_html_contains_brand_colors():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert "#FF6B35" in html


def test_generate_html_contains_checkboxes():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert 'type="checkbox"' in html
    # Should have 3 checkboxes (3 action items in "What to Do Next")
    assert html.count('class="action-check"') == 3


def test_generate_html_contains_calendly_link():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert "calendly.com/soscreativehotline" in html


def test_generate_html_custom_calendly():
    html = generate_client_html(
        "Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN,
        calendly_url="https://calendly.com/custom/link",
    )
    assert "calendly.com/custom/link" in html


def test_generate_html_contains_progress_bar():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert "progress" in html
    assert "progress-fill" in html


def test_generate_html_contains_javascript():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert "localStorage" in html


def test_generate_html_mobile_responsive():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert "viewport" in html
    assert "max-width: 600px" in html


def test_generate_html_contains_signoff():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert "Frankie" in html
    assert "signoff" in html


def test_generate_html_contains_bullet_list():
    html = generate_client_html("Sarah Chen", "Studio Lumen", "Standard Call", SAMPLE_PLAN)
    assert "<ul>" in html
    assert "<li>" in html
    assert "Coolors.co" in html


def test_generate_html_no_brand():
    html = generate_client_html("Sarah Chen", "", "Standard Call", SAMPLE_PLAN)
    assert "<!DOCTYPE html>" in html
    assert "Sarah" in html


# ── File Saving ──────────────────────────────────────────────────

def test_save_client_page():
    html = "<html><body>Test</body></html>"
    with tempfile.TemporaryDirectory() as tmpdir:
        path = save_client_page("sarah@example.com", html, output_dir=tmpdir)
        assert os.path.exists(path)
        assert path.endswith(".html")
        assert "sarah" in path
        with open(path) as f:
            assert f.read() == html


def test_save_client_page_creates_dir():
    html = "<html><body>Test</body></html>"
    with tempfile.TemporaryDirectory() as tmpdir:
        subdir = os.path.join(tmpdir, "pages")
        path = save_client_page("test@example.com", html, output_dir=subdir)
        assert os.path.exists(path)
        assert os.path.isdir(subdir)
