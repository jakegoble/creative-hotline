"""Action Plan Template Library — save, browse, and reuse plan templates.

Templates are stored as JSON files in plans/templates/ with metadata
about the original client, product, and creative challenge.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional


TEMPLATES_DIR = Path("plans/templates")


@dataclass
class PlanTemplate:
    """A reusable action plan template."""
    id: str
    name: str
    description: str
    category: str  # rebrand, launch, content, monetization, positioning, general
    product_tier: str  # First Call, Single Call, 3-Session Clarity Sprint
    plan_text: str
    tags: list[str] = field(default_factory=list)
    original_client: str = ""
    original_brand: str = ""
    created_at: str = ""
    times_used: int = 0


# ── Built-in starter templates ────────────────────────────────────

STARTER_TEMPLATES = [
    PlanTemplate(
        id="tpl-rebrand",
        name="Brand Refresh Playbook",
        description="3-step rebrand framework: audit, define, execute. Best for studios/agencies outgrowing their current identity.",
        category="rebrand",
        product_tier="Single Call",
        tags=["visual identity", "positioning", "rebrand"],
        plan_text="""## Brand Refresh Playbook

### The Situation
Your brand has outgrown its current identity. What worked at launch doesn't reflect where you are now.

### Step 1: Brand Audit (Week 1)
- Screenshot every customer touchpoint (website, socials, proposals, invoices)
- List the 3 words you want clients to say about your brand
- Identify the biggest gap between perception and reality

### Step 2: Define the New Direction (Week 2)
- Write a one-page brand brief: who you serve, what you stand for, what you're not
- Lock the color palette — 3 colors max (use Coolors.co)
- Choose 2 fonts: one for headlines, one for body text

### Step 3: Execute the Pivot (Weeks 3-4)
- Redesign your highest-impact touchpoint first (usually the proposal or website hero)
- Update social profiles and bio across all platforms
- Send a "We've evolved" announcement to your email list

### Tools & Resources
- Coolors.co for palette generation
- Figma for design iteration
- Notion for the brand brief template

### What's Next
If you want hands-on help executing all three steps, the 3-Session Sprint is built for exactly this.

—Frankie
""",
    ),
    PlanTemplate(
        id="tpl-launch",
        name="Product Launch Sprint",
        description="6-week launch framework for new products/services. Covers positioning, content calendar, and launch sequence.",
        category="launch",
        product_tier="3-Session Clarity Sprint",
        tags=["product launch", "go-to-market", "content strategy"],
        plan_text="""## Product Launch Sprint

### The Situation
You're launching something new and need a clear path from idea to market.

### Phase 1: Positioning (Weeks 1-2)
- Define your ideal buyer in one sentence (not a persona doc — one sentence)
- Write your launch one-liner: "[Product] helps [who] do [what] without [pain point]"
- Price it based on the transformation, not the time spent

### Phase 2: Content Engine (Weeks 3-4)
- Create 3 pillar pieces of content that prove you can solve the problem
- Build a 5-email launch sequence: story, problem, solution, proof, offer
- Set up your landing page with one CTA — don't give people options

### Phase 3: Launch Week (Weeks 5-6)
- Soft launch to your warmest 50 contacts first
- Run a 72-hour launch window with genuine scarcity
- Day-after debrief: what worked, what to change for next time

### Key Principle
Launch to learn, not to be perfect. Your first 5 customers will teach you more than 5 months of planning.

—Frankie
""",
    ),
    PlanTemplate(
        id="tpl-content",
        name="Content Strategy Reset",
        description="For creators/brands stuck in a content rut. Focuses on finding the one format that works and doubling down.",
        category="content",
        product_tier="First Call",
        tags=["content", "social media", "engagement"],
        plan_text="""## Content Strategy Reset

### The Situation
You're posting consistently but nothing's landing. Engagement is flat. Growth has stalled.

### The Fix: Find Your One Thing

**Step 1: Audit what worked (This week)**
- Pull your top 10 posts by engagement in the last 90 days
- Look for the pattern — format, topic, tone, time of day
- That pattern IS your strategy. Everything else is noise.

**Step 2: Build your content pillar (Next week)**
- Pick ONE content format you can sustain for 90 days
- Create a simple template you can repeat (same structure, different topic each time)
- Batch-create 2 weeks of content in one sitting

**Step 3: Distribution over creation (Ongoing)**
- Every piece of content gets repurposed 3 ways minimum
- Spend 30% of your time creating, 70% distributing and engaging
- Track only one metric: saves (not likes, not followers — saves)

### The Rule
If you can't explain your content strategy in one sentence, it's too complicated.

—Frankie
""",
    ),
    PlanTemplate(
        id="tpl-monetize",
        name="Creator Monetization Path",
        description="For content creators with an audience who want to monetize. Helps choose between courses, consulting, and products.",
        category="monetization",
        product_tier="First Call",
        tags=["creator", "monetization", "audience", "revenue"],
        plan_text="""## Creator Monetization Path

### The Situation
You have an audience but no clear revenue model. You're stuck between courses, consulting, and products.

### The Decision Framework

**Start with consulting/services (not courses).** Here's why:
- You learn exactly what people will pay for by doing it 1:1
- You build case studies and testimonials before scaling
- You discover your repeatable process that becomes a course later

### Step 1: Package Your Expertise (This week)
- Name your offer (not "consulting" — something specific)
- Price it at 2x what feels comfortable. Seriously.
- Create a simple intake form (Tally or Google Forms)

### Step 2: Sell to Your Warmest Audience (Next 2 weeks)
- DM your top 10 most engaged followers personally
- Post about the problem you solve (not the offer) 3x this week
- Aim for 3 paid clients in 30 days

### Step 3: Systematize (Month 2)
- Build a simple onboarding flow (Notion template + Calendly link)
- Document your process so you can repeat it
- Raise prices after every 3rd client

### The Path
Services → Productized Services → Digital Products → Courses. In that order.

—Frankie
""",
    ),
]


def get_templates_dir() -> Path:
    """Ensure templates directory exists and return path."""
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    return TEMPLATES_DIR


def list_templates() -> list[PlanTemplate]:
    """List all templates (built-in + saved)."""
    templates = list(STARTER_TEMPLATES)

    tpl_dir = get_templates_dir()
    for f in sorted(tpl_dir.glob("*.json")):
        try:
            data = json.loads(f.read_text())
            templates.append(PlanTemplate(**data))
        except (json.JSONDecodeError, TypeError):
            continue

    return templates


def get_template(template_id: str) -> Optional[PlanTemplate]:
    """Get a specific template by ID."""
    for tpl in list_templates():
        if tpl.id == template_id:
            return tpl
    return None


def save_template(template: PlanTemplate) -> Path:
    """Save a template to disk."""
    tpl_dir = get_templates_dir()
    if not template.created_at:
        template.created_at = datetime.now().isoformat()
    if not template.id:
        template.id = f"tpl-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    filepath = tpl_dir / f"{template.id}.json"
    filepath.write_text(json.dumps(asdict(template), indent=2))
    return filepath


def delete_template(template_id: str) -> bool:
    """Delete a saved template. Cannot delete built-in templates."""
    if any(t.id == template_id for t in STARTER_TEMPLATES):
        return False
    filepath = get_templates_dir() / f"{template_id}.json"
    if filepath.exists():
        filepath.unlink()
        return True
    return False


def get_categories() -> list[str]:
    """Return all available template categories."""
    return ["rebrand", "launch", "content", "monetization", "positioning", "general"]
