"use client";

import type { AnnualSummary } from "@/lib/projection-engine";
import { formatPrice } from "@/lib/date-utils";

interface ScenarioCardProps {
  summary: AnnualSummary;
}

export function ScenarioCard({ summary }: ScenarioCardProps) {
  return (
    <div className="border border-border bg-card p-4">
      {/* Header with colored accent */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-3 w-3" style={{ backgroundColor: summary.color }} />
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
          {summary.scenario}
        </h3>
      </div>

      {/* CA Annuel */}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-wider text-muted">CA Annuel</p>
        <p className="font-mono text-2xl font-bold" style={{ color: summary.color }}>
          {formatPrice(summary.totalRevenue)}
        </p>
      </div>

      {/* Moyennes */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted">Moy. mensuelle</p>
          <p className="font-mono text-sm font-bold text-foreground">
            {formatPrice(summary.monthlyAvg)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted">Moy. journalière</p>
          <p className="font-mono text-sm font-bold text-foreground">
            {formatPrice(summary.dailyAvg)}
          </p>
        </div>
      </div>

      {/* Répartition jours */}
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-wider text-muted">Répartition jours</p>
        <div className="flex gap-3 text-xs">
          <span className="text-tier-fashion-week">
            <span className="font-mono font-bold">{summary.totalDaysFW}</span> FW
          </span>
          <span className="text-tier-premium">
            <span className="font-mono font-bold">{summary.totalDaysPremium}</span> Moy.
          </span>
          <span className="text-tier-low">
            <span className="font-mono font-bold">{summary.totalDaysLow}</span> Basse
          </span>
        </div>
      </div>
    </div>
  );
}
