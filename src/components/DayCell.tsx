"use client";

import type { DayPricing } from "@/types";
import { TIERS } from "@/lib/tier-config";
import { getDayOfMonth } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface DayCellProps {
  day: DayPricing;
  today: string;
  onClick: (day: DayPricing) => void;
}

export function DayCell({ day, today, onClick }: DayCellProps) {
  const dayNum = getDayOfMonth(day.date);
  const tier = TIERS[day.tier];
  const isPast = day.date < today;
  const fullyBooked = day.isBooked || (day.isBookedMorning && day.isBookedAfternoon);
  const isDisabled = fullyBooked || isPast;

  return (
    <button
      onClick={() => {
        trackEvent("calendar_day_click", {
          date: day.date,
          tier: day.tier,
          price: day.prices["journee-complete"],
          booking_window: day.bookingWindow,
        });
        onClick(day);
      }}
      disabled={isDisabled}
      aria-label={`${dayNum} — ${tier.label}${fullyBooked ? " (réservé)" : ""}${isPast ? " (passé)" : ""}`}
      className={cn(
        "group relative flex h-9 w-full items-center justify-center border border-transparent text-xs font-medium transition-all sm:h-10",
        isDisabled
          ? "cursor-not-allowed bg-tier-booked/40 text-muted"
          : "cursor-pointer hover:border-accent"
      )}
    >
      {/* Background: FW = solid color, others = split morning/afternoon */}
      {!isDisabled && day.tier === "fashion-week" && (
        <div
          className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
          style={{ backgroundColor: tier.color }}
        />
      )}
      {!isDisabled && day.tier !== "fashion-week" && (
        <>
          <div
            className={cn(
              "absolute inset-y-0 left-0 w-1/2 transition-opacity",
              day.isBookedMorning
                ? "bg-tier-booked/40"
                : "opacity-20 group-hover:opacity-30"
            )}
            style={!day.isBookedMorning ? { backgroundColor: tier.color } : undefined}
          />
          <div
            className={cn(
              "absolute inset-y-0 right-0 w-1/2 transition-opacity",
              day.isBookedAfternoon
                ? "bg-tier-booked/40"
                : "opacity-20 group-hover:opacity-30"
            )}
            style={!day.isBookedAfternoon ? { backgroundColor: tier.color } : undefined}
          />
          {/* Subtle divider between halves */}
          <div className="absolute inset-y-1 left-1/2 w-px bg-background/20" />
        </>
      )}
      <span className={cn("relative z-10", isDisabled ? "text-muted" : "text-foreground")}>
        {dayNum}
      </span>
    </button>
  );
}
