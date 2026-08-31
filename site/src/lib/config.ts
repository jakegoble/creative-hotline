/**
 * Centralized environment variable access.
 * Server-side keys (no NEXT_PUBLIC_ prefix) are only available in API routes.
 * NEXT_PUBLIC_DEMO_MODE is the only client-readable env var.
 */

export const config = {
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",

  notion: {
    apiKey: process.env.NOTION_API_KEY ?? "",
    paymentsDbId:
      process.env.NOTION_PAYMENTS_DB ?? "3030e73f-fadc-8029-9357-000b74a5a2f7",
    intakeDbId:
      process.env.NOTION_INTAKE_DB ?? "2f60e73f-fadc-80fb-beb5-000bdddbc915",
    sessionsDbId:
      process.env.NOTION_SESSIONS_DB ?? "0003001f-6446-4f0e-ae9b-fed8887cc0a3",
    /** Messaging Contacts data source — backs the SMS keyword + drip pipeline. */
    messagingDbId:
      process.env.NOTION_MESSAGING_DB ?? "650da872-cd7b-4889-ba31-09b06cdacdf5",
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  },

  calendly: {
    apiKey: process.env.CALENDLY_API_KEY ?? "",
    orgUri: process.env.CALENDLY_ORG_URI ?? "",
    userUri: process.env.CALENDLY_USER_URI ?? "",
    /**
     * Webhook signing key. Returned by Calendly when you create the webhook
     * subscription via POST /webhook_subscriptions (NOT the same as your
     * personal access token). Stored verbatim — used as the HMAC secret.
     */
    webhookSecret: process.env.CALENDLY_WEBHOOK_SECRET ?? "",
  },

  calcom: {
    /**
     * Webhook signing secret. Unlike Calendly, this is a value WE choose and
     * paste into the webhook's Secret field in Cal.com (Settings → Developer →
     * Webhooks). Cal.com uses it verbatim as the HMAC-SHA256 key over the raw
     * request body, and sends the digest in `x-cal-signature-256`.
     *
     * Leave the Cal.com-side field blank and no signature header is sent at
     * all — our verifier fails closed in that case, on purpose.
     */
    webhookSecret: process.env.CALCOM_WEBHOOK_SECRET ?? "",
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  },

  n8n: {
    baseUrl:
      process.env.N8N_BASE_URL ?? "https://creativehotline.app.n8n.cloud",
    apiKey: process.env.N8N_API_KEY ?? "",
  },

  manychat: {
    apiKey: process.env.MANYCHAT_API_KEY ?? "",
    /** Shared secret ManyChat sends (header `x-manychat-secret` or body.secret)
     *  to authenticate calls to /api/manychat/frankie. If unset, the endpoint
     *  allows all callers — set it in prod so randos can't burn Claude tokens. */
    webhookSecret: process.env.MANYCHAT_WEBHOOK_SECRET ?? "",
  },

  fireflies: {
    apiKey: process.env.FIREFLIES_API_KEY ?? "",
  },

  /**
   * Google Drive service account, used by the Megha sync crons.
   *
   * Service account rather than interactive OAuth on purpose: the n8n version
   * used a personal OAuth credential that rotted silently and took the sync
   * down for months without anyone noticing. A service account has no session
   * to expire.
   *
   * GOOGLE_PRIVATE_KEY is stored with escaped \n, since Vercel env vars cannot
   * hold literal newlines. It is unescaped at use.
   *
   * **The folders must be shared with the service-account email.** A service
   * account sees nothing in Drive until you explicitly share with it.
   */
  googleDrive: {
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
    privateKey: process.env.GOOGLE_PRIVATE_KEY ?? "",
  },

  /** Megha ↔ Jake daily sync. Replaces the three dead n8n Drive workflows. */
  meghaSync: {
    /** Folder watched for changes. Defaults to "THE CREATIVE HOTLINE - MEGHA
     *  FILES", the folder Megha actually uses. The n8n version watched
     *  "DAILY UPDATES", which has held one file since March 2026. */
    driveFolderId:
      process.env.MEGHA_DRIVE_FOLDER_ID ?? "10oNe8vQC11ggsOQZyNV_2fRnqhN8lkPN",
    /** Where the evening job writes JAKE-UPDATE-<date>. Defaults to the
     *  "DAILY UPDATES" folder, which is what the n8n evening job used and the
     *  one part of the original design that worked. */
    driveWriteFolderId:
      process.env.MEGHA_DRIVE_WRITE_FOLDER_ID ?? "1lclljpPUIwGmCkb5vH8uhfP1WEof38QI",
    /** Notion parent page that briefings are created under. Unset means the
     *  sync still runs and returns its summary in the response, but writes
     *  nothing to Notion. */
    notionParentPageId: process.env.NOTION_MEGHA_SYNC_PARENT ?? "",
    /** "System State — Live Snapshot", read by the evening job for context. */
    systemStatePageId:
      process.env.NOTION_SYSTEM_STATE_PAGE ?? "31d0e73f-fadc-8135-881e-d31a78182194",
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY ?? "",
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    /** E.164 format, e.g. +14137674332 (the TCH hotline number). */
    fromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  },

  tally: {
    /** HMAC secret used to verify inbound Tally webhook signatures.
     *  Configured per-form in the Tally Integrations panel; the same value
     *  must be set as TALLY_WEBHOOK_SECRET in Vercel. */
    webhookSecret: process.env.TALLY_WEBHOOK_SECRET ?? "",
    /** If true, skip HMAC verification on inbound Tally webhooks. Only set in
     *  local dev when there's no secret configured. Production must have
     *  the secret set; otherwise verification fails closed. */
    allowUnsigned: process.env.TALLY_ALLOW_UNSIGNED === "true",
  },

  /** V2 Frankie onboarding emails — off by default until SendGrid is verified. */
  frankieEmails: {
    enabled: process.env.ENABLE_FRANKIE_EMAILS === "true",
    /** Calendly product URLs by Stripe product mapping (Batch 2 wire-up). */
    calendlyUrls: {
      firstCall: process.env.CALENDLY_URL_FIRST_CALL ?? "",
      singleCall: process.env.CALENDLY_URL_SINGLE_CALL ?? "",
      clarityBundle: process.env.CALENDLY_URL_CLARITY_BUNDLE ?? "",
    },
    /** Tally intake URL (prefilled with email at send time). Fallback uses the
     *  Creative Hotline Intake form ID (b5W1JE) — must match if TALLY_INTAKE_URL
     *  env var is unset. The bare "/intake" path 404s. */
    tallyUrl: process.env.TALLY_INTAKE_URL ?? "https://tally.so/r/b5W1JE",
    /** Service agreement hosted URL — populated when Megha approves draft.
     *  Default points at our Vercel-hosted working-draft page so the link
     *  always resolves; override via env var to point at the Webflow page
     *  (or a different hosted URL) once final legal copy is published. */
    serviceAgreementUrl:
      process.env.SERVICE_AGREEMENT_URL ?? "https://api.thecreativehotline.com/legal/creative-hotline-service-agreement.html",
    /** Base URL for the hosted caller-prep one-pager. Frankie #3 (the
     *  night-before email) appends `?sessionId=<id>` so the page renders
     *  personalized for the client. Override with CALLER_PREP_BASE_URL to
     *  point at a different host if needed. */
    callerPrepBaseUrl:
      process.env.CALLER_PREP_BASE_URL ?? "https://api.thecreativehotline.com/templates-v2/caller-prep.html",
  },
} as const;

type ServiceKey =
  | "notion"
  | "stripe"
  | "calendly"
  | "anthropic"
  | "n8n"
  | "manychat"
  | "fireflies";

const SERVICE_KEY_MAP: Record<ServiceKey, string> = {
  notion: config.notion.apiKey,
  stripe: config.stripe.secretKey,
  calendly: config.calendly.apiKey,
  anthropic: config.anthropic.apiKey,
  n8n: config.n8n.apiKey,
  manychat: config.manychat.apiKey,
  fireflies: config.fireflies.apiKey,
};

/** Check whether a service has its API key configured. */
export function isConfigured(service: ServiceKey): boolean {
  return SERVICE_KEY_MAP[service].length > 0;
}
