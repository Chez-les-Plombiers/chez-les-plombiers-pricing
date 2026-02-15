"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { AnnualSummary } from "@/lib/projection-engine";
import { getMonthNameShortFR, formatPrice } from "@/lib/date-utils";

interface ProjectionChartProps {
  summaries: AnnualSummary[];
}

export function ProjectionChart({ summaries }: ProjectionChartProps) {
  // Build chart data: 12 months, each with revenue per scenario
  const data = Array.from({ length: 12 }, (_, month) => {
    const entry: Record<string, string | number> = {
      name: getMonthNameShortFR(month),
    };
    for (const s of summaries) {
      entry[s.scenario] = s.months[month]?.revenue ?? 0;
    }
    return entry;
  });

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3A3A3A" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#8A8A8A", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#3A3A3A" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#8A8A8A", fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#3A3A3A" }}
            tickLine={false}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(200,169,110,0.08)" }} />
          {summaries.map((s) => (
            <Bar
              key={s.scenario}
              dataKey={s.scenario}
              fill={s.color}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="border border-border bg-card p-3 shadow-lg">
      <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-accent">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="h-2 w-2" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-muted">{entry.name}</span>
          <span className="ml-auto font-mono text-xs font-bold text-foreground">
            {formatPrice(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
