"use client";

import type { DayPricing } from "@/types";
import type { VenueConfig } from "@/lib/venues";
import { hasSlots } from "@/lib/venues";
import { TIERS } from "@/lib/tier-config";
import { getDayOfMonth, formatPriceCompact } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface DayCellProps {
  day: DayPricing;
  today: string;
  venue: VenueConfig;
  onClick: (day: DayPricing) => void;
}

/**
 * Rayures diagonales signalant une option posée.
 *
 * Une bande laisse voir la couleur normale du jour, la suivante est sombre
 * comme une réservation : la case se lit « à moitié bloquée ». C'est le bon
 * niveau d'attention — une première version cerclée d'orange attirait l'œil
 * sur des jours qui ne le méritent pas, une option n'est pas un événement
 * important, juste une date en cours de négociation.
 */
const OPTION_STRIPES =
  "repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.55) 3px 6px)";

export function DayCell({ day, today, venue, onClick }: DayCellProps) {
  const dayNum = getDayOfMonth(day.date);
  const tier = TIERS[day.tier];
  const isPast = day.date < today;
  const multiSlot = hasSlots(venue);

  const fullyBooked =
    day.isBooked || (day.isBookedMorning && day.isBookedAfternoon);
  const isDisabled = fullyBooked || isPast;

  // Une option n'empêche jamais de cliquer : elle peut se libérer, et masquer
  // la demande la tuerait. Elle se signale, elle ne bloque pas.
  const hasOption = day.isOption || day.isOptionMorning || day.isOptionAfternoon;
  const isFashionWeek = day.tier === "fashion-week";

  /*
   * La couleur de palier ne s'applique qu'aux lieux qui en ont — et la Fashion
   * Week la porte toujours, sur les trois lieux : c'est la seule période où le
   * prix change vraiment.
   */
  const couleurPalier = venue.useTiers || isFashionWeek;
  const fond = (reserve: boolean) =>
    reserve
      ? "bg-tier-booked/80"
      : couleurPalier
        ? "opacity-20 group-hover:opacity-30"
        : "bg-surface";
  const styleFond = (reserve: boolean) =>
    !reserve && couleurPalier ? { backgroundColor: tier.color } : undefined;

  const label = [
    `${dayNum}`,
    isPast ? "passé" : null,
    fullyBooked ? "réservé" : null,
    hasOption ? "option posée" : null,
    !isDisabled ? formatPriceCompact(day.prices["journee-complete"]) : null,
    venue.useTiers && !isDisabled ? tier.label : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <button
      type="button"
      onClick={() => {
        trackEvent("calendar_day_click", {
          venue: venue.slug,
          date: day.date,
          tier: day.tier,
          price: day.prices["journee-complete"],
          has_option: hasOption,
        });
        onClick(day);
      }}
      disabled={isDisabled}
      aria-label={label}
      className={cn(
        "group relative flex h-9 w-full items-center justify-center overflow-hidden border text-xs transition-all sm:h-10",
        isDisabled
          ? "cursor-not-allowed border-transparent bg-tier-booked/40 text-muted"
          : "cursor-pointer border-transparent hover:border-accent"
      )}
    >
      {/*
        ── LE FOND D'UNE CASE ──────────────────────────────────────────────

        Deux questions indépendantes, et elles étaient MAL liées :

          1. la case porte-t-elle une couleur de palier ? → `couleurPalier`
          2. se coupe-t-elle en deux demi-journées ?      → `multiSlot`

        ⚠️ LE DÉCOUPAGE ÉTAIT CONDITIONNÉ À `venue.useTiers`. Les deux n'ont
        rien à voir : `multiSlot` teste déjà si le lieu vend des demi-journées.
        Tant que L'ATELIER était le seul à avoir les deux, le défaut dormait —
        mais éteindre ses paliers aurait emporté le découpage avec eux, et une
        MATINÉE RÉSERVÉE SE SERAIT AFFICHÉE COMME UN JOUR LIBRE. Une erreur de
        réservation, pas une coquille. C'est la seule chose qui rendait la
        demande d'Étienne du 23/09/2026 risquée ; elle ne l'est plus.

        ⚠️ Éteindre les couleurs ne perd AUCUNE information de prix : la
        grille par jour de semaine reste affichée au-dessus du calendrier
        (`BasePriceGrid`). Le palier disait « ce jour coûte plus cher » ; la
        grille le dit en chiffres, ce qui est plus clair.
      */}
      {!isDisabled && (
        <>
          {multiSlot && !isFashionWeek ? (
            <>
              <div
                className={cn("absolute inset-y-0 left-0 w-1/2 transition-opacity", fond(day.isBookedMorning))}
                style={styleFond(day.isBookedMorning)}
              />
              <div
                className={cn("absolute inset-y-0 right-0 w-1/2 transition-opacity", fond(day.isBookedAfternoon))}
                style={styleFond(day.isBookedAfternoon)}
              />
              <div className="absolute inset-y-1 left-1/2 w-px bg-background/20" />
            </>
          ) : (
            <div
              className={cn("absolute inset-0 transition-opacity", fond(false))}
              style={styleFond(false)}
            />
          )}
        </>
      )}

      {/* Hachures d'option, sur la moitié concernée ou la journée entière */}
      {!isDisabled && hasOption && (
        <>
          {day.isOption || !multiSlot ? (
            <div
              className="absolute inset-0"
              style={{ backgroundImage: OPTION_STRIPES }}
              aria-hidden
            />
          ) : (
            <>
              {day.isOptionMorning && (
                <div
                  className="absolute inset-y-0 left-0 w-1/2"
                  style={{ backgroundImage: OPTION_STRIPES }}
                  aria-hidden
                />
              )}
              {day.isOptionAfternoon && (
                <div
                  className="absolute inset-y-0 right-0 w-1/2"
                  style={{ backgroundImage: OPTION_STRIPES }}
                  aria-hidden
                />
              )}
            </>
          )}
        </>
      )}

      {/*
        Le numéro seul. Les prix ne sont PAS répétés dans les cellules : ils
        sont déjà dans l'encart au-dessus, et les répéter 365 fois sature la
        lecture — surtout sur un lieu à tarif unique, où la grille afficherait
        « 1k€ » partout. Le tarif exact reste au clic, et dans l'aria-label.
      */}
      <span
        className={cn(
          "relative z-10 font-medium",
          isDisabled ? "text-muted" : "text-foreground"
        )}
      >
        {dayNum}
      </span>
    </button>
  );
}
