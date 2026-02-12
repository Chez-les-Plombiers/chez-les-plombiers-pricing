import type { TierDefinition, TierSlug } from "@/types";

export const TIERS: Record<TierSlug, TierDefinition> = {
  "fashion-week": {
    slug: "fashion-week",
    label: "Fashion Week",
    color: "#FBBF24",
    colorClass: "text-tier-fashion-week",
    bgClass: "bg-tier-fashion-week",
    prices: {
      journee: 2300,
      soiree: 1800,
      "journee-soiree": 3500,
    },
  },
  premium: {
    slug: "premium",
    label: "Premium",
    color: "#EF4444",
    colorClass: "text-tier-premium",
    bgClass: "bg-tier-premium",
    prices: {
      journee: 2000,
      soiree: 1500,
      "journee-soiree": 3000,
    },
  },
  medium: {
    slug: "medium",
    label: "Medium",
    color: "#FB923C",
    colorClass: "text-tier-medium",
    bgClass: "bg-tier-medium",
    prices: {
      journee: 1400,
      soiree: 1000,
      "journee-soiree": 2000,
    },
  },
  low: {
    slug: "low",
    label: "Low",
    color: "#4ADE80",
    colorClass: "text-tier-low",
    bgClass: "bg-tier-low",
    prices: {
      journee: 800,
      soiree: 600,
      "journee-soiree": 1200,
    },
  },
};

export const TIER_ORDER: TierSlug[] = ["fashion-week", "premium", "medium", "low"];
