import { NextResponse } from "next/server";
import { computeWindowPricing } from "@/lib/pricing-engine";
import { getAllOverrides } from "@/lib/kv";
import { getVenueAvailability } from "@/lib/google-calendar";
import { getVenue, isVenueSlug, DEFAULT_VENUE } from "@/lib/venues";
import { generateICal } from "@/lib/ical-generator";

/**
 * Flux .ics des tarifs d'un lieu, sur la fenêtre glissante de 12 mois.
 *
 * L'année n'est plus figée (elle valait 2026 en dur), et la disponibilité
 * Google est désormais fusionnée : le flux ne proposait jusqu'ici que des
 * tarifs, sans tenir compte des dates déjà réservées.
 */
export async function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get("venue");
    const slug = raw ? (isVenueSlug(raw) ? raw : null) : DEFAULT_VENUE;
    if (!slug) {
      return NextResponse.json({ error: "Lieu inconnu" }, { status: 400 });
    }
    const venue = getVenue(slug);

    const now = new Date();
    const startYear = now.getUTCFullYear();
    const startMonth = now.getUTCMonth();
    const coveredYears = [
      ...new Set(
        Array.from({ length: 12 }, (_, i) => startYear + Math.floor((startMonth + i) / 12))
      ),
    ];

    const [overrides, availability] = await Promise.all([
      getAllOverrides(slug),
      getVenueAvailability(venue, coveredYears),
    ]);

    for (const [date, booking] of Object.entries(availability.bookings)) {
      overrides[date] = { ...(overrides[date] || { date }), date, ...booking };
    }

    const days = computeWindowPricing({
      venue,
      startYear,
      startMonth,
      overrides,
      options: availability.options,
    });

    return new NextResponse(generateICal(days), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="tarifs-${slug}.ics"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
