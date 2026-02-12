"use client";

import { getMonthNameShortFR } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface MonthNavigatorProps {
  activeMonth: number | null;
  onMonthClick: (month: number) => void;
}

export function MonthNavigator({ activeMonth, onMonthClick }: MonthNavigatorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <button
          key={i}
          onClick={() => onMonthClick(i)}
          className={cn(
            "border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
            activeMonth === i
              ? "border-accent bg-accent text-background"
              : "border-border text-muted hover:border-accent hover:text-accent"
          )}
        >
          {getMonthNameShortFR(i)}
        </button>
      ))}
    </div>
  );
}
