import { NavLink, useLocation } from "react-router-dom";
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
  Sun,
  Moon,
  Phone,
} from "lucide-react";

interface SidebarProps {
  dark: boolean;
  onToggleDark: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/clients", icon: Users, label: "Clients" },
      { to: "/pipeline", icon: Filter, label: "Pipeline" },
      { to: "/action-plans", icon: FileEdit, label: "Action Plans" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/lead-scoring", icon: Star, label: "Lead Scoring" },
      { to: "/channels", icon: BarChart3, label: "Channels" },
      { to: "/retargeting", icon: RotateCcw, label: "Retargeting" },
      { to: "/conversion-paths", icon: Route, label: "Conversions" },
    ],
  },
  {
    label: "Growth",
    items: [
      { to: "/revenue-goals", icon: TrendingUp, label: "Revenue Goals" },
      { to: "/funnel", icon: ListFilter, label: "Funnel" },
      { to: "/outcomes", icon: Trophy, label: "Outcomes" },
      { to: "/brand-audit", icon: ClipboardCheck, label: "Brand Audit" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/health", icon: MonitorCheck, label: "System Health" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function Sidebar({ dark, onToggleDark, collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r transition-all duration-200",
        "bg-[var(--color-bg-card)] border-[var(--color-border)]",
        "dark:bg-[var(--color-dark-card)] dark:border-[var(--color-dark-border)]",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-[var(--color-border)] dark:border-[var(--color-dark-border)] px-4">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white">
            <Phone size={16} />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
              Creative Hotline
            </span>
          )}
        </button>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] dark:text-[var(--color-dark-text-muted)]">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] dark:text-[var(--color-dark-text-secondary)] dark:hover:bg-[var(--color-dark-elevated)] dark:hover:text-[var(--color-dark-text)]",
                    collapsed && "justify-center px-0"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} />
                  {!collapsed && item.label}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--color-border)] dark:border-[var(--color-dark-border)] p-3">
        <div className="mb-2 flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-2 py-1">
          <span className="text-[10px] font-bold tracking-widest text-white">DEMO MODE</span>
        </div>
        <button
          onClick={onToggleDark}
          className={cn(
            "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-xs font-medium transition-colors",
            "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]",
            "dark:text-[var(--color-dark-text-secondary)] dark:hover:bg-[var(--color-dark-elevated)]",
            collapsed && "justify-center"
          )}
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          {!collapsed && (dark ? "Light Mode" : "Dark Mode")}
        </button>
        {!collapsed && (
          <p className="mt-2 text-center text-[10px] text-[var(--color-text-muted)] dark:text-[var(--color-dark-text-muted)]">
            v6.0 | Built for Jake & Megha
          </p>
        )}
      </div>
    </aside>
  );
}
