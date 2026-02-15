"use client";

import type { ScenarioParams } from "@/lib/projection-engine";
import { PRESETS } from "@/lib/projection-engine";
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

  function updateOccupancy(key: "fashion-week" | "premium" | "low", value: number) {
    onChange({
      ...params,
      tierOccupancy: { ...params.tierOccupancy, [key]: value },
    });
  }

  function updatePriceAdj(dow: number, value: number) {
    onChange({
      ...params,
      priceAdjustment: { ...params.priceAdjustment, [dow]: value },
    });
  }

  function updateBWMix(changedKey: BookingWindow, newValue: number) {
    const oldValue = params.bookingWindowMix[changedKey];
    const delta = newValue - oldValue;
    const otherKeys = BW_KEYS.filter((k) => k !== changedKey);
    const otherSum = otherKeys.reduce((s, k) => s + params.bookingWindowMix[k], 0);

    const newMix = { ...params.bookingWindowMix, [changedKey]: newValue };

    if (otherSum > 0) {
      // Redistribute proportionally
      let remaining = 100 - newValue;
      for (let i = 0; i < otherKeys.length; i++) {
        const k = otherKeys[i];
        if (i === otherKeys.length - 1) {
          // Last one gets the remainder to ensure exact sum
          newMix[k] = Math.max(0, remaining);
        } else {
          const proportion = params.bookingWindowMix[k] / otherSum;
          const adjusted = Math.max(0, Math.round(proportion * (100 - newValue)));
          newMix[k] = adjusted;
          remaining -= adjusted;
        }
      }
    } else if (delta !== 0) {
      // All others were 0, distribute evenly
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
      tierOccupancy: { ...preset.tierOccupancy },
      priceAdjustment: { ...preset.priceAdjustment },
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

      {/* Occupancy */}
      <div>
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
          Taux de remplissage
        </p>
        <div className="flex flex-col gap-3">
          <SliderRow
            label="Fashion Week"
            value={params.tierOccupancy["fashion-week"]}
            min={0} max={1} step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            color="#DC2626"
            onChange={(v) => updateOccupancy("fashion-week", v)}
          />
          <SliderRow
            label="Demande moyenne"
            value={params.tierOccupancy.premium}
            min={0} max={1} step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            color="#C8A96E"
            onChange={(v) => updateOccupancy("premium", v)}
          />
          <SliderRow
            label="Demande basse"
            value={params.tierOccupancy.low}
            min={0} max={1} step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            color="#3B82F6"
            onChange={(v) => updateOccupancy("low", v)}
          />
        </div>
      </div>

      {/* Price adjustments */}
      <div>
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
          Ajustement prix / jour
        </p>
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((dow) => (
            <SliderRow
              key={dow}
              label={DOW_LABELS[dow]}
              value={params.priceAdjustment[dow]}
              min={0.5} max={2.0} step={0.05}
              format={(v) => `×${v.toFixed(2)}`}
              onChange={(v) => updatePriceAdj(dow, v)}
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
      <span className="w-28 shrink-0 text-xs text-foreground">{label}</span>
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
