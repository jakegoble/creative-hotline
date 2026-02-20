# n8n Node Fix Specs — WF2 + WF4

Consolidated copy-paste fix instructions for the n8n Cloud UI. Each section tells you exactly which workflow, which node, and what to change.

**n8n Cloud URL:** https://creativehotline.app.n8n.cloud

---

## WF2: Calendly Booking → Payments Update

**Workflow ID:** `Wt7paQoH2EICMtUG`

**Bug:** The "Send an Email" team notification node references `event_type` and `start_time` which don't exist in the Extract Booking Data output. Extract Booking Data outputs: `email`, `name`, `call_date`, `calendly_link`.

**Current HTML (broken):**
```html
<tr><td>Event</td><td>{{ $('Extract Booking Data').item.json.event_type }}</td></tr>
<tr><td>Scheduled</td><td>{{ $('Extract Booking Data').item.json.start_time }}</td></tr>
```

**Fix:** In n8n Cloud UI → Open "Calendly Booking to Payments Update" → "Send an Email" node → HTML parameter:

Find:
```html
<tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Event</td><td style="padding:8px;border:1px solid #ccc;">{{ $('Extract Booking Data').item.json.event_type }}</td></tr>
<tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Scheduled</td><td style="padding:8px;border:1px solid #ccc;">{{ $('Extract Booking Data').item.json.start_time }}</td></tr>
```

Replace with:
```html
<tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Call Type</td><td style="padding:8px;border:1px solid #ccc;">Creative Hotline Call</td></tr>
<tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Scheduled</td><td style="padding:8px;border:1px solid #ccc;">{{ $('Extract Booking Data').item.json.call_date }}</td></tr>
```

Also update the subject line from emoji-prefixed to clean:

- **Current:** `📅 New Calendly Booking — The Creative Hotline`
- **New:** `New booking: {{ $('Extract Booking Data').item.json.name }} on {{ $('Extract Booking Data').item.json.call_date }}`

Save and publish. Test by triggering a Calendly booking and checking the team email.

---

## WF4: Laylo Subscriber → Notion

**Workflow ID:** `MfbV3-F5GiMwDs1KD5AoK`

Three bugs in the "Create Subscriber Lead" node (Notion create page), plus one bonus fix.

### Bug 1: Phone not mapped

The node has `"key": "Phone|phone_number"` but no `phoneValue` is set. The phone IS extracted in the previous node as `$json.phone` (from `$json.body.phoneNumber`).

**Fix:** In n8n Cloud UI → "Laylo New Subscriber to Notion" → "Create Subscriber Lead" node → Properties → Phone property:

- Set the Phone value to: `={{ $json.phone }}`

### Bug 2: Client Name always blank

The node has `"key": "Client Name|title"` but no title value. Laylo webhooks don't include a name field.

**Fix:** Set the Client Name (title) value to: `={{ $json.email.split('@')[0] }}`

This extracts the username from the email as a fallback (e.g., `jane.doe@gmail.com` → `jane.doe`).

### Bug 3: Product Purchased set to invalid value

Currently set to `"Laylo SMS Signup"` which is NOT a valid option in the Notion Product Purchased select field.

Valid options are: "3-Pack Sprint", "Standard Call", "First Call", "3-Session Clarity Sprint"

**Fix:** Since Laylo subscribers haven't purchased anything yet, this field should be left empty (blank/null). Remove the Product Purchased property from the node entirely, OR clear its value.

In n8n Cloud UI → "Create Subscriber Lead" node → Properties:

- Find `Product Purchased` in the property list
- Either delete the row entirely, or clear the value field

If n8n requires a value for the select, you can also set it to an empty expression: `={{ '' }}`

### Bug 4: Lead Source not set (bonus fix)

While you're in this node, add the Lead Source property:

- Key: `Lead Source|select`
- Value: `IG DM`

This correctly tags the source since all Laylo subscribers come from Instagram DM keyword drops.

---

## WF4 Complete Fix Summary

After all fixes, the Create Subscriber Lead node should have:

| Property | Current Value | Fixed Value |
|----------|--------------|-------------|
| Client Name (title) | _(blank)_ | `={{ $json.email.split('@')[0] }}` |
| Email | `={{ $json.email }}` | _(unchanged)_ |
| Phone | _(blank)_ | `={{ $json.phone }}` |
| Status | `Lead - Laylo` | _(unchanged)_ |
| Payment Amount | _(blank)_ | _(unchanged -- leave blank, they haven't paid)_ |
| Product Purchased | `Laylo SMS Signup` | _(remove or clear)_ |
| Lead Source | _(missing)_ | `IG DM` (add new property row) |

Save and publish. Test by sending a test webhook payload to the Laylo endpoint.

---

## Testing

After applying fixes, use n8n's test mode to verify:

1. **WF2:** Trigger a test Calendly booking. Confirm team email arrives with correct "Call Type" and "Scheduled" fields populated (no blank values).
2. **WF4:** Send a test POST to the Laylo webhook URL (`https://creativehotline.app.n8n.cloud/webhook/8e422442-519e-4d42-8cb4-372d26b89edc`) with a payload like:
   ```json
   {
     "body": {
       "email": "test.user@example.com",
       "phoneNumber": "+15551234567"
     }
   }
   ```
   Confirm the Notion record in Payments DB has:
   - Client Name = `test.user`
   - Email = `test.user@example.com`
   - Phone = `+15551234567`
   - Status = `Lead - Laylo`
   - Product Purchased = _(empty)_
   - Lead Source = `IG DM`

Delete the test record from Notion after verification.
