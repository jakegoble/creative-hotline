"""Design tokens — single source of truth for all visual constants.

Used by theme.py (CSS generation), ui.py (inline HTML), plotly_theme.py (charts).
"""

from __future__ import annotations

# ── Spacing scale (px) — 4px base grid ────────────────────────────
SPACE_XS = 4
SPACE_SM = 8
SPACE_MD = 16
SPACE_LG = 24
SPACE_XL = 32
SPACE_2XL = 48

# ── Typography ────────────────────────────────────────────────────
FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
FONT_MONO = "'JetBrains Mono', 'SF Mono', 'Geist Mono', Consolas, monospace"

FONT_SIZE_XS = 11
FONT_SIZE_SM = 12
FONT_SIZE_BODY = 13    # Vercel-style metadata/timestamp tier
FONT_SIZE_MD = 14
FONT_SIZE_LG = 18
FONT_SIZE_XL = 22
FONT_SIZE_2XL = 28
FONT_SIZE_3XL = 36

WEIGHT_NORMAL = 400
WEIGHT_MEDIUM = 500
WEIGHT_SEMIBOLD = 600
WEIGHT_BOLD = 700

# Line heights
LINE_HEIGHT_TIGHT = 1.1       # Metric values, hero headings
LINE_HEIGHT_SNUG = 1.3        # Card titles, section headers
LINE_HEIGHT_NORMAL = 1.5      # Body text (standard)
LINE_HEIGHT_RELAXED = 1.65    # Long-form reading

# Letter spacing
LETTER_SPACING_TIGHT = "-0.025em"   # Large headings (h1)
LETTER_SPACING_SNUG = "-0.015em"    # Section headings (h2/h3)
LETTER_SPACING_NORMAL = "-0.006em"  # Body text (subtle tightening)
LETTER_SPACING_WIDE = "0.08em"      # Uppercase labels (Linear-style)

# ── Colors — warm stone palette ───────────────────────────────────
PRIMARY = "#FF6B35"
PRIMARY_DARK = "#E55A24"
PRIMARY_LIGHT = "#FF8C5A"
PRIMARY_SUBTLE = "rgba(255, 107, 53, 0.08)"
PRIMARY_MUTED = "rgba(255, 107, 53, 0.15)"

ACCENT_SECONDARY = "#8B5CF6"  # Violet-500 — charts, badges, variety

BG_PAGE = "#F3F2F0"  # Noticeably off-white so cards pop
BG_CARD = "#FFFFFF"
BG_SIDEBAR = "#1C1917"  # Warm charcoal (stone-900)
BG_MUTED = "#ECEAE8"  # Muted areas (hover, table headers, code blocks)
BG_HOVER = "#E5E3E1"  # Interactive hover states

TEXT_PRIMARY = "#1C1917"  # Stone-900
TEXT_SECONDARY = "#57534E"  # Stone-600 (darkened for better contrast)
TEXT_MUTED = "#78716C"  # Stone-500
TEXT_CAPTION = "#A8A29E"  # Stone-400

BORDER_DEFAULT = "#E7E5E4"  # Stone-200
BORDER_HOVER = "#D6D3D1"  # Stone-300
BORDER_STRONG = "#C4C0BC"

# Semantic — modern Tailwind palette
SUCCESS = "#22C55E"  # Green-500
SUCCESS_BG = "rgba(34, 197, 94, 0.08)"
WARNING = "#F59E0B"  # Amber-500
WARNING_BG = "rgba(245, 158, 11, 0.08)"
DANGER = "#EF4444"  # Red-500
DANGER_BG = "rgba(239, 68, 68, 0.08)"
INFO = "#3B82F6"  # Blue-500
INFO_BG = "rgba(59, 130, 246, 0.08)"

# ── Shadows (4-tier elevation — dramatic for visible depth) ───────
SHADOW_XS = "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)"
SHADOW_SM = "0 2px 8px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)"
SHADOW_MD = "0 6px 16px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)"
SHADOW_LG = "0 16px 32px rgba(0,0,0,0.12), 0 6px 12px rgba(0,0,0,0.08)"

# ── Border radius ─────────────────────────────────────────────────
RADIUS_XS = 4
RADIUS_SM = 8
RADIUS_MD = 12
RADIUS_LG = 16
RADIUS_FULL = 9999

# ── Transitions ───────────────────────────────────────────────────
TRANSITION_FAST = "all 0.15s ease"
TRANSITION_DEFAULT = "all 0.2s ease"

# ── Chart palette ─────────────────────────────────────────────────
CHART_COLORS = [
    PRIMARY, "#3B82F6", "#22C55E", "#8B5CF6",
    "#F59E0B", "#EF4444", "#14B8A6", "#475569",
]

# Channel-to-color mapping (used by channel_chart, sankey_chart, etc.)
CHANNEL_COLORS_MAP: dict[str, str] = {
    "IG DM": PRIMARY,
    "IG Comment": "#FF8C50",
    "IG Story": "#FFA564",
    "Meta Ad": "#6366F1",
    "LinkedIn": "#0077B5",
    "Website": SUCCESS,
    "Referral": "#8B5CF6",
    "Direct": "#475569",
    "Unknown": "#94A3B8",
}

# Scenario / projection overlay colors
SCENARIO_COLORS = ["#3B82F6", "#8B5CF6", "#475569"]

# 5-stop heatmap colorscale (light → PRIMARY)
HEATMAP_SCALE = [
    [0, BG_MUTED],
    [0.25, "#FFD4B8"],
    [0.5, "#FF8C5A"],
    [0.75, "#FF8C50"],
    [1.0, PRIMARY],
]


# ── Dark Mode Overrides ───────────────────────────────────────────
DARK_BG_PAGE = "#0C0A09"       # Stone-950
DARK_BG_CARD = "#1C1917"       # Stone-900
DARK_BG_SIDEBAR = "#0C0A09"    # Stone-950
DARK_BG_MUTED = "#292524"      # Stone-800
DARK_BG_HOVER = "#44403C"      # Stone-700

DARK_TEXT_PRIMARY = "#FAFAF9"   # Stone-50
DARK_TEXT_SECONDARY = "#A8A29E"  # Stone-400
DARK_TEXT_MUTED = "#78716C"     # Stone-500
DARK_TEXT_CAPTION = "#57534E"   # Stone-600

DARK_BORDER_DEFAULT = "#292524"  # Stone-800
DARK_BORDER_HOVER = "#44403C"   # Stone-700
DARK_BORDER_STRONG = "#57534E"  # Stone-600

DARK_SHADOW_SM = "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)"
DARK_SHADOW_MD = "0 4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)"


def hex_to_rgba(hex_color: str, alpha: float = 1.0) -> str:
    """Convert a hex color string to an rgba() CSS string."""
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"rgba({r},{g},{b},{alpha})"
