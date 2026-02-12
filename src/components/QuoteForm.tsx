"use client";

import { useState } from "react";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import type { DayPricing, TimeSlot } from "@/types";
import { TIME_SLOT_LABELS } from "@/types";
import { formatDateFR, formatPrice } from "@/lib/date-utils";

interface QuoteFormProps {
  day: DayPricing;
  timeSlot: TimeSlot;
  onBack: () => void;
  onSuccess: () => void;
}

const EVENT_TYPES = [
  "Défilé / Fashion show",
  "Lancement produit",
  "Cocktail / Soirée",
  "Tournage / Shooting",
  "Conférence / Séminaire",
  "Exposition",
  "Pop-up store",
  "Autre",
];

export function QuoteForm({ day, timeSlot, onBack, onSuccess }: QuoteFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      date: day.date,
      timeSlot,
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      company: form.get("company") as string,
      guestCount: parseInt(form.get("guestCount") as string, 10),
      eventType: form.get("eventType") as string,
      message: form.get("message") as string,
    };

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'envoi");
      }

      setSuccess(true);
      setTimeout(onSuccess, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 py-8">
        <div className="text-tier-low text-2xl">&#10003;</div>
        <p className="font-mono text-sm uppercase tracking-wider text-foreground">
          Demande envoyée
        </p>
        <p className="text-xs text-muted">
          Nous vous recontactons sous 24h.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-xs text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-3 w-3" />
        Retour aux tarifs
      </button>

      <div className="mb-4 border border-border bg-surface p-3">
        <p className="text-xs text-muted">
          {formatDateFR(day.date)} — {TIME_SLOT_LABELS[timeSlot]} —{" "}
          <span className="font-mono font-bold text-accent">
            {formatPrice(day.prices[timeSlot])} HT
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            name="firstName"
            required
            placeholder="Prénom *"
            className="border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <input
            name="lastName"
            required
            placeholder="Nom *"
            className="border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <input
          name="email"
          type="email"
          required
          placeholder="Email *"
          className="border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <input
          name="phone"
          type="tel"
          required
          placeholder="Téléphone *"
          className="border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <input
          name="company"
          placeholder="Entreprise"
          className="border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="guestCount"
            type="number"
            min="1"
            max="500"
            required
            placeholder="Nb invités *"
            className="border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <select
            name="eventType"
            required
            defaultValue=""
            className="border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="" disabled>
              Type d&apos;événement *
            </option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <textarea
          name="message"
          rows={3}
          placeholder="Message (optionnel)"
          className="border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />

        {error && (
          <p className="text-xs text-tier-premium">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 border border-accent bg-accent px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          Demander un devis
        </button>
      </form>
    </div>
  );
}
