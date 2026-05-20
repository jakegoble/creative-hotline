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
  },

  fireflies: {
    apiKey: process.env.FIREFLIES_API_KEY ?? "",
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
