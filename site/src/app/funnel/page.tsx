"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatPercent, cn } from "@/lib/utils";
import { ListFilter, Clock, AlertTriangle, TrendingDown, ArrowDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export default function FunnelPage() {
  const { data: funnel, isLoading, error, refresh } = useData("getMicroFunnel");

  if (isLoading || !funnel) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  const totalDropOff = ((funnel.stages[0].entered - funnel.stages[funnel.stages.length - 1].completed) / funnel.stages[0].entered) * 100;

  return (
    <div>
      <PageHeader title="Funnel Analytics" subtitle="Micro-conversion funnel — drop-off rates and speed-to-convert" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        <KpiCard label="Funnel Stages" value={String(funnel.stages.length)} icon={<ListFilter size={18} />} accent="var(--color-accent)" />
        <KpiCard label="Avg Days to Convert" value={`${funnel.avg_days_to_convert}d`} icon={<Clock size={18} />} accent="var(--color-primary)" />
        <KpiCard label="Total Drop-off" value={`${totalDropOff.toFixed(0)}%`} icon={<TrendingDown size={18} />} accent="var(--color-danger)" />
        <KpiCard label="Bottleneck" value={funnel.bottleneck} icon={<AlertTriangle size={18} />} accent="var(--color-warning)" />
      </div>

      <Card className="mb-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Conversion Funnel</h3>
        <div className="space-y-1">
          {funnel.stages.map((stage, i) => {
            const widthPct = (stage.entered / funnel.stages[0].entered) * 100;
            const isBottleneck = stage.drop_off_rate > stage.benchmark_rate;
            const fillColor = isBottleneck ? "var(--color-danger)" : "var(--color-primary)";

            return (
              <div key={stage.stage}>
                <div className="flex items-center gap-3 mb-1">
                  <span className="w-16 md:w-28 text-right text-[10px] md:text-xs font-medium text-[var(--color-text-secondary)] shrink-0">{stage.stage}</span>
                  <div className="flex-1 relative">
                    <div
                      className="h-10 rounded-[var(--radius-sm)] transition-all flex items-center px-2 md:px-3 justify-between gap-1 overflow-hidden"
                      style={{
                        width: `${Math.max(widthPct, 8)}%`,
                        background: `linear-gradient(90deg, ${fillColor}40, ${fillColor}20)`,
                        borderLeft: `3px solid ${fillColor}`,
                      }}
                    >
                      <span className="text-xs font-bold text-[var(--color-text)] shrink-0">{stage.entered}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] hidden sm:inline truncate">{stage.avg_time_hours > 0 ? `${stage.avg_time_hours}h avg` : ""}</span>
                    </div>
                  </div>
                  <div className="w-14 md:w-20 text-right shrink-0">
                    {i > 0 && (
                      <span className={cn("text-xs font-semibold", stage.drop_off_rate > stage.benchmark_rate ? "text-[var(--color-danger)]" : "text-[var(--color-success)]")}>
                        -{(stage.drop_off_rate * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                {i < funnel.stages.length - 1 && (
                  <div className="flex items-center gap-3">
                    <div className="w-16 md:w-28" />
                    <ArrowDown size={14} className="text-[var(--color-text-muted)] ml-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Drop-off Rate vs Benchmark</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnel.stages.slice(1)} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <XAxis dataKey="stage" tick={(props: any) => (
                <text x={props.x} y={props.y} dy={8} fontSize={9} fill="var(--color-text-muted)" textAnchor="end" transform={`rotate(-35, ${props.x}, ${props.y})`}>{props.payload.value}</text>
              )} axisLine={false} tickLine={false} height={60} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
              <Bar dataKey="drop_off_rate" name="Actual Drop-off" radius={[4, 4, 0, 0]} barSize={20}>
                {funnel.stages.slice(1).map((s, i) => (
                  <Cell key={i} fill={s.drop_off_rate > s.benchmark_rate ? "var(--color-danger)" : "var(--color-success)"} />
                ))}
              </Bar>
              <Bar dataKey="benchmark_rate" name="Benchmark" fill="var(--color-bg-elevated)" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Time per Stage (hours)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnel.stages.filter((s) => s.avg_time_hours > 0)} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <XAxis dataKey="stage" tick={(props: any) => (
                <text x={props.x} y={props.y} dy={8} fontSize={9} fill="var(--color-text-muted)" textAnchor="end" transform={`rotate(-35, ${props.x}, ${props.y})`}>{props.payload.value}</text>
              )} axisLine={false} tickLine={false} height={60} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} formatter={(value) => `${value}h`} />
              <Bar dataKey="avg_time_hours" name="Avg Time" fill="var(--color-accent)" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Stage</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Entered</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Completed</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Drop-off</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Benchmark</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {funnel.stages.map((stage) => {
                const overBenchmark = stage.drop_off_rate > stage.benchmark_rate;
                return (
                  <tr key={stage.stage} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-muted)]">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-text)]">{stage.stage}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{stage.entered}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-[var(--color-text-secondary)]">{stage.completed}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-sm font-semibold", overBenchmark ? "text-[var(--color-danger)]" : "text-[var(--color-success)]")}>
                        {formatPercent(stage.drop_off_rate)}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-[var(--color-text-muted)]">{formatPercent(stage.benchmark_rate)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={overBenchmark ? "danger" : "success"}>
                        {overBenchmark ? "Above Benchmark" : "On Track"}
                      </Badge>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-[var(--color-text-muted)]">
                      {stage.avg_time_hours > 0 ? `${stage.avg_time_hours}h` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {funnel.stages.filter((s) => s.drop_off_rate > s.benchmark_rate).map((s) => (
          <Card key={s.stage} accent="var(--color-danger)">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-[var(--color-danger)] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">{s.stage} — High Drop-off</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {formatPercent(s.drop_off_rate)} drop-off vs {formatPercent(s.benchmark_rate)} benchmark.
                  {s.stage === "Intake Form" && " Send automated Tally form reminder 24hrs before call."}
                  {s.stage === "Awareness" && " Improve IG content targeting and ad creative."}
                  {s.stage === "Lead Capture" && " Optimize Laylo keyword drops and DM response time."}
                  {s.stage === "Follow-Up" && " Strengthen post-call follow-up with specific next steps."}
                  {s.stage === "Call Complete" && " Reduce no-show rate with SMS reminders."}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
