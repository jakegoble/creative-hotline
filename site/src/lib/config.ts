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
      process.env.NOTION_PAYMENTS_DB ?? "3030e73ffadc80bcb9dde15f51a9caf2",
    intakeDbId:
      process.env.NOTION_INTAKE_DB ?? "2f60e73ffadc806bbf5ddca2f5c256a3",
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  },

  calendly: {
    apiKey: process.env.CALENDLY_API_KEY ?? "",
    orgUri: process.env.CALENDLY_ORG_URI ?? "",
    userUri: process.env.CALENDLY_USER_URI ?? "",
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929",
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
