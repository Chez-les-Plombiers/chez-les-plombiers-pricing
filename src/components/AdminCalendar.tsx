"use client";
import { apiUrl } from "@/lib/base-path";

import { useState, useCallback, useEffect } from "react";
import type { DayPricing } from "@/types";
import { groupByMonth } from "@/lib/pricing-engine";
import { TIERS } from "@/lib/tier-config";
import { getMonthNameFR, getDayLetters, getISODayOfWeek, getDayOfMonth } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { getVenue, listVenues, hasSlots, DEFAULT_VENUE, type VenueSlug } from "@/lib/venues";
import { AdminDayEditor } from "./AdminDayEditor";

interface AdminCalendarProps {
  token: string;
}

export function AdminCalendar({ token }: AdminCalendarProps) {
  const [venueSlug, setVenueSlug] = useState<VenueSlug>(DEFAULT_VENUE);
  const [windowStart, setWindowStart] = useState<{ year: number; month: number } | null>(null);
  const [days, setDays] = useState<DayPricing[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayPricing | null>(null);
  const [loading, setLoading] = useState(true);
  void loading; // la grille se remplit d'elle-meme ; l'indicateur vivait dans
                // la barre d'outils, partie avec elle.

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/pricing?venue=${venueSlug}`));
      const data = await res.json();
      setDays(data.days ?? []);
      // La fenêtre vient de l'API : elle glisse sur 12 mois et peut être à
      // cheval sur deux années. L'admin ne doit plus supposer « 2026 ».
      if (typeof data.startYear === "number") {
        setWindowStart({ year: data.startYear, month: data.startMonth });
      }
    } catch {
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [venueSlug]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);




  const venue = getVenue(venueSlug);
  const byMonth = groupByMonth(days);

  // Les mois affichés suivent la fenêtre renvoyée par l'API. L'ancienne
  // version bouclait sur « 12 mois de 2026 » et indexait `byMonth` par numéro
  // de mois, alors que le groupement est clé en "AAAA-MM" : la grille
  // ressortait vide. Deux bugs corrigés d'un coup.
  const windowMonths = Array.from({ length: 12 }, (_, i) => {
    if (!windowStart) return null;
    const abs = windowStart.month + i;
    return { year: windowStart.year + Math.floor(abs / 12), month: abs % 12 };
  }).filter((m): m is { year: number; month: number } => m !== null);

  return (
    <div className="flex flex-col gap-6">
      {/*
        Sélecteur de lieu. L'admin pilote les trois lieux depuis la même URL
        (/admin) : chaque lieu a sa propre grille de surcharges en base, et
        c'est le paramètre `?venue=` qui décide laquelle on lit et on écrit.
      */}
      <nav aria-label="Lieu administré" className="flex flex-wrap gap-px border border-border bg-border">
        {listVenues().map((v) => {
          const active = v.slug === venueSlug;
          return (
            <button
              key={v.slug}
              type="button"
              onClick={() => { setSelectedDay(null); setVenueSlug(v.slug); }}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex-1 basis-32 px-4 py-3 text-left font-mono text-xs font-bold uppercase tracking-widest transition-colors",
                active
                  ? "bg-card text-accent"
                  : "bg-background text-muted hover:bg-card hover:text-foreground"
              )}
            >
              {v.name}
            </button>
          );
        })}
      </nav>


      {/* Calendar grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {windowMonths.map(({ year, month }) => {
          const key = `${year}-${String(month + 1).padStart(2, "0")}`;
          const monthDays = byMonth[key] || [];
          const dayLetters = getDayLetters();
          const firstDayISO = monthDays.length > 0 ? getISODayOfWeek(monthDays[0].date) : 1;
          const emptySlots = firstDayISO - 1;

          return (
            <div key={key} className="border border-border bg-card p-3">
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
                  <div key={`e-${i}`} />
                ))}
                {monthDays.map((day) => {
                  const tier = TIERS[day.tier];
                  const fullyBooked = day.isBooked || (day.isBookedMorning && day.isBookedAfternoon);
                  const hasHalfBooking =
                    hasSlots(venue) &&
                    !fullyBooked &&
                    (day.isBookedMorning || day.isBookedAfternoon);
                  const hasOption =
                    day.isOption || day.isOptionMorning || day.isOptionAfternoon;
                  return (
                    <button
                      key={day.date}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "group relative flex h-9 w-full items-center justify-center text-xs font-medium transition-all sm:h-10",
                        "cursor-pointer border border-transparent hover:border-accent",
                        day.isOverride && "ring-1 ring-accent/50"
                      )}
                    >
                      <span className="relative z-10 text-foreground">
                        {getDayOfMonth(day.date)}
                      </span>
                      {hasOption && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage:
                              "repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.55) 3px 6px)",
                          }}
                          aria-hidden
                        />
                      )}
                      {/* Full day booked or no half-day booking: single background */}
                      {!hasHalfBooking && (
                        <div
                          className={cn(
                            "absolute inset-0 opacity-20 group-hover:opacity-30",
                            fullyBooked && "opacity-40"
                          )}
                          style={{ backgroundColor: fullyBooked ? "#404040" : tier.color }}
                        />
                      )}
                      {/* Half-day booking: split display */}
                      {hasHalfBooking && (
                        <>
                          <div
                            className={cn(
                              "absolute inset-y-0 left-0 w-1/2",
                              day.isBookedMorning
                                ? "bg-tier-booked/80"
                                : "opacity-20 group-hover:opacity-30"
                            )}
                            style={!day.isBookedMorning ? { backgroundColor: tier.color } : undefined}
                          />
                          <div
                            className={cn(
                              "absolute inset-y-0 right-0 w-1/2",
                              day.isBookedAfternoon
                                ? "bg-tier-booked/80"
                                : "opacity-20 group-hover:opacity-30"
                            )}
                            style={!day.isBookedAfternoon ? { backgroundColor: tier.color } : undefined}
                          />
                          <div className="absolute inset-y-1 left-1/2 w-px bg-background/20" />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day editor modal */}
      {selectedDay && (
        <AdminDayEditor
          day={selectedDay}
          venue={venue}
          token={token}
          onClose={() => setSelectedDay(null)}
          onSaved={() => {
            setSelectedDay(null);
            fetchPricing();
          }}
        />
      )}

    </div>
  );
}
