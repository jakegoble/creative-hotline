"use client";

import { PageHeader } from "@/components/layout/page-header";

// ── Status dot ──
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    live: "text-green-400",
    specced: "text-yellow-400",
    blocked: "text-red-400",
    planned: "text-blue-400",
  };
  const labels: Record<string, string> = {
    live: "Live",
    specced: "Specced",
    blocked: "Blocked",
    planned: "Planned",
  };
  return (
    <span className={`font-semibold text-xs ${colors[status] || "text-neutral-400"}`}>
      {labels[status] || status}
    </span>
  );
}

// ══════════════════════════════════════════════
// DATA FLOWS PAGE
// ══════════════════════════════════════════════
export default function DataFlowsPage() {
  const workflows = [
    { name: "Inbound SMS/WhatsApp Handler", trigger: "Twilio webhook (incoming text)", does: "Receives texts to SOS-IDEA, routes to Claude for response", destination: "Notion Messaging Contacts", status: "live" },
    { name: "Inbound CRM Sync", trigger: "Twilio webhook", does: "Syncs new contacts to Notion CRM database", destination: "Notion Messaging Contacts", status: "live" },
    { name: "SMS Drip Sequence", trigger: "New Notion entry", does: "Sends timed SMS follow-ups to new leads", destination: "Twilio \u2192 Client phone", status: "live" },
    { name: "SMS Broadcast", trigger: "Manual trigger", does: "Bulk SMS to all contacts (announcements, promos)", destination: "Twilio \u2192 All contacts", status: "live" },
    { name: "SendGrid Email Campaign", trigger: "Form / manual trigger", does: "Sends branded email campaigns", destination: "SendGrid \u2192 Client inbox", status: "live" },
    { name: "Daily Follow-Up Engine (Branches 1-4)", trigger: "Daily schedule", does: "Day 1-3 post-session: SMS check-in, action plan email, feedback request", destination: "Twilio + SendGrid \u2192 Client", status: "live" },
    { name: "Follow-Up Engine (Branches 5-10)", trigger: "Daily 9am schedule", does: "Day 7-90: Frankie emails \u2014 check-ins, survey, NPS, re-engagement", destination: "SendGrid \u2192 Client", status: "live" },
    { name: "Fireflies Transcript Pipeline", trigger: "Fireflies webhook (transcription complete)", does: "Pulls transcript, combines with intake, Claude generates deliverable", destination: "Notion + notify M+J", status: "live" },
    { name: "Frankie Night-Before Email", trigger: "Schedule (7 PM ET)", does: "Sends personalized prep email to tomorrow's clients using intake data", destination: "SendGrid \u2192 Client", status: "specced" },
  ];

  const keyIds = [
    { resource: "n8n Instance", id: "creativehotline.app.n8n.cloud" },
    { resource: "Webflow Site", id: "thecreativehotline.com (password-protected)" },
    { resource: "Twilio Primary Phone", id: "+1 (413) 767-4332 (SOS-IDEA)" },
    { resource: "Twilio Messaging Service", id: "MGe879f47d62fa4e8590fa7ee619577608" },
    { resource: "SendGrid Domain Auth", id: "em6195.thecreativehotline.com (ID: 30084376)" },
    { resource: "SendGrid Sender", id: "hello@thecreativehotline.com" },
    { resource: "Notion: Payments DB", id: "3030e73ffadc80bcb9dde15f51a9caf2" },
    { resource: "Notion: Intake DB", id: "2f60e73ffadc806bbf5ddca2f5c256a3" },
    { resource: "Notion: Messaging Contacts", id: "dc336cee1389483da59c17c51dd733a6" },
    { resource: "Notion: Creative Hotline HQ", id: "3110e73ffadc81609378ff705056d357" },
    { resource: "Notion: Build Specs", id: "3290e73f-fadc-815e-a3cb-fc2378328298" },
    { resource: "Monday: Brand Launch Plan", id: "Board 18397534387" },
    { resource: "Monday: TCH Action Plan", id: "Board 18397539441" },
    { resource: "Meta Business ID", id: "1127242149449917" },
    { resource: "Meta WABA Asset ID", id: "1626819478359048" },
    { resource: "Calendly Booking", id: "calendly.com/soscreativehotline/creative-hotline-call" },
    { resource: "Stripe Coupons", id: "FRIEND100, FRIENDPRICE, HOTLINEFAM" },
    { resource: "Gmail", id: "soscreativehotline@gmail.com" },
    { resource: "Instagram Main", id: "@creative.hotline" },
  ];

  const nextActions = [
    { num: 1, action: "A2P 10DLC approval (outbound SMS blocked)", owner: "Waiting (TCR)", blocked: "TCR vetting (~late March)", priority: "critical" },
    { num: 2, action: "Build Frankie night-before email workflow", owner: "Jake", blocked: "n8n login + Prep Email Sent checkbox", priority: "high" },
    { num: 3, action: "Tally intake form branding", owner: "Jake", blocked: "Brand guide from Megha", priority: "high" },
    { num: 4, action: "Google Drive nightly scan task", owner: "Jake", blocked: "Megha sharing folder", priority: "high" },
    { num: 5, action: "WhatsApp sender setup in Twilio", owner: "Jake", blocked: "Manual browser signup flow", priority: "high" },
    { num: 6, action: "Remove Webflow site password (at launch)", owner: "Jake + Megha", blocked: "Launch date decision", priority: "medium" },
    { num: 7, action: "ManyChat setup for Instagram DM automation", owner: "Jake", blocked: "None \u2014 DONE", priority: "medium" },
    { num: 8, action: "Content pipeline: Monday \u2192 Later auto-posting", owner: "Megha", blocked: "Scheduled task build", priority: "medium" },
    { num: 9, action: "Brand Audit product ($100-149) in Stripe", owner: "Both", blocked: "Scope definition", priority: "future" },
    { num: 10, action: "Creative Engine self-guided product", owner: "Megha", blocked: "ChatGPT build recovery", priority: "future" },
  ];

  const priorityColors: Record<string, string> = {
    critical: "text-red-400",
    high: "text-orange-400",
    medium: "text-yellow-400",
    future: "text-blue-400",
  };

  return (
    <div className="space-y-2">
      <PageHeader title="Data Flows & Reference" subtitle="Automated workflows, key system IDs, and priority action items" />

      {/* ── AUTOMATED DATA FLOWS ── */}
      <h2 className="text-sm font-bold text-[#F6ED52] uppercase tracking-wider pb-2 border-b border-neutral-800">
        Automated Data Flows (n8n Workflows)
      </h2>
      <p className="text-xs text-neutral-500 mt-2 mb-4">Every automation currently running or specced, what triggers it, and where data ends up.</p>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-900/50">
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">Workflow</th>
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">Trigger</th>
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px] hidden md:table-cell">What It Does</th>
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px] hidden lg:table-cell">Destination</th>
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((w, i) => (
              <tr key={i} className="border-t border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                <td className="p-3 text-neutral-300 font-medium">{w.name}</td>
                <td className="p-3 text-neutral-400">{w.trigger}</td>
                <td className="p-3 text-neutral-400 hidden md:table-cell">{w.does}</td>
                <td className="p-3 text-neutral-400 hidden lg:table-cell">{w.destination}</td>
                <td className="p-3"><StatusDot status={w.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── KEY IDS ── */}
      <h2 className="text-sm font-bold text-[#F6ED52] uppercase tracking-wider pb-2 border-b border-neutral-800 mt-10">
        Key IDs & Reference
      </h2>
      <p className="text-xs text-neutral-500 mt-2 mb-4">Quick reference for system IDs, database IDs, and critical URLs.</p>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-900/50">
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">Resource</th>
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">ID / URL</th>
            </tr>
          </thead>
          <tbody>
            {keyIds.map((item, i) => (
              <tr key={i} className="border-t border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                <td className="p-3 text-neutral-300 font-medium">{item.resource}</td>
                <td className="p-3 text-neutral-500 font-mono text-[11px]">{item.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── WHAT'S NEXT ── */}
      <h2 className="text-sm font-bold text-[#F6ED52] uppercase tracking-wider pb-2 border-b border-neutral-800 mt-10">
        What Needs To Happen Next
      </h2>
      <p className="text-xs text-neutral-500 mt-2 mb-4">Priority-ordered action items to get the full system running.</p>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-900/50">
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px] w-8">#</th>
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">Action</th>
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px] hidden md:table-cell">Owner</th>
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px] hidden lg:table-cell">Blocked By</th>
              <th className="text-left p-3 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">Priority</th>
            </tr>
          </thead>
          <tbody>
            {nextActions.map((a, i) => (
              <tr key={i} className="border-t border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                <td className="p-3 text-neutral-600">{a.num}</td>
                <td className="p-3 text-neutral-300">{a.action}</td>
                <td className="p-3 text-neutral-400 hidden md:table-cell">{a.owner}</td>
                <td className="p-3 text-neutral-500 hidden lg:table-cell">{a.blocked}</td>
                <td className={`p-3 font-semibold capitalize ${priorityColors[a.priority]}`}>{a.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
