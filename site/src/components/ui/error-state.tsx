"use client";

import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/** Error display with optional retry button. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger)]15">
        <AlertTriangle size={24} className="text-[var(--color-danger)]" />
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          Retry
        </button>
      )}
    </div>
  );
}
