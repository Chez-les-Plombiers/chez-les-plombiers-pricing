import type { TierDefinition, TierSlug } from "@/types";

export const TIERS: Record<TierSlug, TierDefinition> = {
  "fashion-week": {
    slug: "fashion-week",
    label: "Haute demande (Fashion Week)",
    color: "#DC2626",
    colorClass: "text-tier-fashion-week",
    bgClass: "bg-tier-fashion-week",
    prices: {
      matinee: 2300,
      "apres-midi": 2300,
      "journee-complete": 3500,
    },
  },
  premium: {
    slug: "premium",
    label: "Demande soutenue",
    color: "#C8A96E",
    colorClass: "text-tier-premium",
    bgClass: "bg-tier-premium",
    prices: {
      matinee: 2000,
      "apres-midi": 2000,
      "journee-complete": 3000,
    },
  },
  medium: {
    slug: "medium",
    label: "Demande soutenue",
    color: "#C8A96E",
    colorClass: "text-tier-medium",
    bgClass: "bg-tier-medium",
    prices: {
      matinee: 1400,
      "apres-midi": 1400,
      "journee-complete": 2000,
    },
  },
  low: {
    slug: "low",
    label: "Basse demande",
    color: "#3B82F6",
    colorClass: "text-tier-low",
    bgClass: "bg-tier-low",
    prices: {
      matinee: 800,
      "apres-midi": 800,
      "journee-complete": 1200,
    },
  },
};

export const TIER_ORDER: TierSlug[] = ["fashion-week", "premium", "medium", "low"];
