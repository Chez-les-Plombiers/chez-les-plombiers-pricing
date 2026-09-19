import { FileText, Info } from "lucide-react";
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

const INFOS_URL = "https://www.chezlesplombiers.fr/infos";
const WHATSAPP_URL = "https://wa.me/33761471073";

interface BasePriceGridProps {
  venue: VenueConfig;
}

/**
 * Encart unique : tarifs indicatifs et conditions essentielles.
 *
 * « À titre indicatif » plutôt que « de base » : la grille n'engage pas, et
 * l'intitulé doit le dire avant les montants — c'est ce qui protège une
 * hausse future. Ne pas revenir à une formulation qui se lirait comme un
 * tarif ferme.
 *
 * Les conditions vivaient sous le calendrier, donc après douze grilles
 * mensuelles — personne ne descendait jusque-là. Elles remontent ici, juste
 * sous les prix, là où se pose la question du budget. D'où la forme très
 * compacte : une ligne par sujet, le détail reste dans les CGL.
 *
 * Les montants viennent de la configuration du lieu : l'encart ne peut donc
 * jamais diverger ni du moteur de pricing, ni des CGL signées.
 *
 * ⚠️ NE PAS détailler ici les prestations de sécurité (nombre d'agents,
 * seuils, tarifs, mention SSIAP). Les locaux n'ont pas de classification ERP
 * définitive, et publier ces règles attire l'attention sur un sujet qui se
 * traite au devis. Décision Étienne, 15/09/2026.
 */
export function BasePriceGrid({ venue }: BasePriceGridProps) {
  const pricing = venue.pricing;

  return (
    <section className="mb-6 border border-border bg-surface px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Tarifs à titre indicatif — journée complète HT · {venue.capacityLabel}
      </p>

      {pricing.kind === "flat" ? (
        <p className="mt-2 font-mono text-lg font-bold text-foreground">
          {formatPrice(pricing.price)}{" "}
          <span className="text-xs font-normal text-muted">
            / jour, tous les jours
          </span>
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
        la journée. Le tarif appliqué à une date s&apos;affiche en cliquant
        dessus, et reste susceptible d&apos;évoluer selon la demande.
      </p>

      {/* Conditions essentielles — une ligne par sujet, le détail est aux CGL. */}
      <dl className="mt-3 grid gap-x-6 gap-y-2 border-t border-border pt-3 text-xs text-muted sm:grid-cols-3">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-venue">
            Inclus
          </dt>
          <dd className="mt-0.5">
            Location seule et ménage de fin d&apos;événement.
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-venue">
            En supplément
          </dt>
          <dd className="mt-0.5">
            Des prestations peuvent s&apos;ajouter selon la nature de
            l&apos;événement.
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-venue">
            Dépôt de garantie
          </dt>
          <dd className="mt-0.5">
            {venue.deposit === null ? (
              <>Aucun dépôt n&apos;est demandé pour ce lieu.</>
            ) : (
              <>
                <span className="text-foreground">
                  {formatPrice(venue.deposit)}
                </span>{" "}
                par virement, restitué sous 8 jours après l&apos;état des lieux.
              </>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        <a
          href={INFOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Info className="h-3 w-3" />
          Informations pratiques
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <FileText className="h-3 w-3" />
          Demander les conditions générales
        </a>
      </div>
    </section>
  );
}
