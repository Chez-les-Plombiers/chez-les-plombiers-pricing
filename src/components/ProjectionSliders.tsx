"use client";

import type { ScenarioParams } from "@/lib/projection-engine";
import { PRESETS, DEFAULT_DAY_PRICES } from "@/lib/projection-engine";
import { getMonthNameShortFR } from "@/lib/date-utils";
import { RotateCcw } from "lucide-react";
import type { BookingWindow } from "@/types";

interface ProjectionSlidersProps {
  params: ScenarioParams;
  onChange: (params: ScenarioParams) => void;
}

const DOW_LABELS: Record<number, string> = {
  1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi",
  5: "Vendredi", 6: "Samedi", 7: "Dimanche",
};

const BW_LABELS: Record<BookingWindow, string> = {
  "early-bird": "Early Bird",
  standard: "Standard",
  confirmed: "Confirmé",
  "last-minute": "Last Minute",
};

const BW_KEYS: BookingWindow[] = ["early-bird", "standard", "confirmed", "last-minute"];

export function ProjectionSliders({ params, onChange }: ProjectionSlidersProps) {

  function updateMonthlyOccupancy(month: number, value: number) {
    onChange({
      ...params,
      monthlyOccupancy: { ...params.monthlyOccupancy, [month]: value },
    });
  }

  function updateDayPrice(dow: number, value: number) {
    onChange({
      ...params,
      dayPrices: { ...params.dayPrices, [dow]: value },
    });
  }

  function resetDayPrices() {
    onChange({
      ...params,
      dayPrices: { ...DEFAULT_DAY_PRICES },
    });
  }

  function updateBWMix(changedKey: BookingWindow, newValue: number) {
    const otherKeys = BW_KEYS.filter((k) => k !== changedKey);
    const otherSum = otherKeys.reduce((s, k) => s + params.bookingWindowMix[k], 0);

    const newMix = { ...params.bookingWindowMix, [changedKey]: newValue };

    if (otherSum > 0) {
      let remaining = 100 - newValue;
      for (let i = 0; i < otherKeys.length; i++) {
        const k = otherKeys[i];
        if (i === otherKeys.length - 1) {
          newMix[k] = Math.max(0, remaining);
        } else {
          const proportion = params.bookingWindowMix[k] / otherSum;
          const adjusted = Math.max(0, Math.round(proportion * (100 - newValue)));
          newMix[k] = adjusted;
          remaining -= adjusted;
        }
      }
    } else {
      const each = Math.floor((100 - newValue) / otherKeys.length);
      otherKeys.forEach((k, i) => {
        newMix[k] = i === otherKeys.length - 1 ? 100 - newValue - each * (otherKeys.length - 1) : each;
      });
    }

    onChange({ ...params, bookingWindowMix: newMix });
  }

  function applyPreset(preset: ScenarioParams) {
    onChange({
      ...params,
      monthlyOccupancy: { ...preset.monthlyOccupancy },
      dayPrices: { ...preset.dayPrices },
      bookingWindowMix: { ...preset.bookingWindowMix },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Preset buttons */}
      <div>
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
          Presets
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly occupancy */}
      <div>
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
          Taux de remplissage / mois
        </p>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 12 }, (_, m) => (
            <SliderRow
              key={m}
              label={getMonthNameShortFR(m)}
              value={params.monthlyOccupancy[m]}
              min={0} max={1} step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => updateMonthlyOccupancy(m, v)}
            />
          ))}
        </div>
      </div>

      {/* Day prices */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
            Prix par jour
          </p>
          <button
            onClick={resetDayPrices}
            className="flex items-center gap-1 text-[10px] text-muted transition-colors hover:text-accent"
            title="Réinitialiser les prix par défaut"
          >
            <RotateCcw className="h-3 w-3" />
            Réinitialiser
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((dow) => (
            <SliderRow
              key={dow}
              label={DOW_LABELS[dow]}
              value={params.dayPrices[dow]}
              min={500} max={8000} step={100}
              format={(v) => `${v.toLocaleString("fr-FR")}€`}
              onChange={(v) => updateDayPrice(dow, v)}
            />
          ))}
        </div>
      </div>

      {/* Booking window mix */}
      <div>
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
          Mix booking window
        </p>
        <div className="flex flex-col gap-3">
          {BW_KEYS.map((bw) => (
            <SliderRow
              key={bw}
              label={BW_LABELS[bw]}
              value={params.bookingWindowMix[bw]}
              min={0} max={100} step={1}
              format={(v) => `${Math.round(v)}%`}
              onChange={(v) => updateBWMix(bw, Math.round(v))}
            />
          ))}
        </div>
        <p className="mt-1 text-right font-mono text-[10px] text-muted">
          Total : {BW_KEYS.reduce((s, k) => s + params.bookingWindowMix[k], 0)}%
        </p>
      </div>
    </div>
  );
}

// ─── Slider Row ──────────────────────────────────────────────────

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  color?: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, format, color, onChange }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="projection-slider flex-1"
        style={color ? { "--slider-color": color } as React.CSSProperties : undefined}
      />
      <span className="w-14 shrink-0 text-right font-mono text-xs text-accent">
        {format(value)}
      </span>
    </div>
  );
}
