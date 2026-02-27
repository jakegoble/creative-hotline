"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";
import { TrendingUp, Target, AlertTriangle, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from "recharts";

export default function RevenueGoalsPage() {
  const { data, isLoading, error, refresh } = useData("getRevenueGoals");
  const [expanded, setExpanded] = useState<string | null>("scale");

  if (isLoading || !data) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  const progressPct = (data.current_annual_run_rate / data.annual_target) * 100;

  return (
    <div>
      <PageHeader title="Revenue Goals" subtitle="$800K path — scenario modeling and product mix strategy" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        <KpiCard label="Annual Target" value={formatCurrency(data.annual_target)} compactValue={formatCompactCurrency(data.annual_target)} icon={<Target size={18} />} accent="var(--color-primary)" />
        <KpiCard label="Run Rate" value={formatCurrency(data.current_annual_run_rate)} compactValue={formatCompactCurrency(data.current_annual_run_rate)} icon={<TrendingUp size={18} />} accent="var(--color-accent)" />
        <KpiCard label="Gap to Close" value={formatCurrency(data.gap)} compactValue={formatCompactCurrency(data.gap)} icon={<AlertTriangle size={18} />} accent="var(--color-danger)" />
        <KpiCard label="Call Ceiling" value={formatCurrency(data.capacity_ceiling)} compactValue={formatCompactCurrency(data.capacity_ceiling)} icon={<DollarSign size={18} />} accent="var(--color-warning)" />
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Progress to $800K</h3>
          <span className="text-xs font-bold text-[var(--color-primary)]">{progressPct.toFixed(1)}%</span>
        </div>
        <div className="h-4 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-warning)] transition-all" style={{ width: `${Math.min(progressPct, 100)}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>{formatCurrency(data.current_annual_run_rate)} run rate</span>
          <span>{formatCurrency(data.gap)} remaining</span>
        </div>
        <div className="mt-3 rounded-[var(--radius-sm)] bg-amber-900/20 border border-amber-800/30 px-3 py-2">
          <p className="text-xs text-amber-400">
            <AlertTriangle size={12} className="inline mr-1" />
            Calls alone cap at ~{formatCurrency(data.capacity_ceiling)}/yr (20 calls/week max). Non-call products needed to close the {formatCurrency(data.annual_target - data.capacity_ceiling)} gap.
          </p>
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Monthly Revenue vs Target</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.monthly_actuals} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} formatter={(value) => formatCurrency(Number(value))} />
            <ReferenceLine y={data.annual_target / 12} stroke="var(--color-danger)" strokeDasharray="5 5" label={{ value: "Monthly Target", position: "right", fill: "var(--color-danger)", fontSize: 10 }} />
            <Bar dataKey="actual" name="Actual" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Revenue Scenarios</h3>
      <div className="space-y-4 mb-6">
        {data.scenarios.map((scenario) => {
          const isExpanded = expanded === scenario.id;
          const pct = (scenario.annual_revenue / data.annual_target) * 100;
          const meetsTarget = scenario.annual_revenue >= data.annual_target;
          return (
            <Card key={scenario.id} accent={meetsTarget ? "var(--color-success)" : scenario.feasibility === "stretch" ? "var(--color-warning)" : "var(--color-text-muted)"}>
              <button className="flex w-full items-center justify-between" onClick={() => setExpanded(isExpanded ? null : scenario.id)}>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)] text-left">{scenario.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{formatCurrency(scenario.monthly_target)}/mo → {formatCurrency(scenario.annual_revenue)}/yr</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={scenario.feasibility === "achievable" ? "success" : scenario.feasibility === "stretch" ? "warning" : "danger"}>
                    {scenario.feasibility}
                  </Badge>
                  <span className="text-xs font-bold" style={{ color: meetsTarget ? "var(--color-success)" : "var(--color-text-muted)" }}>
                    {pct.toFixed(0)}%
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={16} className="text-[var(--color-text-muted)]" />}
                </div>
              </button>
              <div className="mt-3 h-2 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: meetsTarget ? "var(--color-success)" : scenario.feasibility === "stretch" ? "var(--color-warning)" : "var(--color-text-muted)",
                }} />
              </div>
              {isExpanded && (
                <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Product Mix</p>
                  <div className="space-y-2">
                    {scenario.product_mix.map((p) => (
                      <div key={p.product} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] px-3 py-2">
                        <div>
                          <span className="text-sm font-medium text-[var(--color-text)]">{p.product}</span>
                          <span className="ml-2 text-xs text-[var(--color-text-muted)]">{p.units_per_month}/mo × {formatCurrency(p.price)}</span>
                        </div>
                        <span className="text-sm font-bold text-[var(--color-text)]">{formatCurrency(p.units_per_month * p.price * 12)}/yr</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Scenario Comparison</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data.scenarios.map((s) => ({ name: s.name, revenue: s.annual_revenue }))}
            layout="vertical"
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={80} />
            <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} formatter={(value) => formatCurrency(Number(value))} />
            <ReferenceLine x={data.annual_target} stroke="var(--color-danger)" strokeDasharray="5 5" label={{ value: "$800K Target", position: "top", fill: "var(--color-danger)", fontSize: 10 }} />
            <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={24}>
              {data.scenarios.map((s) => (
                <Cell key={s.id} fill={s.annual_revenue >= data.annual_target ? "var(--color-success)" : s.feasibility === "stretch" ? "var(--color-warning)" : "var(--color-text-muted)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
