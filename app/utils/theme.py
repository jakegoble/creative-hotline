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
    --font-body: {t.FONT_SIZE_BODY}px;
    --font-mono: {t.FONT_MONO};

    --lh-tight: {t.LINE_HEIGHT_TIGHT};
    --lh-snug: {t.LINE_HEIGHT_SNUG};
    --lh-normal: {t.LINE_HEIGHT_NORMAL};
    --lh-relaxed: {t.LINE_HEIGHT_RELAXED};

    --ls-tight: {t.LETTER_SPACING_TIGHT};
    --ls-snug: {t.LETTER_SPACING_SNUG};
    --ls-normal: {t.LETTER_SPACING_NORMAL};
    --ls-wide: {t.LETTER_SPACING_WIDE};

    --radius-xs: {t.RADIUS_XS}px;

    --weight-normal: {t.WEIGHT_NORMAL};
    --weight-medium: {t.WEIGHT_MEDIUM};
    --weight-semibold: {t.WEIGHT_SEMIBOLD};
    --weight-bold: {t.WEIGHT_BOLD};

    --primary: {t.PRIMARY};
    --primary-dark: {t.PRIMARY_DARK};
    --primary-light: {t.PRIMARY_LIGHT};
    --primary-subtle: {t.PRIMARY_SUBTLE};
    --primary-muted: {t.PRIMARY_MUTED};
    --accent-secondary: {t.ACCENT_SECONDARY};

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

    --shadow-xs: {t.SHADOW_XS};
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

/* ── Dark Mode Overrides ──────────────────────────────────────── */
.dark-mode {{
    --bg-page: {t.DARK_BG_PAGE};
    --bg-card: {t.DARK_BG_CARD};
    --bg-sidebar: {t.DARK_BG_SIDEBAR};
    --bg-muted: {t.DARK_BG_MUTED};
    --bg-hover: {t.DARK_BG_HOVER};

    --text-primary: {t.DARK_TEXT_PRIMARY};
    --text-secondary: {t.DARK_TEXT_SECONDARY};
    --text-muted: {t.DARK_TEXT_MUTED};
    --text-caption: {t.DARK_TEXT_CAPTION};

    --border: {t.DARK_BORDER_DEFAULT};
    --border-hover: {t.DARK_BORDER_HOVER};
    --border-strong: {t.DARK_BORDER_STRONG};

    --shadow-sm: {t.DARK_SHADOW_SM};
    --shadow-md: {t.DARK_SHADOW_MD};
}}

.dark-mode .stApp {{
    background-color: {t.DARK_BG_PAGE} !important;
    color: {t.DARK_TEXT_PRIMARY} !important;
}}

.dark-mode header[data-testid="stHeader"] {{
    background: rgba(12, 10, 9, 0.85) !important;
}}

.dark-mode [data-testid="stSidebar"] {{
    background-color: {t.DARK_BG_PAGE} !important;
    border-right-color: {t.DARK_BORDER_DEFAULT} !important;
}}

.dark-mode [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] {{
    color: {t.DARK_TEXT_PRIMARY};
}}

.dark-mode [data-testid="stMetricLabel"],
.dark-mode [data-testid="stMetricValue"],
.dark-mode [data-testid="stMetricDelta"] {{
    color: {t.DARK_TEXT_PRIMARY} !important;
}}

.dark-mode [data-testid="stExpander"] {{
    border-color: {t.DARK_BORDER_DEFAULT} !important;
}}

.dark-mode .ch-card {{
    background: {t.DARK_BG_CARD};
    border-color: {t.DARK_BORDER_DEFAULT};
}}

.dark-mode .ch-kpi-hero {{
    background: {t.DARK_BG_CARD};
    border-color: {t.DARK_BORDER_DEFAULT};
}}

.dark-mode .ch-client-header {{
    background: {t.DARK_BG_CARD};
    border-color: {t.DARK_BORDER_DEFAULT};
}}

.dark-mode .ch-feed-item:hover {{
    background: {t.DARK_BG_MUTED};
}}

.dark-mode [data-testid="stCaption"],
.dark-mode .stCaption {{
    color: {t.DARK_TEXT_CAPTION} !important;
}}

.dark-mode [data-testid="stText"] {{
    color: {t.DARK_TEXT_SECONDARY} !important;
}}

.dark-mode .stTextInput > div > div > input,
.dark-mode .stTextArea > div > div > textarea,
.dark-mode .stNumberInput > div > div > input {{
    background: {t.DARK_BG_CARD} !important;
    color: {t.DARK_TEXT_PRIMARY} !important;
    border-color: {t.DARK_BORDER_DEFAULT} !important;
}}

.dark-mode .stTextInput input::placeholder,
.dark-mode .stTextArea textarea::placeholder {{
    color: {t.DARK_TEXT_CAPTION} !important;
}}

.dark-mode .stSelectbox [data-baseweb="select"] > div {{
    background: {t.DARK_BG_CARD} !important;
    border-color: {t.DARK_BORDER_DEFAULT} !important;
    color: {t.DARK_TEXT_PRIMARY} !important;
}}

.dark-mode .stMultiSelect [data-baseweb="tag"] {{
    background-color: rgba(255, 107, 53, 0.15) !important;
    color: {t.PRIMARY_LIGHT} !important;
}}

.dark-mode [data-testid="stAlert"] {{
    border-color: {t.DARK_BORDER_DEFAULT} !important;
    background: {t.DARK_BG_CARD} !important;
}}

.dark-mode [data-testid="stMarkdownContainer"] p {{
    color: {t.DARK_TEXT_PRIMARY};
}}

.dark-mode .stButton > button {{
    color: {t.DARK_TEXT_PRIMARY} !important;
    border-color: {t.DARK_BORDER_DEFAULT} !important;
}}

.dark-mode .stButton > button:hover {{
    border-color: var(--primary) !important;
    color: var(--primary) !important;
}}

.dark-mode ::-webkit-scrollbar-thumb {{
    background: {t.DARK_BORDER_STRONG};
}}

/* ── Typography ────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

html, body, [class*="css"] {{
    font-family: var(--font-family);
}}

.stApp {{
    font-family: var(--font-family);
    line-height: var(--lh-normal);
    letter-spacing: var(--ls-normal);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}}

/* ── Global Body Text ─────────────────────────────────────────── */
.stApp p,
[data-testid="stMarkdownContainer"] p {{
    line-height: var(--lh-normal);
    color: var(--text-primary);
}}

[data-testid="stMarkdownContainer"] strong,
[data-testid="stMarkdownContainer"] b {{
    font-weight: var(--weight-semibold);
    color: var(--text-primary);
}}

[data-testid="stMarkdownContainer"] small {{
    font-size: var(--font-xs);
    color: var(--text-muted);
}}

/* ── Hide Default Streamlit Chrome ─────────────────────────────── */
#MainMenu {{visibility: hidden;}}
footer {{visibility: hidden;}}
header[data-testid="stHeader"] {{
    background: rgba(250, 249, 247, 0.85) !important;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
}}
div[data-testid="stDecoration"] {{display: none;}}

/* ── Sidebar ───────────────────────────────────────────────────── */
section[data-testid="stSidebar"] {{
    background-color: var(--bg-sidebar);
    border-right: none;
    box-shadow: 4px 0 24px rgba(0,0,0,0.15);
}}

section[data-testid="stSidebar"] * {{
    color: #D6D3D1 !important;
}}

/* Sidebar nav section headers (st.navigation groups) */
section[data-testid="stSidebar"] [data-testid="stSidebarNavSeparator"],
section[data-testid="stSidebar"] .stMarkdown h3,
section[data-testid="stSidebar"] [data-testid="stSidebarNavSeparator"] span {{
    color: var(--primary) !important;
    font-weight: var(--weight-bold) !important;
    letter-spacing: 0.5px;
    font-size: 11px !important;
    text-transform: uppercase;
}}

/* Sidebar nav links (st.navigation items) */
section[data-testid="stSidebar"] [data-testid="stSidebarNavLink"] {{
    border-radius: var(--radius-sm);
    transition: var(--transition);
    margin: 1px 0;
}}

section[data-testid="stSidebar"] [data-testid="stSidebarNavLink"]:hover {{
    background: rgba(255, 107, 53, 0.1) !important;
}}

section[data-testid="stSidebar"] [data-testid="stSidebarNavLink"][aria-current="page"] {{
    background: rgba(255, 107, 53, 0.15) !important;
    border-left: 3px solid var(--primary) !important;
}}

section[data-testid="stSidebar"] [data-testid="stSidebarNavLink"][aria-current="page"] span {{
    color: white !important;
    font-weight: var(--weight-semibold) !important;
}}

/* Sidebar radio fallback (legacy) */
section[data-testid="stSidebar"] .stRadio > div {{
    gap: 2px;
}}

section[data-testid="stSidebar"] .stRadio label {{
    padding: 10px var(--space-md);
    border-radius: var(--radius-sm);
    transition: var(--transition);
    font-size: var(--font-md);
    font-weight: var(--weight-medium);
}}

section[data-testid="stSidebar"] .stRadio label:hover {{
    background: rgba(255, 107, 53, 0.1);
}}

section[data-testid="stSidebar"] .stRadio label[data-checked="true"],
section[data-testid="stSidebar"] .stRadio [aria-checked="true"] {{
    background: rgba(255, 107, 53, 0.15) !important;
    color: var(--primary) !important;
}}

section[data-testid="stSidebar"] .stButton > button {{
    background: rgba(255, 107, 53, 0.12);
    color: var(--primary) !important;
    border: 1px solid rgba(255, 107, 53, 0.25);
    border-radius: var(--radius-sm);
    font-weight: var(--weight-semibold);
    transition: var(--transition);
}}

section[data-testid="stSidebar"] .stButton > button:hover {{
    background: rgba(255, 107, 53, 0.25);
    border-color: var(--primary);
}}

section[data-testid="stSidebar"] hr {{
    border-color: rgba(255, 255, 255, 0.06) !important;
    margin: var(--space-md) 0;
}}

section[data-testid="stSidebar"] .stCaption,
section[data-testid="stSidebar"] small {{
    color: #78716C !important;
}}

/* ── Metric Cards ──────────────────────────────────────────────── */
[data-testid="stMetric"],
[data-testid="metric-container"] {{
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 20px 24px;
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
}}

[data-testid="stMetric"]:hover,
[data-testid="metric-container"]:hover {{
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}}

[data-testid="stMetricLabel"] {{
    font-size: var(--font-xs) !important;
    font-weight: var(--weight-medium) !important;
    text-transform: uppercase;
    letter-spacing: var(--ls-wide);
    color: var(--text-muted) !important;
    line-height: var(--lh-snug);
}}

[data-testid="stMetricValue"] {{
    font-size: var(--font-2xl) !important;
    font-weight: var(--weight-bold) !important;
    color: var(--text-primary) !important;
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--ls-tight);
    line-height: var(--lh-tight);
}}

[data-testid="stMetricDelta"] {{
    font-size: var(--font-xs) !important;
    font-weight: var(--weight-semibold);
    font-variant-numeric: tabular-nums;
}}

/* ── Chart Containers ──────────────────────────────────────────── */
[data-testid="stPlotlyChart"] {{
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 20px;
    box-shadow: var(--shadow-xs);
    transition: var(--transition);
}}

[data-testid="stPlotlyChart"]:hover {{
    box-shadow: var(--shadow-sm);
}}

/* ── Captions ─────────────────────────────────────────────────── */
[data-testid="stCaption"],
.stCaption {{
    font-size: var(--font-xs) !important;
    color: var(--text-caption) !important;
    line-height: var(--lh-normal);
    letter-spacing: 0.01em;
}}

/* ── st.text() / Paragraph Blocks ─────────────────────────────── */
[data-testid="stText"] {{
    font-size: var(--font-md) !important;
    color: var(--text-secondary) !important;
    line-height: var(--lh-normal);
}}

/* ── Labels (form labels, widget labels) ──────────────────────── */
.stTextInput label,
.stTextArea label,
.stNumberInput label,
.stSelectbox label,
.stMultiSelect label,
.stCheckbox label,
.stRadio label,
[data-testid="stWidgetLabel"] {{
    font-size: var(--font-sm) !important;
    font-weight: var(--weight-medium) !important;
    color: var(--text-secondary) !important;
    letter-spacing: 0.01em;
}}

/* ── Checkboxes ───────────────────────────────────────────────── */
[data-testid="stCheckbox"] input[type="checkbox"] {{
    accent-color: var(--primary);
    width: 16px;
    height: 16px;
}}

/* ── Sliders ──────────────────────────────────────────────────── */
[data-testid="stSlider"] [role="slider"] {{
    background-color: var(--primary) !important;
}}

[data-testid="stSlider"] [data-testid="stThumbValue"] {{
    font-size: var(--font-xs);
    font-weight: var(--weight-semibold);
    font-variant-numeric: tabular-nums;
}}

/* ── MultiSelect Tags ─────────────────────────────────────────── */
.stMultiSelect [data-baseweb="tag"] {{
    background-color: var(--primary-subtle) !important;
    border-color: transparent !important;
    border-radius: var(--radius-xs) !important;
    font-size: var(--font-xs);
    font-weight: var(--weight-medium);
    color: var(--primary-dark) !important;
}}

.stMultiSelect [data-baseweb="tag"] [role="presentation"] {{
    color: var(--primary) !important;
}}

/* ── Select Dropdown ──────────────────────────────────────────── */
.stSelectbox [data-baseweb="select"] > div {{
    border-radius: var(--radius-sm) !important;
    border-color: var(--border) !important;
    transition: var(--transition);
}}

.stSelectbox [data-baseweb="select"] > div:hover {{
    border-color: var(--border-hover) !important;
}}

/* ── Input Placeholders ───────────────────────────────────────── */
.stTextInput input::placeholder,
.stTextArea textarea::placeholder,
.stNumberInput input::placeholder {{
    color: var(--text-caption) !important;
    font-weight: var(--weight-normal);
}}

/* ── Alert Boxes (accent border-left) ─────────────────────────── */
[data-testid="stAlert"] {{
    border-radius: var(--radius-sm) !important;
    border: 1px solid var(--border) !important;
    font-size: var(--font-md);
}}

[data-testid="stAlert"][data-baseweb*="notification"] {{
    border-left: 4px solid !important;
}}

div[data-testid="stAlert"]:has([data-testid="stAlertContentInfo"]) {{
    border-left-color: var(--info) !important;
    background: var(--info-bg) !important;
}}

div[data-testid="stAlert"]:has([data-testid="stAlertContentSuccess"]) {{
    border-left-color: var(--success) !important;
    background: var(--success-bg) !important;
}}

div[data-testid="stAlert"]:has([data-testid="stAlertContentWarning"]) {{
    border-left-color: var(--warning) !important;
    background: var(--warning-bg) !important;
}}

div[data-testid="stAlert"]:has([data-testid="stAlertContentError"]) {{
    border-left-color: var(--danger) !important;
    background: var(--danger-bg) !important;
}}

/* ── Numeric / Tabular Nums Global ────────────────────────────── */
[data-testid="stMetricValue"],
[data-testid="stMetricDelta"],
.ch-numeric,
.ch-kv-value,
.ch-kpi-hero__value,
.ch-feed-time,
.ch-timeline-time {{
    font-variant-numeric: tabular-nums;
}}

/* ── Buttons ───────────────────────────────────────────────────── */
.stButton > button {{
    border-radius: var(--radius-sm);
    font-weight: var(--weight-semibold);
    font-size: var(--font-md);
    padding: var(--space-sm) var(--space-lg);
    transition: var(--transition);
    border: 1px solid var(--border);
}}

.stButton > button:hover {{
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
}}

.stButton > button[kind="primary"],
.stButton > button[data-testid="baseButton-primary"] {{
    background-color: var(--primary);
    color: white !important;
    border: none;
    box-shadow: 0 1px 3px rgba(255, 107, 53, 0.3);
}}

.stButton > button[kind="primary"]:hover,
.stButton > button[data-testid="baseButton-primary"]:hover {{
    background-color: var(--primary-dark);
    color: white !important;
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25);
}}

/* ── Form Inputs ───────────────────────────────────────────────── */
.stTextInput > div > div > input,
.stTextArea > div > div > textarea,
.stNumberInput > div > div > input {{
    border-radius: var(--radius-sm) !important;
    border: 1px solid var(--border) !important;
    padding: 10px var(--space-md);
    font-size: var(--font-md);
    transition: var(--transition);
}}

.stTextInput > div > div > input:focus,
.stTextArea > div > div > textarea:focus,
.stNumberInput > div > div > input:focus {{
    border-color: var(--primary) !important;
    box-shadow: 0 0 0 3px var(--primary-subtle) !important;
}}

.stSelectbox > div > div {{
    border-radius: var(--radius-sm) !important;
}}

/* ── Expanders ─────────────────────────────────────────────────── */
[data-testid="stExpander"] {{
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: var(--transition);
}}

[data-testid="stExpander"]:hover {{
    border-color: var(--border-hover);
    box-shadow: var(--shadow-xs);
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
    margin: var(--space-xl) 0 !important;
}}

/* ── Tables / DataFrames ───────────────────────────────────────── */
[data-testid="stDataFrame"] {{
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--border);
}}

.stDataFrame table {{
    font-size: 13px;
    font-variant-numeric: tabular-nums;
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
    border-bottom: 1px solid var(--border);
}}

.stTabs [data-baseweb="tab"] {{
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    padding: 10px 20px;
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
    letter-spacing: var(--ls-tight);
    line-height: var(--lh-snug);
    margin-bottom: var(--space-sm);
}}

.stApp h2 {{
    font-weight: var(--weight-bold);
    color: var(--text-primary);
    font-size: var(--font-xl);
    letter-spacing: var(--ls-snug);
    line-height: var(--lh-snug);
    margin-bottom: var(--space-xs);
}}

.stApp h3 {{
    font-weight: var(--weight-semibold);
    color: var(--text-primary);
    font-size: var(--font-lg);
    letter-spacing: var(--ls-snug);
    line-height: var(--lh-snug);
    margin-bottom: var(--space-xs);
}}

.stApp h4 {{
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
    font-size: var(--font-md);
    letter-spacing: var(--ls-normal);
    line-height: var(--lh-snug);
    text-transform: uppercase;
    letter-spacing: var(--ls-wide);
}}

/* ── Download Buttons ──────────────────────────────────────────── */
.stDownloadButton > button {{
    border-radius: var(--radius-sm);
    font-weight: var(--weight-semibold);
    border: 1px solid var(--border);
    transition: var(--transition);
}}

.stDownloadButton > button:hover {{
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
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

/* ── Card (base) ──────────────────────────────────────────────── */
.ch-card {{
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 20px 24px;
    transition: var(--transition);
    margin-bottom: var(--space-sm);
}}

.ch-card:hover {{
    border-color: var(--border-hover);
}}

/* ── Card Elevation Tiers ─────────────────────────────────────── */
.ch-card--elevated {{
    box-shadow: var(--shadow-sm);
}}

.ch-card--elevated:hover {{
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}}

.ch-card--floating {{
    box-shadow: var(--shadow-lg);
    border-color: transparent;
}}

.ch-card--floating:hover {{
    box-shadow: 0 16px 32px rgba(0,0,0,0.1), 0 6px 12px rgba(0,0,0,0.06);
}}

/* ── Card Accent Variants ─────────────────────────────────────── */
.ch-card--accent-left {{
    border-left: 3px solid var(--accent-color, var(--primary));
}}

.ch-card--accent-top {{
    border-top: 3px solid var(--accent-color, var(--primary));
}}

.ch-card--flat {{
    box-shadow: none;
    border-color: var(--border);
}}

.ch-card--flat:hover {{
    box-shadow: none;
}}

/* ── Badge / Pill ──────────────────────────────────────────────── */
.ch-badge {{
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: var(--radius-full);
    font-size: var(--font-xs);
    font-weight: var(--weight-medium);
    line-height: var(--lh-snug);
    letter-spacing: 0.01em;
}}

.ch-badge--outline {{
    background: transparent;
    border: 1px solid currentColor;
}}

/* ── Delta Badge ──────────────────────────────────────────────── */
.ch-delta {{
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: var(--font-xs);
    font-weight: var(--weight-semibold);
    font-variant-numeric: tabular-nums;
    padding: 2px 8px;
    border-radius: var(--radius-full);
}}

.ch-delta--up {{
    color: var(--success);
    background: var(--success-bg);
}}

.ch-delta--down {{
    color: var(--danger);
    background: var(--danger-bg);
}}

.ch-delta--neutral {{
    color: var(--text-muted);
    background: var(--bg-muted);
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
    letter-spacing: var(--ls-snug);
    line-height: var(--lh-snug) !important;
}}

.ch-section-header h3 {{
    margin-bottom: 2px !important;
    font-size: var(--font-lg) !important;
    font-weight: var(--weight-semibold) !important;
    color: var(--text-primary) !important;
    letter-spacing: var(--ls-snug);
    line-height: var(--lh-snug) !important;
}}

.ch-section-header p {{
    color: var(--text-muted);
    font-size: var(--font-sm);
    margin: 0;
    line-height: var(--lh-normal);
}}

/* ── Page Header ───────────────────────────────────────────────── */
.ch-page-header {{
    margin-bottom: var(--space-lg);
}}

.ch-page-header h1 {{
    margin-bottom: 4px !important;
    font-size: 30px !important;
    font-weight: var(--weight-bold) !important;
    color: var(--text-primary) !important;
    letter-spacing: var(--ls-tight);
    line-height: var(--lh-snug);
}}

.ch-page-header p {{
    color: var(--text-muted);
    font-size: var(--font-md);
    margin: 0;
    line-height: var(--lh-normal);
}}

/* ── Progress Bar (inline) ─────────────────────────────────────── */
.ch-progress {{
    background: var(--bg-muted);
    border-radius: 4px;
    height: 6px;
    overflow: hidden;
}}

.ch-progress-fill {{
    height: 100%;
    border-radius: 4px;
    transition: width 0.4s ease;
}}

/* ── Key-Value Display ─────────────────────────────────────────── */
.ch-kv {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 10px 0;
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
    font-variant-numeric: tabular-nums;
}}

/* ── Empty State ───────────────────────────────────────────────── */
.ch-empty {{
    text-align: center;
    padding: var(--space-2xl) var(--space-lg);
    color: var(--text-muted);
}}

.ch-empty-icon {{
    font-size: 36px;
    margin-bottom: var(--space-md);
    opacity: 0.4;
}}

.ch-empty-message {{
    font-size: var(--font-md);
    line-height: 1.5;
}}

/* ── Status Dot ────────────────────────────────────────────────── */
.ch-dot {{
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-caption);
}}

.ch-dot--active {{
    background: var(--success);
    box-shadow: 0 0 0 3px var(--success-bg);
    animation: ch-pulse 2s ease-in-out infinite;
}}

.ch-dot--warning {{
    background: var(--warning);
    box-shadow: 0 0 0 3px var(--warning-bg);
}}

.ch-dot--danger {{
    background: var(--danger);
    box-shadow: 0 0 0 3px var(--danger-bg);
}}

@keyframes ch-pulse {{
    0%, 100% {{ opacity: 1; }}
    50% {{ opacity: 0.5; }}
}}

/* ── Labeled Divider ───────────────────────────────────────────── */
.ch-divider {{
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin: var(--space-xl) 0;
    color: var(--text-caption);
    font-size: var(--font-xs);
    font-weight: var(--weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.8px;
}}

.ch-divider::before,
.ch-divider::after {{
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
}}

/* ── Skeleton Loading ──────────────────────────────────────────── */
@keyframes ch-shimmer {{
    0% {{ background-position: -200% 0; }}
    100% {{ background-position: 200% 0; }}
}}

.ch-skeleton {{
    background: linear-gradient(90deg,
        var(--bg-muted) 25%,
        var(--bg-hover) 50%,
        var(--bg-muted) 75%
    );
    background-size: 200% 100%;
    animation: ch-shimmer 1.5s ease-in-out infinite;
    border-radius: var(--radius-sm);
}}

.ch-skeleton--text {{
    height: 14px;
    margin-bottom: var(--space-sm);
}}

.ch-skeleton--heading {{
    height: 28px;
    width: 60%;
    margin-bottom: var(--space-md);
}}

.ch-skeleton--card {{
    height: 120px;
    border-radius: var(--radius-md);
    margin-bottom: var(--space-sm);
}}

/* ── KPI Hero Card ─────────────────────────────────────────────── */
.ch-kpi-hero {{
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 28px 32px;
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
}}

.ch-kpi-hero:hover {{
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}}

.ch-kpi-hero__label {{
    font-size: var(--font-xs);
    font-weight: var(--weight-medium);
    text-transform: uppercase;
    letter-spacing: var(--ls-wide);
    color: var(--text-muted);
    margin-bottom: var(--space-xs);
    line-height: var(--lh-snug);
}}

.ch-kpi-hero__value {{
    font-size: var(--font-3xl);
    font-weight: var(--weight-bold);
    color: var(--text-primary);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
}}

.ch-kpi-hero__footer {{
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
}}

/* ── Tabular Nums Utility ──────────────────────────────────────── */
.ch-numeric {{
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
}}

.ch-mono {{
    font-family: var(--font-mono);
    font-size: 0.92em;
    font-variant-numeric: tabular-nums;
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
    letter-spacing: 0.6px;
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
        padding: var(--space-md);
    }}

    .ch-card {{
        padding: var(--space-md);
    }}

    .ch-page-header h1 {{
        font-size: var(--font-xl) !important;
    }}

    .ch-kpi-hero {{
        padding: 20px;
    }}

    .ch-kpi-hero__value {{
        font-size: var(--font-2xl);
    }}

    /* Touch targets (44px minimum) */
    .stButton > button,
    .stDownloadButton > button,
    .stCheckbox label,
    .stRadio label,
    .stTabs [data-baseweb="tab"] {{
        min-height: 44px;
    }}

    .stTextInput > div > div > input,
    .stNumberInput > div > div > input,
    .stSelectbox [data-baseweb="select"] > div {{
        min-height: 44px;
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
    background: #A8A29E;
}}

/* ── Activity Feed ─────────────────────────────────────────────── */
.ch-feed {{
    display: flex;
    flex-direction: column;
    gap: 0;
}}

.ch-feed-item {{
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    transition: background 150ms ease;
}}

.ch-feed-item:last-child {{
    border-bottom: none;
}}

.ch-feed-item:hover {{
    background: var(--bg-muted);
}}

.ch-feed-icon {{
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 2px;
}}

.ch-feed-content {{
    flex: 1;
    min-width: 0;
}}

.ch-feed-title {{
    font-size: var(--font-sm);
    font-weight: var(--weight-medium);
    color: var(--text-primary);
    line-height: var(--lh-snug);
}}

.ch-feed-subtitle {{
    font-size: var(--font-xs);
    color: var(--text-muted);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}}

.ch-feed-time {{
    font-size: 11px;
    color: var(--text-caption);
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 2px;
    font-variant-numeric: tabular-nums;
}}

/* ── Client 360 ───────────────────────────────────────────────── */
.ch-client-header {{
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    margin-bottom: var(--space-lg);
}}

.ch-client-avatar {{
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: var(--weight-bold);
    color: white;
    flex-shrink: 0;
}}

.ch-client-info {{
    flex: 1;
}}

.ch-client-name {{
    font-size: var(--font-xl);
    font-weight: var(--weight-bold);
    color: var(--text-primary);
    letter-spacing: -0.02em;
}}

.ch-client-email {{
    font-size: var(--font-sm);
    color: var(--text-muted);
}}

.ch-client-badges {{
    display: flex;
    gap: 8px;
    margin-top: 4px;
}}

.ch-timeline-event {{
    display: flex;
    gap: 16px;
    padding: 16px 0;
    position: relative;
}}

.ch-timeline-line {{
    position: absolute;
    left: 15px;
    top: 44px;
    bottom: 0;
    width: 2px;
    background: var(--border);
}}

.ch-timeline-dot {{
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
    z-index: 1;
}}

.ch-timeline-body {{
    flex: 1;
    padding-bottom: 8px;
}}

.ch-timeline-title {{
    font-size: var(--font-sm);
    font-weight: var(--weight-semibold);
    color: var(--text-primary);
}}

.ch-timeline-detail {{
    font-size: var(--font-xs);
    color: var(--text-muted);
    margin-top: 2px;
}}

.ch-timeline-time {{
    font-size: 11px;
    color: var(--text-caption);
    font-variant-numeric: tabular-nums;
}}

/* ── Focus Rings (accessibility) ───────────────────────────────── */
*:focus-visible {{
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
}}
</style>
"""


_DARK_MODE_JS = """
<script>
(function() {
    const isDark = window.parent.document.querySelector('.dark-mode');
    // Check if Streamlit has set dark mode via session state
    // This script is re-injected on every rerun, so we read the flag from a data attribute
    const flag = document.currentScript?.getAttribute('data-dark');
    if (flag === 'true' && !isDark) {
        window.parent.document.documentElement.classList.add('dark-mode');
        window.parent.document.body.classList.add('dark-mode');
        const app = window.parent.document.querySelector('.stApp');
        if (app) app.classList.add('dark-mode');
    } else if (flag === 'false') {
        window.parent.document.documentElement.classList.remove('dark-mode');
        window.parent.document.body.classList.remove('dark-mode');
        const app = window.parent.document.querySelector('.stApp');
        if (app) app.classList.remove('dark-mode');
    }
})();
</script>
"""


def inject_custom_css() -> None:
    """Inject global CSS overrides. Call once in main.py after set_page_config."""
    st.markdown(_CSS, unsafe_allow_html=True)


def inject_dark_mode(enabled: bool) -> None:
    """Toggle dark mode by adding/removing .dark-mode class via JS."""
    flag = "true" if enabled else "false"
    js = _DARK_MODE_JS.replace(
        "document.currentScript?.getAttribute('data-dark')",
        f"'{flag}'",
    )
    st.markdown(js, unsafe_allow_html=True)
