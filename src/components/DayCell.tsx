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
 * Hachures orange signalant une option posée.
 * Un aplat plein serait confondu avec une réservation ferme ; les rayures
 * disent « en cours », ce qui est exactement le message voulu.
 */
const OPTION_STRIPES =
  "repeating-linear-gradient(45deg, var(--option) 0 2px, transparent 2px 6px)";

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
        "group relative flex h-12 w-full flex-col items-center justify-center overflow-hidden border text-xs transition-all sm:h-14",
        isDisabled
          ? "cursor-not-allowed border-transparent bg-tier-booked/40 text-muted"
          : hasOption
            ? "cursor-pointer border-option/70 hover:border-option"
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
              className="absolute inset-0 opacity-30"
              style={{ backgroundImage: OPTION_STRIPES }}
              aria-hidden
            />
          ) : (
            <>
              {day.isOptionMorning && (
                <div
                  className="absolute inset-y-0 left-0 w-1/2 opacity-30"
                  style={{ backgroundImage: OPTION_STRIPES }}
                  aria-hidden
                />
              )}
              {day.isOptionAfternoon && (
                <div
                  className="absolute inset-y-0 right-0 w-1/2 opacity-30"
                  style={{ backgroundImage: OPTION_STRIPES }}
                  aria-hidden
                />
              )}
            </>
          )}
        </>
      )}

      <span
        className={cn(
          "relative z-10 font-medium",
          isDisabled ? "text-muted" : "text-foreground"
        )}
      >
        {dayNum}
      </span>

      {isDisabled ? (
        fullyBooked && (
          <span className="relative z-10 max-w-full truncate font-mono text-[7px] uppercase leading-none tracking-tight text-muted">
            Réservé
          </span>
        )
      ) : (
        <span
          className={cn(
            "relative z-10 max-w-full truncate font-mono text-[9px] leading-none sm:text-[10px]",
            hasOption ? "text-option" : "text-accent"
          )}
        >
          {formatPriceCompact(day.prices["journee-complete"])}
        </span>
      )}
    </button>
  );
}
