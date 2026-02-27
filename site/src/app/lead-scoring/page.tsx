"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { TierBadge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatCurrency, cn } from "@/lib/utils";
import { Star, Flame, Thermometer, Snowflake } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

const TIER_COLORS = {
  Hot: "var(--color-danger)",
  Warm: "var(--color-warning)",
  Cool: "var(--color-accent)",
  Cold: "var(--color-text-muted)",
};

export default function LeadScoringPage() {
  const { data: scored, isLoading, error, refresh } = useData("getScoredClients");
  const [tierFilter, setTierFilter] = useState<string>("All");

  if (isLoading || !scored) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  const tiers = { Hot: 0, Warm: 0, Cool: 0, Cold: 0 };
  for (const c of scored) tiers[c.tier]++;

  const filtered = tierFilter === "All" ? scored : scored.filter((c) => c.tier === tierFilter);
  const sorted = [...filtered].sort((a, b) => b.score - a.score);

  const buckets = [
    { range: "0-19", count: 0 },
    { range: "20-39", count: 0 },
    { range: "40-59", count: 0 },
    { range: "60-79", count: 0 },
    { range: "80-100", count: 0 },
  ];
  for (const c of scored) {
    const idx = Math.min(Math.floor(c.score / 20), 4);
    buckets[idx].count++;
  }

  return (
    <div>
      <PageHeader title="Lead Scoring" subtitle="ICP scoring model — engagement, recency, value, fit" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        <KpiCard label="Hot (70+)" value={String(tiers.Hot)} icon={<Flame size={18} />} accent="var(--color-danger)" />
        <KpiCard label="Warm (40-69)" value={String(tiers.Warm)} icon={<Thermometer size={18} />} accent="var(--color-warning)" />
        <KpiCard label="Cool (20-39)" value={String(tiers.Cool)} icon={<Star size={18} />} accent="var(--color-accent)" />
        <KpiCard label="Cold (<20)" value={String(tiers.Cold)} icon={<Snowflake size={18} />} accent="var(--color-text-muted)" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
              <ReferenceLine y={0} stroke="var(--color-border)" />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
                {buckets.map((_, i) => (
                  <Cell key={i} fill={i >= 4 ? "var(--color-danger)" : i >= 2 ? "var(--color-warning)" : i >= 1 ? "var(--color-accent)" : "var(--color-text-muted)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Filter by Tier</h3>
          <div className="space-y-2">
            {["All", "Hot", "Warm", "Cool", "Cold"].map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                  tierFilter === t
                    ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]"
                )}
              >
                {t}
                <span className="text-xs text-[var(--color-text-muted)]">{t === "All" ? scored.length : tiers[t as keyof typeof tiers]}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Client</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Score</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Tier</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Engagement</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Recency</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Value</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Fit</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((client) => (
                <tr key={client.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-muted)]">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate max-w-[140px]">{client.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[140px]">{client.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${client.score}%`, backgroundColor: TIER_COLORS[client.tier] }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: TIER_COLORS[client.tier] }}>{client.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={client.tier} /></td>
                  <td className="hidden md:table-cell px-4 py-3 text-xs text-[var(--color-text-muted)]">{client.engagement}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-xs text-[var(--color-text-muted)]">{client.recency}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-xs text-[var(--color-text-muted)]">{client.value}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-xs text-[var(--color-text-muted)]">{client.fit}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--color-text)]">{client.amount > 0 ? formatCurrency(client.amount) : "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
