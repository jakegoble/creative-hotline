"""Demo data for the Creative Hotline Command Center.

15 realistic demo clients covering all pipeline stages, products, lead sources.
All dates are relative to now so data always looks fresh.
"""

from __future__ import annotations

from datetime import datetime, timedelta


def _ago(days: int) -> str:
    """ISO datetime string for N days ago."""
    return (datetime.now() - timedelta(days=days)).isoformat() + "Z"


def _date_ago(days: int) -> str:
    """ISO date string for N days ago."""
    return (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")


# ── Payment Records ──────────────────────────────────────────────

DEMO_PAYMENTS = [
    # Follow-Up Sent (2)
    {
        "id": "demo-p01", "client_name": "Sarah Chen", "email": "sarah@studiolumen.com",
        "phone": "+1-310-555-1234", "payment_amount": 699, "product_purchased": "Single Call",
        "payment_date": _date_ago(18), "status": "Follow-Up Sent", "call_date": _date_ago(12),
        "calendly_link": "", "lead_source": "Referral", "stripe_session_id": "cs_demo_01",
        "linked_intake_id": "demo-i01", "booking_reminder_sent": True,
        "intake_reminder_sent": True, "nurture_email_sent": False,
        "created": _ago(20), "url": "",
    },
    {
        "id": "demo-p02", "client_name": "Marcus Rivera", "email": "marcus@rivieracollective.co",
        "phone": "+1-718-555-2345", "payment_amount": 1495, "product_purchased": "3-Session Clarity Sprint",
        "payment_date": _date_ago(25), "status": "Follow-Up Sent", "call_date": _date_ago(18),
        "calendly_link": "", "lead_source": "LinkedIn", "stripe_session_id": "cs_demo_02",
        "linked_intake_id": "demo-i02", "booking_reminder_sent": True,
        "intake_reminder_sent": True, "nurture_email_sent": False,
        "created": _ago(28), "url": "",
    },
    # Call Complete (2)
    {
        "id": "demo-p03", "client_name": "Priya Kaur", "email": "priya@goldthreadstudio.com",
        "phone": "+1-415-555-3456", "payment_amount": 499, "product_purchased": "First Call",
        "payment_date": _date_ago(10), "status": "Call Complete", "call_date": _date_ago(3),
        "calendly_link": "", "lead_source": "IG DM", "stripe_session_id": "cs_demo_03",
        "linked_intake_id": "demo-i03", "booking_reminder_sent": True,
        "intake_reminder_sent": True, "nurture_email_sent": False,
        "created": _ago(12), "url": "",
    },
    {
        "id": "demo-p04", "client_name": "Tyler Brooks", "email": "tyler@ironbarkdesign.com",
        "phone": "+1-512-555-4567", "payment_amount": 699, "product_purchased": "Single Call",
        "payment_date": _date_ago(8), "status": "Call Complete", "call_date": _date_ago(2),
        "calendly_link": "", "lead_source": "Website", "stripe_session_id": "cs_demo_04",
        "linked_intake_id": "demo-i04", "booking_reminder_sent": True,
        "intake_reminder_sent": True, "nurture_email_sent": False,
        "created": _ago(10), "url": "",
    },
    # Ready for Call (1)
    {
        "id": "demo-p05", "client_name": "Jenna Morales", "email": "jenna@mosaiccreative.co",
        "phone": "+1-213-555-5678", "payment_amount": 1495, "product_purchased": "3-Session Clarity Sprint",
        "payment_date": _date_ago(7), "status": "Ready for Call", "call_date": _date_ago(-1),
        "calendly_link": "https://calendly.com/soscreativehotline/call", "lead_source": "Referral",
        "stripe_session_id": "cs_demo_05", "linked_intake_id": "demo-i05",
        "booking_reminder_sent": True, "intake_reminder_sent": True,
        "nurture_email_sent": False, "created": _ago(9), "url": "",
    },
    # Intake Complete (2)
    {
        "id": "demo-p06", "client_name": "David Kim", "email": "david@halcyonstudios.com",
        "phone": "+1-323-555-6789", "payment_amount": 699, "product_purchased": "Single Call",
        "payment_date": _date_ago(6), "status": "Intake Complete", "call_date": _date_ago(-3),
        "calendly_link": "https://calendly.com/soscreativehotline/call", "lead_source": "Meta Ad",
        "stripe_session_id": "cs_demo_06", "linked_intake_id": "demo-i06",
        "booking_reminder_sent": True, "intake_reminder_sent": True,
        "nurture_email_sent": False, "created": _ago(8), "url": "",
    },
    {
        "id": "demo-p07", "client_name": "Amara Osei", "email": "amara@firstandten.co",
        "phone": "+1-404-555-7890", "payment_amount": 499, "product_purchased": "First Call",
        "payment_date": _date_ago(5), "status": "Intake Complete", "call_date": _date_ago(-4),
        "calendly_link": "https://calendly.com/soscreativehotline/call", "lead_source": "IG Comment",
        "stripe_session_id": "cs_demo_07", "linked_intake_id": "demo-i07",
        "booking_reminder_sent": True, "intake_reminder_sent": True,
        "nurture_email_sent": False, "created": _ago(7), "url": "",
    },
    # Booked - Needs Intake (2)
    {
        "id": "demo-p08", "client_name": "Naomi Tanaka", "email": "naomi@kintsugibrands.com",
        "phone": "+1-503-555-8901", "payment_amount": 699, "product_purchased": "Single Call",
        "payment_date": _date_ago(4), "status": "Booked - Needs Intake",
        "call_date": _date_ago(-2), "calendly_link": "https://calendly.com/soscreativehotline/call",
        "lead_source": "IG DM", "stripe_session_id": "cs_demo_08",
        "linked_intake_id": "", "booking_reminder_sent": True,
        "intake_reminder_sent": True, "nurture_email_sent": False,
        "created": _ago(6), "url": "",
    },
    {
        "id": "demo-p09", "client_name": "Elijah Washington", "email": "elijah@boldframefilms.com",
        "phone": "+1-310-555-9012", "payment_amount": 1495, "product_purchased": "3-Session Clarity Sprint",
        "payment_date": _date_ago(3), "status": "Booked - Needs Intake",
        "call_date": _date_ago(-5), "calendly_link": "https://calendly.com/soscreativehotline/call",
        "lead_source": "Referral", "stripe_session_id": "cs_demo_09",
        "linked_intake_id": "", "booking_reminder_sent": True,
        "intake_reminder_sent": False, "nurture_email_sent": False,
        "created": _ago(5), "url": "",
    },
    # Paid - Needs Booking (2)
    {
        "id": "demo-p10", "client_name": "Lucia Ferreira", "email": "lucia@verdecreativo.com",
        "phone": "+1-305-555-0123", "payment_amount": 499, "product_purchased": "First Call",
        "payment_date": _date_ago(2), "status": "Paid - Needs Booking",
        "call_date": "", "calendly_link": "", "lead_source": "Meta Ad",
        "stripe_session_id": "cs_demo_10", "linked_intake_id": "",
        "booking_reminder_sent": False, "intake_reminder_sent": False,
        "nurture_email_sent": False, "created": _ago(2), "url": "",
    },
    {
        "id": "demo-p11", "client_name": "Raj Patel", "email": "raj@neonlabcreative.com",
        "phone": "+1-646-555-1230", "payment_amount": 699, "product_purchased": "Single Call",
        "payment_date": _date_ago(6), "status": "Paid - Needs Booking",
        "call_date": "", "calendly_link": "", "lead_source": "LinkedIn",
        "stripe_session_id": "cs_demo_11", "linked_intake_id": "",
        "booking_reminder_sent": True, "intake_reminder_sent": False,
        "nurture_email_sent": False, "created": _ago(7), "url": "",
    },
    # Lead - Laylo (2)
    {
        "id": "demo-p12", "client_name": "Mia Rossi", "email": "mia@rossiarchive.com",
        "phone": "+1-917-555-2340", "payment_amount": 0, "product_purchased": "",
        "payment_date": "", "status": "Lead - Laylo",
        "call_date": "", "calendly_link": "", "lead_source": "IG Story",
        "stripe_session_id": "", "linked_intake_id": "",
        "booking_reminder_sent": False, "intake_reminder_sent": False,
        "nurture_email_sent": False, "created": _ago(5), "url": "",
    },
    {
        "id": "demo-p13", "client_name": "Jordan Ellis", "email": "jordan@blankcanvasagency.com",
        "phone": "+1-773-555-3450", "payment_amount": 0, "product_purchased": "",
        "payment_date": "", "status": "Lead - Laylo",
        "call_date": "", "calendly_link": "", "lead_source": "IG DM",
        "stripe_session_id": "", "linked_intake_id": "",
        "booking_reminder_sent": False, "intake_reminder_sent": False,
        "nurture_email_sent": True, "created": _ago(10), "url": "",
    },
    # Extra paid clients for richer data
    {
        "id": "demo-p14", "client_name": "Anika Shaw", "email": "anika@copperlightphoto.com",
        "phone": "+1-206-555-4560", "payment_amount": 499, "product_purchased": "First Call",
        "payment_date": _date_ago(30), "status": "Follow-Up Sent", "call_date": _date_ago(24),
        "calendly_link": "", "lead_source": "Direct", "stripe_session_id": "cs_demo_14",
        "linked_intake_id": "demo-i08", "booking_reminder_sent": True,
        "intake_reminder_sent": True, "nurture_email_sent": False,
        "created": _ago(32), "url": "",
    },
    {
        "id": "demo-p15", "client_name": "Oscar Delgado", "email": "oscar@territoriocreativo.com",
        "phone": "+1-512-555-5670", "payment_amount": 499, "product_purchased": "First Call",
        "payment_date": _date_ago(14), "status": "Call Complete", "call_date": _date_ago(7),
        "calendly_link": "", "lead_source": "Website", "stripe_session_id": "cs_demo_15",
        "linked_intake_id": "demo-i09", "booking_reminder_sent": True,
        "intake_reminder_sent": True, "nurture_email_sent": False,
        "created": _ago(16), "url": "",
    },
]

# ── Intake Records ────────────────────────────────────────────────

DEMO_INTAKES = [
    {
        "id": "demo-i01", "client_name": "Sarah Chen", "email": "sarah@studiolumen.com",
        "role": "Creative Director", "brand": "Studio Lumen",
        "website_ig": "https://www.studiolumen.co",
        "creative_emergency": "Rebranding in 3 weeks. Visual identity feels disconnected from our positioning. Team can't agree on direction.",
        "desired_outcome": ["A clear decision", "Direction I can trust"],
        "what_tried": "Hired freelance designer, got 3 concepts, none felt right. Pinterest mood boards. Team input was conflicting.",
        "deadline": "3 weeks — launch March 15",
        "constraints": "Budget locked at $25k. Can't change the name.",
        "intake_status": "Submitted",
        "ai_summary": "Strong upsell candidate — urgent rebrand, team misalignment, budget available for Sprint. Multiple touch points needed.",
        "action_plan_sent": True, "call_date": _date_ago(12),
        "linked_payment_id": "demo-p01", "created": _ago(19), "url": "",
    },
    {
        "id": "demo-i02", "client_name": "Marcus Rivera", "email": "marcus@rivieracollective.co",
        "role": "Founder & CEO", "brand": "Riviera Collective",
        "website_ig": "https://instagram.com/rivieracollective",
        "creative_emergency": "Launching a new product line in 6 weeks. No marketing strategy, no content plan, no creative direction.",
        "desired_outcome": ["A short action plan", "Stronger positioning", "Direction I can trust"],
        "what_tried": "Generic marketing templates. Hired a social media manager but they didn't understand the brand.",
        "deadline": "6 weeks to launch",
        "constraints": "Small team (3 people). $40k total budget for launch.",
        "intake_status": "Submitted",
        "ai_summary": "Ideal Sprint client — product launch, clear deadline, budget allocated. Founder-led, needs strategic direction across multiple channels.",
        "action_plan_sent": True, "call_date": _date_ago(18),
        "linked_payment_id": "demo-p02", "created": _ago(26), "url": "",
    },
    {
        "id": "demo-i03", "client_name": "Priya Kaur", "email": "priya@goldthreadstudio.com",
        "role": "Brand Strategist", "brand": "Goldthread Studio",
        "website_ig": "https://www.goldthreadstudio.com",
        "creative_emergency": "Outgrew our brand. We serve luxury clients now but our visuals still look like a startup.",
        "desired_outcome": ["Stronger positioning", "Someone to tell me the truth"],
        "what_tried": "DIY rebrand with Canva. Got positive feedback but it doesn't feel premium.",
        "deadline": "No hard deadline, but Q2 event coming up",
        "constraints": "Bootstrapped. Budget for design work is limited.",
        "intake_status": "Submitted",
        "ai_summary": "Good candidate for repositioning conversation. Outgrown current brand, luxury market aspirations. May benefit from Sprint after initial call.",
        "action_plan_sent": False, "call_date": _date_ago(3),
        "linked_payment_id": "demo-p03", "created": _ago(11), "url": "",
    },
    {
        "id": "demo-i04", "client_name": "Tyler Brooks", "email": "tyler@ironbarkdesign.com",
        "role": "Marketing Director", "brand": "Ironbark Design",
        "website_ig": "https://instagram.com/ironbarkdesign",
        "creative_emergency": "Content is getting no engagement. Posting 5x/week but follower growth is flat. Need a new strategy.",
        "desired_outcome": ["A short action plan", "Direction I can trust"],
        "what_tried": "Tried trending audio, Reels, carousels. Engagement dropped 40% in 3 months.",
        "deadline": "Want to fix this before our busy season in April",
        "constraints": "One-person marketing team. Can't hire more staff.",
        "intake_status": "Submitted",
        "ai_summary": "Content strategy overhaul needed. Classic case of 'doing everything, nothing working.' Needs focused 90-day plan. Good for Single Call.",
        "action_plan_sent": False, "call_date": _date_ago(2),
        "linked_payment_id": "demo-p04", "created": _ago(9), "url": "",
    },
    {
        "id": "demo-i05", "client_name": "Jenna Morales", "email": "jenna@mosaiccreative.co",
        "role": "Founder", "brand": "Mosaic Creative",
        "website_ig": "https://www.mosaiccreative.co",
        "creative_emergency": "Pivoting from B2C to B2B. Need to completely rethink our brand, messaging, and go-to-market.",
        "desired_outcome": ["A clear decision", "A short action plan", "Stronger positioning"],
        "what_tried": "Read positioning books. Tried to write new messaging ourselves. It all sounds generic.",
        "deadline": "Need the pivot done by end of March",
        "constraints": "Revenue will dip during transition. Need to keep some B2C work while building B2B.",
        "intake_status": "Submitted",
        "ai_summary": "Complex pivot with revenue risk. Multi-session Sprint is ideal — can't solve this in one call. Brand, messaging, GTM all need work.",
        "action_plan_sent": False, "call_date": _date_ago(-1),
        "linked_payment_id": "demo-p05", "created": _ago(8), "url": "",
    },
    {
        "id": "demo-i06", "client_name": "David Kim", "email": "david@halcyonstudios.com",
        "role": "Co-Founder", "brand": "Halcyon Studios",
        "website_ig": "https://www.halcyonstudios.com",
        "creative_emergency": "Our website converts at 0.3%. Industry average is 2-3%. Something is fundamentally wrong with our messaging.",
        "desired_outcome": ["A clear decision", "Someone to tell me the truth"],
        "what_tried": "A/B tested headlines, changed CTA buttons, redesigned hero section. Nothing moved the needle.",
        "deadline": "Running paid ads now — bleeding money every day this isn't fixed",
        "constraints": "Co-founder disagrees on the problem. Need an outside perspective.",
        "intake_status": "Submitted",
        "ai_summary": "Urgent — running ads to a broken funnel. Messaging-market fit issue, not design. High urgency. Strong candidate for immediate action.",
        "action_plan_sent": False, "call_date": _date_ago(-3),
        "linked_payment_id": "demo-p06", "created": _ago(7), "url": "",
    },
    {
        "id": "demo-i07", "client_name": "Amara Osei", "email": "amara@firstandten.co",
        "role": "Content Creator", "brand": "First & Ten",
        "website_ig": "https://instagram.com/firstandten",
        "creative_emergency": "Trying to monetize my audience (45k followers). Don't know whether to do courses, consulting, or products.",
        "desired_outcome": ["A clear decision", "A short action plan"],
        "what_tried": "Started building a course but got overwhelmed. Tried consulting but underpriced it.",
        "deadline": "Want to launch something by end of Q1",
        "constraints": "Solo creator. No team. Limited tech skills.",
        "intake_status": "Submitted",
        "ai_summary": "Creator monetization path — perfect First Call topic. Needs clarity on product-market fit before building anything. Quick win potential.",
        "action_plan_sent": False, "call_date": _date_ago(-4),
        "linked_payment_id": "demo-p07", "created": _ago(6), "url": "",
    },
    {
        "id": "demo-i08", "client_name": "Anika Shaw", "email": "anika@copperlightphoto.com",
        "role": "Photographer & Founder", "brand": "Copperlight Photography",
        "website_ig": "https://www.copperlightphoto.com",
        "creative_emergency": "Shooting weddings but want to break into commercial work. Portfolio doesn't reflect where I want to go.",
        "desired_outcome": ["Stronger positioning", "Direction I can trust"],
        "what_tried": "Did some spec shoots. Updated website. Still getting wedding inquiries only.",
        "deadline": "No hard deadline but I'm burning out on weddings",
        "constraints": "Can't stop wedding revenue immediately. Need a transition plan.",
        "intake_status": "Submitted",
        "ai_summary": "Career pivot within creative field. Needs repositioning + portfolio curation strategy. Good Single Call follow-up opportunity.",
        "action_plan_sent": True, "call_date": _date_ago(24),
        "linked_payment_id": "demo-p14", "created": _ago(31), "url": "",
    },
    {
        "id": "demo-i09", "client_name": "Oscar Delgado", "email": "oscar@territoriocreativo.com",
        "role": "Agency Owner", "brand": "Territorio Creativo",
        "website_ig": "https://instagram.com/territoriocreativo",
        "creative_emergency": "Agency is stuck at $30k/month. Can't scale past 5 clients without burning out. Need systems.",
        "desired_outcome": ["A short action plan", "Someone to tell me the truth"],
        "what_tried": "Hired a VA. Tried project management tools. Problem is the business model, not the tools.",
        "deadline": "Want to hit $50k/month by end of year",
        "constraints": "Team of 4. Don't want to hire more until systems are in place.",
        "intake_status": "Submitted",
        "ai_summary": "Agency scaling bottleneck — classic founder trap. Needs productized service model. Sprint potential if initial call shows fit.",
        "action_plan_sent": False, "call_date": _date_ago(7),
        "linked_payment_id": "demo-p15", "created": _ago(15), "url": "",
    },
]

# ── Revenue Data ──────────────────────────────────────────────────

DEMO_MONTHLY_REVENUE = [
    {"month": _date_ago(150)[:7], "revenue": 1497.00},
    {"month": _date_ago(120)[:7], "revenue": 2695.00},
    {"month": _date_ago(90)[:7], "revenue": 3194.00},
    {"month": _date_ago(60)[:7], "revenue": 4692.00},
    {"month": _date_ago(30)[:7], "revenue": 5889.00},
    {"month": _date_ago(0)[:7], "revenue": 7086.00},
]

DEMO_REVENUE_SUMMARY = {
    "total_revenue": 10475.00,
    "session_count": 13,
    "avg_deal_size": 805.77,
    "by_product": {
        "First Call": {"count": 5, "revenue": 2495},
        "Single Call": {"count": 5, "revenue": 3495},
        "3-Session Clarity Sprint": {"count": 3, "revenue": 4485},
    },
}

DEMO_BOOKING_RATE = {"rate": 84.6, "booked": 11, "cancelled": 1, "total": 13}
DEMO_AVG_TIME_TO_BOOK = 18.5


# ── Helper Functions ──────────────────────────────────────────────

def get_demo_payments() -> list:
    """Return all demo payment records."""
    return list(DEMO_PAYMENTS)


def get_demo_intakes() -> list:
    """Return all demo intake records."""
    return list(DEMO_INTAKES)


def get_demo_merged_clients() -> list:
    """Return merged payment+intake records, joined on email."""
    intake_by_email = {i["email"].lower(): i for i in DEMO_INTAKES}
    merged = []
    for p in DEMO_PAYMENTS:
        email = p.get("email", "").lower()
        merged.append({
            "payment": p,
            "intake": intake_by_email.get(email),
        })
    return merged


def get_demo_pipeline_stats() -> dict:
    """Return count of payments per pipeline status."""
    stats: dict[str, int] = {}
    for p in DEMO_PAYMENTS:
        status = p.get("status", "")
        stats[status] = stats.get(status, 0) + 1
    return stats


def get_demo_revenue_summary(days: int = 30) -> dict:
    """Return demo revenue summary."""
    return dict(DEMO_REVENUE_SUMMARY)


def get_demo_monthly_revenue(months: int = 6) -> list:
    """Return demo monthly revenue data."""
    return list(DEMO_MONTHLY_REVENUE[-months:])


def get_demo_booking_rate(days: int = 30) -> dict:
    """Return demo booking rate data."""
    return dict(DEMO_BOOKING_RATE)


def get_demo_avg_time_to_book() -> float:
    """Return demo average time to book (hours)."""
    return DEMO_AVG_TIME_TO_BOOK


def get_demo_recent_sessions(days: int = 90) -> list:
    """Return demo Stripe sessions derived from payments."""
    sessions = []
    for p in DEMO_PAYMENTS:
        if p["payment_amount"] > 0:
            sessions.append({
                "id": p["stripe_session_id"],
                "email": p["email"],
                "name": p["client_name"],
                "amount": p["payment_amount"],
                "product_name": p["product_purchased"],
                "status": "complete",
                "payment_status": "paid",
                "created": p["created"],
                "metadata": {},
            })
    return sessions


def get_demo_scheduled_events(days_back: int = 30, days_forward: int = 30) -> list:
    """Return demo Calendly events derived from payments with call dates."""
    events = []
    for p in DEMO_PAYMENTS:
        if p.get("call_date"):
            events.append({
                "uuid": f"demo-evt-{p['id']}",
                "uri": f"https://api.calendly.com/scheduled_events/demo-evt-{p['id']}",
                "name": "Creative Hotline Call",
                "status": "active",
                "start_time": p["call_date"] + "T14:00:00.000Z" if len(p["call_date"]) == 10 else p["call_date"],
                "end_time": p["call_date"] + "T14:45:00.000Z" if len(p["call_date"]) == 10 else p["call_date"],
                "created_at": p["created"],
                "location_type": "zoom",
                "event_type": "",
                "invitees_count": 1,
            })
    return events
