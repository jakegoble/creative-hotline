/**
 * Notion Intake DB — create / upsert operations for Tally submissions.
 *
 * Splits intentionally from `notion-intake-write.ts` (which only handles
 * Research Brief updates on existing pages) and from `notion-intake-read.ts`
 * (which only does lookups). Same NotionClient pattern; same NOTION_API_KEY
 * via `config.notion`.
 *
 * Replaces the legacy n8n workflow `U28IsefMfBMYvazv` ("Tally Form → Notion CRM")
 * whose 9 Set-node mappings used the wrong payload path (`body.fields[N].answer`
 * vs. real `body.data.fields[N].value`) and silently wrote empty rows for
 * months. See N8N-TALLY-FINDINGS-2026-05-17.md for the full forensics.
 */

import { Client as NotionClient } from "@notionhq/client";
import { config } from "../config";
import { buildIntakeSummary, preferredWebsiteUrl } from "../tally/parser";
import type { ParsedIntake, TallyFileUpload } from "../tally/types";

let _client: NotionClient | null = null;

function getClient(): NotionClient {
  if (!_client) {
    if (!config.notion.apiKey) {
      throw new Error("NOTION_API_KEY is not configured");
    }
    _client = new NotionClient({ auth: config.notion.apiKey });
  }
  return _client;
}

/** Chunked rich_text — Notion caps each text block at 2000 chars. */
function richText(value: string | undefined) {
  if (!value) return { rich_text: [] };
  const CHUNK = 2000;
  if (value.length <= CHUNK) {
    return { rich_text: [{ type: "text" as const, text: { content: value } }] };
  }
  const chunks = [];
  for (let i = 0; i < value.length; i += CHUNK) {
    chunks.push({
      type: "text" as const,
      text: { content: value.slice(i, i + CHUNK) },
    });
  }
  return { rich_text: chunks };
}

/**
 * Find an existing Intake row by email created within `windowMinutes` of now.
 * Used as the idempotency check before creating a row from a Tally webhook —
 * Tally retries non-2xx responses, so a slow Notion call can re-fire the
 * same submission. Email + recent-window is the cleanest dedupe we can do
 * given the Intake DB has no field for Tally's submissionId.
 *
 * Mirrors findPaymentByEmail in notion-payments-write.ts.
 */
export async function findRecentIntakeByEmail(
  email: string,
  windowMinutes: number = 5,
): Promise<string | null> {
  if (!email) return null;
  const client = getClient();
  const cutoffIso = new Date(
    Date.now() - windowMinutes * 60 * 1000,
  ).toISOString();
  const response = await client.dataSources.query({
    data_source_id: config.notion.intakeDbId,
    filter: {
      and: [
        { property: "Email", email: { equals: email } },
        {
          timestamp: "created_time",
          created_time: { on_or_after: cutoffIso },
        },
      ],
    },
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 1,
  });
  const first = response.results[0];
  return first ? first.id : null;
}

/**
 * Sanitize a URL for Notion's url property. Notion rejects bare hostnames
 * (e.g. "instagram.com/jakke") — needs a scheme. We prepend https:// if
 * absent. Returns undefined if the input is empty.
 */
function normalizeUrl(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

/**
 * Map a Tally Brand Files array into Notion's files property shape.
 * Notion expects:
 *   files: [{ name, external: { url } }]
 */
function buildFilesProperty(files: TallyFileUpload[]) {
  if (!files || files.length === 0) return undefined;
  return {
    files: files.map((f) => ({
      name: f.name.slice(0, 100), // Notion caps file names at 100 chars
      external: { url: f.url },
    })),
  };
}

/**
 * Create a new Intake page from a parsed Tally submission.
 *
 * Returns the new page ID. If the same email already submitted within the
 * last `dedupeMinutes` (default 5), returns the existing page ID instead
 * without creating a duplicate — see findRecentIntakeByEmail.
 *
 * The `intakeStatus` defaults to "Submitted" — meaning the row is ready for
 * the morning-prep pipeline to pick up. Pass "Not Started" or another value
 * to override.
 */
export async function createIntakeFromTally(
  intake: ParsedIntake,
  options: {
    intakeStatus?: "Not Started" | "Submitted" | "Failed - Needs Manual Review";
    dedupeMinutes?: number;
  } = {},
): Promise<{ pageId: string; created: boolean }> {
  const { intakeStatus = "Submitted", dedupeMinutes = 5 } = options;

  // Idempotency: if this email submitted in the last `dedupeMinutes`,
  // return the existing page rather than create a new one. Protects
  // against Tally's webhook retry loop.
  if (intake.email) {
    const existingId = await findRecentIntakeByEmail(
      intake.email,
      dedupeMinutes,
    );
    if (existingId) {
      return { pageId: existingId, created: false };
    }
  }

  const client = getClient();

  // Build the properties object. Notion ignores undefined property keys,
  // so we conditionally include only the ones with content. Title is the
  // only required field — everything else is optional per the schema.
  const properties: Record<string, unknown> = {
    "Client Name": {
      title: [
        {
          type: "text",
          text: { content: intake.fullName || "(Unnamed submission)" },
        },
      ],
    },
  };

  if (intake.role) properties["Role"] = richText(intake.role);
  if (intake.brand) properties["Brand"] = richText(intake.brand);
  if (intake.email) properties["Email"] = { email: intake.email };
  if (intake.creativeEmergency)
    properties["Creative Emergency"] = richText(intake.creativeEmergency);
  if (intake.whatTried)
    properties["What They've Tried"] = richText(intake.whatTried);
  if (intake.deadline) properties["Deadline"] = richText(intake.deadline);
  if (intake.constraintsAvoid)
    properties["Constraints / Avoid"] = richText(intake.constraintsAvoid);
  if (intake.magicWand) properties["Magic Wand"] = richText(intake.magicWand);
  if (intake.inspiration)
    properties["Inspiration"] = richText(intake.inspiration);

  if (intake.priceRange)
    properties["Price Range"] = { select: { name: intake.priceRange } };
  if (intake.monthlyRevenue)
    properties["Monthly Revenue"] = { select: { name: intake.monthlyRevenue } };
  if (intake.teamSize)
    properties["Team Size"] = { select: { name: intake.teamSize } };
  if (intake.hoursPerWeek)
    properties["Hours Per Week"] = { select: { name: intake.hoursPerWeek } };
  if (intake.monthlyBudget)
    properties["Monthly Budget"] = { select: { name: intake.monthlyBudget } };
  if (intake.primaryPlatform)
    properties["Primary Platform"] = {
      select: { name: intake.primaryPlatform },
    };

  // Desired Outcome is multi_select — Tally Q8 can pick multiple.
  if (intake.desiredOutcomes.length > 0) {
    properties["Desired Outcome"] = {
      multi_select: intake.desiredOutcomes.map((name) => ({ name })),
    };
  }

  // Single URL field — prefer Website, fall back to Instagram.
  const url = normalizeUrl(preferredWebsiteUrl(intake));
  if (url) properties["Website / IG"] = { url };

  // ---------- Megha V2 spec additions (Tally Q2 / Q3 / Q4 / Q5 / Q7) ----------
  if (intake.successDefinition)
    properties["Success Definition"] = richText(intake.successDefinition);
  if (intake.targetAudience)
    properties["Target Audience"] = richText(intake.targetAudience);
  if (intake.brandLinks) properties["Brand Links"] = richText(intake.brandLinks);
  if (intake.aiOverview)
    properties["AI Overview"] = richText(intake.aiOverview);

  if (intake.revenueModel && intake.revenueModel.length > 0) {
    properties["Revenue Model"] = {
      multi_select: intake.revenueModel.map((name) => ({ name })),
    };
  }
  if (intake.platforms && intake.platforms.length > 0) {
    properties["Platforms"] = {
      multi_select: intake.platforms.map((name) => ({ name })),
    };
  }

  // ---------- Dedicated social URL columns (Megha morning batch) ----------
  // These complement (don't replace) "Website / IG" which holds the single
  // preferred URL. Each Tally social input becomes its own typed URL property
  // so the morning-prep + research-brief pipelines can read them directly.
  const linkedinUrl = intake.linkedin
    ? normalizeUrl(intake.linkedin)
    : undefined;
  if (linkedinUrl) properties["LinkedIn"] = { url: linkedinUrl };

  const twitterUrl = intake.twitter ? normalizeUrl(intake.twitter) : undefined;
  if (twitterUrl) properties["X/Twitter"] = { url: twitterUrl };

  const tiktokUrl = intake.tiktok ? normalizeUrl(intake.tiktok) : undefined;
  if (tiktokUrl) properties["TikTok URL"] = { url: tiktokUrl };

  const youtubeUrl = intake.youtube ? normalizeUrl(intake.youtube) : undefined;
  if (youtubeUrl) properties["YouTube"] = { url: youtubeUrl };

  // Brand Website = primary Tally "Website" field; Portfolio Website = the
  // optional second "Website 2" / "Portfolio Website" field.
  const brandWebsite = intake.website
    ? normalizeUrl(intake.website)
    : undefined;
  if (brandWebsite) properties["Brand Website"] = { url: brandWebsite };

  const portfolioWebsite = intake.website2
    ? normalizeUrl(intake.website2)
    : undefined;
  if (portfolioWebsite)
    properties["Portfolio Website"] = { url: portfolioWebsite };

  // Brand Files (file upload field) — array of external file refs.
  const filesProp = buildFilesProperty(intake.brandFiles);
  if (filesProp) properties["Brand Files"] = filesProp;

  // AI Intake Summary captures Phone + non-canonical URLs + goal/emergency
  // highlights. Phone has no dedicated Notion property; rather than drop it
  // we surface it here so the morning-prep page still shows the contact info.
  const summary = buildIntakeSummary(intake);
  if (summary) properties["AI Intake Summary"] = richText(summary);

  // Set Intake Status so the morning-prep pipeline picks up the row.
  properties["Intake Status"] = { select: { name: intakeStatus } };

  const page = await client.pages.create({
    parent: {
      type: "data_source_id",
      data_source_id: config.notion.intakeDbId,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: properties as any,
  });

  return { pageId: page.id, created: true };
}
