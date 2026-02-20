# Workflow Health Check — All 7 Active Workflows

**Date:** February 20, 2026
**Method:** Pulled all 7 workflows via n8n MCP and inspected every node's parameters

---

## Check 1: All 7 Active/Published

| # | Workflow | ID | Active | Last Updated |
|---|---------|-----|--------|--------------|
| 1 | Stripe Purchase → Calendly | `AMSvlokEAFKvF_rncAFte` | **Yes** | Feb 20, 14:20 UTC |
| 2 | Calendly Booking → Payments Update | `Wt7paQoH2EICMtUG` | **Yes** | Feb 20, 08:02 UTC |
| 3 | Tally Intake → Claude Analysis | `ETKIfWOX-eciSJQQF7XX5` | **Yes** | Feb 20, 14:31 UTC |
| 4 | Laylo Subscriber → Notion | `MfbV3-F5GiMwDs1KD5AoK` | **Yes** | Feb 20, 14:39 UTC |
| 5 | Follow Up: Paid But Never Booked | `clCnlUW1zjatRHXE` | **Yes** | Feb 20, 17:08 UTC |
| 6 | Follow Up: Booked But No Intake | `Esq2SMGEy6LVHdIQ` | **Yes** | Feb 20, 17:16 UTC |
| 7 | Follow Up: Laylo Lead Nurture | `VYCokTqWGAFCa1j0` | **Yes** | Feb 20, 17:38 UTC |

**Result: PASS** — All 7 workflows are active.

---

## Check 2: Dead Domain References (`soscreativehotline.com`)

Searched all node HTML, URLs, and text parameters for `soscreativehotline.com`.

| Workflow | Node | Found | Details |
|----------|------|-------|---------|
| WF1 | — | No | Clean |
| WF2 | — | No | Clean |
| WF3 | — | No | Clean |
| WF4 | — | No | Clean |
| WF5 | — | No | Clean |
| WF6 | — | No | Clean |
| **WF7** | **Send Nurture Email** | **YES** | `href="https://soscreativehotline.com"` in "Learn More & Book" button |

**Result: FAIL** — WF7 still has the dead domain. Fix instructions below.

### WF7 Fix Instructions (for Cowork)

In n8n Cloud UI → Open "Creative Hotline - Follow Up: Laylo Lead Nurture" → "Send Nurture Email" node → HTML parameter:

**Find:**
```html
<a href="https://soscreativehotline.com" style="background-color:#FF6B35;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Learn More & Book</a>
```

**Replace with:**
```html
<a href="https://www.thecreativehotline.com" style="background-color:#FF6B35;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Learn More & Book</a>
```

Save and publish the workflow. The n8n MCP does not support workflow editing — this must be done in the browser UI.

---

## Check 3: Webflow Template References (`marketio-template.webflow.io`)

Searched all node parameters for `marketio` and `webflow.io`.

| Workflow | Found |
|----------|-------|
| WF1–WF7 | No |

**Result: PASS** — No Webflow template references found in any workflow.

---

## Check 4: Email Sender Addresses

**Rule:** Customer emails from `hello@creativehotline.com`, team notifications from `notifications@creativehotline.com`. No personal addresses (`jake@radanimal.co`, `soscreativehotline@gmail.com`).

| Workflow | Node | fromEmail | Correct? |
|----------|------|-----------|----------|
| **WF1** | Send Calendly Link | `hello@creativehotline.com` | **Yes** |
| **WF1** | Send an Email (team) | `notifications@creativehotline.com` | **Yes** |
| **WF2** | Send an Email (team) | `notifications@creativehotline.com` | **Yes** |
| **WF3** | Send Upsell Alert | `notifications@creativehotline.com` | **Yes** |
| **WF3** | Send Intake Notification | `notifications@creativehotline.com` | **Yes** |
| **WF4** | Send an Email (team) | `notifications@creativehotline.com` | **Yes** |
| **WF5** | Send Booking Reminder | `hello@creativehotline.com` | **Yes** |
| **WF5** | Alert Team | `notifications@creativehotline.com` | **Yes** |
| **WF6** | Send Intake Reminder | `hello@creativehotline.com` | **Yes** |
| **WF6** | Alert Team | `notifications@creativehotline.com` | **Yes** |
| **WF7** | Send Nurture Email | `hello@creativehotline.com` | **Yes** |
| **WF7** | Alert Team | `notifications@creativehotline.com` | **Yes** |

**Result: PASS** — All email senders are correct. No personal addresses used.

---

## Check 5: Laylo API References (`api.laylo.com`)

Searched all node URLs for `api.laylo.com`. The WF8/WF9 bug was nodes calling `api.laylo.com/v1/messages/send` (Laylo messaging API) instead of sending email.

| Workflow | Node | URL | Issue? |
|----------|------|-----|--------|
| WF1 | Laylo Subscribe (SMS) | `https://laylo.com/api/graphql` | **No** — This is the correct Laylo GraphQL API for subscriber management |
| WF1 | Laylo Subscribe (Email Only) | `https://laylo.com/api/graphql` | **No** — Same, correct usage |
| WF2–WF7 | — | — | No Laylo API calls |

**Result: PASS** — No nodes use `api.laylo.com`. WF1's Laylo calls use the correct `laylo.com/api/graphql` endpoint for subscriber management (not the messaging API that was the WF8/WF9 bug).

---

## Additional Findings (Beyond Requested Checks)

These were discovered during the health check and are documented for completeness:

### HIGH Priority

| # | Issue | Workflow | Node |
|---|-------|----------|------|
| 1 | **Claude API key hardcoded in HTTP headers** | WF3 | Claude Generate Summary |

The `x-api-key` header contains a plaintext Anthropic API key: `sk-ant-api03-Gtc...AAA`. This should be moved to an n8n credential (HTTP Header Auth type).

**Fix:** n8n → Credentials → New → HTTP Header Auth → Name: "Anthropic API" → Header Name: `x-api-key` → Header Value: `[the key]`. Then update the Claude Generate Summary node to use this credential and remove the hardcoded header.

### MEDIUM Priority

| # | Issue | Workflow | Node |
|---|-------|----------|------|
| 2 | **WF2 team notification references wrong variables** | WF2 | Send an Email |
| 3 | **WF4 Phone not mapped** | WF4 | Create Subscriber Lead |
| 4 | **WF4 Client Name always blank** | WF4 | Create Subscriber Lead |
| 5 | **WF3 orphaned node** | WF3 | Find Notion Lead |
| 6 | **WF1 Product Purchased always null** | WF1 | Extract Data → Create Notion Lead |
| 7 | **WF1 no duplicate payment guard** | WF1 | Missing node |
| 8 | **WF5/6/7 no dedup checkboxes** | WF5/6/7 | Filter Code nodes |
| 9 | **WF5/6/7 not Frankie voice** | WF5/6/7 | Email nodes |

**Details on WF2 team notification (issue #2):**
The "Send an Email" (team notification) node references `event_type` and `start_time`:
```html
<td>{{ $('Extract Booking Data').item.json.event_type }}</td>
<td>{{ $('Extract Booking Data').item.json.start_time }}</td>
```
These fields don't exist in Extract Booking Data (which extracts `email`, `name`, `call_date`, `calendly_link`). Should be `call_date` for the scheduled time. The `event_type` field can be dropped or replaced with "Creative Hotline Call" (static text).

**Details on WF4 phone (issue #3):**
The Create Subscriber Lead node has `"key": "Phone|phone_number"` but no `phoneValue` is set. The phone is extracted in the previous node (`$json.body.phoneNumber`) but never mapped. Fix: add `"phoneValue": "={{ $json.phone }}"` to the Phone property.

**Details on WF4 Client Name (issue #4):**
The Create Subscriber Lead node has `"key": "Client Name|title"` but no title value is set. Laylo doesn't provide names. Fix: set title to `={{ $json.email.split('@')[0] }}` as a fallback (extracts username from email).

**Details on WF3 orphaned node (issue #5):**
The "Find Notion Lead" node exists in WF3 but is not connected to any other node in the `connections` map. It queries the Intake DB by email with an empty filter. It's dead code and can be deleted.

---

## Summary

| Check | Result |
|-------|--------|
| All 7 active | **PASS** |
| No `soscreativehotline.com` refs | **FAIL** — WF7 Send Nurture Email |
| No `marketio-template.webflow.io` refs | **PASS** |
| No personal email senders | **PASS** |
| No `api.laylo.com` refs | **PASS** |

**Overall: 4/5 checks pass.** Single failure is WF7's dead URL — fix instructions provided above.

**9 additional issues documented** for future fix cycles (specs already exist for most).

---

## Final Verification Sweep — Batch 4 (Feb 20, ~2am PT)

Re-pulled all 7 workflows via n8n MCP for final pre-launch verification.

### PASS/FAIL Table

| # | Workflow | `soscreativehotline.com` | `marketio` / `webflow.io` | Email Senders | Tally URL | Calendly URL |
|---|---------|--------------------------|--------------------------|---------------|-----------|-------------|
| 1 | Stripe → Calendly | PASS | PASS | PASS | N/A | PASS (`calendly.com/soscreativehotline/creative-hotline-call`) |
| 2 | Calendly → Payments | PASS | PASS | PASS | N/A | N/A |
| 3 | Tally → Claude | PASS | PASS | PASS | N/A | N/A |
| 4 | Laylo → Notion | PASS | PASS | PASS | N/A | N/A |
| 5 | Paid But Never Booked | PASS | PASS | PASS | N/A | PASS (`calendly.com/soscreativehotline/creative-hotline-call`) |
| 6 | Booked But No Intake | PASS | PASS | PASS | PASS (`tally.so/r/b5W1JE`) | N/A |
| 7 | Laylo Lead Nurture | **FAIL** | PASS | PASS | N/A | N/A |

### WF7 URL — NOT FIXED

**The WF7 "Send Nurture Email" node still contains `href="https://soscreativehotline.com"`.**

Evidence:
- `versionId`: `e9732d2c-52f3-4298-af6c-1d570847f728` (unchanged from Batch 2 pull)
- `updatedAt`: `2026-02-20T17:38:23.382Z` (unchanged from Batch 2 pull)
- HTML parameter still contains the dead domain

**Possible explanations:**
1. Cowork made the change but **did not save/publish** the workflow
2. The n8n MCP is returning cached data (unlikely — other workflows show fresh data)
3. The fix was not applied

**Action required:** Verify in n8n Cloud UI whether the change was saved. If not, apply the fix documented in Check 2 above and **publish** the workflow.

### Additional Findings in This Sweep

| # | Finding | Workflow | Severity |
|---|---------|----------|----------|
| 1 | WF3 `Role` mapped as `rich_text` — **correct** (matches Notion schema) | WF3 | Resolved |
| 2 | WF3 `Desired Outcome` mapped as `multi_select` — **correct** (matches Notion schema) | WF3 | Resolved |
| 3 | WF3 Claude API key **still hardcoded** in HTTP headers | WF3 | HIGH |
| 4 | WF3 orphaned "Find Notion Lead" node **still present** (not connected) | WF3 | LOW |
| 5 | WF4 `Product Purchased` set to `"Laylo SMS Signup"` — **invalid select option** (valid: "Standard Call", "First Call", "3-Pack Sprint", "3-Session Clarity Sprint") | WF4 | MEDIUM |
| 6 | WF4 Phone still not mapped (`phoneValue` missing) | WF4 | MEDIUM |
| 7 | WF4 Client Name still blank (no title value set) | WF4 | MEDIUM |
| 8 | WF2 team notification still references `event_type`/`start_time` (nonexistent fields) | WF2 | LOW |
| 9 | WF1 Product name still maps from `line_items` (always null) — fix spec written but not yet applied | WF1 | HIGH (pre-existing) |
| 10 | WF1 no dedup guard — fix spec written but not yet applied | WF1 | HIGH (pre-existing) |
| 11 | WF1 webhook has no Stripe signature verification | WF1 | MEDIUM |

### Overall Batch 4 Result

**6/7 workflows pass all checks. WF7 fails the dead domain check — fix not yet published.**

Everything else matches Batch 2 findings. No regressions detected. The pre-existing issues (WF1 product mapping, WF1 dedup, WF3 API key) all have fix specs written and are awaiting manual application in the n8n UI.
