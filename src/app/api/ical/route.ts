import { NextResponse } from "next/server";
import { computeYearPricing } from "@/lib/pricing-engine";
import { getAllOverrides } from "@/lib/kv";
import { generateICal } from "@/lib/ical-generator";

export async function GET() {
  try {
    const overrides = await getAllOverrides();
    const days = computeYearPricing(2026, overrides);
    const ical = generateICal(days);

    return new NextResponse(ical, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="chez-les-plombiers-tarifs-2026.ics"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
