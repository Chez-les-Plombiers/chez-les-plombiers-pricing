"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminLogin } from "./AdminLogin";
import { Navbar } from "./Navbar";
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

export function ProjectionDashboard() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin-token");
    }
    return null;
  });

  function handleLogin(t: string) {
    sessionStorage.setItem("admin-token", t);
    setToken(t);
  }

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

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          <AdminLogin onLogin={handleLogin} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-foreground">
            Projections Financières 2026
          </h1>
          <Link
            href="/admin"
            className="flex items-center gap-2 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ArrowLeft className="h-3 w-3" />
            Admin
          </Link>
        </div>

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
      </main>
    </div>
  );
}
