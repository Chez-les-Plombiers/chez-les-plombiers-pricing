import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listVenues, DEFAULT_VENUE, type VenueSlug } from "@/lib/venues";
import { formatPrice } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface VenueSelectorProps {
  /** Lieu affiché. `null` sur la page d'accueil : aucun n'est encore choisi. */
  current: VenueSlug | null;
}

/**
 * Sélecteur de lieu — LE sélecteur, unique sur tout le pricing.
 *
 * ⚠️ Il y en avait DEUX jusqu'au 20/09/2026 : trois grandes cartes avec les
 * prix sur `/tarifs`, et un petit jeu d'onglets sur les pages de lieu. Deux
 * dessins différents pour la même fonction, donc l'impression de changer de
 * site en cliquant. Étienne : « il faudrait qu'on garde le menu ».
 *
 * C'est désormais la carte qui gagne, partout, avec le lieu courant en
 * surbrillance — on voit toujours les trois, on compare les prix d'un coup
 * d'œil, et on sait où on est.
 *
 * Un seul lieu à la fois : le cumul et le prix combiné ont été écartés
 * (décision Étienne, 15/09/2026), une demande multi-lieux se négocie de vive
 * voix. De simples liens suffisent donc : pas d'état client, URL partageable.
 */
export function VenueSelector({ current }: VenueSelectorProps) {
  return (
    <nav
      aria-label="Choix du lieu"
      className="mb-8 grid gap-px border border-border bg-border sm:grid-cols-3"
    >
      {listVenues().map((venue, index) => {
        const active = venue.slug === current;
        const { valeur, detail } = resumePrix(venue.pricing);
        // Le vaisseau amiral occupe toute la largeur sur mobile ; les deux
        // autres se partagent la ligne du dessous.
        const flagship = index === 0;

        return (
          <Link
            key={venue.slug}
            // L'ATELIER vit à la racine : viser /atelier ferait rebondir par une redirection.
            href={venue.slug === DEFAULT_VENUE ? "/" : `/${venue.slug}`}
            data-venue-tab={venue.slug}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex flex-col justify-between gap-5 p-5 transition-colors",
              flagship && "col-span-2 sm:col-span-1",
              active
                ? "bg-card"
                : "bg-background hover:bg-card"
            )}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2
                  className={cn(
                    // Eurostile Extended est large et l'interlettrage l'élargit
                    // encore : sur mobile, les deux cartes du bas font ~186 px
                    // et « L'APPARTEMENT » se faisait couper. On resserre là,
                    // on respire à partir de `sm`.
                    "font-display text-[11px] font-bold uppercase leading-tight tracking-[0.06em] sm:text-sm sm:tracking-[0.14em]",
                    active ? "text-venue" : "text-foreground"
                  )}
                >
                  {venue.name}
                </h2>
                {active && (
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 bg-venue"
                    aria-hidden
                  />
                )}
              </div>
              <p className="mt-1 text-[11px] leading-tight text-muted">
                {venue.tagline}
              </p>

              <p className="mt-4 font-mono text-base font-bold text-foreground">
                {valeur}
                <span className="ml-1.5 text-[10px] font-normal text-muted">
                  HT / jour
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted">{detail}</p>
            </div>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                active ? "text-muted" : "text-accent"
              )}
            >
              {active ? "Calendrier affiché ci-dessous" : "Voir le calendrier"}
              {!active && (
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** « 1 000 € » pour un tarif unique, « 1 000 € – 4 000 € » pour une grille. */
function resumePrix(pricing: ReturnType<typeof listVenues>[number]["pricing"]) {
  if (pricing.kind === "flat") {
    return { valeur: formatPrice(pricing.price), detail: "tous les jours" };
  }
  const values = Object.values(pricing.prices);
  return {
    valeur: `${formatPrice(Math.min(...values))} – ${formatPrice(Math.max(...values))}`,
    detail: "selon le jour de la semaine",
  };
}
