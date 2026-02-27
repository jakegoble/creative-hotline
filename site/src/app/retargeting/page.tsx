"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatCurrency, cn } from "@/lib/utils";
import { RotateCcw, Users, DollarSign, AlertCircle, ChevronDown, ChevronUp, Mail, ExternalLink } from "lucide-react";

export default function RetargetingPage() {
  const { data: segments, isLoading, error, refresh } = useData("getRetargetingSegments");
  const [expandedSegment, setExpandedSegment] = useState<string | null>("s1");

  if (isLoading || !segments) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  const totalAtRisk = segments.reduce((s, seg) => s + seg.count, 0);
  const totalPotential = segments.reduce((s, seg) => s + seg.estimated_revenue, 0);
  const highPriority = segments.filter((s) => s.priority === "high").length;

  return (
    <div>
      <PageHeader title="Retargeting" subtitle="Re-engagement segments and campaign recommendations" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        <KpiCard label="Total At-Risk" value={String(totalAtRisk)} icon={<Users size={18} />} accent="var(--color-danger)" />
        <KpiCard label="Potential Revenue" value={formatCurrency(totalPotential)} icon={<DollarSign size={18} />} accent="var(--color-primary)" />
        <KpiCard label="High Priority" value={String(highPriority)} icon={<AlertCircle size={18} />} accent="var(--color-warning)" />
        <KpiCard label="Segments" value={String(segments.length)} icon={<RotateCcw size={18} />} accent="var(--color-accent)" />
      </div>

      {/* Segments */}
      <div className="space-y-4">
        {segments.map((segment) => {
          const isExpanded = expandedSegment === segment.id;
          return (
            <Card key={segment.id} accent={segment.priority === "high" ? "var(--color-danger)" : segment.priority === "medium" ? "var(--color-warning)" : "var(--color-text-muted)"}>
              <button
                className="flex w-full items-start justify-between"
                onClick={() => setExpandedSegment(isExpanded ? null : segment.id)}
              >
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{segment.name}</p>
                    <Badge variant={segment.priority === "high" ? "danger" : segment.priority === "medium" ? "warning" : "default"}>
                      {segment.priority}
                    </Badge>
                    <span className="text-xs text-[var(--color-text-muted)]">{segment.count} contacts</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{segment.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {segment.estimated_revenue > 0 && (
                    <span className="text-sm font-bold text-[var(--color-success)]">{formatCurrency(segment.estimated_revenue)}</span>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={16} className="text-[var(--color-text-muted)]" />}
                </div>
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-4">
                  {/* Criteria + Action */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Criteria</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{segment.criteria}</p>
                    </div>
                    <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Suggested Action</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{segment.suggested_action}</p>
                    </div>
                  </div>

                  {/* Client List */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Contacts in Segment</p>
                    <div className="space-y-1">
                      {segment.clients.map((client) => (
                        <div key={client.email} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg)] px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-[10px] font-bold text-[var(--color-primary)]">
                              {client.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--color-text)]">{client.name}</p>
                              <p className="text-xs text-[var(--color-text-muted)]">{client.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[var(--color-text-muted)]">{client.days_inactive}d inactive</span>
                            <Badge>{client.last_status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-[var(--color-border)]">
                    <button className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)] transition-colors">
                      <Mail size={12} />
                      Send Campaign
                    </button>
                    <button className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] transition-colors">
                      <ExternalLink size={12} />
                      View in Notion
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Revenue Recovery Summary */}
      <Card className="mt-6" accent="var(--color-success)">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Revenue Recovery Potential</h3>
        <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
          <div>
            <p className="text-lg md:text-2xl font-bold text-[var(--color-text)] truncate">{formatCurrency(totalPotential)}</p>
            <p className="text-[10px] md:text-xs text-[var(--color-text-muted)]">Total potential</p>
          </div>
          <div>
            <p className="text-lg md:text-2xl font-bold text-[var(--color-success)] truncate">{formatCurrency(totalPotential * 0.3)}</p>
            <p className="text-[10px] md:text-xs text-[var(--color-text-muted)]">Conservative</p>
          </div>
          <div>
            <p className="text-lg md:text-2xl font-bold text-[var(--color-warning)] truncate">{formatCurrency(totalPotential * 0.5)}</p>
            <p className="text-[10px] md:text-xs text-[var(--color-text-muted)]">Optimistic</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
