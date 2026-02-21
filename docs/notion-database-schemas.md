# Notion Database Schemas — The Creative Hotline

**Date:** 2026-02-21
**Verified via:** Notion MCP (`notion-fetch`) + n8n workflow backup cross-reference
**Space ID:** `0f4e4f76-f116-4626-a1b9-9d4e980c97b3`

---

## Payments Database (Master CRM)

**Database ID:** `3030e73ffadc80bcb9dde15f51a9caf2`
**Hyphenated:** `3030e73f-fadc-80bc-b9dd-e15f51a9caf2`
**Purpose:** Every customer and lead gets a record here. This is the pipeline source of truth.

### Properties

| Property | Type | Options / Notes | Written By | Read By |
|----------|------|-----------------|-----------|---------|
| Client Name | `title` | — | WF1, WF4 | WF5, WF6, WF7 |
| Email | `email` | — | WF1, WF4 | WF2, WF3, WF5, WF6, WF7 |
| Phone | `phone_number` | — | WF1 | — |
| Payment Amount | `number` (dollar format) | — | WF1, WF4 (sets 0) | — |
| Product Purchased | `select` | "First Call", "Standard Call", "3-Pack Sprint", "3-Session Clarity Sprint" | WF1 (null bug), WF4 (type mismatch) | — |
| Payment Date | `date` | — | WF1 | WF5 |
| Stripe Session ID | `rich_text` | — | WF1 | — |
| Status | `select` | See pipeline statuses below | WF1, WF2, WF3, WF4 | WF5, WF6, WF7 |
| Call Date | `date` | — | WF2 | WF6 |
| Calendly Link | `url` | — | WF2 | — |
| Linked Intake | `relation` → Intake DB | Bidirectional | WF3 | — |
| Lead Source | `select` | "IG DM", "IG Comment", "IG Story", "Meta Ad", "LinkedIn", "Website", "Referral", "Direct" | Not set by any workflow | — |
| Days to Convert | `formula` | Computed from Created → Payment Date | — | — |
| Created | `created_time` | Auto-set by Notion | — | WF7 |
| Booking Reminder Sent | `checkbox` | Dedup flag for WF5 | Not yet (node missing) | WF5 (filter) |
| Intake Reminder Sent | `checkbox` | Dedup flag for WF6 | Not yet (node missing) | WF6 (filter) |
| Nurture Email Sent | `checkbox` | Dedup flag for WF7 | Not yet (node missing) | Not yet (filter missing) |
| Thank You Sent | `checkbox` | Dedup flag for WF9 (future) | Not yet | Not yet |

### Pipeline Statuses (in lifecycle order)

| Status | Set By | Meaning |
|--------|--------|---------|
| `Lead - Laylo` | WF4 | Signed up via Instagram keyword, hasn't paid |
| `Paid - Needs Booking` | WF1 | Payment received, Calendly link sent, waiting for booking |
| `Booked - Needs Intake` | WF2 | Call booked, waiting for intake form submission |
| `Intake Complete` | WF3 | All prep done, ready for call |
| `Ready for Call` | Manual | Intake reviewed, call is imminent |
| `Call Complete` | Manual | Call finished, action plan pending or delivered |
| `Follow-Up Sent` | WF9 (future) | Post-call follow-up delivered |

### Known Issues

| Issue | Detail | Fix |
|-------|--------|-----|
| Product Purchased always null (WF1) | Stripe webhook doesn't include `line_items` | Use metadata or amount-based mapping |
| Product Purchased type mismatch (WF4) | WF4 maps as `rich_text`, Notion expects `select` | Change to `select` type in node |
| Phone not written (WF4) | Phone extracted but `phoneValue` is empty | Map `phoneValue` to `={{ $json.phone }}` |
| Client Name blank (WF4) | Laylo doesn't provide name | Fallback to email prefix |
| Lead Source never set | No workflow sets this field | Add to WF1 ("Direct") and WF4 ("IG DM") |

---

## Intake Database

**Database ID:** `2f60e73ffadc806bbf5ddca2f5c256a3`
**Hyphenated:** `2f60e73f-fadc-806b-bf5d-dca2f5c256a3`
**Data Source (Collection) ID:** `2f60e73f-fadc-80fb-beb5-000bdddbc915`
**Purpose:** Pre-call questionnaire responses + AI analysis.

### Properties

| Property | Type | Options / Notes | Written By |
|----------|------|-----------------|-----------|
| Client Name | `title` | — | WF3 |
| Email | `email` | — | WF3 |
| Role | `rich_text` | **Not** select (WF3 maps wrong) | WF3 (type mismatch) |
| Brand | `rich_text` | — | WF3 |
| Website / IG | `url` | — | WF3 |
| Creative Emergency | `rich_text` | — | WF3 |
| Desired Outcome | `multi_select` | "A clear decision", "Direction I can trust", "A short action plan", "Stronger positioning", "Someone to tell me the truth" | WF3 (type mismatch — maps as select) |
| What They've Tried | `rich_text` | — | WF3 |
| Deadline | `rich_text` | — | WF3 |
| Constraints / Avoid | `rich_text` | — | WF3 |
| Intake Status | `select` | "Not Started", "Submitted" | WF3 |
| AI Intake Summary | `rich_text` | Claude AI analysis output | WF3 |
| Action Plan Sent | `checkbox` | Set manually after plan delivered | Manual (WF9 future) |
| Call Date | `date` | — | Not set by any workflow |
| Linked Payment | `relation` → Payments DB | Bidirectional | WF3 |

### Known Issues

| Issue | Detail | Fix |
|-------|--------|-----|
| Role type mismatch | WF3 maps as `select`, Notion type is `rich_text` | Change node key to `Role\|rich_text` |
| Desired Outcome type mismatch | WF3 maps as `select`, Notion type is `multi_select` | Change node key to `Desired Outcome\|multiSelect` |
| Call Date never set | No workflow populates this | Consider copying from Payments DB via WF3 |

---

## Relations

```
Payments DB                        Intake DB
┌──────────────────┐              ┌──────────────────┐
│                  │  Linked      │                  │
│  Linked Intake ──┼──────────────┼── Linked Payment │
│  (relation)      │  Intake      │  (relation)      │
│                  │              │                  │
└──────────────────┘              └──────────────────┘
```

- **Bidirectional:** Changes on either side are reflected
- **Set by:** WF3 (Link Intake & Update Status node)
- **Lookup flow:** WF3 creates Intake record → finds Payment by email → sets `Linked Intake` on Payment record, which auto-populates `Linked Payment` on Intake record

---

## Key Pages

| Page | ID | Purpose |
|------|----|---------|
| Launch Page (parent) | `2bab6814-bb03-8022-9be4-fcaf7b2f2351` | Container for launch-related pages |
| Strategic Playbook | `b9fce2c8-eb1d-4407-8db2-58d0a87eaf39` | Business strategy doc |

---

## Dedup Checkbox Summary

| Checkbox | Database | Purpose | Filter Wired | Mark Sent Node |
|----------|----------|---------|-------------|----------------|
| Booking Reminder Sent | Payments | Prevents repeat WF5 emails | Yes | No |
| Intake Reminder Sent | Payments | Prevents repeat WF6 emails | Yes | No |
| Nurture Email Sent | Payments | Prevents repeat WF7 emails | No | No |
| Thank You Sent | Payments | Prevents repeat WF9 emails | N/A (WF9 not built) | N/A |
| Action Plan Sent | Intake | Tracks action plan delivery | N/A | N/A |
