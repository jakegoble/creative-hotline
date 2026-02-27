/**
 * Intelligence Engine — the brain of the Creative Hotline Command Center.
 *
 * Calculates business health scores, generates prioritized opportunities,
 * processes intake data from the business owner, and benchmarks against
 * industry standards for high-ticket creative consultancies.
 */

import type { Client, ScoredClient, ChannelMetric, FunnelStage, LtvData } from "./types";

// ---------------------------------------------------------------------------
// Score Types
// ---------------------------------------------------------------------------

export interface DimensionScore {
  key: string;
  label: string;
  value: number;        // 0–100
  color: string;
  breakdown: string[];  // human-readable factors
  weight: number;       // percentage of composite
}

export interface HealthScore {
  composite: number;
  tier: "thriving" | "growing" | "emerging" | "critical";
  dimensions: DimensionScore[];
  trend: "up" | "flat" | "down";
  summary: string;
}

// ---------------------------------------------------------------------------
// Opportunity Types
// ---------------------------------------------------------------------------

export type Priority = "now" | "next" | "later" | "explore";
export type Category =
  | "revenue" | "pipeline" | "marketing" | "retention"
  | "product" | "brand" | "operations" | "partnerships"
  | "content" | "automation" | "pricing" | "expansion";

export interface ActivationStep {
  step: number;
  action: string;
  detail: string;
  tool?: string;
  timeEstimate?: string;
  link?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  why: string;
  priority: Priority;
  category: Category;
  effort: number;        // 1–10
  impact: number;        // 1–10
  roi: number;           // impact / effort
  timeframe: string;
  steps: ActivationStep[];
  metrics: string[];
  dataPoints: string[];
  unlocked: boolean;
  revenueImpact?: string;
}

// ---------------------------------------------------------------------------
// Intake Types — Extensive Business Questionnaire
// ---------------------------------------------------------------------------

export interface IntakeData {
  // Business Positioning
  businessVision?: string;
  targetClientProfile?: string;
  uniqueValueProp?: string;
  competitorNames?: string[];
  positioningStatement?: string;
  brandPersonality?: string;

  // Revenue & Pricing
  currentMonthlyRevenue?: number;
  revenueTarget12mo?: number;
  pricingConfidence?: number;      // 1–10
  hasRaisedPrices?: boolean;
  averageDealSize?: number;
  revenueStreams?: string[];       // "calls", "sprints", "digital", "retainers", "courses"

  // Pipeline & Sales
  averageLeadsPerWeek?: number;
  leadQualityRating?: number;      // 1–10
  biggestSalesObjection?: string;
  hasReferralProgram?: boolean;
  closingRate?: number;            // percentage
  averageDaysToClose?: number;

  // Marketing & Content
  contentFrequency?: string;
  primaryPlatforms?: string[];     // "Instagram", "LinkedIn", "TikTok", "YouTube", "Newsletter"
  contentStrengths?: string[];
  contentWeaknesses?: string[];
  hasEmailList?: boolean;
  emailListSize?: number;
  emailOpenRate?: number;
  paidAdSpend?: number;

  // Client Experience
  npsScore?: number;
  clientRetentionRate?: number;    // percentage
  avgClientLifespan?: number;     // months
  hasTestimonials?: boolean;
  testimonialCount?: number;
  hasCaseStudies?: boolean;
  postCallFollowUpTime?: number;  // hours

  // Operations & Systems
  hoursPerClient?: number;
  weeklyCapacity?: number;        // max calls
  toolStack?: string[];
  hasSOPs?: boolean;
  biggestBottleneck?: string;
  teamSize?: number;

  // Brand & Presence
  hasWebsite?: boolean;
  websiteTraffic?: number;
  socialFollowing?: Record<string, number>;
  hasPodcast?: boolean;
  hasCommunity?: boolean;
  communitySize?: number;
  speakingEngagements?: number;

  // Goals & Direction
  primaryGoal?: string;
  secondaryGoals?: string[];
  biggestFear?: string;
  dreamScenario12mo?: string;
  willingToExperiment?: number;   // 1–10

  // Timestamps
  completedAt?: string;
  lastUpdated?: string;
}

export interface IntakePrompt {
  id: string;
  section: string;
  question: string;
  hint: string;
  field: keyof IntakeData;
  type: "text" | "textarea" | "number" | "select" | "multiselect" | "slider" | "boolean" | "tags";
  options?: string[];
  required: boolean;
  dependsOn?: { field: keyof IntakeData; value: unknown };
}

// ---------------------------------------------------------------------------
// Benchmark Types
// ---------------------------------------------------------------------------

export interface Benchmark {
  metric: string;
  yourValue: number;
  emerging: number;       // <$100K/yr consultancy
  growing: number;        // $100K-$500K
  established: number;    // $500K+
  unit: string;
  higherIsBetter: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// ---------------------------------------------------------------------------
// Health Score Calculation
// ---------------------------------------------------------------------------

export function calculateHealthScore(
  clients: Client[],
  scored: ScoredClient[],
  channels: ChannelMetric[],
  funnel: FunnelStage[],
  ltv: LtvData,
  intake?: IntakeData,
): HealthScore {
  const paid = clients.filter((c) => c.amount > 0);
  const totalRevenue = paid.reduce((s, c) => s + c.amount, 0);
  const avgDeal = paid.length > 0 ? totalRevenue / paid.length : 0;
  const conversionRate = clients.length > 0 ? paid.length / clients.length : 0;
  const hotLeads = scored.filter((c) => c.tier === "Hot").length;
  const hotRatio = scored.length > 0 ? hotLeads / scored.length : 0;
  const topChannel = channels.length > 0 ? channels.reduce((a, b) => a.revenue > b.revenue ? a : b) : null;
  const channelDiversity = channels.filter((c) => c.revenue > 0).length;

  // 1. Revenue Health (25%)
  const revenueScore = Math.min(100, Math.round(
    clamp(totalRevenue / 50000, 0, 1) * 30 +
    clamp(avgDeal / 1000, 0, 1) * 25 +
    clamp(ltv.overall_ltv / 1500, 0, 1) * 25 +
    clamp(ltv.projected_12mo / 100000, 0, 1) * 20
  ));
  const revenueBreakdown = [
    `$${totalRevenue.toLocaleString()} total revenue (${revenueScore >= 60 ? "strong" : "building"})`,
    `$${avgDeal.toFixed(0)} average deal size`,
    `$${ltv.overall_ltv.toFixed(0)} lifetime value per client`,
    `$${ltv.projected_12mo.toLocaleString()} projected 12-month revenue`,
  ];

  // 2. Pipeline Health (20%)
  const funnelConversion = funnel.length >= 2 ? funnel[funnel.length - 1].count / funnel[0].count : 0;
  const pipelineScore = Math.min(100, Math.round(
    clamp(conversionRate / 0.9, 0, 1) * 30 +
    clamp(hotRatio / 0.4, 0, 1) * 25 +
    clamp(funnelConversion / 0.15, 0, 1) * 25 +
    clamp(clients.length / 30, 0, 1) * 20
  ));
  const pipelineBreakdown = [
    `${(conversionRate * 100).toFixed(0)}% lead-to-paid conversion`,
    `${hotLeads} hot leads (${(hotRatio * 100).toFixed(0)}% of pipeline)`,
    `${(funnelConversion * 100).toFixed(0)}% full funnel conversion`,
    `${clients.length} total clients in system`,
  ];

  // 3. Channel & Marketing Health (20%)
  const topChannelRevShare = topChannel && totalRevenue > 0 ? topChannel.revenue / totalRevenue : 0;
  const channelScore = Math.min(100, Math.round(
    clamp(channelDiversity / 6, 0, 1) * 30 +
    (1 - clamp(topChannelRevShare, 0, 1)) * 25 + // lower concentration = better
    clamp(channels.reduce((s, c) => s + c.conversion_rate, 0) / channels.length / 0.8, 0, 1) * 25 +
    (intake?.hasEmailList ? 20 : intake?.emailListSize ? clamp(intake.emailListSize / 1000, 0, 1) * 20 : 10)
  ));
  const channelBreakdown = [
    `${channelDiversity} active revenue channels`,
    topChannel ? `Top channel: ${topChannel.channel} (${(topChannelRevShare * 100).toFixed(0)}% of revenue)` : "No channels tracked",
    `Average channel conversion: ${(channels.reduce((s, c) => s + c.conversion_rate, 0) / Math.max(channels.length, 1) * 100).toFixed(0)}%`,
    intake?.emailListSize ? `${intake.emailListSize.toLocaleString()} email subscribers` : "Email list: unknown",
  ];

  // 4. Client Quality & Retention (20%)
  const repeatClients = Object.values(
    paid.reduce<Record<string, number>>((acc, c) => {
      acc[c.email] = (acc[c.email] ?? 0) + 1;
      return acc;
    }, {})
  ).filter((count) => count > 1).length;
  const repeatRate = paid.length > 0 ? repeatClients / new Set(paid.map((c) => c.email)).size : 0;
  const sprintClients = paid.filter((c) => c.product === "3-Session Clarity Sprint").length;
  const upsellRate = paid.length > 0 ? sprintClients / paid.length : 0;

  const retentionScore = Math.min(100, Math.round(
    clamp(repeatRate / 0.3, 0, 1) * 25 +
    clamp(upsellRate / 0.25, 0, 1) * 25 +
    clamp(avgDeal / 800, 0, 1) * 25 +
    (intake?.npsScore ? clamp(intake.npsScore / 80, 0, 1) * 25 : 15)
  ));
  const retentionBreakdown = [
    `${(repeatRate * 100).toFixed(0)}% repeat client rate`,
    `${(upsellRate * 100).toFixed(0)}% upsell to Sprint packages`,
    `$${avgDeal.toFixed(0)} avg deal (${avgDeal >= 700 ? "premium" : "room to grow"})`,
    intake?.npsScore ? `NPS: ${intake.npsScore}` : "NPS: not measured yet",
  ];

  // 5. Product & Brand Health (15%)
  const productMix = {
    first: paid.filter((c) => c.product === "First Call").length,
    single: paid.filter((c) => c.product === "Single Call").length,
    sprint: sprintClients,
  };
  const productDiversity = [productMix.first, productMix.single, productMix.sprint].filter((v) => v > 0).length;
  const brandScore = Math.min(100, Math.round(
    clamp(productDiversity / 3, 0, 1) * 25 +
    clamp(totalRevenue / 30000, 0, 1) * 20 +
    (intake?.hasWebsite ? 20 : 5) +
    (intake?.hasCaseStudies ? 20 : intake?.hasTestimonials ? 10 : 5) +
    (intake?.socialFollowing ? clamp(Object.values(intake.socialFollowing).reduce((a, b) => a + b, 0) / 10000, 0, 1) * 15 : 10)
  ));
  const brandBreakdown = [
    `${productDiversity}/3 product tiers active`,
    `Product mix: ${productMix.first} First Call, ${productMix.single} Single Call, ${productMix.sprint} Sprint`,
    intake?.hasWebsite ? "Website: active" : "Website: needs attention",
    intake?.hasTestimonials ? `${intake.testimonialCount ?? "some"} testimonials collected` : "No testimonials yet",
  ];

  // Composite (weighted)
  const composite = Math.round(
    revenueScore * 0.25 +
    pipelineScore * 0.20 +
    channelScore * 0.20 +
    retentionScore * 0.20 +
    brandScore * 0.15
  );

  const tier: HealthScore["tier"] =
    composite >= 70 ? "thriving" :
    composite >= 50 ? "growing" :
    composite >= 30 ? "emerging" : "critical";

  const trend: HealthScore["trend"] =
    totalRevenue > 5000 ? "up" : totalRevenue > 2000 ? "flat" : "down";

  const dimensions: DimensionScore[] = [
    { key: "revenue", label: "Revenue", value: revenueScore, color: "#FF6B35", breakdown: revenueBreakdown, weight: 25 },
    { key: "pipeline", label: "Pipeline", value: pipelineScore, color: "#6495ED", breakdown: pipelineBreakdown, weight: 20 },
    { key: "channels", label: "Channels", value: channelScore, color: "#2ECC71", breakdown: channelBreakdown, weight: 20 },
    { key: "retention", label: "Retention", value: retentionScore, color: "#9B59B6", breakdown: retentionBreakdown, weight: 20 },
    { key: "brand", label: "Brand", value: brandScore, color: "#F39C12", breakdown: brandBreakdown, weight: 15 },
  ];

  const summary =
    tier === "thriving" ? "Business is firing on all cylinders. Focus on scaling and protecting margins." :
    tier === "growing" ? "Strong foundation with clear growth levers. Execute the top opportunities." :
    tier === "emerging" ? "Early traction — double down on what's converting and cut what isn't." :
    "Critical areas need attention. Focus on revenue and pipeline first.";

  return { composite, tier, dimensions, trend, summary };
}

// ---------------------------------------------------------------------------
// Opportunity Generation
// ---------------------------------------------------------------------------

export function generateOpportunities(
  clients: Client[],
  scored: ScoredClient[],
  channels: ChannelMetric[],
  funnel: FunnelStage[],
  ltv: LtvData,
  health: HealthScore,
  intake?: IntakeData,
): Opportunity[] {
  const opps: Opportunity[] = [];
  const paid = clients.filter((c) => c.amount > 0);
  const totalRevenue = paid.reduce((s, c) => s + c.amount, 0);
  const avgDeal = paid.length > 0 ? totalRevenue / paid.length : 0;
  const leads = clients.filter((c) => c.status === "Lead - Laylo");
  const warmLeads = scored.filter((c) => c.tier === "Warm");
  const coldLeads = scored.filter((c) => c.tier === "Cold" || c.tier === "Cool");
  const sprintClients = paid.filter((c) => c.product === "3-Session Clarity Sprint").length;
  const upsellRate = paid.length > 0 ? sprintClients / paid.length : 0;
  const channelDiversity = channels.filter((c) => c.revenue > 0).length;
  const topChannel = channels.length > 0 ? channels.reduce((a, b) => a.revenue > b.revenue ? a : b) : null;
  const conversionRate = clients.length > 0 ? paid.length / clients.length : 0;

  // --- REVENUE OPPORTUNITIES ---

  if (upsellRate < 0.2) {
    opps.push({
      id: "rev-upsell-sprint",
      title: "Launch Sprint upsell sequence",
      description: `Only ${(upsellRate * 100).toFixed(0)}% of clients upgrade to the 3-Session Sprint ($1,495). A targeted email sequence to past First Call clients could lift this to 20%+.`,
      why: `${paid.length - sprintClients} clients purchased single calls but never upgraded. At $1,495/sprint, converting just 3 more = $4,485 additional revenue.`,
      priority: "now",
      category: "revenue",
      effort: 3,
      impact: 9,
      roi: 3,
      timeframe: "1-2 weeks",
      revenueImpact: `+$${(3 * 1495).toLocaleString()} if 3 clients upgrade`,
      steps: [
        { step: 1, action: "Segment past single-call clients", detail: "Filter Notion Payments DB for First Call and Single Call clients with status 'Follow-Up Sent'", tool: "Notion" },
        { step: 2, action: "Write 3-email upgrade sequence", detail: "Email 1: Value recap + Sprint intro. Email 2: Case study from Sprint client. Email 3: Limited-time offer.", tool: "n8n" },
        { step: 3, action: "Set up automated trigger", detail: "Add to Daily Follow-Up Engine: 14 days post-call → send Sprint pitch", tool: "n8n" },
        { step: 4, action: "Track conversions", detail: "Add 'Upsell Offered' checkbox to Payments DB", tool: "Notion" },
      ],
      metrics: ["Sprint conversion rate", "Upsell email open rate", "Revenue per client"],
      dataPoints: [`Current upsell rate: ${(upsellRate * 100).toFixed(0)}%`, `${paid.length - sprintClients} single-call clients eligible`],
      unlocked: true,
    });
  }

  if (avgDeal < 700 && intake?.pricingConfidence && intake.pricingConfidence < 7) {
    opps.push({
      id: "rev-price-increase",
      title: "Raise prices across all tiers",
      description: "Your average deal is below the premium consultancy benchmark. A 15-20% price increase won't reduce volume but significantly impacts revenue.",
      why: `Average deal: $${avgDeal.toFixed(0)} vs $910 industry benchmark for high-ticket creative consultancies. Your pricing confidence is ${intake.pricingConfidence}/10.`,
      priority: "now",
      category: "pricing",
      effort: 2,
      impact: 8,
      roi: 4,
      timeframe: "Immediate",
      revenueImpact: `+$${Math.round(totalRevenue * 0.15).toLocaleString()}/year at current volume`,
      steps: [
        { step: 1, action: "Update Stripe prices", detail: "First Call: $499→$599. Single Call: $699→$849. Sprint: $1,495→$1,795", tool: "Stripe" },
        { step: 2, action: "Update website pricing", detail: "Change all pricing references on Webflow", tool: "Webflow" },
        { step: 3, action: "Grandfather existing clients", detail: "Email current clients about old pricing honor window", tool: "n8n" },
        { step: 4, action: "A/B test with new leads", detail: "Track conversion rate at new prices for 30 days", tool: "Stripe" },
      ],
      metrics: ["Conversion rate at new price", "Revenue per client", "Monthly revenue"],
      dataPoints: [`Current avg deal: $${avgDeal.toFixed(0)}`, `Pricing confidence: ${intake.pricingConfidence}/10`],
      unlocked: true,
    });
  }

  // --- PIPELINE OPPORTUNITIES ---

  if (leads.length > 2) {
    opps.push({
      id: "pipe-nurture-leads",
      title: "Activate stale leads with a nurture sequence",
      description: `${leads.length} leads signed up via Laylo but never paid. A 5-email nurture sequence with social proof and a time-sensitive offer could convert 20-30%.`,
      why: `${leads.length} leads are sitting idle. At 25% conversion and $499 avg, that's $${Math.round(leads.length * 0.25 * 499).toLocaleString()} in pipeline.`,
      priority: "now",
      category: "pipeline",
      effort: 4,
      impact: 8,
      roi: 2,
      timeframe: "2-3 weeks",
      revenueImpact: `+$${Math.round(leads.length * 0.25 * 499).toLocaleString()} potential`,
      steps: [
        { step: 1, action: "Write 5-email nurture sequence", detail: "Day 1: Welcome + value. Day 3: Testimonial. Day 5: Behind the scenes. Day 7: Objection handling. Day 10: Final offer.", tool: "n8n" },
        { step: 2, action: "Segment by lead source", detail: "IG DM leads get different copy than Website leads", tool: "Notion" },
        { step: 3, action: "Set up automated drip", detail: "Trigger on Lead - Laylo status, 3-day delay between emails", tool: "n8n" },
        { step: 4, action: "Add urgency element", detail: "Limited spots this month / price increase announcement", tool: "n8n" },
      ],
      metrics: ["Nurture-to-paid conversion", "Email open rate", "Click rate", "Time to convert"],
      dataPoints: [`${leads.length} Laylo leads unconverted`, `Current conversion rate: ${(conversionRate * 100).toFixed(0)}%`],
      unlocked: true,
    });
  }

  if (warmLeads.length > 3) {
    opps.push({
      id: "pipe-warm-activation",
      title: "Fast-track warm leads with personal outreach",
      description: `${warmLeads.length} leads scored as "Warm" — high enough interest to convert with a personal touch. A quick DM or personalized video message could close 30%+.`,
      why: `Warm leads have 40-69 ICP score — they fit your profile but need a nudge. Personal outreach converts 3x better than email alone.`,
      priority: "now",
      category: "pipeline",
      effort: 2,
      impact: 7,
      roi: 3.5,
      timeframe: "This week",
      steps: [
        { step: 1, action: "Review warm lead profiles", detail: "Check their IG, website, and intake data for personalization hooks", tool: "Notion" },
        { step: 2, action: "Send personalized DM or Loom", detail: "60-second video: 'Hey [name], saw your work on [specific thing]. Here's one quick win I'd share on our call...'", tool: "Instagram / Loom" },
        { step: 3, action: "Follow up in 48hrs", detail: "If no response, send a lighter follow-up", tool: "ManyChat" },
      ],
      metrics: ["Warm-to-paid conversion", "Response rate", "Time to close"],
      dataPoints: [`${warmLeads.length} warm leads`, `Avg warm score: ${Math.round(warmLeads.reduce((s, c) => s + c.score, 0) / warmLeads.length)}`],
      unlocked: true,
    });
  }

  // --- MARKETING OPPORTUNITIES ---

  if (channelDiversity < 5) {
    opps.push({
      id: "mkt-channel-expand",
      title: "Diversify acquisition channels",
      description: `Revenue comes from only ${channelDiversity} channels. If ${topChannel?.channel} dried up tomorrow, you'd lose ${topChannel ? `$${topChannel.revenue.toLocaleString()}` : "a major chunk"} in revenue.`,
      why: "Channel concentration is a business risk. Consultancies with 5+ active channels grow 2.3x faster.",
      priority: "next",
      category: "marketing",
      effort: 5,
      impact: 7,
      roi: 1.4,
      timeframe: "1-2 months",
      steps: [
        { step: 1, action: "Audit untapped channels", detail: "LinkedIn (organic posts), YouTube (value content), Newsletter (email list), Podcast guesting, Strategic partnerships", tool: "Notion" },
        { step: 2, action: "Pick 2 new channels to test", detail: "30-day sprint per channel: 3 posts/week, track leads generated", tool: "Any" },
        { step: 3, action: "Set up attribution tracking", detail: "Add UTM parameters and track lead source in Payments DB", tool: "Notion" },
        { step: 4, action: "Double down on winners", detail: "After 30 days, cut the loser channel and scale the winner", tool: "Any" },
      ],
      metrics: ["Leads per channel", "CAC per channel", "Revenue per channel"],
      dataPoints: [`${channelDiversity} active channels`, topChannel ? `${topChannel.channel} dominates at ${((topChannel.revenue / totalRevenue) * 100).toFixed(0)}%` : ""],
      unlocked: true,
    });
  }

  if (!intake?.hasEmailList || (intake.emailListSize && intake.emailListSize < 200)) {
    opps.push({
      id: "mkt-email-list",
      title: "Build an email list from existing traffic",
      description: "Email is the highest-ROI marketing channel ($36 return per $1 spent). Every DM, website visitor, and social follower is a potential subscriber.",
      why: `${intake?.emailListSize ? intake.emailListSize + " subscribers" : "No email list"} — you're leaving money on the table. A 500-person list at 2% conversion = 10 clients/year = $5,000+ revenue.`,
      priority: "next",
      category: "marketing",
      effort: 3,
      impact: 8,
      roi: 2.7,
      timeframe: "2-4 weeks to launch, ongoing",
      steps: [
        { step: 1, action: "Create a lead magnet", detail: "'5 Creative Direction Mistakes Killing Your Brand' — PDF or short video series", tool: "Canva / Loom" },
        { step: 2, action: "Set up ConvertKit or Beehiiv", detail: "Free tier, landing page, 5-email welcome sequence", tool: "ConvertKit" },
        { step: 3, action: "Add opt-in to all touchpoints", detail: "IG bio link, website popup, Tally form, post-call email", tool: "Webflow / Tally" },
        { step: 4, action: "Weekly newsletter", detail: "1 insight + 1 recommendation + 1 CTA. 15 minutes to write.", tool: "ConvertKit" },
      ],
      metrics: ["Subscriber count", "Open rate", "Click rate", "Email-to-client conversion"],
      dataPoints: [intake?.emailListSize ? `Current list: ${intake.emailListSize}` : "No email list yet"],
      unlocked: true,
    });
  }

  // --- RETENTION & CLIENT QUALITY ---

  opps.push({
    id: "ret-referral-program",
    title: "Launch a structured referral program",
    description: "Referrals have the highest conversion rate and lowest CAC of any channel. Formalize what's already happening organically.",
    why: `Referrals convert at ${channels.find((c) => c.channel === "Referral")?.conversion_rate ? (channels.find((c) => c.channel === "Referral")!.conversion_rate * 100).toFixed(0) + "%" : "100%"} — your best channel. But there's no system to encourage or reward them.`,
    priority: "next",
    category: "retention",
    effort: 3,
    impact: 7,
    roi: 2.3,
    timeframe: "1-2 weeks",
    steps: [
      { step: 1, action: "Design reward structure", detail: "$100 credit or 15% commission per referred client. Both parties benefit.", tool: "Stripe" },
      { step: 2, action: "Create referral landing page", detail: "Unique link per client, auto-track attribution", tool: "Webflow" },
      { step: 3, action: "Add to post-call flow", detail: "Day 3 after call: 'Know someone who needs creative direction? Share your link.'", tool: "n8n" },
      { step: 4, action: "Track and celebrate", detail: "Monthly shoutout to top referrers. Add to Notion Payments DB.", tool: "Notion" },
    ],
    metrics: ["Referrals per month", "Referral conversion rate", "Revenue from referrals", "CAC vs other channels"],
    dataPoints: [`Current referral revenue: $${channels.find((c) => c.channel === "Referral")?.revenue.toLocaleString() ?? "0"}`],
    unlocked: true,
  });

  // --- PRODUCT & EXPANSION ---

  if (totalRevenue > 3000) {
    opps.push({
      id: "prod-digital-product",
      title: "Create a $99-$299 digital product",
      description: "A self-serve product (audit, template kit, mini-course) captures clients who can't afford $499+ and builds a pipeline for future upsells.",
      why: "Revenue ceiling: 20 calls/week max = ~$527K annual. Digital products break the time-for-money trap with zero marginal cost.",
      priority: "later",
      category: "product",
      effort: 7,
      impact: 9,
      roi: 1.3,
      timeframe: "4-8 weeks",
      revenueImpact: "+$50K-$100K/year at scale",
      steps: [
        { step: 1, action: "Pick the product", detail: "AI Brand Audit ($299), Creative Direction Template Kit ($99), or Mini-Course ($199)", tool: "Any" },
        { step: 2, action: "Build MVP version", detail: "Start with a Notion template + Loom walkthrough. Don't over-engineer.", tool: "Notion / Loom" },
        { step: 3, action: "Create Stripe product + landing page", detail: "Payment link + Webflow page + auto-delivery via n8n", tool: "Stripe / Webflow / n8n" },
        { step: 4, action: "Promote to existing audience", detail: "Email list + IG + post-call offer for clients who don't book Sprint", tool: "All" },
      ],
      metrics: ["Units sold", "Revenue", "Upsell-to-call rate", "Customer acquisition cost"],
      dataPoints: [`Current max capacity: ~20 calls/week`, `Avg call revenue: $${avgDeal.toFixed(0)}`],
      unlocked: true,
    });
  }

  // --- OPERATIONS ---

  if (!intake?.hasSOPs) {
    opps.push({
      id: "ops-sop-docs",
      title: "Document your top 5 SOPs",
      description: "Without SOPs, you can't delegate, scale, or maintain quality. Start with the 5 processes you repeat most.",
      why: "Every hour spent documenting saves 10 hours over the next year. SOPs are the foundation of a scalable consultancy.",
      priority: "later",
      category: "operations",
      effort: 4,
      impact: 6,
      roi: 1.5,
      timeframe: "2-3 weeks",
      steps: [
        { step: 1, action: "List your top 5 repeating processes", detail: "Client onboarding, pre-call prep, call structure, action plan delivery, follow-up sequence", tool: "Notion" },
        { step: 2, action: "Record yourself doing each one", detail: "Screen record with Loom. Talk through your thinking. 5-10 min per SOP.", tool: "Loom" },
        { step: 3, action: "Write the steps in Notion", detail: "Template each SOP with trigger, steps, tools, and completion checklist", tool: "Notion" },
        { step: 4, action: "Test with a team member", detail: "Have Megha run through one SOP and note gaps", tool: "Notion" },
      ],
      metrics: ["SOPs documented", "Time saved per week", "Error rate reduction"],
      dataPoints: ["No SOPs documented"],
      unlocked: intake !== undefined,
    });
  }

  // --- CONTENT & BRAND ---

  if (intake?.contentFrequency === "rarely" || !intake?.contentFrequency) {
    opps.push({
      id: "content-consistency",
      title: "Post 3x/week on your primary platform",
      description: "Consistency beats virality. Three posts per week for 90 days will grow your audience more than sporadic posting for a year.",
      why: "Creative consultancies that post 3+ times/week generate 4.5x more leads than those posting weekly or less.",
      priority: "next",
      category: "content",
      effort: 4,
      impact: 7,
      roi: 1.75,
      timeframe: "Ongoing (start this week)",
      steps: [
        { step: 1, action: "Pick your pillar topics", detail: "3 content pillars: Behind the scenes, Client wins/transformations, Hot takes on creative industry", tool: "Notion" },
        { step: 2, action: "Batch create weekly", detail: "Dedicate 2 hours on Monday to create all 3 posts for the week", tool: "Canva" },
        { step: 3, action: "Schedule in advance", detail: "Use Later or Meta Business Suite to auto-publish", tool: "Later / Meta" },
        { step: 4, action: "Engage 15 min/day", detail: "Reply to comments, engage with ideal client accounts", tool: "Instagram" },
      ],
      metrics: ["Post frequency", "Follower growth rate", "Engagement rate", "DMs from content"],
      dataPoints: [intake?.contentFrequency ? `Current frequency: ${intake.contentFrequency}` : "Posting frequency unknown"],
      unlocked: true,
    });
  }

  // --- AUTOMATION ---

  opps.push({
    id: "auto-follow-up",
    title: "Automate the post-call follow-up sequence",
    description: "Every client should receive a structured follow-up within 24 hours. Automate it so it never slips.",
    why: "48% of consultancies never follow up after a call. Automated follow-up increases repeat booking by 35%.",
    priority: conversionRate < 0.7 ? "now" : "next",
    category: "automation",
    effort: 3,
    impact: 7,
    roi: 2.3,
    timeframe: "1 week",
    steps: [
      { step: 1, action: "Map the ideal post-call timeline", detail: "Hour 0: Thank you email. Day 1: Action plan delivery. Day 3: Check-in. Day 7: Testimonial ask. Day 14: Sprint offer.", tool: "Notion" },
      { step: 2, action: "Build in n8n", detail: "Trigger: Call Complete status change → 5-step email sequence with delays", tool: "n8n" },
      { step: 3, action: "Write Frankie-voiced emails", detail: "Warm, personal, specific to what was discussed (use intake data)", tool: "Claude AI" },
      { step: 4, action: "Add tracking checkboxes", detail: "Thank You Sent, Action Plan Sent, Testimonial Asked in Payments DB", tool: "Notion" },
    ],
    metrics: ["Follow-up delivery rate", "Reply rate", "Testimonial capture rate", "Repeat booking rate"],
    dataPoints: [`${paid.filter((c) => c.status === "Call Complete").length} clients at Call Complete`, `${paid.filter((c) => c.status === "Follow-Up Sent").length} with follow-up sent`],
    unlocked: true,
  });

  // Sort by ROI (impact/effort) descending
  return opps.sort((a, b) => b.roi - a.roi);
}

// ---------------------------------------------------------------------------
// Intake Prompts — The Questions That Feed The Brain
// ---------------------------------------------------------------------------

export const INTAKE_PROMPTS: IntakePrompt[] = [
  // Section 1: Business Positioning
  { id: "biz-vision", section: "Business Positioning", question: "What's your vision for this business in 3 years?", hint: "Think big — revenue, impact, lifestyle, team size", field: "businessVision", type: "textarea", required: true },
  { id: "biz-target", section: "Business Positioning", question: "Describe your dream client in detail", hint: "Industry, company size, role, budget, pain point, personality", field: "targetClientProfile", type: "textarea", required: true },
  { id: "biz-uvp", section: "Business Positioning", question: "What makes you different from other creative consultants?", hint: "Your unfair advantage — experience, methodology, perspective", field: "uniqueValueProp", type: "textarea", required: true },
  { id: "biz-competitors", section: "Business Positioning", question: "Who are your top 3 competitors or alternatives?", hint: "Other consultants, agencies, DIY options your clients consider", field: "competitorNames", type: "tags", required: false },
  { id: "biz-positioning", section: "Business Positioning", question: "If a friend described your business in one sentence, what would they say?", hint: "Not your elevator pitch — how people actually talk about you", field: "positioningStatement", type: "text", required: false },
  { id: "biz-personality", section: "Business Positioning", question: "Pick 3 words that describe your brand personality", hint: "e.g., bold, warm, no-nonsense, playful, premium, rebellious", field: "brandPersonality", type: "text", required: false },

  // Section 2: Revenue & Pricing
  { id: "rev-current", section: "Revenue & Pricing", question: "What's your current monthly revenue?", hint: "Approximate is fine. All sources combined.", field: "currentMonthlyRevenue", type: "number", required: true },
  { id: "rev-target", section: "Revenue & Pricing", question: "What's your 12-month revenue target?", hint: "Be ambitious but grounded in reality", field: "revenueTarget12mo", type: "number", required: true },
  { id: "rev-confidence", section: "Revenue & Pricing", question: "How confident are you in your pricing? (1-10)", hint: "1 = I'm undercharging. 10 = I'm priced perfectly for my market.", field: "pricingConfidence", type: "slider", required: false },
  { id: "rev-raised", section: "Revenue & Pricing", question: "Have you raised prices in the last 12 months?", hint: "", field: "hasRaisedPrices", type: "boolean", required: false },
  { id: "rev-streams", section: "Revenue & Pricing", question: "What are your current revenue streams?", hint: "Select all that apply", field: "revenueStreams", type: "multiselect", options: ["1:1 Calls", "Multi-session packages", "Digital products", "Retainers", "Courses", "Speaking", "Workshops", "Affiliate/referral"], required: false },

  // Section 3: Pipeline & Sales
  { id: "pipe-leads", section: "Pipeline & Sales", question: "How many new leads do you get per week?", hint: "DMs, inquiries, form submissions, referrals combined", field: "averageLeadsPerWeek", type: "number", required: false },
  { id: "pipe-quality", section: "Pipeline & Sales", question: "Rate your lead quality (1-10)", hint: "1 = tire kickers. 10 = ready to buy.", field: "leadQualityRating", type: "slider", required: false },
  { id: "pipe-objection", section: "Pipeline & Sales", question: "What's the #1 objection you hear from potential clients?", hint: "Price? Timing? Not sure they need it? Already tried something similar?", field: "biggestSalesObjection", type: "text", required: false },
  { id: "pipe-referral", section: "Pipeline & Sales", question: "Do you have a formal referral program?", hint: "Not just hoping for referrals — a structured system with incentives", field: "hasReferralProgram", type: "boolean", required: false },
  { id: "pipe-close", section: "Pipeline & Sales", question: "What's your approximate close rate?", hint: "Out of 10 qualified leads, how many become clients?", field: "closingRate", type: "number", required: false },

  // Section 4: Marketing & Content
  { id: "mkt-frequency", section: "Marketing & Content", question: "How often do you post content?", hint: "", field: "contentFrequency", type: "select", options: ["Daily", "3-5x/week", "1-2x/week", "A few times/month", "Rarely"], required: false },
  { id: "mkt-platforms", section: "Marketing & Content", question: "Which platforms do you actively use?", hint: "Where you create and share content, not just lurk", field: "primaryPlatforms", type: "multiselect", options: ["Instagram", "LinkedIn", "TikTok", "YouTube", "Twitter/X", "Newsletter", "Blog", "Podcast"], required: false },
  { id: "mkt-email", section: "Marketing & Content", question: "Do you have an email list?", hint: "", field: "hasEmailList", type: "boolean", required: false },
  { id: "mkt-email-size", section: "Marketing & Content", question: "How many email subscribers?", hint: "", field: "emailListSize", type: "number", required: false, dependsOn: { field: "hasEmailList", value: true } },
  { id: "mkt-ad-spend", section: "Marketing & Content", question: "Monthly paid ad spend ($)?", hint: "0 if you don't run ads", field: "paidAdSpend", type: "number", required: false },

  // Section 5: Client Experience
  { id: "cx-nps", section: "Client Experience", question: "If you asked clients to rate you 1-100, what would the average be?", hint: "Your gut estimate of client satisfaction", field: "npsScore", type: "number", required: false },
  { id: "cx-testimonials", section: "Client Experience", question: "Do you have client testimonials?", hint: "", field: "hasTestimonials", type: "boolean", required: false },
  { id: "cx-count", section: "Client Experience", question: "How many testimonials have you collected?", hint: "", field: "testimonialCount", type: "number", required: false, dependsOn: { field: "hasTestimonials", value: true } },
  { id: "cx-case-studies", section: "Client Experience", question: "Do you have written case studies?", hint: "Before/after stories showing measurable client results", field: "hasCaseStudies", type: "boolean", required: false },
  { id: "cx-followup", section: "Client Experience", question: "How quickly do you deliver the action plan after a call?", hint: "In hours", field: "postCallFollowUpTime", type: "number", required: false },

  // Section 6: Operations
  { id: "ops-hours", section: "Operations", question: "Hours spent per client (total)?", hint: "From intake to final deliverable", field: "hoursPerClient", type: "number", required: false },
  { id: "ops-capacity", section: "Operations", question: "Max calls you can do per week?", hint: "Without sacrificing quality", field: "weeklyCapacity", type: "number", required: false },
  { id: "ops-sops", section: "Operations", question: "Do you have documented SOPs?", hint: "Written processes someone else could follow", field: "hasSOPs", type: "boolean", required: false },
  { id: "ops-bottleneck", section: "Operations", question: "What's your biggest operational bottleneck?", hint: "The thing that slows you down the most", field: "biggestBottleneck", type: "text", required: false },
  { id: "ops-team", section: "Operations", question: "Team size (including you)?", hint: "", field: "teamSize", type: "number", required: false },

  // Section 7: Brand & Presence
  { id: "brand-website", section: "Brand & Presence", question: "Do you have a website?", hint: "", field: "hasWebsite", type: "boolean", required: false },
  { id: "brand-podcast", section: "Brand & Presence", question: "Do you have a podcast?", hint: "", field: "hasPodcast", type: "boolean", required: false },
  { id: "brand-community", section: "Brand & Presence", question: "Do you run a community (Discord, Slack, paid group)?", hint: "", field: "hasCommunity", type: "boolean", required: false },
  { id: "brand-speaking", section: "Brand & Presence", question: "Speaking engagements in the last year?", hint: "Webinars, panels, conferences, podcasts as guest", field: "speakingEngagements", type: "number", required: false },

  // Section 8: Goals & Mindset
  { id: "goal-primary", section: "Goals & Direction", question: "What's your #1 priority right now?", hint: "", field: "primaryGoal", type: "select", options: ["Grow revenue", "Get more clients", "Raise prices", "Build a team", "Launch a product", "Improve systems", "Build brand awareness", "Work-life balance"], required: true },
  { id: "goal-dream", section: "Goals & Direction", question: "Describe your dream scenario 12 months from now", hint: "Revenue, clients, lifestyle, reputation — paint the picture", field: "dreamScenario12mo", type: "textarea", required: false },
  { id: "goal-fear", section: "Goals & Direction", question: "What's your biggest business fear?", hint: "The thing that keeps you up at night", field: "biggestFear", type: "text", required: false },
  { id: "goal-experiment", section: "Goals & Direction", question: "How willing are you to experiment? (1-10)", hint: "1 = play it safe. 10 = try anything.", field: "willingToExperiment", type: "slider", required: false },
];

// ---------------------------------------------------------------------------
// Data-Driven Multi-Choice Prompts
// ---------------------------------------------------------------------------

export interface DecisionPrompt {
  id: string;
  section: string;
  question: string;
  context: string; // why this question matters, powered by data
  choices: DecisionChoice[];
  allowMultiple: boolean;
  dataSource: string; // which data informed this prompt
  impact: string; // what answering unlocks
}

export interface DecisionChoice {
  id: string;
  label: string;
  description: string;
  recommended?: boolean;
  dataReason?: string; // why this is recommended based on data
}

export function generateDecisionPrompts(
  clients: Client[],
  scored: ScoredClient[],
  channels: ChannelMetric[],
  funnel: FunnelStage[],
  ltv: LtvData,
  intake?: IntakeData,
): DecisionPrompt[] {
  const prompts: DecisionPrompt[] = [];
  const paid = clients.filter((c) => c.amount > 0);
  const totalRevenue = paid.reduce((s, c) => s + c.amount, 0);
  const avgDeal = paid.length > 0 ? totalRevenue / paid.length : 0;
  const leads = clients.filter((c) => c.status === "Lead - Laylo");
  const topChannel = channels.length > 0 ? channels.reduce((a, b) => a.revenue > b.revenue ? a : b) : null;
  const channelDiversity = channels.filter((c) => c.revenue > 0).length;
  const sprintPct = paid.length > 0 ? paid.filter((c) => c.product === "3-Session Clarity Sprint").length / paid.length : 0;
  const referralChannel = channels.find((c) => c.channel === "Referral");

  // 1. Revenue growth strategy
  prompts.push({
    id: "dp-revenue-strategy",
    section: "Revenue Strategy",
    question: "Which revenue growth lever should you pull first?",
    context: `Your run rate is $${(totalRevenue * 2.4).toLocaleString()}/yr. Average deal: $${avgDeal.toFixed(0)}. Sprint upsell rate: ${(sprintPct * 100).toFixed(0)}%.`,
    choices: [
      { id: "raise-prices", label: "Raise prices 15-20%", description: "Increase First Call to $599, Single Call to $849", recommended: avgDeal < 700, dataReason: avgDeal < 700 ? `Avg deal $${avgDeal.toFixed(0)} is below $700 benchmark` : undefined },
      { id: "upsell-sprint", label: "Push Sprint packages harder", description: "Target past single-call clients with upgrade sequence", recommended: sprintPct < 0.2, dataReason: sprintPct < 0.2 ? `Only ${(sprintPct * 100).toFixed(0)}% upgrade to Sprint vs 20% target` : undefined },
      { id: "new-product", label: "Launch a digital product ($99-$299)", description: "AI Brand Audit, template kit, or mini-course", recommended: totalRevenue > 5000, dataReason: "Breaks the time-for-money ceiling — zero marginal cost per sale" },
      { id: "volume", label: "Increase lead volume", description: "More leads at current conversion rate", dataReason: `${leads.length} unconverted leads suggest room for volume play` },
      { id: "vip-day", label: "Add VIP Day ($2,995)", description: "Full-day intensive for premium clients", dataReason: "Captures high-intent clients willing to pay for speed" },
    ],
    allowMultiple: true,
    dataSource: "Revenue data + pipeline analysis",
    impact: "Unlocks customized revenue scenario modeling and priority sequencing",
  });

  // 2. Channel investment
  prompts.push({
    id: "dp-channel-focus",
    section: "Channel Strategy",
    question: "Where should you invest your next marketing dollar?",
    context: `${channelDiversity} active channels. ${topChannel ? `${topChannel.channel} leads at $${topChannel.revenue.toLocaleString()} revenue.` : ""} ${referralChannel ? `Referrals convert at ${(referralChannel.conversion_rate * 100).toFixed(0)}%.` : ""}`,
    choices: channels.map((ch) => ({
      id: `ch-${ch.channel.toLowerCase().replace(/\s/g, "-")}`,
      label: ch.channel,
      description: `${ch.leads} leads, ${(ch.conversion_rate * 100).toFixed(0)}% conv, $${ch.revenue.toLocaleString()} rev`,
      recommended: ch.conversion_rate >= 0.75 && ch.revenue > 0,
      dataReason: ch.conversion_rate >= 0.75 ? `${(ch.conversion_rate * 100).toFixed(0)}% conversion rate — scale what's working` : undefined,
    })).concat([
      { id: "ch-new-linkedin", label: "LinkedIn (new)", description: "Organic thought leadership — high-ticket B2B channel", recommended: false, dataReason: "Creative consultancies see 3x avg deal size from LinkedIn leads" },
      { id: "ch-new-podcast", label: "Podcast guesting (new)", description: "Guest appearances on creative/business podcasts", recommended: false, dataReason: "Zero cost, builds authority, 30-day lead lag" },
    ]),
    allowMultiple: true,
    dataSource: "Channel performance metrics",
    impact: "Drives budget allocation and content calendar priorities",
  });

  // 3. Client experience focus
  const stuckInPipeline = clients.filter((c) => ["Paid - Needs Booking", "Booked - Needs Intake"].includes(c.status));
  prompts.push({
    id: "dp-cx-priority",
    section: "Client Experience",
    question: "What client experience issue should you fix first?",
    context: `${stuckInPipeline.length} clients stuck in pipeline. ${paid.filter((c) => c.status === "Follow-Up Sent").length} awaiting re-engagement.`,
    choices: [
      { id: "cx-speed", label: "Faster action plan delivery", description: "Deliver within 12 hours instead of 24", recommended: true, dataReason: "Speed-to-value is the #1 driver of NPS in consultancy" },
      { id: "cx-onboarding", label: "Improve pre-call experience", description: "Welcome video, clear expectations, prep material", recommended: stuckInPipeline.length > 2, dataReason: `${stuckInPipeline.length} clients stuck between payment and call` },
      { id: "cx-follow-up", label: "Structured post-call sequence", description: "5-touch automated follow-up over 14 days", dataReason: "48% of consultancies never follow up — you can stand out" },
      { id: "cx-testimonials", label: "Systematize testimonial collection", description: "Auto-ask day 7 after call with template", dataReason: "Social proof is the highest-leverage marketing asset" },
      { id: "cx-community", label: "Build a client community", description: "Private Slack/Discord for past clients", dataReason: "Communities increase LTV by 2.4x through peer accountability" },
    ],
    allowMultiple: true,
    dataSource: "Pipeline + client status analysis",
    impact: "Improves NPS, repeat rate, and referral volume",
  });

  // 4. Content direction
  prompts.push({
    id: "dp-content-direction",
    section: "Content Strategy",
    question: "What content format should you double down on?",
    context: `Your audience discovers you through ${topChannel?.channel ?? "social media"}. ${intake?.primaryPlatforms?.length ? `Active on ${intake.primaryPlatforms.join(", ")}.` : "Platform usage unknown."}`,
    choices: [
      { id: "ct-carousel", label: "Instagram carousels", description: "Educational slides — highest save/share rate", recommended: true, dataReason: "IG DM is your top lead source — carousels feed the DM pipeline" },
      { id: "ct-reels", label: "Short-form video (Reels/TikTok)", description: "15-60 sec talking head or process content", dataReason: "Short video has 2.5x reach vs static posts" },
      { id: "ct-newsletter", label: "Weekly email newsletter", description: "1 insight + 1 recommendation + 1 CTA", dataReason: "Email converts at 6x social — highest ROI content channel" },
      { id: "ct-linkedin", label: "LinkedIn long-form posts", description: "Thought leadership — attracts high-ticket clients", dataReason: "LinkedIn avg deal size: $1,200 vs $499 for IG" },
      { id: "ct-podcast", label: "Start a podcast", description: "Weekly 15-min episodes — your methodology, client stories", dataReason: "Podcasters report 87% audience trust vs 45% for social" },
      { id: "ct-case-studies", label: "Client case studies", description: "Before/after stories with specific metrics", dataReason: "Case studies convert 4x better than testimonials alone" },
    ],
    allowMultiple: true,
    dataSource: "Channel + lead source analysis",
    impact: "Sets your content calendar and platform priorities",
  });

  // 5. Pricing model
  prompts.push({
    id: "dp-pricing-model",
    section: "Pricing Strategy",
    question: "Which pricing move would have the biggest impact?",
    context: `Current products: First Call ($499), Single Call ($699), Sprint ($1,495). Avg deal: $${avgDeal.toFixed(0)}.`,
    choices: [
      { id: "px-raise-all", label: "Raise all prices 15-20%", description: "First Call $599, Single Call $849, Sprint $1,795", recommended: avgDeal < 700, dataReason: avgDeal < 700 ? "Below premium benchmark — market can absorb a raise" : undefined },
      { id: "px-add-vip", label: "Add VIP Day at $2,995", description: "Full-day intensive with same-day deliverable", recommended: sprintPct > 0.1, dataReason: sprintPct > 0.1 ? "Sprint buyers are willing to pay premium — give them the option" : undefined },
      { id: "px-anchor", label: "Add a $5K retainer as price anchor", description: "Makes Sprint look affordable by comparison", dataReason: "Price anchoring increases mid-tier purchases by 40%" },
      { id: "px-entry", label: "Add $99-$199 entry product", description: "Low-risk way for cold leads to experience your value", dataReason: `${leads.length} leads haven't purchased — a $99 entry reduces risk` },
      { id: "px-annual", label: "Offer annual packages", description: "12 calls/year at a discount — guarantees revenue", dataReason: "Recurring revenue increases business valuation 3-5x" },
    ],
    allowMultiple: true,
    dataSource: "Revenue + product mix + pricing analysis",
    impact: "Directly affects average deal size and revenue ceiling",
  });

  // 6. Automation priorities
  prompts.push({
    id: "dp-automation",
    section: "Automation & Systems",
    question: "Which automation would save you the most time?",
    context: "5 n8n workflows active. Manual processes still exist in post-call follow-up and lead nurture.",
    choices: [
      { id: "au-nurture", label: "Lead nurture email sequence", description: "Auto-send 5 emails over 10 days to new Laylo leads", recommended: leads.length > 2, dataReason: `${leads.length} Laylo leads getting zero follow-up` },
      { id: "au-post-call", label: "Post-call follow-up automation", description: "Thank you → Action plan → Check-in → Testimonial ask → Upsell", recommended: true, dataReason: "Most impactful touch-points are currently manual" },
      { id: "au-intake-analysis", label: "AI-powered intake analysis", description: "Claude auto-analyzes intake form, generates pre-call brief", dataReason: "Already built (WF3) but could be more sophisticated" },
      { id: "au-testimonial", label: "Auto-testimonial collection", description: "Day 7 after call: automated ask with template + one-click submit", dataReason: "Social proof compounds — automate collection to never miss" },
      { id: "au-reporting", label: "Weekly dashboard email", description: "Auto-generate and send weekly KPI summary to team", dataReason: "Saves 30 min/week of manual number-pulling" },
      { id: "au-booking-reminder", label: "Smart booking reminders", description: "If paid > 48hrs ago and no booking, auto-remind with urgency", dataReason: `${stuckInPipeline.length} clients stuck between payment and booking` },
    ],
    allowMultiple: true,
    dataSource: "Workflow status + pipeline bottleneck analysis",
    impact: "Reduces manual work, improves consistency, recovers lost revenue",
  });

  // 7. Brand development
  prompts.push({
    id: "dp-brand-growth",
    section: "Brand Building",
    question: "How should you invest in brand development?",
    context: "Creative Hotline brand is early-stage. Frankie persona is defined but not fully deployed across all touchpoints.",
    choices: [
      { id: "br-case-studies", label: "Build 3 detailed case studies", description: "Before/after with specific metrics and client quotes", recommended: true, dataReason: "Zero published case studies — highest-leverage brand asset you're missing" },
      { id: "br-methodology", label: "Name your methodology", description: "Create a proprietary framework name (e.g., 'The Clarity Method')", dataReason: "Named methods increase perceived value by 40% and make referrals easier" },
      { id: "br-speaking", label: "Get on 5 podcasts", description: "Apply to creative/business podcasts as a guest", dataReason: "Free reach + authority building + backlinks" },
      { id: "br-partnerships", label: "Form strategic partnerships", description: "Partner with complementary services (web designers, copywriters)", dataReason: "Cross-referrals are the lowest-cost lead channel" },
      { id: "br-thought-leadership", label: "Publish original research", description: "Survey 100 creatives and publish findings", dataReason: "Original data gets press, backlinks, and positions you as authority" },
    ],
    allowMultiple: true,
    dataSource: "Brand audit + competitive analysis",
    impact: "Builds long-term brand equity and reduces dependency on paid acquisition",
  });

  return prompts;
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

export function getBenchmarks(
  clients: Client[],
  channels: ChannelMetric[],
  ltv: LtvData,
  intake?: IntakeData,
): Benchmark[] {
  const paid = clients.filter((c) => c.amount > 0);
  const totalRevenue = paid.reduce((s, c) => s + c.amount, 0);
  const avgDeal = paid.length > 0 ? totalRevenue / paid.length : 0;
  const convRate = clients.length > 0 ? (paid.length / clients.length) * 100 : 0;
  const channelCount = channels.filter((c) => c.revenue > 0).length;

  return [
    { metric: "Monthly Revenue", yourValue: totalRevenue / 3, emerging: 3000, growing: 15000, established: 50000, unit: "$", higherIsBetter: true },
    { metric: "Avg Deal Size", yourValue: avgDeal, emerging: 300, growing: 700, established: 1500, unit: "$", higherIsBetter: true },
    { metric: "Client LTV", yourValue: ltv.overall_ltv, emerging: 400, growing: 910, established: 2500, unit: "$", higherIsBetter: true },
    { metric: "Conversion Rate", yourValue: convRate, emerging: 15, growing: 25, established: 40, unit: "%", higherIsBetter: true },
    { metric: "Active Channels", yourValue: channelCount, emerging: 2, growing: 4, established: 7, unit: "", higherIsBetter: true },
    { metric: "Repeat Rate", yourValue: 0, emerging: 5, growing: 20, established: 35, unit: "%", higherIsBetter: true },
    { metric: "Email List", yourValue: intake?.emailListSize ?? 0, emerging: 100, growing: 2000, established: 10000, unit: "subscribers", higherIsBetter: true },
    { metric: "Testimonials", yourValue: intake?.testimonialCount ?? 0, emerging: 3, growing: 15, established: 50, unit: "", higherIsBetter: true },
    { metric: "Team Size", yourValue: intake?.teamSize ?? 2, emerging: 1, growing: 3, established: 8, unit: "people", higherIsBetter: true },
    { metric: "Hours per Client", yourValue: intake?.hoursPerClient ?? 3, emerging: 5, growing: 3, established: 2, unit: "hrs", higherIsBetter: false },
  ];
}
