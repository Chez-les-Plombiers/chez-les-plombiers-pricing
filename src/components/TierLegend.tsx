import type { VenueConfig } from "@/lib/venues";
import { TIERS } from "@/lib/tier-config";

interface TierLegendProps {
  venue: VenueConfig;
}

/**
 * Légende du calendrier.
 *
 * Les paliers de demande ne s'affichent que sur les lieux qui en ont
 * (L'ATELIER). Partout ailleurs on garde uniquement les états qui existent
 * sur les trois lieux : Fashion Week, option posée, réservé.
 */
export function TierLegend({ venue }: TierLegendProps) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {venue.useTiers && (
        <>
          <LegendItem color={TIERS.premium.color} label="Demande soutenue" />
          <LegendItem color={TIERS.low.color} label="Demande basse" />
        </>
      )}
      <LegendItem color={TIERS["fashion-week"].color} label="Fashion Week" />
      <LegendItem
        label="Option posée"
        swatch={
          <span
            className="h-2.5 w-2.5 border border-option"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, var(--option) 0 2px, transparent 2px 6px)",
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
