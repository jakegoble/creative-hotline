import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { demoData } from "@/lib/demo-data";
import type { HealthCheck } from "@/lib/types";
import * as notion from "@/lib/services/notion";
import * as stripe from "@/lib/services/stripe";
import * as calendly from "@/lib/services/calendly";
import * as claude from "@/lib/services/claude";

interface ServiceDef {
  name: string;
  key: "notion" | "stripe" | "calendly" | "anthropic" | "n8n" | "manychat" | "fireflies";
  ping?: () => Promise<{ ok: boolean; latency: number }>;
  message?: string;
}

const SERVICES: ServiceDef[] = [
  { name: "Notion", key: "notion", ping: notion.ping },
  { name: "Stripe", key: "stripe", ping: stripe.ping },
  { name: "Calendly", key: "calendly", ping: calendly.ping },
  { name: "Claude AI", key: "anthropic", ping: claude.ping, message: config.anthropic.model },
  { name: "n8n", key: "n8n", message: "5 workflows active" },
  { name: "ManyChat", key: "manychat" },
  { name: "Fireflies", key: "fireflies" },
];

export async function GET() {
  if (config.demoMode) {
    return NextResponse.json(demoData.getHealth());
  }

  const results = await Promise.allSettled(
    SERVICES.map(async (svc): Promise<HealthCheck> => {
      if (!isConfigured(svc.key)) {
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
