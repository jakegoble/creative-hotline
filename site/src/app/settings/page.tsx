"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDataService } from "@/lib/data-context";
import { cn } from "@/lib/utils";
import {
  Settings, Database, Key, Bell,
  Check, X, ExternalLink, ChevronRight,
} from "lucide-react";

interface ConfigItem {
  key: string;
  label: string;
  description: string;
  status: "connected" | "not_configured" | "error";
  url?: string;
}

const API_CONFIGS: ConfigItem[] = [
  { key: "notion", label: "Notion", description: "CRM database access — Payments + Intake", status: "connected" },
  { key: "stripe", label: "Stripe", description: "Payment processing and webhook events", status: "connected" },
  { key: "calendly", label: "Calendly", description: "Call scheduling and booking management", status: "connected" },
  { key: "claude", label: "Claude AI", description: "Intake analysis and action plan generation", status: "connected" },
  { key: "n8n", label: "n8n", description: "Workflow automation (5 active workflows)", status: "connected", url: "https://creativehotline.app.n8n.cloud" },
  { key: "manychat", label: "ManyChat", description: "Instagram DM automation", status: "not_configured" },
  { key: "fireflies", label: "Fireflies AI", description: "Call transcript processing", status: "not_configured" },
];

export default function SettingsPage() {
  const { isDemoMode: demoMode, setDemoMode } = useDataService();
  const [notifications, setNotifications] = useState({
    new_payment: true,
    booking_confirmed: true,
    intake_submitted: true,
    call_reminder: true,
    weekly_digest: false,
  });

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configuration, integrations, and preferences" />

      {/* Demo Mode */}
      <Card className="mb-6" accent="var(--color-primary)">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)]">
              <Database size={18} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">Demo Mode</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {demoMode ? "Using demo data (15 sample clients). Toggle off to connect live APIs." : "Connected to live data sources."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={cn(
              "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
              demoMode ? "bg-[var(--color-primary)]" : "bg-[var(--color-bg-elevated)]"
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 rounded-full bg-white transition-transform shadow-sm",
                demoMode ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </Card>

      {/* API Integrations */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Key size={18} className="text-[var(--color-text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text)]">API Integrations</h3>
        </div>
        <div className="space-y-2">
          {API_CONFIGS.map((config) => (
            <div key={config.key} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  config.status === "connected" ? "bg-emerald-900/30" : "bg-[var(--color-bg-elevated)]"
                )}>
                  {config.status === "connected" ? (
                    <Check size={14} className="text-[var(--color-success)]" />
                  ) : (
                    <X size={14} className="text-[var(--color-text-muted)]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{config.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.status === "connected" ? "success" : config.status === "error" ? "danger" : "default"}>
                  {config.status === "connected" ? "Connected" : config.status === "error" ? "Error" : "Not Set"}
                </Badge>
                {config.url && (
                  <a href={config.url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-[var(--color-text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Notifications</h3>
        </div>
        <div className="space-y-2">
          {Object.entries(notifications).map(([key, enabled]) => {
            const label = key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            return (
              <div key={key} className="flex items-center justify-between rounded-[var(--radius-sm)] px-4 py-3 hover:bg-[var(--color-bg-muted)] transition-colors">
                <span className="text-sm text-[var(--color-text)]">{label}</span>
                <button
                  onClick={() => setNotifications((prev) => ({ ...prev, [key]: !enabled }))}
                  className={cn(
                    "relative inline-flex h-6 w-10 items-center rounded-full transition-colors",
                    enabled ? "bg-[var(--color-success)]" : "bg-[var(--color-bg-elevated)]"
                  )}
                >
                  <span className={cn("inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm", enabled ? "translate-x-5" : "translate-x-1")} />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Quick Links */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} className="text-[var(--color-text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Quick Links</h3>
        </div>
        <div className="space-y-1">
          {[
            { label: "n8n Cloud Dashboard", url: "https://creativehotline.app.n8n.cloud" },
            { label: "Stripe Dashboard", url: "https://dashboard.stripe.com" },
            { label: "Notion Workspace", url: "https://notion.so" },
            { label: "Calendly Event Types", url: "https://calendly.com/soscreativehotline" },
            { label: "ManyChat Dashboard", url: "https://app.manychat.com" },
            { label: "Website", url: "https://www.thecreativehotline.com" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-[var(--radius-sm)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {link.label}
              <ChevronRight size={14} />
            </a>
          ))}
        </div>
      </Card>

      {/* App Info */}
      <div className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
        <p>Creative Hotline Command Center v6.0</p>
        <p className="mt-0.5">Built for Jake & Megha</p>
      </div>
    </div>
  );
}
