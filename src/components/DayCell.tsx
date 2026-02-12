"use client";

import type { DayPricing } from "@/types";
import { TIERS } from "@/lib/tier-config";
import { getDayOfMonth } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface DayCellProps {
  day: DayPricing;
  today: string;
  onClick: (day: DayPricing) => void;
}

export function DayCell({ day, today, onClick }: DayCellProps) {
  const dayNum = getDayOfMonth(day.date);
  const tier = TIERS[day.tier];
  const isPast = day.date < today;
  const isDisabled = day.isBooked || isPast;

  return (
    <button
      onClick={() => onClick(day)}
      disabled={isDisabled}
      aria-label={`${dayNum} — ${tier.label}${day.isBooked ? " (réservé)" : ""}${isPast ? " (passé)" : ""}`}
      className={cn(
        "group relative flex h-9 w-full items-center justify-center border border-transparent text-xs font-medium transition-all sm:h-10",
        isDisabled
          ? "cursor-not-allowed bg-tier-booked/40 text-muted"
          : "cursor-pointer hover:border-accent"
      )}
    >
      <span className={cn("relative z-10", isDisabled ? "text-muted" : "text-foreground")}>
        {dayNum}
      </span>
      {!isDisabled && (
        <div
          className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30"
          style={{ backgroundColor: tier.color }}
        />
      )}
    </button>
  );
}
