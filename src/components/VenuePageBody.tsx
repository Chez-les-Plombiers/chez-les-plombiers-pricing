import { getVenueWindow } from "@/lib/venue-window";
import type { VenueConfig } from "@/lib/venues";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VenueSelector } from "@/components/VenueSelector";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { BasePriceGrid } from "@/components/BasePriceGrid";
import { WhatsAppLink } from "@/components/WhatsAppLink";

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
          Texte d'accueil : présente les trois lieux à qui ne les connaît pas,
          et oriente les demandes multi-lieux vers un échange direct.

          Masqué sur mobile (Étienne, 16/09/2026) : sur téléphone il repoussait
          le sélecteur sous un écran de texte, alors que le sélecteur dit déjà
          l'essentiel — les trois lieux, leur surface, leur capacité. Le contact
          WhatsApp reste accessible en bas, dans l'encart des conditions.
        */}
        <div className="order-1 mb-6 hidden flex-col gap-3 sm:flex">
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
            <WhatsAppLink
              location="tarifs_lieu"
              className="font-mono text-accent underline underline-offset-4 transition-colors hover:text-accent-hover"
            >
              +33 7 61 47 10 73
            </WhatsAppLink>
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
          <h1 className="font-display text-xl font-bold uppercase tracking-[0.12em] text-foreground sm:text-2xl">
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
