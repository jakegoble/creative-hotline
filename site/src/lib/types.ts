export interface KpiSummary {
  total_revenue: number;
  total_clients: number;
  active_pipeline: number;
  booking_rate: number;
  avg_deal_size: number;
  monthly_revenue: number;
  revenue_trend: number;
  conversion_rate: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  product: string;
  amount: number;
  payment_date?: string;
  call_date?: string;
  lead_source: string;
  days_to_convert?: number;
  created: string;
}

export interface ScoredClient extends Client {
  score: number;
  tier: "Hot" | "Warm" | "Cool" | "Cold";
  engagement: number;
  recency: number;
  value: number;
  fit: number;
}

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
  clients: Client[];
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface ChannelMetric {
  channel: string;
  leads: number;
  conversions: number;
  revenue: number;
  conversion_rate: number;
  avg_deal_size: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  conversion_rate: number;
}

export interface LtvData {
  overall_ltv: number;
  by_source: Record<string, number>;
  by_product: Record<string, number>;
  projected_12mo: number;
}

export interface HealthCheck {
  service: string;
  status: "healthy" | "degraded" | "down" | "not_configured";
  latency_ms?: number;
  message?: string;
}

// --- Channels ---
export interface ChannelPerformance extends ChannelMetric {
  cac: number;
  roi: number;
  benchmark_cac: number;
  trend: number; // month-over-month change
  monthly: { month: string; leads: number; revenue: number }[];
}

// --- Revenue Goals ---
export interface RevenueScenario {
  id: string;
  name: string;
  product_mix: { product: string; units_per_month: number; price: number }[];
  annual_revenue: number;
  monthly_target: number;
  feasibility: "achievable" | "stretch" | "aggressive";
}

export interface RevenueGoalData {
  annual_target: number;
  current_annual_run_rate: number;
  gap: number;
  monthly_actuals: { month: string; actual: number; target: number }[];
  scenarios: RevenueScenario[];
  capacity_ceiling: number;
}

// --- Funnel ---
export interface MicroFunnel {
  stages: MicroFunnelStage[];
  avg_days_to_convert: number;
  bottleneck: string;
}

export interface MicroFunnelStage {
  stage: string;
  entered: number;
  completed: number;
  drop_off_rate: number;
  avg_time_hours: number;
  benchmark_rate: number;
}

// --- Outcomes ---
export interface OutcomesData {
  nps_score: number;
  nps_responses: number;
  nps_breakdown: { promoters: number; passives: number; detractors: number };
  testimonials: Testimonial[];
  referrals: Referral[];
  ltv_leaderboard: LtvLeader[];
  cohort_retention: CohortRetention[];
}

export interface Testimonial {
  id: string;
  client_name: string;
  quote: string;
  rating: number;
  date: string;
  product: string;
}

export interface Referral {
  id: string;
  referrer: string;
  referred: string;
  status: "converted" | "pending" | "lost";
  revenue: number;
  date: string;
}

export interface LtvLeader {
  client_name: string;
  total_revenue: number;
  purchases: number;
  first_purchase: string;
  last_purchase: string;
  predicted_ltv: number;
}

export interface CohortRetention {
  cohort: string;
  clients: number;
  repeat_rate: number;
  avg_purchases: number;
  avg_revenue: number;
}

// --- Conversion Paths ---
export interface ConversionPath {
  id: string;
  client_name: string;
  touchpoints: Touchpoint[];
  days_to_convert: number;
  revenue: number;
}

export interface Touchpoint {
  channel: string;
  type: "first" | "middle" | "last";
  date: string;
}

export interface AttributionSummary {
  channel: string;
  first_touch: number;
  last_touch: number;
  linear: number;
  revenue_attributed: number;
}

// --- Retargeting ---
export interface RetargetingSegment {
  id: string;
  name: string;
  description: string;
  count: number;
  criteria: string;
  suggested_action: string;
  priority: "high" | "medium" | "low";
  estimated_revenue: number;
  clients: { name: string; email: string; days_inactive: number; last_status: string }[];
}

// --- Action Plans ---
export interface ActionPlan {
  id: string;
  client_name: string;
  type: "transcript" | "manual";
  status: "draft" | "sent" | "viewed" | "completed";
  created: string;
  updated: string;
  items: ActionPlanItem[];
  summary: string;
}

export interface ActionPlanItem {
  id: string;
  text: string;
  completed: boolean;
  category: string;
  priority: "high" | "medium" | "low";
}

// --- Brand Audit ---
export interface BrandAuditResult {
  overall_score: number;
  tier: "Strong" | "Developing" | "Needs Work" | "Critical";
  dimensions: BrandDimension[];
  priority_actions: string[];
  percentile: number;
}

export interface BrandDimension {
  name: string;
  score: number;
  weight: number;
  benchmark: number;
  description: string;
}
