import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import type { HealthCheck } from "@/lib/types";
import * as notion from "@/lib/services/notion";
import * as stripe from "@/lib/services/stripe";
import * as calendly from "@/lib/services/calendly";
import * as claude from "@/lib/services/claude";
import * as manychat from "@/lib/services/manychat";
import * as fireflies from "@/lib/services/fireflies";
import * as email from "@/lib/services/email";
import * as twilio from "@/lib/services/twilio";

/** Service keys that the global isConfigured() knows about. */
type KnownServiceKey =
  | "notion"
  | "stripe"
  | "calendly"
  | "anthropic"
  | "n8n"
  | "manychat"
  | "fireflies";

interface ServiceDef {
  name: string;
  /** ServiceKey for the global isConfigured() check. Omit when the service is
   *  not in that union (sendgrid, twilio) and supply isConfiguredOverride. */
  key?: KnownServiceKey;
  ping?: () => Promise<{ ok: boolean; latency: number }>;
  message?: string;
  /** Override for services not yet in the global isConfigured() union. */
  isConfiguredOverride?: () => boolean;
}

const SERVICES: ServiceDef[] = [
  { name: "Notion", key: "notion", ping: notion.ping },
  { name: "Stripe", key: "stripe", ping: stripe.ping },
  { name: "Calendly", key: "calendly", ping: calendly.ping },
  { name: "Claude AI", key: "anthropic", ping: claude.ping, message: config.anthropic.model },
  { name: "n8n", key: "n8n", message: "5 workflows active" },
  { name: "ManyChat", key: "manychat", ping: manychat.ping },
  { name: "Fireflies", key: "fireflies", ping: fireflies.ping },
  {
    name: "SendGrid",
    ping: email.ping,
    isConfiguredOverride: () => config.sendgrid.apiKey.length > 0,
  },
  {
    name: "Twilio",
    ping: twilio.ping,
    message: config.twilio.fromNumber || "Connected",
    isConfiguredOverride: () =>
      config.twilio.accountSid.length > 0 &&
      config.twilio.authToken.length > 0 &&
      config.twilio.fromNumber.length > 0,
  },
  {
    name: "Tally",
    // No ping (Tally has no live status endpoint we control) — surface
    // configured-vs-not so a missing TALLY_WEBHOOK_SECRET shows up here
    // instead of silently failing form submissions in production.
    message: "Form webhook configured",
    isConfiguredOverride: () => config.tally.webhookSecret.length > 0,
  },
];

function isServiceConfigured(svc: ServiceDef): boolean {
  if (svc.isConfiguredOverride) return svc.isConfiguredOverride();
  if (svc.key) return isConfigured(svc.key);
  // No key and no override → treat as configured (e.g., the n8n message-only entry).
  return true;
}

export async function GET() {
  if (config.demoMode) {
    return NextResponse.json(demoData.getHealth());
  }

  const results = await Promise.allSettled(
    SERVICES.map(async (svc): Promise<HealthCheck> => {
      if (!isServiceConfigured(svc)) {
        return {
          service: svc.name,
          status: "not_configured",
          message: "API key not set",
        };
      }

      if (!svc.ping) {
        return {
          service: svc.name,
          status: "healthy",
          message: svc.message ?? "Connected",
        };
      }

      const result = await svc.ping();
      return {
        service: svc.name,
        status: result.ok ? "healthy" : "down",
        latency_ms: result.latency,
        message: result.ok ? svc.message ?? "Connected" : "Connection failed",
      };
    }),
  );

  const checks: HealthCheck[] = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          service: SERVICES[i].name,
          status: "down" as const,
          message: r.reason instanceof Error ? r.reason.message : "Unknown error",
        },
  );

  return NextResponse.json(checks);
}
