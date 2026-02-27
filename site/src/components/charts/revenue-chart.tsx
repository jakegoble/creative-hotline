"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { MonthlyRevenue } from "@/lib/types";

export function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          axisLine={false} tickLine={false} width={48}
        />
        <Tooltip
          contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
        />
        <Area
          type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2.5}
          fill="url(#revenueGrad)"
          dot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 2, stroke: "var(--color-bg-card)" }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
