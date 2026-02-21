# Laylo Migration Plan — The Creative Hotline

**Date:** 2026-02-21
**Status:** Laylo currently disconnected from Instagram. IG keyword drops non-functional.

---

## What Laylo Was Supposed to Do

Laylo is an IG keyword drop platform. When someone comments or DMs a keyword on Instagram (BOOK, PRICING, HELP), Laylo captures their email/phone and fires a webhook to n8n.

### Intended Flow

```
Instagram post/story with "DM us BOOK"
  → Fan sends "BOOK" via DM
  → Laylo captures email + phone
  → Laylo webhook fires to n8n (WF4)
  → n8n creates Notion record (Status: "Lead - Laylo", Amount: $0)
  → Team notification sent
  → WF7 nurture email fires 3-7 days later
```

### Two Integration Points

**1. Inbound: Laylo → n8n (WF4)**
- Webhook: `POST /webhook/8e422442-519e-4d42-8cb4-372d26b89edc`
- Creates lead record in Payments DB
- Currently active in n8n but never fires (Laylo disconnected from IG)

**2. Outbound: n8n → Laylo (WF1)**
- After Stripe payment, WF1 subscribes the customer to Laylo's list
- Uses Laylo GraphQL API: `POST https://laylo.com/api/graphql`
- Two nodes: SMS subscribe (if phone present) and Email-only subscribe
- Credential: HTTP Header Auth (Laylo)
- Product ID is placeholder: `YOUR_LAYLO_PRODUCT_ID`

---

## What Was Actually Replaced

### Email replaced Laylo messaging

The original WF8 (Calendly → Tally) and WF9 (Post-Call Follow-Up) were built to use **Laylo's messaging API** (`api.laylo.com/v1/messages/send`) instead of SMTP email. Both were non-functional scaffolding and have been deleted.

The current system uses SMTP email for all customer communication:
- WF1: Calendly link email (from jake@radanimal.co — should be hello@)
- WF5: Booking reminder
- WF6: Intake reminder
- WF7: Lead nurture email

### ManyChat replaced Laylo for IG capture (partially)

ManyChat Pro ($44/mo) now handles Instagram DM automation:
- AI replies to DMs using Knowledge Base
- Two AI Goals: Share Booking Link, Capture Email
- Four live automations: Welcome DM, Comment-to-DM, Story Mention Reply, Ice Breaker Menu

**But ManyChat is NOT connected to n8n.** Captured emails stay in ManyChat and don't flow to the CRM. See [manychat-n8n-integration.md](manychat-n8n-integration.md) for the integration spec.

---

## Current State of Laylo Code in n8n

### WF4: Laylo Subscriber → Notion (Active, never fires)

| Issue | Detail |
|-------|--------|
| Disconnected | Laylo is not connected to Instagram — no webhooks fire |
| Product Purchased type mismatch | Mapped as `rich_text`, Notion type is `select` |
| Phone number lost | Extracted but `phoneValue` not mapped in Notion node |
| Client Name blank | Laylo doesn't provide name, no fallback to email prefix |
| Lead Source not set | Should be "IG DM" |
| No duplicate guard | Repeated keywords create duplicate records |

### WF1: Laylo Subscribe nodes (Active, likely failing silently)

| Issue | Detail |
|-------|--------|
| Placeholder product ID | `YOUR_LAYLO_PRODUCT_ID` — never configured |
| Error handling masks failures | `continueRegularOutput` means Laylo failures don't block the Calendly email |
| Unknown credential state | HTTP Header Auth (Laylo) — API key may be expired or never set |

### WF7: Lead Nurture (Active, no Laylo leads to nurture)

Filters for `Status === "Lead - Laylo"` and `3-7 days old`. Since no Laylo leads are being created, this workflow runs daily and always finds zero matches. Harmless but wasteful.

---

## Migration Options

### Option A: Fix Laylo Integration (Reconnect to Instagram)

**Effort:** Low (if Laylo account is still active)
**Cost:** Laylo subscription (pricing varies)

Steps:
1. Log into Laylo dashboard
2. Reconnect Instagram account (@creative.hotline)
3. Re-register keywords: BOOK, PRICING, HELP
4. Verify webhook URL is still set to `https://creativehotline.app.n8n.cloud/webhook/8e422442-519e-4d42-8cb4-372d26b89edc`
5. Fix WF4 bugs:
   - `Product Purchased|rich_text` → `Product Purchased|select` (value: "First Call" or leave empty)
   - `phoneValue: ""` → `phoneValue: "={{ $json.phone }}"`
   - `title: ""` → `title: "={{ $json.email.split('@')[0] }}"` (fallback to email prefix)
   - Add `Lead Source|select` = "IG DM"
   - Add duplicate check: query Payments DB by email before creating
6. Fix WF1 Laylo Subscribe nodes:
   - Replace `YOUR_LAYLO_PRODUCT_ID` with actual Laylo product ID
   - Verify HTTP Header Auth credential has valid API key
7. Test with a real IG DM keyword
8. If using free trial offer: add TCHTRIAL keyword with custom response

**When to choose this:** If Laylo's keyword drop UX is better than ManyChat's for your use case, and you want both platforms handling different IG interactions.

### Option B: Replace Laylo with ManyChat → n8n (Recommended)

**Effort:** Medium (new n8n workflow + ManyChat config)
**Cost:** $0 additional (ManyChat Pro already paid, n8n webhook is free)

Steps:
1. **Build ManyChat → n8n webhook workflow** (spec in [manychat-n8n-integration.md](manychat-n8n-integration.md)):
   - Webhook: `POST /webhook/manychat-lead`
   - Extract: email, name, ig_handle, source
   - Dedup check against Payments DB
   - Create record: Status = "Lead - IG DM", Lead Source = "IG DM"
   - Team notification
2. **Configure ManyChat External Request:**
   - After "Capture Email" AI Goal fires
   - POST to n8n webhook with subscriber data
3. **Rename "Lead - Laylo" status** to "Lead - IG DM" in Notion (or add new option)
4. **Update WF7 filter** to match new status value
5. **Deactivate WF4** (Laylo webhook)
6. **Remove WF1 Laylo Subscribe nodes** (nodes 5 + 6) — they add no value without Laylo
7. **Test end-to-end:** DM keyword on IG → ManyChat captures email → n8n creates Notion record → WF7 nurture fires 3 days later

**When to choose this:** If ManyChat is already handling IG DMs well and you want to consolidate tools. This eliminates Laylo as a dependency entirely.

### Option C: Run Both (Laylo for Keywords, ManyChat for Conversations)

**Effort:** High
**Cost:** Laylo subscription + ManyChat Pro

Steps:
1. Fix Laylo (Option A steps 1-7)
2. Build ManyChat → n8n (Option B steps 1-3)
3. Ensure dedup works across both sources (query by email before any create)
4. Both create records with `Lead Source` set appropriately

**When to choose this:** If you want keyword drops (Laylo) AND AI conversations (ManyChat) feeding into the CRM. Only worth it if both platforms serve distinct purposes.

---

## Recommended Path: Option B

ManyChat is already paid ($44/mo), already connected to Instagram, already handling DMs with AI, and already capturing emails. The only missing piece is the ManyChat → n8n webhook connection.

### Implementation Checklist

| Step | Action | Workflow |
|------|--------|----------|
| 1 | Build ManyChat Lead Capture workflow in n8n | New workflow |
| 2 | Configure ManyChat External Request | ManyChat UI |
| 3 | Add "Lead - IG DM" status option to Payments DB | Notion |
| 4 | Update WF7 filter: `Lead - Laylo` → include `Lead - IG DM` | WF7 |
| 5 | Test with real IG DM | Manual |
| 6 | Deactivate WF4 (Laylo webhook) | n8n |
| 7 | Remove Laylo Subscribe nodes from WF1 | n8n |
| 8 | Cancel Laylo subscription (if paid) | Laylo |

### Active Workflow Impact

Deactivating WF4 reduces active workflows from 7 to 6. Adding the ManyChat workflow brings it back to 7. This is still over the Starter plan limit of 5, reinforcing the need to consolidate WF5+WF6+WF7 (see [workflow-consolidation-spec.md](specs/workflow-consolidation-spec.md)).

---

## Free Trial Code: TCHTRIAL

If restoring Laylo or building a similar keyword-triggered offer:

| Keyword | Response | CTA |
|---------|----------|-----|
| TCHTRIAL | "Hey! Frankie here. Grab your free 15-minute clarity call — no strings, no pitch." | Link to dedicated Calendly event (15-min, no payment gate) |

This would require:
- New Calendly event type (15-min, free)
- New Stripe product (or bypass payment entirely for trial)
- New Notion status: "Lead - Trial" or tag on existing lead record
- Modified WF1 path for $0 payments (or separate trial workflow)

**Recommendation:** Build this as a ManyChat automation first (no n8n needed). ManyChat can respond to the TCHTRIAL keyword and share the free Calendly link directly. Only connect to n8n if you need CRM tracking of trial leads.

---

## Cleanup Tasks

Once migration path is chosen:

| Task | If Option A | If Option B |
|------|------------|------------|
| Fix WF4 bugs | Yes | No (deactivate) |
| Fix WF1 Laylo nodes | Yes (product ID + credential) | Remove nodes entirely |
| Rename Lead - Laylo status | No | Yes → Lead - IG DM |
| Update WF7 filter | No | Yes (new status) |
| Cancel Laylo subscription | No | Yes |
| Build ManyChat webhook | No | Yes |
| Configure ManyChat External Request | No | Yes |
