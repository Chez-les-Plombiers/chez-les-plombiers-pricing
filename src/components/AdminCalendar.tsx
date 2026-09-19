"use client";
import { apiUrl } from "@/lib/base-path";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import type { DayPricing } from "@/types";
import { groupByMonth } from "@/lib/pricing-engine";
import { TIERS } from "@/lib/tier-config";
import { getMonthNameFR, getDayLetters, getISODayOfWeek, getDayOfMonth } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { getVenue, listVenues, hasSlots, DEFAULT_VENUE, type VenueSlug } from "@/lib/venues";
import { AdminDayEditor } from "./AdminDayEditor";
import { BarChart3, MessageSquare, RefreshCw, TrendingUp, ChevronDown, ChevronUp, Phone, Mail, Building2, Calendar, Users, Clock, Wallet } from "lucide-react";

interface AdminCalendarProps {
  token: string;
}

interface AnalyticsData {
  venue: VenueSlug;
  totalViews: number;
  totalQuotes: number;
  measuredSince: string | null;
  legacyCount: number;
  byWeekday: Array<{ iso: number; label: string; views: number; quotes: number }>;
  byMonth: Array<{ key: string; label: string; views: number }>;
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
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);

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

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/analytics?venue=${venueSlug}`), {
        headers: { Authorization: token },
      });
      const data = await res.json();
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    }
  }, [venueSlug, token]);

  // Le panneau suit le lieu sélectionné : auparavant il affichait le même
  // total quoi qu'on choisisse, ce qui laissait croire à un bug d'affichage
  // alors que le lieu n'était simplement pas enregistré.
  useEffect(() => {
    if (showAnalytics) fetchAnalytics();
  }, [showAnalytics, fetchAnalytics]);

  const fetchQuotes = async () => {
    try {
      const res = await fetch(apiUrl("/api/quote"), {
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
        <Link
          href="/admin/finances"
          className="flex items-center gap-2 border border-accent bg-accent px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-background transition-colors hover:bg-accent-hover"
        >
          <Wallet className="h-3 w-3" />
          Finances
        </Link>
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
        <div className="flex flex-col gap-4 border border-border bg-card p-4">
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-accent">
              Intérêt mesuré — {venue.name}
            </h3>
            <p className="mt-1 text-xs text-muted">
              {analytics.totalViews} consultation
              {analytics.totalViews > 1 ? "s" : ""} de date et{" "}
              {analytics.totalQuotes} demande
              {analytics.totalQuotes > 1 ? "s" : ""} de devis
              {analytics.measuredSince
                ? ` depuis le ${new Date(analytics.measuredSince).toLocaleDateString("fr-FR")}`
                : ""}
              .
            </p>
          </div>

          {/*
            L'agrégat par jour de la semaine est le seul qui réponde à la
            question tarifaire : un jour très consulté mais jamais devisé
            signale un prix mal placé, un jour jamais consulté signale une
            absence de demande — qu'aucune baisse de prix ne corrigera.
          */}
          <div>
            <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
              Par jour de la semaine
            </h4>
            <div className="flex flex-col gap-1">
              {(() => {
                const max = Math.max(1, ...analytics.byWeekday.map((d) => d.views));
                return analytics.byWeekday.map((d) => (
                  <div key={d.iso} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-muted">{d.label}</span>
                    <div className="h-4 flex-1 bg-surface">
                      <div
                        className="h-full bg-accent/50"
                        style={{ width: `${(d.views / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right font-mono text-xs text-foreground">
                      {d.views} vue{d.views > 1 ? "s" : ""}
                    </span>
                    <span
                      className={cn(
                        "w-20 shrink-0 text-right font-mono text-xs",
                        d.quotes > 0 ? "text-accent" : "text-muted"
                      )}
                    >
                      {d.quotes} devis
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {analytics.byMonth.length > 0 && (
            <div>
              <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                Par mois consulté
              </h4>
              <div className="flex flex-wrap gap-1">
                {analytics.byMonth.map((m) => (
                  <span
                    key={m.key}
                    className="border border-border bg-surface px-2 py-1 font-mono text-[10px] text-muted"
                  >
                    {m.label}{" "}
                    <span className="text-foreground">{m.views}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {analytics.topDates.length > 0 && (
            <div>
              <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                Dates les plus consultées
              </h4>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                {analytics.topDates.map(({ date, count }) => (
                  <div
                    key={date}
                    className="flex justify-between border border-border bg-surface px-2 py-1"
                  >
                    <span className="text-xs text-foreground">{date}</span>
                    <span className="font-mono text-xs text-accent">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.legacyCount > 0 && (
            <p className="border-t border-border pt-2 text-[10px] text-muted">
              {analytics.legacyCount} consultation
              {analytics.legacyCount > 1 ? "s" : ""} enregistrée
              {analytics.legacyCount > 1 ? "s" : ""} avant le passage en
              multi-lieux ne portent pas de lieu : elles sont attribuées à
              L&apos;ATELIER, seul lieu affiché à l&apos;époque.
            </p>
          )}
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
                        {/*
                          La date de réception, pas celle de l'évènement : on
                          consulte cette liste pour vérifier qu'aucune demande
                          n'a été manquée. La date de l'évènement reste dans
                          le détail dépliable.
                        */}
                        <span className="text-xs text-muted">Reçu le {createdFr}</span>
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

    </div>
  );
}
