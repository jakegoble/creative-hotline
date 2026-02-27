import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-3 min-w-0">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg md:text-xl font-bold text-[var(--color-text)] truncate">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-xs md:text-sm text-[var(--color-text-secondary)] line-clamp-2">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
