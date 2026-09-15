import type { VenueConfig } from "@/lib/venues";
import { formatPrice } from "@/lib/date-utils";

// ISO 1=Lundi … 7=Dimanche.
const DAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "Lun" },
  { iso: 2, label: "Mar" },
  { iso: 3, label: "Mer" },
  { iso: 4, label: "Jeu" },
  { iso: 5, label: "Ven" },
  { iso: 6, label: "Sam" },
  { iso: 7, label: "Dim" },
];

interface BasePriceGridProps {
  venue: VenueConfig;
}

/**
 * Encart « Tarifs de base ».
 *
 * Les montants viennent de la configuration du lieu : l'encart ne peut donc
 * jamais diverger du moteur de pricing. Un lieu à tarif unique affiche une
 * seule ligne — sept cases identiques n'apprendraient rien.
 */
export function BasePriceGrid({ venue }: BasePriceGridProps) {
  const pricing = venue.pricing;

  return (
    <div className="mb-6 border border-border bg-surface px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Tarifs de base — journée complète HT · {venue.capacityLabel}
      </p>

      {pricing.kind === "flat" ? (
        <p className="mt-2 font-mono text-lg font-bold text-foreground">
          {formatPrice(pricing.price)}{" "}
          <span className="text-xs font-normal text-muted">/ jour, tous les jours</span>
        </p>
      ) : (
        <dl className="mt-2 grid grid-cols-4 gap-x-3 gap-y-2 sm:grid-cols-7">
          {DAYS.map(({ iso, label }) => (
            <div key={iso} className="flex flex-col border-l border-border pl-2">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {label}
              </dt>
              <dd className="font-mono text-sm font-bold text-foreground">
                {formatPrice(pricing.prices[iso])}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-3 border-t border-border pt-2 text-xs text-muted">
        Pendant les Fashion Weeks, le tarif passe à{" "}
        <span className="font-mono text-foreground">
          {formatPrice(venue.fashionWeekPrice)}
        </span>{" "}
        la journée. Le tarif applicable à une date s&apos;affiche en cliquant
        dessus. Ces tarifs sont indicatifs et susceptibles d&apos;évoluer selon
        la demande : contactez-nous via WhatsApp pour confirmation.
      </p>
    </div>
  );
}
