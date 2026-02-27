"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { BarChart3, DollarSign, Target, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

const CHANNEL_COLORS: Record<string, string> = {
  "IG DM": "var(--color-chart-1)",
  Referral: "var(--color-chart-3)",
  "Meta Ad": "var(--color-chart-4)",
  Website: "var(--color-chart-2)",
  "IG Story": "var(--color-chart-5)",
  LinkedIn: "var(--color-chart-6)",
  "IG Comment": "var(--color-chart-1)",
  Direct: "var(--color-text-muted)",
};

export default function ChannelsPage() {
  const { data: channels, isLoading, error, refresh } = useData("getChannelPerformance");
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading || !channels) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  const totalLeads = channels.reduce((s, c) => s + c.leads, 0);
  const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);
  const avgCac = channels.reduce((s, c) => s + c.cac, 0) / channels.length;
  const bestRoi = channels.reduce((best, c) => (c.roi > best.roi && c.roi !== Infinity ? c : best), channels[0]);

  const selectedChannel = selected ? channels.find((c) => c.channel === selected) : null;

  const cacComparison = channels.map((c) => ({
    channel: c.channel,
    cac: c.cac,
    benchmark: c.benchmark_cac,
  }));

  return (
    <div>
      <PageHeader title="Channel Performance" subtitle="Per-channel CAC, ROI, and conversion analysis" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        <KpiCard label="Total Leads" value={String(totalLeads)} icon={<Target size={18} />} accent="var(--color-accent)" />
        <KpiCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign size={18} />} accent="var(--color-primary)" />
        <KpiCard label="Avg CAC" value={formatCurrency(avgCac)} icon={<BarChart3 size={18} />} accent="var(--color-warning)" />
        <KpiCard label="Best ROI" value={`${bestRoi.roi.toFixed(1)}x`} icon={<TrendingUp size={18} />} accent="var(--color-success)" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">CAC vs Benchmark</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cacComparison} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <XAxis dataKey="channel" tick={(props: any) => (
                <text x={props.x} y={props.y} dy={8} fontSize={10} fill="var(--color-text-muted)" textAnchor="end" transform={`rotate(-35, ${props.x}, ${props.y})`}>{props.payload.value}</text>
              )} axisLine={false} tickLine={false} height={60} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cac" name="Your CAC" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="benchmark" name="Benchmark" fill="var(--color-bg-elevated)" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
            Monthly Trend {selectedChannel ? `— ${selectedChannel.channel}` : ""}
          </h3>
          {selectedChannel ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={selectedChannel.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                <Line type="monotone" dataKey="leads" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 4 }} name="Leads" />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} name="Revenue" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-[var(--color-text-muted)]">
              Select a channel below to view its trend
            </div>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Channel</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Leads</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Conv.</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Rate</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Revenue</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">CAC</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">ROI</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Trend</th>
              </tr>
            </thead>
            <tbody>
              {channels.sort((a, b) => b.revenue - a.revenue).map((ch) => (
                <tr
                  key={ch.channel}
                  className={cn(
                    "border-b border-[var(--color-border)] last:border-0 cursor-pointer transition-colors",
                    selected === ch.channel ? "bg-[var(--color-primary-subtle)]" : "hover:bg-[var(--color-bg-muted)]"
                  )}
                  onClick={() => setSelected(selected === ch.channel ? null : ch.channel)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CHANNEL_COLORS[ch.channel] ?? "var(--color-text-muted)" }} />
                      <span className="text-sm font-medium text-[var(--color-text)]">{ch.channel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{ch.leads}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-[var(--color-text-secondary)]">{ch.conversions}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-[var(--color-text-secondary)]">{formatPercent(ch.conversion_rate)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--color-text)]">{formatCurrency(ch.revenue)}</td>
                  <td className="hidden md:table-cell px-4 py-3">
                    <span className={cn("text-sm", ch.cac <= ch.benchmark_cac ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>
                      {formatCurrency(ch.cac)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ch.roi >= 5 ? "success" : ch.roi >= 2 ? "warning" : "danger"}>
                      {ch.roi === Infinity ? "∞" : `${ch.roi.toFixed(1)}x`}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className={cn("flex items-center gap-1 text-xs font-semibold", ch.trend >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>
                      {ch.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(ch.trend * 100).toFixed(0)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card accent="var(--color-success)">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-success)] mb-2">Top Performer</p>
          <p className="text-lg font-bold text-[var(--color-text)]">Referral</p>
          <p className="text-sm text-[var(--color-text-secondary)]">15.4x ROI with $85 CAC — 100% conversion rate. Invest in a referral incentive program.</p>
        </Card>
        <Card accent="var(--color-warning)">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-warning)] mb-2">Highest Volume</p>
          <p className="text-lg font-bold text-[var(--color-text)]">IG DM</p>
          <p className="text-sm text-[var(--color-text-secondary)]">4 leads, 75% conversion, CAC under benchmark. Scale with ManyChat automation.</p>
        </Card>
        <Card accent="var(--color-danger)">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-danger)] mb-2">Needs Attention</p>
          <p className="text-lg font-bold text-[var(--color-text)]">Meta Ad</p>
          <p className="text-sm text-[var(--color-text-secondary)]">$720 CAC (1.8x ROI). Strong deal sizes but acquisition cost is high. Optimize targeting.</p>
        </Card>
      </div>
    </div>
  );
}
