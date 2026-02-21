#!/usr/bin/env bash
#
# Creative Hotline — Automation Stack Health Check
#
# Checks: n8n workflow status, MX records, website, webhook endpoints,
#         Stripe products, Calendly, Tally form, Notion API.
#
# Usage: ./scripts/health-check.sh
# Requires: curl, dig (or nslookup), jq (optional, for JSON parsing)
#
# For n8n API checks, set N8N_API_KEY env var or pass as argument:
#   N8N_API_KEY=your_key ./scripts/health-check.sh

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
WARN=0
FAIL=0

pass()  { echo -e "  ${GREEN}PASS${NC}  $1"; ((PASS++)); }
warn()  { echo -e "  ${YELLOW}WARN${NC}  $1"; ((WARN++)); }
fail()  { echo -e "  ${RED}FAIL${NC}  $1"; ((FAIL++)); }

echo "============================================"
echo "  Creative Hotline — Health Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "============================================"
echo ""

# -------------------------------------------------------------------
# 1. Website
# -------------------------------------------------------------------
echo "--- Website ---"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.thecreativehotline.com" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  pass "thecreativehotline.com → HTTP $HTTP_CODE"
else
  fail "thecreativehotline.com → HTTP $HTTP_CODE"
fi

PRICING_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.thecreativehotline.com/pricing" 2>/dev/null || echo "000")
if [ "$PRICING_CODE" = "200" ]; then
  pass "/pricing page → HTTP $PRICING_CODE"
elif [ "$PRICING_CODE" = "404" ]; then
  warn "/pricing page → HTTP 404 (known issue)"
else
  fail "/pricing page → HTTP $PRICING_CODE"
fi

echo ""

# -------------------------------------------------------------------
# 2. MX Records (hello@creativehotline.com)
# -------------------------------------------------------------------
echo "--- Email / DNS ---"

if command -v dig &> /dev/null; then
  MX_RECORDS=$(dig +short MX creativehotline.com 2>/dev/null || echo "")
  if [ -n "$MX_RECORDS" ]; then
    pass "creativehotline.com MX records exist: $(echo "$MX_RECORDS" | head -1)"
  else
    fail "creativehotline.com has NO MX records — hello@ replies will bounce"
  fi
else
  warn "dig not available — skipping MX record check"
fi

echo ""

# -------------------------------------------------------------------
# 3. n8n Instance
# -------------------------------------------------------------------
echo "--- n8n Cloud ---"

N8N_BASE="https://creativehotline.app.n8n.cloud"
N8N_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$N8N_BASE" 2>/dev/null || echo "000")
if [ "$N8N_CODE" = "200" ] || [ "$N8N_CODE" = "302" ] || [ "$N8N_CODE" = "301" ]; then
  pass "n8n instance reachable → HTTP $N8N_CODE"
else
  fail "n8n instance unreachable → HTTP $N8N_CODE (trial may have expired!)"
fi

# n8n API check (requires API key)
N8N_API_KEY="${N8N_API_KEY:-}"
if [ -n "$N8N_API_KEY" ]; then
  WORKFLOW_COUNT=$(curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
    "$N8N_BASE/api/v1/workflows?limit=50" 2>/dev/null | \
    python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "error")

  if [ "$WORKFLOW_COUNT" != "error" ]; then
    if [ "$WORKFLOW_COUNT" -ge 7 ]; then
      pass "n8n workflows found: $WORKFLOW_COUNT"
    elif [ "$WORKFLOW_COUNT" -gt 0 ]; then
      warn "n8n workflows found: $WORKFLOW_COUNT (expected 7)"
    else
      fail "n8n returned 0 workflows — possible trial expiry"
    fi
  else
    warn "n8n API query failed (check API key)"
  fi
else
  warn "N8N_API_KEY not set — skipping workflow count check"
fi

echo ""

# -------------------------------------------------------------------
# 4. Webhook Endpoints (reachability)
# -------------------------------------------------------------------
echo "--- Webhook Endpoints ---"

declare -A WEBHOOKS=(
  ["WF1 Stripe"]="$N8N_BASE/webhook/stripe-checkout"
  ["WF2 Calendly"]="$N8N_BASE/webhook/calendly-payments-update"
  ["WF3 Tally"]="$N8N_BASE/webhook/tally-intake"
  ["WF4 Laylo"]="$N8N_BASE/webhook/8e422442-519e-4d42-8cb4-372d26b89edc"
)

for NAME in "${!WEBHOOKS[@]}"; do
  URL="${WEBHOOKS[$NAME]}"
  # Webhook endpoints return various codes — anything except 000 (unreachable) is OK
  WH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL" 2>/dev/null || echo "000")
  if [ "$WH_CODE" = "000" ]; then
    fail "$NAME webhook unreachable"
  elif [ "$WH_CODE" = "404" ]; then
    fail "$NAME webhook → 404 (workflow may be inactive or deleted)"
  else
    pass "$NAME webhook reachable → HTTP $WH_CODE"
  fi
done

echo ""

# -------------------------------------------------------------------
# 5. External Services
# -------------------------------------------------------------------
echo "--- External Services ---"

# Calendly
CAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://calendly.com/soscreativehotline/creative-hotline-call" 2>/dev/null || echo "000")
if [ "$CAL_CODE" = "200" ]; then
  pass "Calendly booking page → HTTP $CAL_CODE"
else
  fail "Calendly booking page → HTTP $CAL_CODE"
fi

# Tally
TALLY_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://tally.so/r/b5W1JE" 2>/dev/null || echo "000")
if [ "$TALLY_CODE" = "200" ]; then
  pass "Tally intake form → HTTP $TALLY_CODE"
else
  fail "Tally intake form → HTTP $TALLY_CODE"
fi

# Stripe API (basic connectivity)
STRIPE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.stripe.com" 2>/dev/null || echo "000")
if [ "$STRIPE_CODE" != "000" ]; then
  pass "Stripe API reachable → HTTP $STRIPE_CODE"
else
  fail "Stripe API unreachable"
fi

# Claude API (basic connectivity)
CLAUDE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.anthropic.com" 2>/dev/null || echo "000")
if [ "$CLAUDE_CODE" != "000" ]; then
  pass "Claude API reachable → HTTP $CLAUDE_CODE"
else
  fail "Claude API unreachable"
fi

# Notion API
NOTION_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.notion.com/v1" 2>/dev/null || echo "000")
if [ "$NOTION_CODE" != "000" ]; then
  pass "Notion API reachable → HTTP $NOTION_CODE"
else
  fail "Notion API unreachable"
fi

echo ""

# -------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------
echo "============================================"
TOTAL=$((PASS + WARN + FAIL))
echo -e "  Results: ${GREEN}$PASS passed${NC}, ${YELLOW}$WARN warnings${NC}, ${RED}$FAIL failed${NC} ($TOTAL checks)"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Action required: $FAIL check(s) failed. See above for details."
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo ""
  echo "Some warnings detected. Review above."
  exit 0
else
  echo ""
  echo "All checks passed."
  exit 0
fi
