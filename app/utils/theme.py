"""Global CSS theme injection for the Creative Hotline Command Center.

Call inject_custom_css() once in main.py after st.set_page_config().
All 13 pages get the visual upgrade with zero page-level code changes.

Uses CSS custom properties backed by design_tokens.py for consistency
between CSS selectors and inline HTML components (ui.py).
"""

from __future__ import annotations

import streamlit as st

from app.utils import design_tokens as t

# Build the CSS string using design tokens — no hardcoded values.
_CSS = f"""
<style>
/* ── CSS Custom Properties ─────────────────────────────────────── */
:root {{
    --font-family: {t.FONT_FAMILY};
    --font-xs: {t.FONT_SIZE_XS}px;
    --font-sm: {t.FONT_SIZE_SM}px;
    --font-md: {t.FONT_SIZE_MD}px;
    --font-lg: {t.FONT_SIZE_LG}px;
    --font-xl: {t.FONT_SIZE_XL}px;
    --font-2xl: {t.FONT_SIZE_2XL}px;
    --font-3xl: {t.FONT_SIZE_3XL}px;

    --weight-normal: {t.WEIGHT_NORMAL};
    --weight-medium: {t.WEIGHT_MEDIUM};
    --weight-semibold: {t.WEIGHT_SEMIBOLD};
    --weight-bold: {t.WEIGHT_BOLD};

    --primary: {t.PRIMARY};
    --primary-dark: {t.PRIMARY_DARK};
    --primary-light: {t.PRIMARY_LIGHT};
    --primary-subtle: {t.PRIMARY_SUBTLE};
    --primary-muted: {t.PRIMARY_MUTED};

    --bg-page: {t.BG_PAGE};
    --bg-card: {t.BG_CARD};
    --bg-sidebar: {t.BG_SIDEBAR};
    --bg-muted: {t.BG_MUTED};
    --bg-hover: {t.BG_HOVER};

    --text-primary: {t.TEXT_PRIMARY};
    --text-secondary: {t.TEXT_SECONDARY};
    --text-muted: {t.TEXT_MUTED};
    --text-caption: {t.TEXT_CAPTION};

    --border: {t.BORDER_DEFAULT};
    --border-hover: {t.BORDER_HOVER};
    --border-strong: {t.BORDER_STRONG};

    --success: {t.SUCCESS};
    --success-bg: {t.SUCCESS_BG};
    --warning: {t.WARNING};
    --warning-bg: {t.WARNING_BG};
    --danger: {t.DANGER};
    --danger-bg: {t.DANGER_BG};
    --info: {t.INFO};
    --info-bg: {t.INFO_BG};

    --shadow-sm: {t.SHADOW_SM};
    --shadow-md: {t.SHADOW_MD};
    --shadow-lg: {t.SHADOW_LG};

    --radius-sm: {t.RADIUS_SM}px;
    --radius-md: {t.RADIUS_MD}px;
    --radius-lg: {t.RADIUS_LG}px;
    --radius-full: {t.RADIUS_FULL}px;

    --space-xs: {t.SPACE_XS}px;
    --space-sm: {t.SPACE_SM}px;
    --space-md: {t.SPACE_MD}px;
    --space-lg: {t.SPACE_LG}px;
    --space-xl: {t.SPACE_XL}px;
    --space-2xl: {t.SPACE_2XL}px;

    --transition: {t.TRANSITION_DEFAULT};
    --transition-fast: {t.TRANSITION_FAST};
}}

/* ── Typography ────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

html, body, [class*="css"] {{
    font-family: var(--font-family);
}}

.stApp {{
    font-family: var(--font-family);
}}

/* ── Sidebar ───────────────────────────────────────────────────── */
section[data-testid="stSidebar"] {{
    background-color: var(--bg-sidebar);
    border-right: none;
}}

section[data-testid="stSidebar"] * {{
    color: #e0e0e0 !important;
}}

section[data-testid="stSidebar"] .stMarkdown h3 {{
    color: var(--primary) !important;
    font-weight: var(--weight-bold);
    letter-spacing: 1px;
    font-size: 15px;
}}

section[data-testid="stSidebar"] .stRadio > div {{
    gap: 2px;
}}

section[data-testid="stSidebar"] .stRadio label {{
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    transition: var(--transition);
    font-size: var(--font-md);
    font-weight: var(--weight-medium);
}}

section[data-testid="stSidebar"] .stRadio label:hover {{
    background: rgba(255, 107, 53, 0.12);
}}

section[data-testid="stSidebar"] .stRadio label[data-checked="true"],
section[data-testid="stSidebar"] .stRadio [aria-checked="true"] {{
    background: rgba(255, 107, 53, 0.18) !important;
    color: var(--primary) !important;
}}

section[data-testid="stSidebar"] .stButton > button {{
    background: var(--primary-muted);
    color: var(--primary) !important;
    border: 1px solid rgba(255, 107, 53, 0.3);
    border-radius: var(--radius-sm);
    font-weight: var(--weight-semibold);
    transition: var(--transition);
}}

section[data-testid="stSidebar"] .stButton > button:hover {{
    background: rgba(255, 107, 53, 0.25);
    border-color: var(--primary);
}}

section[data-testid="stSidebar"] hr {{
    border-color: rgba(255, 255, 255, 0.08) !important;
    margin: var(--space-md) 0;
}}

section[data-testid="stSidebar"] .stCaption,
section[data-testid="stSidebar"] small {{
    color: #888 !important;
}}

/* ── Metric Cards ──────────────────────────────────────────────── */
[data-testid="stMetric"],
[data-testid="metric-container"] {{
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-md) 20px;
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
}}

[data-testid="stMetric"]:hover,
[data-testid="metric-container"]:hover {{
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
}}

[data-testid="stMetricLabel"] {{
    font-size: var(--font-xs) !important;
    font-weight: var(--weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted) !important;
}}

[data-testid="stMetricValue"] {{
    font-size: var(--font-2xl) !important;
    font-weight: var(--weight-bold);
    color: var(--text-primary) !important;
}}

[data-testid="stMetricDelta"] {{
    font-size: var(--font-xs) !important;
    font-weight: var(--weight-medium);
}}

/* ── Chart Containers ──────────────────────────────────────────── */
[data-testid="stPlotlyChart"] {{
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    box-shadow: var(--shadow-sm);
}}

/* ── Buttons ───────────────────────────────────────────────────── */
.stButton > button {{
    border-radius: var(--radius-sm);
    font-weight: var(--weight-semibold);
    font-size: var(--font-md);
    padding: var(--space-sm) var(--space-lg);
    transition: var(--transition);
    border: 1px solid var(--border-hover);
}}

.stButton > button:hover {{
    border-color: var(--primary);
    color: var(--primary);
}}

.stButton > button[kind="primary"],
.stButton > button[data-testid="baseButton-primary"] {{
    background-color: var(--primary);
    color: white !important;
    border: none;
}}

.stButton > button[kind="primary"]:hover,
.stButton > button[data-testid="baseButton-primary"]:hover {{
    background-color: var(--primary-dark);
    color: white !important;
}}

/* ── Form Inputs ───────────────────────────────────────────────── */
.stTextInput > div > div > input,
.stTextArea > div > div > textarea,
.stNumberInput > div > div > input {{
    border-radius: var(--radius-sm) !important;
    border: 1px solid var(--border-hover) !important;
    padding: var(--space-sm) var(--space-md);
    font-size: var(--font-md);
    transition: var(--transition);
}}

.stTextInput > div > div > input:focus,
.stTextArea > div > div > textarea:focus,
.stNumberInput > div > div > input:focus {{
    border-color: var(--primary) !important;
    box-shadow: 0 0 0 2px var(--primary-subtle) !important;
}}

.stSelectbox > div > div {{
    border-radius: var(--radius-sm) !important;
}}

/* ── Expanders ─────────────────────────────────────────────────── */
[data-testid="stExpander"] {{
    background: var(--bg-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: var(--transition);
}}

[data-testid="stExpander"]:hover {{
    border-color: var(--border-hover);
}}

[data-testid="stExpander"] summary {{
    font-weight: var(--weight-semibold);
    font-size: var(--font-md);
}}

/* ── Dividers ──────────────────────────────────────────────────── */
[data-testid="stMarkdownContainer"] hr,
hr {{
    border: none !important;
    border-top: 1px solid var(--border) !important;
    margin: var(--space-lg) 0 !important;
}}

/* ── Tables / DataFrames ───────────────────────────────────────── */
[data-testid="stDataFrame"] {{
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--border);
}}

.stDataFrame table {{
    font-size: 13px;
}}

.stDataFrame thead th {{
    background: var(--bg-muted) !important;
    font-weight: var(--weight-semibold);
    text-transform: uppercase;
    font-size: var(--font-xs);
    letter-spacing: 0.5px;
    color: var(--text-secondary) !important;
}}

/* ── Alert Boxes ───────────────────────────────────────────────── */
[data-testid="stAlert"],
.stAlert {{
    border-radius: var(--radius-md);
    font-size: var(--font-md);
}}

/* ── Tabs ──────────────────────────────────────────────────────── */
.stTabs [data-baseweb="tab-list"] {{
    gap: var(--space-xs);
}}

.stTabs [data-baseweb="tab"] {{
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    padding: var(--space-sm) 20px;
    font-weight: var(--weight-semibold);
    font-size: var(--font-md);
}}

.stTabs [data-baseweb="tab-highlight"] {{
    background-color: var(--primary) !important;
}}

/* ── Headers ───────────────────────────────────────────────────── */
.stApp h1 {{
    font-weight: var(--weight-bold);
    color: var(--text-primary);
    font-size: var(--font-2xl);
}}

.stApp h2 {{
    font-weight: var(--weight-bold);
    color: var(--text-primary);
    font-size: var(--font-xl);
}}

.stApp h3 {{
    font-weight: var(--weight-semibold);
    color: var(--text-primary);
    font-size: var(--font-lg);
}}

/* ── Download Buttons ──────────────────────────────────────────── */
.stDownloadButton > button {{
    border-radius: var(--radius-sm);
    font-weight: var(--weight-semibold);
    border: 1px solid var(--border-hover);
    transition: var(--transition);
}}

.stDownloadButton > button:hover {{
    border-color: var(--primary);
    color: var(--primary);
}}

/* ── Progress Bar ──────────────────────────────────────────────── */
.stProgress > div > div > div {{
    background-color: var(--primary);
    border-radius: var(--space-xs);
}}

/* ── Toggle ────────────────────────────────────────────────────── */
[data-testid="stToggle"] span[role="checkbox"][aria-checked="true"] {{
    background-color: var(--primary) !important;
}}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT CLASSES — used by ui.py and inline HTML in pages
   ═══════════════════════════════════════════════════════════════ */

/* ── Card ──────────────────────────────────────────────────────── */
.ch-card {{
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
    margin-bottom: var(--space-sm);
}}

.ch-card:hover {{
    box-shadow: var(--shadow-md);
    border-color: var(--border-hover);
}}

.ch-card--accent-left {{
    border-left: 3px solid var(--accent-color, var(--primary));
}}

.ch-card--accent-top {{
    border-top: 3px solid var(--accent-color, var(--primary));
}}

.ch-card--flat {{
    box-shadow: none;
}}

.ch-card--flat:hover {{
    box-shadow: none;
}}

/* ── Badge / Pill ──────────────────────────────────────────────── */
.ch-badge {{
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: var(--radius-full);
    font-size: var(--font-xs);
    font-weight: var(--weight-semibold);
    line-height: 1.4;
}}

.ch-badge--outline {{
    background: transparent;
    border: 1px solid currentColor;
}}

/* ── Section Header ────────────────────────────────────────────── */
.ch-section-header {{
    margin-top: var(--space-xl);
    margin-bottom: var(--space-md);
}}

.ch-section-header h2 {{
    margin-bottom: 2px !important;
    font-size: var(--font-xl) !important;
    font-weight: var(--weight-bold) !important;
    color: var(--text-primary) !important;
}}

.ch-section-header h3 {{
    margin-bottom: 2px !important;
    font-size: var(--font-lg) !important;
    font-weight: var(--weight-semibold) !important;
    color: var(--text-primary) !important;
}}

.ch-section-header p {{
    color: var(--text-muted);
    font-size: var(--font-sm);
    margin: 0;
    line-height: 1.4;
}}

/* ── Page Header ───────────────────────────────────────────────── */
.ch-page-header {{
    margin-bottom: var(--space-lg);
}}

.ch-page-header h1 {{
    margin-bottom: 4px !important;
    font-size: var(--font-2xl) !important;
    font-weight: var(--weight-bold) !important;
    color: var(--text-primary) !important;
}}

.ch-page-header p {{
    color: var(--text-muted);
    font-size: var(--font-md);
    margin: 0;
    line-height: 1.5;
}}

/* ── Progress Bar (inline) ─────────────────────────────────────── */
.ch-progress {{
    background: var(--border);
    border-radius: 3px;
    height: 6px;
    overflow: hidden;
}}

.ch-progress-fill {{
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
}}

/* ── Key-Value Display ─────────────────────────────────────────── */
.ch-kv {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--border);
}}

.ch-kv:last-child {{
    border-bottom: none;
}}

.ch-kv-label {{
    font-size: var(--font-sm);
    color: var(--text-muted);
    font-weight: var(--weight-medium);
}}

.ch-kv-value {{
    font-size: var(--font-md);
    color: var(--text-primary);
    font-weight: var(--weight-semibold);
    text-align: right;
}}

/* ── Empty State ───────────────────────────────────────────────── */
.ch-empty {{
    text-align: center;
    padding: var(--space-2xl) var(--space-lg);
    color: var(--text-muted);
}}

.ch-empty-icon {{
    font-size: 32px;
    margin-bottom: var(--space-sm);
    opacity: 0.5;
}}

.ch-empty-message {{
    font-size: var(--font-md);
    line-height: 1.5;
}}

/* ── Utility Classes ───────────────────────────────────────────── */
.ch-text-xs {{ font-size: var(--font-xs); }}
.ch-text-sm {{ font-size: var(--font-sm); }}
.ch-text-md {{ font-size: var(--font-md); }}
.ch-text-lg {{ font-size: var(--font-lg); }}
.ch-text-xl {{ font-size: var(--font-xl); }}
.ch-text-2xl {{ font-size: var(--font-2xl); }}
.ch-text-3xl {{ font-size: var(--font-3xl); }}

.ch-text-primary {{ color: var(--text-primary); }}
.ch-text-secondary {{ color: var(--text-secondary); }}
.ch-text-muted {{ color: var(--text-muted); }}
.ch-text-caption {{ color: var(--text-caption); }}
.ch-text-accent {{ color: var(--primary); }}

.ch-font-medium {{ font-weight: var(--weight-medium); }}
.ch-font-semibold {{ font-weight: var(--weight-semibold); }}
.ch-font-bold {{ font-weight: var(--weight-bold); }}

.ch-flex {{ display: flex; }}
.ch-flex-between {{ display: flex; justify-content: space-between; align-items: center; }}
.ch-flex-center {{ display: flex; align-items: center; }}
.ch-gap-xs {{ gap: var(--space-xs); }}
.ch-gap-sm {{ gap: var(--space-sm); }}
.ch-gap-md {{ gap: var(--space-md); }}

.ch-uppercase {{
    text-transform: uppercase;
    letter-spacing: 0.5px;
}}

.ch-mt-sm {{ margin-top: var(--space-sm); }}
.ch-mt-md {{ margin-top: var(--space-md); }}
.ch-mt-lg {{ margin-top: var(--space-lg); }}
.ch-mb-sm {{ margin-bottom: var(--space-sm); }}
.ch-mb-md {{ margin-bottom: var(--space-md); }}

/* ── Mobile Responsive ─────────────────────────────────────────── */
@media (max-width: 768px) {{
    [data-testid="stMetric"],
    [data-testid="metric-container"] {{
        padding: var(--space-md) var(--space-md);
    }}

    [data-testid="stMetricValue"] {{
        font-size: var(--font-xl) !important;
    }}

    .stApp h1 {{
        font-size: var(--font-xl);
    }}

    .stApp h2 {{
        font-size: var(--font-lg);
    }}

    [data-testid="stPlotlyChart"] {{
        padding: var(--space-sm);
    }}

    .ch-card {{
        padding: var(--space-md);
    }}

    .ch-page-header h1 {{
        font-size: var(--font-xl) !important;
    }}
}}

/* ── Smooth Scrollbar ──────────────────────────────────────────── */
::-webkit-scrollbar {{
    width: 6px;
    height: 6px;
}}

::-webkit-scrollbar-track {{
    background: transparent;
}}

::-webkit-scrollbar-thumb {{
    background: var(--border-strong);
    border-radius: 3px;
}}

::-webkit-scrollbar-thumb:hover {{
    background: #b0aca6;
}}
</style>
"""


def inject_custom_css() -> None:
    """Inject global CSS overrides. Call once in main.py after set_page_config."""
    st.markdown(_CSS, unsafe_allow_html=True)
