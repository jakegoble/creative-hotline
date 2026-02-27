"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatDate, cn } from "@/lib/utils";
import {
  FileEdit, Send, Eye, CheckCircle2, FileText, ChevronDown, ChevronUp,
  Check, Circle, Clock,
} from "lucide-react";

const STATUS_CONFIG = {
  draft: { icon: FileText, color: "var(--color-text-muted)", variant: "default" as const },
  sent: { icon: Send, color: "var(--color-accent)", variant: "accent" as const },
  viewed: { icon: Eye, color: "var(--color-warning)", variant: "warning" as const },
  completed: { icon: CheckCircle2, color: "var(--color-success)", variant: "success" as const },
};

const PRIORITY_COLORS = {
  high: "var(--color-danger)",
  medium: "var(--color-warning)",
  low: "var(--color-text-muted)",
};

export default function ActionPlansPage() {
  const { data: plans, isLoading, error, refresh } = useData("getActionPlans");
  const [expandedPlan, setExpandedPlan] = useState<string | null>("ap1");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  if (isLoading || !plans) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  const counts = { draft: 0, sent: 0, viewed: 0, completed: 0 };
  for (const p of plans) counts[p.status]++;

  const totalItems = plans.reduce((s, p) => s + p.items.length, 0);
  const completedItems = plans.reduce((s, p) => s + p.items.filter((i) => i.completed).length, 0);
  const completionRate = totalItems > 0 ? completedItems / totalItems : 0;

  const filtered = statusFilter === "all" ? plans : plans.filter((p) => p.status === statusFilter);

  return (
    <div>
      <PageHeader title="Action Plans" subtitle="Client action plans — track delivery, completion, and follow-through" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        <KpiCard label="Total Plans" value={String(plans.length)} icon={<FileEdit size={18} />} accent="var(--color-primary)" />
        <KpiCard label="Completion Rate" value={`${(completionRate * 100).toFixed(0)}%`} icon={<CheckCircle2 size={18} />} accent="var(--color-success)" />
        <KpiCard label="Items Completed" value={`${completedItems}/${totalItems}`} icon={<Check size={18} />} accent="var(--color-accent)" />
        <KpiCard label="Pending Delivery" value={String(counts.draft)} icon={<Clock size={18} />} accent="var(--color-warning)" />
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "draft", "sent", "viewed", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              statusFilter === s
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
            )}
          >
            {s === "all" ? `All (${plans.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s as keyof typeof counts]})`}
          </button>
        ))}
      </div>

      {/* Plan List */}
      <div className="space-y-3">
        {filtered.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()).map((plan) => {
          const isExpanded = expandedPlan === plan.id;
          const config = STATUS_CONFIG[plan.status];
          const itemsDone = plan.items.filter((i) => i.completed).length;
          const progress = plan.items.length > 0 ? (itemsDone / plan.items.length) * 100 : 0;

          return (
            <Card key={plan.id}>
              <button
                className="flex w-full items-start justify-between"
                onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
              >
                <div className="flex items-start gap-3 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] shrink-0" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                    <config.icon size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-[var(--color-text)]">{plan.client_name}</p>
                      <Badge variant={config.variant}>{plan.status}</Badge>
                      <Badge>{plan.type}</Badge>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">{plan.summary}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                      Created {formatDate(plan.created)} · Updated {formatDate(plan.updated)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-xs font-bold text-[var(--color-text)]">{itemsDone}/{plan.items.length}</p>
                    <div className="mt-1 h-1.5 w-16 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--color-success)] transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={14} className="text-[var(--color-text-muted)]" />}
                </div>
              </button>

              {isExpanded && (
                <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                  <p className="text-xs text-[var(--color-text-secondary)] mb-3">{plan.summary}</p>
                  <div className="space-y-1.5">
                    {plan.items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-3 rounded-[var(--radius-sm)] px-3 py-2",
                          item.completed ? "bg-emerald-900/10" : "bg-[var(--color-bg-muted)]"
                        )}
                      >
                        {item.completed ? (
                          <CheckCircle2 size={16} className="text-[var(--color-success)] mt-0.5 shrink-0" />
                        ) : (
                          <Circle size={16} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={cn("text-sm", item.completed ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text)]")}>
                            {item.text}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[var(--color-text-muted)]">{item.category}</span>
                            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[item.priority] }} />
                            <span className="text-[10px]" style={{ color: PRIORITY_COLORS[item.priority] }}>{item.priority}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12">
          <FileEdit size={32} className="text-[var(--color-text-muted)] mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)]">No action plans with status &quot;{statusFilter}&quot;</p>
        </Card>
      )}
    </div>
  );
}
