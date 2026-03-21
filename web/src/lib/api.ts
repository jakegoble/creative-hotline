const API_BASE = "/api";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// --- Types ---

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
  cac?: number;
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

// --- API Functions ---

export const api = {
  getKpis: () => fetchApi<KpiSummary>("/kpis"),
  getClients: () => fetchApi<Client[]>("/clients"),
  getScoredClients: () => fetchApi<ScoredClient[]>("/clients/scored"),
  getPipeline: () => fetchApi<PipelineStage[]>("/pipeline"),
  getMonthlyRevenue: () => fetchApi<MonthlyRevenue[]>("/revenue/monthly"),
  getChannelMetrics: () => fetchApi<ChannelMetric[]>("/channels"),
  getFunnel: () => fetchApi<FunnelStage[]>("/funnel"),
  getLtv: () => fetchApi<LtvData>("/ltv"),
  getHealth: () => fetchApi<HealthCheck[]>("/health"),
};
