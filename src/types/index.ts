export type TierSlug = "fashion-week" | "premium" | "medium" | "low";

export type TimeSlot = "matinee" | "apres-midi" | "journee-complete";

export type BookingWindow = "early-bird" | "standard" | "confirmed" | "last-minute";

export interface TierDefinition {
  slug: TierSlug;
  label: string;
  color: string;
  colorClass: string;
  bgClass: string;
}

export interface DayPricing {
  date: string; // YYYY-MM-DD
  tier: TierSlug;
  reason: string;
  basePrice: number; // journée complète base
  prices: Record<TimeSlot, number>; // after booking window coefficient
  bookingWindow: BookingWindow;
  bookingWindowLabel: string;
  bookingWindowCoeff: number;
  isBooked: boolean;
  isBookedMorning: boolean;
  isBookedAfternoon: boolean;
  isOverride: boolean;
}

export interface PricingOverride {
  date: string; // YYYY-MM-DD
  tier?: TierSlug;
  basePrice?: number;
  prices?: Partial<Record<TimeSlot, number>>;
  isBooked?: boolean;
  isBookedMorning?: boolean;
  isBookedAfternoon?: boolean;
  reason?: string;
}

export interface QuoteRequest {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlot: TimeSlot;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  siret?: string;
  numberOfDays: number;
  guestCount: number;
  eventType: string;
  message?: string;
  createdAt: string;
}

export interface AnalyticsEvent {
  date: string; // YYYY-MM-DD
  viewedAt: string;
}

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  matinee: "Matinée (7h-13h)",
  "apres-midi": "Après-midi (13h-19h)",
  "journee-complete": "Journée complète (7h-23h)",
};
