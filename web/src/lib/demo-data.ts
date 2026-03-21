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
} from "./api";

// -- Demo clients matching the Streamlit app's 15 demo clients --

const DEMO_CLIENTS: Client[] = [
  { id: "1", name: "Aria Chen", email: "aria@studioaria.co", status: "Call Complete", product: "First Call", amount: 499, payment_date: "2026-01-15", call_date: "2026-01-22", lead_source: "IG DM", days_to_convert: 3, created: "2026-01-12" },
  { id: "2", name: "Marcus Rivera", email: "marcus@riveradesign.com", status: "Intake Complete", product: "Single Call", amount: 699, payment_date: "2026-02-01", lead_source: "Referral", days_to_convert: 5, created: "2026-01-27" },
  { id: "3", name: "Zoe Nakamura", email: "zoe@znphoto.com", status: "Follow-Up Sent", product: "3-Session Clarity Sprint", amount: 1495, payment_date: "2025-12-10", call_date: "2025-12-18", lead_source: "IG Story", days_to_convert: 2, created: "2025-12-08" },
  { id: "4", name: "Dex Okafor", email: "dex@boldtype.co", status: "Booked - Needs Intake", product: "First Call", amount: 499, payment_date: "2026-02-10", lead_source: "Meta Ad", days_to_convert: 7, created: "2026-02-03" },
  { id: "5", name: "Luna Petrova", email: "luna@moonlightbrand.com", status: "Paid - Needs Booking", product: "Single Call", amount: 699, payment_date: "2026-02-18", lead_source: "LinkedIn", days_to_convert: 4, created: "2026-02-14" },
  { id: "6", name: "Kai Washington", email: "kai@kwcreative.io", status: "Call Complete", product: "3-Session Clarity Sprint", amount: 1495, payment_date: "2025-11-20", call_date: "2025-12-01", lead_source: "Website", days_to_convert: 6, created: "2025-11-14" },
  { id: "7", name: "Priya Desai", email: "priya@colortheory.design", status: "Lead - Laylo", product: "First Call", amount: 0, lead_source: "IG DM", created: "2026-02-20" },
  { id: "8", name: "Finn O'Brien", email: "finn@obrienarts.com", status: "Ready for Call", product: "First Call", amount: 499, payment_date: "2026-02-15", call_date: "2026-02-25", lead_source: "IG Comment", days_to_convert: 8, created: "2026-02-07" },
  { id: "9", name: "Sasha Kim", email: "sasha@kimlens.co", status: "Follow-Up Sent", product: "Single Call", amount: 699, payment_date: "2026-01-05", call_date: "2026-01-12", lead_source: "Referral", days_to_convert: 1, created: "2026-01-04" },
  { id: "10", name: "Omar Hassan", email: "omar@hassanstudio.com", status: "Lead - Laylo", product: "First Call", amount: 0, lead_source: "IG Story", created: "2026-02-22" },
  { id: "11", name: "Nia Kofi", email: "nia@koficollective.com", status: "Call Complete", product: "First Call", amount: 499, payment_date: "2026-01-25", call_date: "2026-02-02", lead_source: "Direct", days_to_convert: 10, created: "2026-01-15" },
  { id: "12", name: "Theo Andersen", email: "theo@andersenmade.co", status: "Booked - Needs Intake", product: "Single Call", amount: 699, payment_date: "2026-02-12", lead_source: "Website", days_to_convert: 3, created: "2026-02-09" },
  { id: "13", name: "Mila Santos", email: "mila@santoscreative.co", status: "Intake Complete", product: "3-Session Clarity Sprint", amount: 1495, payment_date: "2026-02-05", lead_source: "Meta Ad", days_to_convert: 12, created: "2026-01-24" },
  { id: "14", name: "Jasper Obi", email: "jasper@obistudios.art", status: "Paid - Needs Booking", product: "First Call", amount: 499, payment_date: "2026-02-20", lead_source: "IG DM", days_to_convert: 2, created: "2026-02-18" },
  { id: "15", name: "Celeste Moreau", email: "celeste@moreauvisual.fr", status: "Lead - Laylo", product: "First Call", amount: 0, lead_source: "IG Comment", created: "2026-02-23" },
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

// -- Demo data generators --

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
      return {
        stage,
        count: clients.length,
        value: clients.reduce((s, c) => s + c.amount, 0),
        clients,
      };
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
    return [
      { channel: "IG DM", leads: 4, conversions: 3, revenue: 1497, conversion_rate: 0.75, avg_deal_size: 499 },
      { channel: "Referral", leads: 2, conversions: 2, revenue: 1398, conversion_rate: 1.0, avg_deal_size: 699 },
      { channel: "IG Story", leads: 2, conversions: 1, revenue: 1495, conversion_rate: 0.5, avg_deal_size: 1495 },
      { channel: "Meta Ad", leads: 2, conversions: 2, revenue: 1994, conversion_rate: 1.0, avg_deal_size: 997 },
      { channel: "Website", leads: 2, conversions: 2, revenue: 2194, conversion_rate: 1.0, avg_deal_size: 1097 },
      { channel: "LinkedIn", leads: 1, conversions: 1, revenue: 699, conversion_rate: 1.0, avg_deal_size: 699 },
      { channel: "IG Comment", leads: 2, conversions: 1, revenue: 499, conversion_rate: 0.5, avg_deal_size: 499 },
      { channel: "Direct", leads: 1, conversions: 1, revenue: 499, conversion_rate: 1.0, avg_deal_size: 499 },
    ];
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
};
