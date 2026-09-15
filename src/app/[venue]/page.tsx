import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { computeWindowPricing } from "@/lib/pricing-engine";
import { getAllOverrides } from "@/lib/kv";
import { getVenueAvailability } from "@/lib/google-calendar";
import { getVenue, isVenueSlug, VENUE_ORDER } from "@/lib/venues";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VenueSelector } from "@/components/VenueSelector";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { BasePriceGrid } from "@/components/BasePriceGrid";

export const dynamic = "force-dynamic";

const WINDOW_MONTHS = 12;

export function generateStaticParams() {
  return VENUE_ORDER.map((venue) => ({ venue }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ venue: string }>;
}): Promise<Metadata> {
  const { venue: slug } = await params;
  if (!isVenueSlug(slug)) return {};
  const venue = getVenue(slug);
  return {
    title: `${venue.name} — Calendrier tarifaire`,
    robots: { index: false, follow: false },
  };
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ venue: string }>;
}) {
  const { venue: slug } = await params;
  if (!isVenueSlug(slug)) notFound();

  const venue = getVenue(slug);

  // Fenêtre glissante de 12 mois à partir du mois courant.
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

  return (
    <div data-venue={venue.slug} className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <VenueSelector current={venue.slug} />

        {!availability.ok && (
          <div className="mb-4 border border-tier-premium bg-surface px-4 py-3 text-xs font-medium text-tier-premium">
            Les disponibilités ne sont temporairement pas consultables. Les dates
            affichées ci-dessous peuvent déjà être réservées : merci de nous
            contacter pour confirmation.
          </div>
        )}

        <div className="mb-4">
          <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-foreground sm:text-2xl">
            {venue.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {venue.tagline} — cliquez sur un jour pour voir le tarif et demander
            un devis.
          </p>
        </div>

        <BasePriceGrid venue={venue} />

        <CalendarHeatmap days={days} months={months} venue={venue} />
      </main>
      <Footer />
    </div>
  );
}
