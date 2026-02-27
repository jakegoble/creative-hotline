"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ChannelRevenueChart } from "@/components/charts/channel-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatCurrency, formatPercent, formatRelativeTime } from "@/lib/utils";
import { DollarSign, Users, TrendingUp, Target, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { data: kpis, isLoading: kL, error: kE, refresh: kR } = useData("getKpis");
  const { data: revenue, isLoading: rL } = useData("getMonthlyRevenue");
  const { data: channels, isLoading: chL } = useData("getChannelMetrics");
  const { data: funnel, isLoading: fL } = useData("getFunnel");
  const { data: clients, isLoading: clL } = useData("getClients");

  if (kL || rL || chL || fL || clL) return <LoadingState />;
  if (kE || !kpis) return <ErrorState message={kE?.message ?? "Failed to load dashboard"} onRetry={kR} />;

  const recentActivity = (clients ?? [])
    .filter((c) => c.payment_date)
    .sort((a, b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime())
    .slice(0, 5);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Creative Hotline Command Center" />

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        <KpiCard label="Total Revenue" value={formatCurrency(kpis.total_revenue)} trend={kpis.revenue_trend} icon={<DollarSign size={18} />} accent="var(--color-primary)" />
        <KpiCard label="Total Clients" value={String(kpis.total_clients)} icon={<Users size={18} />} accent="var(--color-accent)" />
        <KpiCard label="Active Pipeline" value={String(kpis.active_pipeline)} icon={<Target size={18} />} accent="var(--color-success)" />
        <KpiCard label="Conversion Rate" value={formatPercent(kpis.conversion_rate)} icon={<TrendingUp size={18} />} accent="var(--color-warning)" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Monthly Revenue</h3>
          {revenue && <RevenueChart data={revenue} />}
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Revenue by Channel</h3>
          {channels && <ChannelRevenueChart data={channels} />}
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Pipeline Funnel</h3>
          {funnel && <FunnelChart data={funnel} />}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Recent Activity</h3>
            <button className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2.5 transition-colors hover:bg-[var(--color-bg-muted)]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-xs font-bold text-[var(--color-primary)]">
                    {client.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{client.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {client.product} &middot; {formatRelativeTime(client.payment_date!)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:inline"><StatusBadge status={client.status} /></span>
                  <span className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(client.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
