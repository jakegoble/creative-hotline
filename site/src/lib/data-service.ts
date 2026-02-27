/**
 * Data service abstraction.
 * DemoDataService returns demo data synchronously (wrapped in Promises).
 * LiveDataService fetches from /api/* routes.
 */

import type {
  KpiSummary,
  Client,
  ScoredClient,
  PipelineStage,
  MonthlyRevenue,
  ChannelMetric,
  ChannelPerformance,
  FunnelStage,
  MicroFunnel,
  LtvData,
  HealthCheck,
  RevenueGoalData,
  OutcomesData,
  ConversionPath,
  AttributionSummary,
  RetargetingSegment,
  ActionPlan,
  BrandAuditResult,
} from "./types";
import { demoData } from "./demo-data";

export interface DataService {
  getKpis(): Promise<KpiSummary>;
  getClients(): Promise<Client[]>;
  getScoredClients(): Promise<ScoredClient[]>;
  getPipeline(): Promise<PipelineStage[]>;
  getMonthlyRevenue(): Promise<MonthlyRevenue[]>;
  getChannelMetrics(): Promise<ChannelMetric[]>;
  getChannelPerformance(): Promise<ChannelPerformance[]>;
  getFunnel(): Promise<FunnelStage[]>;
  getMicroFunnel(): Promise<MicroFunnel>;
  getLtv(): Promise<LtvData>;
  getHealth(): Promise<HealthCheck[]>;
  getRevenueGoals(): Promise<RevenueGoalData>;
  getOutcomes(): Promise<OutcomesData>;
  getConversionPaths(): Promise<{ paths: ConversionPath[]; attribution: AttributionSummary[] }>;
  getRetargetingSegments(): Promise<RetargetingSegment[]>;
  getActionPlans(): Promise<ActionPlan[]>;
  getBrandAudit(): Promise<BrandAuditResult>;
}

class DemoDataService implements DataService {
  async getKpis() { return demoData.getKpis(); }
  async getClients() { return demoData.getClients(); }
  async getScoredClients() { return demoData.getScoredClients(); }
  async getPipeline() { return demoData.getPipeline(); }
  async getMonthlyRevenue() { return demoData.getMonthlyRevenue(); }
  async getChannelMetrics() { return demoData.getChannelMetrics(); }
  async getChannelPerformance() { return demoData.getChannelPerformance(); }
  async getFunnel() { return demoData.getFunnel(); }
  async getMicroFunnel() { return demoData.getMicroFunnel(); }
  async getLtv() { return demoData.getLtv(); }
  async getHealth() { return demoData.getHealth(); }
  async getRevenueGoals() { return demoData.getRevenueGoals(); }
  async getOutcomes() { return demoData.getOutcomes(); }
  async getConversionPaths() { return demoData.getConversionPaths(); }
  async getRetargetingSegments() { return demoData.getRetargetingSegments(); }
  async getActionPlans() { return demoData.getActionPlans(); }
  async getBrandAudit() { return demoData.getBrandAudit(); }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

class LiveDataService implements DataService {
  async getKpis() { return fetchJson<KpiSummary>("/api/notion/clients/kpis"); }
  async getClients() { return fetchJson<Client[]>("/api/notion/clients"); }
  async getScoredClients() { return fetchJson<ScoredClient[]>("/api/ai/lead-score"); }
  async getPipeline() { return fetchJson<PipelineStage[]>("/api/notion/pipeline"); }
  async getMonthlyRevenue() { return fetchJson<MonthlyRevenue[]>("/api/stripe/revenue"); }
  async getChannelMetrics() {
    const clients = await this.getClients();
    const { computeChannelMetrics } = await import("./data-transforms");
    return computeChannelMetrics(clients);
  }
  async getChannelPerformance() { return fetchJson<ChannelPerformance[]>("/api/notion/clients/channels"); }
  async getFunnel() {
    const clients = await this.getClients();
    const { computeFunnel } = await import("./data-transforms");
    return computeFunnel(clients);
  }
  async getMicroFunnel() { return fetchJson<MicroFunnel>("/api/notion/pipeline/funnel"); }
  async getLtv() {
    const clients = await this.getClients();
    const { computeLtv } = await import("./data-transforms");
    return computeLtv(clients);
  }
  async getHealth() { return fetchJson<HealthCheck[]>("/api/health"); }
  async getRevenueGoals() { return fetchJson<RevenueGoalData>("/api/stripe/revenue/goals"); }
  async getOutcomes() { return fetchJson<OutcomesData>("/api/notion/clients/outcomes"); }
  async getConversionPaths() {
    return fetchJson<{ paths: ConversionPath[]; attribution: AttributionSummary[] }>("/api/notion/clients/paths");
  }
  async getRetargetingSegments() { return fetchJson<RetargetingSegment[]>("/api/notion/clients/retargeting"); }
  async getActionPlans() { return fetchJson<ActionPlan[]>("/api/notion/clients/action-plans"); }
  async getBrandAudit() { return fetchJson<BrandAuditResult>("/api/ai/brand-audit"); }
}

export function createDataService(mode: "demo" | "live"): DataService {
  return mode === "demo" ? new DemoDataService() : new LiveDataService();
}
