"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, Trash2 } from "lucide-react";
import type { DayPricing, TierSlug, TimeSlot } from "@/types";
import { TIME_SLOT_LABELS } from "@/types";
import { TIERS } from "@/lib/tier-config";

// UI-visible tiers (merge premium/medium into one "Demande soutenue")
const UI_TIERS: { slug: TierSlug; label: string }[] = [
  { slug: "fashion-week", label: "Demande élevée (Fashion Week)" },
  { slug: "medium", label: "Demande moyenne" },
  { slug: "low", label: "Demande basse" },
];
import { formatDateFR, formatDayOfWeekFR } from "@/lib/date-utils";

interface AdminDayEditorProps {
  day: DayPricing;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminDayEditor({ day, token, onClose, onSaved }: AdminDayEditorProps) {
  const [tier, setTier] = useState<TierSlug>(day.tier);
  const [prices, setPrices] = useState(day.prices);
  const [isBooked, setIsBooked] = useState(day.isBooked);
  const [isBookedMorning, setIsBookedMorning] = useState(day.isBookedMorning);
  const [isBookedAfternoon, setIsBookedAfternoon] = useState(day.isBookedAfternoon);
  const [reason, setReason] = useState(day.reason);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFW = tier === "fashion-week";

  function handleTierChange(newTier: TierSlug) {
    setTier(newTier);
    // FW = journée complète only, reset half-day bookings
    if (newTier === "fashion-week") {
      setIsBookedMorning(false);
      setIsBookedAfternoon(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pricing/${day.date}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ tier, prices, isBooked, isBookedMorning, isBookedAfternoon, reason }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      onSaved();
    } catch {
      setError("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pricing/${day.date}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error("Erreur serveur");
      onSaved();
    } catch {
      setError("Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <Dialog.Title className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
              {formatDayOfWeekFR(day.date)} {formatDateFR(day.date)}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted hover:text-foreground" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {/* Tier selector */}
            <div>
              <label className="mb-1 block text-xs text-muted">Tier</label>
              <div className="flex gap-1">
                {UI_TIERS.map(({ slug, label }) => (
                  <button
                    key={slug}
                    onClick={() => handleTierChange(slug)}
                    className="flex-1 border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors"
                    style={{
                      borderColor: tier === slug ? TIERS[slug].color : "var(--border)",
                      backgroundColor: tier === slug ? TIERS[slug].color + "20" : "transparent",
                      color: tier === slug ? TIERS[slug].color : "var(--muted)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prices */}
            {(Object.keys(TIME_SLOT_LABELS) as TimeSlot[])
              .filter((slot) => !isFW || slot === "journee-complete")
              .map((slot) => (
              <div key={slot}>
                <label className="mb-1 block text-xs text-muted">
                  {TIME_SLOT_LABELS[slot]}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={prices[slot]}
                    onChange={(e) =>
                      setPrices((p) => ({ ...p, [slot]: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="w-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                  <span className="text-xs text-muted">EUR HT</span>
                </div>
              </div>
            ))}

            {/* Reason */}
            <div>
              <label className="mb-1 block text-xs text-muted">Raison</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Booked toggles */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isBooked}
                  onChange={(e) => setIsBooked(e.target.checked)}
                  className="accent-accent"
                />
                <span className="text-xs text-foreground">Journée complète réservée</span>
              </label>
              {!isBooked && !isFW && (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isBookedMorning}
                      onChange={(e) => setIsBookedMorning(e.target.checked)}
                      className="accent-accent"
                    />
                    <span className="text-xs text-foreground">Matinée réservée (7h-13h)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isBookedAfternoon}
                      onChange={(e) => setIsBookedAfternoon(e.target.checked)}
                      className="accent-accent"
                    />
                    <span className="text-xs text-foreground">Après-midi réservé (13h-19h)</span>
                  </label>
                </>
              )}
            </div>

            {error && <p className="text-xs text-tier-premium">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 border border-accent bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-background hover:bg-accent-hover disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                Sauvegarder
              </button>
              {day.isOverride && (
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="flex items-center gap-1 border border-border px-3 py-2 text-xs text-muted hover:border-tier-premium hover:text-tier-premium"
                >
                  <Trash2 className="h-3 w-3" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
