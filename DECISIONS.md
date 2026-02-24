# Creative Hotline — Business Decisions
> Source of truth. Updated only by Chief of Staff (Cowork).
> All roles read this. No role contradicts these decisions.

## Active Decisions

1. **Laylo =/= Instagram** — ManyChat owns IG DM automation. Laylo is for keyword drops (BOOK, PRICING, HELP) via webhook to n8n. They are separate systems.
2. **WF5/6/7/9 permanently unpublished** — Replaced by Daily Follow-Up Engine (now LIVE).
3. **Publish =/= Save in n8n** — Must use ... menu > Unpublish > Confirm to stop a live workflow. Deactivating only saves to draft.
4. **Sender email** — Always `hello@creativehotline.com` for customer emails. `notifications@creativehotline.com` for team alerts. No personal addresses.
5. **CRM values are canonical** — Always fetch Notion schema before building filters. Never type property values from memory.
6. **Google tools under soscreativehotline@gmail.com** — Previous jakegob11@gmail.com accounts are invalid for new installations. Existing GA4/GTM IDs created under jakegob11 are still valid and installable.
7. **Product names** — "First Call" ($499), **"Single Call"** ($699), "3-Session Clarity Sprint" ($1,495). Stripe already renamed + metadata applied (product_name, product_tier, notion_status).
8. **All n8n IF nodes use string/exists pattern** — `$json.email` exists check. Never use the old `!$json._empty` boolean pattern (causes empty-routing bugs).
9. **Daily Follow-Up Engine is LIVE** — Built and branded by Conductor (Feb 24). Do NOT unpublish without Jake's approval.
10. **Multi-agent coordination** — 10 roles (4 Cowork + 6 Claude Code). STATUS_BOARD.md is the sync file. handoffs/ folder for role-to-role messages. See `docs/agent-roles.md`.
11. **Landing pages are #1 revenue blocker** — /strategy-call + /premium-sprint must be built in Webflow before anything else. Specs ready in Notion. Tracking pixels install same day. (Builder role)

## Decision Log

| Date | Decision | Made By | Context |
|------|----------|---------|---------|
| 2026-02-20 | Delete WF8+WF9 (broken scaffolding) | Jake + Claude | Bouncing emails, empty data |
| 2026-02-21 | Standardize IF nodes to email/exists | Jake + Claude | Fixed WF5/6/7 empty-routing bugs |
| 2026-02-21 | Upgrade n8n from trial | Jake | Trial expiring, need 5+ workflows |
| 2026-02-22 | Unpublish WF5/6/7/9 permanently | Jake | Replaced by consolidated engine |
| 2026-02-23 | Rebuild WF8 as Thank You emailer | Jake + Claude | Notion filter + Send Thank You email |
| 2026-02-23 | Consolidate WF5+6+7 into Daily Follow-Up Engine | Jake + Claude | Spec at workflow-consolidation-spec.md |
| 2026-02-24 | Metadata-first product mapping in WF1 | Jake + Claude | WF1 reads Stripe metadata before amount fallback |
| 2026-02-24 | 10-role agent architecture | Jake + Claude | 4 Cowork + 6 Claude Code. See docs/agent-roles.md |
| 2026-02-24 | Product name: "Single Call" (not "Standard Call") | Jake + COS | $699 product. Stripe renamed + metadata applied. DONE |
| 2026-02-24 | Daily Follow-Up Engine LIVE | Conductor | Built from consolidation spec. All 5 workflows active + branded |
| 2026-02-24 | Landing pages = #1 priority | COS briefing | Revenue blocked until /strategy-call + /premium-sprint exist |
