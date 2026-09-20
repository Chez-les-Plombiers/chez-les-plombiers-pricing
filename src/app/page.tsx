import { getVenue, DEFAULT_VENUE } from "@/lib/venues";
import { getVenueWindow } from "@/lib/venue-window";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VenueSelector } from "@/components/VenueSelector";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { BasePriceGrid } from "@/components/BasePriceGrid";
import { WhatsAppLink } from "@/components/WhatsAppLink";

export const dynamic = "force-dynamic";

/**
 * Page d'accueil du pricing, servie à `www.chezlesplombiers.fr/tarifs`.
 *
 * ⚠️ C'était une redirection vers L'ATELIER jusqu'au 19/09/2026. C'est
 * l'adresse que les gens citent et cherchent (« combien coûte Chez les
 * Plombiers ») : une redirection ne peut ni être indexée, ni être reprise par
 * un modèle de langage. Ne pas la retransformer en redirection.
 *
 * ⚠️ Et elle doit montrer un CALENDRIER. Le 20/09, en n'affichant que le
 * sommaire des trois lieux, elle a fait croire à Étienne que le pricing était
 * cassé : on vient y chercher des dates, on trouvait trois encadrés. Le
 * sommaire reste, le calendrier de L'ATELIER est dessous.
 *
 * Le bandeau de tête est sur fond clair, le reste garde le thème sombre du
 * lieu. Ce n'est pas une hésitation : les paliers de demande du calendrier
 * (bleu, laiton, rouge) sont conçus pour un fond charbon et deviennent
 * illisibles sur un aplat clair. Passer toute la page en clair supposerait de
 * redessiner ce code couleur.
 */
export default async function TarifsPage() {
  const principal = getVenue(DEFAULT_VENUE);
  const { days, months } = await getVenueWindow(principal);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Bandeau de tête — niveau marque, aucun lieu encore choisi. */}
      <header className="border-b border-border bg-paper text-paper-ink">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="font-display text-xl font-bold uppercase tracking-[0.12em] sm:text-3xl">
            Tarifs et disponibilités
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-paper-muted">
            <span className="text-paper-ink">Chez les Plombiers</span>, ce sont
            trois lieux à la même adresse, au 39 rue des Bourdonnais, Paris
            1<sup>er</sup>, à deux pas du Pont Neuf. Ils ne se ressemblent pas et
            ne servent pas aux mêmes événements, mais ils se louent séparément
            ou ensemble.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-muted">
            Nos prix sont publics. Choisissez un lieu pour voir sa grille
            complète et ses disponibilités jour par jour, puis cliquez sur une
            date pour obtenir le tarif exact et demander un devis.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6">
        <VenueSelector current={null} />

        <section>
          <h2 className="font-display text-lg font-bold uppercase tracking-[0.12em] text-foreground sm:text-xl">
            {principal.name}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {principal.tagline} — cliquez sur un jour pour voir le tarif et
            demander un devis. Les deux autres lieux ont leur propre calendrier.
          </p>

          <div className="mt-6">
            <BasePriceGrid venue={principal} />
          </div>
          <CalendarHeatmap days={days} months={months} venue={principal} />
        </section>

        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-muted">
          Les montants affichés sont indicatifs et s&apos;entendent hors taxes.
          Le tarif appliqué à une date précise s&apos;affiche en cliquant dessus.
          Pour réserver plusieurs espaces en même temps, ou sur une période plus
          longue, écrivez-nous directement sur WhatsApp au{" "}
          <WhatsAppLink
            location="tarifs_accueil"
            className="font-mono text-accent underline underline-offset-4 transition-colors hover:text-accent-hover"
          >
            +33 7 61 47 10 73
          </WhatsAppLink>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}
