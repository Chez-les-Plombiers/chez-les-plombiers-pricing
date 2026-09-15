import { DAY_OF_WEEK_PRICES } from "@/lib/tier-config";
import { formatPrice } from "@/lib/date-utils";

// ISO 1=Lundi … 7=Dimanche. Les montants viennent de `DAY_OF_WEEK_PRICES` :
// l'encart ne peut donc jamais diverger du moteur de pricing.
const DAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "Lun" },
  { iso: 2, label: "Mar" },
  { iso: 3, label: "Mer" },
  { iso: 4, label: "Jeu" },
  { iso: 5, label: "Ven" },
  { iso: 6, label: "Sam" },
  { iso: 7, label: "Dim" },
];

export function BasePriceGrid() {
  return (
    <div className="mb-4 border border-border bg-surface px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Tarifs de base — journée complète HT
      </p>

      <dl className="mt-2 grid grid-cols-4 gap-x-3 gap-y-2 sm:grid-cols-7">
        {DAYS.map(({ iso, label }) => (
          <div key={iso} className="flex flex-col border-l border-border pl-2">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {label}
            </dt>
            <dd className="font-mono text-sm font-bold text-foreground">
              {formatPrice(DAY_OF_WEEK_PRICES[iso])}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 border-t border-border pt-2 text-xs text-muted">
        Certaines périodes sont à un tarif supérieur, notamment les Fashion
        Weeks. Le tarif applicable à une date s&apos;affiche en cliquant dessus.
        Ces tarifs sont indicatifs et susceptibles d&apos;évoluer selon la
        demande : contactez-nous via WhatsApp pour confirmation.
      </p>
    </div>
  );
}
