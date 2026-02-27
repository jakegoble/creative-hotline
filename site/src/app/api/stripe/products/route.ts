import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";
import { getProducts } from "@/lib/services/stripe";
import { PRODUCT_PRICES } from "@/lib/constants";

export async function GET() {
  if (config.demoMode) {
    const products = Object.entries(PRODUCT_PRICES)
      .filter(([name]) => !["Standard Call", "3-Pack Sprint"].includes(name))
      .map(([name, price]) => ({ id: name.toLowerCase().replace(/\s+/g, "-"), name, price }));
    return NextResponse.json(products);
  }

  if (!isConfigured("stripe")) {
    return NextResponse.json({ error: "Stripe secret key not configured" }, { status: 503 });
  }

  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
