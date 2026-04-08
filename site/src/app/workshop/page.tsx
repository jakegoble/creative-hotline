"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import {
  Zap, Users, Play, CheckCircle2, Clock, AlertCircle, ChevronRight,
  ChevronLeft, Sun, LayoutGrid, X, Maximize2, Minimize2,
  FileText, Mic, ClipboardCheck, Send, CalendarCheck, Eye,
  ExternalLink, RotateCw, ArrowRight
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntakeRecord {
  id: string;
  client_name: string;
  email: string;
  role: string;
  brand: string;
  website_ig?: string;
  creative_emergency: string;
  desired_outcome: string[];
  what_theyve_tried: string;
  deadline: string;
  constraints: string;
  intake_status: string;
  ai_summary: string;
  call_date?: string;
  action_plan_sent: boolean;
  linked_payment_ids: string[];
}

type PipelineStageKey = "morning_prep" | "session" | "review" | "deliverable" | "send" | "followup" | "complete";

interface SessionSlot {
  slotNumber: 1 | 2 | 3;
  client: IntakeRecord | null;
  currentStage: PipelineStageKey;
  startedAt?: string;
  completedStages: PipelineStageKey[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIPELINE_STAGES: {
  key: PipelineStageKey;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  time: string;
  templates: { name: string; file: string; description: string }[];
}[] = [
  {
    key: "morning_prep",
    label: "Morning Prep",
    shortLabel: "Prep",
    icon: <Sun size={16} />,
    time: "9:00–9:30",
    templates: [
      { name: "Morning Prep", file: "tch-morning-prep.html", description: "Pre-session research dashboard" },
      { name: "Research Brief", file: "tch-research-brief.html", description: "Deep client research" },
    ],
  },
  {
    key: "session",
    label: "Workshop Session",
    shortLabel: "Session",
    icon: <Mic size={16} />,
    time: "45 min",
    templates: [
      { name: "Session Page", file: "tch-workshop-session.html", description: "Live session — screen-shared with client" },
      { name: "Facilitator Guide", file: "tch-facilitator-guide.html", description: "Internal reference for session flow" },
    ],
  },
  {
    key: "review",
    label: "Review",
    shortLabel: "Review",
    icon: <ClipboardCheck size={16} />,
    time: "12:35–1:45",
    templates: [
      { name: "Review Dashboard", file: "tch-review-dashboard.html", description: "Review all 3 deliverables, MC refinement" },
    ],
  },
  {
    key: "deliverable",
    label: "Deliverable",
    shortLabel: "Deliver",
    icon: <FileText size={16} />,
    time: "",
    templates: [
      { name: "Deliverable Generator", file: "tch-deliverable-generator.html", description: "Paste Claude draft → formatted action plan" },
      { name: "Action Plan Preview", file: "tch-action-plan.html", description: "The $499 product — client-facing deliverable" },
      { name: "Brand Audit", file: "tch-brand-audit.html", description: "Brand audit report" },
    ],
  },
  {
    key: "send",
    label: "Send",
    shortLabel: "Send",
    icon: <Send size={16} />,
    time: "1:45–2:15",
    templates: [
      { name: "Caller Prep", file: "tch-caller-prep.html", description: "Pre-call one-pager for next client" },
    ],
  },
  {
    key: "followup",
    label: "Follow-up",
    shortLabel: "Follow",
    icon: <CalendarCheck size={16} />,
    time: "",
    templates: [
      { name: "Follow-up Tracker", file: "tch-follow-up-tracker.html", description: "Day 2/7/14/21/30/60/90 tracker" },
    ],
  },
];

const STAGE_INDEX: Record<PipelineStageKey, number> = {
  morning_prep: 0,
  session: 1,
  review: 2,
  deliverable: 3,
  send: 4,
  followup: 5,
  complete: 6,
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function WorkshopPage() {
  const [activeTab, setActiveTab] = useState<"today" | "pipeline">("today");
  const [intakes, setIntakes] = useState<IntakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntakes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notion/intakes");
      if (!response.ok) throw new Error("Failed to fetch intakes");
      const data = await response.json();
      setIntakes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIntakes(); }, [fetchIntakes]);

  const submittedIntakes = intakes.filter((i) => i.intake_status === "Submitted");
  const leads = intakes.filter((i) => i.intake_status?.includes("Lead"));
  const readyForCall = intakes.filter((i) => i.intake_status === "Ready for Call" || i.intake_status === "Intake Complete");
  const callComplete = intakes.filter((i) => i.intake_status === "Call Complete");
  const followUpSent = intakes.filter((i) => i.intake_status === "Follow-Up Sent");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchIntakes} />;

  return (
    <div>
      <PageHeader
        title="Workshop"
        subtitle="Run your daily 3-call pipeline — prep, session, review, deliver, send, follow up"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchIntakes}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              <RotateCw size={12} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] w-fit">
        <button
          onClick={() => setActiveTab("today")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-colors",
            activeTab === "today"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          )}
        >
          <Sun size={14} />
          Today&apos;s Sessions
        </button>
        <button
          onClick={() => setActiveTab("pipeline")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition-colors",
            activeTab === "pipeline"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          )}
        >
          <LayoutGrid size={14} />
          Pipeline
        </button>
      </div>

      {activeTab === "today" ? (
        <TodaySessions intakes={intakes} submittedIntakes={submittedIntakes} readyForCall={readyForCall} />
      ) : (
        <PipelineOverview
          intakes={intakes}
          submitted={submittedIntakes}
          leads={leads}
          readyForCall={readyForCall}
          callComplete={callComplete}
          followUpSent={followUpSent}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Today's Sessions Tab
// ---------------------------------------------------------------------------

function TodaySessions({
  intakes,
  submittedIntakes,
  readyForCall,
}: {
  intakes: IntakeRecord[];
  submittedIntakes: IntakeRecord[];
  readyForCall: IntakeRecord[];
}) {
  const [slots, setSlots] = useState<SessionSlot[]>([
    { slotNumber: 1, client: null, currentStage: "morning_prep", completedStages: [] },
    { slotNumber: 2, client: null, currentStage: "morning_prep", completedStages: [] },
    { slotNumber: 3, client: null, currentStage: "morning_prep", completedStages: [] },
  ]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [activeTemplate, setActiveTemplate] = useState<{ file: string; name: string } | null>(null);
  const [iframeExpanded, setIframeExpanded] = useState(false);

  // All clients eligible for today's sessions
  const eligibleClients = [...submittedIntakes, ...readyForCall];

  const assignClient = (slotIndex: number, client: IntakeRecord) => {
    setSlots((prev) => {
      const updated = [...prev];
      updated[slotIndex] = {
        ...updated[slotIndex],
        client,
        startedAt: new Date().toISOString(),
      };
      return updated;
    });
  };

  const advanceStage = (slotIndex: number) => {
    setSlots((prev) => {
      const updated = [...prev];
      const slot = updated[slotIndex];
      const currentIdx = STAGE_INDEX[slot.currentStage];
      const nextStage = PIPELINE_STAGES[currentIdx + 1]?.key || "complete";
      updated[slotIndex] = {
        ...slot,
        currentStage: nextStage as PipelineStageKey,
        completedStages: [...slot.completedStages, slot.currentStage],
      };
      return updated;
    });
    setActiveTemplate(null);
  };

  const goBackStage = (slotIndex: number) => {
    setSlots((prev) => {
      const updated = [...prev];
      const slot = updated[slotIndex];
      const currentIdx = STAGE_INDEX[slot.currentStage];
      if (currentIdx === 0) return updated;
      const prevStage = PIPELINE_STAGES[currentIdx - 1].key;
      updated[slotIndex] = {
        ...slot,
        currentStage: prevStage,
        completedStages: slot.completedStages.filter((s) => s !== prevStage),
      };
      return updated;
    });
    setActiveTemplate(null);
  };

  const currentSlot = slots[activeSlot];
  const currentStageConfig = PIPELINE_STAGES[STAGE_INDEX[currentSlot.currentStage]];

  return (
    <div>
      {/* Session Time Slots */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {slots.map((slot, idx) => (
          <button
            key={idx}
            onClick={() => { setActiveSlot(idx); setActiveTemplate(null); }}
            className={cn(
              "relative p-4 rounded-[var(--radius-md)] border transition-all text-left",
              activeSlot === idx
                ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] shadow-[var(--shadow-md)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
                Session {slot.slotNumber}
              </span>
              {slot.client && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]">
                  {PIPELINE_STAGES[STAGE_INDEX[slot.currentStage]]?.shortLabel || "Done"}
                </span>
              )}
            </div>
            {slot.client ? (
              <>
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">{slot.client.client_name}</p>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">{slot.client.brand || slot.client.email}</p>
                {/* Mini progress bar */}
                <div className="flex gap-0.5 mt-3">
                  {PIPELINE_STAGES.map((stage, i) => (
                    <div
                      key={stage.key}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        slot.completedStages.includes(stage.key)
                          ? "bg-[var(--color-success)]"
                          : slot.currentStage === stage.key
                          ? "bg-[var(--color-primary)]"
                          : "bg-[var(--color-bg-muted)]"
                      )}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">No client assigned</p>
            )}
          </button>
        ))}
      </div>

      {/* Active Session Workspace */}
      {currentSlot.client ? (
        <div>
          {/* Stage Progress Bar */}
          <Card className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-[var(--color-primary)]" />
              <span className="text-sm font-semibold text-[var(--color-text)]">
                {currentSlot.client.client_name} — Pipeline Progress
              </span>
            </div>
            <div className="flex items-center gap-1">
              {PIPELINE_STAGES.map((stage, i) => {
                const isCompleted = currentSlot.completedStages.includes(stage.key);
                const isCurrent = currentSlot.currentStage === stage.key;
                return (
                  <div key={stage.key} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all cursor-default",
                        isCompleted
                          ? "bg-[var(--color-success)] text-white"
                          : isCurrent
                          ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]"
                          : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
                      )}
                    >
                      {isCompleted ? <CheckCircle2 size={12} /> : stage.icon}
                      <span className="hidden md:inline">{stage.shortLabel}</span>
                    </div>
                    {stage.time && (
                      <span className="text-[9px] text-[var(--color-text-muted)] hidden lg:block">{stage.time}</span>
                    )}
                  </div>
                );
              })}
              {/* Complete indicator */}
              <div className="flex-none flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold",
                    currentSlot.currentStage === "complete"
                      ? "bg-[var(--color-success)] text-white"
                      : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
                  )}
                >
                  <CheckCircle2 size={12} />
                  <span className="hidden md:inline">Done</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Current Stage Tools */}
          {currentSlot.currentStage !== "complete" && currentStageConfig && (
            <Card className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                    {currentStageConfig.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">{currentStageConfig.label}</h3>
                    {currentStageConfig.time && (
                      <p className="text-[10px] text-[var(--color-text-muted)]">{currentStageConfig.time}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goBackStage(activeSlot)}
                    disabled={STAGE_INDEX[currentSlot.currentStage] === 0}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={12} />
                    Back
                  </button>
                  <button
                    onClick={() => advanceStage(activeSlot)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
                  >
                    Next Stage
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {/* Template Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {currentStageConfig.templates.map((template) => (
                  <button
                    key={template.file}
                    onClick={() => setActiveTemplate({ file: template.file, name: template.name })}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border transition-all text-left",
                      activeTemplate?.file === template.file
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg-muted)] hover:border-[var(--color-border-strong)]"
                    )}
                  >
                    <FileText size={16} className="text-[var(--color-primary)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-text)] truncate">{template.name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] truncate">{template.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Complete State */}
          {currentSlot.currentStage === "complete" && (
            <Card className="mb-4">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-900/30 mb-3">
                  <CheckCircle2 size={24} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">Session Complete</h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  All stages finished for {currentSlot.client.client_name}
                </p>
                <div className="flex gap-2">
                  <a
                    href={`/templates/tch-follow-up-tracker.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                  >
                    <CalendarCheck size={14} />
                    Open Follow-up Tracker
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Iframe Template Viewer */}
          {activeTemplate && (
            <Card className={cn(
              "overflow-hidden transition-all",
              iframeExpanded ? "fixed inset-4 z-50 m-0 rounded-[var(--radius-lg)]" : ""
            )}>
              <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[var(--color-primary)]" />
                  <span className="text-xs font-semibold text-[var(--color-text)]">{activeTemplate.name}</span>
                  <Badge variant="accent">{currentStageConfig?.label}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`/templates/${activeTemplate.file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => setIframeExpanded(!iframeExpanded)}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
                    title={iframeExpanded ? "Minimize" : "Maximize"}
                  >
                    {iframeExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button
                    onClick={() => { setActiveTemplate(null); setIframeExpanded(false); }}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <TemplateIframe
                src={`/templates/${activeTemplate.file}`}
                clientData={currentSlot.client}
                expanded={iframeExpanded}
              />
            </Card>
          )}

          {/* Client Context Sidebar */}
          <Card className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={14} className="text-[var(--color-text-muted)]" />
              <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Client Context</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)] mb-0.5">Name</p>
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">{currentSlot.client.client_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)] mb-0.5">Brand</p>
                <p className="text-sm text-[var(--color-text)] truncate">{currentSlot.client.brand || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)] mb-0.5">Email</p>
                <p className="text-sm text-[var(--color-text)] truncate">{currentSlot.client.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)] mb-0.5">Role</p>
                <p className="text-sm text-[var(--color-text)] truncate">{currentSlot.client.role || "—"}</p>
              </div>
            </div>
            {currentSlot.client.creative_emergency && (
              <div className="mt-3 p-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)]">
                <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)] mb-1">Creative Emergency</p>
                <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3">{currentSlot.client.creative_emergency}</p>
              </div>
            )}
            {currentSlot.client.ai_summary && (
              <div className="mt-2 p-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)]">
                <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)] mb-1">AI Summary</p>
                <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3">{currentSlot.client.ai_summary}</p>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Client Assignment */
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              Assign Client to Session {currentSlot.slotNumber}
            </h3>
          </div>

          {eligibleClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle size={28} className="text-[var(--color-text-muted)] mb-2" />
              <p className="text-sm text-[var(--color-text-secondary)]">No clients ready for workshop</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Clients need a Submitted or Intake Complete status</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eligibleClients.map((client) => {
                const alreadyAssigned = slots.some((s) => s.client?.id === client.id);
                return (
                  <button
                    key={client.id}
                    disabled={alreadyAssigned}
                    onClick={() => assignClient(activeSlot, client)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-[var(--radius-sm)] border transition-all text-left",
                      alreadyAssigned
                        ? "border-[var(--color-border)] bg-[var(--color-bg-muted)] opacity-50 cursor-not-allowed"
                        : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)] truncate">{client.client_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--color-text-secondary)] truncate">{client.brand || client.email}</span>
                        <Badge>{client.intake_status}</Badge>
                      </div>
                    </div>
                    {alreadyAssigned ? (
                      <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">Assigned</span>
                    ) : (
                      <ArrowRight size={14} className="text-[var(--color-text-muted)] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Iframe with postMessage data passing
// ---------------------------------------------------------------------------

function TemplateIframe({
  src,
  clientData,
  expanded,
}: {
  src: string;
  clientData: IntakeRecord;
  expanded: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Send client data to iframe once loaded
  const handleLoad = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "TCH_CLIENT_DATA",
          payload: {
            name: clientData.client_name,
            email: clientData.email,
            brand: clientData.brand,
            role: clientData.role,
            website: clientData.website_ig,
            creative_emergency: clientData.creative_emergency,
            desired_outcome: clientData.desired_outcome,
            what_theyve_tried: clientData.what_theyve_tried,
            deadline: clientData.deadline,
            constraints: clientData.constraints,
            ai_summary: clientData.ai_summary,
          },
        },
        "*"
      );
    }
  }, [clientData]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      onLoad={handleLoad}
      className={cn(
        "w-full border-0 bg-white",
        expanded ? "h-[calc(100vh-8rem)]" : "h-[600px]"
      )}
      title="Workshop Template"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}

// ---------------------------------------------------------------------------
// Pipeline Overview Tab
// ---------------------------------------------------------------------------

function PipelineOverview({
  intakes,
  submitted,
  leads,
  readyForCall,
  callComplete,
  followUpSent,
}: {
  intakes: IntakeRecord[];
  submitted: IntakeRecord[];
  leads: IntakeRecord[];
  readyForCall: IntakeRecord[];
  callComplete: IntakeRecord[];
  followUpSent: IntakeRecord[];
}) {
  return (
    <div>
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4 mb-6">
        <KpiCard
          label="Total Intakes"
          value={String(intakes.length)}
          icon={<Users size={18} />}
          accent="var(--color-primary)"
        />
        <KpiCard
          label="Submitted"
          value={String(submitted.length)}
          icon={<Zap size={18} />}
          accent="var(--color-warning)"
        />
        <KpiCard
          label="Ready"
          value={String(readyForCall.length)}
          icon={<Play size={18} />}
          accent="var(--color-accent)"
        />
        <KpiCard
          label="Calls Done"
          value={String(callComplete.length)}
          icon={<CheckCircle2 size={18} />}
          accent="var(--color-success)"
        />
        <KpiCard
          label="Follow-ups"
          value={String(followUpSent.length)}
          icon={<CalendarCheck size={18} />}
          accent="var(--color-chart-4)"
        />
        <KpiCard
          label="Leads"
          value={String(leads.length)}
          icon={<AlertCircle size={18} />}
          accent="var(--color-text-muted)"
        />
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <PipelineColumn
          title="Submitted Intakes"
          subtitle="Ready to review & schedule"
          clients={submitted}
          accent="var(--color-warning)"
          emptyMessage="No submitted intakes"
        />
        <PipelineColumn
          title="Ready for Call"
          subtitle="Intake complete, awaiting session"
          clients={readyForCall}
          accent="var(--color-accent)"
          emptyMessage="No clients ready"
        />
        <PipelineColumn
          title="Call Complete"
          subtitle="Session done, deliverable pending"
          clients={callComplete}
          accent="var(--color-success)"
          emptyMessage="No completed calls"
        />
        <PipelineColumn
          title="Follow-up Sent"
          subtitle="Deliverable sent, in follow-up cycle"
          clients={followUpSent}
          accent="var(--color-chart-4)"
          emptyMessage="No active follow-ups"
        />
        <PipelineColumn
          title="Leads"
          subtitle="From ads, referrals, organic"
          clients={leads}
          accent="var(--color-text-muted)"
          emptyMessage="No leads"
        />
      </div>

      {/* Quick Links to Templates */}
      <Card className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-[var(--color-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Workshop Templates</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {PIPELINE_STAGES.flatMap((stage) =>
            stage.templates.map((t) => (
              <a
                key={t.file}
                href={`/templates/${t.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-all"
              >
                <FileText size={12} className="text-[var(--color-primary)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--color-text)] truncate">{t.name}</span>
              </a>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline Column
// ---------------------------------------------------------------------------

function PipelineColumn({
  title,
  subtitle,
  clients,
  accent,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  clients: IntakeRecord[];
  accent: string;
  emptyMessage: string;
}) {
  return (
    <Card accent={accent}>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
          <span className="text-xs font-bold text-[var(--color-text-muted)]">{clients.length}</span>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)]">{subtitle}</p>
      </div>

      {clients.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <p className="text-xs text-[var(--color-text-muted)]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <div
              key={client.id}
              className="p-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] border border-[var(--color-border)]"
            >
              <p className="text-xs font-semibold text-[var(--color-text)] truncate">{client.client_name}</p>
              <p className="text-[10px] text-[var(--color-text-secondary)] truncate mt-0.5">
                {client.brand || client.email}
              </p>
              {client.call_date && (
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                  Call: {formatDate(client.call_date)}
                </p>
              )}
              {client.desired_outcome?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {client.desired_outcome.slice(0, 2).map((outcome) => (
                    <Badge key={outcome}>{outcome}</Badge>
                  ))}
                  {client.desired_outcome.length > 2 && (
                    <Badge>+{client.desired_outcome.length - 2}</Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
