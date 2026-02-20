# Creative Hotline — Customer Email Templates (Frankie Voice)

All customer-facing emails send from `hello@creativehotline.com`. Team notifications send from `notifications@creativehotline.com`. Every template below is production-ready HTML for n8n `emailSend` nodes with `emailFormat: "html"`.

---

## 1. Calendly Link Email

**Workflow:** WF1 — Stripe Purchase → Calendly (`AMSvlokEAFKvF_rncAFte`)
**Trigger:** Immediately after Stripe payment
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $('Extract Data').item.json.email }}` |
| subject | `Let's get your call on the books` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Let's get your call on the books</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $('Extract Data').item.json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">This is Frankie. You just locked in your Creative Hotline call, and I'm genuinely glad you did.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Here's the only thing you need to do right now: pick a time that works for you. It's a 45-minute call, and we'll make every minute count.</p>
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">Once you book, I'll send you a short intake form so we can come prepared and skip the small talk.</p>
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #FF6B35;">
                    <a href="https://calendly.com/soscreativehotline/creative-hotline-call" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Pick Your Time</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Talk soon,<br>Frankie</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.5;">The Creative Hotline<br>Questions? Just reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Booking Reminder

**Workflow:** WF5 — Paid But Never Booked (`clCnlUW1zjatRHXE`)
**Trigger:** Daily 9am schedule, filters for "Paid - Needs Booking" status 48+ hours old
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Your call's waiting on you` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your call's waiting on you</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Just a quick heads-up — you paid for your Creative Hotline call about {{ $json.hours_ago }} hours ago, but I don't see a booking yet.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">No rush, no pressure. But the sooner you get on the calendar, the sooner we can dig into your creative problem and build you an action plan.</p>
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">Spots fill up week to week, so grab one while you're thinking about it.</p>
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #FF6B35;">
                    <a href="https://calendly.com/soscreativehotline/creative-hotline-call" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Book Your Call</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">If something came up or you have questions, just reply here. I'm around.</p>
              <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.5;">The Creative Hotline<br>Questions? Just reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Intake Reminder

**Workflow:** WF6 — Booked But No Intake (`Esq2SMGEy6LVHdIQ`)
**Trigger:** Daily 8am schedule, filters for "Booked - Needs Intake" status with call within 24 hours
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Quick thing before our call` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quick thing before our call</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Your call is coming up in about {{ $json.hours_until_call }} hours, and I noticed we haven't gotten your intake form yet.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">It takes about 5 minutes. It's how we skip the "so tell me about yourself" warmup and get straight into the work. The more context you give us, the sharper your action plan will be.</p>
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">Can you fill it out before the call?</p>
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #FF6B35;">
                    <a href="https://tally.so/r/b5W1JE" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Fill Out the Intake</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Thanks — see you on the call.</p>
              <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.5;">The Creative Hotline<br>Questions? Just reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Lead Nurture

**Workflow:** WF7 — Laylo Lead Nurture (`VYCokTqWGAFCa1j0`)
**Trigger:** Daily 10am schedule, filters for "Lead - Laylo" status 3-7 days old
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Still thinking about it?` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Still thinking about it?</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie from The Creative Hotline. You signed up a few days ago, and I wanted to make sure you got the full picture.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Here's what this actually is: one 45-minute call where we dig into whatever creative problem is keeping you stuck. No fluff, no framework decks, no "let's circle back." Just honest direction from people who do this every day.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Within 24 hours after the call, you get a custom action plan — the specific steps, in order, so you know exactly what to do next.</p>
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">If you're on the fence, take a look. If it's not for you right now, no hard feelings at all.</p>
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #FF6B35;">
                    <a href="https://www.thecreativehotline.com" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">See What We Do</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Either way, glad you found us.</p>
              <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.5;">The Creative Hotline<br>You're receiving this because you signed up via Instagram. Reply to opt out anytime.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 5. Post-Call Thank You

**Workflow:** WF9 (rebuild) — Post-Call Follow-Up (`9mct9GBz3R-EjTgQOZcPt`)
**Trigger:** After call is marked complete (status changed to "Call Complete")
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Your action plan is on the way` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your action plan is on the way</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. That was a good call. Appreciate you being open and bringing real questions to the table — that's how the best sessions happen.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Your custom action plan is being put together now. You'll have it in your inbox within 24 hours. It'll lay out the specific next steps we talked through, in the order that makes sense, so you can move on it right away.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">In the meantime, if anything from the call is already rattling around in your head, write it down. Fresh instincts are worth keeping.</p>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Talk soon,<br>Frankie</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.5;">The Creative Hotline<br>Questions? Just reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 6. Action Plan Delivered

**Workflow:** WF9 (rebuild) — Post-Call Follow-Up (`9mct9GBz3R-EjTgQOZcPt`)
**Trigger:** After Action Plan Sent checkbox is marked true in Intake DB
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Your action plan just landed` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your action plan just landed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Your action plan is here. Everything we discussed on the call — distilled, prioritized, and ready for you to run with.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Read through it once to get the full picture. Then start with step one. That's it. Don't try to do everything at once.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">If anything's unclear, or you hit a wall, or you just want to talk through how something's going — reply to this email. That's what I'm here for.</p>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Go make something good,<br>Frankie</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.5;">The Creative Hotline<br>Questions? Just reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 7. Team Notification Template (Internal)

**Workflow:** Used across all workflows for team alerts
**Sender:** `notifications@creativehotline.com`
**Recipients:** `jake@radanimal.co`, `megha@theanecdote.co`, `soscreativehotline@gmail.com`

This is NOT Frankie voice. It is a clean, scannable internal notification. The template below is a generic structure — each workflow should populate the subject, event type, and data fields relevant to that trigger.

**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `notifications@creativehotline.com` |
| toEmail | `jake@radanimal.co, megha@theanecdote.co, soscreativehotline@gmail.com` |
| subject | (varies per workflow — see examples below) |
| emailFormat | `html` |

**Subject line examples by workflow:**

| Workflow | Subject |
|----------|---------|
| WF1 — Stripe Purchase | `New payment: {{ $('Extract Data').item.json.name }}` |
| WF2 — Calendly Booking | `New booking: {{ $json.name }} on {{ $json.call_date }}` |
| WF3 — Tally Intake | `Intake submitted: {{ $json.name }}` |
| WF3 — Upsell Detected | `Upsell opportunity: {{ $json.name }}` |
| WF4 — Laylo Subscriber | `New IG subscriber: {{ $json.email }}` |
| WF5 — Stale Booking | `Stale booking alert: {{ $json.name }} ({{ $json.hours_ago }}hrs)` |
| WF6 — Missing Intake | `Missing intake: {{ $json.name }} — call in {{ $json.hours_until_call }}hrs` |
| WF7 — Lead Nurture Sent | `Lead nurture sent: {{ $json.name }}` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f0f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f0f0;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; background-color: #1a1a1a;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">Creative Hotline — Team Alert</p>
            </td>
          </tr>
          <!-- Event Type -->
          <tr>
            <td style="padding: 28px 32px 8px 32px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #1a1a1a;">{{ EVENT_TYPE }}</h1>
            </td>
          </tr>
          <!-- Data Table -->
          <tr>
            <td style="padding: 16px 32px 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #666666; background-color: #fafafa; border-bottom: 1px solid #e5e5e5; width: 140px;">Name</td>
                  <td style="padding: 10px 16px; font-size: 14px; color: #1a1a1a; background-color: #fafafa; border-bottom: 1px solid #e5e5e5;">{{ $json.name }}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #666666; border-bottom: 1px solid #e5e5e5; width: 140px;">Email</td>
                  <td style="padding: 10px 16px; font-size: 14px; color: #1a1a1a; border-bottom: 1px solid #e5e5e5;">{{ $json.email }}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #666666; background-color: #fafafa; border-bottom: 1px solid #e5e5e5; width: 140px;">Status</td>
                  <td style="padding: 10px 16px; font-size: 14px; color: #1a1a1a; background-color: #fafafa; border-bottom: 1px solid #e5e5e5;">{{ $json.status }}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #666666; border-bottom: 1px solid #e5e5e5; width: 140px;">Product</td>
                  <td style="padding: 10px 16px; font-size: 14px; color: #1a1a1a; border-bottom: 1px solid #e5e5e5;">{{ $json.product }}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #666666; background-color: #fafafa; border-bottom: 1px solid #e5e5e5; width: 140px;">Amount</td>
                  <td style="padding: 10px 16px; font-size: 14px; color: #1a1a1a; background-color: #fafafa; border-bottom: 1px solid #e5e5e5;">${{ $json.amount }}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #666666; width: 140px;">Timestamp</td>
                  <td style="padding: 10px 16px; font-size: 14px; color: #1a1a1a;">{{ $now.format('MMM d, yyyy h:mm a') }}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Additional Context (optional — use when workflow provides extra info) -->
          <!--
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <div style="padding: 16px; background-color: #fff8f0; border-left: 4px solid #FF6B35; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; font-size: 14px; color: #333333; line-height: 1.5;"><strong>Note:</strong> {{ ADDITIONAL_CONTEXT }}</p>
              </div>
            </td>
          </tr>
          -->
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.5;">Sent automatically by The Creative Hotline automation</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Workflow-specific customization notes:**

For each workflow, replace `{{ EVENT_TYPE }}` and adjust the data table rows as needed:

| Workflow | EVENT_TYPE | Key Data Rows |
|----------|-----------|---------------|
| WF1 — Payment | New Payment Received | Name, Email, Amount, Product, Phone |
| WF2 — Booking | New Call Booked | Name, Email, Call Date, Calendly Link |
| WF3 — Intake | Intake Form Submitted | Name, Email, Brand, Creative Emergency, AI Summary |
| WF3 — Upsell | Upsell Opportunity Detected | Name, Email, Creative Emergency, AI Summary (flag reason) |
| WF4 — Subscriber | New Instagram Subscriber | Email, Phone, Lead Source |
| WF5 — Stale | Stale Booking — Action Needed | Name, Email, Hours Since Payment, Status |
| WF6 — Missing Intake | Missing Intake — Call Soon | Name, Email, Hours Until Call, Call Date |
| WF7 — Nurture | Lead Nurture Email Sent | Name, Email, Days Since Signup |

---

## Implementation Notes

1. **n8n expression syntax:** All `{{ }}` expressions in these templates use n8n's built-in expression format. They reference the output of upstream nodes. Verify node names match your workflow exactly before deploying.

2. **SMTP credential:** All emailSend nodes should use SMTP credential ID `yJP76JoIqqqEPbQ9`.

3. **Known issues to fix before deploying:**
   - WF1 currently sends from `jake@radanimal.co` — update to `hello@creativehotline.com`
   - WF3 upsell alert sends from `soscreativehotline@gmail.com` — update to `notifications@creativehotline.com`
   - WF6 Tally form URL is a placeholder (`YOUR_TALLY_FORM_ID`) — now corrected to `b5W1JE` in the template above
   - WF7 "Learn More" links to `soscreativehotline.com` (dead) — now corrected to `www.thecreativehotline.com` in the template above

4. **Mobile rendering:** All templates use 600px max-width with percentage-based outer tables, inline CSS, and `role="presentation"` on layout tables. They will render correctly in Gmail, Apple Mail, Outlook 365, and Yahoo Mail.

5. **Brand consistency:** Background color `#f7f5f2` (warm off-white), button color `#FF6B35` (brand orange), body text `#333333`, headings `#1a1a1a`. No images or external assets — these templates are self-contained.
