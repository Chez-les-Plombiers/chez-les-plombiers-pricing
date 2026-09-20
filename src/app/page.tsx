import { getVenue, DEFAULT_VENUE } from "@/lib/venues";
import { VenuePageBody } from "@/components/VenuePageBody";

export const dynamic = "force-dynamic";

/**
 * `www.chezlesplombiers.fr/tarifs` — et c'est la page de L'ATELIER.
 *
 * ⚠️ Ne pas en refaire une redirection (elle l'était avant le 19/09) : c'est
 * l'adresse que les gens citent et cherchent, et une redirection ne peut ni
 * être indexée ni être reprise par un modèle de langage.
 *
 * ⚠️ Ne pas non plus en refaire un sommaire séparé (essayé le 20/09) : on
 * arrivait sur trois encadrés sans calendrier, puis sur le même calendrier un
 * clic plus loin. Deux URL, un seul contenu, une étape pour rien.
 *
 * Le lieu par défaut s'affiche donc directement ici, avec le sélecteur des
 * trois lieux en tête. `/tarifs/atelier` redirige vers cette page.
 */
export default async function TarifsPage() {
  return <VenuePageBody venue={getVenue(DEFAULT_VENUE)} />;
}
