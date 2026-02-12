"use client";

import type { DayPricing } from "@/types";
import { TIERS } from "@/lib/tier-config";
import { getDayOfMonth } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface DayCellProps {
  day: DayPricing;
  onClick: (day: DayPricing) => void;
}

export function DayCell({ day, onClick }: DayCellProps) {
  const dayNum = getDayOfMonth(day.date);
  const tier = TIERS[day.tier];
  const isBooked = day.isBooked;

  return (
    <button
      onClick={() => onClick(day)}
      disabled={isBooked}
      aria-label={`${dayNum} — ${tier.label}${isBooked ? " (réservé)" : ""}`}
      className={cn(
        "group relative flex h-9 w-full items-center justify-center border border-transparent text-xs font-medium transition-all sm:h-10",
        isBooked
          ? "cursor-not-allowed bg-tier-booked/40 text-muted line-through"
          : "cursor-pointer hover:border-accent"
      )}
    >
      <span className={cn("relative z-10", isBooked ? "text-muted" : "text-foreground")}>
        {dayNum}
      </span>
      {!isBooked && (
        <div
          className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30"
          style={{ backgroundColor: tier.color }}
        />
      )}
    </button>
  );
}
