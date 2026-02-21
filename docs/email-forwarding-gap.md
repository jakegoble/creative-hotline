# Email Forwarding Gap — LAUNCH BLOCKER

**Date:** 2026-02-21
**Priority:** P1 — Must fix before launch
**Domain:** `creativehotline.com`
**DNS Provider:** GoDaddy (`ns38.domaincontrol.com`)

---

## The Problem

Three customer-facing automated emails use `hello@creativehotline.com` as the From address:

| Workflow | Email | Subject |
|----------|-------|---------|
| WF1 | Calendly booking link | "Your Creative Hotline call is waiting!" |
| WF5 | Booking reminder | "Your Creative Hotline call is waiting!" |
| WF6 | Intake reminder | "Quick prep before your Creative Hotline call!" |

These emails invite customers to "just reply to this email" if they have questions. But **`hello@creativehotline.com` has no MX records and no mailbox**. Customer replies will bounce with a delivery failure.

Additionally, team notification emails use `notifications@creativehotline.com` — replies to those would also bounce, though team members are less likely to reply to automated notifications.

---

## Current DNS State

| Record Type | Status |
|-------------|--------|
| A record | Points to Webflow (for website) |
| CNAME (www) | Points to Webflow |
| MX records | **NONE** |
| SPF (TXT) | Unknown — needs verification |
| DKIM | Unknown — needs verification |

**Nameservers:** `ns37.domaincontrol.com`, `ns38.domaincontrol.com` (GoDaddy)

---

## Fix Options

### Option A: GoDaddy Email Forwarding (Recommended — Free)

GoDaddy offers free email forwarding for domains hosted on their nameservers.

**Steps:**
1. Log into GoDaddy → My Products → `creativehotline.com` → DNS Management
2. Click "Email Forwarding" (or find it under Email section)
3. Add forwarding rules:
   - `hello@creativehotline.com` → `soscreativehotline@gmail.com`
   - `notifications@creativehotline.com` → `soscreativehotline@gmail.com`
   - `*@creativehotline.com` → `soscreativehotline@gmail.com` (catch-all, optional)
4. GoDaddy will automatically add the required MX records
5. Wait 15-30 minutes for DNS propagation

**Pros:** Free, simple, handles the immediate need
**Cons:** No outbound sending capability (can't send AS hello@ from Gmail)

### Option B: Google Workspace ($7/mo per user)

If you want to send FROM `hello@creativehotline.com` (not just receive):

1. Sign up for Google Workspace
2. Add `creativehotline.com` as a domain
3. Create `hello@` and `notifications@` accounts (or aliases)
4. Update MX records per Google's instructions
5. Configure SPF, DKIM, DMARC for deliverability

**Pros:** Full email capability, professional
**Cons:** Monthly cost, more setup

### Option C: Cloudflare Email Routing (Free)

If you move DNS to Cloudflare (or already use it):

1. Enable Email Routing in Cloudflare dashboard
2. Add forwarding rules for `hello@` and `notifications@`
3. Cloudflare handles MX records automatically

**Pros:** Free, modern, good deliverability features
**Cons:** Requires moving nameservers to Cloudflare

---

## Recommendation

**Option A (GoDaddy forwarding)** for immediate launch. Takes 5 minutes and is free.

Later, consider migrating to Google Workspace for proper outbound sending capability — especially if Jake needs to respond to customer emails AS `hello@creativehotline.com` rather than from `soscreativehotline@gmail.com`.

---

## SPF/DKIM Considerations

The n8n SMTP credential sends emails FROM `hello@creativehotline.com` via whatever SMTP server is configured. For these emails to not land in spam:

1. **SPF record needed:** Add a TXT record for `creativehotline.com` that includes the SMTP server's IP/domain
2. **DKIM signing:** The SMTP provider should sign outbound emails with DKIM for the domain
3. **DMARC policy:** Optional but recommended — add a `_dmarc.creativehotline.com` TXT record

Without these records, automated emails from `hello@creativehotline.com` may be flagged as spam by recipients' email providers.

**Action:** Check what SMTP service the n8n credential (`yJP76JoIqqqEPbQ9`) is configured to use, then add appropriate SPF/DKIM records.

---

## Verification Steps (After Fix)

1. Send a test email to `hello@creativehotline.com` from a personal account
2. Verify it arrives at `soscreativehotline@gmail.com`
3. Reply from Gmail — verify the customer receives the reply
4. Check MX records: `dig MX creativehotline.com` — should show GoDaddy or Google MX servers
5. Check SPF: `dig TXT creativehotline.com` — should include SMTP provider
