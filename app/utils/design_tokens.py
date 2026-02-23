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
FONT_SIZE_XS = 11
FONT_SIZE_SM = 12
FONT_SIZE_MD = 14
FONT_SIZE_LG = 18
FONT_SIZE_XL = 22
FONT_SIZE_2XL = 28
FONT_SIZE_3XL = 36

WEIGHT_NORMAL = 400
WEIGHT_MEDIUM = 500
WEIGHT_SEMIBOLD = 600
WEIGHT_BOLD = 700

# ── Colors ────────────────────────────────────────────────────────
PRIMARY = "#FF6B35"
PRIMARY_DARK = "#E55A24"
PRIMARY_LIGHT = "#FF8C5A"
PRIMARY_SUBTLE = "rgba(255, 107, 53, 0.08)"
PRIMARY_MUTED = "rgba(255, 107, 53, 0.15)"

BG_PAGE = "#f7f5f2"
BG_CARD = "#ffffff"
BG_SIDEBAR = "#141414"
BG_MUTED = "#faf8f5"
BG_HOVER = "#f5f2ee"

TEXT_PRIMARY = "#1a1a1a"
TEXT_SECONDARY = "#555555"
TEXT_MUTED = "#888888"
TEXT_CAPTION = "#aaaaaa"

BORDER_DEFAULT = "#f0ede8"
BORDER_HOVER = "#e0dcd8"
BORDER_STRONG = "#d0ccc6"

# Semantic
SUCCESS = "#2ECC71"
SUCCESS_BG = "rgba(46, 204, 113, 0.08)"
WARNING = "#F39C12"
WARNING_BG = "rgba(243, 156, 18, 0.08)"
DANGER = "#E74C3C"
DANGER_BG = "rgba(231, 76, 60, 0.08)"
INFO = "#4A90D9"
INFO_BG = "rgba(74, 144, 217, 0.08)"

# ── Shadows (3-tier elevation) ────────────────────────────────────
SHADOW_SM = "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)"
SHADOW_MD = "0 4px 6px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.06)"
SHADOW_LG = "0 10px 15px rgba(0,0,0,0.04), 0 4px 6px rgba(0,0,0,0.06)"

# ── Border radius ─────────────────────────────────────────────────
RADIUS_SM = 6
RADIUS_MD = 10
RADIUS_LG = 14
RADIUS_FULL = 9999

# ── Transitions ───────────────────────────────────────────────────
TRANSITION_FAST = "all 0.15s ease"
TRANSITION_DEFAULT = "all 0.2s ease"

# ── Chart palette ─────────────────────────────────────────────────
CHART_COLORS = [
    PRIMARY, "#4A90D9", "#2ECC71", "#9B59B6",
    "#F39C12", "#E74C3C", "#1ABC9C", "#34495E",
]
