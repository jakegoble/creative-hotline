# Contact Form → Pipeline Webhook Spec

**Date:** February 20, 2026
**Problem:** The Webflow contact form on thecreativehotline.com/contact submits to Webflow's built-in form handler, which goes nowhere. Leads who fill it out are lost.

---

## Option A (Recommended): Redirect to Calendly

The simplest fix. No new workflow needed.

**In Webflow:**
1. Open the contact form settings
2. Change the form action to redirect to: `https://calendly.com/soscreativehotline/creative-hotline-call`
3. Or change the form's success redirect URL to the Calendly page

**Pros:** Zero engineering, works immediately
**Cons:** Loses the form data (name, email, message)

---

## Option B: Webflow Webhook → n8n → Notion

Captures the form data and creates a lead record.

### Webflow Side

Webflow forms can send data to a webhook URL via Webflow Logic or a third-party integration (Zapier, Make). If using Webflow Logic:

1. Webflow Dashboard → Logic → Add Flow
2. Trigger: Form Submission (contact form)
3. Action: Send Webhook
4. URL: `https://creativehotline.app.n8n.cloud/webhook/contact-form`
5. Method: POST
6. Body: Include all form fields

### n8n Workflow: Contact Form → Notion Lead

**Webhook URL:** `https://creativehotline.app.n8n.cloud/webhook/contact-form`

**Nodes:**

#### 1. Webhook (trigger)
```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "contact-form",
    "options": {}
  },
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2.1,
  "name": "Contact Form Webhook"
}
```

#### 2. Extract Form Data (Set node)
```json
{
  "parameters": {
    "assignments": {
      "assignments": [
        {"name": "name", "value": "={{ $json.body.name || $json.body.Name || '' }}", "type": "string"},
        {"name": "email", "value": "={{ $json.body.email || $json.body.Email || '' }}", "type": "string"},
        {"name": "message", "value": "={{ $json.body.message || $json.body.Message || '' }}", "type": "string"}
      ]
    }
  },
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "name": "Extract Form Data"
}
```

#### 3. Create Lead (Notion)
```json
{
  "parameters": {
    "resource": "databasePage",
    "databaseId": "3030e73ffadc80bcb9dde15f51a9caf2",
    "title": "={{ $json.name || 'Website Contact' }}",
    "propertiesUi": {
      "propertyValues": [
        {"key": "Email|email", "emailValue": "={{ $json.email }}"},
        {"key": "Status|select", "selectValue": "Lead - Laylo"},
        {"key": "Lead Source|select", "selectValue": "Website"},
        {"key": "Payment Amount|number", "numberValue": 0}
      ]
    }
  },
  "type": "n8n-nodes-base.notion",
  "typeVersion": 2.2,
  "name": "Create Contact Lead",
  "onError": "continueRegularOutput"
}
```

#### 4. Send Calendly Link (Email)

Use Frankie template #1 from `email-templates-frankie.md`, modified:
- Subject: `Thanks for reaching out — let's talk`
- Body: Acknowledge their message, invite them to book a call
- From: `hello@creativehotline.com`

#### 5. Team Notification (Email)
- From: `notifications@creativehotline.com`
- To: `jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com`
- Subject: `New website contact: {{ $json.name }}`
- Include their message in the body so the team can follow up

**Connection map:**
```
Contact Form Webhook → Extract Form Data → Create Contact Lead → Send Calendly Link → Team Notification
```

### Active Workflow Count

This would be workflow #8. Current count is 7 active on the Pro plan (no limit). No issue.

---

## Option C: Embed Calendly on Contact Page

Replace or supplement the contact form with an embedded Calendly widget.

**In Webflow:**
1. Add an Embed element to the contact page
2. Paste: `<div class="calendly-inline-widget" data-url="https://calendly.com/soscreativehotline/creative-hotline-call" style="min-width:320px;height:700px;"></div><script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>`

**Pros:** Customers book directly without leaving the site
**Cons:** Still need the form for "just asking a question" inquiries

---

## Recommendation

**Do both Option A + C:**
1. Embed Calendly widget on the contact page (primary CTA)
2. Keep the text form below it for general inquiries
3. Redirect form submissions to Calendly as a fallback

**Later:** Build Option B (the n8n webhook) to capture form data in Notion. This is lower priority than fixing the core pipeline.
