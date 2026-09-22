import type { VenueConfig } from "@/lib/venues";
import { TIERS } from "@/lib/tier-config";
import { formatPrice } from "@/lib/date-utils";

/**
 * Ce que coûte chaque couleur, sur L'ATELIER.
 *
 * ⚠️ MER/JEU/VEN = laiton, le reste = bleu. Même règle que
 * `getTierForDate` — si elle change là-bas, elle doit changer ici. On ne
 * l'importe pas parce qu'elle prend une DATE, pas un jour de semaine.
 */
function fourchette(venue: VenueConfig, soutenue: boolean): string | null {
  const grille = venue.pricing;
  if (grille.kind !== "weekday") return null;
  const jours = soutenue ? [3, 4, 5] : [1, 2, 6, 7];
  const prix = jours.map((j) => grille.prices[j]).filter(Boolean);
  if (!prix.length) return null;
  const bas = Math.min(...prix);
  const haut = Math.max(...prix);
  return bas === haut ? formatPrice(bas) : `${formatPrice(bas)} – ${formatPrice(haut)}`;
}

interface TierLegendProps {
  venue: VenueConfig;
}

/**
 * Légende du calendrier.
 *
 * Les paliers ne s'affichent que sur les lieux qui en ont (L'ATELIER).
 * Partout ailleurs on garde les seuls états qui existent sur les trois
 * lieux : Fashion Week, option posée, réservé.
 *
 * ⚠️ LA LÉGENDE DIT LE PRIX, PAS LA DEMANDE. Elle annonçait « demande
 * soutenue » et « demande basse » — du vocabulaire de yield management, qui
 * décrit notre problème et non celui du client. Il ne vient pas savoir si la
 * demande est forte ; il vient savoir combien ça coûte. Les deux couleurs
 * portent donc leur fourchette, calculée sur la grille du lieu.
 *
 * ⚠️ Et il n'y a rien à simplifier sur LA BOUTIQUE ni L'APPARTEMENT :
 * `useTiers` y est déjà à `false` depuis leur création, leurs jours n'ont
 * qu'un prix. Étienne l'avait bien observé le 22/09/2026.
 */
export function TierLegend({ venue }: TierLegendProps) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {venue.useTiers && (
        <>
          <LegendItem
            color={TIERS.premium.color}
            label={fourchette(venue, true) ?? "Demande soutenue"}
          />
          <LegendItem
            color={TIERS.low.color}
            label={fourchette(venue, false) ?? "Demande basse"}
          />
        </>
      )}
      <LegendItem
        color={TIERS["fashion-week"].color}
        label={`Fashion Week · ${formatPrice(venue.fashionWeekPrice)}`}
      />
      <LegendItem
        label="Option posée"
        swatch={
          <span
            className="h-2.5 w-2.5"
            style={{
              backgroundColor: TIERS.low.color,
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent 0 2px, rgba(0,0,0,0.65) 2px 4px)",
            }}
            aria-hidden
          />
        }
      />
      <LegendItem color="var(--tier-booked)" label="Réservé" />
    </ul>
  );
}

function LegendItem({
  color,
  label,
  swatch,
}: {
  color?: string;
  label: string;
  swatch?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5">
      {swatch ?? (
        <span
          className="h-2.5 w-2.5"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {label}
      </span>
    </li>
  );
}
