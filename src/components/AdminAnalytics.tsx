"use client";
import { apiUrl } from "@/lib/base-path";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getVenue, listVenues, DEFAULT_VENUE, type VenueSlug } from "@/lib/venues";

/**
 * Le panneau Analytics, sorti du calendrier le 26/09/2026.
 *
 * ⚠️ Il y vivait en tiroir, derriere un bouton. Retirer le calendrier de la
 * navigation l'aurait donc emporte avec lui, alors qu'Etienne le veut — il
 * est devenu une page a part entiere.
 *
 * Le selecteur de lieu reste ICI, contrairement au reste de l'administration :
 * les chiffres different reellement d'un lieu a l'autre, et le panneau a deja
 * affiche le meme total quel que soit le choix, ce qui laissait croire a un
 * bug d'affichage.
 */
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

export function AdminAnalytics({ token }: { token: string }) {
  const [venueSlug, setVenueSlug] = useState<VenueSlug>(DEFAULT_VENUE);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const venue = getVenue(venueSlug);

  // ⚠️ Le drapeau `vivant` n'est pas decoratif : changer de lieu relance un
  // appel avant que le precedent soit revenu. Sans lui, la reponse la plus
  // lente ecrase la plus recente et le panneau affiche les chiffres d'un
  // autre lieu que celui qui est selectionne.
  useEffect(() => {
    let vivant = true;
    fetch(apiUrl(`/api/analytics?venue=${venueSlug}`), {
      headers: { Authorization: token },
    })
      .then((r) => r.json())
      .then((d) => {
        if (vivant) setAnalytics(d);
      })
      .catch(() => {
        if (vivant) setAnalytics(null);
      });
    return () => {
      vivant = false;
    };
  }, [venueSlug, token]);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Lieu" className="flex flex-wrap gap-px border border-border bg-border">
        {listVenues().map((v) => (
          <button
            key={v.slug}
            type="button"
            onClick={() => setVenueSlug(v.slug)}
            aria-current={v.slug === venueSlug ? "true" : undefined}
            className={cn(
              "flex-1 basis-32 px-4 py-2.5 text-left font-mono text-[11px] font-bold uppercase tracking-widest transition-colors",
              v.slug === venueSlug
                ? "bg-card text-accent"
                : "bg-background text-muted hover:bg-card hover:text-foreground"
            )}
          >
            {v.name}
          </button>
        ))}
      </nav>

      {!analytics ? (
        <p className="font-mono text-xs text-muted">Aucune donnée.</p>
      ) : (
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
    </div>
  );
}
