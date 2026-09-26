/**
 * Le domaine et l'origine pour lesquels une passkey est valable.
 *
 * ⚠️ POINT DECISIF : `rpId` vaut **`chezlesplombiers.fr`**, pas
 * `www.chezlesplombiers.fr`. Une passkey n'est valable que pour son `rpId` et
 * ses sous-domaines. Or cette application est atteignable par DEUX origines —
 * `www.chezlesplombiers.fr/tarifs` (montage multi-zones) et
 * `pricing.chezlesplombiers.fr`. En s'enregistrant sur le domaine racine, la
 * meme clef marche des deux cotes. En s'enregistrant sur `www`, elle ne
 * marcherait que la, et l'echec serait muet.
 *
 * ⚠️ On lit l'en-tete `Origin`, pas `Host` : derriere la reecriture
 * multi-zones, `Host` est celui du deploiement, pas celui que voit le
 * navigateur — et WebAuthn compare avec ce que voit le navigateur.
 */
export function contexteWebAuthn(request: Request): {
  rpId: string;
  origine: string;
} {
  const origine =
    request.headers.get("origin") ??
    `https://${request.headers.get("host") ?? "localhost"}`;

  let hote: string;
  try {
    hote = new URL(origine).hostname;
  } catch {
    hote = "localhost";
  }

  const rpId = hote.endsWith("chezlesplombiers.fr")
    ? "chezlesplombiers.fr"
    : hote; // localhost en developpement, ou tout autre deploiement

  return { rpId, origine };
}

export const RP_NOM = "Chez les Plombiers — Administration";

/** Un seul utilisateur logique pour l'instant : l'administrateur. */
export const UTILISATEUR = {
  id: new TextEncoder().encode("clp-admin"),
  nom: "admin@chezlesplombiers.fr",
  affiche: "Administration CLP",
};
