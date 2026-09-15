import { FileText, Info } from "lucide-react";
import type { VenueConfig } from "@/lib/venues";
import { formatPrice } from "@/lib/date-utils";

interface VenueTermsProps {
  venue: VenueConfig;
}

const INFOS_URL = "https://chezlesplombiers.fr/infos";
const WHATSAPP_URL = "https://wa.me/33761471073";

/**
 * Conditions essentielles, sous le calendrier.
 *
 * Volontairement court : trois lignes, pas un contrat. L'objectif est qu'un
 * prospect ne puisse pas dire « je ne savais pas » sur les deux points qui
 * changent vraiment son budget — le périmètre du tarif et le dépôt de
 * garantie. Le détail vit dans les CGL, qu'on envoie sur demande.
 *
 * ⚠️ NE PAS détailler ici les prestations de sécurité (nombre d'agents,
 * seuils, tarifs, mention SSIAP). Les locaux n'ont pas de classification ERP
 * définitive, et afficher publiquement ces règles attire l'attention sur un
 * sujet qui se traite au devis et dans les CGL. Décision Étienne, 15/09/2026.
 */
export function VenueTerms({ venue }: VenueTermsProps) {
  return (
    <section
      aria-labelledby="conditions-titre"
      className="mt-10 border border-border bg-surface px-4 py-5 sm:px-6"
    >
      <h2
        id="conditions-titre"
        className="font-mono text-xs font-bold uppercase tracking-widest text-venue"
      >
        À savoir avant de réserver
      </h2>

      <dl className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-muted">
        <div>
          <dt className="text-foreground">Ce que le tarif comprend</dt>
          <dd className="mt-1">
            Les tarifs affichés sont hors taxes et correspondent à la location
            seule, ménage de fin d&apos;événement compris.
          </dd>
        </div>

        <div>
          <dt className="text-foreground">Prestations complémentaires</dt>
          <dd className="mt-1">
            Selon la nature de votre événement, des prestations peuvent
            s&apos;ajouter au tarif de location.
          </dd>
        </div>

        <div>
          <dt className="text-foreground">Dépôt de garantie</dt>
          <dd className="mt-1">
            {venue.deposit === null ? (
              <>Aucun dépôt de garantie n&apos;est demandé pour ce lieu.</>
            ) : (
              <>
                Un dépôt de garantie de{" "}
                <span className="text-foreground">
                  {formatPrice(venue.deposit)}
                </span>{" "}
                est demandé pour toute réservation. Il se règle par virement
                bancaire uniquement, et vous est restitué sous 8 jours après
                l&apos;état des lieux de sortie.
              </>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        <a
          href={INFOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Info className="h-3 w-3" />
          Informations pratiques
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <FileText className="h-3 w-3" />
          Demander les conditions générales
        </a>
      </div>
    </section>
  );
}
