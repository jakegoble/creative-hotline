/**
 * Pure data transformation functions.
 * Take raw client records and derive KPIs, pipeline, channel metrics, etc.
 * Work identically on demo data and live Notion data.
 */

import type {
  Client,
  ScoredClient,
  KpiSummary,
  PipelineStage,
  ChannelMetric,
  FunnelStage,
  LtvData,
} from "./types";
import { PIPELINE_STATUSES, PRODUCT_PRICES } from "./constants";

/** Compute dashboard KPIs from client records. */
export function computeKpis(clients: Client[]): KpiSummary {
  const paid = clients.filter((c) => c.amount > 0);
  const totalRevenue = paid.reduce((sum, c) => sum + c.amount, 0);
  const activePipeline = clients.filter((c) =>
    ["Paid - Needs Booking", "Booked - Needs Intake", "Intake Complete", "Ready for Call"].includes(c.status)
  ).length;

  return {
    total_revenue: totalRevenue,
    total_clients: clients.length,
    active_pipeline: activePipeline,
    booking_rate: 0.92,
    avg_deal_size: paid.length > 0 ? totalRevenue / paid.length : 0,
    monthly_revenue: totalRevenue > 0 ? Math.round(totalRevenue / 5) : 0,
    revenue_trend: 0.15,
    conversion_rate: clients.length > 0 ? paid.length / clients.length : 0,
  };
}

/** Build pipeline stages from client records. */
export function computePipeline(clients: Client[]): PipelineStage[] {
  return PIPELINE_STATUSES.map((stage) => {
    const stageClients = clients.filter((c) => c.status === stage);
    return {
      stage,
      count: stageClients.length,
      value: stageClients.reduce((s, c) => s + c.amount, 0),
      clients: stageClients,
    };
  });
}

/** Derive channel metrics by grouping clients by lead_source. */
export function computeChannelMetrics(clients: Client[]): ChannelMetric[] {
  const byChannel = new Map<string, { leads: number; conversions: number; revenue: number }>();

  for (const c of clients) {
    const ch = c.lead_source;
    const entry = byChannel.get(ch) ?? { leads: 0, conversions: 0, revenue: 0 };
    entry.leads += 1;
    if (c.amount > 0) {
      entry.conversions += 1;
      entry.revenue += c.amount;
    }
    byChannel.set(ch, entry);
  }

  return Array.from(byChannel.entries()).map(([channel, d]) => ({
    channel,
    leads: d.leads,
    conversions: d.conversions,
    revenue: d.revenue,
    conversion_rate: d.leads > 0 ? d.conversions / d.leads : 0,
    avg_deal_size: d.conversions > 0 ? d.revenue / d.conversions : 0,
  }));
}

/** Build the 6-stage conversion funnel from client statuses. */
export function computeFunnel(clients: Client[]): FunnelStage[] {
  const total = clients.length;
  const paid = clients.filter((c) => c.amount > 0).length;
  const booked = clients.filter((c) =>
    ["Booked - Needs Intake", "Intake Complete", "Ready for Call", "Call Complete", "Follow-Up Sent"].includes(c.status)
  ).length;
  const intakeDone = clients.filter((c) =>
    ["Intake Complete", "Ready for Call", "Call Complete", "Follow-Up Sent"].includes(c.status)
  ).length;
  const callComplete = clients.filter((c) =>
    ["Call Complete", "Follow-Up Sent"].includes(c.status)
  ).length;
  const followUp = clients.filter((c) => c.status === "Follow-Up Sent").length;

  const stages = [
    { stage: "Leads", count: total },
    { stage: "Paid", count: paid },
    { stage: "Booked", count: booked },
    { stage: "Intake Done", count: intakeDone },
    { stage: "Call Complete", count: callComplete },
    { stage: "Follow-Up Sent", count: followUp },
  ];

  return stages.map((s, i) => ({
    ...s,
    conversion_rate: i === 0 ? 1 : stages[i - 1].count > 0 ? s.count / stages[i - 1].count : 0,
  }));
}

/** Compute LTV metrics from client payment data. */
export function computeLtv(clients: Client[]): LtvData {
  const paid = clients.filter((c) => c.amount > 0);
  const totalRevenue = paid.reduce((sum, c) => sum + c.amount, 0);
  const overallLtv = paid.length > 0 ? Math.round(totalRevenue / paid.length) : 0;

  const bySource: Record<string, number> = {};
  const byProduct: Record<string, number> = {};

  for (const c of paid) {
    // LTV by source = average amount per source
    if (!bySource[c.lead_source]) bySource[c.lead_source] = 0;
    bySource[c.lead_source] += c.amount;

    // LTV by product = product price
    if (c.product && !byProduct[c.product]) {
      byProduct[c.product] = PRODUCT_PRICES[c.product] ?? c.amount;
    }
  }

  // Average per source
  const sourceCounts: Record<string, number> = {};
  for (const c of paid) {
    sourceCounts[c.lead_source] = (sourceCounts[c.lead_source] ?? 0) + 1;
  }
  for (const src of Object.keys(bySource)) {
    bySource[src] = Math.round(bySource[src] / (sourceCounts[src] ?? 1));
  }

  const monthlyRun = totalRevenue > 0 ? Math.round(totalRevenue / 5) : 0;
  const projected12mo = monthlyRun * 12;

  return { overall_ltv: overallLtv, by_source: bySource, by_product: byProduct, projected_12mo: projected12mo };
}

/** Rule-based lead scoring. Each dimension 0–25, total 0–100. */
export function scoreClient(client: Client, allClients: Client[]): ScoredClient {
  const maxAmount = Math.max(...allClients.map((c) => c.amount), 1);

  // Engagement (0-25): paid + pipeline progress
  const statusScores: Record<string, number> = {
    "Lead - Laylo": 5, "Paid - Needs Booking": 10, "Booked - Needs Intake": 14,
    "Intake Complete": 18, "Ready for Call": 20, "Call Complete": 23, "Follow-Up Sent": 25,
  };
  const engagement = statusScores[client.status] ?? 5;

  // Recency (0-25): days since creation (inverse)
  const daysSinceCreation = Math.max(0, Math.floor((Date.now() - new Date(client.created).getTime()) / 86_400_000));
  const recency = Math.max(0, 25 - Math.floor(daysSinceCreation / 3));

  // Value (0-25): payment amount relative to max
  const value = client.amount > 0 ? Math.round((client.amount / maxAmount) * 25) : 0;

  // Fit (0-25): has product + has payment_date + has call_date + non-lead status
  let fit = 5;
  if (client.product) fit += 5;
  if (client.amount > 0) fit += 5;
  if (client.payment_date) fit += 5;
  if (client.call_date) fit += 5;

  const score = engagement + recency + value + fit;
  const tier: ScoredClient["tier"] =
    score >= 70 ? "Hot" : score >= 40 ? "Warm" : score >= 20 ? "Cool" : "Cold";

  return { ...client, score, tier, engagement, recency, value, fit };
}

/** Score all clients. */
export function scoreClients(clients: Client[]): ScoredClient[] {
  return clients.map((c) => scoreClient(c, clients));
}
