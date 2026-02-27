import type {
  KpiSummary,
  Client,
  ScoredClient,
  PipelineStage,
  MonthlyRevenue,
  ChannelMetric,
  FunnelStage,
  LtvData,
  HealthCheck,
  ChannelPerformance,
  RevenueGoalData,
  MicroFunnel,
  OutcomesData,
  ConversionPath,
  AttributionSummary,
  RetargetingSegment,
  ActionPlan,
  BrandAuditResult,
} from "./types";

const DEMO_CLIENTS: Client[] = [
  { id: "1", name: "Aria Chen", email: "aria@studioaria.co", status: "Call Complete", product: "First Call", amount: 499, payment_date: "2026-01-15", call_date: "2026-01-22", lead_source: "IG DM", days_to_convert: 3, created: "2026-01-12" },
  { id: "2", name: "Marcus Rivera", email: "marcus@riveradesign.com", status: "Intake Complete", product: "Single Call", amount: 699, payment_date: "2026-02-01", lead_source: "Referral", days_to_convert: 5, created: "2026-01-27" },
  { id: "3", name: "Zoe Nakamura", email: "zoe@znphoto.com", status: "Follow-Up Sent", product: "3-Session Clarity Sprint", amount: 1495, payment_date: "2025-12-10", call_date: "2025-12-18", lead_source: "IG Story", days_to_convert: 2, created: "2025-12-08" },
  { id: "4", name: "Dex Okafor", email: "dex@boldtype.co", status: "Booked - Needs Intake", product: "First Call", amount: 499, payment_date: "2026-02-10", lead_source: "Meta Ad", days_to_convert: 7, created: "2026-02-03" },
  { id: "5", name: "Luna Petrova", email: "luna@moonlightbrand.com", status: "Paid - Needs Booking", product: "Single Call", amount: 699, payment_date: "2026-02-18", lead_source: "LinkedIn", days_to_convert: 4, created: "2026-02-14" },
  { id: "6", name: "Kai Washington", email: "kai@kwcreative.io", status: "Call Complete", product: "3-Session Clarity Sprint", amount: 1495, payment_date: "2025-11-20", call_date: "2025-12-01", lead_source: "Website", days_to_convert: 6, created: "2025-11-14" },
  { id: "7", name: "Priya Desai", email: "priya@colortheory.design", status: "Lead - Laylo", product: "", amount: 0, lead_source: "IG DM", created: "2026-02-20" },
  { id: "8", name: "Finn O'Brien", email: "finn@obrienarts.com", status: "Ready for Call", product: "First Call", amount: 499, payment_date: "2026-02-15", call_date: "2026-02-25", lead_source: "IG Comment", days_to_convert: 8, created: "2026-02-07" },
  { id: "9", name: "Sasha Kim", email: "sasha@kimlens.co", status: "Follow-Up Sent", product: "Single Call", amount: 699, payment_date: "2026-01-05", call_date: "2026-01-12", lead_source: "Referral", days_to_convert: 1, created: "2026-01-04" },
  { id: "10", name: "Omar Hassan", email: "omar@hassanstudio.com", status: "Lead - Laylo", product: "", amount: 0, lead_source: "IG Story", created: "2026-02-22" },
  { id: "11", name: "Nia Kofi", email: "nia@koficollective.com", status: "Call Complete", product: "First Call", amount: 499, payment_date: "2026-01-25", call_date: "2026-02-02", lead_source: "Direct", days_to_convert: 10, created: "2026-01-15" },
  { id: "12", name: "Theo Andersen", email: "theo@andersenmade.co", status: "Booked - Needs Intake", product: "Single Call", amount: 699, payment_date: "2026-02-12", lead_source: "Website", days_to_convert: 3, created: "2026-02-09" },
  { id: "13", name: "Mila Santos", email: "mila@santoscreative.co", status: "Intake Complete", product: "3-Session Clarity Sprint", amount: 1495, payment_date: "2026-02-05", lead_source: "Meta Ad", days_to_convert: 12, created: "2026-01-24" },
  { id: "14", name: "Jasper Obi", email: "jasper@obistudios.art", status: "Paid - Needs Booking", product: "First Call", amount: 499, payment_date: "2026-02-20", lead_source: "IG DM", days_to_convert: 2, created: "2026-02-18" },
  { id: "15", name: "Celeste Moreau", email: "celeste@moreauvisual.fr", status: "Lead - Laylo", product: "", amount: 0, lead_source: "IG Comment", created: "2026-02-23" },
];

const SCORE_MAP: Record<string, { score: number; tier: ScoredClient["tier"]; engagement: number; recency: number; value: number; fit: number }> = {
  "1": { score: 82, tier: "Hot", engagement: 85, recency: 90, value: 70, fit: 80 },
  "2": { score: 75, tier: "Hot", engagement: 70, recency: 85, value: 80, fit: 65 },
  "3": { score: 88, tier: "Hot", engagement: 90, recency: 60, value: 95, fit: 92 },
  "4": { score: 55, tier: "Warm", engagement: 50, recency: 80, value: 45, fit: 50 },
  "5": { score: 62, tier: "Warm", engagement: 55, recency: 90, value: 60, fit: 48 },
  "6": { score: 91, tier: "Hot", engagement: 95, recency: 55, value: 95, fit: 90 },
  "7": { score: 28, tier: "Cool", engagement: 30, recency: 70, value: 10, fit: 35 },
  "8": { score: 68, tier: "Warm", engagement: 65, recency: 85, value: 55, fit: 70 },
  "9": { score: 79, tier: "Hot", engagement: 80, recency: 65, value: 75, fit: 85 },
  "10": { score: 22, tier: "Cool", engagement: 25, recency: 60, value: 5, fit: 20 },
  "11": { score: 58, tier: "Warm", engagement: 55, recency: 70, value: 50, fit: 55 },
  "12": { score: 48, tier: "Warm", engagement: 45, recency: 80, value: 40, fit: 35 },
  "13": { score: 72, tier: "Hot", engagement: 68, recency: 75, value: 85, fit: 60 },
  "14": { score: 35, tier: "Cool", engagement: 30, recency: 90, value: 25, fit: 30 },
  "15": { score: 15, tier: "Cold", engagement: 10, recency: 50, value: 5, fit: 15 },
};

/** Derive channel metrics from client data so totals always match. */
function deriveChannelMetrics(clients: Client[]): ChannelMetric[] {
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

/** Supplementary per-channel data not derivable from client records. */
const CHANNEL_EXTRA: Record<string, {
  cac: number;
  benchmark_cac: number;
  trend: number;
  monthly: { month: string; leads: number; revenue: number }[];
}> = {
  "IG DM": { cac: 180, benchmark_cac: 200, trend: 0.12, monthly: [
    { month: "2025-10", leads: 1, revenue: 0 }, { month: "2025-11", leads: 0, revenue: 0 }, { month: "2025-12", leads: 0, revenue: 0 }, { month: "2026-01", leads: 1, revenue: 499 }, { month: "2026-02", leads: 1, revenue: 499 },
  ]},
  Referral: { cac: 85, benchmark_cac: 100, trend: 0.25, monthly: [
    { month: "2025-10", leads: 0, revenue: 0 }, { month: "2025-11", leads: 0, revenue: 0 }, { month: "2025-12", leads: 0, revenue: 0 }, { month: "2026-01", leads: 1, revenue: 699 }, { month: "2026-02", leads: 1, revenue: 699 },
  ]},
  "Meta Ad": { cac: 720, benchmark_cac: 800, trend: -0.05, monthly: [
    { month: "2025-10", leads: 0, revenue: 0 }, { month: "2025-11", leads: 0, revenue: 0 }, { month: "2025-12", leads: 0, revenue: 0 }, { month: "2026-01", leads: 1, revenue: 499 }, { month: "2026-02", leads: 1, revenue: 1495 },
  ]},
  Website: { cac: 280, benchmark_cac: 300, trend: 0.08, monthly: [
    { month: "2025-10", leads: 0, revenue: 0 }, { month: "2025-11", leads: 1, revenue: 1495 }, { month: "2025-12", leads: 0, revenue: 0 }, { month: "2026-01", leads: 0, revenue: 0 }, { month: "2026-02", leads: 1, revenue: 699 },
  ]},
  "IG Story": { cac: 320, benchmark_cac: 250, trend: -0.10, monthly: [
    { month: "2025-10", leads: 0, revenue: 0 }, { month: "2025-11", leads: 0, revenue: 0 }, { month: "2025-12", leads: 1, revenue: 1495 }, { month: "2026-01", leads: 0, revenue: 0 }, { month: "2026-02", leads: 1, revenue: 0 },
  ]},
  LinkedIn: { cac: 150, benchmark_cac: 350, trend: 0.0, monthly: [
    { month: "2025-10", leads: 0, revenue: 0 }, { month: "2025-11", leads: 0, revenue: 0 }, { month: "2025-12", leads: 0, revenue: 0 }, { month: "2026-01", leads: 0, revenue: 0 }, { month: "2026-02", leads: 1, revenue: 699 },
  ]},
  "IG Comment": { cac: 210, benchmark_cac: 200, trend: -0.15, monthly: [
    { month: "2025-10", leads: 0, revenue: 0 }, { month: "2025-11", leads: 0, revenue: 0 }, { month: "2025-12", leads: 0, revenue: 0 }, { month: "2026-01", leads: 0, revenue: 0 }, { month: "2026-02", leads: 2, revenue: 499 },
  ]},
  Direct: { cac: 0, benchmark_cac: 50, trend: 0.0, monthly: [
    { month: "2025-10", leads: 0, revenue: 0 }, { month: "2025-11", leads: 0, revenue: 0 }, { month: "2025-12", leads: 0, revenue: 0 }, { month: "2026-01", leads: 1, revenue: 499 }, { month: "2026-02", leads: 0, revenue: 0 },
  ]},
};

export const demoData = {
  getKpis(): KpiSummary {
    const paid = DEMO_CLIENTS.filter((c) => c.amount > 0);
    const totalRevenue = paid.reduce((sum, c) => sum + c.amount, 0);
    return {
      total_revenue: totalRevenue,
      total_clients: DEMO_CLIENTS.length,
      active_pipeline: DEMO_CLIENTS.filter((c) =>
        ["Paid - Needs Booking", "Booked - Needs Intake", "Intake Complete", "Ready for Call"].includes(c.status)
      ).length,
      booking_rate: 0.92,
      avg_deal_size: totalRevenue / paid.length,
      monthly_revenue: 4886,
      revenue_trend: 0.15,
      conversion_rate: paid.length / DEMO_CLIENTS.length,
    };
  },

  getClients(): Client[] {
    return DEMO_CLIENTS;
  },

  getScoredClients(): ScoredClient[] {
    return DEMO_CLIENTS.map((c) => ({
      ...c,
      ...(SCORE_MAP[c.id] ?? { score: 50, tier: "Warm" as const, engagement: 50, recency: 50, value: 50, fit: 50 }),
    }));
  },

  getPipeline(): PipelineStage[] {
    const stages = [
      "Lead - Laylo",
      "Paid - Needs Booking",
      "Booked - Needs Intake",
      "Intake Complete",
      "Ready for Call",
      "Call Complete",
      "Follow-Up Sent",
    ];
    return stages.map((stage) => {
      const clients = DEMO_CLIENTS.filter((c) => c.status === stage);
      return { stage, count: clients.length, value: clients.reduce((s, c) => s + c.amount, 0), clients };
    });
  },

  getMonthlyRevenue(): MonthlyRevenue[] {
    return [
      { month: "2025-10", revenue: 1198 },
      { month: "2025-11", revenue: 2194 },
      { month: "2025-12", revenue: 3489 },
      { month: "2026-01", revenue: 4886 },
      { month: "2026-02", revenue: 5882 },
    ];
  },

  getChannelMetrics(): ChannelMetric[] {
    return deriveChannelMetrics(DEMO_CLIENTS);
  },

  getFunnel(): FunnelStage[] {
    return [
      { stage: "Leads", count: 15, conversion_rate: 1.0 },
      { stage: "Paid", count: 12, conversion_rate: 0.8 },
      { stage: "Booked", count: 10, conversion_rate: 0.83 },
      { stage: "Intake Done", count: 8, conversion_rate: 0.8 },
      { stage: "Call Complete", count: 5, conversion_rate: 0.625 },
      { stage: "Follow-Up Sent", count: 2, conversion_rate: 0.4 },
    ];
  },

  getLtv(): LtvData {
    return {
      overall_ltv: 732,
      by_source: { "IG DM": 499, Referral: 699, "IG Story": 1495, "Meta Ad": 997, Website: 1097, LinkedIn: 699 },
      by_product: { "First Call": 499, "Single Call": 699, "3-Session Clarity Sprint": 1495 },
      projected_12mo: 58800,
    };
  },

  getHealth(): HealthCheck[] {
    return [
      { service: "Notion", status: "healthy", latency_ms: 245, message: "Connected" },
      { service: "Stripe", status: "healthy", latency_ms: 180, message: "Connected" },
      { service: "Calendly", status: "healthy", latency_ms: 310, message: "Connected" },
      { service: "Claude AI", status: "healthy", latency_ms: 520, message: "claude-sonnet-4-5-20250929" },
      { service: "n8n", status: "healthy", latency_ms: 150, message: "5 workflows active" },
      { service: "ManyChat", status: "not_configured", message: "API key not set" },
      { service: "Fireflies", status: "not_configured", message: "API key not set" },
    ];
  },

  getChannelPerformance(): ChannelPerformance[] {
    const base = deriveChannelMetrics(DEMO_CLIENTS);
    return base.map((ch) => {
      const extra = CHANNEL_EXTRA[ch.channel];
      const cac = extra?.cac ?? 0;
      const roi = cac > 0 ? Math.round((ch.revenue / cac) * 10) / 10 : Infinity;
      return {
        ...ch,
        cac,
        roi,
        benchmark_cac: extra?.benchmark_cac ?? 200,
        trend: extra?.trend ?? 0,
        monthly: extra?.monthly ?? [],
      };
    });
  },

  getRevenueGoals(): RevenueGoalData {
    return {
      annual_target: 800000,
      current_annual_run_rate: 70632, // ~$5,886/mo × 12
      gap: 729368,
      capacity_ceiling: 527000, // 20 calls/week max
      monthly_actuals: [
        { month: "2025-10", actual: 1198, target: 66667 },
        { month: "2025-11", actual: 2194, target: 66667 },
        { month: "2025-12", actual: 3489, target: 66667 },
        { month: "2026-01", actual: 4886, target: 66667 },
        { month: "2026-02", actual: 5882, target: 66667 },
      ],
      scenarios: [
        { id: "conservative", name: "Calls Only", product_mix: [
          { product: "First Call", units_per_month: 12, price: 499 },
          { product: "Single Call", units_per_month: 6, price: 699 },
          { product: "3-Session Sprint", units_per_month: 3, price: 1495 },
        ], annual_revenue: 174_780, monthly_target: 14_565, feasibility: "achievable" },
        { id: "growth", name: "Calls + VIP Days", product_mix: [
          { product: "First Call", units_per_month: 15, price: 499 },
          { product: "Single Call", units_per_month: 8, price: 699 },
          { product: "3-Session Sprint", units_per_month: 5, price: 1495 },
          { product: "VIP Day", units_per_month: 2, price: 2995 },
        ], annual_revenue: 388_860, monthly_target: 32_405, feasibility: "stretch" },
        { id: "scale", name: "Full Product Ladder", product_mix: [
          { product: "First Call", units_per_month: 20, price: 499 },
          { product: "Single Call", units_per_month: 10, price: 699 },
          { product: "3-Session Sprint", units_per_month: 8, price: 1495 },
          { product: "VIP Day", units_per_month: 3, price: 2995 },
          { product: "Brand Audit", units_per_month: 15, price: 299 },
          { product: "Community", units_per_month: 50, price: 99 },
        ], annual_revenue: 801_540, monthly_target: 66_795, feasibility: "aggressive" },
      ],
    };
  },

  getMicroFunnel(): MicroFunnel {
    return {
      avg_days_to_convert: 5.2,
      bottleneck: "Booked → Intake",
      stages: [
        { stage: "Awareness", entered: 200, completed: 48, drop_off_rate: 0.76, avg_time_hours: 0, benchmark_rate: 0.72 },
        { stage: "Lead Capture", entered: 48, completed: 15, drop_off_rate: 0.69, avg_time_hours: 2.4, benchmark_rate: 0.65 },
        { stage: "Payment", entered: 15, completed: 12, drop_off_rate: 0.20, avg_time_hours: 36, benchmark_rate: 0.25 },
        { stage: "Booking", entered: 12, completed: 10, drop_off_rate: 0.17, avg_time_hours: 18, benchmark_rate: 0.15 },
        { stage: "Intake Form", entered: 10, completed: 7, drop_off_rate: 0.30, avg_time_hours: 48, benchmark_rate: 0.20 },
        { stage: "Call Complete", entered: 7, completed: 5, drop_off_rate: 0.29, avg_time_hours: 72, benchmark_rate: 0.10 },
        { stage: "Follow-Up", entered: 5, completed: 2, drop_off_rate: 0.60, avg_time_hours: 24, benchmark_rate: 0.30 },
      ],
    };
  },

  getOutcomes(): OutcomesData {
    return {
      nps_score: 72,
      nps_responses: 8,
      nps_breakdown: { promoters: 6, passives: 1, detractors: 1 },
      testimonials: [
        { id: "t1", client_name: "Zoe Nakamura", quote: "The clarity sprint completely transformed how I approach client work. I went from scattered to strategic in 3 sessions.", rating: 5, date: "2026-01-05", product: "3-Session Clarity Sprint" },
        { id: "t2", client_name: "Kai Washington", quote: "Jake asked the questions I didn't even know I needed to answer. My rebrand went from stuck to launched in 2 weeks.", rating: 5, date: "2026-01-20", product: "3-Session Clarity Sprint" },
        { id: "t3", client_name: "Aria Chen", quote: "The action plan was so detailed and actionable. I actually executed everything within 10 days.", rating: 5, date: "2026-02-01", product: "First Call" },
        { id: "t4", client_name: "Sasha Kim", quote: "Honestly worth every penny. The framework they gave me for pricing my services paid for itself in the first week.", rating: 4, date: "2026-02-10", product: "Single Call" },
        { id: "t5", client_name: "Nia Kofi", quote: "Good session but I wish we had more time to go deeper on my content strategy. Will probably book the sprint next.", rating: 3, date: "2026-02-15", product: "First Call" },
      ],
      referrals: [
        { id: "r1", referrer: "Zoe Nakamura", referred: "Marcus Rivera", status: "converted", revenue: 699, date: "2026-01-27" },
        { id: "r2", referrer: "Kai Washington", referred: "Mila Santos", status: "converted", revenue: 1495, date: "2026-01-24" },
        { id: "r3", referrer: "Aria Chen", referred: "Theo Andersen", status: "pending", revenue: 0, date: "2026-02-12" },
        { id: "r4", referrer: "Sasha Kim", referred: "Luna Petrova", status: "converted", revenue: 699, date: "2026-02-14" },
      ],
      ltv_leaderboard: [
        { client_name: "Kai Washington", total_revenue: 2990, purchases: 2, first_purchase: "2025-11-20", last_purchase: "2026-02-10", predicted_ltv: 4485 },
        { client_name: "Zoe Nakamura", total_revenue: 1994, purchases: 2, first_purchase: "2025-12-10", last_purchase: "2026-01-28", predicted_ltv: 3489 },
        { client_name: "Mila Santos", total_revenue: 1495, purchases: 1, first_purchase: "2026-02-05", last_purchase: "2026-02-05", predicted_ltv: 2194 },
        { client_name: "Sasha Kim", total_revenue: 1398, purchases: 2, first_purchase: "2026-01-05", last_purchase: "2026-02-18", predicted_ltv: 2097 },
        { client_name: "Marcus Rivera", total_revenue: 699, purchases: 1, first_purchase: "2026-02-01", last_purchase: "2026-02-01", predicted_ltv: 1198 },
      ],
      cohort_retention: [
        { cohort: "2025-Q4", clients: 3, repeat_rate: 0.67, avg_purchases: 1.7, avg_revenue: 1163 },
        { cohort: "2026-Jan", clients: 4, repeat_rate: 0.25, avg_purchases: 1.3, avg_revenue: 745 },
        { cohort: "2026-Feb", clients: 5, repeat_rate: 0.0, avg_purchases: 1.0, avg_revenue: 774 },
      ],
    };
  },

  getConversionPaths(): { paths: ConversionPath[]; attribution: AttributionSummary[] } {
    return {
      paths: [
        { id: "p1", client_name: "Aria Chen", touchpoints: [
          { channel: "IG Story", type: "first", date: "2026-01-10" },
          { channel: "IG DM", type: "middle", date: "2026-01-11" },
          { channel: "Website", type: "last", date: "2026-01-12" },
        ], days_to_convert: 3, revenue: 499 },
        { id: "p2", client_name: "Marcus Rivera", touchpoints: [
          { channel: "Referral", type: "first", date: "2026-01-24" },
          { channel: "Website", type: "last", date: "2026-01-27" },
        ], days_to_convert: 5, revenue: 699 },
        { id: "p3", client_name: "Zoe Nakamura", touchpoints: [
          { channel: "IG Story", type: "first", date: "2025-12-06" },
          { channel: "IG DM", type: "middle", date: "2025-12-07" },
          { channel: "IG DM", type: "last", date: "2025-12-08" },
        ], days_to_convert: 2, revenue: 1495 },
        { id: "p4", client_name: "Dex Okafor", touchpoints: [
          { channel: "Meta Ad", type: "first", date: "2026-01-28" },
          { channel: "Website", type: "middle", date: "2026-01-30" },
          { channel: "IG DM", type: "middle", date: "2026-02-01" },
          { channel: "Meta Ad", type: "last", date: "2026-02-03" },
        ], days_to_convert: 7, revenue: 499 },
        { id: "p5", client_name: "Luna Petrova", touchpoints: [
          { channel: "LinkedIn", type: "first", date: "2026-02-10" },
          { channel: "Website", type: "middle", date: "2026-02-12" },
          { channel: "Referral", type: "last", date: "2026-02-14" },
        ], days_to_convert: 4, revenue: 699 },
        { id: "p6", client_name: "Kai Washington", touchpoints: [
          { channel: "Website", type: "first", date: "2025-11-08" },
          { channel: "IG Story", type: "middle", date: "2025-11-10" },
          { channel: "Website", type: "last", date: "2025-11-14" },
        ], days_to_convert: 6, revenue: 1495 },
        { id: "p7", client_name: "Mila Santos", touchpoints: [
          { channel: "Meta Ad", type: "first", date: "2026-01-18" },
          { channel: "IG DM", type: "middle", date: "2026-01-20" },
          { channel: "Website", type: "middle", date: "2026-01-22" },
          { channel: "Meta Ad", type: "last", date: "2026-01-24" },
        ], days_to_convert: 12, revenue: 1495 },
      ],
      attribution: [
        { channel: "IG DM", first_touch: 1, last_touch: 1, linear: 3.5, revenue_attributed: 2492 },
        { channel: "IG Story", first_touch: 2, last_touch: 0, linear: 1.5, revenue_attributed: 1495 },
        { channel: "Meta Ad", first_touch: 2, last_touch: 2, linear: 2.5, revenue_attributed: 1994 },
        { channel: "Website", first_touch: 1, last_touch: 2, linear: 3.0, revenue_attributed: 2693 },
        { channel: "Referral", first_touch: 1, last_touch: 1, linear: 1.5, revenue_attributed: 1398 },
        { channel: "LinkedIn", first_touch: 1, last_touch: 0, linear: 0.5, revenue_attributed: 349 },
      ],
    };
  },

  getRetargetingSegments(): RetargetingSegment[] {
    return [
      {
        id: "s1", name: "Paid but Never Booked", description: "Completed payment but haven't scheduled their call",
        count: 2, criteria: "Status = 'Paid - Needs Booking' AND payment > 48hrs ago",
        suggested_action: "Send personalized booking reminder with direct Calendly link",
        priority: "high", estimated_revenue: 1198,
        clients: [
          { name: "Luna Petrova", email: "luna@moonlightbrand.com", days_inactive: 8, last_status: "Paid - Needs Booking" },
          { name: "Jasper Obi", email: "jasper@obistudios.art", days_inactive: 6, last_status: "Paid - Needs Booking" },
        ],
      },
      {
        id: "s2", name: "Booked but No Intake", description: "Call scheduled but intake form not submitted",
        count: 2, criteria: "Status = 'Booked - Needs Intake' AND call within 5 days",
        suggested_action: "Send Tally intake form link with urgency framing",
        priority: "high", estimated_revenue: 0,
        clients: [
          { name: "Dex Okafor", email: "dex@boldtype.co", days_inactive: 16, last_status: "Booked - Needs Intake" },
          { name: "Theo Andersen", email: "theo@andersenmade.co", days_inactive: 14, last_status: "Booked - Needs Intake" },
        ],
      },
      {
        id: "s3", name: "Laylo Leads — Warm", description: "Signed up via IG keyword but haven't purchased",
        count: 3, criteria: "Status = 'Lead - Laylo' AND created 3-7 days ago",
        suggested_action: "Send 3-email nurture sequence with social proof + limited-time first-call pricing",
        priority: "medium", estimated_revenue: 1497,
        clients: [
          { name: "Priya Desai", email: "priya@colortheory.design", days_inactive: 6, last_status: "Lead - Laylo" },
          { name: "Omar Hassan", email: "omar@hassanstudio.com", days_inactive: 4, last_status: "Lead - Laylo" },
          { name: "Celeste Moreau", email: "celeste@moreauvisual.fr", days_inactive: 3, last_status: "Lead - Laylo" },
        ],
      },
      {
        id: "s4", name: "Call Complete — Upsell", description: "Finished first call, potential for Sprint or VIP Day",
        count: 3, criteria: "Status = 'Call Complete' AND product = 'First Call'",
        suggested_action: "Send case study + Sprint package offer with alumni discount",
        priority: "medium", estimated_revenue: 4485,
        clients: [
          { name: "Aria Chen", email: "aria@studioaria.co", days_inactive: 35, last_status: "Call Complete" },
          { name: "Nia Kofi", email: "nia@koficollective.com", days_inactive: 24, last_status: "Call Complete" },
        ],
      },
      {
        id: "s5", name: "Follow-Up Sent — Re-engage", description: "Received follow-up but no further engagement",
        count: 2, criteria: "Status = 'Follow-Up Sent' AND last activity > 14 days",
        suggested_action: "Send quarterly check-in with new offering + referral incentive",
        priority: "low", estimated_revenue: 998,
        clients: [
          { name: "Zoe Nakamura", email: "zoe@znphoto.com", days_inactive: 70, last_status: "Follow-Up Sent" },
          { name: "Sasha Kim", email: "sasha@kimlens.co", days_inactive: 45, last_status: "Follow-Up Sent" },
        ],
      },
    ];
  },

  getActionPlans(): ActionPlan[] {
    return [
      { id: "ap1", client_name: "Aria Chen", type: "transcript", status: "sent", created: "2026-01-23", updated: "2026-01-24", summary: "Brand positioning for Studio Aria — focus on premium photography packages and Instagram-first marketing strategy",
        items: [
          { id: "i1", text: "Restructure pricing page with 3-tier offering", completed: true, category: "Pricing", priority: "high" },
          { id: "i2", text: "Create Instagram content calendar (4 posts/week)", completed: true, category: "Content", priority: "high" },
          { id: "i3", text: "Set up automated DM response for inquiries", completed: false, category: "Automation", priority: "medium" },
          { id: "i4", text: "Launch client testimonial highlight series", completed: false, category: "Social Proof", priority: "medium" },
          { id: "i5", text: "Build email welcome sequence (5 emails)", completed: false, category: "Email", priority: "low" },
        ]},
      { id: "ap2", client_name: "Kai Washington", type: "transcript", status: "viewed", created: "2025-12-02", updated: "2025-12-15", summary: "Full brand refresh for KW Creative — new visual identity, messaging framework, and launch strategy",
        items: [
          { id: "i6", text: "Finalize brand color palette and typography", completed: true, category: "Visual Identity", priority: "high" },
          { id: "i7", text: "Write brand voice guidelines document", completed: true, category: "Messaging", priority: "high" },
          { id: "i8", text: "Redesign website hero section", completed: true, category: "Website", priority: "high" },
          { id: "i9", text: "Create launch announcement sequence", completed: true, category: "Launch", priority: "medium" },
          { id: "i10", text: "Set up Google Business Profile", completed: false, category: "SEO", priority: "low" },
        ]},
      { id: "ap3", client_name: "Sasha Kim", type: "manual", status: "completed", created: "2026-01-13", updated: "2026-01-28", summary: "Photography business scaling — systemize client workflow, raise prices, build referral program",
        items: [
          { id: "i11", text: "Create client onboarding questionnaire", completed: true, category: "Systems", priority: "high" },
          { id: "i12", text: "Implement new pricing structure (+30%)", completed: true, category: "Pricing", priority: "high" },
          { id: "i13", text: "Build referral incentive program", completed: true, category: "Growth", priority: "medium" },
          { id: "i14", text: "Set up CRM with automated follow-ups", completed: true, category: "Automation", priority: "medium" },
        ]},
      { id: "ap4", client_name: "Nia Kofi", type: "transcript", status: "sent", created: "2026-02-03", updated: "2026-02-04", summary: "Content strategy for Kofi Collective — pivot from generalist to niche creative consultancy",
        items: [
          { id: "i15", text: "Define niche positioning statement", completed: false, category: "Positioning", priority: "high" },
          { id: "i16", text: "Audit current content for alignment", completed: false, category: "Content", priority: "high" },
          { id: "i17", text: "Create 30-day content transition plan", completed: false, category: "Content", priority: "medium" },
          { id: "i18", text: "Update website copy to reflect niche", completed: false, category: "Website", priority: "medium" },
          { id: "i19", text: "Build email list from existing audience", completed: false, category: "Email", priority: "low" },
        ]},
      { id: "ap5", client_name: "Zoe Nakamura", type: "transcript", status: "completed", created: "2025-12-19", updated: "2026-01-15", summary: "Sprint: Photography to creative direction pivot — portfolio curation, pricing overhaul, luxury market positioning",
        items: [
          { id: "i20", text: "Curate portfolio (20 images, luxury focus)", completed: true, category: "Portfolio", priority: "high" },
          { id: "i21", text: "Create creative direction service menu", completed: true, category: "Services", priority: "high" },
          { id: "i22", text: "Implement premium pricing ($5K+ projects)", completed: true, category: "Pricing", priority: "high" },
          { id: "i23", text: "Build outreach list (50 luxury brands)", completed: true, category: "Outreach", priority: "medium" },
          { id: "i24", text: "Design case study template", completed: true, category: "Marketing", priority: "medium" },
          { id: "i25", text: "Launch LinkedIn thought leadership series", completed: true, category: "Content", priority: "low" },
        ]},
      { id: "ap6", client_name: "Mila Santos", type: "manual", status: "draft", created: "2026-02-20", updated: "2026-02-20", summary: "Sprint: Agency positioning for Santos Creative — team structure, pricing model, client acquisition system",
        items: [
          { id: "i26", text: "Define agency service tiers", completed: false, category: "Services", priority: "high" },
          { id: "i27", text: "Create team hiring roadmap", completed: false, category: "Team", priority: "high" },
          { id: "i28", text: "Build retainer pricing model", completed: false, category: "Pricing", priority: "high" },
          { id: "i29", text: "Set up project management system", completed: false, category: "Operations", priority: "medium" },
          { id: "i30", text: "Create case study from top 3 projects", completed: false, category: "Marketing", priority: "medium" },
        ]},
    ];
  },

  getBrandAudit(): BrandAuditResult {
    return {
      overall_score: 71,
      tier: "Developing",
      percentile: 68,
      dimensions: [
        { name: "Visual Identity", score: 78, weight: 0.20, benchmark: 62, description: "Logo, colors, typography, photography style consistency" },
        { name: "Messaging Clarity", score: 82, weight: 0.20, benchmark: 55, description: "Value proposition, tagline, elevator pitch effectiveness" },
        { name: "Messaging Consistency", score: 65, weight: 0.15, benchmark: 58, description: "Cross-platform voice alignment and tone uniformity" },
        { name: "Differentiation", score: 58, weight: 0.15, benchmark: 48, description: "Unique positioning vs. competitors in the space" },
        { name: "Content Strategy", score: 72, weight: 0.15, benchmark: 52, description: "Content quality, frequency, audience alignment" },
        { name: "Competitive Position", score: 62, weight: 0.15, benchmark: 45, description: "Market awareness, category ownership, share of voice" },
      ],
      priority_actions: [
        "Strengthen differentiation — develop unique framework or methodology name",
        "Improve cross-platform messaging consistency (IG vs. Website vs. Email)",
        "Build competitive moat through proprietary content series or community",
        "Create brand guidelines document for all touchpoints",
        "Launch thought leadership content on LinkedIn to expand visibility",
      ],
    };
  },
};
