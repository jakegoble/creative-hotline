import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { generateInsights } from "@/lib/services/claude";

export async function POST(request: Request) {
  if (config.demoMode) {
    return NextResponse.json({
      insights: "• Your referral channel has 100% conversion — build a formal referral incentive program to scale it.\n• IG DM drives the most leads but CAC is rising — automate with ManyChat to reduce cost per lead.\n• At current run rate ($5,882/mo) you're at 8.8% of your $800K target — prioritize non-call revenue products like Brand Audit ($299) and community membership.",
    });
  }

  if (!isConfigured("anthropic")) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const insights = await generateInsights(body);
    return NextResponse.json({ insights });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
