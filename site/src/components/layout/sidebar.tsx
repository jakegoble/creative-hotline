"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Filter,
  FileEdit,
  Star,
  BarChart3,
  RotateCcw,
  Route,
  TrendingUp,
  ListFilter,
  Trophy,
  ClipboardCheck,
  MonitorCheck,
  Settings,
  Phone,
  ChevronLeft,
  ChevronRight,
  Brain,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/clients", icon: Users, label: "Clients" },
      { href: "/pipeline", icon: Filter, label: "Pipeline" },
      { href: "/action-plans", icon: FileEdit, label: "Action Plans" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/lead-scoring", icon: Star, label: "Lead Scoring" },
      { href: "/channels", icon: BarChart3, label: "Channels" },
      { href: "/retargeting", icon: RotateCcw, label: "Retargeting" },
      { href: "/conversion-paths", icon: Route, label: "Conversions" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/ai-insights", icon: Brain, label: "AI Insights" },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/revenue-goals", icon: TrendingUp, label: "Revenue Goals" },
      { href: "/funnel", icon: ListFilter, label: "Funnel" },
      { href: "/outcomes", icon: Trophy, label: "Outcomes" },
      { href: "/brand-audit", icon: ClipboardCheck, label: "Brand Audit" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/health", icon: MonitorCheck, label: "System Health" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  /* ---- Shared nav content ---- */
  function NavContent({ mobile }: { mobile?: boolean }) {
    return (
      <>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {(mobile || !collapsed) && (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={mobile ? () => setMobileOpen(false) : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-sm font-medium transition-colors",
                      mobile ? "py-3" : "py-2",
                      isActive
                        ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
                      !mobile && collapsed && "justify-center px-0"
                    )}
                    title={!mobile && collapsed ? item.label : undefined}
                  >
                    <item.icon size={18} />
                    {(mobile || !collapsed) && item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] p-3 shrink-0">
          <div className="mb-2 flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-2 py-1">
            <span className="text-[10px] font-bold tracking-widest text-white">DEMO MODE</span>
          </div>
          {!mobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-xs font-medium transition-colors",
                "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]",
                collapsed && "justify-center"
              )}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {!collapsed && "Collapse"}
            </button>
          )}
          {(mobile || !collapsed) && (
            <p className="mt-2 text-center text-[10px] text-[var(--color-text-muted)]">
              v6.0 | Built for Jake & Megha
            </p>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* ---- Mobile hamburger button ---- */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-[var(--shadow-md)]"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* ---- Mobile backdrop ---- */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ---- Mobile drawer ---- */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-[var(--color-bg)] border-r border-[var(--color-border)] md:hidden",
          "transform transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header with logo + close */}
        <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4 shrink-0">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white">
              <Phone size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight text-[var(--color-text)]">
              Creative Hotline
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] transition-colors"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <NavContent mobile />
      </aside>

      {/* ---- Desktop sidebar ---- */}
      <aside
        className={cn(
          "hidden md:flex sticky top-0 h-screen flex-col border-r transition-all duration-200",
          "bg-[var(--color-bg-card)] border-[var(--color-border)]",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-[var(--color-border)] px-4 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white">
              <Phone size={16} />
            </div>
            {!collapsed && (
              <span className="text-sm font-bold tracking-tight text-[var(--color-text)]">
                Creative Hotline
              </span>
            )}
          </Link>
        </div>
        <NavContent />
      </aside>
    </>
  );
}
