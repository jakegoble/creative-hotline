"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";

// ── Types ──
interface SystemDetail {
  label: string;
  value: string;
}

interface SystemCardProps {
  name: string;
  status: "live" | "partial" | "blocked" | "pending" | "planned";
  role: string;
  details: SystemDetail[];
  connections?: string[];
  connectionLabel?: string;
  actionNeeded?: string;
}

interface FlowNodeProps {
  color: "green" | "yellow" | "red" | "blue" | "purple" | "orange" | "gray";
  children: React.ReactNode;
}

// ── Status badge component ──
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    live: "bg-green-900/50 text-green-400 border-green-600",
    partial: "bg-yellow-900/50 text-yellow-400 border-yellow-600",
    blocked: "bg-red-900/50 text-red-400 border-red-600",
    pending: "bg-neutral-800 text-neutral-400 border-neutral-600",
    planned: "bg-blue-900/50 text-blue-400 border-blue-600",
  };
  const labels: Record<string, string> = {
    live: "Live",
    partial: "Partial",
    blocked: "Blocked",
    pending: "Pending",
    planned: "Planned",
  };
  return (
    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

// ── Flow arrow ──
function Arrow() {
  return <span className="text-neutral-600 text-lg">&rarr;</span>;
}

// ── Flow node ──
function FlowNode({ color, children }: FlowNodeProps) {
  const colors: Record<string, string> = {
    green: "bg-green-950/60 border-green-600 text-green-400",
    yellow: "bg-yellow-950/60 border-yellow-600 text-yellow-400",
    red: "bg-red-950/60 border-red-600 text-red-400",
    blue: "bg-blue-950/60 border-blue-600 text-blue-400",
    purple: "bg-purple-950/60 border-purple-600 text-purple-400",
    orange: "bg-orange-950/60 border-orange-600 text-orange-400",
    gray: "bg-neutral-800/60 border-neutral-500 text-neutral-400",
  };
  return (
    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

// ── System card ──
function SystemCard({ name, status, role, details, connections, connectionLabel, actionNeeded }: SystemCardProps) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 hover:border-neutral-500 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">{name}</h4>
        <StatusBadge status={status} />
      </div>
      <p className="text-xs text-neutral-500 mb-3">{role}</p>
      {details.map((d, i) => (
        <p key={i} className="text-xs text-neutral-400 mb-1">
          <span className="text-neutral-300 font-medium">{d.label}:</span> {d.value}
        </p>
      ))}
      {connections && connections.length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-800">
          <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
            {connectionLabel || "Connected to"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {connections.map((c, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-500">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
      {actionNeeded && (
        <div className="mt-3 p-2.5 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400">
          &#9888; {actionNeeded}
        </div>
      )}
    </div>
  );
}

// ── Section header ──
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mt-10 mb-4 first:mt-0">
      <h2 className="text-sm font-bold text-[#F6ED52] uppercase tracking-wider pb-2 border-b border-neutral-800">
        {title}
      </h2>
      {description && <p className="text-xs text-neutral-500 mt-2 max-w-3xl">{description}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════
export default function SystemMapPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <PageHeader title="System Map" subtitle="How every tool, platform, and automation connects across The Creative Hotline" />
      <p className="text-[10px] text-neutral-600 -mt-4 mb-4">Last updated: March 20, 2026</p>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg mb-6">
        {[
          { color: "bg-green-500", label: "Live & Connected" },
          { color: "bg-yellow-500", label: "Partial / Needs Work" },
          { color: "bg-red-500", label: "Blocked / Down" },
          { color: "bg-neutral-500", label: "Pending Setup" },
          { color: "bg-blue-500", label: "Planned / Future" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-neutral-500">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            {item.label}
          </div>
        ))}
      </div>

      {/* ── WHO DOES WHAT ── */}
      <SectionHeader title="Who Does What" description="Clear ownership of every part of the system between Jake and Megha." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h3 className="font-bold text-blue-400 text-sm">Jake Goble</h3>
          <p className="text-xs text-neutral-600 mb-3">Tech / Systems / Automation / AI Ops</p>
          <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-2">Owns & Operates</p>
          <ul className="space-y-1">
            {[
              "n8n workflows (9+ automations)",
              "Twilio / SMS / WhatsApp configuration",
              "SendGrid email delivery infrastructure",
              "Notion databases (Payments, Intake, Messaging, CRM)",
              "Monday.com board management & automation sync",
              "Fireflies API + transcript pipeline",
              "Tally form configuration & branding",
              "Webflow site publishing & technical SEO",
              "Stripe products, pricing, coupons",
              "Claude AI orchestration (Cowork, scheduled tasks, skills)",
              "Command Center dashboard",
              "DNS / domain management (GoDaddy)",
            ].map((item, i) => (
              <li key={i} className="text-xs text-neutral-400 pl-4 relative before:content-['\2192'] before:absolute before:left-0 before:text-neutral-600">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h3 className="font-bold text-purple-400 text-sm">Megha Kraft</h3>
          <p className="text-xs text-neutral-600 mb-3">Creative Direction / Workshop Delivery / Brand Strategy</p>
          <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-2">Owns & Operates</p>
          <ul className="space-y-1">
            {[
              "Workshop delivery (3 calls/day, 45 min each)",
              "Workshop prep templates (6 HTML templates + 2 tools)",
              "Creative direction & brand voice (Frankie persona)",
              "Content strategy & creation (Instagram, brand posts)",
              "Client relationship & creative consulting",
              "Monday.com content idea bank",
              "Instagram accounts (@creative.hotline, @soscreativehotline)",
              "Meta Business Suite / ad creative",
              "Claude AI (her own instance \u2014 CH brain)",
              "Google Drive master folder (templates, brand assets)",
              "Tropical Trash brand (separate)",
            ].map((item, i) => (
              <li key={i} className="text-xs text-neutral-400 pl-4 relative before:content-['\2192'] before:absolute before:left-0 before:text-neutral-600">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── CLIENT JOURNEY ── */}
      <SectionHeader title="The Client Journey \u2014 End to End" description="Every touchpoint from first discovery to post-workshop follow-up, showing which systems handle each step." />
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 overflow-x-auto space-y-3">
        {[
          { label: "1. Discovery", nodes: [
            { color: "purple" as const, text: "Instagram" }, { color: "purple" as const, text: "Meta Ads" }, { color: "orange" as const, text: "ManyChat" }, { color: "blue" as const, text: "Webflow site" }
          ]},
          { label: "2. SMS/Text Lead", nodes: [
            { color: "gray" as const, text: "Client texts SOS-IDEA" }, { color: "green" as const, text: "Twilio (+14137674332)" }, { color: "green" as const, text: "n8n Inbound Handler" }, { color: "green" as const, text: "Notion Messaging Contacts" }
          ]},
          { label: "3. Booking", nodes: [
            { color: "blue" as const, text: "Webflow \"Book a Call\"" }, { color: "green" as const, text: "Calendly" }, { color: "green" as const, text: "Stripe ($499 payment)" }, { color: "green" as const, text: "n8n Stripe webhook" }, { color: "green" as const, text: "Notion Payments DB" }
          ]},
          { label: "4. Intake", nodes: [
            { color: "green" as const, text: "Tally intake form" }, { color: "green" as const, text: "n8n Tally webhook" }, { color: "green" as const, text: "Claude AI (analysis)" }, { color: "green" as const, text: "Notion Intake DB" }
          ]},
          { label: "5. Night Before", nodes: [
            { color: "yellow" as const, text: "n8n Schedule (7 PM)" }, { color: "yellow" as const, text: "Query Notion" }, { color: "yellow" as const, text: "Build Frankie email" }, { color: "green" as const, text: "SendGrid" }, { color: "gray" as const, text: "Client inbox" }
          ]},
          { label: "6. Workshop Call", nodes: [
            { color: "green" as const, text: "Google Meet / Calendly" }, { color: "green" as const, text: "Fireflies records + transcribes" }, { color: "purple" as const, text: "Megha delivers workshop" }
          ]},
          { label: "7. Post-Call Auto", nodes: [
            { color: "green" as const, text: "Fireflies webhook" }, { color: "green" as const, text: "n8n pulls transcript" }, { color: "green" as const, text: "Claude + Master Brain" }, { color: "green" as const, text: "Deliverable to Notion" }, { color: "green" as const, text: "Notify M + J" }
          ]},
          { label: "8. Follow-Up", nodes: [
            { color: "green" as const, text: "n8n Follow-Up Engine" }, { color: "green" as const, text: "Day 2: SMS (Twilio)" }, { color: "green" as const, text: "Day 3: Action plan (SendGrid)" }, { color: "green" as const, text: "Day 7-90: Frankie emails" }
          ]},
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider w-28 flex-shrink-0">{row.label}</span>
            {row.nodes.map((node, j) => (
              <span key={j} className="contents">
                {j > 0 && <Arrow />}
                <FlowNode color={node.color}>{node.text}</FlowNode>
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ── ALL SYSTEMS ── */}
      <SectionHeader title="All Systems \u2014 Status & Connections" description="Every tool in the stack, its current status, what it connects to, and what needs attention." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SystemCard
          name="Notion (Jake's workspace)"
          status="live"
          role="Central database & documentation hub"
          details={[
            { label: "Key DBs", value: "Payments, Intake, Messaging Contacts, Client CRM, Session Dashboard" },
            { label: "Pages", value: "CH HQ, System State, Scope of Work, Workshop Build Specs, Follow-Up Engine" },
            { label: "Owner", value: "Jake" },
          ]}
          connections={["n8n (API)", "Claude / Cowork (MCP)", "Stripe (via n8n)", "Tally (via n8n)", "Twilio (via n8n)"]}
        />
        <SystemCard
          name="n8n (creativehotline.app.n8n.cloud)"
          status="live"
          role="Automation engine \u2014 connects everything, runs all workflows"
          details={[
            { label: "Active workflows", value: "Inbound SMS, CRM Sync, SMS Drip, SMS Broadcast, Email Campaign, Follow-Up 1-4, Follow-Up 5-10, Fireflies Pipeline" },
            { label: "Credentials", value: "SendGrid, Twilio, Notion, SMTP, Anthropic, Stripe, Header Auth" },
            { label: "Owner", value: "Jake" },
          ]}
          connections={["Twilio", "SendGrid", "Notion", "Stripe", "Claude API", "Tally", "Fireflies"]}
        />
        <SystemCard
          name="Stripe"
          status="live"
          role="Payment processing \u2014 workshop purchases, future product sales"
          details={[
            { label: "Products", value: "Workshop call ($499)" },
            { label: "Coupons", value: "FRIEND100 ($100 off), FRIENDPRICE ($200 off), HOTLINEFAM ($200 off)" },
            { label: "Webhook", value: "Fires to n8n on payment \u2192 creates Notion Payments DB entry" },
          ]}
          connections={["n8n (webhook)", "Notion Payments DB (via n8n)", "Calendly (payment gate)"]}
        />
        <SystemCard
          name="SendGrid"
          status="live"
          role="Transactional + marketing email delivery"
          details={[
            { label: "Domain auth", value: "Verified (em6195.thecreativehotline.com)" },
            { label: "Sender", value: "hello@thecreativehotline.com \u2014 verified" },
            { label: "Reputation", value: "100% | Emails sent: 0 (pre-launch)" },
            { label: "Trial expires", value: "May 15, 2026" },
          ]}
          connections={["n8n (API key)", "GoDaddy DNS (domain auth)"]}
        />
        <SystemCard
          name="Twilio"
          status="partial"
          role="SMS/MMS messaging + future WhatsApp"
          details={[
            { label: "Primary", value: "+1 (413) 767-4332 (SOS-IDEA)" },
            { label: "Spare", value: "+1 (447) 244-4332 (BIG-IDEA) \u2014 not in use" },
            { label: "A2P 10DLC", value: "Campaign submitted March 16, status In progress" },
            { label: "WhatsApp", value: "WABA created but phone not linked to Twilio" },
          ]}
          connections={["n8n (webhook + API)", "Notion (via n8n)"]}
          actionNeeded="A2P 10DLC approval pending. WhatsApp sender needs manual setup."
        />
        <SystemCard
          name="Calendly"
          status="live"
          role="Workshop booking \u2014 clients schedule their 45-min call"
          details={[
            { label: "Event", value: "Creative Hotline Call" },
            { label: "URL", value: "calendly.com/soscreativehotline/creative-hotline-call" },
          ]}
          connections={["Webflow (booking link)", "Stripe (payment gate)", "Google Calendar"]}
        />
        <SystemCard
          name="Fireflies.ai"
          status="live"
          role="Meeting recording, transcription, AI summaries"
          details={[
            { label: "Plan", value: "PRO (jake@radanimal.co)" },
            { label: "MCP", value: "Connected to Cowork \u2014 pull transcripts, summaries, search" },
            { label: "Pipeline", value: "n8n transcript pipeline built & published" },
          ]}
          connections={["Claude / Cowork (MCP \u2014 live)", "Google Meet (auto-join)", "n8n (pipeline \u2014 live)"]}
        />
        <SystemCard
          name="Webflow (thecreativehotline.com)"
          status="partial"
          role="Public-facing website \u2014 marketing, booking funnel entry point"
          details={[
            { label: "Live pages", value: "Home (password-protected), Contact, Privacy, Terms" },
            { label: "Tracking", value: "Meta Pixel, GA4, GTM, LinkedIn Insight all installed" },
          ]}
          connections={["Calendly (booking link)", "Meta Pixel (tracking)", "Google Analytics"]}
          actionNeeded="Site is password-protected (pre-launch). Remove password when ready."
        />
        <SystemCard
          name="Tally (Intake Forms)"
          status="partial"
          role="Client intake form \u2014 collects business info, goals, budget, team size"
          details={[
            { label: "Questions", value: "15 questions (Q1-Q9 original + Q10-Q15 from Megha)" },
            { label: "Webhook", value: "Fires to n8n \u2192 Claude analyzes \u2192 Notion Intake DB" },
          ]}
          connections={["n8n (webhook)", "Claude API (via n8n)", "Notion Intake DB (via n8n)"]}
          actionNeeded="Needs TCH branding. Waiting on Megha's brand guide."
        />
        <SystemCard
          name="Instagram"
          status="partial"
          role="Primary marketing channel \u2014 brand presence, content, DM leads"
          details={[
            { label: "Accounts", value: "@creative.hotline (main), @soscreativehotline" },
            { label: "Content", value: "Megha creating via Claude \u2192 Monday idea bank" },
          ]}
          connections={["Meta Business Suite", "Monday.com (idea bank)", "ManyChat (DM automation)"]}
          actionNeeded="Content automation pipeline (Monday \u2192 Later \u2192 auto-post) not connected."
        />
        <SystemCard
          name="Meta Business Suite"
          status="partial"
          role="Ad management, business verification, WhatsApp Business Account"
          details={[
            { label: "Business ID", value: "1127242149449917" },
            { label: "WABA", value: "Created but phone link incomplete" },
            { label: "Meta Pixel", value: "Installed on Webflow" },
          ]}
          connections={["Instagram", "Webflow (pixel)", "Twilio (WhatsApp \u2014 incomplete)"]}
        />
        <SystemCard
          name="Monday.com"
          status="live"
          role="Project management \u2014 tasks, timelines, content planning"
          details={[
            { label: "Boards", value: "Brand Launch Plan, TCH Action Plan, Creative Ad Strategy" },
            { label: "Content", value: "Megha stores ideas \u2192 scheduled Claude task pulls" },
          ]}
          connections={["Claude / Cowork (MCP)", "Instagram content pipeline (planned)"]}
        />
        <SystemCard
          name="Google Drive (Megha's)"
          status="pending"
          role="Templates, brand assets, handover docs"
          details={[
            { label: "Coming", value: "Master Workshop folder with 5 subfolders" },
          ]}
          connectionLabel="Will connect to"
          connections={["Claude / Cowork (nightly scan)", "Notion (manual sync)"]}
          actionNeeded="Megha is moving files to Drive. Once shared, Jake creates nightly scan."
        />
        <SystemCard
          name="ManyChat"
          status="pending"
          role="Instagram DM automation \u2014 auto-reply, lead capture"
          details={[
            { label: "Status", value: "Being evaluated. Not yet configured." },
            { label: "Use case", value: "Auto-respond DMs with booking link or FAQ" },
          ]}
          connectionLabel="Would connect to"
          connections={["Instagram", "Webflow (booking link)", "Calendly"]}
        />
        <SystemCard
          name="Command Center"
          status="live"
          role="Real-time ops dashboard \u2014 single source of truth"
          details={[
            { label: "Stack", value: "Next.js + Tailwind on Vercel" },
            { label: "Data sources", value: "Notion, Monday, Stripe, Fireflies, n8n, Meta, Calendly" },
          ]}
          connections={["All 15 systems", "Claude API (intelligence layer)"]}
        />
      </div>
    </div>
  );
}
