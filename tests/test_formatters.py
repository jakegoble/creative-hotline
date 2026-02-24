"""Tests for formatting utilities."""

from __future__ import annotations

from app.utils.formatters import (
    format_currency,
    format_currency_short,
    format_date,
    format_datetime,
    format_relative_time,
    format_percentage,
    truncate,
    days_between,
)


# ── format_currency ──────────────────────────────────────────────────


def test_format_currency():
    assert format_currency(499) == "$499"
    assert format_currency(1495.5) == "$1,495.50"
    assert format_currency(0) == "$0"


def test_format_currency_large():
    assert format_currency(100000) == "$100,000"


# ── format_currency_short ────────────────────────────────────────────


def test_format_currency_short_millions():
    assert format_currency_short(1_200_000) == "$1.2M"


def test_format_currency_short_thousands():
    assert format_currency_short(12_400) == "$12.4k"


def test_format_currency_short_small():
    assert format_currency_short(499) == "$499"


# ── format_date ──────────────────────────────────────────────────────


def test_format_date_iso():
    result = format_date("2026-02-20")
    assert "Feb" in result or "2026" in result


def test_format_date_full_iso():
    result = format_date("2026-02-20T14:00:00Z")
    assert "Feb" in result


def test_format_date_empty():
    assert format_date("") == "—"
    assert format_date(None) == "—"


def test_format_date_invalid():
    result = format_date("not-a-date")
    assert isinstance(result, str)


# ── format_datetime ──────────────────────────────────────────────────


def test_format_datetime_full():
    result = format_datetime("2026-02-20T15:45:00Z")
    assert "Feb" in result
    assert "2026" in result


def test_format_datetime_empty():
    assert format_datetime("") == "—"


def test_format_datetime_invalid():
    result = format_datetime("garbage")
    assert result == "garbage"


# ── format_relative_time ─────────────────────────────────────────────


def test_format_relative_time_empty():
    assert format_relative_time("") == "—"


def test_format_relative_time_invalid():
    assert format_relative_time("not-a-date") == "—"


# ── format_percentage ────────────────────────────────────────────────


def test_format_percentage():
    assert format_percentage(87.5) == "87.5%"


def test_format_percentage_zero_decimals():
    assert format_percentage(100.0, decimals=0) == "100%"


def test_format_percentage_two_decimals():
    assert format_percentage(33.333, decimals=2) == "33.33%"


# ── truncate ─────────────────────────────────────────────────────────


def test_truncate():
    assert truncate("short", 100) == "short"
    assert truncate("a" * 200, 50) == "a" * 49 + "\u2026"
    assert truncate("", 50) == ""


def test_truncate_exact_length():
    assert truncate("hello", 5) == "hello"


def test_truncate_none():
    assert truncate(None, 50) == ""


# ── days_between ─────────────────────────────────────────────────────


def test_days_between_same_day():
    result = days_between("2026-02-20", "2026-02-20")
    assert result == 0.0


def test_days_between_two_days():
    result = days_between("2026-02-18", "2026-02-20")
    assert result == 2.0


def test_days_between_with_time():
    result = days_between("2026-02-18T00:00:00Z", "2026-02-20T00:00:00Z")
    assert result == 2.0


def test_days_between_empty():
    assert days_between("", "2026-02-20") is None
    assert days_between("2026-02-20", "") is None


def test_days_between_invalid():
    assert days_between("garbage", "2026-02-20") is None
