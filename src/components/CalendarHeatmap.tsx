"use client";

import { useRef, useCallback, useState } from "react";
import type { DayPricing } from "@/types";
import { groupByMonth } from "@/lib/pricing-engine";
import { MonthGrid } from "./MonthGrid";
import { MonthNavigator } from "./MonthNavigator";
import { TierLegend } from "./TierLegend";
import { DayModal } from "./DayModal";

interface CalendarHeatmapProps {
  days: DayPricing[];
  year: number;
}

export function CalendarHeatmap({ days, year }: CalendarHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<DayPricing | null>(null);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const monthRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleMonthClick = useCallback((month: number) => {
    setActiveMonth(month);
    monthRefs.current[month]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleDayClick = useCallback((day: DayPricing) => {
    setSelectedDay(day);
    // Track analytics
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: day.date }),
    }).catch(() => {});
  }, []);

  const byMonth = groupByMonth(days);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TierLegend />
        <MonthNavigator activeMonth={activeMonth} onMonthClick={handleMonthClick} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, month) => (
          <div
            key={month}
            ref={(el) => { monthRefs.current[month] = el; }}
          >
            <MonthGrid
              month={month}
              year={year}
              days={byMonth[month] || []}
              onDayClick={handleDayClick}
            />
          </div>
        ))}
      </div>

      {selectedDay && (
        <DayModal day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  );
}
