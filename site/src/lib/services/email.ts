/**
 * Email service — SendGrid wrapper for transactional sends from Frankie.
 *
 * V2 Batch 2 scaffold. Uses @sendgrid/mail. Sends ALL fail-soft (return ok=false
 * with reason) so a downstream caller can decide whether to retry — we never
 * crash the calling Stripe webhook or API route on a SendGrid blip.
 *
 * Setup blockers (still open as of 2026-05-08):
 * 1. SendGrid sender verification: hello@thecreativehotline.com must be clicked
 *    through (verification link sent by SendGrid).
 * 2. DNS: s2._domainkey CNAME must resolve (currently 504).
 * 3. May 15, 2026: trial expires. Decide on plan tier before then.
 *
 * Until those clear, every send returns `{ ok: false, reason: "not_configured" }`.
 */

import { config } from "../config";

/** Frankie's sender identity. Hard-coded — never override per-call. */
const SENDER = {
  email: "hello@thecreativehotline.com",
  name: "Frankie · The Creative Hotline",
} as const;

export interface SendResult {
  ok: boolean;
  /** SendGrid message ID if sent. */
  messageId?: string;
  /** Failure reason if not ok. */
  reason?: string;
  /** Raw error if any (for logging). */
  error?: unknown;
}

export interface SendAttachment {
  /** Raw file bytes. Will be base64-encoded inside the SendGrid payload. */
  content: Buffer;
  /** Filename shown in the recipient's mail client (e.g. "service-agreement.pdf"). */
  filename: string;
  /** MIME type (e.g. "application/pdf"). */
  type: string;
  /** Disposition. Default "attachment". Use "inline" only for CID-referenced images. */
  disposition?: "attachment" | "inline";
}

export interface SendInput {
  to: string;
  subject: string;
  /** Markdown body. We render to HTML + plaintext below. */
  bodyMarkdown: string;
  /** Inbox preview text (not visible in body). */
  previewText?: string;
  /** Optional reply-to override. Defaults to SENDER. */
  replyTo?: string;
  /** Optional categories for SendGrid analytics. */
  categories?: string[];
  /** Optional file attachments (PDFs, etc.). Base64-encoded for SendGrid below. */
  attachments?: SendAttachment[];
}

/**
 * Get SendGrid configured key from env. Missing or empty → not configured.
 */
function getSendGridKey(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const key = (process.env.SENDGRID_API_KEY as string | undefined) ?? "";
  return key.length > 0 ? key : null;
}

/**
 * Crude markdown → HTML converter. Handles the subset Frankie's templates use:
 * paragraphs, bold (**), italic (*), links, single line breaks. For anything
 * fancier, replace with a real lib later (marked / remark).
 */
function markdownToHtml(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withInline = escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" style="color:#E63946">$1</a>',
    );

  // Paragraph split on blank lines, line-break on single newlines.
  const paragraphs = withInline.split(/\n{2,}/).map((p) => {
    const lines = p.split("\n").join("<br>");
    return `<p style="margin:0 0 16px 0;line-height:1.55;font-size:16px;color:#1B1B1B">${lines}</p>`;
  });

  // Table-based wrapper for reliable centering across email clients (Gmail
  // ignores `margin:0 auto` on divs in some viewports — tables with align=
  // "center" are the canonical email-safe centering pattern).
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#FFF8F0;font-family:'JetBrains Mono','Courier New',monospace;color:#1B1B1B">
      <tr>
        <td align="center" style="padding:32px 24px">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:8px;border:1px solid #1B1B1B">
            <tr>
              <td style="padding:32px 28px">
                ${paragraphs.join("\n                ")}
                <hr style="border:none;border-top:1px solid #E6E6E6;margin:24px 0">
                <p style="margin:0;font-size:13px;color:#666;line-height:1.4">
                  ☎️ <strong>The Creative Hotline</strong><br>
                  <a href="https://thecreativehotline.com" style="color:#666;text-decoration:none">thecreativehotline.com</a><br>
                  <em>Stop spiraling. Start creating.</em>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Send a transactional email via SendGrid. Fail-soft.
 */
export async function sendEmail(input: SendInput): Promise<SendResult> {
  const apiKey = getSendGridKey();
  if (!apiKey) {
    return { ok: false, reason: "not_configured" };
  }

  // Lazy import — keeps dep optional if SendGrid isn't wired yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sgMail: any;
  try {
    const mod = await import("@sendgrid/mail");
    sgMail = mod.default ?? mod;
  } catch {
    return { ok: false, reason: "sendgrid_module_missing" };
  }

  sgMail.setApiKey(apiKey);

  const html = markdownToHtml(input.bodyMarkdown);
  const text = input.bodyMarkdown
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  try {
    // SendGrid attachments are base64-encoded strings — never raw Buffers.
    const attachmentsPayload = input.attachments?.length
      ? input.attachments.map((att) => ({
          content: att.content.toString("base64"),
          filename: att.filename,
          type: att.type,
          disposition: att.disposition ?? "attachment",
        }))
      : undefined;

    const [response] = await sgMail.send({
      to: input.to,
      from: SENDER,
      replyTo: input.replyTo ?? SENDER.email,
      subject: input.subject,
      text,
      html,
      categories: input.categories,
      ...(attachmentsPayload ? { attachments: attachmentsPayload } : {}),
      mailSettings: { sandboxMode: { enable: false } },
      ...(input.previewText
        ? { customArgs: { preview_text: input.previewText } }
        : {}),
    });

    const messageId = response.headers["x-message-id"] as string | undefined;
    return { ok: true, messageId };
  } catch (err) {
    return {
      ok: false,
      reason: "sendgrid_error",
      error: err,
    };
  }
}

/**
 * Health check — verify SendGrid can actually SEND, without delivering mail.
 * Used by the existing /api/health endpoint pattern.
 *
 * We validate via SendGrid SANDBOX MODE: a POST to /v3/mail/send with
 * `mail_settings.sandbox_mode.enable = true` runs SendGrid's full validation
 * (auth + verified sender + payload) and returns 2xx WITHOUT sending anything.
 *
 * Why not the old GET /v3/senders probe: a restricted "Mail Send"-scoped API
 * key (the recommended least-privilege key for transactional sending) gets a
 * 403 on /v3/senders even though it sends mail perfectly. That produced a
 * FALSE "down" on the health dashboard while real handoff/confirmation emails
 * delivered fine. The sandbox send is scope-accurate — it answers the only
 * question that matters: "can this key send right now?".
 */
export async function ping(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  const apiKey = getSendGridKey();
  if (!apiKey) return { ok: false, latency: 0 };
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: SENDER.email }] }],
        from: { email: SENDER.email, name: SENDER.name },
        subject: "healthcheck",
        content: [{ type: "text/plain", value: "ping" }],
        // Validate only — SendGrid does NOT deliver when sandbox mode is on.
        mail_settings: { sandbox_mode: { enable: true } },
      }),
    });
    return { ok: res.ok, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}

// We export config too so consumers don't need to know SENDER's shape.
export { SENDER, config };
