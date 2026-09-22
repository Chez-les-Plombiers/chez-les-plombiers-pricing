/**
 * Préfixe sous lequel cette application est servie.
 *
 * ⚠️ Doit rester identique à `basePath` dans `next.config.ts`.
 *
 * Pourquoi ce fichier existe : Next préfixe automatiquement les liens
 * (`next/link`) et les assets qu'il génère lui-même, **mais pas les `fetch`
 * écrits à la main**. Un `fetch("/api/quote")` depuis le navigateur partirait
 * donc sur `www.chezlesplombiers.fr/api/quote` — une route du site vitrine,
 * qui n'existe pas — au lieu de `/tarifs/api/quote`.
 *
 * C'est le piège classique de `basePath`, et il est silencieux : tout compile,
 * tout s'affiche, et seules les actions échouent (devis, connexion admin,
 * enregistrement des prix). Tout appel réseau de cette application doit donc
 * passer par `apiUrl()`.
 */
export const BASE_PATH = "/tarifs";

/** Préfixe un chemin d'API de la zone. `apiUrl("/api/quote")` → `/tarifs/api/quote`. */
export function apiUrl(path: string): string {
  return `${BASE_PATH}${path}`;
}

/**
 * Préfixe un fichier de `public/`. `assetUrl("/logo.png")` → `/tarifs/logo.png`.
 *
 * ⚠️ CE COMMENTAIRE AFFIRMAIT QUE `next/image` PRÉFIXE TOUT SEUL. C'était vrai,
 * et ça a cessé de l'être le 22/09/2026 — sans que rien ne le signale.
 *
 * Ce jour-là, le quota de transformations d'images du plan Hobby a été épuisé
 * et on a posé `images: { unoptimized: true }` pour en sortir. Or c'est le
 * chargeur d'images qui ajoutait le préfixe, en construisant l'URL
 * `/tarifs/_next/image?url=…`. Sans optimiseur, `next/image` émet le `src` tel
 * qu'on l'a écrit : `/logo.png`, c'est-à-dire la racine du SITE VITRINE, où ce
 * fichier n'existe pas. Le logo de la barre des tarifs a disparu, et personne
 * ne pouvait relier la cause à l'effet — la correction portait sur le poids
 * des photos du site, pas sur cette application.
 *
 * ⚠️ Donc : dans cette application, TOUT chemin vers `public/` passe par ici,
 * `next/image` compris. C'est la même règle que pour `apiUrl()`, et pour la
 * même raison — ne pas dépendre de ce que Next veut bien préfixer.
 */
export function assetUrl(path: string): string {
  return `${BASE_PATH}${path}`;
}
