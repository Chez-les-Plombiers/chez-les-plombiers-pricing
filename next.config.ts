import type { NextConfig } from "next";

// CSP : self + GA4 (googletagmanager/google-analytics) + Microsoft Clarity.
// 'unsafe-inline' scripts : requis par les snippets GA/Clarity et Next sans infra nonce.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://www.googletagmanager.com https://*.clarity.ms",
  "font-src 'self'",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.clarity.ms https://c.bing.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  /**
   * Le pricing est servi sous `www.chezlesplombiers.fr/tarifs` (montage
   * multi-zones Next.js) : le site vitrine réécrit `/tarifs/*` vers ce
   * déploiement, et `basePath` fait que l'application génère toutes ses URL
   * et tous ses assets sous ce préfixe.
   *
   * Pourquoi ce déménagement (19/09/2026) : un sous-domaine accumule sa
   * confiance à part et n'en fait profiter personne. Or les prix sont le seul
   * contenu que les concurrents ne publient pas — c'est l'actif de
   * référencement du site, il doit vivre sur le domaine principal.
   *
   * ⚠️ Sans `basePath`, les liens internes et `/_next` pointeraient vers la
   * racine du domaine principal, qui ne les connaît pas : page blanche.
   */
  basePath: "/tarifs",

  async redirects() {
    return [
      {
        /**
         * Ancien sous-domaine → nouvelle adresse, en 301 : tous les liens déjà
         * communiqués, imprimés ou cités continuent de fonctionner.
         *
         * `basePath: false` est indispensable : sans lui, `source` serait
         * préfixé et ne matcherait que `/tarifs/*`, alors que ces visiteurs
         * arrivent sur `/`, `/atelier`, `/boutique`…
         *
         * ⚠️ La règle est conditionnée à l'hôte. Elle ne doit JAMAIS attraper
         * `chez-les-plombiers-pricing.vercel.app`, qui est la cible de la
         * réécriture du site principal : ce serait une boucle infinie.
         */
        source: "/:path*",
        basePath: false,
        has: [{ type: "host", value: "pricing\\.chezlesplombiers\\.fr" }],
        destination: "https://www.chezlesplombiers.fr/tarifs/:path*",
        permanent: true,
      },
      // Le portail d'entrée n'existe plus : le pricing est public depuis le
      // 15/09/2026. Reprend la redirection qui vivait dans le middleware.
      { source: "/gate", destination: "/", permanent: true },
      { source: "/gate/:path*", destination: "/", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
