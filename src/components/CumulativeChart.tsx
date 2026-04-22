"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ─── Types ──────────────────────────────────────────────────────────

export interface CumulativeMonthData {
  month: number; // 1-12
  caRealise: number;
  caPrevisionnel: number;
  charges: number;
  status: "realized" | "in-progress" | "planned";
}

export interface CumulativeChartProps {
  months: CumulativeMonthData[];
  year: number;
}

interface BreakEvenResult {
  month: number;
  label: string;
}

// ─── Month labels (short FR) ───────────────────────────────────────

const MONTH_SHORT_FR = [
  "Janv", "Févr", "Mars", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc",
];

// ─── Break-even calculation ─────────────────────────────────────────

/**
 * Calculate the break-even month by finding where cumulative CA
 * (realized + projected) crosses total annual charges.
 * Returns the interpolated month and a French label, or null if
 * break-even is never reached within the year.
 */
export function calculateBreakEvenMonth(
  months: CumulativeMonthData[]
): BreakEvenResult | null {
  if (months.length === 0) return null;

  const totalCharges = months.reduce((sum, m) => sum + m.charges, 0);
  if (totalCharges === 0) return null;

  // Build cumulative CA array using the best available CA for each month
  const cumulativeCA: number[] = [];
  let running = 0;
  for (let i = 0; i < 12; i++) {
    const m = months.find((d) => d.month === i + 1);
    if (m) {
      const ca =
        m.status === "planned" ? m.caPrevisionnel : m.caRealise || m.caPrevisionnel;
      running += ca;
    }
    cumulativeCA.push(running);
  }

  // Find crossing point
  for (let i = 0; i < 12; i++) {
    if (cumulativeCA[i] >= totalCharges) {
      if (i === 0) {
        return { month: 1, label: `${MONTH_SHORT_FR[0]}. ${new Date().getFullYear()}` };
      }
      // Linear interpolation between month i-1 and i
      const prev = cumulativeCA[i - 1];
      const curr = cumulativeCA[i];
      const fraction = (totalCharges - prev) / (curr - prev || 1);
      const exactMonth = i + fraction; // 0-indexed: i=0 is Jan
      const monthIndex = Math.min(Math.floor(exactMonth), 11);
      return {
        month: monthIndex + 1,
        label: `${MONTH_SHORT_FR[monthIndex]}. ${new Date().getFullYear()}`,
      };
    }
  }

  return null;
}

// ─── Component ──────────────────────────────────────────────────────

export function CumulativeChart({ months, year }: CumulativeChartProps) {
  const { realizedData, projectedData, chargesTotal, breakEvenIndex, labels } =
    useMemo(() => {
      const totalCharges = months.reduce((sum, m) => sum + m.charges, 0);

      // Determine last realized/in-progress month index (0-based)
      let lastRealizedIdx = -1;
      for (let i = 0; i < 12; i++) {
        const m = months.find((d) => d.month === i + 1);
        if (m && (m.status === "realized" || m.status === "in-progress")) {
          lastRealizedIdx = i;
        }
      }

      // Build cumulative arrays
      const realized: (number | null)[] = new Array(12).fill(null);
      const projected: (number | null)[] = new Array(12).fill(null);
      let cumulativeRealized = 0;
      let cumulativeProjected = 0;

      for (let i = 0; i < 12; i++) {
        const m = months.find((d) => d.month === i + 1);
        const caRealized = m ? (m.caRealise || 0) : 0;
        const caProjected = m ? (m.caPrevisionnel || 0) : 0;

        if (i <= lastRealizedIdx) {
          // Realized zone: use actual CA
          cumulativeRealized += caRealized;
          realized[i] = cumulativeRealized;
        } else {
          // Projected zone: continue from last realized, add forecasted
          if (i === lastRealizedIdx + 1) {
            cumulativeProjected = cumulativeRealized;
          }
          cumulativeProjected += caProjected;
          projected[i] = cumulativeProjected;
        }
      }

      // Bridge: projected line starts from the last realized point
      if (lastRealizedIdx >= 0 && lastRealizedIdx < 11) {
        projected[lastRealizedIdx] = realized[lastRealizedIdx];
      }

      // Find break-even index on the projected/realized curve
      let beIdx: number | null = null;
      const fullCurve = realized.map((r, i) => r ?? projected[i] ?? null);
      for (let i = 0; i < 12; i++) {
        const val = fullCurve[i];
        if (val !== null && val >= totalCharges) {
          beIdx = i;
          break;
        }
      }

      return {
        realizedData: realized,
        projectedData: projected,
        chargesTotal: totalCharges,
        breakEvenIndex: beIdx,
        labels: MONTH_SHORT_FR,
      };
    }, [months]);

  // Build chart.js datasets
  const chartData = useMemo(() => {
    const datasets = [
      // 1. Realized line (solid green)
      {
        label: "CA Cumulé (réalisé)",
        data: realizedData,
        borderColor: "#5cb87c",
        backgroundColor: "#5cb87c",
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: "#5cb87c",
        pointBorderColor: "#5cb87c",
        pointHoverRadius: 6,
        tension: 0.1,
        spanGaps: false,
        order: 1,
      },
      // 2. Projected line (dashed gold)
      {
        label: "CA Cumulé (prévisionnel)",
        data: projectedData,
        borderColor: "#C8A96E",
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 3,
        pointBackgroundColor: "#1A1A1A",
        pointBorderColor: "#C8A96E",
        pointBorderWidth: 1.5,
        pointHoverRadius: 5,
        tension: 0.1,
        spanGaps: false,
        order: 2,
      },
      // 3. Total charges horizontal line
      {
        label: "Charges annuelles",
        data: new Array(12).fill(chargesTotal),
        borderColor: "rgba(255,255,255,0.25)",
        backgroundColor: "transparent",
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
        order: 3,
      },
    ];

    // 4. Break-even vertical indicator (as a dataset with only 2 points)
    if (breakEvenIndex !== null) {
      const verticalData: (number | null)[] = new Array(12).fill(null);
      // Set a tall vertical line at the break-even month
      verticalData[breakEvenIndex] = 0;
      datasets.push({
        label: "Seuil de rentabilité",
        data: verticalData,
        borderColor: "rgba(255,255,255,0.15)",
        backgroundColor: "transparent",
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
        spanGaps: false,
        order: 4,
        // @ts-expect-error — custom flag for vertical line plugin
        isBreakEven: true,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [realizedData, projectedData, chargesTotal, breakEvenIndex, labels]);

  const options: ChartOptions<"line"> = useMemo(() => {
    const maxCumulative = Math.max(
      ...realizedData.filter((v): v is number => v !== null),
      ...projectedData.filter((v): v is number => v !== null),
      chargesTotal
    );
    const yMax = Math.ceil((maxCumulative * 1.15) / 10000) * 10000;

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          backgroundColor: "#1A1A1A",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          titleFont: {
            family: "'Space Mono', monospace",
            size: 11,
            weight: "bold" as const,
          },
          titleColor: "#C8A96E",
          bodyFont: {
            family: "'Space Mono', monospace",
            size: 11,
          },
          bodyColor: "#ccc",
          padding: 10,
          cornerRadius: 0,
          callbacks: {
            title(items: TooltipItem<"line">[]) {
              if (!items.length) return "";
              return `${items[0].label} ${year}`;
            },
            label(item: TooltipItem<"line">) {
              const value = item.parsed.y;
              if (value === null || value === undefined) return "";
              const datasetLabel = item.dataset.label || "";
              if (datasetLabel === "Seuil de rentabilité") return "";
              const formatted = new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(value);
              return `${datasetLabel}: ${formatted}`;
            },
            filter(item: TooltipItem<"line">) {
              // Hide break-even marker from tooltip
              return item.dataset.label !== "Seuil de rentabilité";
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255,255,255,0.04)",
          },
          border: {
            color: "rgba(255,255,255,0.08)",
          },
          ticks: {
            color: "#888",
            font: {
              family: "'Space Mono', monospace",
              size: 11,
            },
          },
        },
        y: {
          min: 0,
          max: yMax,
          grid: {
            color: "rgba(255,255,255,0.04)",
          },
          border: {
            color: "rgba(255,255,255,0.08)",
          },
          ticks: {
            color: "#888",
            font: {
              family: "'Space Mono', monospace",
              size: 11,
            },
            callback(tickValue: string | number) {
              const v = typeof tickValue === "string" ? parseFloat(tickValue) : tickValue;
              return `${Math.round(v / 1000)}k €`;
            },
          },
        },
      },
    };
  }, [realizedData, projectedData, chargesTotal, year]);

  // Custom plugin: draw vertical dashed line + label at break-even
  const breakEvenPlugin = useMemo(
    () => ({
      id: "breakEvenLine",
      afterDraw(chart: ChartJS) {
        if (breakEvenIndex === null) return;

        const { ctx } = chart;
        const xScale = chart.scales.x;
        const yScale = chart.scales.y;

        if (!xScale || !yScale) return;

        const x = xScale.getPixelForValue(breakEvenIndex);
        const yTop = yScale.top;
        const yBottom = yScale.bottom;
        const yCharges = yScale.getPixelForValue(chargesTotal);

        // Vertical dashed line
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.moveTo(x, yTop);
        ctx.lineTo(x, yBottom);
        ctx.stroke();

        // Label at intersection
        const label = `${MONTH_SHORT_FR[breakEvenIndex]}. ${year}`;
        ctx.setLineDash([]);
        ctx.font = "bold 10px 'Space Mono', monospace";
        ctx.fillStyle = "#C8A96E";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(label, x, yCharges - 6);

        // Small diamond marker at intersection
        ctx.beginPath();
        ctx.fillStyle = "#C8A96E";
        const size = 4;
        ctx.moveTo(x, yCharges - size);
        ctx.lineTo(x + size, yCharges);
        ctx.lineTo(x, yCharges + size);
        ctx.lineTo(x - size, yCharges);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      },
    }),
    [breakEvenIndex, chargesTotal, year]
  );

  return (
    <div className="h-[200px] w-full">
      <Line data={chartData} options={options} plugins={[breakEvenPlugin]} />
    </div>
  );
}
