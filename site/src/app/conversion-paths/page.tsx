"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatCurrency, cn } from "@/lib/utils";
import { Route, Clock, ArrowRight, Layers, GitBranch, ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const CHANNEL_COLORS: Record<string, string> = {
  "IG DM": "#FF6B35",
  "IG Story": "#F39C12",
  "Meta Ad": "#9B59B6",
  Website: "#6495ED",
  Referral: "#2ECC71",
  LinkedIn: "#E74C3C",
  Direct: "#6B6B6B",
};

export default function ConversionPathsPage() {
  const { data: conversionData, isLoading, error, refresh } = useData("getConversionPaths");
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [model, setModel] = useState<"first_touch" | "last_touch" | "linear">("linear");

  if (isLoading || !conversionData) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  const { paths, attribution } = conversionData;

  const avgTouchpoints = paths.reduce((s, p) => s + p.touchpoints.length, 0) / paths.length;
  const avgDaysToConvert = paths.reduce((s, p) => s + p.days_to_convert, 0) / paths.length;
  const totalRevenue = paths.reduce((s, p) => s + p.revenue, 0);

  const attributionChart = attribution.map((a) => ({
    channel: a.channel,
    value: model === "first_touch" ? a.first_touch : model === "last_touch" ? a.last_touch : a.linear,
    revenue: a.revenue_attributed,
  })).sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHeader title="Conversion Paths" subtitle="Multi-touch attribution and customer journey analysis" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        <KpiCard label="Tracked Paths" value={String(paths.length)} icon={<Route size={18} />} accent="var(--color-primary)" />
        <KpiCard label="Avg Touchpoints" value={avgTouchpoints.toFixed(1)} icon={<Layers size={18} />} accent="var(--color-accent)" />
        <KpiCard label="Avg Days to Convert" value={`${avgDaysToConvert.toFixed(1)}d`} icon={<Clock size={18} />} accent="var(--color-warning)" />
        <KpiCard label="Attributed Revenue" value={formatCurrency(totalRevenue)} icon={<GitBranch size={18} />} accent="var(--color-success)" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
        {/* Attribution Model */}
        <Card>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Channel Attribution</h3>
            <div className="flex rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] p-0.5 w-fit">
              {(["first_touch", "last_touch", "linear"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-semibold rounded-[var(--radius-sm)] transition-colors whitespace-nowrap",
                    model === m ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  )}
                >
                  {m === "first_touch" ? "First Touch" : m === "last_touch" ? "Last Touch" : "Linear"}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={attributionChart} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="channel" type="category" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
              <Bar dataKey="value" name="Conversions" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue by Channel */}
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Revenue Attributed by Channel</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={attribution.sort((a, b) => b.revenue_attributed - a.revenue_attributed)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="channel" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`} />
              <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="revenue_attributed" name="Revenue" fill="var(--color-accent)" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Customer Journeys */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Customer Journeys</h3>
        <div className="space-y-2">
          {paths.sort((a, b) => b.revenue - a.revenue).map((path) => {
            const isExpanded = expandedPath === path.id;
            return (
              <div key={path.id} className="rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] overflow-hidden">
                <button
                  className="flex w-full items-center justify-between px-4 py-3"
                  onClick={() => setExpandedPath(isExpanded ? null : path.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-xs font-bold text-[var(--color-primary)]">
                      {path.client_name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{path.client_name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{path.touchpoints.length} touchpoints · {path.days_to_convert}d</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-[var(--color-text)]">{formatCurrency(path.revenue)}</span>
                    {isExpanded ? <ChevronUp size={14} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={14} className="text-[var(--color-text-muted)]" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {path.touchpoints.map((tp, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                            style={{ backgroundColor: `${CHANNEL_COLORS[tp.channel] ?? "#6B6B6B"}20`, borderLeft: `3px solid ${CHANNEL_COLORS[tp.channel] ?? "#6B6B6B"}` }}
                          >
                            <span className="text-xs font-medium text-[var(--color-text)]">{tp.channel}</span>
                            <span className="text-[10px] text-[var(--color-text-muted)]">{tp.date}</span>
                          </div>
                          {i < path.touchpoints.length - 1 && <ArrowRight size={12} className="text-[var(--color-text-muted)]" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Attribution Comparison Table */}
      <Card className="mt-6 overflow-hidden p-0">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Channel</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">First Touch</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Last Touch</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Linear</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {attribution.sort((a, b) => b.revenue_attributed - a.revenue_attributed).map((a) => (
                <tr key={a.channel} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-muted)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CHANNEL_COLORS[a.channel] ?? "#6B6B6B" }} />
                      <span className="text-sm font-medium text-[var(--color-text)]">{a.channel}</span>
                    </div>
                  </td>
                  <td className={cn("hidden md:table-cell px-4 py-3 text-sm", model === "first_touch" ? "font-bold text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]")}>{a.first_touch}</td>
                  <td className={cn("hidden md:table-cell px-4 py-3 text-sm", model === "last_touch" ? "font-bold text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]")}>{a.last_touch}</td>
                  <td className={cn("px-4 py-3 text-sm", model === "linear" ? "font-bold text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]")}>{a.linear.toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--color-text)]">{formatCurrency(a.revenue_attributed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
