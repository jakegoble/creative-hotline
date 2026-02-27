"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatCurrency, cn } from "@/lib/utils";
import {
  calculateHealthScore,
  generateOpportunities,
  getBenchmarks,
  generateDecisionPrompts,
  INTAKE_PROMPTS,
  type Opportunity,
  type IntakeData,
  type DecisionPrompt,
} from "@/lib/intelligence";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, ZAxis,
  BarChart, Bar,
} from "recharts";
import {
  Brain, Zap, Target, TrendingUp, Clock, ChevronDown, ChevronUp,
  ArrowRight, CheckCircle2, Lightbulb, DollarSign, Users,
  BarChart3, Shield, Sparkles, Check, HelpCircle,
} from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  now: "#f85149",
  next: "#f0c040",
  later: "#58a6ff",
  explore: "#a78bfa",
};

const PRIORITY_LABELS: Record<string, string> = {
  now: "Do Now",
  next: "Do Soon",
  later: "Plan Later",
  explore: "Explore",
};

const CATEGORY_ICONS: Record<string, typeof Zap> = {
  revenue: DollarSign,
  pipeline: Target,
  marketing: BarChart3,
  retention: Users,
  product: Sparkles,
  brand: Lightbulb,
  operations: Shield,
  content: Lightbulb,
  automation: Zap,
  pricing: DollarSign,
  partnerships: Users,
  expansion: TrendingUp,
};

export default function AIInsightsPage() {
  const [expandedOpp, setExpandedOpp] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"insights" | "decisions" | "intake" | "benchmarks">("insights");
  const [intakeData] = useState<IntakeData>({});
  const [selectedChoices, setSelectedChoices] = useState<Record<string, Set<string>>>({});

  // Load all data
  const { data: clients, isLoading: l1, error: e1 } = useData("getClients");
  const { data: scored, isLoading: l2, error: e2 } = useData("getScoredClients");
  const { data: channels, isLoading: l3, error: e3 } = useData("getChannelMetrics");
  const { data: funnel, isLoading: l4, error: e4 } = useData("getFunnel");
  const { data: ltv, isLoading: l5, error: e5 } = useData("getLtv");

  // Calculate scores and opportunities (hooks must be called before conditional returns)
  const health = useMemo(
    () => (clients && scored && channels && funnel && ltv)
      ? calculateHealthScore(clients, scored, channels, funnel, ltv, intakeData)
      : null,
    [clients, scored, channels, funnel, ltv, intakeData]
  );

  const opportunities = useMemo(
    () => (clients && scored && channels && funnel && ltv && health)
      ? generateOpportunities(clients, scored, channels, funnel, ltv, health, intakeData)
      : [],
    [clients, scored, channels, funnel, ltv, health, intakeData]
  );

  const benchmarks = useMemo(
    () => (clients && channels && ltv)
      ? getBenchmarks(clients, channels, ltv, intakeData)
      : [],
    [clients, channels, ltv, intakeData]
  );

  const decisionPrompts = useMemo(
    () => (clients && scored && channels && funnel && ltv)
      ? generateDecisionPrompts(clients, scored, channels, funnel, ltv, intakeData)
      : [],
    [clients, scored, channels, funnel, ltv, intakeData]
  );

  const isLoading = l1 || l2 || l3 || l4 || l5;
  const firstError = e1 || e2 || e3 || e4 || e5;

  if (isLoading || !clients || !scored || !channels || !funnel || !ltv || !health) return <LoadingState />;
  if (firstError) return <ErrorState message={firstError.message} />;

  const toggleChoice = (promptId: string, choiceId: string) => {
    setSelectedChoices((prev) => {
      const current = prev[promptId] ?? new Set<string>();
      const next = new Set(current);
      if (next.has(choiceId)) next.delete(choiceId);
      else next.add(choiceId);
      return { ...prev, [promptId]: next };
    });
  };

  const answeredDecisions = Object.keys(selectedChoices).filter((k) => selectedChoices[k].size > 0).length;

  // Group opportunities by priority
  const byPriority = {
    now: opportunities.filter((o) => o.priority === "now"),
    next: opportunities.filter((o) => o.priority === "next"),
    later: opportunities.filter((o) => o.priority === "later"),
    explore: opportunities.filter((o) => o.priority === "explore"),
  };

  // Radar chart data
  const radarData = health.dimensions.map((d) => ({
    subject: d.label,
    score: d.value,
    fullMark: 100,
  }));

  // Scatter chart data (effort vs impact)
  const scatterData = opportunities.map((o) => ({
    x: o.effort,
    y: o.impact,
    name: o.title,
    priority: o.priority,
  }));

  // Intake progress
  const intakeSections = [...new Set(INTAKE_PROMPTS.map((p) => p.section))];
  const totalQuestions = INTAKE_PROMPTS.length;
  const answeredQuestions = INTAKE_PROMPTS.filter((p) => intakeData[p.field] !== undefined).length;
  const intakeProgress = totalQuestions > 0 ? answeredQuestions / totalQuestions : 0;

  const tierColor = health.tier === "thriving" ? "var(--color-success)" :
    health.tier === "growing" ? "var(--color-warning)" :
    health.tier === "emerging" ? "var(--color-primary)" : "var(--color-danger)";

  return (
    <div>
      <PageHeader
        title="AI Insights"
        subtitle="Intelligence engine — data-driven recommendations for growth"
        actions={
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-[var(--color-primary)]" />
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              {opportunities.length} opportunities identified
            </span>
          </div>
        }
      />

      {/* Tab Navigation */}
      <div className="mb-6 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] p-1 w-fit min-w-max">
          {(["insights", "decisions", "intake", "benchmarks"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-[var(--radius-sm)] px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab
                  ? "bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              )}
            >
              {tab === "insights" ? "Strategy" : tab === "decisions" ? `Decisions (${answeredDecisions}/${decisionPrompts.length})` : tab === "intake" ? `Intake (${answeredQuestions}/${totalQuestions})` : "Benchmarks"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "insights" && (
        <>
          {/* Hero Score */}
          <Card className="mb-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="text-center md:text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                  Business Health Score
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-bold" style={{ color: tierColor }}>
                    {health.composite}
                  </span>
                  <span className="text-lg font-semibold capitalize" style={{ color: tierColor }}>
                    {health.tier}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-md">
                  {health.summary}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:ml-auto">
                {health.dimensions.map((d) => (
                  <div
                    key={d.key}
                    className="flex items-center gap-2 rounded-full px-3 py-1.5"
                    style={{ backgroundColor: `${d.color}15` }}
                  >
                    <span className="text-xs font-semibold" style={{ color: d.color }}>
                      {d.label}
                    </span>
                    <span className="text-xs font-bold" style={{ color: d.color }}>
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
            {/* Radar Chart */}
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Strategy Shape</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} />
                  <Radar
                    name="Score" dataKey="score" stroke="var(--color-primary)"
                    fill="var(--color-primary)" fillOpacity={0.2} strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            {/* Effort/Impact Matrix */}
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Effort vs Impact Matrix</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    type="number" dataKey="x" name="Effort" domain={[0, 10]}
                    tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                    label={{ value: "Effort →", position: "insideBottomRight", offset: -4, style: { fontSize: 10, fill: "var(--color-text-muted)" } }}
                  />
                  <YAxis
                    type="number" dataKey="y" name="Impact" domain={[0, 10]}
                    tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                    label={{ value: "Impact →", angle: -90, position: "insideTopLeft", offset: 10, style: { fontSize: 10, fill: "var(--color-text-muted)" } }}
                  />
                  <ZAxis range={[80, 80]} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
                    formatter={(_: unknown, name) => [String(name) === "x" ? "Effort" : "Impact"]}
                    labelFormatter={() => ""}
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2 shadow-[var(--shadow-md)]">
                          <p className="text-xs font-semibold text-[var(--color-text)]">{data.name}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">
                            Effort: {data.x} · Impact: {data.y}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[entry.priority] ?? "var(--color-text-muted)"} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                    <div className="h-2 w-2 rounded-full" style={{ background: PRIORITY_COLORS[key] }} />
                    {label}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Quick Revenue Impact */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
            {opportunities.filter((o) => o.revenueImpact).slice(0, 3).map((opp) => (
              <KpiCard
                key={opp.id}
                label={opp.title}
                value={opp.revenueImpact!}
                icon={<DollarSign size={18} />}
                accent={PRIORITY_COLORS[opp.priority]}
              />
            ))}
          </div>

          {/* Priority Lanes */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
            {(["now", "next", "later"] as const).map((priority) => (
              <div key={priority}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: PRIORITY_COLORS[priority] }} />
                  <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                    {PRIORITY_LABELS[priority]}
                  </span>
                  <span className="ml-auto text-[10px] font-bold text-[var(--color-text-muted)]">
                    {byPriority[priority].length}
                  </span>
                </div>
                <div className="space-y-3">
                  {byPriority[priority].map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opp={opp}
                      expanded={expandedOpp === opp.id}
                      onToggle={() => setExpandedOpp(expandedOpp === opp.id ? null : opp.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "decisions" && (
        <div>
          <Card className="mb-6">
            <div className="flex items-start gap-3">
              <HelpCircle size={20} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Data-Driven Decision Prompts</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  These questions are generated from your actual business data. Your answers shape
                  which opportunities the engine prioritizes and how it models your growth path.
                  Select all that apply — each choice influences your strategic recommendations.
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] transition-all duration-500"
                style={{ width: `${decisionPrompts.length > 0 ? (answeredDecisions / decisionPrompts.length) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--color-text-muted)]">
              {answeredDecisions} of {decisionPrompts.length} decisions made
            </p>
          </Card>

          <div className="space-y-6">
            {decisionPrompts.map((prompt) => {
              const selections = selectedChoices[prompt.id] ?? new Set<string>();
              const isAnswered = selections.size > 0;
              return (
                <Card key={prompt.id} accent={isAnswered ? "var(--color-success)" : "var(--color-border)"}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge variant="accent">{prompt.section}</Badge>
                      <h3 className="text-sm font-semibold text-[var(--color-text)] mt-2">{prompt.question}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">{prompt.context}</p>
                    </div>
                    {isAnswered && <Check size={18} className="text-[var(--color-success)] shrink-0" />}
                  </div>

                  <div className="space-y-2">
                    {prompt.choices.map((choice) => {
                      const isSelected = selections.has(choice.id);
                      return (
                        <button
                          key={choice.id}
                          onClick={() => toggleChoice(prompt.id, choice.id)}
                          className={cn(
                            "w-full text-left rounded-[var(--radius-sm)] border px-4 py-3 transition-all",
                            isSelected
                              ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]"
                              : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-muted)]"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors",
                              isSelected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                                : "border-[var(--color-border-strong)]"
                            )}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-sm font-medium", isSelected ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]")}>
                                  {choice.label}
                                </span>
                                {choice.recommended && (
                                  <Badge variant="success" className="text-[9px] px-1.5 py-0">recommended</Badge>
                                )}
                              </div>
                              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{choice.description}</p>
                              {choice.dataReason && (
                                <p className="text-[10px] text-[var(--color-accent)] mt-1 flex items-center gap-1">
                                  <BarChart3 size={10} />
                                  {choice.dataReason}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      Source: {prompt.dataSource}
                    </p>
                    <p className="text-[10px] text-[var(--color-primary)]">
                      {prompt.impact}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "intake" && (
        <div>
          {/* Progress bar */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Business Intelligence Intake</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  The more you share, the smarter the insights. Every answer unlocks new opportunities.
                </p>
              </div>
              <span className="text-lg font-bold text-[var(--color-primary)]">
                {Math.round(intakeProgress * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[#FF8C50] transition-all duration-500"
                style={{ width: `${intakeProgress * 100}%` }}
              />
            </div>
          </Card>

          {/* Sections */}
          {intakeSections.map((section) => {
            const prompts = INTAKE_PROMPTS.filter((p) => p.section === section);
            const answered = prompts.filter((p) => intakeData[p.field] !== undefined).length;
            return (
              <Card key={section} className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">{section}</h3>
                  <Badge variant={answered === prompts.length ? "success" : answered > 0 ? "warning" : "default"}>
                    {answered}/{prompts.length}
                  </Badge>
                </div>
                <div className="space-y-4">
                  {prompts.map((prompt) => (
                    <div key={prompt.id}>
                      <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        {prompt.question}
                        {prompt.required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
                      </label>
                      {prompt.hint && (
                        <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5">{prompt.hint}</p>
                      )}
                      {(prompt.type === "text" || prompt.type === "number") && (
                        <input
                          type={prompt.type}
                          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                          placeholder={prompt.type === "number" ? "0" : "Type your answer..."}
                        />
                      )}
                      {prompt.type === "textarea" && (
                        <textarea
                          rows={3}
                          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
                          placeholder="Type your answer..."
                        />
                      )}
                      {prompt.type === "select" && (
                        <select className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none">
                          <option value="">Select...</option>
                          {prompt.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      )}
                      {prompt.type === "boolean" && (
                        <div className="flex gap-2">
                          {["Yes", "No"].map((opt) => (
                            <button key={opt} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                      {prompt.type === "slider" && (
                        <div className="flex items-center gap-3">
                          <input type="range" min="1" max="10" className="flex-1 accent-[var(--color-primary)]" />
                          <span className="text-sm font-bold text-[var(--color-text-muted)] w-6 text-center">5</span>
                        </div>
                      )}
                      {prompt.type === "multiselect" && (
                        <div className="flex flex-wrap gap-2">
                          {prompt.options?.map((opt) => (
                            <button key={opt} className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                      {prompt.type === "tags" && (
                        <input
                          type="text"
                          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                          placeholder="Type and press Enter to add..."
                        />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "benchmarks" && (
        <div>
          <Card className="mb-6">
            <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">Industry Benchmarks</h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              How you compare to creative consultancies at different stages
            </p>
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Metric</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">You</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Emerging</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Growing</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Established</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((b) => {
                    const tier =
                      b.higherIsBetter
                        ? b.yourValue >= b.established ? "established" : b.yourValue >= b.growing ? "growing" : b.yourValue >= b.emerging ? "emerging" : "below"
                        : b.yourValue <= b.established ? "established" : b.yourValue <= b.growing ? "growing" : b.yourValue <= b.emerging ? "emerging" : "below";
                    const color = tier === "established" ? "var(--color-success)" : tier === "growing" ? "var(--color-warning)" : tier === "emerging" ? "var(--color-primary)" : "var(--color-danger)";
                    return (
                      <tr key={b.metric} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-4 py-3 text-sm font-medium text-[var(--color-text)]">{b.metric}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold" style={{ color }}>
                            {b.unit === "$" ? formatCurrency(b.yourValue) : `${b.yourValue}${b.unit === "%" ? "%" : ""}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-[var(--color-text-muted)]">
                          {b.unit === "$" ? formatCurrency(b.emerging) : `${b.emerging}${b.unit === "%" ? "%" : ""}`}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-[var(--color-text-muted)]">
                          {b.unit === "$" ? formatCurrency(b.growing) : `${b.growing}${b.unit === "%" ? "%" : ""}`}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-[var(--color-text-muted)]">
                          {b.unit === "$" ? formatCurrency(b.established) : `${b.established}${b.unit === "%" ? "%" : ""}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Visual benchmark bars */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Visual Comparison</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={benchmarks.filter((b) => b.higherIsBetter).slice(0, 6).map((b) => ({
                  metric: b.metric,
                  You: b.yourValue,
                  Growing: b.growing,
                  Established: b.established,
                }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="metric" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                <Bar dataKey="You" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="Growing" fill="var(--color-text-muted)" radius={[0, 4, 4, 0]} barSize={12} opacity={0.4} />
                <Bar dataKey="Established" fill="var(--color-success)" radius={[0, 4, 4, 0]} barSize={12} opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opportunity Card Component
// ---------------------------------------------------------------------------

function OpportunityCard({
  opp,
  expanded,
  onToggle,
}: {
  opp: Opportunity;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = CATEGORY_ICONS[opp.category] ?? Lightbulb;

  return (
    <Card className="p-0 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-[var(--color-bg-muted)] transition-colors"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] mt-0.5"
            style={{ backgroundColor: `${PRIORITY_COLORS[opp.priority]}15`, color: PRIORITY_COLORS[opp.priority] }}
          >
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text)]">{opp.title}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
              {opp.description}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Effort: {opp.effort}/10
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Impact: {opp.impact}/10
              </span>
              <span className="text-[10px] font-bold" style={{ color: PRIORITY_COLORS[opp.priority] }}>
                ROI: {opp.roi.toFixed(1)}x
              </span>
            </div>
          </div>
          {expanded ? <ChevronUp size={14} className="text-[var(--color-text-muted)] shrink-0 mt-1" /> : <ChevronDown size={14} className="text-[var(--color-text-muted)] shrink-0 mt-1" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-bg)]/50">
          {/* Why */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
              Why This Matters
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">{opp.why}</p>
          </div>

          {/* Revenue Impact */}
          {opp.revenueImpact && (
            <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] p-3">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-[var(--color-primary)]" />
                <span className="text-xs font-bold text-[var(--color-primary)]">{opp.revenueImpact}</span>
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
              Activation Steps
            </p>
            <div className="space-y-2">
              {opp.steps.map((step) => (
                <div key={step.step} className="flex gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[10px] font-bold text-[var(--color-text-muted)]">
                    {step.step}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text)]">{step.action}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{step.detail}</p>
                    {step.tool && (
                      <Badge variant="accent" className="mt-1">{step.tool}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
              Track These Metrics
            </p>
            <div className="flex flex-wrap gap-1.5">
              {opp.metrics.map((m) => (
                <Badge key={m} variant="default">{m}</Badge>
              ))}
            </div>
          </div>

          {/* Data Evidence */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
              Data Evidence
            </p>
            <div className="space-y-1">
              {opp.dataPoints.filter(Boolean).map((dp, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-[var(--color-success)]" />
                  <span className="text-[11px] text-[var(--color-text-secondary)]">{dp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeframe */}
          <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
            <Clock size={10} />
            <span>Timeframe: {opp.timeframe}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
