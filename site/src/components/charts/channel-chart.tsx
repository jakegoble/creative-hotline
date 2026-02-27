"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { ChannelMetric } from "@/lib/types";

const CHANNEL_COLORS: Record<string, string> = {
  "IG DM": "var(--color-primary)",
  "IG Comment": "#FF8C50",
  "IG Story": "#FFA564",
  "Meta Ad": "var(--color-accent)",
  LinkedIn: "#0077B5",
  Website: "var(--color-success)",
  Referral: "#9B59B6",
  Direct: "#34495E",
};

export function ChannelRevenueChart({ data }: { data: ChannelMetric[] }) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          axisLine={false} tickLine={false}
        />
        <YAxis type="category" dataKey="channel" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} width={72} />
        <Tooltip
          contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
        />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={20}>
          {sorted.map((entry) => (
            <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel] ?? "var(--color-border-strong)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
