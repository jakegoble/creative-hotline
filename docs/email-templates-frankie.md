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

## 8. Payment Receipt / Welcome

**Workflow:** WF1 — Stripe Purchase → Calendly (future addition)
**Trigger:** Immediate after Stripe payment, sent before Calendly link
**Purpose:** Confirms payment received, sets expectations for the process
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $('Extract Data').item.json.email }}` |
| subject | `You're in — here's what happens next` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're in</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $('Extract Data').item.json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Your payment just came through — you're officially on the books. Here's the quick rundown of what happens from here:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td style="padding: 12px 0; font-size: 16px; line-height: 1.6; color: #333333; border-bottom: 1px solid #eee;"><strong>Step 1:</strong> Book your 45-minute call (link coming in a separate email)</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-size: 16px; line-height: 1.6; color: #333333; border-bottom: 1px solid #eee;"><strong>Step 2:</strong> Fill out a 5-minute intake form so we can prep</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-size: 16px; line-height: 1.6; color: #333333;"><strong>Step 3:</strong> Show up. We dig in. You leave with a clear plan.</td>
                </tr>
              </table>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Simple as that. Check your inbox for the booking link — it should arrive any second.</p>
              <p style="margin: 20px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #999999;">Payment: ${{ $('Extract Data').item.json.amount }} received</p>
            </td>
          </tr>
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

## 9. Booking Confirmation

**Workflow:** WF2 — Calendly Booking → Payments Update (future addition)
**Trigger:** Immediately after Calendly booking is confirmed
**Purpose:** Brand-voice confirmation (supplements Calendly's generic confirmation)
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `You're on the calendar` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the calendar</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Just saw your booking come through — nice.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">One thing that'll make this call way better: fill out the intake form before we meet. It takes about 5 minutes and means we skip the warmup and get straight to work.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #FF6B35;">
                    <a href="https://tally.so/r/b5W1JE" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Fill Out the Intake</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">See you on the call.</p>
              <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
            </td>
          </tr>
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

## 10. Follow-Up Nudge (7 Days Post-Action Plan)

**Workflow:** Future — not yet built
**Trigger:** 7 days after Action Plan Sent = true
**Purpose:** Check in on progress, open door for follow-up session
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `How's it going?` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How's it going?</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. It's been about a week since your action plan landed. Just checking in — how's it going?</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">If you've started executing, that's great. If you haven't yet, that's fine too — life happens. The plan isn't going anywhere.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">If you've hit a snag, or new questions came up, or the plan needs adjusting now that you're in the weeds — just reply to this email. Sometimes a quick back-and-forth is all it takes to get unstuck again.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">And if you're ready for a deeper dive, you can always book another session.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #FF6B35;">
                    <a href="https://www.thecreativehotline.com" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Book Another Session</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Either way, go make something good.</p>
              <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
            </td>
          </tr>
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

## 11. Intake Confirmation

**Workflow:** WF3 — Tally Intake → Claude Analysis (future addition)
**Trigger:** Immediately after Tally form submission is processed
**Purpose:** Confirm intake was received, build anticipation for the call
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Got it — already have ideas` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Got it — already have ideas</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Your intake form just came through — thank you for being thorough. Seriously, the more you give us, the better your call is going to be.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">We're already reviewing what you shared. By the time we get on the call, we'll have done our homework so we can skip the surface-level stuff and get right into the work.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Nothing else you need to do right now. Just show up ready to talk — we'll handle the rest.</p>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Talk soon,<br>Frankie</p>
            </td>
          </tr>
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

## 12. Pre-Call Prep

**Workflow:** Future — triggered day before call (needs call date logic)
**Trigger:** 24 hours before scheduled call date
**Purpose:** Help client prepare, improve call quality
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Tomorrow's call — here's how to get the most out of it` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tomorrow's call</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Your call is tomorrow and we've already reviewed your intake. Wanted to share a few things that'll help us make the most of the 45 minutes.</p>
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.6; color: #1a1a1a;">Quick prep list:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333; border-bottom: 1px solid #eee;">Have your laptop or phone handy — we might look at your site or IG together</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333; border-bottom: 1px solid #eee;">Bring one example of something in your space that you love (a competitor, a campaign, a brand that nails it)</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333; border-bottom: 1px solid #eee;">Think about the ONE thing that would make the biggest difference if you figured it out tomorrow</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333;">Have a pen and paper nearby — you'll want to jot things down</td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">That's it. No homework, no pre-reading. Just come as you are with those few things in mind.</p>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">See you on the call,<br>Frankie</p>
            </td>
          </tr>
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

## 13. 30-Day Check-In

**Workflow:** Future — not yet built
**Trigger:** 30 days after Action Plan Sent = true
**Purpose:** Close the loop, gather outcome data, open door for rebooking
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `It's been a month — what happened?` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>It's been a month</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. It's been about a month since your action plan landed and I'm genuinely curious — what happened?</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Did you launch the thing? Did the rebrand come together? Did you scrap step three and do something better instead? Any of those would be great to hear.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">This isn't a pitch — I just like knowing how things turned out. If you have 30 seconds, hit reply and let me know. Even one sentence is great.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">And if you've got a new problem on your plate, you know where to find us.</p>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
            </td>
          </tr>
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

## 14. Testimonial Request

**Workflow:** Future — not yet built
**Trigger:** 14-21 days after Action Plan Sent = true
**Purpose:** Collect social proof for website and marketing
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Quick favor (takes 30 seconds)` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quick favor</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. If the call and action plan helped, I have a small ask — would you write a sentence or two about the experience?</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Nothing fancy. Literally what you'd text a friend if they asked "was it worth it?" That's the kind of honest feedback that actually helps other people decide if this is for them.</p>
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">Just hit reply with your thoughts. First name and what you do is all we'd use alongside it — no last names, no pressure.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">If it didn't help, I'd honestly want to know that too. Either way, thanks for trying us out.</p>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
            </td>
          </tr>
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

## 15. Referral Ask

**Workflow:** Future — not yet built
**Trigger:** 21-30 days after Action Plan Sent = true (after testimonial request)
**Purpose:** Drive referrals, reward existing clients
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Know someone who's stuck?` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Know someone who's stuck?</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Quick one — if you know someone who's stuck on a creative problem and could use a clear plan, send them our way.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Just forward them the link below. If they book a call, you get $50 off your next session with us. No codes, no hoops — we'll handle it.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #FF6B35;">
                    <a href="https://www.thecreativehotline.com" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Share The Creative Hotline</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">No pressure at all. Just figured if it helped you, it might help someone in your circle too.</p>
              <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
            </td>
          </tr>
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

## 16. Sprint Session 1 Recap

**Workflow:** Future — manual trigger or status-based
**Trigger:** After Sprint Session 1 is marked complete
**Purpose:** Recap session, set homework for Session 2
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Session 1 done — here's your homework` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session 1 done</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline — Sprint</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #FF6B35;">SESSION 1 OF 3 COMPLETE</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Good first session. We covered a lot of ground and now you've got a direction. Your action plan is being built and you'll have it within 24 hours.</p>
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.6; color: #1a1a1a;">Before Session 2, try to:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333; border-bottom: 1px solid #eee;">Start on step one from your action plan (even if it's rough)</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333; border-bottom: 1px solid #eee;">Write down any questions that come up as you dig in</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333;">Note what felt easy and what felt like a wall — we'll address both</td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Session 2 is where we get into execution — we'll look at what you've done, adjust the plan, and tackle the next layer. The more you've tried between now and then, the sharper that session will be.</p>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">See you next time,<br>Frankie</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.5;">The Creative Hotline — 3-Session Clarity Sprint<br>Questions between sessions? Just reply to this email.</p>
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

## 17. Sprint Session 2 Recap

**Workflow:** Future — manual trigger or status-based
**Trigger:** After Sprint Session 2 is marked complete
**Purpose:** Recap session, set up final session focus
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Session 2 done — one more to go` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session 2 done</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline — Sprint</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #FF6B35;">SESSION 2 OF 3 COMPLETE</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. We're deep in it now. Session 2 is usually where things start clicking — you can see the strategy coming together, and the things that felt fuzzy after Session 1 are sharpening up.</p>
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.6; color: #1a1a1a;">Before our final session:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333; border-bottom: 1px solid #eee;">Keep executing on the updated plan — focus on the items we flagged as highest-impact</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333; border-bottom: 1px solid #eee;">Think about what you want your 90-day roadmap to look like — we'll build it together in Session 3</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333;">Bring any early results — even small ones. They help us calibrate what's working.</td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Session 3 is the capstone — we'll finalize your strategy, build a 90-day roadmap, and make sure you leave with everything you need to keep moving without us. Your updated action plan will arrive within 24 hours.</p>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Almost there,<br>Frankie</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.5;">The Creative Hotline — 3-Session Clarity Sprint<br>Questions between sessions? Just reply to this email.</p>
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

## 18. Sprint Completion

**Workflow:** Future — after Session 3 action plan is delivered
**Trigger:** After Sprint Session 3 is marked complete + action plan sent
**Purpose:** Celebrate completion, deliver final summary, open door for future work
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Sprint complete — your 90-day roadmap is here` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sprint complete</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline — Sprint</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #FF6B35;">ALL 3 SESSIONS COMPLETE</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Three sessions down and you've got a full strategy, a tested action plan, and a 90-day roadmap. That's the whole package.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Your final action plan — with everything from all three sessions rolled into one document — is attached. It includes your 90-day roadmap with milestones so you can keep yourself on track without us hovering.</p>
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.6; color: #1a1a1a;">What you leave with:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333; border-bottom: 1px solid #eee;">Your complete action plan (all 3 sessions consolidated)</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333; border-bottom: 1px solid #eee;">90-day roadmap with month-by-month milestones</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 16px; line-height: 1.6; color: #333333;">Tools and resources tailored to your situation</td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">If you need a gut check 3 months from now, or a new problem comes up, or you just want to talk through how things are going — book a single session anytime. The door's always open.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #FF6B35;">
                    <a href="https://www.thecreativehotline.com" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Book a Future Session</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Go make something good,<br>Frankie</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.5;">The Creative Hotline — 3-Session Clarity Sprint<br>Questions? Just reply to this email.</p>
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

## 19. Sprint Upgrade Offer (Single Call → Sprint Credit)

**Workflow:** Future — triggered 14 days after single-call action plan delivery
**Trigger:** 14 days after Action Plan Sent = true AND product = First Call or Single Call
**Purpose:** Offer explicit upgrade path with first-call payment as credit toward Sprint
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Your call counts toward something bigger` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your call counts toward something bigger</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Quick heads-up on something I wanted you to know about.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">If your action plan surfaced more questions than answers — or if you started executing and realized the problem goes deeper than one call could cover — that's completely normal. Some problems need more than 45 minutes.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">The 3-Session Clarity Sprint exists for exactly that. Three sessions over 2-3 weeks — we go deeper into strategy, review your execution, and build you a 90-day roadmap.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Here's the thing: <strong>your first-call payment counts as credit toward the Sprint.</strong> So instead of $1,495, you'd pay the difference. Just reply to this email and I'll sort out the details.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">This offer's good for 15 days from your call. No pressure — if the single session gave you everything you needed, that's great too. Just wanted to make sure you knew the option was there.</p>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
            </td>
          </tr>
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

## 20. Value-Add (Pure Goodwill — Day 45-60)

**Workflow:** Future — not yet built
**Trigger:** 45-60 days after Action Plan Sent = true
**Purpose:** Keep the relationship warm with genuine value, no pitch
**n8n Node Fields:**

| Field | Value |
|-------|-------|
| fromEmail | `hello@creativehotline.com` |
| toEmail | `{{ $json.email }}` |
| subject | `Saw this and thought of you` |
| emailFormat | `html` |

**HTML Template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Saw this and thought of you</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #FF6B35;">The Creative Hotline</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey {{ $json.name }},</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Frankie here. Not selling you anything — just passing along something I think you'd find useful.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Based on what we talked about on your call, I thought this might be relevant to where you are right now:</p>
              <div style="padding: 20px; background-color: #faf8f5; border-left: 4px solid #FF6B35; border-radius: 0 6px 6px 0; margin: 0 0 20px 0;">
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">{{ $json.value_add_content }}</p>
              </div>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">Hope it helps. If you've got updates on how things are going, I'd genuinely love to hear. Just hit reply.</p>
              <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">— Frankie</p>
            </td>
          </tr>
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

**Implementation Note:** The `{{ $json.value_add_content }}` variable should be populated by a Claude API call that generates a relevant resource recommendation based on the client's Creative Emergency and Desired Outcome from their intake. Example output: "I came across [Tool Name] — it's a free tool that does exactly what we talked about for organizing your content calendar. Here's the link: [URL]. It takes about 10 minutes to set up."

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
