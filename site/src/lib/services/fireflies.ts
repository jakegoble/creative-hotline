import { config } from "@/lib/config";

const GRAPHQL_URL = "https://api.fireflies.ai/graphql";

export async function ping(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.fireflies.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "{ user { email } }",
      }),
    });
    const latency = Date.now() - start;
    const data = await res.json();
    return { ok: !data.errors, latency };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}
