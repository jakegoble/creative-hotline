import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "accent";
  className?: string;
}

const VARIANTS = {
  default: "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] dark:bg-[var(--color-dark-elevated)] dark:text-[var(--color-dark-text-secondary)]",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  accent: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant = (() => {
    if (status.includes("Complete") || status.includes("Follow-Up")) return "success" as const;
    if (status.includes("Needs") || status.includes("Intake")) return "warning" as const;
    if (status.includes("Lead")) return "default" as const;
    if (status.includes("Ready")) return "accent" as const;
    return "default" as const;
  })();

  return <Badge variant={variant}>{status}</Badge>;
}

export function TierBadge({ tier }: { tier: string }) {
  const variant = (() => {
    if (tier === "Hot") return "danger" as const;
    if (tier === "Warm") return "warning" as const;
    if (tier === "Cool") return "accent" as const;
    return "default" as const;
  })();

  return <Badge variant={variant}>{tier}</Badge>;
}
