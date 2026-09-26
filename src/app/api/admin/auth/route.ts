import { NextResponse } from "next/server";
import { creerSession, fermerSession, verifierJeton } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Connexion par mot de passe — la voie de secours.
 *
 * ⚠️ CE QUI A CHANGE LE 26/09/2026. Cette route renvoyait le mot de passe
 * lui-meme comme jeton : le secret maitre vivait donc dans le navigateur, ne
 * s'y perimait jamais, et ne pouvait etre revoque pour personne sans l'etre
 * pour tout le monde. Elle ouvre desormais une SESSION — un jeton aleatoire,
 * range en KV, valable 12 h. Le mot de passe ne quitte plus le serveur.
 *
 * Les anciens jetons (= le mot de passe) restent acceptes par `verifierJeton`,
 * le temps que les onglets ouverts se ferment. A retirer une fois la passkey
 * installee sur les appareils d'Etienne.
 */
export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: "Configuration serveur manquante" },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 }
      );
    }

    const jeton = await creerSession("admin", "mot de passe");
    // Sans Redis (developpement local sans KV), on retombe sur l'ancien
    // comportement plutot que de rendre l'administration inaccessible.
    return NextResponse.json({ token: jeton ?? adminPassword });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

/** Deconnexion : la session est detruite cote serveur, pas seulement oubliee. */
export async function DELETE(request: Request) {
  const jeton = request.headers.get("Authorization");
  if (jeton && (await verifierJeton(jeton))) await fermerSession(jeton);
  return NextResponse.json({ ok: true });
}
