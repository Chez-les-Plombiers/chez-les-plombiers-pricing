import { computeWindowPricing } from "@/lib/pricing-engine";
import { getAllOverrides } from "@/lib/kv";
import { getVenueAvailability } from "@/lib/google-calendar";
import type { VenueConfig } from "@/lib/venues";

/** Fenêtre glissante affichée par les calendriers publics. */
export const WINDOW_MONTHS = 12;

/**
 * Prépare la fenêtre de 12 mois d'un lieu : prix du jour, disponibilités et
 * options, prêts à passer au calendrier.
 *
 * Extrait de `[venue]/page.tsx` le 20/09/2026, pour que la page d'accueil
 * `/tarifs` puisse afficher le calendrier de L'ATELIER sous les trois cartes
 * sans dupliquer cette logique — et surtout sans que les deux se mettent à
 * diverger au premier changement de règle métier.
 */
export async function getVenueWindow(venue: VenueConfig) {
  const now = new Date();
  const startYear = now.getUTCFullYear();
  const startMonth = now.getUTCMonth();

  const months = Array.from({ length: WINDOW_MONTHS }, (_, i) => {
    const absoluteMonth = startMonth + i;
    return {
      year: startYear + Math.floor(absoluteMonth / 12),
      month: absoluteMonth % 12,
    };
  });

  const coveredYears = [...new Set(months.map((m) => m.year))];

  const [overrides, availability] = await Promise.all([
    getAllOverrides(venue.slug),
    getVenueAvailability(venue, coveredYears),
  ]);

  // Google Calendar est la source de vérité de la disponibilité : ses
  // réservations écrasent les drapeaux saisis à la main dans l'admin.
  for (const [date, booking] of Object.entries(availability.bookings)) {
    const existing = overrides[date] || { date };
    overrides[date] = {
      ...existing,
      date,
      isBooked: booking.isBooked,
      isBookedMorning: booking.isBookedMorning,
      isBookedAfternoon: booking.isBookedAfternoon,
    };
  }

  const days = computeWindowPricing({
    venue,
    startYear,
    startMonth,
    overrides,
    options: availability.options,
    monthCount: WINDOW_MONTHS,
  });

  return { days, months, availability };
}
