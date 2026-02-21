# Tech Stack Integration Map — The Creative Hotline

**Date:** 2026-02-21
**Purpose:** Shows how every tool connects, what data flows between them, and which n8n workflows handle each integration.

---

## System Architecture

```
                    ┌─────────────┐
                    │  Instagram  │
                    │ @creative.  │
                    │  hotline    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │ ManyChat │ │  Laylo   │ │ Webflow  │
       │ (DM AI)  │ │(Keywords)│ │(Website) │
       └──────────┘ └────┬─────┘ └────┬─────┘
              │           │            │
              │      webhook       visitor
              │           │            │
              │           ▼            ▼
              │    ┌────────────┐  ┌────────┐
              │    │    n8n     │  │ Stripe │
              │    │  (WF4)    │  │Payment │
              │    └─────┬──────┘  └───┬────┘
              │          │         webhook
              │          │             │
              │          ▼             ▼
              │    ┌───────────────────────┐
              │    │         n8n           │
              │    │  Workflow Engine      │
              │    │  (7 active flows)     │
              │    └──┬───┬───┬───┬───┬───┘
              │       │   │   │   │   │
              │       ▼   ▼   ▼   ▼   ▼
              │    ┌─────────────────────┐
              │    │    Notion CRM       │
              │    │ (Payments + Intake) │
              │    └─────────────────────┘
              │       │           │
              │       ▼           ▼
              │    ┌─────────┐ ┌───────────┐
              │    │Calendly │ │ Claude AI │
              │    │(Booking)│ │(Analysis) │
              │    └────┬────┘ └───────────┘
              │         │
              │    webhook
              │         │
              │         ▼
              │    ┌──────────┐
              │    │   n8n    │
              │    │  (WF2)   │
              │    └────┬─────┘
              │         │
              │         ▼
              │    ┌──────────┐
              └───►│  Tally   │
                   │ (Intake) │
                   └────┬─────┘
                        │
                   webhook
                        │
                        ▼
                   ┌──────────┐
                   │   n8n    │
                   │  (WF3)   │
                   └──────────┘
```

---

## Tool-by-Tool Integration Detail

### 1. Stripe → n8n

| Direction | Data | Mechanism | n8n Workflow |
|-----------|------|-----------|-------------|
| Stripe → n8n | `checkout.session.completed` event (name, email, phone, amount, session ID) | Webhook POST to `/webhook/stripe-checkout` | WF1 |

**Products:** First Call ($499), Standard Call ($699), 3-Session Clarity Sprint ($1,495)
**Issue:** `line_items` not included in webhook payload — product name always null.

### 2. n8n → Notion

| Direction | Data | Operation | n8n Workflow |
|-----------|------|-----------|-------------|
| n8n → Payments DB | New payment record (name, email, phone, amount, status, payment date) | Create page | WF1 |
| n8n → Payments DB | Update status to "Booked - Needs Intake" + call date + Calendly link | Update page | WF2 |
| n8n → Payments DB | Link intake record + update status to "Intake Complete" | Update page | WF3 |
| n8n → Payments DB | New lead record (email, status "Lead - Laylo") | Create page | WF4 |
| n8n ← Payments DB | Get all records for follow-up filtering | Get all pages | WF5, WF6, WF7 |
| n8n → Intake DB | New intake record (all form fields) | Create page | WF3 |
| n8n → Intake DB | AI summary update | Update page | WF3 |

### 3. Calendly → n8n

| Direction | Data | Mechanism | n8n Workflow |
|-----------|------|-----------|-------------|
| Calendly → n8n | `invitee.created` event (email, name, start_time, event URI) | Webhook POST to `/webhook/calendly-payments-update` | WF2 |

**Booking page:** `calendly.com/soscreativehotline/creative-hotline-call` (45-min call, $499 payment gate)

### 4. Tally → n8n

| Direction | Data | Mechanism | n8n Workflow |
|-----------|------|-----------|-------------|
| Tally → n8n | Form submission (name, email, role, brand, website, creative emergency, desired outcome, what tried, deadline, constraints) | Webhook POST to `/webhook/tally-intake` | WF3 |

**Form:** `tally.so/r/b5W1JE`

### 5. Laylo → n8n

| Direction | Data | Mechanism | n8n Workflow |
|-----------|------|-----------|-------------|
| Laylo → n8n | Subscriber data (email, phone, product ID) | Webhook POST to `/webhook/8e422442-...` | WF4 |
| n8n → Laylo | Subscribe user (SMS or email) | HTTP POST to `laylo.com/api/graphql` | WF1 |

**IG Keywords:** BOOK, PRICING, HELP
**Issue:** Laylo currently disconnected from Instagram — keywords won't fire.

### 6. n8n → Claude API

| Direction | Data | Mechanism | n8n Workflow |
|-----------|------|-----------|-------------|
| n8n → Claude | Intake form data (all fields as prompt context) | HTTP POST to `api.anthropic.com/v1/messages` | WF3 |
| Claude → n8n | AI summary + upsell detection boolean | JSON response | WF3 |

**Model:** `claude-sonnet-4-5-20250929`, max 1024 tokens
**Issue:** API key hardcoded in HTTP headers (should be n8n credential)

### 7. n8n → SMTP (Email)

| Direction | Data | Mechanism | n8n Workflow |
|-----------|------|-----------|-------------|
| n8n → Customer | Calendly link email | SMTP (`hello@creativehotline.com`) | WF1 |
| n8n → Customer | Booking reminder | SMTP (`hello@creativehotline.com`) | WF5 |
| n8n → Customer | Intake reminder | SMTP (`hello@creativehotline.com`) | WF6 |
| n8n → Customer | Lead nurture | SMTP (`hello@creativehotline.com`) | WF7 |
| n8n → Team | Payment/booking/intake/subscriber/follow-up alerts | SMTP (`notifications@creativehotline.com`) | All |

### 8. ManyChat (Standalone)

| Direction | Data | Mechanism | n8n Workflow |
|-----------|------|-----------|-------------|
| IG → ManyChat | DMs, comments, story mentions | Instagram API | None |
| ManyChat → User | AI responses, booking link, email capture | ManyChat AI + flows | None |

**Not connected to n8n.** ManyChat operates independently — shares Calendly booking link and captures emails via AI goals, but does not feed data into Notion or trigger any n8n workflows.

### 9. Webflow (Standalone)

| Direction | Data | Mechanism | n8n Workflow |
|-----------|------|-----------|-------------|
| Website → Visitor | Marketing pages, pricing, CTAs | Webflow hosting | None |
| Contact form → ? | Form submissions | Webflow Forms (dead end) | None |

**Not connected to n8n.** Contact form submissions go to Webflow's built-in form storage and are not piped anywhere. This is a known gap.

---

## Data Flow per Customer Stage

### Stage 1: Discovery → Lead
```
Instagram DM → ManyChat (AI response) → Laylo keyword → WF4 → Notion (Lead - Laylo)
Website visit → Stripe payment → WF1 → Notion (Paid - Needs Booking)
```

### Stage 2: Payment → Booking
```
Stripe webhook → WF1 → Notion record + Laylo subscribe + Calendly link email
(48hrs pass) → WF5 daily check → Booking reminder email
```

### Stage 3: Booking → Intake
```
Calendly webhook → WF2 → Notion update (Booked - Needs Intake)
(24hrs before call) → WF6 daily check → Intake reminder email
```

### Stage 4: Intake → Call
```
Tally webhook → WF3 → Notion intake record + Claude AI analysis + team briefing
```

### Stage 5: Lead Nurture (Laylo path)
```
(3-7 days after signup) → WF7 daily check → Nurture email to lead
```

---

## Integration Health Status

| Integration | Direction | Status | Blocker |
|-------------|-----------|--------|---------|
| Stripe → n8n | Inbound | GREEN | Product name null (cosmetic) |
| Calendly → n8n | Inbound | GREEN | — |
| Tally → n8n | Inbound | GREEN | — |
| Laylo → n8n | Inbound | RED | Laylo disconnected from IG |
| n8n → Laylo | Outbound | YELLOW | Placeholder product ID |
| n8n → Notion | Bidirectional | GREEN | Type mismatches (WF3, WF4) |
| n8n → Claude API | Outbound | GREEN | API key hardcoded |
| n8n → SMTP | Outbound | GREEN | hello@ has no MX records |
| ManyChat → n8n | None | N/A | Not integrated |
| Webflow → n8n | None | N/A | Contact form dead end |

---

## Webhook URL Reference

| Source | Destination | URL |
|--------|-------------|-----|
| Stripe | WF1 | `https://creativehotline.app.n8n.cloud/webhook/stripe-checkout` |
| Calendly | WF2 | `https://creativehotline.app.n8n.cloud/webhook/calendly-payments-update` |
| Tally | WF3 | `https://creativehotline.app.n8n.cloud/webhook/tally-intake` |
| Laylo | WF4 | `https://creativehotline.app.n8n.cloud/webhook/8e422442-519e-4d42-8cb4-372d26b89edc` |
