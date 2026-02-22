"""Date, currency, and text formatting utilities."""

from __future__ import annotations

from datetime import datetime


def format_currency(amount: float) -> str:
    """Format as dollar amount: $1,234 or $1,234.56."""
    if amount == int(amount):
        return f"${int(amount):,}"
    return f"${amount:,.2f}"


def format_currency_short(amount: float) -> str:
    """Format large amounts: $12.4k, $1.2M."""
    if amount >= 1_000_000:
        return f"${amount / 1_000_000:.1f}M"
    if amount >= 1_000:
        return f"${amount / 1_000:.1f}k"
    return format_currency(amount)


def format_date(date_str: str) -> str:
    """Format ISO date string to readable format: Feb 21, 2026."""
    if not date_str:
        return "—"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%b %d, %Y")
    except (ValueError, TypeError):
        return date_str[:10] if len(date_str) >= 10 else date_str


def format_datetime(date_str: str) -> str:
    """Format ISO datetime to: Feb 21, 2026 3:45 PM."""
    if not date_str:
        return "—"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%b %d, %Y %-I:%M %p")
    except (ValueError, TypeError):
        return date_str


def format_relative_time(date_str: str) -> str:
    """Format as relative time: '2 hours ago', '3 days ago'."""
    if not date_str:
        return "—"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
        delta = now - dt
        seconds = delta.total_seconds()

        if seconds < 60:
            return "just now"
        if seconds < 3600:
            mins = int(seconds / 60)
            return f"{mins}m ago"
        if seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours}h ago"
        days = int(seconds / 86400)
        return f"{days}d ago"
    except (ValueError, TypeError):
        return "—"


def format_percentage(value: float, decimals: int = 1) -> str:
    """Format as percentage: 87.5%."""
    return f"{value:.{decimals}f}%"


def truncate(text: str, max_length: int = 100) -> str:
    """Truncate text with ellipsis."""
    if not text or len(text) <= max_length:
        return text or ""
    return text[:max_length - 1] + "…"


def days_between(date1_str: str, date2_str: str) -> float | None:
    """Calculate days between two ISO date strings."""
    if not date1_str or not date2_str:
        return None
    try:
        d1 = datetime.fromisoformat(date1_str.replace("Z", "+00:00"))
        d2 = datetime.fromisoformat(date2_str.replace("Z", "+00:00"))
        return abs((d2 - d1).total_seconds()) / 86400
    except (ValueError, TypeError):
        return None
