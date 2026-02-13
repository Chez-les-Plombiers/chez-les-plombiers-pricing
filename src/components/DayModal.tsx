"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { DayPricing, TimeSlot } from "@/types";
import { TIME_SLOT_LABELS } from "@/types";
import { TIERS } from "@/lib/tier-config";
import { formatDateFR, formatDayOfWeekFR, formatPrice } from "@/lib/date-utils";
import { SaveBadge } from "./SaveBadge";
import { QuoteForm } from "./QuoteForm";

interface DayModalProps {
  day: DayPricing;
  onClose: () => void;
}

export function DayModal({ day, onClose }: DayModalProps) {
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const tier = TIERS[day.tier];

  const handleQuoteClick = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setShowQuoteForm(true);
  };

  const isSlotBooked = (slot: TimeSlot) => {
    if (day.isBooked) return true;
    if (slot === "matinee") return day.isBookedMorning;
    if (slot === "apres-midi") return day.isBookedAfternoon;
    if (slot === "journee-complete") return day.isBookedMorning || day.isBookedAfternoon;
    return false;
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="font-mono text-lg font-bold uppercase tracking-wider text-foreground">
                {formatDayOfWeekFR(day.date)} {formatDateFR(day.date)}
              </Dialog.Title>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5"
                  style={{ backgroundColor: tier.color }}
                />
                <span className="text-sm text-muted">
                  {tier.label} — {day.reason}
                </span>
              </div>
              <div className="mt-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                  {day.bookingWindowLabel}
                </span>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="text-muted transition-colors hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {!showQuoteForm ? (
            <div className="mt-6 flex flex-col gap-2">
              {(Object.keys(TIME_SLOT_LABELS) as TimeSlot[]).map((slot) => {
                const booked = isSlotBooked(slot);
                return (
                  <div
                    key={slot}
                    className={`flex items-center justify-between border border-border bg-surface p-3 ${booked ? "opacity-50" : ""}`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">
                        {TIME_SLOT_LABELS[slot]}
                      </span>
                      {booked && (
                        <span className="text-[10px] text-muted">Réservé</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {!booked && (
                        <>
                          <SaveBadge
                            bookingWindowCoeff={day.bookingWindowCoeff}
                          />
                          <span className="font-mono text-base font-bold text-accent">
                            {formatPrice(day.prices[slot])}
                          </span>
                          <button
                            onClick={() => handleQuoteClick(slot)}
                            className="border border-accent px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-background"
                          >
                            Devis
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <p className="mt-2 text-[10px] text-muted">
                Prix HT — Location seule, hors prestations
              </p>
            </div>
          ) : (
            <QuoteForm
              day={day}
              timeSlot={selectedSlot!}
              onBack={() => setShowQuoteForm(false)}
              onSuccess={onClose}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
