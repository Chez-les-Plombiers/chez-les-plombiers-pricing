"use client";

import type { WindowMonth } from "./CalendarHeatmap";
import { getMonthNameShortFR } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface MonthNavigatorProps {
  months: WindowMonth[];
  activeKey: string | null;
  onMonthClick: (key: string) => void;
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function MonthNavigator({ months, activeKey, onMonthClick }: MonthNavigatorProps) {
  const startYear = months[0]?.year;

  return (
    <div className="flex flex-wrap gap-1 sm:hidden">
      {months.map(({ year, month }) => {
        const key = monthKey(year, month);
        const label =
          year !== startYear
            ? `${getMonthNameShortFR(month)} '${String(year).slice(2)}`
            : getMonthNameShortFR(month);
        return (
          <button
            key={key}
            onClick={() => onMonthClick(key)}
            className={cn(
              "border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
              activeKey === key
                ? "border-accent bg-accent text-background"
                : "border-border text-muted hover:border-accent hover:text-accent"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
