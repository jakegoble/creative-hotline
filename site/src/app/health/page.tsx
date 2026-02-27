"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { Activity, CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle2, color: "var(--color-success)", label: "Healthy", variant: "success" as const },
  degraded: { icon: AlertTriangle, color: "var(--color-warning)", label: "Degraded", variant: "warning" as const },
  down: { icon: XCircle, color: "var(--color-danger)", label: "Down", variant: "danger" as const },
  not_configured: { icon: MinusCircle, color: "var(--color-text-muted)", label: "Not Configured", variant: "default" as const },
};

export default function HealthPage() {
  const { data: checks, isLoading, error, refresh } = useData("getHealth");

  if (isLoading || !checks) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  const healthy = checks.filter((c) => c.status === "healthy").length;

  return (
    <div>
      <PageHeader
        title="System Health"
        subtitle="Service connectivity and status"
        actions={
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[var(--color-success)]" />
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              {healthy}/{checks.length} services healthy
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((check) => {
          const config = STATUS_CONFIG[check.status];
          const Icon = config.icon;
          return (
            <Card key={check.service}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn("flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)]")}
                    style={{ backgroundColor: `${config.color}15`, color: config.color }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{check.service}</p>
                    {check.latency_ms && (
                      <p className="text-xs text-[var(--color-text-muted)]">{check.latency_ms}ms</p>
                    )}
                  </div>
                </div>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
              {check.message && (
                <p className="text-xs text-[var(--color-text-muted)]">{check.message}</p>
              )}
              {check.status === "not_configured" && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Add API key in Settings to enable this integration.</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
