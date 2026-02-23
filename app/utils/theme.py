"""Global CSS theme injection for the Creative Hotline Command Center.

Call inject_custom_css() once in main.py after st.set_page_config().
All 13 pages get the visual upgrade with zero page-level code changes.
"""

from __future__ import annotations

import streamlit as st

# All CSS in a single injection — uses stable data-testid selectors.
_CSS = """
<style>
/* ── Typography ─────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.stApp {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ── Sidebar ────────────────────────────────────────────────── */
section[data-testid="stSidebar"] {
    background-color: #141414;
    border-right: none;
}

section[data-testid="stSidebar"] * {
    color: #e0e0e0 !important;
}

section[data-testid="stSidebar"] .stMarkdown h3 {
    color: #FF6B35 !important;
    font-weight: 700;
    letter-spacing: 1px;
    font-size: 15px;
}

section[data-testid="stSidebar"] .stRadio > div {
    gap: 2px;
}

section[data-testid="stSidebar"] .stRadio label {
    padding: 8px 12px;
    border-radius: 8px;
    transition: background 0.2s ease;
    font-size: 14px;
    font-weight: 500;
}

section[data-testid="stSidebar"] .stRadio label:hover {
    background: rgba(255, 107, 53, 0.12);
}

section[data-testid="stSidebar"] .stRadio label[data-checked="true"],
section[data-testid="stSidebar"] .stRadio [aria-checked="true"] {
    background: rgba(255, 107, 53, 0.18) !important;
    color: #FF6B35 !important;
}

section[data-testid="stSidebar"] .stButton > button {
    background: rgba(255, 107, 53, 0.15);
    color: #FF6B35 !important;
    border: 1px solid rgba(255, 107, 53, 0.3);
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.2s ease;
}

section[data-testid="stSidebar"] .stButton > button:hover {
    background: rgba(255, 107, 53, 0.25);
    border-color: #FF6B35;
}

section[data-testid="stSidebar"] hr {
    border-color: rgba(255, 255, 255, 0.08) !important;
    margin: 16px 0;
}

section[data-testid="stSidebar"] .stCaption,
section[data-testid="stSidebar"] small {
    color: #888 !important;
}

/* ── Metric Cards ───────────────────────────────────────────── */
[data-testid="stMetric"],
[data-testid="metric-container"] {
    background: #ffffff;
    border: 1px solid #f0ede8;
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    transition: box-shadow 0.2s ease, transform 0.2s ease;
}

[data-testid="stMetric"]:hover,
[data-testid="metric-container"]:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
}

[data-testid="stMetricLabel"] {
    font-size: 12px !important;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #999 !important;
}

[data-testid="stMetricValue"] {
    font-size: 28px !important;
    font-weight: 700;
    color: #1a1a1a !important;
}

[data-testid="stMetricDelta"] {
    font-size: 12px !important;
    font-weight: 500;
}

/* ── Chart Containers ───────────────────────────────────────── */
[data-testid="stPlotlyChart"] {
    background: #ffffff;
    border: 1px solid #f0ede8;
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* ── Buttons ────────────────────────────────────────────────── */
.stButton > button {
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    padding: 8px 24px;
    transition: all 0.2s ease;
    border: 1px solid #e0dcd8;
}

.stButton > button:hover {
    border-color: #FF6B35;
    color: #FF6B35;
}

.stButton > button[kind="primary"],
.stButton > button[data-testid="baseButton-primary"] {
    background-color: #FF6B35;
    color: white !important;
    border: none;
}

.stButton > button[kind="primary"]:hover,
.stButton > button[data-testid="baseButton-primary"]:hover {
    background-color: #E55A24;
    color: white !important;
}

/* ── Form Inputs ────────────────────────────────────────────── */
.stTextInput > div > div > input,
.stTextArea > div > div > textarea,
.stNumberInput > div > div > input {
    border-radius: 8px !important;
    border: 1px solid #e0dcd8 !important;
    padding: 8px 12px;
    font-size: 14px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.stTextInput > div > div > input:focus,
.stTextArea > div > div > textarea:focus,
.stNumberInput > div > div > input:focus {
    border-color: #FF6B35 !important;
    box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.15) !important;
}

.stSelectbox > div > div {
    border-radius: 8px !important;
}

/* ── Expanders ──────────────────────────────────────────────── */
[data-testid="stExpander"] {
    background: #faf8f5;
    border: 1px solid #f0ede8;
    border-radius: 10px;
    overflow: hidden;
    transition: border-color 0.2s ease;
}

[data-testid="stExpander"]:hover {
    border-color: #e0dcd8;
}

[data-testid="stExpander"] summary {
    font-weight: 600;
    font-size: 14px;
}

/* ── Dividers ───────────────────────────────────────────────── */
[data-testid="stMarkdownContainer"] hr,
hr {
    border: none !important;
    border-top: 1px solid #f0ede8 !important;
    margin: 24px 0 !important;
}

/* ── Tables / DataFrames ────────────────────────────────────── */
[data-testid="stDataFrame"] {
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #f0ede8;
}

.stDataFrame table {
    font-size: 13px;
}

.stDataFrame thead th {
    background: #faf8f5 !important;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
    color: #666 !important;
}

.stDataFrame tbody tr:nth-child(even) {
    background: #faf8f5;
}

/* ── Alert Boxes ────────────────────────────────────────────── */
[data-testid="stAlert"],
.stAlert {
    border-radius: 10px;
    font-size: 14px;
}

/* ── Tabs ───────────────────────────────────────────────────── */
.stTabs [data-baseweb="tab-list"] {
    gap: 4px;
}

.stTabs [data-baseweb="tab"] {
    border-radius: 8px 8px 0 0;
    padding: 8px 20px;
    font-weight: 600;
    font-size: 14px;
}

/* ── Headers ────────────────────────────────────────────────── */
.stApp h1 {
    font-weight: 700;
    color: #1a1a1a;
    font-size: 28px;
}

.stApp h2 {
    font-weight: 700;
    color: #1a1a1a;
    font-size: 22px;
}

.stApp h3 {
    font-weight: 600;
    color: #1a1a1a;
    font-size: 18px;
}

/* ── Download Buttons ───────────────────────────────────────── */
.stDownloadButton > button {
    border-radius: 8px;
    font-weight: 600;
    border: 1px solid #e0dcd8;
    transition: all 0.2s ease;
}

.stDownloadButton > button:hover {
    border-color: #FF6B35;
    color: #FF6B35;
}

/* ── Progress Bar ───────────────────────────────────────────── */
.stProgress > div > div > div {
    background-color: #FF6B35;
    border-radius: 4px;
}

/* ── Toggle ─────────────────────────────────────────────────── */
[data-testid="stToggle"] span[role="checkbox"][aria-checked="true"] {
    background-color: #FF6B35 !important;
}

/* ── Mobile Responsive ──────────────────────────────────────── */
@media (max-width: 768px) {
    [data-testid="stMetric"],
    [data-testid="metric-container"] {
        padding: 12px 14px;
    }

    [data-testid="stMetricValue"] {
        font-size: 22px !important;
    }

    .stApp h1 {
        font-size: 22px;
    }

    .stApp h2 {
        font-size: 18px;
    }

    [data-testid="stPlotlyChart"] {
        padding: 8px;
    }
}

/* ── Smooth Scrollbar ───────────────────────────────────────── */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: #d0ccc6;
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: #b0aca6;
}
</style>
"""


def inject_custom_css() -> None:
    """Inject global CSS overrides. Call once in main.py after set_page_config."""
    st.markdown(_CSS, unsafe_allow_html=True)
