interface SaveBadgeProps {
  currentPrice: number;
  maxPrice: number;
}

export function SaveBadge({ currentPrice, maxPrice }: SaveBadgeProps) {
  if (currentPrice >= maxPrice) return null;
  const percent = Math.round(((maxPrice - currentPrice) / maxPrice) * 100);
  if (percent < 5) return null;

  return (
    <span
      className="border border-tier-low/30 bg-tier-low/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-tier-low"
      title={`vs tarif Haute demande`}
    >
      -{percent}% vs Haute demande
    </span>
  );
}
