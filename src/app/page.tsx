import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listVenues } from "@/lib/venues";
import { formatPrice } from "@/lib/date-utils";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

/**
 * Page d'accueil du pricing, servie à `www.chezlesplombiers.fr/tarifs`.
 *
 * ⚠️ C'était une simple redirection vers L'ATELIER jusqu'au 19/09/2026. C'est
 * précisément l'adresse que les gens citent, partagent et cherchent
 * (« combien coûte Chez les Plombiers »), et une redirection ne peut ni être
 * indexée, ni être citée par un modèle de langage. Elle porte donc désormais
 * la réponse générale — les trois lieux et leurs prix — et renvoie vers le
 * calendrier de chacun.
 *
 * Ne pas la retransformer en redirection.
 */

/** Résume la grille d'un lieu en une phrase : « 1 000 € » ou « 1 000 à 4 000 € ». */
function priceSummary(pricing: ReturnType<typeof listVenues>[number]["pricing"]) {
  if (pricing.kind === "flat") {
    return { value: formatPrice(pricing.price), detail: "tous les jours" };
  }
  const values = Object.values(pricing.prices);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    value: `${formatPrice(min)} – ${formatPrice(max)}`,
    detail: "selon le jour de la semaine",
  };
}

export default function TarifsPage() {
  const venues = listVenues();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6">
        <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-foreground sm:text-2xl">
          Tarifs et disponibilités
        </h1>

        <div className="mt-4 flex max-w-3xl flex-col gap-3">
          <p className="hyphens-auto text-justify text-sm leading-relaxed text-muted">
            <span className="text-foreground">Chez les Plombiers</span>, ce sont
            trois lieux à la même adresse, au 39 rue des Bourdonnais, Paris
            1<sup>er</sup>, à deux pas du Pont Neuf. Ils ne se ressemblent pas
            et ne servent pas aux mêmes événements, mais ils se louent
            séparément ou ensemble.
          </p>
          <p className="hyphens-auto text-justify text-sm leading-relaxed text-muted">
            Nos prix sont publics. Choisissez un lieu pour voir sa grille
            complète et ses disponibilités jour par jour, puis cliquez sur une
            date pour obtenir le tarif exact et demander un devis.
          </p>
        </div>

        <div className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-3">
          {venues.map((venue) => {
            const { value, detail } = priceSummary(venue.pricing);
            return (
              <Link
                key={venue.slug}
                href={`/${venue.slug}`}
                data-venue={venue.slug}
                className="group flex flex-col justify-between gap-6 bg-background p-5 transition-colors hover:bg-surface"
              >
                <div>
                  <h2 className="font-mono text-base font-bold uppercase tracking-widest text-foreground">
                    {venue.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted">{venue.tagline}</p>

                  <p className="mt-5 font-mono text-lg font-bold text-foreground">
                    {value}
                    <span className="ml-1.5 text-xs font-normal text-muted">
                      HT / jour
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{detail}</p>

                  <p className="mt-3 text-xs text-muted">
                    Pendant les Fashion Weeks :{" "}
                    <span className="font-mono text-foreground">
                      {formatPrice(venue.fashionWeekPrice)}
                    </span>{" "}
                    la journée.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                  Calendrier et disponibilités
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted">
          Les montants ci-dessus sont indicatifs et s&apos;entendent hors taxes.
          Le tarif appliqué à une date précise s&apos;affiche en cliquant dessus.
          Pour réserver plusieurs espaces en même temps, ou sur une période plus
          longue, écrivez-nous directement sur WhatsApp au{" "}
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
      </main>
      <Footer />
    </div>
  );
}
