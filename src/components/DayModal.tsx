"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Sparkles, Clock } from "lucide-react";
import type { DayPricing, TimeSlot } from "@/types";
import { TIME_SLOT_LABELS } from "@/types";
import type { VenueConfig } from "@/lib/venues";
import { hasSlots } from "@/lib/venues";
import { TIERS } from "@/lib/tier-config";
import { formatDateFR, formatDayOfWeekFR, formatPrice } from "@/lib/date-utils";
import { QuoteForm } from "./QuoteForm";
import { trackEvent } from "@/lib/analytics";

interface DayModalProps {
  day: DayPricing;
  allDays: DayPricing[];
  venue: VenueConfig;
  onClose: () => void;
}

export function DayModal({ day, allDays, venue, onClose }: DayModalProps) {
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const tier = TIERS[day.tier];
  const multiSlot = hasSlots(venue);
  const isFashionWeek = day.tier === "fashion-week";
  const hasOption = day.isOption || day.isOptionMorning || day.isOptionAfternoon;

  function handleQuoteClick(slot: TimeSlot) {
    trackEvent("quote_form_open", {
      venue: venue.slug,
      date: day.date,
      time_slot: slot,
      price: day.prices[slot],
    });
    setSelectedSlot(slot);
    setShowQuoteForm(true);
  }

  function isSlotBooked(slot: TimeSlot): boolean {
    if (day.isBooked) return true;
    if (!multiSlot) return false;
    if (slot === "matinee") return day.isBookedMorning;
    if (slot === "apres-midi") return day.isBookedAfternoon;
    return day.isBookedMorning || day.isBookedAfternoon;
  }

  function isSlotOptioned(slot: TimeSlot): boolean {
    if (day.isOption) return true;
    if (!multiSlot) return false;
    if (slot === "matinee") return day.isOptionMorning;
    if (slot === "apres-midi") return day.isOptionAfternoon;
    return day.isOptionMorning || day.isOptionAfternoon;
  }

  // Fashion Week sur L'ATELIER : journée complète uniquement.
  const slots = venue.slots.filter(
    (slot) => !isFashionWeek || slot === "journee-complete"
  );

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-mono text-lg font-bold uppercase tracking-wider text-foreground">
                {formatDayOfWeekFR(day.date)} {formatDateFR(day.date)}
              </Dialog.Title>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-venue">
                {venue.name}
              </p>

              {isFashionWeek ? (
                <div className="mt-2 inline-flex items-center gap-1.5 border border-tier-fashion-week/60 px-2 py-0.5">
                  <Sparkles className="h-3 w-3 text-tier-fashion-week" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-tier-fashion-week">
                    {day.reason}
                  </span>
                </div>
              ) : (
                venue.useTiers && (
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5"
                      style={{ backgroundColor: tier.color }}
                      aria-hidden
                    />
                    {/*
                      Le motif n'est affiché que s'il apprend quelque chose.
                      Sur un jour ordinaire il vaut le nom du jour, mais une
                      surcharge admin peut l'avoir fixé au libellé du palier —
                      d'où le « Demande basse — Demande basse » observé.
                    */}
                    <span className="text-sm text-muted">
                      {day.reason && day.reason !== tier.label
                        ? `${tier.label} — ${day.reason}`
                        : tier.label}
                    </span>
                  </div>
                )
              )}
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="shrink-0 text-muted transition-colors hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Une option ne bloque pas : elle presse. */}
          {hasOption && !day.isBooked && (
            <div className="mt-4 flex items-start gap-2 border border-option/60 bg-option/10 px-3 py-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-option" />
              <p className="text-xs text-foreground">
                <span className="font-mono uppercase tracking-wider text-option">
                  Option posée
                </span>{" "}
                — cette date est en cours de réservation. Elle peut encore se
                libérer : contactez-nous rapidement si elle vous intéresse.
              </p>
            </div>
          )}

          {!showQuoteForm ? (
            <div className="mt-6 flex flex-col gap-2">
              {slots.map((slot) => {
                const booked = isSlotBooked(slot);
                const optioned = isSlotOptioned(slot);
                return (
                  <div
                    key={slot}
                    className={`flex items-center justify-between gap-3 border border-border bg-surface p-3 ${
                      booked ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">
                        {multiSlot ? TIME_SLOT_LABELS[slot] : "Journée entière"}
                      </span>
                      {booked && (
                        <span className="text-[10px] text-muted">Réservé</span>
                      )}
                      {!booked && optioned && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-option">
                          Sous option
                        </span>
                      )}
                    </div>

                    {!booked && (
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-bold text-accent">
                          {formatPrice(day.prices[slot])}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuoteClick(slot)}
                          className="shrink-0 border border-accent px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-background"
                        >
                          Devis
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <p className="mt-2 text-[10px] text-muted">
                Prix HT — location seule, hors prestations.
              </p>
            </div>
          ) : (
            <QuoteForm
              day={day}
              allDays={allDays}
              venue={venue}
              timeSlot={selectedSlot ?? "journee-complete"}
              onBack={() => setShowQuoteForm(false)}
              onSuccess={onClose}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
