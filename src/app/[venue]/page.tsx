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
      {/*
        Colonne flex : l'ordre d'affichage change selon la taille d'écran.
        Sur mobile, l'encart des tarifs passe APRÈS le calendrier — un visiteur
        sur téléphone veut d'abord voir les dates, et l'encart le repoussait
        sous trois écrans de défilement. Sur tablette et ordinateur il reprend
        sa place au-dessus, où il ne gêne personne.
        `order` ne déplace que le rendu : le contenu reste lu dans l'ordre du
        document par les lecteurs d'écran, ce qui convient pour un encart
        d'information.
      */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6">
        {/*
          Texte d'accueil : un visiteur qui arrive ici ne sait pas forcément
          que la marque compte trois lieux, ni que ce calendrier les couvre
          tous. La dernière phrase absorbe aussi les demandes multi-lieux, qui
          se traitent de vive voix plutôt que dans l'outil.
        */}
        <div className="order-1 mb-6 flex flex-col gap-3">
          {/*
            `text-pretty` empêche le mot orphelin en fin de paragraphe : viser
            « une seule ligne » ne tient qu'à une largeur d'écran donnée, alors
            que le problème réel est la coupure disgracieuse. Les noms de lieux
            sont en plus insécables, pour ne jamais séparer « Appartement » de
            « Rose ».
          */}
          <p className="hyphens-auto text-justify text-sm leading-relaxed text-muted">
            <span className="text-foreground">Chez les Plombiers</span>, ce sont
            trois lieux à la même adresse, au 39 rue des Bourdonnais, Paris
            1<sup>er</sup>, à deux pas du Pont Neuf :{" "}
            <span className="whitespace-nowrap text-foreground">l&apos;Atelier</span>,{" "}
            <span className="whitespace-nowrap text-foreground">la Boutique</span> et{" "}
            <span className="whitespace-nowrap text-foreground">
              l&apos;Appartement Rose
            </span>
            .
          </p>
          <p className="hyphens-auto text-justify text-sm leading-relaxed text-muted">
            Choisissez un lieu pour voir ses tarifs et ses disponibilités, puis
            cliquez sur une date pour obtenir le tarif exact et demander un devis.
          </p>
          <p className="hyphens-auto text-justify text-sm leading-relaxed text-muted">
            Si vous souhaitez réserver plusieurs espaces en même temps, ou sur une
            période plus longue, écrivez-nous directement sur WhatsApp au{" "}
            <a
              href="https://wa.me/33761471073"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-accent underline underline-offset-4 transition-colors hover:text-accent-hover"
            >
              +33 7 61 47 10 73
            </a>
            .
          </p>
        </div>

        <div className="order-2">
          <VenueSelector current={venue.slug} />
        </div>

        {!availability.ok && (
          <div className="order-3 mb-4 border border-tier-premium bg-surface px-4 py-3 text-xs font-medium text-tier-premium">
            Les disponibilités ne sont temporairement pas consultables. Les dates
            affichées ci-dessous peuvent déjà être réservées : merci de nous
            contacter pour confirmation.
          </div>
        )}

        <div className="order-4 mb-4">
          <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-foreground sm:text-2xl">
            {venue.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {venue.tagline} — cliquez sur un jour pour voir le tarif et demander
            un devis.
          </p>
        </div>

        <div className="order-6 mt-8 sm:order-5 sm:mt-0">
          <BasePriceGrid venue={venue} />
        </div>

        <div className="order-5 sm:order-6">
          <CalendarHeatmap days={days} months={months} venue={venue} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
