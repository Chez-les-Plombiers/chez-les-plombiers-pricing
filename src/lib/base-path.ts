/**
 * Préfixe sous lequel cette application est servie.
 *
 * ⚠️ Doit rester identique à `basePath` dans `next.config.ts`.
 *
 * Pourquoi ce fichier existe : Next préfixe automatiquement les liens
 * (`next/link`), les images (`next/image`) et les assets, **mais pas les
 * `fetch` écrits à la main**. Un `fetch("/api/quote")` depuis le navigateur
 * partirait donc sur `www.chezlesplombiers.fr/api/quote` — une route du site
 * vitrine, qui n'existe pas — au lieu de `/tarifs/api/quote`.
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
