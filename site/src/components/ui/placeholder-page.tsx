import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle="Coming soon" />
      <Card className="flex flex-col items-center justify-center py-16">
        <Construction size={48} className="text-[var(--color-text-muted)] mb-4" />
        <p className="text-lg font-semibold text-[var(--color-text-secondary)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          This page is under construction. Check back soon.
        </p>
      </Card>
    </div>
  );
}
