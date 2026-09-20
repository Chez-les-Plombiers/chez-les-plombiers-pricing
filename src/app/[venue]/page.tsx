import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getVenue, isVenueSlug, DEFAULT_VENUE, VENUE_ORDER } from "@/lib/venues";
import { VenuePageBody } from "@/components/VenuePageBody";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  // L'ATELIER vit à la racine `/tarifs` : pas de page propre, sinon doublon.
  return VENUE_ORDER.filter((v) => v !== DEFAULT_VENUE).map((venue) => ({ venue }));
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
    title: `Tarifs ${venue.name} — location à Paris 1er`,
    description: `Tarifs et disponibilités de ${venue.name} — ${venue.capacityLabel}, 39 rue des Bourdonnais, Paris 1er. Prix affichés jour par jour, calendrier à jour, devis immédiat.`,
    alternates: { canonical: `/tarifs/${venue.slug}` },
    openGraph: {
      title: `Tarifs ${venue.name} — Chez Les Plombiers`,
      description: `${venue.tagline}. Prix et disponibilités jour par jour.`,
      url: `/tarifs/${venue.slug}`,
      type: "website",
    },
  };
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ venue: string }>;
}) {
  const { venue: slug } = await params;
  if (!isVenueSlug(slug)) notFound();

  /**
   * ⚠️ L'ATELIER n'a pas de page à lui : il EST `/tarifs`.
   *
   * Les deux affichaient le même calendrier, ce qui faisait deux URL pour un
   * seul contenu — doublon pour Google, et une étape de plus pour le visiteur.
   * `/tarifs/atelier` reste valide et redirige, parce que le lien a pu être
   * communiqué depuis le 19/09.
   */
  // `permanentRedirect` et non `redirect` : ce dernier renvoie un 307, que
  // Google traite comme temporaire et qui ne consolide donc pas l'URL.
  if (slug === DEFAULT_VENUE) permanentRedirect("/");

  return <VenuePageBody venue={getVenue(slug)} />;
}
