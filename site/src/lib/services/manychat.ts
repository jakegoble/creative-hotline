import { config } from "@/lib/config";

const BASE_URL = "https://api.manychat.com";

export async function ping(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/fb/page/getInfo`, {
      headers: {
        Authorization: `Bearer ${config.manychat.apiKey}`,
        Accept: "application/json",
      },
    });
    const latency = Date.now() - start;
    return { ok: res.status === 200, latency };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}
