"""PDF and CSV export utilities using ReportLab.

Generates branded action plan PDFs in The Creative Hotline style.
"""

from __future__ import annotations

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
    Table, TableStyle, ListFlowable, ListItem, PageBreak,
)


# Brand colors
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ORANGE = colors.HexColor("#FF6B35")
DARK_TEXT = colors.HexColor("#1a1a1a")
LIGHT_BG = colors.HexColor("#faf8f5")
GRAY = colors.HexColor("#666666")
LIGHT_RULE = colors.HexColor("#e0e0e0")


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

    story.extend(_parse_markdown_to_story(action_plan_markdown, styles))

    # ── Footer ───────────────────────────────────────────────────

    story.append(Spacer(1, 30))
    story.append(Paragraph(
        "The Creative Hotline — thecreativehotline.com",
        styles["footer"],
    ))

    doc.build(story)
    return buffer.getvalue()


def generate_premium_pdf(
    client_name: str,
    brand: str,
    product: str,
    date: str,
    action_plan_markdown: str,
    transcript_summary: dict | None = None,
) -> bytes:
    """Generate a premium branded PDF with cover page and optional appendix.

    Enhancements over generate_action_plan_pdf:
    - Cover page with brand name, product tier, date
    - Better spacing and section dividers
    - Optional appendix: "Key Themes from Our Conversation"
    - Page numbers in footer
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

    # ── Cover Page ───────────────────────────────────────────────

    story.append(Spacer(1, 2.5 * inch))
    story.append(Paragraph("THE CREATIVE HOTLINE", styles["cover_brand"]))
    story.append(Spacer(1, 24))
    story.append(Paragraph("Action Plan", styles["cover_title"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"for {client_name}", styles["cover_subtitle"]))
    story.append(Spacer(1, 20))

    if brand:
        story.append(Paragraph(brand, styles["cover_meta"]))
        story.append(Spacer(1, 6))

    story.append(Paragraph(f"{product}  •  {date}", styles["cover_meta"]))
    story.append(Spacer(1, 24))
    story.append(HRFlowable(
        width="40%", thickness=3, color=ORANGE,
    ))

    story.append(PageBreak())

    # ── Main Content ─────────────────────────────────────────────

    story.extend(_parse_markdown_to_story(action_plan_markdown, styles))

    # ── Appendix (if transcript data available) ──────────────────

    appendix_sections = _build_appendix_sections(transcript_summary)
    if appendix_sections:
        story.append(PageBreak())
        story.append(Spacer(1, 14))
        story.append(Paragraph("Key Themes from Our Conversation", styles["h2"]))
        story.append(Spacer(1, 8))
        story.append(Paragraph(
            "These themes and insights were identified from our call together.",
            styles["body"],
        ))
        story.append(Spacer(1, 12))

        for section_title, items in appendix_sections:
            story.append(Paragraph(section_title, styles["appendix_header"]))
            story.append(Spacer(1, 4))
            for item in items:
                text = _md_to_reportlab(item)
                story.append(Paragraph(f"• {text}", styles["body"]))
            story.append(Spacer(1, 12))

    doc.build(story, onFirstPage=_add_page_number, onLaterPages=_add_page_number)
    return buffer.getvalue()


def generate_sprint_completion_pdf(
    client_name: str,
    brand: str,
    session_plans: list[str],
    roadmap_markdown: str,
    transcript_summaries: list[dict | None] | None = None,
) -> bytes:
    """Generate a consolidated Sprint completion PDF.

    Combines action plans from all 3 sessions with a 90-day roadmap.

    Args:
        client_name: Client's full name.
        brand: Client's brand name.
        session_plans: List of 3 action plan markdown strings (one per session).
        roadmap_markdown: 90-day roadmap as markdown.
        transcript_summaries: Optional list of transcript summaries per session.

    Returns:
        PDF as bytes.
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

    # ── Cover Page ────────────────────────────────────────────────

    story.append(Spacer(1, 2 * inch))
    story.append(Paragraph("THE CREATIVE HOTLINE", styles["cover_brand"]))
    story.append(Spacer(1, 24))
    story.append(Paragraph("3-Session Clarity Sprint", styles["cover_title"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"for {client_name}", styles["cover_subtitle"]))
    story.append(Spacer(1, 20))

    if brand:
        story.append(Paragraph(brand, styles["cover_meta"]))
        story.append(Spacer(1, 6))

    today = datetime.now().strftime("%B %d, %Y")
    story.append(Paragraph(f"Completed {today}", styles["cover_meta"]))
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="40%", thickness=3, color=ORANGE))
    story.append(Spacer(1, 40))

    # Sprint summary on cover
    story.append(Paragraph(
        "This document consolidates all three sessions of your Clarity Sprint "
        "into a single reference. It includes your final action plan, session-"
        "by-session highlights, and your 90-day roadmap.",
        ParagraphStyle(
            "cover_body", parent=styles["body"],
            alignment=TA_CENTER, textColor=GRAY, fontSize=12,
        ),
    ))

    story.append(PageBreak())

    # ── Table of Contents ─────────────────────────────────────────

    story.append(Paragraph("What's Inside", styles["h2"]))
    story.append(Spacer(1, 8))
    toc_items = [
        "Session 1 — Direction",
        "Session 2 — Execution Review",
        "Session 3 — Roadmap",
        "Your 90-Day Roadmap",
    ]
    if transcript_summaries and any(transcript_summaries):
        toc_items.append("Key Themes from Our Conversations")

    for idx, item in enumerate(toc_items, 1):
        story.append(Paragraph(f"{idx}. {item}", styles["body"]))

    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1, color=LIGHT_RULE))

    # ── Session Action Plans ──────────────────────────────────────

    session_labels = [
        "Session 1 — Direction",
        "Session 2 — Execution Review",
        "Session 3 — Roadmap",
    ]

    for idx, (label, plan) in enumerate(zip(session_labels, session_plans)):
        story.append(PageBreak())
        story.append(Spacer(1, 10))

        # Session header bar
        story.append(Paragraph(
            f"SESSION {idx + 1} OF 3",
            ParagraphStyle(
                f"session_badge_{idx}", parent=styles["brand"],
                fontSize=10,
            ),
        ))
        story.append(Spacer(1, 4))
        story.append(Paragraph(label, styles["cover_subtitle"]))
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=2, color=ORANGE, spaceAfter=16))

        story.extend(_parse_markdown_to_story(plan, styles))

    # ── 90-Day Roadmap ────────────────────────────────────────────

    story.append(PageBreak())
    story.append(Spacer(1, 10))
    story.append(Paragraph("YOUR 90-DAY ROADMAP", styles["brand"]))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Your 90-Day Roadmap", styles["cover_subtitle"]))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=ORANGE, spaceAfter=16))

    story.extend(_parse_markdown_to_story(roadmap_markdown, styles))

    # ── Appendix: Themes from All Sessions ────────────────────────

    if transcript_summaries and any(transcript_summaries):
        story.append(PageBreak())
        story.append(Spacer(1, 10))
        story.append(Paragraph(
            "Key Themes from Our Conversations", styles["h2"],
        ))
        story.append(Spacer(1, 8))

        for idx, summary in enumerate(transcript_summaries):
            if not summary:
                continue

            story.append(Paragraph(
                f"Session {idx + 1}", styles["appendix_header"],
            ))
            story.append(Spacer(1, 4))

            for section_title, items in _build_appendix_sections(summary):
                story.append(Paragraph(
                    section_title,
                    ParagraphStyle(
                        f"sub_header_{idx}_{section_title}",
                        parent=styles["body"],
                        fontName="Helvetica-Bold",
                        textColor=DARK_TEXT,
                    ),
                ))
                story.append(Spacer(1, 2))
                for item in items:
                    text = _md_to_reportlab(item)
                    story.append(Paragraph(f"\u2022 {text}", styles["body"]))
                story.append(Spacer(1, 8))

            story.append(Spacer(1, 12))

    doc.build(story, onFirstPage=_add_page_number, onLaterPages=_add_page_number)
    return buffer.getvalue()


def save_action_plan_version(
    email: str,
    action_plan_text: str,
    plans_dir: str = "",
) -> str:
    """Save an action plan as a versioned JSON file.

    Returns the file path.
    """
    if not plans_dir:
        plans_dir = os.path.join(_PROJECT_ROOT, "plans")
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


# ── Private Helpers ──────────────────────────────────────────────


def _parse_markdown_to_story(markdown: str, styles: dict) -> list:
    """Parse markdown text into ReportLab story elements.

    Shared between generate_action_plan_pdf and generate_premium_pdf.
    """
    elements = []
    lines = markdown.strip().split("\n")
    i = 0
    in_list = False
    list_items = []

    while i < len(lines):
        line = lines[i].strip()

        if not line:
            if in_list and list_items:
                elements.append(_build_list(list_items, styles))
                list_items = []
                in_list = False
            elements.append(Spacer(1, 8))
            i += 1
            continue

        # H2 header
        if line.startswith("## "):
            if in_list and list_items:
                elements.append(_build_list(list_items, styles))
                list_items = []
                in_list = False
            text = line[3:].strip()
            elements.append(Spacer(1, 14))
            elements.append(Paragraph(text, styles["h2"]))
            elements.append(Spacer(1, 8))
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
                elements.append(_build_list(list_items, styles))
                list_items = []
                in_list = False
            elements.append(Spacer(1, 6))
            elements.append(HRFlowable(width="100%", thickness=1, color=LIGHT_RULE))
            elements.append(Spacer(1, 6))
            i += 1
            continue

        # Sign-off
        if line.startswith("\u2014Frankie") or line.startswith("-Frankie"):
            if in_list and list_items:
                elements.append(_build_list(list_items, styles))
                list_items = []
                in_list = False
            elements.append(Spacer(1, 20))
            elements.append(HRFlowable(width="100%", thickness=1, color=LIGHT_RULE))
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("\u2014Frankie", styles["signoff"]))
            i += 1
            continue

        # Regular paragraph
        if in_list and list_items:
            elements.append(_build_list(list_items, styles))
            list_items = []
            in_list = False
        text = _md_to_reportlab(line)
        elements.append(Paragraph(text, styles["body"]))
        i += 1

    # Flush remaining list
    if in_list and list_items:
        elements.append(_build_list(list_items, styles))

    return elements


def _build_appendix_sections(transcript_summary: dict | None) -> list[tuple[str, list[str]]]:
    """Build appendix sections from transcript summary data.

    Returns list of (title, items) tuples, omitting empty sections.
    """
    if not transcript_summary:
        return []

    mappings = [
        ("Key Themes", "key_themes"),
        ("Decisions Made", "decisions_made"),
        ("Client Concerns", "client_concerns"),
        ("Notable Quotes", "notable_quotes"),
    ]

    sections = []
    for title, key in mappings:
        items = transcript_summary.get(key, [])
        if items:
            sections.append((title, items))

    return sections


def _add_page_number(canvas, doc):
    """Footer callback — adds page number and brand line."""
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(
        letter[0] / 2,
        0.5 * inch,
        f"The Creative Hotline \u2014 thecreativehotline.com  |  Page {doc.page}",
    )
    canvas.restoreState()


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
        # Premium PDF styles
        "cover_brand": ParagraphStyle(
            "cover_brand", parent=base["Normal"],
            fontSize=14, textColor=ORANGE,
            fontName="Helvetica-Bold",
            letterSpacing=2.0,
            alignment=TA_CENTER,
        ),
        "cover_title": ParagraphStyle(
            "cover_title", parent=base["Normal"],
            fontSize=28, textColor=DARK_TEXT,
            fontName="Helvetica-Bold",
            alignment=TA_CENTER,
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle", parent=base["Normal"],
            fontSize=22, textColor=DARK_TEXT,
            fontName="Helvetica-Bold",
            alignment=TA_CENTER,
        ),
        "cover_meta": ParagraphStyle(
            "cover_meta", parent=base["Normal"],
            fontSize=13, textColor=GRAY,
            alignment=TA_CENTER,
        ),
        "appendix_header": ParagraphStyle(
            "appendix_header", parent=base["Normal"],
            fontSize=13, textColor=ORANGE,
            fontName="Helvetica-Bold",
            spaceAfter=4,
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
