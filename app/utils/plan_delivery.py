"""Client-facing action plan delivery — branded HTML pages."""

from __future__ import annotations

import os
import re
from datetime import datetime


CALENDLY_DEFAULT = "https://calendly.com/soscreativehotline/creative-hotline-call"


def generate_client_html(
    client_name: str,
    brand: str,
    product: str,
    action_plan_markdown: str,
    calendly_url: str = CALENDLY_DEFAULT,
) -> str:
    """Generate a self-contained branded HTML page for client delivery.

    Returns complete HTML string with embedded CSS and JS.
    Checkboxes persist via localStorage. Mobile responsive.
    """
    first_name = client_name.split()[0] if client_name.strip() else "there"
    today = datetime.now().strftime("%B %d, %Y")
    slug = re.sub(r"[^a-z0-9]", "_", client_name.lower())
    rendered = _markdown_to_html(action_plan_markdown)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Action Plan — {client_name} | The Creative Hotline</title>
    <style>
        :root {{
            --orange: #FF6B35;
            --orange-light: #FFA564;
            --bg: #faf8f5;
            --text: #1a1a1a;
            --gray: #666666;
            --light-gray: #e0dcd8;
        }}

        * {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                         "Helvetica Neue", Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }}

        .container {{
            max-width: 680px;
            margin: 0 auto;
            padding: 40px 24px;
        }}

        /* Header */
        header {{
            margin-bottom: 32px;
        }}
        .brand {{
            font-size: 12px;
            font-weight: 700;
            color: var(--orange);
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 8px;
        }}
        header h1 {{
            font-size: 28px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 6px;
            line-height: 1.2;
        }}
        .meta {{
            font-size: 13px;
            color: var(--gray);
            margin-bottom: 16px;
        }}

        /* Progress bar */
        .progress-track {{
            height: 4px;
            background: var(--light-gray);
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 8px;
        }}
        .progress-fill {{
            height: 100%;
            background: var(--orange);
            border-radius: 2px;
            width: 0%;
            transition: width 0.3s ease;
        }}
        .progress-label {{
            font-size: 12px;
            color: var(--gray);
            margin-bottom: 24px;
        }}

        /* Section divider */
        hr {{
            border: none;
            border-top: 1px solid var(--light-gray);
            margin: 24px 0;
        }}

        /* Content */
        main h2 {{
            font-size: 20px;
            font-weight: 700;
            color: var(--text);
            margin: 28px 0 12px 0;
        }}
        main h2:first-child {{
            margin-top: 0;
        }}
        main p {{
            font-size: 15px;
            margin-bottom: 12px;
            color: var(--text);
        }}
        main strong {{ font-weight: 600; }}
        main em {{ font-style: italic; }}
        main a {{
            color: var(--orange);
            text-decoration: underline;
            text-underline-offset: 2px;
        }}

        /* Action items with checkboxes */
        .action-item {{
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 14px 16px;
            background: white;
            border: 1px solid var(--light-gray);
            border-radius: 8px;
            margin-bottom: 10px;
            transition: border-color 0.2s;
        }}
        .action-item:hover {{
            border-color: var(--orange-light);
        }}
        .action-item.checked {{
            opacity: 0.6;
            border-color: var(--light-gray);
        }}
        .action-item.checked .action-text {{
            text-decoration: line-through;
        }}
        .action-check {{
            appearance: none;
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            min-width: 20px;
            border: 2px solid var(--light-gray);
            border-radius: 4px;
            cursor: pointer;
            margin-top: 2px;
            position: relative;
            transition: all 0.2s;
        }}
        .action-check:checked {{
            background: var(--orange);
            border-color: var(--orange);
        }}
        .action-check:checked::after {{
            content: "\\2713";
            color: white;
            font-size: 14px;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }}
        .action-text {{
            font-size: 15px;
            line-height: 1.5;
            flex: 1;
        }}

        /* Bullet lists */
        ul {{
            padding-left: 20px;
            margin-bottom: 12px;
        }}
        ul li {{
            font-size: 15px;
            margin-bottom: 6px;
            color: var(--text);
        }}

        /* Signoff */
        .signoff {{
            font-size: 16px;
            font-style: italic;
            color: var(--gray);
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid var(--light-gray);
        }}

        /* CTA */
        .cta {{
            margin-top: 40px;
            text-align: center;
        }}
        .cta-button {{
            display: inline-block;
            width: 100%;
            max-width: 400px;
            padding: 16px 32px;
            background: var(--orange);
            color: white;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 8px;
            transition: background 0.2s;
        }}
        .cta-button:hover {{
            background: #e55a28;
        }}

        /* Footer */
        footer {{
            margin-top: 48px;
            padding-top: 16px;
            border-top: 1px solid var(--light-gray);
            text-align: center;
        }}
        footer p {{
            font-size: 12px;
            color: var(--gray);
        }}
        footer a {{
            color: var(--gray);
            text-decoration: none;
        }}

        @media (max-width: 600px) {{
            .container {{ padding: 24px 16px; }}
            header h1 {{ font-size: 22px; }}
            .action-item {{ padding: 12px; }}
        }}

        /* Print styles */
        @media print {{
            body {{ background: white; }}
            .container {{ max-width: 100%; padding: 0; }}
            .progress-track, .progress-label {{ display: none; }}
            .cta {{ display: none; }}
            .action-check {{ display: none; }}
            .action-item {{
                border: 1px solid #ccc;
                page-break-inside: avoid;
            }}
            .action-item.checked {{ opacity: 1; }}
            .action-item.checked .action-text {{ text-decoration: none; }}
            .print-btn {{ display: none; }}
            footer {{ margin-top: 24px; }}
            a {{ color: var(--text); text-decoration: none; }}
            a::after {{ content: " (" attr(href) ")"; font-size: 12px; color: var(--gray); }}
            main h2 {{ page-break-after: avoid; }}
        }}

        .print-btn {{
            display: inline-block;
            margin-top: 12px;
            padding: 10px 20px;
            background: transparent;
            border: 1px solid var(--light-gray);
            border-radius: 6px;
            color: var(--gray);
            font-size: 13px;
            cursor: pointer;
            transition: border-color 0.2s;
        }}
        .print-btn:hover {{
            border-color: var(--orange);
            color: var(--orange);
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="brand">THE CREATIVE HOTLINE</div>
            <h1>Action Plan for {first_name}</h1>
            <div class="meta">{today} &middot; {product}{f" &middot; {brand}" if brand else ""}</div>
            <div class="progress-track">
                <div class="progress-fill" id="progress"></div>
            </div>
            <div class="progress-label" id="progress-label">0 of 0 action items complete</div>
        </header>
        <main>
{rendered}
        </main>
        <div class="cta">
            <a href="{calendly_url}" class="cta-button" target="_blank" rel="noopener">
                Book a Follow-Up Call
            </a>
            <br>
            <button class="print-btn" onclick="window.print()">Save / Print this plan</button>
        </div>
        <footer>
            <p>
                <a href="https://www.thecreativehotline.com">The Creative Hotline</a>
                &middot; thecreativehotline.com
            </p>
        </footer>
    </div>
    <script>
        (function() {{
            var KEY = 'ch_plan_{slug}';
            var checks = document.querySelectorAll('.action-check');
            var progressBar = document.getElementById('progress');
            var progressLabel = document.getElementById('progress-label');
            var saved = {{}};
            try {{ saved = JSON.parse(localStorage.getItem(KEY) || '{{}}'); }} catch(e) {{}}

            function updateProgress() {{
                var total = checks.length;
                if (total === 0) {{
                    progressLabel.textContent = '';
                    return;
                }}
                var done = 0;
                checks.forEach(function(cb) {{ if (cb.checked) done++; }});
                progressBar.style.width = (done / total * 100) + '%';
                progressLabel.textContent = done + ' of ' + total + ' action items complete';

                var state = {{}};
                checks.forEach(function(cb, i) {{
                    state[i] = cb.checked;
                    var item = cb.closest('.action-item');
                    if (item) {{
                        if (cb.checked) item.classList.add('checked');
                        else item.classList.remove('checked');
                    }}
                }});
                localStorage.setItem(KEY, JSON.stringify(state));
            }}

            checks.forEach(function(cb, i) {{
                if (saved[i]) cb.checked = true;
                cb.addEventListener('change', updateProgress);
            }});
            updateProgress();
        }})();
    </script>
</body>
</html>"""


_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def save_client_page(
    email: str,
    html_content: str,
    output_dir: str = "",
) -> str:
    """Save client HTML page to disk. Returns the file path."""
    if not output_dir:
        output_dir = os.path.join(_PROJECT_ROOT, "plans", "pages")
    os.makedirs(output_dir, exist_ok=True)
    slug = email.split("@")[0].replace(".", "-")
    date = datetime.now().strftime("%Y-%m-%d")
    filename = f"{slug}_{date}.html"
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w") as f:
        f.write(html_content)
    return filepath


def _markdown_to_html(md_text: str) -> str:
    """Convert Frankie action plan markdown to HTML.

    Handles ## headers, **bold**, *italic*, [links](url),
    numbered lists (with checkboxes in action section), bullet lists,
    ---/—Frankie signoff, and paragraphs.
    """
    lines = md_text.strip().split("\n")
    html_parts: list[str] = []
    in_action_section = False
    in_bullet_list = False
    i = 0

    while i < len(lines):
        line = lines[i].strip()

        # Empty line
        if not line:
            if in_bullet_list:
                html_parts.append("</ul>")
                in_bullet_list = False
            i += 1
            continue

        # H2 header
        if line.startswith("## "):
            if in_bullet_list:
                html_parts.append("</ul>")
                in_bullet_list = False
            text = _inline_format(line[3:].strip())
            in_action_section = "what to do" in line.lower()
            html_parts.append(f"            <h2>{text}</h2>")
            i += 1
            continue

        # Horizontal rule
        if line == "---":
            if in_bullet_list:
                html_parts.append("</ul>")
                in_bullet_list = False
            html_parts.append("            <hr>")
            i += 1
            continue

        # Signoff
        if line.startswith("—Frankie") or line.startswith("-Frankie"):
            if in_bullet_list:
                html_parts.append("</ul>")
                in_bullet_list = False
            html_parts.append('            <div class="signoff">—Frankie</div>')
            i += 1
            continue

        # Numbered list items
        num_match = re.match(r"^(\d+)\.\s+(.*)", line)
        if num_match:
            if in_bullet_list:
                html_parts.append("</ul>")
                in_bullet_list = False
            text = _inline_format(num_match.group(2))

            # Collect continuation lines (indented or next lines until next numbered/header/empty)
            body_lines = []
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if not next_line or next_line.startswith("## ") or re.match(r"^\d+\.\s", next_line) or next_line.startswith("- ") or next_line == "---":
                    break
                body_lines.append(_inline_format(next_line))
                j += 1

            full_text = text
            if body_lines:
                full_text += "<br>" + "<br>".join(body_lines)

            if in_action_section:
                html_parts.append(
                    f'            <div class="action-item">'
                    f'<input type="checkbox" class="action-check">'
                    f'<div class="action-text">{full_text}</div></div>'
                )
            else:
                html_parts.append(f"            <p>{full_text}</p>")

            i = j
            continue

        # Bullet list items
        if line.startswith("- "):
            if not in_bullet_list:
                html_parts.append("            <ul>")
                in_bullet_list = True
            text = _inline_format(line[2:].strip())
            html_parts.append(f"            <li>{text}</li>")
            i += 1
            continue

        # Regular paragraph
        if in_bullet_list:
            html_parts.append("</ul>")
            in_bullet_list = False
        text = _inline_format(line)
        html_parts.append(f"            <p>{text}</p>")
        i += 1

    if in_bullet_list:
        html_parts.append("</ul>")

    return "\n".join(html_parts)


def _inline_format(text: str) -> str:
    """Convert inline markdown: **bold**, *italic*, [text](url)."""
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    text = re.sub(
        r"\[(.+?)\]\((.+?)\)",
        r'<a href="\2" target="_blank" rel="noopener">\1</a>',
        text,
    )
    return text
