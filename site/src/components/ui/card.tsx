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
        "border border-[var(--color-border)] p-4 md:p-5 overflow-hidden",
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
  /** Shorter value shown on mobile (e.g. "$800K" instead of "$800,000") */
  compactValue?: string;
  trend?: number;
  icon?: ReactNode;
  accent?: string;
}

export function KpiCard({ label, value, compactValue, trend, icon, accent }: KpiCardProps) {
  return (
    <Card accent={accent}>
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] truncate">
            {label}
          </p>
          {compactValue ? (
            <>
              <p className="mt-1 text-xl font-bold text-[var(--color-text)] truncate md:hidden">
                {compactValue}
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-text)] truncate hidden md:block">
                {value}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xl md:text-2xl font-bold text-[var(--color-text)] truncate">
              {value}
            </p>
          )}
          {trend !== undefined && (
            <p
              className={cn(
                "mt-1 text-xs font-semibold",
                trend >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
              )}
            >
              {trend >= 0 ? "+" : ""}
              {(trend * 100).toFixed(1)}%
            </p>
          )}
        </div>
        {icon && (
          <div
            className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{ backgroundColor: accent ? `${accent}15` : "var(--color-primary-subtle)", color: accent ?? "var(--color-primary)" }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
