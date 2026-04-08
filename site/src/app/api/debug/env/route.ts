import { NextResponse } from "next/server";

export async function GET() {
  const notion_key = process.env.NOTION_API_KEY || "NOT SET";
  const notion_key_prefix = notion_key.substring(0, 10);
  const notion_key_length = notion_key === "NOT SET" ? 0 : notion_key.length;

  return NextResponse.json({
    NOTION_API_KEY_SET: notion_key !== "NOT SET",
    NOTION_API_KEY_PREFIX: notion_key_prefix,
    NOTION_API_KEY_LENGTH: notion_key_length,
    NOTION_API_KEY_EXPECTED_PREFIX: "ntn_",
    MATCHES_EXPECTED_PREFIX: notion_key_prefix === "ntn_",
  });
}
