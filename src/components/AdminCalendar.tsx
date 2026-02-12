"use client";

import { useState, useCallback, useEffect } from "react";
import type { DayPricing } from "@/types";
import { groupByMonth } from "@/lib/pricing-engine";
import { TIERS } from "@/lib/tier-config";
import { getMonthNameFR, getDayLetters, getISODayOfWeek, getDayOfMonth } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { AdminDayEditor } from "./AdminDayEditor";
import { AdminBulkEditor } from "./AdminBulkEditor";
import { Layers, BarChart3, MessageSquare, RefreshCw } from "lucide-react";

interface AdminCalendarProps {
  token: string;
}

interface AnalyticsData {
  totalViews: number;
  topDates: Array<{ date: string; count: number }>;
}

interface Quote {
  id: string;
  date: string;
  firstName: string;
  lastName: string;
  email: string;
  eventType: string;
  createdAt: string;
}

export function AdminCalendar({ token }: AdminCalendarProps) {
  const [days, setDays] = useState<DayPricing[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayPricing | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pricing");
      const data = await res.json();
      setDays(data.days);
    } catch {
      // Fallback: empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics", {
        headers: { Authorization: token },
      });
      const data = await res.json();
      setAnalytics(data);
    } catch {
      // silently fail
    }
  };

  const fetchQuotes = async () => {
    try {
      const res = await fetch("/api/quote", {
        headers: { Authorization: token },
      });
      const data = await res.json();
      setQuotes(data.quotes || []);
    } catch {
      setQuotes([]);
    }
  };

  const byMonth = groupByMonth(days);

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowBulk(true)}
          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Layers className="h-3 w-3" />
          Édition en masse
        </button>
        <button
          onClick={() => {
            fetchAnalytics();
            setShowAnalytics(!showAnalytics);
          }}
          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <BarChart3 className="h-3 w-3" />
          Analytics
        </button>
        <button
          onClick={() => {
            fetchQuotes();
            setShowQuotes(!showQuotes);
          }}
          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <MessageSquare className="h-3 w-3" />
          Devis
        </button>
        <button
          onClick={fetchPricing}
          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          Rafraîchir
        </button>
      </div>

      {/* Analytics panel */}
      {showAnalytics && analytics && (
        <div className="border border-border bg-card p-4">
          <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-accent">
            Analytics — {analytics.totalViews} vues totales
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {analytics.topDates.slice(0, 8).map(({ date, count }) => (
              <div key={date} className="flex justify-between border border-border bg-surface p-2">
                <span className="text-xs text-foreground">{date}</span>
                <span className="font-mono text-xs text-accent">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quotes panel */}
      {showQuotes && (
        <div className="border border-border bg-card p-4">
          <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-accent">
            Demandes de devis
          </h3>
          {quotes.length === 0 ? (
            <p className="text-xs text-muted">
              Aucune demande de devis pour le moment.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {quotes.map((q) => (
                <div key={q.id} className="flex justify-between border border-border bg-surface p-2">
                  <span className="text-xs text-foreground">
                    {q.firstName} {q.lastName} — {q.eventType}
                  </span>
                  <span className="text-xs text-muted">{q.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, month) => {
          const monthDays = byMonth[month] || [];
          const dayLetters = getDayLetters();
          const firstDayISO = monthDays.length > 0 ? getISODayOfWeek(monthDays[0].date) : 1;
          const emptySlots = firstDayISO - 1;

          return (
            <div key={month} className="border border-border bg-card p-3">
              <h3 className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-accent">
                {getMonthNameFR(month)} 2026
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
                      <div
                        className={cn(
                          "absolute inset-0 opacity-20 group-hover:opacity-30",
                          day.isBooked && "opacity-40"
                        )}
                        style={{ backgroundColor: day.isBooked ? "#404040" : tier.color }}
                      />
                      {day.isOverride && (
                        <div className="absolute right-0.5 top-0.5 h-1.5 w-1.5 bg-accent" />
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
          token={token}
          onClose={() => setSelectedDay(null)}
          onSaved={() => {
            setSelectedDay(null);
            fetchPricing();
          }}
        />
      )}

      {/* Bulk editor modal */}
      {showBulk && (
        <AdminBulkEditor
          token={token}
          onClose={() => setShowBulk(false)}
          onSaved={() => {
            setShowBulk(false);
            fetchPricing();
          }}
        />
      )}
    </div>
  );
}
