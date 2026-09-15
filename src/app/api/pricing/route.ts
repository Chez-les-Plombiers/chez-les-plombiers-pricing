import { NextResponse } from "next/server";
import { computeWindowPricing } from "@/lib/pricing-engine";
import { getAllOverrides, setOverride } from "@/lib/kv";
import { getVenueAvailability } from "@/lib/google-calendar";
import { getVenue, isVenueSlug, DEFAULT_VENUE, type VenueSlug } from "@/lib/venues";
import type { PricingOverride } from "@/types";

/** Lieu demandé via `?venue=`, L'ATELIER par défaut (compatibilité historique). */
function venueFromRequest(request: Request): VenueSlug | null {
  const raw = new URL(request.url).searchParams.get("venue");
  if (!raw) return DEFAULT_VENUE;
  return isVenueSlug(raw) ? raw : null;
}

/**
 * Tarification d'un lieu sur la fenêtre glissante de 12 mois.
 *
 * L'année n'est plus figée : un `2026` en dur aurait cessé de remonter la
 * moindre réservation au 01/01/2027, et empêchait déjà l'admin d'éditer les
 * dates que le public voyait.
 */
export async function GET(request: Request) {
  try {
    const slug = venueFromRequest(request);
    if (!slug) return NextResponse.json({ error: "Lieu inconnu" }, { status: 400 });
    const venue = getVenue(slug);

    const now = new Date();
    const startYear = now.getUTCFullYear();
    const startMonth = now.getUTCMonth();
    const coveredYears = [
      ...new Set(
        Array.from({ length: 12 }, (_, i) =>
          startYear + Math.floor((startMonth + i) / 12)
        )
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

    return NextResponse.json({
      venue: slug,
      startYear,
      startMonth,
      calendarOk: availability.ok,
      days,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get("Authorization");
    if (auth !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const slug = venueFromRequest(request);
    if (!slug) return NextResponse.json({ error: "Lieu inconnu" }, { status: 400 });

    const body: PricingOverride = await request.json();
    if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json(
        { error: "Date invalide (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    await setOverride(slug, body);
    return NextResponse.json({ success: true, venue: slug, override: body });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
