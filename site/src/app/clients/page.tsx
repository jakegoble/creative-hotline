"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useData } from "@/hooks/use-data";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Search, SortAsc } from "lucide-react";

export default function ClientsPage() {
  const { data: clients, isLoading, error, refresh } = useData("getClients");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "amount" | "created">("created");

  if (isLoading || !clients) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;

  const filtered = clients
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "amount") return b.amount - a.amount;
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${clients.length} total clients`} />

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-2 pl-9 pr-3 text-sm",
              "focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]",
              "text-[var(--color-text)]"
            )}
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <SortAsc size={14} />
          {(["created", "name", "amount"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn(
                "rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium transition-colors",
                sortBy === s
                  ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              )}
            >
              {s === "created" ? "Recent" : s === "name" ? "Name" : "Value"}
            </button>
          ))}
        </div>
      </div>

      {/* Client table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Client</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Product</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Amount</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Source</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id} className="border-b border-[var(--color-border)] last:border-0 transition-colors hover:bg-[var(--color-bg-muted)] cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-xs font-bold text-[var(--color-primary)]">
                        {client.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">{client.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{client.product || "--"}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--color-text)]">{client.amount > 0 ? formatCurrency(client.amount) : "--"}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-xs text-[var(--color-text-muted)]">{client.lead_source}</td>
                  <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
                  <td className="hidden md:table-cell px-4 py-3 text-xs text-[var(--color-text-muted)]">{formatDate(client.created)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
