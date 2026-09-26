"use client";
import { apiUrl } from "@/lib/base-path";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Phone, Mail, Building2, Calendar, Users, Clock } from "lucide-react";
import type { VenueSlug } from "@/lib/venues";

/**
 * Les demandes de devis, sorties du calendrier le 26/09/2026 — meme raison
 * que pour Analytics : elles vivaient en tiroir derriere un bouton du
 * calendrier, qui ne figure plus dans la navigation.
 */
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

export function AdminDevis({ token }: { token: string }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    fetch(apiUrl("/api/quote"), { headers: { Authorization: token } })
      .then((r) => r.json())
      .then((d) => {
        if (vivant) setQuotes(d.quotes || []);
      })
      .catch(() => {
        if (vivant) setQuotes([]);
      });
    return () => {
      vivant = false;
    };
  }, [token]);

  return (
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
  );
}
