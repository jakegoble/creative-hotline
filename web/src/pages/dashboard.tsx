import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ChannelRevenueChart } from "@/components/charts/channel-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { demoData } from "@/lib/demo-data";
import { formatCurrency, formatPercent, formatRelativeTime } from "@/lib/utils";
import {
  DollarSign,
  Users,
  TrendingUp,
  Target,
  ArrowRight,
} from "lucide-react";

export default function Dashboard() {
  const kpis = demoData.getKpis();
  const revenue = demoData.getMonthlyRevenue();
  const channels = demoData.getChannelMetrics();
  const funnel = demoData.getFunnel();
  const clients = demoData.getClients();
  const recentActivity = clients
    .filter((c) => c.payment_date)
    .sort((a, b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime())
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Creative Hotline Command Center"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(kpis.total_revenue)}
          trend={kpis.revenue_trend}
          icon={<DollarSign size={18} />}
          accent="var(--color-primary)"
        />
        <KpiCard
          label="Total Clients"
          value={String(kpis.total_clients)}
          icon={<Users size={18} />}
          accent="var(--color-accent)"
        />
        <KpiCard
          label="Active Pipeline"
          value={String(kpis.active_pipeline)}
          icon={<Target size={18} />}
          accent="var(--color-success)"
        />
        <KpiCard
          label="Conversion Rate"
          value={formatPercent(kpis.conversion_rate)}
          icon={<TrendingUp size={18} />}
          accent="var(--color-warning)"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
            Monthly Revenue
          </h3>
          <RevenueChart data={revenue} />
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
            Revenue by Channel
          </h3>
          <ChannelRevenueChart data={channels} />
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
            Pipeline Funnel
          </h3>
          <FunnelChart data={funnel} />
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
              Recent Activity
            </h3>
            <button className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2.5 transition-colors hover:bg-[var(--color-bg-muted)] dark:hover:bg-[var(--color-dark-elevated)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-xs font-bold text-[var(--color-primary)]">
                    {client.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
                      {client.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-dark-text-muted)]">
                      {client.product} &middot; {formatRelativeTime(client.payment_date!)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={client.status} />
                  <span className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
                    {formatCurrency(client.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
