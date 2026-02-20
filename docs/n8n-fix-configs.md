# n8n Workflow Fix Configurations

Exact, copy-paste-ready configurations for fixing n8n workflow node settings. Each fix is documented with the workflow and node to edit, the exact field/setting to change, the before value, and the after value.

---

## WF1: Stripe Purchase → Calendly (AMSvlokEAFKvF_rncAFte)

### Fix 1.1: Customer email sender
- **Node:** "Send Calendly Link"
- **Field:** fromEmail
- **Before:** `jake@radanimal.co`
- **After:** `hello@creativehotline.com`

### Fix 1.2: Product Purchased value
- **Node:** "Extract Data"
- **Field:** product_name value expression
- **Before:** `={{$json.body.data.object.line_items.data[0].description}}`
- **Problem:** Stripe checkout.session.completed webhook does NOT include line_items
- **After (Option A -- hardcode):** `Standard Call`
- **After (Option B -- use metadata):** `={{$json.body.data.object.metadata.product_name}}`
  - Requires adding metadata field "product_name" to Stripe checkout session creation
- **After (Option C -- API lookup):** Add new HTTP Request node BEFORE Extract Data:
  - Method: GET
  - URL: `https://api.stripe.com/v1/checkout/sessions/={{$json.body.data.object.id}}?expand[]=line_items`
  - Auth: Stripe API key as Bearer token
  - Then Extract Data reads: `={{$json.line_items.data[0].price.product.name}}`

### Fix 1.3: Add Lead Source
- **Node:** "Create Notion Lead"
- **Action:** Add new property to propertiesUi.propertyValues array:
```json
{
  "key": "Lead Source|select",
  "type": "={{$parameter[\"&key\"].split(\"|\")[1]}}",
  "selectValue": "Direct"
}
```

---

## WF2: Calendly Booking → Payments Update (Wt7paQoH2EICMtUG)

### Fix 2.1: Team notification field references
- **Node:** "Send an Email"
- **In the HTML email body, replace:**
  - `{{ $('Extract Booking Data').item.json.event_type }}` → `Creative Hotline Call`
  - `{{ $('Extract Booking Data').item.json.start_time }}` → `{{ $('Extract Booking Data').item.json.call_date }}`

---

## WF3: Tally Intake → Claude Analysis (ETKIfWOX-eciSJQQF7XX5)

### Fix 3.1: Role field type
- **Node:** "Create Intake Record"
- **Property:** Role
- **Before:** `"key": "Role|select"` with `"selectValue": "={{ $('Extract Tally Data').item.json.role }}"`
- **After:** `"key": "Role|rich_text"` with `"textContent": "={{ $('Extract Tally Data').item.json.role }}"`

### Fix 3.2: Desired Outcome field type
- **Node:** "Create Intake Record"
- **Property:** Desired Outcome
- **Before:** `"key": "Desired Outcome|select"` with `"selectValue": "={{ $('Extract Tally Data').item.json.desired_outcome }}"`
- **After:** `"key": "Desired Outcome|multiSelect"` with `"multiSelectValue": "={{ $('Extract Tally Data').item.json.desired_outcome }}"`
- **NOTE:** The Tally form sends free text. The Notion multi_select options are: "A clear decision", "Direction I can trust", "A short action plan", "Stronger positioning", "Someone to tell me the truth". Free text from Tally won't match these. Two options:
  - (A) Change Notion property to rich_text instead of multi_select
  - (B) Add Code node logic to map Tally text to closest multi_select option

### Fix 3.3: Client Name title
- **Node:** "Create Intake Record"
- **Field:** The node-level `title` field (NOT inside propertyValues)
- **Before:** `"title": ""`
- **After:** `"title": "={{ $('Extract Tally Data').item.json.name }}"`

### Fix 3.4: Brand textContent
- **Node:** "Create Intake Record"
- **Property:** Brand|rich_text
- **Before:** `"textContent": ""`
- **After:** `"textContent": "={{ $('Extract Tally Data').item.json.brand }}"`

### Fix 3.5: Creative Emergency textContent
- **Node:** "Create Intake Record"
- **Property:** Creative Emergency|rich_text
- **Before:** `"textContent": ""`
- **After:** `"textContent": "={{ $('Extract Tally Data').item.json.creative_emergency }}"`

### Fix 3.6: What They've Tried textContent
- **Node:** "Create Intake Record"
- **Property:** What They've Tried|rich_text
- **Before:** `"textContent": ""`
- **After:** `"textContent": "={{ $('Extract Tally Data').item.json.what_they_tried }}"`

### Fix 3.7: Deadline textContent
- **Node:** "Create Intake Record"
- **Property:** Deadline|rich_text
- **Before:** `"textContent": ""`
- **After:** `"textContent": "={{ $('Extract Tally Data').item.json.deadline }}"`

### Fix 3.8: Constraints / Avoid textContent
- **Node:** "Create Intake Record"
- **Property:** Constraints / Avoid|rich_text
- **Before:** `"textContent": ""`
- **After:** `"textContent": "={{ $('Extract Tally Data').item.json.constraints }}"`

### Fix 3.9: AI Intake Summary textContent
- **Node:** "Update Notion with AI Summary"
- **Property:** AI Intake Summary|rich_text
- **Before:** `"textContent": ""`
- **After:** `"textContent": "={{ $json.ai_summary }}"` (or `={{ $('Extract Claude Response').item.json.ai_summary }}`)

### Fix 3.10: Upsell alert sender
- **Node:** "Send Upsell Alert"
- **Field:** fromEmail
- **Before:** `soscreativehotline@gmail.com`
- **After:** `notifications@creativehotline.com`

### Fix 3.11: Delete orphaned node
- **Node:** "Find Notion Lead" (at position [-544, 224])
- **Action:** Delete this node entirely. It's not connected to anything.

### Fix 3.12: Move API key to credential
- **Node:** "Claude Generate Summary"
- **Currently:** API key hardcoded in header `x-api-key: sk-ant-api03-...`
- **Action:** Create new HTTP Header Auth credential in n8n with Name: "Anthropic API" and Value: the API key. Then reference the credential instead of hardcoding.

---

## WF4: Laylo → Notion (MfbV3-F5GiMwDs1KD5AoK)

### Fix 4.1: Product Purchased type
- **Node:** "Create Subscriber Lead"
- **Property:** Product Purchased
- **Before:** `"key": "Product Purchased|rich_text"` with empty textContent
- **After:** REMOVE this property entirely (Laylo subscribers haven't purchased anything)
- OR change to `"key": "Product Purchased|select"` with `"selectValue": ""` (empty -- no product)

### Fix 4.2: Phone mapping
- **Node:** "Create Subscriber Lead"
- **Property:** Phone|phone_number
- **Before:** `"phoneValue": ""`
- **After:** `"phoneValue": "={{ $json.phone }}"`

### Fix 4.3: Client Name fallback
- **Node:** "Create Subscriber Lead"
- **Field:** The node-level `title` field
- **Before:** `"title": ""`
- **After:** `"title": "={{ $json.email }}"` (use email as fallback since Laylo doesn't provide name)

### Fix 4.4: Add Lead Source
- **Node:** "Create Subscriber Lead"
- **Action:** Add new property:
```json
{
  "key": "Lead Source|select",
  "type": "={{$parameter[\"&key\"].split(\"|\")[1]}}",
  "selectValue": "IG DM"
}
```

---

## WF6: Booked But No Intake (Esq2SMGEy6LVHdIQ)

### Fix 6.1: Tally URL
- **Node:** "Send Intake Reminder"
- **In HTML body, replace:**
- **Before:** `https://tally.so/r/YOUR_TALLY_FORM_ID`
- **After:** `https://tally.so/r/b5W1JE`

---

## WF7: Laylo Lead Nurture (VYCokTqWGAFCa1j0)

### Fix 7.1: Website URL
- **Node:** "Send Nurture Email"
- **In HTML body, replace the "Learn More & Book" button href:**
- **Before:** `https://soscreativehotline.com`
- **After:** `https://www.thecreativehotline.com`

---

## WF8: Calendly → Tally (3ONZZbLdprx4nxGK7eEom)

### Fix 8.1: DEACTIVATE
- **Action:** Toggle workflow to inactive immediately
- This workflow is completely broken and conflicts with WF2

---

## WF9: Post-Call Follow-Up (9mct9GBz3R-EjTgQOZcPt)

### Fix 9.1: DEACTIVATE
- **Action:** Toggle workflow to inactive immediately
- This workflow runs every hour but does nothing useful

---

## Summary: Fix Priority

| Priority | Fix | Time | Impact |
|----------|-----|------|--------|
| 1 | Deactivate WF8 + WF9 | 30 seconds | Stop broken workflows from running |
| 2 | Fix 6.1 (Tally URL) | 1 minute | Customers can actually submit intake |
| 3 | Fix 1.1 (sender email) | 1 minute | Professional customer emails |
| 4 | Fix 3.10 (upsell sender) | 1 minute | Consistent team notifications |
| 5 | Fixes 3.3-3.9 (intake fields) | 10 minutes | Intake data actually saved to Notion |
| 6 | Fix 3.1 + 3.2 (type mismatches) | 5 minutes | Role + Desired Outcome saved correctly |
| 7 | Fix 4.1-4.4 (Laylo mappings) | 5 minutes | Complete lead records |
| 8 | Fix 7.1 (nurture URL) | 1 minute | Leads reach actual website |
| 9 | Fix 2.1 (notification fields) | 2 minutes | Team sees correct booking info |
| 10 | Fix 1.2 (Product Purchased) | 15 minutes | Product tracking works |
| 11 | Fix 1.3 + 4.4 (Lead Source) | 2 minutes | Attribution tracking |
| 12 | Fix 3.11-3.12 (cleanup) | 5 minutes | Security + cleanliness |

Total estimated time: ~45 minutes of focused work in n8n UI.
