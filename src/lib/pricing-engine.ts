import type { DayPricing, PricingOverride, TierSlug, BookingWindow, TimeSlot } from "@/types";
import { DAY_OF_WEEK_PRICES, FW_PRICE, HALF_DAY_RATIO, BOOKING_WINDOWS } from "./tier-config";
import { getISODayOfWeek, getDatesInMonth } from "./date-utils";
import { isFashionWeek, isJourFerie, isPont, isVacances } from "./calendar-data";

/**
 * Determine the visual tier for a given date.
 * Fashion Week > Fériés/Ponts/Vacances > Day of week
 */
export function getTierForDate(dateStr: string): { tier: TierSlug; reason: string } {
  const fw = isFashionWeek(dateStr);
  if (fw.match) {
    return { tier: "fashion-week", reason: fw.label };
  }

  const ferie = isJourFerie(dateStr);
  if (ferie.match) {
    return { tier: "low", reason: ferie.label };
  }

  const pont = isPont(dateStr);
  if (pont.match) {
    return { tier: "low", reason: pont.label };
  }

  const vac = isVacances(dateStr);
  if (vac.match) {
    return { tier: "low", reason: vac.label };
  }

  const dow = getISODayOfWeek(dateStr);
  const dayNames: Record<number, string> = {
    1: "Lundi",
    2: "Mardi",
    3: "Mercredi",
    4: "Jeudi",
    5: "Vendredi",
    6: "Samedi",
    7: "Dimanche",
  };

  // Wed/Thu/Fri (3000-4000€) → premium (Demande soutenue / laiton)
  if (dow >= 3 && dow <= 5) {
    return { tier: "premium", reason: dayNames[dow] };
  }

  // Mon/Tue/Sat/Sun (1000-2000€) → low (Basse demande / bleu)
  return { tier: "low", reason: dayNames[dow] };
}

/**
 * Get the base price for a date (journée complète, before booking window).
 */
export function getBasePrice(dateStr: string): number {
  const fw = isFashionWeek(dateStr);
  if (fw.match) return FW_PRICE;

  const dow = getISODayOfWeek(dateStr);
  return DAY_OF_WEEK_PRICES[dow] ?? 2000;
}

/**
 * Determine the booking window based on how far the event date is from today.
 */
export function getBookingWindow(eventDate: string, today: string): BookingWindow {
  const event = new Date(eventDate + "T00:00:00");
  const now = new Date(today + "T00:00:00");
  const diffMs = event.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // ~180 days = 6 months
  if (diffDays >= 180) return "early-bird";
  // ~60 days = 2 months
  if (diffDays >= 60) return "standard";
  // 14 days = 2 weeks
  if (diffDays >= 14) return "confirmed";
  return "last-minute";
}

/**
 * Compute prices for the 3 time slots from a base price and booking window coefficient.
 */
function computeSlotPrices(basePrice: number, coeff: number): Record<TimeSlot, number> {
  const fullDay = Math.round(basePrice * coeff / 100) * 100; // round to nearest 100
  const halfDay = Math.round(basePrice * HALF_DAY_RATIO * coeff / 100) * 100;
  return {
    matinee: halfDay,
    "apres-midi": halfDay,
    "journee-complete": fullDay,
  };
}

/**
 * Compute pricing for a single date, applying overrides and booking window.
 */
export function computeDayPricing(
  dateStr: string,
  today: string,
  override?: PricingOverride
): DayPricing {
  const base = getTierForDate(dateStr);
  const tier = override?.tier ?? base.tier;
  const reason = override?.reason ?? base.reason;
  const basePrice = override?.basePrice ?? getBasePrice(dateStr);

  const bw = getBookingWindow(dateStr, today);
  const bwDef = BOOKING_WINDOWS[bw];

  const defaultPrices = computeSlotPrices(basePrice, bwDef.coeff);
  const prices: Record<TimeSlot, number> = {
    matinee: override?.prices?.matinee ?? defaultPrices.matinee,
    "apres-midi": override?.prices?.["apres-midi"] ?? defaultPrices["apres-midi"],
    "journee-complete": override?.prices?.["journee-complete"] ?? defaultPrices["journee-complete"],
  };

  return {
    date: dateStr,
    tier,
    reason,
    basePrice,
    prices,
    bookingWindow: bw,
    bookingWindowLabel: bwDef.label,
    bookingWindowCoeff: bwDef.coeff,
    isBooked: override?.isBooked ?? false,
    isBookedMorning: override?.isBookedMorning ?? false,
    isBookedAfternoon: override?.isBookedAfternoon ?? false,
    isOverride: !!override,
  };
}

/**
 * Compute pricing for all days in a year.
 */
export function computeYearPricing(
  year: number,
  overrides: Record<string, PricingOverride> = {},
  today?: string
): DayPricing[] {
  const todayStr = today ?? new Date().toISOString().split("T")[0];
  const days: DayPricing[] = [];
  for (let month = 0; month < 12; month++) {
    const dates = getDatesInMonth(year, month);
    for (const dateStr of dates) {
      days.push(computeDayPricing(dateStr, todayStr, overrides[dateStr]));
    }
  }
  return days;
}

/**
 * Group pricing data by month.
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
