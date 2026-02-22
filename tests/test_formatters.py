"""Tests for formatting utilities."""

from app.utils.formatters import format_date, format_currency, truncate


def test_format_currency():
    assert format_currency(499) == "$499"
    assert format_currency(1495.5) == "$1,495.50"
    assert format_currency(0) == "$0"


def test_format_date_iso():
    result = format_date("2026-02-20")
    assert "Feb" in result or "2026" in result


def test_format_date_empty():
    assert format_date("") == "—"
    assert format_date(None) == "—"


def test_truncate():
    assert truncate("short", 100) == "short"
    assert truncate("a" * 200, 50) == "a" * 49 + "\u2026"
    assert truncate("", 50) == ""


def test_truncate_exact_length():
    assert truncate("hello", 5) == "hello"
