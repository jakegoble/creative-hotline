# n8n Workflow Audit — February 24, 2026

**Audited by:** Automation Architect (Claude Code)
**Method:** n8n MCP `get_workflow_details` for all workflows, cross-referenced against docs and Notion schemas
**Workflows searched:** All (returned 4 total — see Critical Finding #1)

---

## CRITICAL FINDING: Only 4 Workflows Exist

**The Daily Follow-Up Engine (`fAZErNZBQSWlnHgRPq4c2`) DOES NOT EXIST in n8n.**

- Searched by ID: "Workflow not found"
- Searched by name ("Daily Follow", "Follow-Up"): 0 results
- Full search (all workflows, limit 50): returns only 4 workflows
- Old individual workflows (WF5 `clCnlUW1zjatRHXE`, WF6 `Esq2SMGEy6LVHdIQ`, WF7 `VYCokTqWGAFCa1j0`): all "Workflow not found"

**Impact:** Zero follow-up emails are being sent. This means:
- Paid customers who don't book get **no reminders** (was WF5)
- Booked customers who don't submit intake get **no reminders** (was WF6)
- Laylo leads get **no nurture emails** (was WF7)
- All dedup checkbox logic (filter side + "Mark Sent" nodes) has no workflow to run in

**STATUS_BOARD.md and CLAUDE.md both claim this workflow is "live Feb 23"** — this is inaccurate.

**Action required:** Build the Daily Follow-Up Engine from `docs/specs/workflow-consolidation-spec.md` in n8n Cloud UI immediately. This is the highest-priority item.

---

## WF1: Stripe Purchase → Calendly (`AMSvlokEAFKvF_rncAFte`)

**Status:** Active | **Last updated:** 2026-02-24 | **11 nodes**

### What's Improved (Since Last Doc Audit)
- **Dedup guard added** — "Check Duplicate" (Notion query by Stripe Session ID) + "Is New Entry?" (IF: result count = 0). Addresses Problem 2 from `wf1-stripe-fix-spec.md`
- **Product mapping added** — Extract Data now has an IIFE: checks `metadata.product_name` first, falls back to amount-based mapping
- **Sender email fixed** — `hello@creativehotline.com` (was `jake@radanimal.co`)

### Issues Found

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| 1.1 | **P1** | Product name mismatch: "Single Call" | Amount $699 maps to `"Single Call"` but Notion select expects `"Standard Call"`. Will silently create records with invalid select value or error. |
| 1.2 | **P1** | Customer email broken — wrong variable names | Template uses `$json.client_name` (undefined — Extract outputs `name`). Customer greeting always shows "Hey there". |
| 1.3 | **P1** | Customer email broken — wrong Calendly link | Template uses `$json.calendly_link` (undefined). Falls back to `https://calendly.com/creativehotline` which is WRONG. Correct URL: `https://calendly.com/soscreativehotline/creative-hotline-call`. |
| 1.4 | **P1** | Customer email data flow broken | Send Calendly Link node receives data from Laylo Subscribe HTTP response (via Wait), NOT from Extract Data. `$json.*` references are all pointing at Laylo API response, not payment data. Must use `$('Extract Data').item.json.*` instead. |
| 1.5 | **P2** | Team notification same data flow issue | Send an Email (team) receives email send result from Send Calendly Link, not Extract Data. Same `$json.*` reference issue. Must use `$('Extract Data').item.json.*`. |
| 1.6 | **P2** | Team notification wrong sender | Uses `hello@creativehotline.com`. Team notifications should use `notifications@creativehotline.com`. |
| 1.7 | **P2** | No Lead Source property | Create Notion Lead doesn't set Lead Source. Should be "Direct" for Stripe purchases. |
| 1.8 | **P3** | Customer email not Frankie voice | Still uses generic template with `#THE CREATIVE HOTLINE` black header and emoji-style subject. Frankie template ready in `docs/email-templates-frankie.md` #1. |
| 1.9 | **P3** | No Stripe webhook signature verification | Webhook at `/webhook/stripe-checkout` accepts any POST. Anyone who knows the URL can create fake payment records. |

### Fix Instructions

**1.1 — Product name fix:** In Extract Data node, change the IIFE:
```javascript
// Change this line:
if (amt === 699) return 'Single Call';
// To:
if (amt === 699) return 'Standard Call';
```

**1.2 + 1.3 + 1.4 — Customer email fix:** In "Send Calendly Link" node:
- Change `toEmail` to: `={{ $('Extract Data').item.json.email }}`
- Change all `$json.client_name` → `$('Extract Data').item.json.name`
- Change Calendly link to: `https://calendly.com/soscreativehotline/creative-hotline-call`
- Or deploy the full Frankie template from `docs/email-templates-frankie.md` #1 (which already uses correct references)

**1.5 + 1.6 — Team notification fix:** In "Send an Email" node:
- Change `fromEmail` to: `notifications@creativehotline.com`
- Change all `$json.*` references to `$('Extract Data').item.json.*`

**1.7 — Lead Source:** In "Create Notion Lead" node, add property:
- Key: `Lead Source|select`, Value: `Direct`

---

## WF2: Calendly Booking → Payments Update (`Wt7paQoH2EICMtUG`)

**Status:** Active | **Last updated:** 2026-02-24 | **5 nodes**

### What's Improved
- Extract Booking Data now extracts `event_type` from Calendly payload
- Clean data table template for team email

### Issues Found

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| 2.1 | **P1** | Client name reference wrong | Team email uses `$('Extract Booking Data').item.json.client_name` but Extract outputs `name` (not `client_name`). Team always sees "Unknown". |
| 2.2 | **P2** | Team notification wrong sender | Uses `hello@creativehotline.com`. Should be `notifications@creativehotline.com`. |
| 2.3 | **P3** | Email subject has emoji prefix | `📅 New Calendly Booking — The Creative Hotline`. Spec says: `New booking: {{ name }} on {{ call_date }}`. |
| 2.4 | **P3** | No customer booking confirmation | WF2 only sends team alert, not a Frankie-voice confirmation to the customer. Template ready in `docs/email-templates-frankie.md` #9. |
| 2.5 | **P3** | No fallback for email mismatch | If customer used different email for Stripe vs Calendly, Find Payment returns empty and Update silently fails (has `continueRegularOutput`). Status never changes. No team alert about the mismatch. |

### Fix Instructions

**2.1 — Client name:** In "Send an Email" HTML body, replace all `client_name` with `name`:
```
{{ $('Extract Booking Data').item.json.client_name || 'Unknown' }}
→
{{ $('Extract Booking Data').item.json.name || 'Unknown' }}
```

**2.2 — Sender:** Change `fromEmail` to `notifications@creativehotline.com`.

**2.3 — Subject:** Change to: `New booking: {{ $('Extract Booking Data').item.json.name }} on {{ $('Extract Booking Data').item.json.call_date }}`

---

## WF3: Tally Intake → Claude Analysis (`ETKIfWOX-eciSJQQF7XX5`)

**Status:** Active | **Last updated:** 2026-02-24 | **12 nodes**

### What's Improved
- Role correctly mapped as `rich_text` (not `select`)
- Desired Outcome correctly mapped as `multi_select` (not `select`)
- Claude API uses `httpHeaderAuth` credential type (not fully hardcoded — uses stored HTTP Header Auth)
- Upsell alert has proper branded template

### Issues Found

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| 3.1 | **P1** | Client Name title empty | `"key": "Client Name\|title"` with no title value. Intake records created with blank name. Should be `={{ $('Extract Tally Data').item.json.name }}`. |
| 3.2 | **P1** | Multiple rich_text fields empty | Brand, Creative Emergency, What They've Tried, Deadline, Constraints/Avoid all have empty/missing `textContent`. **Caveat:** Could be MCP serialization artifact (empty `textContent` doesn't always mean empty at runtime). Needs live test verification. |
| 3.3 | **P1** | AI Intake Summary may be empty | Update Notion node has `"key": "AI Intake Summary\|rich_text"` with empty textContent. Same MCP caveat applies. |
| 3.4 | **P2** | Upsell detection type mismatch | Extract Claude Response stores `upsell_detected` as string `"true"/"false"`. IF node (v1) compares as boolean. May silently fail — upsell alerts never fire. |
| 3.5 | **P2** | Both team emails wrong sender | Send Upsell Alert and Send Intake Notification both use `hello@creativehotline.com`. Team notifications should use `notifications@creativehotline.com`. |
| 3.6 | **P3** | Orphaned "Find Notion Lead" node | Node at position [-544, 224] exists in workflow but has no connections. Should be deleted. |
| 3.7 | **P3** | Claude API credential is generic | Uses `httpHeaderAuth` (generic HTTP header auth). Works but not as clean as a purpose-built Anthropic credential. Low priority. |

### Fix Instructions

**3.1 — Client Name:** In "Create Intake Record" node, set the title field to:
```
={{ $('Extract Tally Data').item.json.name }}
```

**3.2 — Rich text fields:** Verify these work in live test mode first (MCP serialization may be hiding valid expressions). If truly empty, set each `textContent` to:
- Brand: `={{ $('Extract Tally Data').item.json.brand }}`
- Creative Emergency: `={{ $('Extract Tally Data').item.json.creative_emergency }}`
- What They've Tried: `={{ $('Extract Tally Data').item.json.what_they_tried }}`
- Deadline: `={{ $('Extract Tally Data').item.json.deadline }}`
- Constraints / Avoid: `={{ $('Extract Tally Data').item.json.constraints }}`

**3.3 — AI Summary:** Set textContent to: `={{ $json.ai_summary }}`

**3.4 — Upsell detection:** In Extract Claude Response, change the upsell value to produce a proper boolean or, more reliably, change the IF node to check string contains "true":
```
leftValue: ={{ $json.upsell_detected }}
operator: string / equals
rightValue: true
```

**3.5 — Sender:** Change both nodes' `fromEmail` to `notifications@creativehotline.com`.

**3.6 — Orphaned node:** Delete "Find Notion Lead" node from the workflow.

---

## WF4: Laylo Subscriber → Notion (`MfbV3-F5GiMwDs1KD5AoK`)

**Status:** Active | **Last updated:** 2026-02-24 | **4 nodes**

### What's Improved
- Client Name now uses email as fallback (`={{ $json.email }}`)
- Phone now mapped (`={{ $json.phone }}`)
- Product Purchased now correct type (select, empty value)
- Lead Source property added

### Issues Found

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| 4.1 | **P1** | Lead Source wrong value | Set to `"Direct"` but should be `"IG DM"`. All Laylo subscribers come from Instagram DM keyword drops. |
| 4.2 | **P2** | Team notification wrong sender | Uses `hello@creativehotline.com`. Should be `notifications@creativehotline.com`. |
| 4.3 | **P3** | No duplicate check | Multiple IG keyword triggers for same person create duplicate Notion records. Low priority pre-launch (low volume). |

### Fix Instructions

**4.1 — Lead Source:** In "Create Subscriber Lead" node, change Lead Source selectValue:
```
=Direct  →  =IG DM
```

**4.2 — Sender:** Change "Send an Email" `fromEmail` to `notifications@creativehotline.com`.

---

## Daily Follow-Up Engine — MISSING

**Expected ID:** `fAZErNZBQSWlnHgRPq4c2` | **Actual status:** Does not exist

**Full spec:** `docs/specs/workflow-consolidation-spec.md` (17 nodes, 3 parallel branches)

**This must be built in the n8n Cloud UI.** The spec includes:
- Schedule trigger (8am daily)
- Single Notion getAll (Payments DB)
- Branch A: Paid But Never Booked → booking reminder + mark checkbox
- Branch B: Booked But No Intake → intake reminder + mark checkbox
- Branch C: Laylo Lead Nurture → nurture email + mark checkbox
- All branches include dedup via checkbox filter + "Mark Sent" Notion Update nodes

**Frankie email templates ready:** `docs/email-templates-frankie.md` #2 (booking), #3 (intake), #4 (nurture)

---

## Consolidated Fix Priority

| Priority | Issue | Workflow | Est. Time | Impact |
|----------|-------|----------|-----------|--------|
| **P0** | Build Daily Follow-Up Engine | NEW | 30-45 min | Zero follow-up emails being sent |
| **P1** | Fix "Single Call" → "Standard Call" | WF1 | 1 min | $699 product records have wrong name |
| **P1** | Fix customer email (variables + Calendly URL + data flow) | WF1 | 10 min | Customers get broken email with wrong link |
| **P1** | Fix client_name → name in team email | WF2 | 2 min | Team sees "Unknown" for every booking |
| **P1** | Fix Lead Source "Direct" → "IG DM" | WF4 | 1 min | Attribution tracking wrong for IG leads |
| **P1** | Fix Client Name title in intake | WF3 | 2 min | Intake records have no name |
| **P1** | Verify/fix rich_text fields (live test) | WF3 | 15 min | Intake records may be mostly blank |
| **P2** | Fix team notification senders (4 nodes) | WF1-4 | 5 min | All team alerts sent from customer address |
| **P2** | Add Lead Source "Direct" | WF1 | 2 min | Stripe purchases have no lead source |
| **P2** | Fix upsell detection type mismatch | WF3 | 5 min | Upsell alerts may never fire |
| **P3** | Deploy Frankie email templates | WF1 | 10 min | Brand voice consistency |
| **P3** | Add customer booking confirmation | WF2 | 10 min | Better customer experience |
| **P3** | Delete orphaned "Find Notion Lead" | WF3 | 30 sec | Workflow cleanliness |
| **P3** | Add Stripe webhook signature verification | WF1 | 15 min | Security hardening |
| **P3** | Add WF4 duplicate check | WF4 | 15 min | Prevent duplicate IG lead records |

**Total estimated time:** ~2-3 hours of focused n8n UI work.

---

## Doc Accuracy Issues

The following docs contain inaccurate information based on this audit:

1. **STATUS_BOARD.md** — Claims 5 active workflows; actually 4. Daily Follow-Up Engine listed as "live Feb 23" but doesn't exist.
2. **CLAUDE.md** — Same: lists 5 workflows, mentions Daily Follow-Up Engine as active.
3. **`docs/n8n-fix-configs.md`** — Fix 1.1 (sender email) is already done. Fix 3.1/3.2 (Role/Desired Outcome type) already done. Fix 3.10 (upsell sender) still shows `soscreativehotline@gmail.com` as current but live shows `hello@` — partially fixed but to wrong address.
4. **`docs/system-reference.md`** — Says "Email sender audit (all verified correct Feb 20)" but multiple team notifications use `hello@` instead of `notifications@`.

---

## Next Session Plan

1. **Immediate:** Build Daily Follow-Up Engine in n8n Cloud UI from consolidation spec
2. **Then:** Apply all P1 fixes (product name, customer email, client name references, Lead Source)
3. **Then:** Apply P2 fixes (sender addresses, Lead Source for WF1, upsell detection)
4. **Then:** Deploy Frankie templates, add booking confirmation, security hardening
5. **Finally:** Run e2e test per `docs/e2e-test-plan.md`
