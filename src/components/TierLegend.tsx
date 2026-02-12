import { TIERS, TIER_ORDER } from "@/lib/tier-config";

export function TierLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {TIER_ORDER.map((slug) => {
        const tier = TIERS[slug];
        return (
          <div key={slug} className="flex items-center gap-2">
            <div
              className="h-3 w-3 border border-border"
              style={{ backgroundColor: tier.color }}
            />
            <span className="text-xs text-muted">{tier.label}</span>
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 border border-border bg-tier-booked" />
        <span className="text-xs text-muted">Réservé</span>
      </div>
    </div>
  );
}
