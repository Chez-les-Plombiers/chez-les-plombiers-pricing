import { FileText, Info } from "lucide-react";
import type { VenueConfig } from "@/lib/venues";
import { formatPrice } from "@/lib/date-utils";

interface VenueTermsProps {
  venue: VenueConfig;
}

const INFOS_URL = "https://chezlesplombiers.fr/infos";
const WHATSAPP_URL = "https://wa.me/33761471073";

/**
 * Conditions essentielles, affichées sous le calendrier.
 *
 * Objectif : que personne ne puisse dire « je ne savais pas ». Tout ce qui
 * est annoncé ici doit exister dans les CGL signées — les montants de caution
 * et les seuils SSIAP viennent des articles 6 et 10, via la configuration du
 * lieu. Ne rien ajouter ici qui ne soit pas dans le contrat.
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
            Les tarifs affichés sont <strong className="font-normal text-foreground">hors taxes</strong>{" "}
            et correspondent à la <strong className="font-normal text-foreground">location seule</strong>,
            ménage de fin d&apos;événement compris. Les locaux doivent être
            restitués débarrassés de vos déchets, matériel et décor.
          </dd>
        </div>

        <div>
          <dt className="text-foreground">Prestations complémentaires</dt>
          <dd className="mt-1">
            Selon la nature de votre événement, des prestations peuvent
            s&apos;ajouter au tarif de location.{" "}
            {venue.securityRule ? (
              <>
                La présence d&apos;<strong className="font-normal text-foreground">agents de sécurité SSIAP</strong>{" "}
                est notamment obligatoire {venue.securityRule}. Chaque agent est
                facturé 250 € HT pour un forfait de 6 heures ; nous nous
                chargeons de les fournir.
              </>
            ) : (
              <>
                C&apos;est notamment le cas de la sécurité, dont les modalités
                dépendent du format retenu. Nous vous l&apos;indiquons au devis.
              </>
            )}
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
                <strong className="font-normal text-foreground">
                  {formatPrice(venue.deposit)}
                </strong>{" "}
                est exigé pour toute réservation. Il se règle{" "}
                <strong className="font-normal text-foreground">par virement bancaire</strong>{" "}
                uniquement — ni chèque, ni empreinte bancaire. Il vous est
                restitué sous 8 jours après l&apos;état des lieux de sortie,
                déduction faite des sommes éventuellement dues.
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
          Demander les conditions générales de location
        </a>
      </div>
    </section>
  );
}
