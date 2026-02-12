import type { DayPricing, PricingOverride, TierSlug } from "@/types";
import { TIERS } from "./tier-config";
import { getISODayOfWeek, getDatesInMonth } from "./date-utils";
import { isFashionWeek, isJourFerie, isPont, isVacances } from "./calendar-data";

/**
 * Determine the tier for a given date based on priority:
 * Fashion Week > Fériés/Ponts/Vacances > Jour de la semaine
 */
export function getTierForDate(dateStr: string): { tier: TierSlug; reason: string } {
  // Priority 1: Fashion Week
  const fw = isFashionWeek(dateStr);
  if (fw.match) {
    return { tier: "fashion-week", reason: fw.label };
  }

  // Priority 2: Jours fériés
  const ferie = isJourFerie(dateStr);
  if (ferie.match) {
    return { tier: "low", reason: ferie.label };
  }

  // Priority 3: Ponts
  const pont = isPont(dateStr);
  if (pont.match) {
    return { tier: "low", reason: pont.label };
  }

  // Priority 4: Vacances scolaires
  const vac = isVacances(dateStr);
  if (vac.match) {
    return { tier: "low", reason: vac.label };
  }

  // Priority 5: Day of week
  const dow = getISODayOfWeek(dateStr);
  // 4=Thursday, 5=Friday → Premium
  if (dow === 4 || dow === 5) {
    return { tier: "premium", reason: dow === 4 ? "Jeudi" : "Vendredi" };
  }
  // 7=Sunday → Low
  if (dow === 7) {
    return { tier: "low", reason: "Dimanche" };
  }
  // 1=Mon, 2=Tue, 3=Wed, 6=Sat → Medium
  const dayNames: Record<number, string> = {
    1: "Lundi",
    2: "Mardi",
    3: "Mercredi",
    6: "Samedi",
  };
  return { tier: "medium", reason: dayNames[dow] };
}

/**
 * Compute pricing for a single date, applying overrides if present
 */
export function computeDayPricing(
  dateStr: string,
  override?: PricingOverride
): DayPricing {
  const base = getTierForDate(dateStr);
  const tier = override?.tier ?? base.tier;
  const tierDef = TIERS[tier];
  const reason = override?.reason ?? base.reason;

  const prices = {
    journee: override?.prices?.journee ?? tierDef.prices.journee,
    soiree: override?.prices?.soiree ?? tierDef.prices.soiree,
    "journee-soiree":
      override?.prices?.["journee-soiree"] ?? tierDef.prices["journee-soiree"],
  };

  return {
    date: dateStr,
    tier,
    reason,
    prices,
    isBooked: override?.isBooked ?? false,
    isOverride: !!override,
  };
}

/**
 * Compute pricing for all days in a year
 */
export function computeYearPricing(
  year: number,
  overrides: Record<string, PricingOverride> = {}
): DayPricing[] {
  const days: DayPricing[] = [];
  for (let month = 0; month < 12; month++) {
    const dates = getDatesInMonth(year, month);
    for (const dateStr of dates) {
      days.push(computeDayPricing(dateStr, overrides[dateStr]));
    }
  }
  return days;
}

/**
 * Group pricing data by month
 */
export function groupByMonth(days: DayPricing[]): Record<number, DayPricing[]> {
  const result: Record<number, DayPricing[]> = {};
  for (const day of days) {
    const month = parseInt(day.date.split("-")[1], 10) - 1;
    if (!result[month]) result[month] = [];
    result[month].push(day);
  }
  return result;
}
