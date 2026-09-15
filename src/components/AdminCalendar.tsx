"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import type { DayPricing } from "@/types";
import { groupByMonth } from "@/lib/pricing-engine";
import { TIERS } from "@/lib/tier-config";
import { getMonthNameFR, getDayLetters, getISODayOfWeek, getDayOfMonth } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { getVenue, listVenues, hasSlots, DEFAULT_VENUE, type VenueSlug } from "@/lib/venues";
import { AdminDayEditor } from "./AdminDayEditor";
import { AdminBulkEditor } from "./AdminBulkEditor";
import { Layers, BarChart3, MessageSquare, RefreshCw, TrendingUp, ChevronDown, ChevronUp, Phone, Mail, Building2, Calendar, Users, Clock, Wallet } from "lucide-react";

interface AdminCalendarProps {
  token: string;
}

interface AnalyticsData {
  totalViews: number;
  topDates: Array<{ date: string; count: number }>;
}

interface Quote {
  id: string;
  venue?: VenueSlug;
  date: string;
  timeSlot: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  siret?: string;
  endClient?: string;
  numberOfDays: number;
  guestCount: number;
  eventType: string;
  message?: string;
  createdAt: string;
}

export function AdminCalendar({ token }: AdminCalendarProps) {
  const [venueSlug, setVenueSlug] = useState<VenueSlug>(DEFAULT_VENUE);
  const [windowStart, setWindowStart] = useState<{ year: number; month: number } | null>(null);
  const [days, setDays] = useState<DayPricing[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayPricing | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pricing?venue=${venueSlug}`);
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
        <Link
          href="/admin/projections"
          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <TrendingUp className="h-3 w-3" />
          Projections
        </Link>
        <Link
          href="/admin/finances"
          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Wallet className="h-3 w-3" />
          Finances
        </Link>
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
            Demandes de devis ({quotes.length}) — tous lieux confondus
          </h3>
          {quotes.length === 0 ? (
            <p className="text-xs text-muted">
              Aucune demande de devis pour le moment.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {quotes.map((q) => {
                const isExpanded = expandedQuote === q.id;
                const [y, m, d] = q.date.split("-");
                const dateFr = `${d}/${m}/${y}`;
                const createdDate = new Date(q.createdAt);
                const createdFr = createdDate.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const slotLabels: Record<string, string> = {
                  matinee: "Matinée",
                  "apres-midi": "Après-midi",
                  "journee-complete": "Journée complète",
                };
                return (
                  <div key={q.id} className="border border-border bg-surface">
                    <button
                      onClick={() => setExpandedQuote(isExpanded ? null : q.id)}
                      className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-background/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {q.firstName} {q.lastName}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                          {q.eventType}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted">{dateFr}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 text-muted" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-muted" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border px-3 pb-3 pt-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted" />
                            <a href={`mailto:${q.email}`} className="text-xs text-accent hover:underline">{q.email}</a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted" />
                            <a href={`tel:${q.phone}`} className="text-xs text-accent hover:underline">{q.phone}</a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted" />
                            <span className="text-xs text-foreground">
                              {dateFr}{q.numberOfDays > 1 ? ` (${q.numberOfDays} jours)` : ""} — {slotLabels[q.timeSlot] || q.timeSlot}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-muted" />
                            <span className="text-xs text-foreground">{q.guestCount} invités</span>
                          </div>
                          {q.company && (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-muted" />
                              <span className="text-xs text-foreground">
                                {q.company}{q.siret ? ` — SIRET ${q.siret}` : ""}
                              </span>
                            </div>
                          )}
                          {q.endClient && (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-muted" />
                              <span className="text-xs text-foreground">Client final : {q.endClient}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted" />
                            <span className="text-xs text-muted">Reçu le {createdFr}</span>
                          </div>
                        </div>
                        {q.message && (
                          <div className="mt-2 border-t border-border pt-2">
                            <p className="text-xs text-foreground">{q.message}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

      {/* Bulk editor modal */}
      {showBulk && (
        <AdminBulkEditor
          venue={venue}
          windowStart={windowStart}
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
