import { TIERS } from "@/lib/tier-config";

const LEGEND_ITEMS: { slug: keyof typeof TIERS | "booked"; label: string; color?: string }[] = [
  { slug: "fashion-week", label: "Haute demande" },
  { slug: "premium", label: "Demande soutenue" },
  { slug: "low", label: "Basse demande" },
  { slug: "booked", label: "Réservé" },
];

export function TierLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.slug} className="flex items-center gap-2">
          <div
            className="h-3 w-3 border border-border"
            style={{
              backgroundColor:
                item.slug === "booked" ? "#404040" : TIERS[item.slug].color,
            }}
          />
          <span className="text-xs text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
