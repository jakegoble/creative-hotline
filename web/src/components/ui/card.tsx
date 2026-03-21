import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  accent?: string;
}

export function Card({ children, className, accent }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)]",
        "border border-[var(--color-border)] p-5",
        "dark:bg-[var(--color-dark-card)] dark:border-[var(--color-dark-border)]",
        "transition-shadow hover:shadow-[var(--shadow-md)]",
        className
      )}
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      {children}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  trend?: number;
  icon?: ReactNode;
  accent?: string;
}

export function KpiCard({ label, value, trend, icon, accent }: KpiCardProps) {
  return (
    <Card accent={accent}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] dark:text-[var(--color-dark-text-muted)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text)] dark:text-[var(--color-dark-text)]">
            {value}
          </p>
          {trend !== undefined && (
            <p
              className={cn(
                "mt-1 text-xs font-semibold",
                trend >= 0
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-danger)]"
              )}
            >
              {trend >= 0 ? "+" : ""}
              {(trend * 100).toFixed(1)}%
            </p>
          )}
        </div>
        {icon && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)]"
            style={{ backgroundColor: accent ? `${accent}15` : "var(--color-primary-subtle)", color: accent ?? "var(--color-primary)" }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
