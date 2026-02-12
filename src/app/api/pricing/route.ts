import { NextResponse } from "next/server";
import { computeYearPricing } from "@/lib/pricing-engine";
import { getAllOverrides, setOverride } from "@/lib/kv";
import type { PricingOverride } from "@/types";

export async function GET() {
  try {
    const overrides = await getAllOverrides();
    const days = computeYearPricing(2026, overrides);
    return NextResponse.json({ year: 2026, days });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get("Authorization");
    if (auth !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body: PricingOverride = await request.json();

    if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json(
        { error: "Date invalide (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    await setOverride(body);
    return NextResponse.json({ success: true, override: body });
  } catch {
    return NextResponse.json(
      { error: "Requête invalide" },
      { status: 400 }
    );
  }
}
