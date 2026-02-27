/** Product-to-price mapping. Used as fallback when payment amount is missing. */
export const PRODUCT_PRICES: Record<string, number> = {
  "First Call": 499,
  "Single Call": 699,
  "3-Session Clarity Sprint": 1495,
  // Legacy aliases
  "Standard Call": 699,
  "3-Pack Sprint": 1495,
};

/** Ordered pipeline statuses from lead to completion. */
export const PIPELINE_STATUSES = [
  "Lead - Laylo",
  "Paid - Needs Booking",
  "Booked - Needs Intake",
  "Intake Complete",
  "Ready for Call",
  "Call Complete",
  "Follow-Up Sent",
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

/** All possible lead source channels. */
export const LEAD_SOURCES = [
  "IG DM",
  "IG Comment",
  "IG Story",
  "Meta Ad",
  "LinkedIn",
  "Website",
  "Referral",
  "Direct",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Industry benchmark CAC by channel (high-ticket creative consultancy). */
export const BENCHMARK_CAC: Record<string, number> = {
  "IG DM": 200,
  Referral: 100,
  "Meta Ad": 800,
  Website: 300,
  "IG Story": 250,
  LinkedIn: 350,
  "IG Comment": 200,
  Direct: 50,
};

/** Annual revenue target. */
export const ANNUAL_TARGET = 800_000;

/** Max calls per week before capacity ceiling. */
export const MAX_CALLS_PER_WEEK = 20;
