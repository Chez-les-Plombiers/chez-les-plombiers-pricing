"use client";

import { useRef, useCallback, useState, useMemo } from "react";
import type { DayPricing } from "@/types";
import { groupByMonth } from "@/lib/pricing-engine";
import { MonthGrid } from "./MonthGrid";
import { MonthNavigator } from "./MonthNavigator";
import { TierLegend } from "./TierLegend";
import { DayModal } from "./DayModal";

export interface WindowMonth {
  year: number;
  month: number; // 0-11
}

interface CalendarHeatmapProps {
  days: DayPricing[];
  months: WindowMonth[];
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function CalendarHeatmap({ days, months }: CalendarHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<DayPricing | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const handleMonthClick = useCallback((key: string) => {
    setActiveKey(key);
    monthRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        <MonthNavigator months={months} activeKey={activeKey} onMonthClick={handleMonthClick} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {months.map(({ year, month }) => {
          const key = monthKey(year, month);
          return (
            <div
              key={key}
              ref={(el) => { monthRefs.current[key] = el; }}
            >
              <MonthGrid
                month={month}
                year={year}
                days={byMonth[key] || []}
                today={today}
                onDayClick={handleDayClick}
              />
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <DayModal day={selectedDay} allDays={days} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  );
}
