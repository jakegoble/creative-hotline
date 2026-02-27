"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatCurrency, cn } from "@/lib/utils";

const STAGE_COLORS: Record<string, string> = {
  "Lead - Laylo": "var(--color-text-muted)",
  "Paid - Needs Booking": "var(--color-warning)",
  "Booked - Needs Intake": "var(--color-accent)",
  "Intake Complete": "var(--color-accent)",
  "Ready for Call": "var(--color-primary)",
  "Call Complete": "var(--color-success)",
  "Follow-Up Sent": "var(--color-success)",
};

export default function PipelinePage() {
  const { data: pipeline, isLoading, error, refresh } = useData("getPipeline");

  if (isLoading || !pipeline) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Client journey from lead to follow-up" />

      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
        {pipeline.map((stage) => (
          <div key={stage.stage} className="min-w-[200px] md:min-w-[240px] flex-1 snap-start">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STAGE_COLORS[stage.stage] }} />
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] truncate">{stage.stage}</span>
              </div>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[10px] font-bold text-[var(--color-text-muted)]">
                {stage.count}
              </span>
            </div>

            <div className="space-y-2">
              {stage.clients.map((client) => (
                <Card key={client.id} className={cn("cursor-pointer p-3", "hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)]")}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-[10px] font-bold text-[var(--color-primary)]">
                      {client.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-[var(--color-text)]">{client.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-muted)]">{client.product || "--"}</span>
                    {client.amount > 0 && (
                      <span className="text-xs font-semibold text-[var(--color-text)]">{formatCurrency(client.amount)}</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-[var(--color-text-muted)]">{client.lead_source}</span>
                    <StatusBadge status={client.status} />
                  </div>
                </Card>
              ))}

              {stage.clients.length === 0 && (
                <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-6 text-center">
                  <p className="text-xs text-[var(--color-text-muted)]">No clients</p>
                </div>
              )}
            </div>

            {stage.value > 0 && (
              <div className="mt-2 text-center">
                <span className="text-xs font-semibold text-[var(--color-text-muted)]">{formatCurrency(stage.value)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
