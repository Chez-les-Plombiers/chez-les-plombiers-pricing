"use client";

import type { DayPricing } from "@/types";
import { getMonthNameFR, getDayLetters, getISODayOfWeek } from "@/lib/date-utils";
import { DayCell } from "./DayCell";

interface MonthGridProps {
  month: number;
  year: number;
  days: DayPricing[];
  onDayClick: (day: DayPricing) => void;
}

export function MonthGrid({ month, year, days, onDayClick }: MonthGridProps) {
  const dayLetters = getDayLetters();
  const firstDayISO = days.length > 0 ? getISODayOfWeek(days[0].date) : 1;
  const emptySlots = firstDayISO - 1;

  return (
    <div className="border border-border bg-card p-3">
      <h3 className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-accent">
        {getMonthNameFR(month)} {year}
      </h3>
      <div className="grid grid-cols-7 gap-px">
        {dayLetters.map((letter, i) => (
          <div
            key={i}
            className="flex h-6 items-center justify-center text-[10px] font-medium text-muted"
          >
            {letter}
          </div>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => (
          <DayCell key={day.date} day={day} onClick={onDayClick} />
        ))}
      </div>
    </div>
  );
}
