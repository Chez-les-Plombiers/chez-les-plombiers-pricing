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
      {/* Fond : paliers de demande (ATELIER) ou surface neutre (autres lieux) */}
      {!isDisabled && (
        <>
          {venue.useTiers && multiSlot && !isFashionWeek ? (
            <>
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-1/2 transition-opacity",
                  day.isBookedMorning
                    ? "bg-tier-booked/80"
                    : "opacity-20 group-hover:opacity-30"
                )}
                style={
                  !day.isBookedMorning ? { backgroundColor: tier.color } : undefined
                }
              />
              <div
                className={cn(
                  "absolute inset-y-0 right-0 w-1/2 transition-opacity",
                  day.isBookedAfternoon
                    ? "bg-tier-booked/80"
                    : "opacity-20 group-hover:opacity-30"
                )}
                style={
                  !day.isBookedAfternoon
                    ? { backgroundColor: tier.color }
                    : undefined
                }
              />
              <div className="absolute inset-y-1 left-1/2 w-px bg-background/20" />
            </>
          ) : (
            <div
              className={cn(
                "absolute inset-0 transition-opacity",
                venue.useTiers || isFashionWeek
                  ? "opacity-20 group-hover:opacity-30"
                  : "bg-surface"
              )}
              style={
                venue.useTiers || isFashionWeek
                  ? { backgroundColor: tier.color }
                  : undefined
              }
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
