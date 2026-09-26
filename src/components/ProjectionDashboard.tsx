"use client";

import { useState, useMemo } from "react";
import { ProjectionSliders } from "./ProjectionSliders";
import { ProjectionChart } from "./ProjectionChart";
import { ScenarioCard } from "./ScenarioCard";
import {
  computeProjection,
  PRESET_PESSIMISTE,
  PRESET_REALISTE,
  PRESET_OPTIMISTE,
  type ScenarioParams,
} from "@/lib/projection-engine";

function deepEqual(a: ScenarioParams, b: ScenarioParams): boolean {
  return JSON.stringify({
    o: a.monthlyOccupancy,
    p: a.dayPrices,
    b: a.bookingWindowMix,
  }) === JSON.stringify({
    o: b.monthlyOccupancy,
    p: b.dayPrices,
    b: b.bookingWindowMix,
  });
}

// La connexion et le menu sont portes par `AdminShell` depuis le 26/09/2026 :
// cette page ne s'occupe plus que de ses projections.
export function ProjectionDashboard() {
  const [customParams, setCustomParams] = useState<ScenarioParams>({
    ...PRESET_REALISTE,
    name: "Personnalisé",
    color: "#A855F7",
  });

  // Always compute the 3 presets
  const pessimiste = useMemo(() => computeProjection(PRESET_PESSIMISTE), []);
  const realiste = useMemo(() => computeProjection(PRESET_REALISTE), []);
  const optimiste = useMemo(() => computeProjection(PRESET_OPTIMISTE), []);

  // Compute custom only when different from all presets
  const isCustom = useMemo(() => {
    return !deepEqual(customParams, PRESET_PESSIMISTE)
      && !deepEqual(customParams, PRESET_REALISTE)
      && !deepEqual(customParams, PRESET_OPTIMISTE);
  }, [customParams]);

  const custom = useMemo(
    () => isCustom ? computeProjection(customParams) : null,
    [customParams, isCustom]
  );

  const allSummaries = useMemo(() => {
    const base = [pessimiste, realiste, optimiste];
    if (custom) base.push(custom);
    return base;
  }, [pessimiste, realiste, optimiste, custom]);

  return (
    <>
        {/* Desktop: sidebar + chart. Mobile: stacked */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sliders sidebar */}
          <div className="w-full shrink-0 lg:w-[350px]">
            <div className="border border-border bg-card p-4">
              <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-accent">
                Paramètres
              </h2>
              <ProjectionSliders params={customParams} onChange={setCustomParams} />
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1">
            <div className="border border-border bg-card p-4">
              <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-accent">
                CA Mensuel par scénario
              </h2>
              <ProjectionChart summaries={allSummaries} />
            </div>
          </div>
        </div>

        {/* Scenario cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ScenarioCard summary={pessimiste} />
          <ScenarioCard summary={realiste} />
          <ScenarioCard summary={optimiste} />
          {custom && <ScenarioCard summary={custom} />}
        </div>
    </>
  );
}
