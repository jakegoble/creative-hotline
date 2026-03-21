import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { TierBadge } from "@/components/ui/badge";
import { demoData } from "@/lib/demo-data";
import { formatCurrency, cn } from "@/lib/utils";
import { Star, Flame, Thermometer, Snowflake } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

const TIER_COLORS = {
  Hot: "var(--color-danger)",
  Warm: "var(--color-warning)",
  Cool: "var(--color-accent)",
  Cold: "var(--color-text-muted)",
};

export default function LeadScoring() {
  const scored = demoData.getScoredClients();
  const [tierFilter, setTierFilter] = useState<string>("All");

  const tiers = { Hot: 0, Warm: 0, Cool: 0, Cold: 0 };
  for (const c of scored) tiers[c.tier]++;

  const filtered =
    tierFilter === "All"
      ? scored
      : scored.filter((c) => c.tier === tierFilter);

  const sorted = [...filtered].sort((a, b) => b.score - a.score);

  // Score distribution for histogram
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
      <PageHeader
        title="Lead Scoring"
        subtitle="ICP scoring model — engagement, recency, value, fit"
      />

      {/* Tier KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <KpiCard label="Hot (70+)" value={String(tiers.Hot)} icon={<Flame size={18} />} accent="var(--color-danger)" />
        <KpiCard label="Warm (40-69)" value={String(tiers.Warm)} icon={<Thermometer size={18} />} accent="var(--color-warning)" />
        <KpiCard label="Cool (20-39)" value={String(tiers.Cool)} icon={<Star size={18} />} accent="var(--color-accent)" />
        <KpiCard label="Cold (<20)" value={String(tiers.Cold)} icon={<Snowflake size={18} />} accent="var(--color-text-muted)" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        {/* Score Distribution */}
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
            Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
              />
              <ReferenceLine y={0} stroke="var(--color-border)" />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
                {buckets.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      i >= 4 ? "var(--color-danger)" : i >= 2 ? "var(--color-warning)" : i >= 1 ? "var(--color-accent)" : "var(--color-text-muted)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Filter */}
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
            Filter by Tier
          </h3>
          <div className="space-y-2">
            {["All", "Hot", "Warm", "Cool", "Cold"].map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                  tierFilter === t
                    ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] dark:text-[var(--color-dark-text-secondary)] dark:hover:bg-[var(--color-dark-elevated)]"
                )}
              >
                {t}
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t === "All" ? scored.length : tiers[t as keyof typeof tiers]}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Client list */}
      <Card className="overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)] dark:border-[var(--color-dark-border)]">
              {["Client", "Score", "Tier", "Engagement", "Recency", "Value", "Fit", "Amount"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((client) => (
              <tr
                key={client.id}
                className="border-b border-[var(--color-border)] dark:border-[var(--color-dark-border)] last:border-0 hover:bg-[var(--color-bg-muted)] dark:hover:bg-[var(--color-dark-elevated)]"
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
                    {client.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">{client.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-[var(--color-bg-muted)] dark:bg-[var(--color-dark-elevated)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${client.score}%`,
                          backgroundColor: TIER_COLORS[client.tier],
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold" style={{ color: TIER_COLORS[client.tier] }}>
                      {client.score}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3"><TierBadge tier={client.tier} /></td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{client.engagement}</td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{client.recency}</td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{client.value}</td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{client.fit}</td>
                <td className="px-4 py-3 text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
                  {client.amount > 0 ? formatCurrency(client.amount) : "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
