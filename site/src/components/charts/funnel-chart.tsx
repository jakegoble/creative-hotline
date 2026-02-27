import type { FunnelStage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FunnelChart({ data }: { data: FunnelStage[] }) {
  const max = data[0]?.count ?? 1;

  return (
    <div className="space-y-2">
      {data.map((stage, i) => {
        const width = Math.max((stage.count / max) * 100, 8);
        const isLast = i === data.length - 1;
        return (
          <div key={stage.stage} className="group">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--color-text-secondary)]">{stage.stage}</span>
              <span className="font-bold text-[var(--color-text)]">
                {stage.count}
                {!isLast && (
                  <span className="ml-1 text-[var(--color-text-muted)]">
                    ({(stage.conversion_rate * 100).toFixed(0)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="h-7 rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-[var(--radius-sm)] transition-all duration-500",
                  "bg-gradient-to-r from-[var(--color-primary)] to-[#FF8C50]",
                  "group-hover:opacity-90"
                )}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
