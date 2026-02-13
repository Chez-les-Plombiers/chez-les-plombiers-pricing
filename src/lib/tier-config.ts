import type { TierDefinition, TierSlug, BookingWindow } from "@/types";

export const TIERS: Record<TierSlug, TierDefinition> = {
  "fashion-week": {
    slug: "fashion-week",
    label: "Demande élevée (Fashion Week)",
    color: "#DC2626",
    colorClass: "text-tier-fashion-week",
    bgClass: "bg-tier-fashion-week",
  },
  premium: {
    slug: "premium",
    label: "Demande moyenne",
    color: "#C8A96E",
    colorClass: "text-tier-premium",
    bgClass: "bg-tier-premium",
  },
  medium: {
    slug: "medium",
    label: "Demande moyenne",
    color: "#C8A96E",
    colorClass: "text-tier-medium",
    bgClass: "bg-tier-medium",
  },
  low: {
    slug: "low",
    label: "Demande basse",
    color: "#3B82F6",
    colorClass: "text-tier-low",
    bgClass: "bg-tier-low",
  },
};

export const TIER_ORDER: TierSlug[] = ["fashion-week", "premium", "medium", "low"];

// --- Day-of-week base prices (journée complète, HT) ---
// ISO: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
export const DAY_OF_WEEK_PRICES: Record<number, number> = {
  1: 1000, // Lundi
  2: 2000, // Mardi
  3: 3000, // Mercredi
  4: 4000, // Jeudi
  5: 3000, // Vendredi
  6: 2000, // Samedi
  7: 1000, // Dimanche
};

export const FW_PRICE = 6000;

// Half-day = 60% of full day
export const HALF_DAY_RATIO = 0.6;

// --- Booking window coefficients ---
export const BOOKING_WINDOWS: Record<BookingWindow, { label: string; coeff: number }> = {
  "early-bird": { label: "Early Bird (-15%)", coeff: 0.85 },
  standard: { label: "Tarif standard", coeff: 1.0 },
  confirmed: { label: "Tarif confirmé (+10%)", coeff: 1.1 },
  "last-minute": { label: "Last Minute (-25%)", coeff: 0.75 },
};
