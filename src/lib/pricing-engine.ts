import type { DayPricing, PricingOverride, TierSlug, BookingWindow, TimeSlot } from "@/types";
import type { BookingSlot } from "./google-calendar";
import type { VenueConfig } from "./venues";
import { hasSlots } from "./venues";
import { BOOKING_WINDOWS } from "./tier-config";
import { getISODayOfWeek, getDatesInMonth } from "./date-utils";
import { isFashionWeek, isJourFerie, isPont, isVacances } from "./calendar-data";

const DAY_NAMES: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};

/**
 * Palier visuel d'une date pour un lieu donné.
 *
 * Les paliers de demande (rouge / laiton / bleu) n'existent que sur les lieux
 * dont la grille le justifie — voir `useTiers`. En revanche la Fashion Week
 * est TOUJOURS signalée : c'est la seule période où le prix change vraiment,
 * sur les trois lieux.
 */
export function getTierForDate(
  dateStr: string,
  venue: VenueConfig
): { tier: TierSlug; reason: string } {
  const fw = isFashionWeek(dateStr);
  if (fw.match) return { tier: "fashion-week", reason: fw.label };

  const dow = getISODayOfWeek(dateStr);

  if (!venue.useTiers) {
    return { tier: "low", reason: DAY_NAMES[dow] };
  }

  const ferie = isJourFerie(dateStr);
  if (ferie.match) return { tier: "low", reason: ferie.label };

  const pont = isPont(dateStr);
  if (pont.match) return { tier: "low", reason: pont.label };

  const vac = isVacances(dateStr);
  if (vac.match) return { tier: "low", reason: vac.label };

  // Mer/Jeu/Ven → demande soutenue (laiton). Le reste → demande basse (bleu).
  if (dow >= 3 && dow <= 5) return { tier: "premium", reason: DAY_NAMES[dow] };
  return { tier: "low", reason: DAY_NAMES[dow] };
}

/**
 * Prix de base d'une date pour un lieu (journée complète, HT, avant override).
 * Fashion Week prime toujours sur la grille courante.
 */
export function getBasePrice(dateStr: string, venue: VenueConfig): number {
  if (isFashionWeek(dateStr).match) return venue.fashionWeekPrice;
  if (venue.pricing.kind === "flat") return venue.pricing.price;
  return venue.pricing.prices[getISODayOfWeek(dateStr)];
}

/**
 * Fenêtre de réservation, d'après la distance à aujourd'hui.
 *
 * ⚠️ Les quatre coefficients valent 1,0 depuis le 15/09/2026 : les remises
 * Early Bird et Last Minute ont été supprimées, toute remise se décide
 * désormais à la main via un override. Ne JAMAIS réintroduire un coefficient
 * inférieur à 1. La notion ne subsiste que pour le simulateur de projections.
 */
export function getBookingWindow(eventDate: string, today: string): BookingWindow {
  const event = new Date(eventDate + "T00:00:00Z");
  const now = new Date(today + "T00:00:00Z");
  const diffDays = Math.ceil((event.getTime() - now.getTime()) / 86_400_000);

  if (diffDays >= 180) return "early-bird";
  if (diffDays >= 60) return "standard";
  if (diffDays >= 14) return "confirmed";
  return "last-minute";
}

/** Prix par créneau vendable du lieu. Un lieu mono-créneau n'a qu'une entrée. */
function computeSlotPrices(
  basePrice: number,
  coeff: number,
  venue: VenueConfig
): Record<TimeSlot, number> {
  const fullDay = Math.round((basePrice * coeff) / 100) * 100;
  const ratio = venue.halfDayRatio ?? 1;
  const halfDay = Math.round((basePrice * ratio * coeff) / 100) * 100;

  return {
    matinee: venue.slots.includes("matinee") ? halfDay : fullDay,
    "apres-midi": venue.slots.includes("apres-midi") ? halfDay : fullDay,
    "journee-complete": fullDay,
  };
}

export interface ComputeDayOptions {
  override?: PricingOverride;
  /** Option posée sur cette date (agenda OPTION du lieu). */
  option?: BookingSlot;
}

/** Tarification complète d'une date pour un lieu. */
export function computeDayPricing(
  dateStr: string,
  today: string,
  venue: VenueConfig,
  { override, option }: ComputeDayOptions = {}
): DayPricing {
  const base = getTierForDate(dateStr, venue);
  const tier = override?.tier ?? base.tier;
  const reason = override?.reason ?? base.reason;
  const basePrice = override?.basePrice ?? getBasePrice(dateStr, venue);

  const bw = getBookingWindow(dateStr, today);
  const bwDef = BOOKING_WINDOWS[bw];

  const defaultPrices = computeSlotPrices(basePrice, bwDef.coeff, venue);
  const prices: Record<TimeSlot, number> = {
    matinee: override?.prices?.matinee ?? defaultPrices.matinee,
    "apres-midi": override?.prices?.["apres-midi"] ?? defaultPrices["apres-midi"],
    "journee-complete":
      override?.prices?.["journee-complete"] ?? defaultPrices["journee-complete"],
  };

  // Un lieu mono-créneau n'a ni matinée ni après-midi : toute occupation
  // partielle vaut journée entière (le repli est déjà appliqué à la lecture
  // du calendrier, on le redouble ici pour les overrides saisis à la main).
  const multiSlot = hasSlots(venue);
  const bookedMorning = multiSlot ? (override?.isBookedMorning ?? false) : false;
  const bookedAfternoon = multiSlot ? (override?.isBookedAfternoon ?? false) : false;
  const booked =
    (override?.isBooked ?? false) ||
    (!multiSlot &&
      Boolean(override?.isBookedMorning || override?.isBookedAfternoon));

  const optionMorning = multiSlot ? (option?.isBookedMorning ?? false) : false;
  const optionAfternoon = multiSlot ? (option?.isBookedAfternoon ?? false) : false;
  const optionFull =
    (option?.isBooked ?? false) ||
    (!multiSlot && Boolean(option?.isBookedMorning || option?.isBookedAfternoon));

  return {
    date: dateStr,
    tier,
    reason,
    basePrice,
    prices,
    bookingWindow: bw,
    bookingWindowLabel: bwDef.label,
    bookingWindowCoeff: bwDef.coeff,
    isBooked: booked,
    isBookedMorning: bookedMorning,
    isBookedAfternoon: bookedAfternoon,
    isOverride: !!override,
    isOption: optionFull,
    isOptionMorning: optionMorning,
    isOptionAfternoon: optionAfternoon,
  };
}

export interface WindowPricingParams {
  venue: VenueConfig;
  startYear: number;
  startMonth: number; // 0-11
  overrides?: Record<string, PricingOverride>;
  options?: Record<string, BookingSlot>;
  today?: string;
  monthCount?: number;
}

/**
 * Tarification d'une fenêtre glissante de mois, éventuellement à cheval sur
 * deux années (ex. septembre 2026 → août 2027).
 */
export function computeWindowPricing({
  venue,
  startYear,
  startMonth,
  overrides = {},
  options = {},
  today,
  monthCount = 12,
}: WindowPricingParams): DayPricing[] {
  const todayStr = today ?? new Date().toISOString().split("T")[0];
  const days: DayPricing[] = [];

  for (let i = 0; i < monthCount; i++) {
    const absoluteMonth = startMonth + i;
    const year = startYear + Math.floor(absoluteMonth / 12);
    const month = absoluteMonth % 12;
    for (const dateStr of getDatesInMonth(year, month)) {
      days.push(
        computeDayPricing(dateStr, todayStr, venue, {
          override: overrides[dateStr],
          option: options[dateStr],
        })
      );
    }
  }

  return days;
}

/** Tarification d'une année civile complète (admin, export iCal). */
export function computeYearPricing(
  year: number,
  venue: VenueConfig,
  overrides: Record<string, PricingOverride> = {},
  options: Record<string, BookingSlot> = {},
  today?: string
): DayPricing[] {
  return computeWindowPricing({
    venue,
    startYear: year,
    startMonth: 0,
    overrides,
    options,
    today,
    monthCount: 12,
  });
}

/** Regroupe par mois, clé "YYYY-MM" pour ne jamais confondre deux années. */
export function groupByMonth(days: DayPricing[]): Record<string, DayPricing[]> {
  const result: Record<string, DayPricing[]> = {};
  for (const day of days) {
    const key = day.date.slice(0, 7);
    (result[key] ??= []).push(day);
  }
  return result;
}
