"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatCurrency, cn } from "@/lib/utils";
import { Trophy, Heart, Star, Users, ChevronDown, ChevronUp, Quote } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export default function OutcomesPage() {
  const { data, isLoading, error, refresh } = useData("getOutcomes");
  const [showAllTestimonials, setShowAllTestimonials] = useState(false);

  if (isLoading || !data) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  const referralRevenue = data.referrals.filter((r) => r.status === "converted").reduce((s, r) => s + r.revenue, 0);
  const referralConvRate = data.referrals.filter((r) => r.status === "converted").length / data.referrals.length;

  const ltvData = data.ltv_leaderboard.map((l) => ({
    name: l.client_name.split(" ")[0],
    revenue: l.total_revenue,
    predicted: l.predicted_ltv,
  }));

  const visibleTestimonials = showAllTestimonials ? data.testimonials : data.testimonials.slice(0, 3);

  return (
    <div>
      <PageHeader title="Outcomes & Testimonials" subtitle="LTV, NPS, referral tracking, and client success metrics" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        <KpiCard label="NPS Score" value={String(data.nps_score)} icon={<Heart size={18} />} accent={data.nps_score >= 50 ? "var(--color-success)" : "var(--color-warning)"} />
        <KpiCard label="NPS Responses" value={String(data.nps_responses)} icon={<Users size={18} />} accent="var(--color-accent)" />
        <KpiCard label="Referral Revenue" value={formatCurrency(referralRevenue)} icon={<Trophy size={18} />} accent="var(--color-primary)" />
        <KpiCard label="Referral Conv." value={`${(referralConvRate * 100).toFixed(0)}%`} icon={<Star size={18} />} accent="var(--color-warning)" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
        {/* NPS Breakdown */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">NPS Breakdown</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4" style={{ borderColor: data.nps_score >= 50 ? "var(--color-success)" : "var(--color-warning)" }}>
              <span className="text-2xl font-bold text-[var(--color-text)]">{data.nps_score}</span>
            </div>
            <div className="flex-1 space-y-2">
              {[
                { label: "Promoters (9-10)", count: data.nps_breakdown.promoters, color: "var(--color-success)" },
                { label: "Passives (7-8)", count: data.nps_breakdown.passives, color: "var(--color-warning)" },
                { label: "Detractors (0-6)", count: data.nps_breakdown.detractors, color: "var(--color-danger)" },
              ].map((item) => {
                const pct = (item.count / data.nps_responses) * 100;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-[var(--color-text-secondary)]">{item.label}</span>
                      <span className="font-semibold text-[var(--color-text)]">{item.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* LTV Leaderboard Chart */}
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">LTV Leaderboard</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ltvData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`} />
              <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="revenue" name="Actual Revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="predicted" name="Predicted LTV" fill="var(--color-primary-subtle)" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Testimonials */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Client Testimonials</h3>
          <button
            onClick={() => setShowAllTestimonials(!showAllTestimonials)}
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
          >
            {showAllTestimonials ? "Show less" : `Show all (${data.testimonials.length})`}
            {showAllTestimonials ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
        <div className="space-y-4">
          {visibleTestimonials.map((t) => (
            <div key={t.id} className="rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] p-4">
              <div className="flex items-start gap-3">
                <Quote size={20} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-[var(--color-text)] leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-[10px] font-bold text-[var(--color-primary)]">
                        {t.client_name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span className="text-xs font-medium text-[var(--color-text-secondary)]">{t.client_name}</span>
                      <Badge variant="accent">{t.product}</Badge>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} className={s <= t.rating ? "text-amber-400 fill-amber-400" : "text-[var(--color-text-muted)]"} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Referrals + Cohort Retention */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Referral Network</h3>
          <div className="space-y-3">
            {data.referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] px-3 py-2.5">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm text-[var(--color-text)] truncate">
                    <span className="font-medium">{r.referrer}</span>
                    <span className="text-[var(--color-text-muted)]"> → </span>
                    <span className="font-medium">{r.referred}</span>
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">{r.date}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={r.status === "converted" ? "success" : r.status === "pending" ? "warning" : "danger"}>
                    {r.status}
                  </Badge>
                  {r.revenue > 0 && <span className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(r.revenue)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Cohort Retention</h3>
          <div className="space-y-3">
            {data.cohort_retention.map((c) => (
              <div key={c.cohort} className="rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] px-3 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--color-text)]">{c.cohort}</span>
                  <Badge variant={c.repeat_rate >= 0.5 ? "success" : c.repeat_rate > 0 ? "warning" : "default"}>
                    {(c.repeat_rate * 100).toFixed(0)}% repeat
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Clients</p>
                    <p className="text-sm font-bold text-[var(--color-text)]">{c.clients}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Avg Purchases</p>
                    <p className="text-sm font-bold text-[var(--color-text)]">{c.avg_purchases.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Avg Revenue</p>
                    <p className="text-sm font-bold text-[var(--color-text)]">{formatCurrency(c.avg_revenue)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-[var(--radius-sm)] bg-emerald-900/20 border border-emerald-800/30 px-3 py-2">
            <p className="text-xs text-emerald-400">Target: 20% repeat rate within 90 days. Q4 2025 cohort is at 67% — strong early signal.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
