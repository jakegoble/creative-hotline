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

  return `
    <div style="font-family:'JetBrains Mono','Courier New',monospace;background:#FFF8F0;padding:32px 24px;color:#1B1B1B">
      <div style="max-width:560px;margin:0 auto;background:#FFFFFF;padding:32px 28px;border-radius:8px;border:1px solid #1B1B1B">
        ${paragraphs.join("\n        ")}
        <hr style="border:none;border-top:1px solid #E6E6E6;margin:24px 0">
        <p style="margin:0;font-size:13px;color:#666;line-height:1.4">
          ☎️ <strong>The Creative Hotline</strong><br>
          <a href="https://thecreativehotline.com" style="color:#666;text-decoration:none">thecreativehotline.com</a><br>
          <em>Stop spiraling. Start creating.</em>
        </p>
      </div>
    </div>
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
    const [response] = await sgMail.send({
      to: input.to,
      from: SENDER,
      replyTo: input.replyTo ?? SENDER.email,
      subject: input.subject,
      text,
      html,
      categories: input.categories,
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
 * Health check — verify SendGrid is reachable + key valid.
 * Used by the existing /api/health endpoint pattern.
 */
export async function ping(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  const apiKey = getSendGridKey();
  if (!apiKey) return { ok: false, latency: 0 };
  try {
    // SendGrid doesn't have a dedicated ping endpoint; we check the key by
    // hitting the senders list endpoint (cheap, no side effects).
    const res = await fetch("https://api.sendgrid.com/v3/senders", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return { ok: res.ok, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}

// We export config too so consumers don't need to know SENDER's shape.
export { SENDER, config };
