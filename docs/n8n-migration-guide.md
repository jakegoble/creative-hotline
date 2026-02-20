# n8n Cloud Trial Migration Guide

> **SUPERSEDED:** n8n was upgraded to the Pro plan on Feb 20, 2026. Trial deadline is no longer relevant. This doc is retained for reference only.

~~**URGENT:** Your n8n Cloud trial expires around **February 23, 2026** (3 days from now). When it expires, all 9 workflows go offline — no payments processed, no bookings tracked, no intake forms analyzed, no follow-up emails sent.~~

---

## What Happens If the Trial Expires

Based on n8n community reports:
- All workflows are **deactivated** immediately
- Webhook URLs may **stop responding** to incoming events (Stripe, Calendly, Tally, Laylo)
- Workflow data and configurations are **preserved** but not running
- Some users report needing to **re-activate webhooks** manually after upgrading
- In worst cases, workflow configurations may need to be **re-imported**

**Bottom line:** Upgrade BEFORE the trial ends to avoid any disruption.

---

## Recommended Plan: n8n Starter

| | Monthly | Annual |
|--|---------|--------|
| **Price** | €24/month (~$26/month) | €20/month (~$22/month) billed annually |
| **Executions** | 2,500/month | 2,500/month |
| **Workflows** | Unlimited | Unlimited |
| **Active workflows** | 5 | 5 |

### Will 2,500 executions be enough?

Current usage estimate:
| Workflow | Trigger | Est. Monthly Executions |
|----------|---------|------------------------|
| WF1 Stripe | Per purchase | ~20-50 |
| WF2 Calendly | Per booking | ~20-50 |
| WF3 Tally | Per intake | ~20-50 |
| WF4 Laylo | Per subscriber | ~50-100 |
| WF5 Follow-up | Daily schedule | ~30 |
| WF6 Follow-up | Daily schedule | ~30 |
| WF7 Follow-up | Daily schedule | ~30 |
| **Total** | | **~200-340** |

2,500 executions is more than enough for current volume. You'd need 80+ purchases/month to approach the limit.

### Active workflow limit (5)

You currently have 9 workflows, but:
- WF8 and WF9 should be **deactivated** (broken)
- That leaves 7 active workflows vs a limit of 5

**Options:**
1. **Upgrade to Pro** (€58/month) for unlimited active workflows
2. **Consolidate workflows** — merge WF5+WF6+WF7 into a single "Daily Follow-Ups" workflow (saves 2 slots)
3. **Keep WF7 inactive** until Laylo volume justifies it (saves 1 slot)

**Recommendation:** Start with Starter plan. Deactivate WF8+WF9 immediately. If you hit the 5-workflow limit, consolidate the three follow-up workflows into one (they share the same pattern: schedule → Notion getAll → Code filter → email).

---

## Upgrade Steps (5 minutes)

### Step 1: Log into n8n Cloud
```
URL: https://creativehotline.app.n8n.cloud
```

### Step 2: Navigate to Billing
1. Click your profile icon (bottom-left)
2. Select **Settings** → **Usage & plan** (or **Billing**)
3. You should see your trial status and expiration date

### Step 3: Choose a Plan
1. Click **Upgrade** or **Choose plan**
2. Select **Starter** (€24/month or €20/month annual)
3. Enter payment information
4. Confirm the upgrade

### Step 4: Verify Workflows Are Still Active
After upgrading:
1. Go to **Workflows** list
2. Confirm all workflows show their correct active/inactive status
3. Check that webhook URLs haven't changed (they shouldn't)

### Step 5: Test a Webhook
Pick any active workflow and trigger a test:
- Open WF3 (Tally Intake) → Click "Test workflow" → Submit a test Tally form
- Or open WF1 (Stripe) → Check last execution time in the list

---

## Pre-Upgrade Checklist

Do these BEFORE upgrading to ensure a clean transition:

- [ ] **Deactivate WF8** (Calendly → Tally) — broken, saves an active workflow slot
- [ ] **Deactivate WF9** (Post-Call Follow-Up) — broken, saves an active workflow slot
- [ ] **Export all workflows** as backup (Settings → Export all workflows as JSON)
- [ ] **Note all webhook URLs** — save them somewhere in case they need to be re-configured
- [ ] **Apply critical fixes** from [n8n-fix-configs.md](n8n-fix-configs.md) — items 1-3 take 2 minutes

### Webhook URLs to Save

| Workflow | Webhook URL |
|----------|------------|
| WF1 (Stripe) | Check n8n → WF1 → Webhook node → Production URL |
| WF2 (Calendly) | Check n8n → WF2 → Webhook node → Production URL |
| WF3 (Tally) | Check n8n → WF3 → Webhook node → Production URL |
| WF4 (Laylo) | `https://creativehotline.app.n8n.cloud/webhook/8e422442-519e-4d42-8cb4-372d26b89edc` |

---

## Post-Upgrade Verification

After upgrading, verify within 24 hours:

1. **Check execution count** — Settings → Usage & plan → should show executions resetting
2. **Trigger each active workflow** with a test event
3. **Check Notion** — new records should still be created
4. **Check email delivery** — send a test event and verify emails arrive
5. **Monitor for 24 hours** — watch for any failed executions in the n8n log

---

## If Things Break After Upgrade

### Webhooks stopped working
1. Open each webhook-triggered workflow (WF1-WF4)
2. Click the webhook node
3. Copy the **Production URL**
4. Verify it matches what Stripe/Calendly/Tally/Laylo are pointing to
5. If URLs changed, update them in each service

### Workflows deactivated
1. Go to Workflows list
2. Toggle each workflow back to Active
3. For webhook workflows, you may need to click "Listen for test event" once to re-register

### Workflow data lost (worst case)
1. Re-import from the JSON backup you exported
2. Re-configure credentials (Notion API, SMTP)
3. Re-activate and test each workflow

---

## Cost Summary

| Item | Monthly Cost |
|------|-------------|
| n8n Starter | €24 (~$26) |
| ManyChat Pro | $44 |
| Calendly (free tier?) | $0 |
| Tally (free tier?) | $0 |
| Laylo | $0 (free for now?) |
| Claude API (usage-based) | ~$5-15 |
| **Total automation costs** | **~$75-85/month** |

At $499/call, you break even on automation costs with 1 client per 6 months. At just 2 calls/month, automation costs are under 10% of revenue.
