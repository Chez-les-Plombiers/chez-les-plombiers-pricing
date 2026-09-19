"use client";
import { apiUrl } from "@/lib/base-path";

import { useCallback, useState, useMemo } from "react";
import type { DayPricing } from "@/types";
import type { VenueConfig } from "@/lib/venues";
import { groupByMonth } from "@/lib/pricing-engine";
import { cn } from "@/lib/utils";
import { MonthGrid } from "./MonthGrid";
import { TierLegend } from "./TierLegend";
import { DayModal } from "./DayModal";

export interface WindowMonth {
  year: number;
  month: number; // 0-11
}

interface CalendarHeatmapProps {
  days: DayPricing[];
  months: WindowMonth[];
  venue: VenueConfig;
}

/** Nombre de mois affichés d'emblée sur mobile. */
const MOBILE_MONTHS = 4;

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function CalendarHeatmap({ days, months, venue }: CalendarHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<DayPricing | null>(null);
  /**
   * Sur mobile on n'affiche d'abord que les premiers mois : douze grilles
   * font une page interminable au doigt. Sur tablette et ordinateur, où les
   * mois tiennent sur 2 à 4 colonnes, tout reste visible d'emblée — d'où un
   * masquage purement CSS plutôt qu'un découpage du tableau, qui aurait aussi
   * privé le grand écran des mois suivants.
   */
  const [showAllMonths, setShowAllMonths] = useState(false);
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const handleDayClick = useCallback((day: DayPricing) => {
    setSelectedDay(day);
    // Track analytics
    fetch(apiUrl("/api/analytics"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: day.date, venue: venue.slug }),
    }).catch(() => {});
  }, [venue.slug]);

  const byMonth = groupByMonth(days);

  return (
    <div className="flex flex-col gap-6">
      {/*
        Les ancres de mois ont été retirées : sur mobile tout le monde fait
        défiler, et douze pastilles de navigation repoussaient le calendrier
        encore plus bas — exactement l'inverse de l'effet recherché.
      */}
      <TierLegend venue={venue} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {months.map(({ year, month }, index) => {
          const key = monthKey(year, month);
          const hiddenOnMobile = !showAllMonths && index >= MOBILE_MONTHS;
          return (
            <div key={key} className={cn(hiddenOnMobile && "hidden sm:block")}>
              <MonthGrid
                month={month}
                year={year}
                days={byMonth[key] || []}
                today={today}
                venue={venue}
                onDayClick={handleDayClick}
              />
            </div>
          );
        })}
      </div>

      {!showAllMonths && months.length > MOBILE_MONTHS && (
        <button
          type="button"
          onClick={() => setShowAllMonths(true)}
          className="border border-border px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent sm:hidden"
        >
          Voir les {months.length - MOBILE_MONTHS} mois suivants
        </button>
      )}

      {selectedDay && (
        <DayModal
          day={selectedDay}
          allDays={days}
          venue={venue}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
