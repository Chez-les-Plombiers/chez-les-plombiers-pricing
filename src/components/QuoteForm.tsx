"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import type { DayPricing, TimeSlot } from "@/types";
import { TIME_SLOT_LABELS } from "@/types";
import { formatDateFR, formatPrice } from "@/lib/date-utils";
import { trackEvent } from "@/lib/analytics";

interface SireneResult {
  nom_complet: string;
  siren: string;
  siege: {
    siret: string;
    adresse: string;
    commune: string;
  };
}

interface QuoteFormProps {
  day: DayPricing;
  allDays: DayPricing[];
  timeSlot: TimeSlot;
  onBack: () => void;
  onSuccess: () => void;
}

const EVENT_TYPES = [
  "Défilé / Fashion show",
  "Lancement produit",
  "Cocktail / Soirée",
  "Petit-déjeuner",
  "Tournage / Shooting",
  "Conférence / Séminaire",
  "Formation",
  "Exposition",
  "Pop-up store",
  "Autre",
];

/** Add N days to a YYYY-MM-DD string */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export function QuoteForm({ day, allDays, timeSlot, onBack, onSuccess }: QuoteFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [numberOfDays, setNumberOfDays] = useState(1);

  // Build a lookup map for consecutive days pricing
  const dayMap = useMemo(() => {
    const map = new Map<string, DayPricing>();
    for (const d of allDays) map.set(d.date, d);
    return map;
  }, [allDays]);

  // Compute consecutive days info
  const consecutiveDays = useMemo(() => {
    const days: { date: string; price: number; available: boolean }[] = [];
    for (let i = 0; i < numberOfDays; i++) {
      const date = addDays(day.date, i);
      const dp = dayMap.get(date);
      if (dp) {
        const slotBooked =
          dp.isBooked ||
          (timeSlot === "matinee" && dp.isBookedMorning) ||
          (timeSlot === "apres-midi" && dp.isBookedAfternoon) ||
          (timeSlot === "journee-complete" && (dp.isBookedMorning || dp.isBookedAfternoon));
        days.push({ date, price: dp.prices[timeSlot], available: !slotBooked });
      } else {
        days.push({ date, price: 0, available: false });
      }
    }
    return days;
  }, [day.date, numberOfDays, dayMap, timeSlot]);

  const totalPrice = consecutiveDays.reduce((sum, d) => sum + d.price, 0);
  const hasUnavailable = consecutiveDays.some((d) => !d.available);

  // Autocomplete state
  const [companyQuery, setCompanyQuery] = useState("");
  const [siret, setSiret] = useState("");
  const [suggestions, setSuggestions] = useState<SireneResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingCompany, setSearchingCompany] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const searchCompany = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setSearchingCompany(true);
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&per_page=5`
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSuggestions(true);
      }
    } catch {
      // Silently fail — user can still type manually
    } finally {
      setSearchingCompany(false);
    }
  }, []);

  function handleCompanyChange(value: string) {
    setCompanyQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCompany(value), 300);
  }

  function selectSuggestion(result: SireneResult) {
    setCompanyQuery(result.nom_complet);
    setSiret(result.siege.siret);
    setShowSuggestions(false);
    setSuggestions([]);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      date: day.date,
      timeSlot,
      numberOfDays,
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      company: companyQuery || undefined,
      siret: siret || undefined,
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

      trackEvent("quote_form_submit", {
        date: day.date,
        time_slot: timeSlot,
        event_type: payload.eventType,
        price: day.prices[timeSlot],
        guest_count: payload.guestCount,
      });
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {formatDateFR(day.date)}
            {numberOfDays > 1 && ` → ${formatDateFR(addDays(day.date, numberOfDays - 1))}`}
            {" "}— {TIME_SLOT_LABELS[timeSlot]}
          </p>
          <select
            value={numberOfDays}
            onChange={(e) => setNumberOfDays(parseInt(e.target.value, 10))}
            className="border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground focus:border-accent focus:outline-none"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} jour{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
        {numberOfDays > 1 && (
          <div className="mt-2 flex flex-col gap-1">
            {consecutiveDays.map((cd) => (
              <div key={cd.date} className="flex items-center justify-between text-xs">
                <span className={cd.available ? "text-muted" : "text-tier-premium line-through"}>
                  {formatDateFR(cd.date)}
                </span>
                <span className={`font-mono ${cd.available ? "text-muted" : "text-tier-premium"}`}>
                  {cd.available ? `${formatPrice(cd.price)} HT` : "Indisponible"}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {numberOfDays > 1 ? "Total" : "Prix"}
          </span>
          <span className="font-mono font-bold text-accent">
            {formatPrice(totalPrice)} HT
          </span>
        </div>
        {hasUnavailable && numberOfDays > 1 && (
          <p className="mt-1 text-[10px] text-tier-premium">
            Certains jours sont indisponibles pour ce créneau.
          </p>
        )}
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
        {/* Entreprise autocomplete */}
        <div ref={wrapperRef} className="relative">
          <div className="relative">
            <input
              value={companyQuery}
              onChange={(e) => handleCompanyChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Entreprise"
              autoComplete="off"
              className="w-full border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            {searchingCompany && (
              <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
            )}
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 z-50 max-h-48 overflow-y-auto border border-border bg-surface">
              {suggestions.map((result) => (
                <li key={result.siren}>
                  <button
                    type="button"
                    onClick={() => selectSuggestion(result)}
                    className="w-full px-3 py-2 text-left transition-colors hover:bg-accent/10"
                  >
                    <span className="block text-sm text-foreground">
                      {result.nom_complet}
                    </span>
                    <span className="block font-mono text-xs text-muted">
                      SIRET {result.siege.siret} — {result.siege.commune}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          value={siret}
          onChange={(e) => setSiret(e.target.value)}
          placeholder="SIRET"
          readOnly={siret.length === 14}
          className="font-mono border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none read-only:text-muted"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="guestCount"
            type="number"
            min="1"
            max="200"
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
