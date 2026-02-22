"""PDF and CSV export utilities using ReportLab.

Generates branded action plan PDFs in The Creative Hotline style.
"""

import io
import json
import os
import re
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    Table, TableStyle, ListFlowable, ListItem,
)


# Brand colors
ORANGE = colors.HexColor("#FF6B35")
DARK_TEXT = colors.HexColor("#1a1a1a")
LIGHT_BG = colors.HexColor("#faf8f5")
GRAY = colors.HexColor("#666666")


def generate_action_plan_pdf(
    client_name: str,
    product_purchased: str,
    action_plan_markdown: str,
) -> bytes:
    """Generate a branded PDF from a Markdown action plan.

    Returns PDF as bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=1 * inch,
        rightMargin=1 * inch,
        topMargin=0.8 * inch,
        bottomMargin=1 * inch,
    )

    styles = _build_styles()
    story = []

    # ── Header ───────────────────────────────────────────────────

    story.append(Paragraph("THE CREATIVE HOTLINE", styles["brand"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"Action Plan for {client_name}", styles["title"]))
    story.append(Spacer(1, 4))
    today = datetime.now().strftime("%B %d, %Y")
    story.append(Paragraph(f"Prepared {today} | {product_purchased}", styles["meta"]))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(
        width="100%", thickness=3, color=ORANGE,
        spaceAfter=20,
    ))

    # ── Parse Markdown into PDF elements ─────────────────────────

    lines = action_plan_markdown.strip().split("\n")
    i = 0
    in_list = False
    list_items = []

    while i < len(lines):
        line = lines[i].strip()

        if not line:
            if in_list and list_items:
                story.append(_build_list(list_items, styles))
                list_items = []
                in_list = False
            story.append(Spacer(1, 8))
            i += 1
            continue

        # H2 header
        if line.startswith("## "):
            if in_list and list_items:
                story.append(_build_list(list_items, styles))
                list_items = []
                in_list = False
            text = line[3:].strip()
            story.append(Spacer(1, 14))
            story.append(Paragraph(text, styles["h2"]))
            story.append(Spacer(1, 8))
            i += 1
            continue

        # Numbered list items
        if re.match(r"^\d+\.\s", line):
            in_list = True
            text = re.sub(r"^\d+\.\s", "", line)
            text = _md_to_reportlab(text)
            list_items.append(text)
            i += 1
            continue

        # Bullet list items
        if line.startswith("- "):
            in_list = True
            text = line[2:].strip()
            text = _md_to_reportlab(text)
            list_items.append(text)
            i += 1
            continue

        # Horizontal rule
        if line == "---":
            if in_list and list_items:
                story.append(_build_list(list_items, styles))
                list_items = []
                in_list = False
            story.append(Spacer(1, 6))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e0e0e0")))
            story.append(Spacer(1, 6))
            i += 1
            continue

        # Sign-off
        if line.startswith("—Frankie") or line.startswith("-Frankie"):
            if in_list and list_items:
                story.append(_build_list(list_items, styles))
                list_items = []
                in_list = False
            story.append(Spacer(1, 20))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e0e0e0")))
            story.append(Spacer(1, 10))
            story.append(Paragraph("—Frankie", styles["signoff"]))
            i += 1
            continue

        # Regular paragraph
        if in_list and list_items:
            story.append(_build_list(list_items, styles))
            list_items = []
            in_list = False
        text = _md_to_reportlab(line)
        story.append(Paragraph(text, styles["body"]))
        i += 1

    # Flush remaining list
    if in_list and list_items:
        story.append(_build_list(list_items, styles))

    # ── Footer ───────────────────────────────────────────────────

    story.append(Spacer(1, 30))
    story.append(Paragraph(
        "The Creative Hotline — thecreativehotline.com",
        styles["footer"],
    ))

    doc.build(story)
    return buffer.getvalue()


def save_action_plan_version(
    email: str,
    action_plan_text: str,
    plans_dir: str = "plans",
) -> str:
    """Save an action plan as a versioned JSON file.

    Returns the file path.
    """
    os.makedirs(plans_dir, exist_ok=True)
    today = datetime.now().strftime("%Y-%m-%d")
    slug = email.split("@")[0].replace(".", "-")

    # Find next version number
    version = 1
    while os.path.exists(os.path.join(plans_dir, f"{slug}_{today}_v{version}.json")):
        version += 1

    filename = f"{slug}_{today}_v{version}.json"
    filepath = os.path.join(plans_dir, filename)

    data = {
        "email": email,
        "date": today,
        "version": version,
        "content": action_plan_text,
        "generated_at": datetime.now().isoformat(),
    }

    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

    return filepath


def _build_styles() -> dict:
    """Build custom ReportLab paragraph styles."""
    base = getSampleStyleSheet()
    return {
        "brand": ParagraphStyle(
            "brand", parent=base["Normal"],
            fontSize=11, textColor=ORANGE,
            fontName="Helvetica-Bold",
            spaceAfter=0, letterSpacing=1.5,
        ),
        "title": ParagraphStyle(
            "title", parent=base["Normal"],
            fontSize=22, textColor=DARK_TEXT,
            fontName="Helvetica-Bold",
            spaceAfter=0,
        ),
        "meta": ParagraphStyle(
            "meta", parent=base["Normal"],
            fontSize=10, textColor=GRAY,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Normal"],
            fontSize=16, textColor=DARK_TEXT,
            fontName="Helvetica-Bold",
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"],
            fontSize=11, textColor=DARK_TEXT,
            leading=16, spaceAfter=6,
        ),
        "list_item": ParagraphStyle(
            "list_item", parent=base["Normal"],
            fontSize=11, textColor=DARK_TEXT,
            leading=16, leftIndent=20,
        ),
        "signoff": ParagraphStyle(
            "signoff", parent=base["Normal"],
            fontSize=12, textColor=GRAY,
            fontName="Helvetica-Oblique",
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"],
            fontSize=9, textColor=GRAY,
            alignment=TA_CENTER,
        ),
    }


def _build_list(items: list[str], styles: dict) -> ListFlowable:
    """Build a numbered list from text items."""
    return ListFlowable(
        [ListItem(Paragraph(item, styles["list_item"])) for item in items],
        bulletType="1",
        start=1,
        bulletFontSize=11,
        bulletColor=ORANGE,
        leftIndent=20,
    )


def _md_to_reportlab(text: str) -> str:
    """Convert basic Markdown formatting to ReportLab XML tags."""
    # Bold: **text** -> <b>text</b>
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    # Italic: *text* -> <i>text</i>
    text = re.sub(r"\*(.+?)\*", r"<i>\1</i>", text)
    # Links: [text](url) -> text (url)
    text = re.sub(r"\[(.+?)\]\((.+?)\)", r'\1 (<a href="\2">\2</a>)', text)
    return text
