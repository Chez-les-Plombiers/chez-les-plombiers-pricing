import { NextResponse } from "next/server";
import { resoudreJeton } from "@/lib/obligataires";
import { bilanPourPorteurs } from "@/lib/bilan";

export const dynamic = "force-dynamic";

/**
 * Ce que lit la page d'un porteur d'OCA.
 *
 * ⚠️ PAS D'EN-TÊTE `Authorization` ICI, ET C'EST VOULU. Le jeton EST l'accès :
 * il arrive par l'URL, parce que les destinataires sont sept personnes à qui on
 * envoie un lien par WhatsApp, pas des utilisateurs d'une application. La
 * contrepartie est assumée — qui détient le lien peut lire — et elle est tenable
 * parce que la réponse ne contient QUE les comptes de la société : aucune
 * donnée personnelle, et rien sur les autres porteurs.
 *
 * ⚠️ ON NE RENVOIE NI LE MONTANT SOUSCRIT NI UNE CRÉANCE. Voir l'en-tête de
 * `@/lib/obligataires` : quatre points sont ouverts (cession non tranchée,
 * brut contre net, intérêts de retard, montant contesté) et tout chiffre
 * individuel affiché vaudrait reconnaissance. Seul le prénom et le nom
 * reviennent, pour que la personne sache que le lien est bien le sien.
 *
 * ⚠️ `no-store` : cette réponse est nominative. Elle ne doit jamais atterrir
 * dans un cache partagé, où le lien de l'un servirait la page de l'autre.
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

  try {
    const bilan = await bilanPourPorteurs(new Date().getFullYear());
    return NextResponse.json(
      { porteur: { nom: acces.porteur.nom }, bilan },
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
