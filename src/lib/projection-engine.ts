import { DAY_OF_WEEK_PRICES, FW_PRICE, BOOKING_WINDOWS } from "./tier-config";
import { getDatesInMonth, getISODayOfWeek } from "./date-utils";
import { getTierForDate } from "./pricing-engine";
import type { BookingWindow } from "@/types";

// ─── Types ───────────────────────────────────────────────────────

export type TierKey = "fashion-week" | "premium" | "low";

export interface ScenarioParams {
  name: string;
  color: string;
  /** Taux de remplissage par tier (0-1) */
  tierOccupancy: Record<TierKey, number>;
  /** Prix par jour de semaine ISO en € (1=Lun..7=Dim) */
  dayPrices: Record<number, number>;
  /** Mix booking window en % (doit sommer à 100) */
  bookingWindowMix: Record<BookingWindow, number>;
}

export interface MonthlyProjection {
  month: number; // 0-11
  revenue: number;
  daysFW: number;
  daysPremium: number;
  daysLow: number;
  totalDays: number;
}

export interface AnnualSummary {
  scenario: string;
  color: string;
  totalRevenue: number;
  monthlyAvg: number;
  dailyAvg: number;
  totalDaysFW: number;
  totalDaysPremium: number;
  totalDaysLow: number;
  months: MonthlyProjection[];
}

// ─── Presets ─────────────────────────────────────────────────────

const DEFAULT_DAY_PRICES: Record<number, number> = { ...DAY_OF_WEEK_PRICES };

export const PRESET_PESSIMISTE: ScenarioParams = {
  name: "Pessimiste",
  color: "#3B82F6",
  tierOccupancy: { "fashion-week": 0.70, premium: 0.30, low: 0.15 },
  dayPrices: { ...DEFAULT_DAY_PRICES },
  bookingWindowMix: { "early-bird": 15, standard: 35, confirmed: 25, "last-minute": 25 },
};

export const PRESET_REALISTE: ScenarioParams = {
  name: "Réaliste",
  color: "#C8A96E",
  tierOccupancy: { "fashion-week": 0.90, premium: 0.50, low: 0.30 },
  dayPrices: { ...DEFAULT_DAY_PRICES },
  bookingWindowMix: { "early-bird": 20, standard: 40, confirmed: 30, "last-minute": 10 },
};

export const PRESET_OPTIMISTE: ScenarioParams = {
  name: "Optimiste",
  color: "#22C55E",
  tierOccupancy: { "fashion-week": 1.00, premium: 0.75, low: 0.50 },
  dayPrices: { ...DEFAULT_DAY_PRICES },
  bookingWindowMix: { "early-bird": 30, standard: 40, confirmed: 25, "last-minute": 5 },
};

export const PRESETS = [PRESET_PESSIMISTE, PRESET_REALISTE, PRESET_OPTIMISTE] as const;

// ─── Engine ──────────────────────────────────────────────────────

function computeWeightedBWCoeff(mix: Record<BookingWindow, number>): number {
  let coeff = 0;
  for (const [bw, pct] of Object.entries(mix) as [BookingWindow, number][]) {
    coeff += (pct / 100) * BOOKING_WINDOWS[bw].coeff;
  }
  return coeff;
}

function mapTierToKey(tier: string): TierKey {
  if (tier === "fashion-week") return "fashion-week";
  if (tier === "premium" || tier === "medium") return "premium";
  return "low";
}

export function computeProjection(params: ScenarioParams, year: number = 2026): AnnualSummary {
  const weightedBWCoeff = computeWeightedBWCoeff(params.bookingWindowMix);
  const months: MonthlyProjection[] = [];

  let totalRevenue = 0;
  let totalDaysFW = 0;
  let totalDaysPremium = 0;
  let totalDaysLow = 0;
  let totalDays = 0;

  for (let month = 0; month < 12; month++) {
    const dates = getDatesInMonth(year, month);
    let monthRevenue = 0;
    let monthFW = 0;
    let monthPremium = 0;
    let monthLow = 0;

    for (const dateStr of dates) {
      const { tier } = getTierForDate(dateStr);
      const tierKey = mapTierToKey(tier);
      const dow = getISODayOfWeek(dateStr);
      const occupancy = params.tierOccupancy[tierKey];

      let dayRevenue: number;
      if (tierKey === "fashion-week") {
        // FW uses fixed 6000€, not day-of-week price
        dayRevenue = FW_PRICE * weightedBWCoeff * occupancy;
      } else {
        const price = params.dayPrices[dow] ?? DAY_OF_WEEK_PRICES[dow] ?? 2000;
        dayRevenue = price * weightedBWCoeff * occupancy;
      }

      monthRevenue += dayRevenue;

      if (tierKey === "fashion-week") monthFW++;
      else if (tierKey === "premium") monthPremium++;
      else monthLow++;
    }

    months.push({
      month,
      revenue: Math.round(monthRevenue),
      daysFW: monthFW,
      daysPremium: monthPremium,
      daysLow: monthLow,
      totalDays: dates.length,
    });

    totalRevenue += monthRevenue;
    totalDaysFW += monthFW;
    totalDaysPremium += monthPremium;
    totalDaysLow += monthLow;
    totalDays += dates.length;
  }

  return {
    scenario: params.name,
    color: params.color,
    totalRevenue: Math.round(totalRevenue),
    monthlyAvg: Math.round(totalRevenue / 12),
    dailyAvg: Math.round(totalRevenue / totalDays),
    totalDaysFW,
    totalDaysPremium,
    totalDaysLow,
    months,
  };
}
