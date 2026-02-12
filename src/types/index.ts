export type TierSlug = "fashion-week" | "premium" | "medium" | "low";

export type TimeSlot = "journee" | "soiree" | "journee-soiree";

export interface TierDefinition {
  slug: TierSlug;
  label: string;
  color: string;
  colorClass: string;
  bgClass: string;
  prices: Record<TimeSlot, number>;
}

export interface DayPricing {
  date: string; // YYYY-MM-DD
  tier: TierSlug;
  reason: string;
  prices: Record<TimeSlot, number>;
  isBooked: boolean;
  isOverride: boolean;
}

export interface PricingOverride {
  date: string; // YYYY-MM-DD
  tier?: TierSlug;
  prices?: Partial<Record<TimeSlot, number>>;
  isBooked?: boolean;
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
  journee: "Journée (9h-18h)",
  soiree: "Soirée (19h-23h)",
  "journee-soiree": "Journée + Soirée",
};
