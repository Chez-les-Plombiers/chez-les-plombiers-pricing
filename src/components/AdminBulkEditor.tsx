"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";
import type { TierSlug, TimeSlot } from "@/types";
import { TIME_SLOT_LABELS } from "@/types";
import { TIERS } from "@/lib/tier-config";

// UI-visible tiers (merge premium/medium into one "Demande soutenue")
const UI_TIERS: { slug: TierSlug; label: string }[] = [
  { slug: "fashion-week", label: "Haute demande (Fashion Week)" },
  { slug: "medium", label: "Demande soutenue" },
  { slug: "low", label: "Basse demande" },
];

interface AdminBulkEditorProps {
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminBulkEditor({ token, onClose, onSaved }: AdminBulkEditorProps) {
  const [mode, setMode] = useState<"range" | "weekday">("range");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [tier, setTier] = useState<TierSlug>("medium");
  const [prices, setPrices] = useState({ ...TIERS["medium"].prices });
  const [isBooked, setIsBooked] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayNames = [
    { label: "Lun", value: 1 },
    { label: "Mar", value: 2 },
    { label: "Mer", value: 3 },
    { label: "Jeu", value: 4 },
    { label: "Ven", value: 5 },
    { label: "Sam", value: 6 },
    { label: "Dim", value: 7 },
  ];

  function handleTierChange(newTier: TierSlug) {
    setTier(newTier);
    setPrices({ ...TIERS[newTier].prices });
  }

  function getDatesInRange(): string[] {
    if (!startDate || !endDate) return [];
    const dates: string[] = [];
    const current = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  function getDatesByWeekday(): string[] {
    if (weekdays.length === 0) return [];
    const dates: string[] = [];
    const current = new Date("2026-01-01T00:00:00");
    const end = new Date("2026-12-31T00:00:00");
    while (current <= end) {
      const dow = current.getDay();
      const isoDow = dow === 0 ? 7 : dow;
      if (weekdays.includes(isoDow)) {
        dates.push(current.toISOString().split("T")[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  async function handleApply() {
    setLoading(true);
    setError(null);

    const dates = mode === "range" ? getDatesInRange() : getDatesByWeekday();
    if (dates.length === 0) {
      setError("Aucune date sélectionnée");
      setLoading(false);
      return;
    }

    try {
      for (const date of dates) {
        const res = await fetch(`/api/pricing/${date}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ tier, prices, isBooked, reason: reason || TIERS[tier].label }),
        });
        if (!res.ok) throw new Error(`Erreur pour ${date}`);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  const dateCount = mode === "range" ? getDatesInRange().length : getDatesByWeekday().length;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <Dialog.Title className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
              Édition en masse
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted hover:text-foreground" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {/* Mode selector */}
            <div className="flex gap-1">
              <button
                onClick={() => setMode("range")}
                className={`flex-1 border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider ${
                  mode === "range"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted"
                }`}
              >
                Plage de dates
              </button>
              <button
                onClick={() => setMode("weekday")}
                className={`flex-1 border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider ${
                  mode === "weekday"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted"
                }`}
              >
                Jours de semaine
              </button>
            </div>

            {mode === "range" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted">Du</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min="2026-01-01"
                    max="2026-12-31"
                    className="w-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Au</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min="2026-01-01"
                    max="2026-12-31"
                    className="w-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-1">
                {dayNames.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() =>
                      setWeekdays((prev) =>
                        prev.includes(value)
                          ? prev.filter((v) => v !== value)
                          : [...prev, value]
                      )
                    }
                    className={`flex-1 border py-1.5 font-mono text-[10px] uppercase ${
                      weekdays.includes(value)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Tier */}
            <div>
              <label className="mb-1 block text-xs text-muted">Tier</label>
              <div className="flex gap-1">
                {UI_TIERS.map(({ slug, label }) => (
                  <button
                    key={slug}
                    onClick={() => handleTierChange(slug)}
                    className="flex-1 border px-1 py-1.5 font-mono text-[10px] uppercase tracking-wider"
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

            {/* Editable prices */}
            {(Object.keys(TIME_SLOT_LABELS) as TimeSlot[]).map((slot) => (
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
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Raison (optionnel)"
              className="border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />

            {/* Booked */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isBooked}
                onChange={(e) => setIsBooked(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-xs text-foreground">Marquer comme réservé</span>
            </label>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={handleApply}
              disabled={loading || dateCount === 0}
              className="flex items-center justify-center gap-2 border border-accent bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-background hover:bg-accent-hover disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              Appliquer à {dateCount} jour{dateCount > 1 ? "s" : ""}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
