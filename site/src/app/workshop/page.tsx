"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, KpiCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatDate, cn } from "@/lib/utils";
import {
  Zap, Users, Play, CheckCircle2, Clock, AlertCircle, ChevronRight,
  Download, Share2, RotateCw
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  product: string;
  intakeCompleted?: boolean;
  status?: string;
}

interface WorkshopSession {
  id: string;
  clientId: string;
  clientName: string;
  startedAt: string;
  completedAt?: string;
  status: "not_started" | "in_progress" | "completed";
  phase: number;
  outcomes?: Record<string, unknown>;
}

export default function WorkshopPage() {
  const { data: clients, isLoading, error, refresh } = useData("getClients");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [currentSession, setCurrentSession] = useState<WorkshopSession | null>(null);
  const [phase, setPhase] = useState(1);
  const [showSessionSummary, setShowSessionSummary] = useState(false);

  // Filter clients ready for workshop (intake complete, status = "Ready for Call" or "Call Complete")
  const workshopReadyClients = clients?.filter((c: Client) =>
    c.intakeCompleted && (c.status === "Ready for Call" || c.status === "Call Complete")
  ) || [];

  const handleStartWorkshop = (client: Client) => {
    const session: WorkshopSession = {
      id: `ws_${Date.now()}`,
      clientId: client.id,
      clientName: client.name,
      startedAt: new Date().toISOString(),
      status: "in_progress",
      phase: 1,
    };
    setSelectedClient(client);
    setCurrentSession(session);
    setPhase(1);
  };

  const handlePhaseComplete = (phaseNumber: number) => {
    if (phaseNumber < 6) {
      setPhase(phaseNumber + 1);
      if (currentSession) {
        setCurrentSession({
          ...currentSession,
          phase: phaseNumber + 1,
        });
      }
    } else {
      setShowSessionSummary(true);
    }
  };

  const handleCompleteSession = async () => {
    if (currentSession) {
      const completedSession: WorkshopSession = {
        ...currentSession,
        status: "completed",
        completedAt: new Date().toISOString(),
      };
      setCurrentSession(completedSession);

      // Trigger follow-up scheduling via n8n
      try {
        await fetch("/api/workshop/schedule-followups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: currentSession.clientId,
            clientName: currentSession.clientName,
            sessionId: currentSession.id,
            dates: {
              oneDay: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              sevenDays: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              thirtyDays: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        });
      } catch (err) {
        console.error("Failed to schedule follow-ups:", err);
      }
    }
  };

  if (isLoading || !clients) return <LoadingState />;

  // If a session is in progress, show the workshop conductor
  if (currentSession && selectedClient && !showSessionSummary) {
    return <WorkshopConductor
      client={selectedClient}
      session={currentSession}
      currentPhase={phase}
      onPhaseComplete={handlePhaseComplete}
    />;
  }

  // If session is complete, show summary
  if (showSessionSummary && currentSession && selectedClient) {
    return <WorkshopSummary
      client={selectedClient}
      session={currentSession}
      onComplete={handleCompleteSession}
      onStartNew={() => {
        setSelectedClient(null);
        setCurrentSession(null);
        setPhase(1);
        setShowSessionSummary(false);
      }}
    />;
  }

  // Show workshop selector
  return (
    <div>
      <PageHeader
        title="Workshop"
        subtitle="Run creative direction workshops with clients — screen share facilitation, outcomes tracking, and automated follow-ups"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        <KpiCard
          label="Ready for Workshop"
          value={String(workshopReadyClients.length)}
          icon={<Users size={18} />}
          accent="var(--color-primary)"
        />
        <KpiCard
          label="In Progress"
          value="0"
          icon={<Zap size={18} />}
          accent="var(--color-warning)"
        />
        <KpiCard
          label="Completed"
          value="0"
          icon={<CheckCircle2 size={18} />}
          accent="var(--color-success)"
        />
        <KpiCard
          label="Follow-ups Sent"
          value="0"
          icon={<RotateCw size={18} />}
          accent="var(--color-accent)"
        />
      </div>

      {/* Clients Ready for Workshop */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Clients Ready for Workshop</h2>
        <div className="space-y-3">
          {workshopReadyClients.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <AlertCircle size={32} className="text-[var(--color-text-muted)] mb-3" />
              <p className="text-sm text-[var(--color-text-secondary)]">No clients ready for workshop yet</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Clients need to complete intake form first</p>
            </Card>
          ) : (
            workshopReadyClients.map((client: Client) => (
              <Card key={client.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-[var(--color-text)]">{client.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{client.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge>{client.product}</Badge>
                    <Badge variant="success">{client.status}</Badge>
                  </div>
                </div>
                <button
                  onClick={() => handleStartWorkshop(client)}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  <Play size={16} />
                  Start Workshop
                </button>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Workshop Conductor Component
function WorkshopConductor({
  client,
  session,
  currentPhase,
  onPhaseComplete,
}: {
  client: Client;
  session: WorkshopSession;
  currentPhase: number;
  onPhaseComplete: (phase: number) => void;
}) {
  const phases = [
    {
      number: 1,
      name: "Research Brief",
      description: "Client context, challenges, and opportunities",
      icon: "📋",
    },
    {
      number: 2,
      name: "Workshop Setup",
      description: "Facilitation guide and workshop agenda",
      icon: "🎯",
    },
    {
      number: 3,
      name: "Creative Direction",
      description: "Interactive workshop facilitation",
      icon: "💡",
    },
    {
      number: 4,
      name: "Outcome Capture",
      description: "Key ideas, decisions, and insights",
      icon: "✏️",
    },
    {
      number: 5,
      name: "Action Planning",
      description: "Next steps and implementation timeline",
      icon: "📌",
    },
    {
      number: 6,
      name: "Debrief & Follow-ups",
      description: "Session summary and scheduled check-ins",
      icon: "✅",
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Workshop: ${client.name}`}
        subtitle={`Phase ${currentPhase} of 6 - ${phases[currentPhase - 1]?.name}`}
      />

      {/* Phase Progress */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-[var(--color-primary)]" />
          <h3 className="font-semibold text-[var(--color-text)]">Workshop Progress</h3>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {phases.map((p) => (
            <div
              key={p.number}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-[var(--radius-sm)] transition-colors",
                currentPhase === p.number
                  ? "bg-[var(--color-primary)] text-white"
                  : currentPhase > p.number
                  ? "bg-[var(--color-success)] text-white"
                  : "bg-[var(--color-bg-muted)]"
              )}
            >
              <span className="text-lg mb-1">{p.icon}</span>
              <span className="text-[10px] font-bold text-center">{p.number}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Current Phase Content */}
      <Card className="mb-6 p-6">
        <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
          {phases[currentPhase - 1]?.name}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          {phases[currentPhase - 1]?.description}
        </p>

        {/* Phase-specific content */}
        <div className="bg-[var(--color-bg-muted)] rounded-[var(--radius-sm)] p-4 mb-6 min-h-64 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg mb-2">{phases[currentPhase - 1]?.icon}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {phases[currentPhase - 1]?.name} content loaded here
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              (Component rendering: Research Brief, Workshop Conductor, etc.)
            </p>
          </div>
        </div>

        {/* Phase Controls */}
        <div className="flex gap-3 justify-between">
          <button
            disabled={currentPhase === 1}
            className="px-4 py-2 text-sm font-semibold rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-bg-elevated)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => onPhaseComplete(currentPhase)}
            className="px-4 py-2 text-sm font-semibold rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            {currentPhase === 6 ? "Complete Workshop" : "Next Phase"}
            <ChevronRight size={16} />
          </button>
        </div>
      </Card>

      {/* Session Info */}
      <Card>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Started</p>
            <p className="text-sm font-semibold text-[var(--color-text)]">{formatDate(session.startedAt)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Duration</p>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000)} min
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Status</p>
            <p className="text-sm font-semibold text-[var(--color-text)]">{session.status}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Workshop Summary Component
function WorkshopSummary({
  client,
  session,
  onComplete,
  onStartNew,
}: {
  client: Client;
  session: WorkshopSession;
  onComplete: () => void;
  onStartNew: () => void;
}) {
  return (
    <div>
      <PageHeader
        title="Workshop Complete"
        subtitle={`Session with ${client.name} — ${formatDate(session.startedAt)}`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 mb-6">
        <KpiCard
          label="Session Duration"
          value={`${Math.floor((new Date(session.completedAt || new Date().toISOString()).getTime() - new Date(session.startedAt).getTime()) / 60000)} min`}
          icon={<Clock size={18} />}
          accent="var(--color-primary)"
        />
        <KpiCard
          label="Phases Completed"
          value="6/6"
          icon={<CheckCircle2 size={18} />}
          accent="var(--color-success)"
        />
        <KpiCard
          label="Outcomes Captured"
          value="12"
          icon={<Zap size={18} />}
          accent="var(--color-accent)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="flex flex-col">
          <h3 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <Download size={18} />
            Download Session
          </h3>
          <button className="w-full px-4 py-2 text-sm font-semibold rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity">
            Download PDF Report
          </button>
        </Card>
        <Card className="flex flex-col">
          <h3 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <Share2 size={18} />
            Share Results
          </h3>
          <button className="w-full px-4 py-2 text-sm font-semibold rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity">
            Send to Client
          </button>
        </Card>
      </div>

      <Card className="mb-6">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Follow-up Reminders</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-muted)] rounded-[var(--radius-sm)]">
            <CheckCircle2 size={18} className="text-[var(--color-success)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">1-Day Follow-up</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Scheduled for tomorrow</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-muted)] rounded-[var(--radius-sm)]">
            <CheckCircle2 size={18} className="text-[var(--color-success)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">7-Day Follow-up</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Scheduled for next week</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-muted)] rounded-[var(--radius-sm)]">
            <Clock size={18} className="text-[var(--color-warning)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">30-Day Follow-up</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Scheduled for next month</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <button
          onClick={onStartNew}
          className="flex-1 px-4 py-2 text-sm font-semibold rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-bg-elevated)] transition-colors"
        >
          Start New Workshop
        </button>
        <button
          onClick={onComplete}
          className="flex-1 px-4 py-2 text-sm font-semibold rounded-[var(--radius-sm)] bg-[var(--color-success)] text-white hover:opacity-90 transition-opacity"
        >
          Complete & Save
        </button>
      </div>
    </div>
  );
}
