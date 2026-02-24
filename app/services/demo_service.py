"""Demo service layer — drop-in replacements for real services in Demo Mode.

Each class implements the same interface as its real counterpart so pages
work without any code changes.
"""

from __future__ import annotations

from app.utils.demo_data import (
    get_demo_payments,
    get_demo_intakes,
    get_demo_merged_clients,
    get_demo_pipeline_stats,
    get_demo_revenue_summary,
    get_demo_monthly_revenue,
    get_demo_booking_rate,
    get_demo_avg_time_to_book,
    get_demo_recent_sessions,
    get_demo_scheduled_events,
)


# ── Pre-built demo content ────────────────────────────────────────

DEMO_ACTION_PLAN = """\
## Hey Sarah,

Great call today. Let's get your rebrand moving.

## The Situation

Studio Lumen's visual identity doesn't match where you've taken the business. \
You serve luxury B2B clients now, but the brand still reads startup.

## What to Do Next

1. **Lock the color palette** (Deadline: 1 week)
Pick 3 colors max. Use Coolors.co. Think: warm neutrals + one bold accent.

2. **Write a one-page brand brief** (Deadline: 10 days)
Who you serve, what you stand for, what you're not. One page. No fluff.

3. **Redesign one key touchpoint** (Deadline: 2 weeks)
Start with the proposal template — that's where clients decide if you're premium.

## Tools & Resources

- Coolors.co for palette generation
- Notion for the brand brief (template linked in email)
- Figma for the redesign sprint

## What's Next

If you want hands-on help executing this, the 3-Session Sprint is built for exactly that.

—Frankie
"""

DEMO_ICP_ANALYSIS = """\
## Ideal Client Profile

**Primary ICP: Brand Founders in Creative Industries**

Based on intake data, your strongest clients share these traits:
- **Role:** Founders or Creative Directors at agencies/studios
- **Revenue:** $200k-$2M, growth stage
- **Trigger:** Rebrand, product launch, or pivot
- **Budget:** $500-$1,500 for direction, $5k-$40k for execution
- **Source:** Referrals and LinkedIn convert highest
- **Timeline:** 2-8 week deadlines drive urgency

**Upsell signals:** Multi-project needs, team alignment issues, revenue at stake.
"""


# ── Demo Services ─────────────────────────────────────────────────


class DemoNotionService:
    """Mimics NotionService interface with demo data."""

    def is_healthy(self) -> bool:
        return True

    def get_all_payments(self) -> list:
        return get_demo_payments()

    def get_all_intakes(self) -> list:
        return get_demo_intakes()

    def get_merged_clients(self) -> list:
        return get_demo_merged_clients()

    def get_pipeline_stats(self) -> dict:
        return get_demo_pipeline_stats()

    def get_payments_by_status(self, status: str) -> list:
        return [p for p in get_demo_payments() if p["status"] == status]

    def get_client_by_email(self, email: str):
        for p in get_demo_payments():
            if p.get("email", "").lower() == email.lower():
                return p
        return None

    def update_page(self, page_id: str, properties: dict) -> None:
        pass  # No-op in demo mode


class DemoStripeService:
    """Mimics StripeService interface with demo data."""

    def is_healthy(self) -> bool:
        return True

    def get_recent_sessions(self, days: int = 90) -> list:
        return get_demo_recent_sessions(days)

    def get_session_by_id(self, session_id: str):
        for s in get_demo_recent_sessions():
            if s["id"] == session_id:
                return s
        return None

    def get_revenue_summary(self, days: int = 30) -> dict:
        return get_demo_revenue_summary(days)

    def get_monthly_revenue(self, months: int = 6) -> list:
        return get_demo_monthly_revenue(months)

    def get_refunds(self, days: int = 30) -> list:
        return []


class DemoCalendlyService:
    """Mimics CalendlyService interface with demo data."""

    def is_healthy(self) -> bool:
        return True

    def get_scheduled_events(self, days_back: int = 30, days_forward: int = 30) -> list:
        return get_demo_scheduled_events(days_back, days_forward)

    def get_event_invitees(self, event_uuid: str) -> list:
        return []

    def get_no_shows(self, days: int = 30) -> list:
        return []

    def get_booking_rate(self, days: int = 30) -> dict:
        return get_demo_booking_rate(days)

    def get_avg_time_to_book(self):
        return get_demo_avg_time_to_book()

    def get_user_info(self) -> dict:
        return {"uri": "", "name": "Demo User", "email": "demo@example.com", "org_uri": ""}


class DemoClaudeService:
    """Returns pre-written demo responses instead of calling Claude API."""

    def is_healthy(self) -> bool:
        return True

    def generate_action_plan(self, **kwargs) -> str:
        return DEMO_ACTION_PLAN

    def generate_action_plan_from_transcript(self, **kwargs) -> str:
        return DEMO_ACTION_PLAN

    def process_transcript(self, raw_transcript: str) -> str:
        import json
        return json.dumps({
            "key_themes": ["Brand identity gap", "Team alignment", "Luxury market positioning"],
            "decisions_made": ["Focus on one touchpoint first", "Start with brand brief"],
            "recommendations_given": ["Lock palette to 3 colors", "Write one-page brief"],
            "action_items_discussed": ["Color palette by next week", "Brand brief in 10 days"],
            "client_concerns": ["Budget constraints", "Team disagreement on direction"],
            "notable_quotes": ["We serve luxury clients but our brand still looks like a startup"],
            "word_count": 4200,
        })

    def analyze_icp(self, clients: list) -> str:
        return DEMO_ICP_ANALYSIS

    def generate_text(self, prompt: str, max_tokens: int = 1500) -> str:
        return "This is a demo response. Enable live API connections for real AI-generated content."

    def generate_testimonial(self, **kwargs) -> str:
        return (
            '"Working with The Creative Hotline was exactly what we needed. '
            'Frankie cut through the noise and gave us a clear path forward. '
            'Our rebrand launched on time and our clients noticed immediately." '
            "— Sarah C., Studio Lumen"
        )

    def generate_case_study(self, **kwargs) -> str:
        return "## Studio Lumen: From Startup Look to Luxury Feel\n\n**The challenge:** ..."

    def analyze_growth(self, metrics: dict) -> str:
        return "Based on current trajectory, focus on referral partnerships and LinkedIn outreach."


class DemoFirefliesService:
    """Returns demo transcript data instead of calling Fireflies API."""

    def is_healthy(self) -> bool:
        return True

    def list_transcripts(self, limit: int = 10) -> list:
        from datetime import datetime, timedelta
        return [
            {
                "id": "demo-ff-01",
                "title": "Creative Hotline Call — Sarah Chen",
                "date": (datetime.now() - timedelta(days=12)).isoformat(),
                "duration": 42,
                "participants": ["Jake Goble", "Sarah Chen"],
                "summary": "Discussed Studio Lumen rebrand, team alignment, color palette decisions.",
            },
            {
                "id": "demo-ff-02",
                "title": "Creative Hotline Call — Marcus Rivera",
                "date": (datetime.now() - timedelta(days=18)).isoformat(),
                "duration": 48,
                "participants": ["Jake Goble", "Marcus Rivera"],
                "summary": "Product launch strategy for Riviera Collective, content plan, channel priorities.",
            },
        ]

    def get_transcript(self, transcript_id: str) -> dict | None:
        transcripts = {t["id"]: t for t in self.list_transcripts()}
        return transcripts.get(transcript_id)

    def get_transcript_text(self, transcript_id: str) -> str | None:
        return "This is demo transcript text. Connect Fireflies API for real call transcripts."


class DemoN8nService:
    """Returns healthy status for n8n in demo mode."""

    def is_healthy(self) -> bool:
        return True
