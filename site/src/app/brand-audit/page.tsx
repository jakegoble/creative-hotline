"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { ClipboardCheck, Award, TrendingUp, Target, Lightbulb, ArrowRight } from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const TIER_COLORS = {
  Strong: "var(--color-success)",
  Developing: "var(--color-warning)",
  "Needs Work": "var(--color-danger)",
  Critical: "var(--color-danger)",
};

export default function BrandAuditPage() {
  const { data: audit, isLoading, error, refresh } = useData("getBrandAudit");

  if (isLoading || !audit) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  const abbreviate = (name: string) =>
    name
      .replace("Messaging ", "Msg ")
      .replace("Visual Identity", "Visual ID")
      .replace("Competitive Positioning", "Positioning")
      .replace("Content Strategy", "Content")
      .replace("Differentiation", "Differ.");

  const radarData = audit.dimensions.map((d) => ({
    dimension: abbreviate(d.name),
    score: d.score,
    benchmark: d.benchmark,
  }));

  const barData = audit.dimensions.map((d) => ({
    name: abbreviate(d.name),
    score: d.score,
    benchmark: d.benchmark,
    gap: d.score - d.benchmark,
  }));

  const tierColor = TIER_COLORS[audit.tier] ?? "var(--color-text-muted)";

  return (
    <div>
      <PageHeader title="Brand Audit" subtitle="6-dimension brand health scoring — visual identity, messaging, differentiation" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        <KpiCard label="Overall Score" value={String(audit.overall_score)} icon={<ClipboardCheck size={18} />} accent={tierColor} />
        <KpiCard label="Tier" value={audit.tier} icon={<Award size={18} />} accent={tierColor} />
        <KpiCard label="Percentile" value={`${audit.percentile}th`} icon={<TrendingUp size={18} />} accent="var(--color-accent)" />
        <KpiCard label="Dimensions" value={String(audit.dimensions.length)} icon={<Target size={18} />} accent="var(--color-primary)" />
      </div>

      {/* Score Ring + Radar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Brand Health Radar</h3>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} />
              <Radar name="Your Score" dataKey="score" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.25} strokeWidth={2} />
              <Radar name="Benchmark" dataKey="benchmark" stroke="var(--color-text-muted)" fill="var(--color-text-muted)" fillOpacity={0.08} strokeWidth={1} strokeDasharray="4 4" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Score vs Benchmark</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={32} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="score" name="Your Score" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="benchmark" name="Industry Avg" fill="var(--color-bg-elevated)" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Dimension Breakdown */}
      <Card className="mb-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Dimension Breakdown</h3>
        <div className="space-y-4">
          {audit.dimensions.sort((a, b) => a.score - b.score).map((dim) => {
            const aboveBenchmark = dim.score >= dim.benchmark;
            return (
              <div key={dim.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-medium text-[var(--color-text)]">{dim.name}</span>
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">({(dim.weight * 100).toFixed(0)}% weight)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-bold", aboveBenchmark ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>
                      {dim.score}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">/ {dim.benchmark} avg</span>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-[var(--color-bg-muted)] overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${dim.score}%`, backgroundColor: aboveBenchmark ? "var(--color-success)" : "var(--color-warning)" }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-[var(--color-text-muted)]"
                    style={{ left: `${dim.benchmark}%` }}
                    title={`Benchmark: ${dim.benchmark}`}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{dim.description}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Priority Actions */}
      <Card accent="var(--color-primary)">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={18} className="text-[var(--color-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Priority Actions</h3>
        </div>
        <div className="space-y-2">
          {audit.priority_actions.map((action, i) => (
            <div key={i} className="flex items-start gap-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] px-3 py-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-[var(--color-text)]">{action}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Overall Assessment */}
      <Card className="mt-6">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Overall Assessment</h3>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 shrink-0" style={{ borderColor: tierColor }}>
            <span className="text-xl font-bold text-[var(--color-text)]">{audit.overall_score}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={audit.tier === "Strong" ? "success" : audit.tier === "Developing" ? "warning" : "danger"}>{audit.tier}</Badge>
              <span className="text-xs text-[var(--color-text-muted)]">{audit.percentile}th percentile among creative consultancies</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {audit.tier === "Strong" && "Your brand is well-positioned with strong fundamentals across most dimensions."}
              {audit.tier === "Developing" && "Solid foundation with room for improvement. Focus on differentiation and consistency to move into Strong tier."}
              {audit.tier === "Needs Work" && "Several areas need attention. Prioritize visual identity and messaging clarity for the biggest impact."}
              {audit.tier === "Critical" && "Urgent brand work needed. Start with the priority actions above before expanding marketing spend."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
