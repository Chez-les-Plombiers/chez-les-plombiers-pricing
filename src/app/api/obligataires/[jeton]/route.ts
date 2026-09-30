import { NextResponse } from "next/server";
import { resoudreJeton, nominalDe } from "@/lib/obligataires";
import { calculerPosition } from "@/lib/oca";
import { bilanPourPorteurs } from "@/lib/bilan";

export const dynamic = "force-dynamic";

/**
 * Ce que lit la page d'un porteur d'OCA.
 *
 * ⚠️ PAS D'EN-TÊTE `Authorization` ICI, ET C'EST VOULU. Le jeton EST l'accès :
 * il arrive par l'URL, parce que les destinataires sont une poignée de
 * personnes à qui on envoie un lien par WhatsApp, pas des utilisateurs d'une
 * application. La contrepartie est assumée — qui détient le lien peut lire.
 *
 * ⚠️ ON NE RENVOIE QUE LA POSITION DU DEMANDEUR. Jamais la liste des autres
 * porteurs, jamais leurs montants : un obligataire n'a pas à savoir ce que les
 * autres ont souscrit. Le jeton résout une personne, et une seule.
 *
 * ⚠️ LA POSITION EST CALCULÉE ICI, PAS STOCKÉE. Les intérêts de retard courent
 * tous les jours : un montant figé en base serait périmé le lendemain, et
 * périmé à la baisse — c'est-à-dire en défaveur du porteur.
 *
 * ⚠️ `no-store, private` : la réponse est nominative. Dans un cache partagé,
 * le lien de l'un servirait la page de l'autre.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jeton: string }> }
) {
  const { jeton } = await params;

  const acces = await resoudreJeton(jeton);
  if (!acces) {
    // Même réponse pour « jeton inconnu » et « accès révoqué » : distinguer
    // les deux renseignerait quelqu'un qui essaie des jetons au hasard.
    return NextResponse.json({ error: "Lien inconnu ou expiré" }, { status: 404 });
  }

  const { porteur } = acces;

  try {
    const bilan = await bilanPourPorteurs(new Date().getFullYear());

    // `conteste` coupe la position, jamais les comptes de la société : même
    // un porteur dont la qualité est discutée est fondé à voir où en est
    // l'entreprise qui lui doit de l'argent.
    const position = porteur.conteste
      ? null
      : calculerPosition(
          porteur.lignes ?? [],
          porteur.type,
          porteur.versements ?? []
        );

    return NextResponse.json(
      {
        porteur: {
          nom: porteur.nom,
          nominal: nominalDe(porteur),
          conteste: porteur.conteste === true,
        },
        position,
        bilan,
      },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    console.error("GET /api/obligataires error:", error);
    return NextResponse.json(
      { error: "Les chiffres ne sont pas disponibles pour le moment" },
      { status: 500 }
    );
  }
}
