"use client";

import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Number of skeleton rows to show. */
  rows?: number;
  className?: string;
}

/** Animated skeleton loading state. */
export function LoadingState({ rows = 4, className }: LoadingStateProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* KPI skeleton row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-bg-card)] border border-[var(--color-border)]"
          />
        ))}
      </div>
      {/* Content skeleton rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-bg-card)] border border-[var(--color-border)]"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}
