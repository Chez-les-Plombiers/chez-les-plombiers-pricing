import { getVenueWindow } from "@/lib/venue-window";
import type { VenueConfig } from "@/lib/venues";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VenueSelector } from "@/components/VenueSelector";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { BasePriceGrid } from "@/components/BasePriceGrid";

/**
 * La page d'un lieu : intro, sélecteur, grille de prix, calendrier.
 *
 * ⚠️ Partagée par `/tarifs` (L'ATELIER, le lieu par défaut) et
 * `/tarifs/[venue]`. Elles affichaient le même contenu écrit deux fois, avec
 * en prime un bandeau et un titre en double sur `/tarifs` — « on a rajouté une
 * étape pour rien » (Étienne, 20/09/2026). Une seule page, un seul rendu.
 */
export async function VenuePageBody({ venue }: { venue: VenueConfig }) {
  const { days, months, availability } = await getVenueWindow(venue);

  return (
    <div data-venue={venue.slug} className="flex min-h-screen flex-col">
      <Navbar />
      {/*
       * ⚠️ ACCOLADES OBLIGATOIRES : sans elles, ce bloc n'est pas un
       *   commentaire mais du TEXTE, et il s'affiche sur la page.
       * ⚠️ 1180 px, LA MÊME LARGEUR QUE LE SITE — pas `max-w-7xl` (1280 px).
       *
       * Étienne, 22/09/2026, les deux pages côte à côte : « la marge de la page
       * tarifs est plus petite […] c'est pas le même format ». Cent pixels d'écart,
       * invisibles page par page, criants au changement d'onglet — et depuis que
       * `/tarifs` est servi sous le domaine principal, ce n'est plus un autre site
       * mais une autre page du même.
       *
       * ⚠️ Ne concerne QUE les pages publiques. L'administration et les tableaux de
       * bord gardent `max-w-7xl` : ce sont des outils, pas des pages qu'on lit.
       */}
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-4 py-8 sm:px-6">
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
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h1 className="font-display text-xl font-bold uppercase tracking-[0.12em] text-foreground sm:text-2xl">
              {venue.name}
            </h1>
            {/*
             * ── REVENIR À LA FICHE DU LIEU ─────────────────────────────────
             *
             * Étienne, 28/09/2026 : « on me demande les dispos, j'envoie le
             * lien des tarifs, et depuis cette page il n'y a rien pour revenir
             * aux fiches des lieux ». Vrai : on arrive ici par un lien direct,
             * sans être passé par le site, et rien ne dit à quoi ressemble le
             * lieu dont on regarde le prix.
             *
             * ⚠️ PAS DANS LES CARTES DU SÉLECTEUR, même si c'est là qu'on y
             * pense d'abord. Chaque carte EST déjà un lien — celui qui change
             * de lieu. Un lien dans un lien n'est pas du HTML valide, et le
             * clic deviendrait imprévisible : on ne saurait plus si on change
             * de lieu ou si on quitte les tarifs. Ici, sous le nom du lieu
             * affiché, il n'y a aucune ambiguïté sur ce qu'il désigne.
             *
             * ⚠️ UN `<a>` NU, JAMAIS `next/link` : cette application déclare
             * `basePath: "/tarifs"`, et `next/link` enverrait sur
             * `/tarifs/atelier` — une page de la zone tarifs — au lieu de
             * `/atelier`, la fiche du lieu sur le site. Même raison que dans
             * `Navbar`, et l'erreur serait silencieuse.
             */}
            <a
              href={`/${venue.slug}`}
              className="font-mono text-[11px] uppercase tracking-wider text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
            >
              Voir la fiche du lieu →
            </a>
          </div>
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
