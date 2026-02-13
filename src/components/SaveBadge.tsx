interface SaveBadgeProps {
  bookingWindowCoeff: number;
}

export function SaveBadge({ bookingWindowCoeff }: SaveBadgeProps) {
  // Only show badge when there's a discount (coeff < 1.0)
  if (bookingWindowCoeff >= 1.0) return null;

  const percent = Math.round((1 - bookingWindowCoeff) * 100);
  if (percent < 1) return null;

  return (
    <span
      className="border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400"
    >
      -{percent}%
    </span>
  );
}
