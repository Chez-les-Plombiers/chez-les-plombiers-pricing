import type { Metadata } from "next";
import { PageObligataire } from "./client";

/**
 * ⚠️ `noindex, nofollow` N'EST PAS DÉCORATIF. L'adresse porte un jeton
 * nominatif : indexée, elle deviendrait publique et l'accès avec elle. Le
 * `referrer: "no-referrer"` évite en plus que le jeton parte dans l'en-tête
 * `Referer` vers un site tiers si quelqu'un clique un lien depuis la page.
 */
export const metadata: Metadata = {
  title: "Suivi obligataire — Chez Les Plombiers",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function Page({
  params,
}: {
  params: Promise<{ jeton: string }>;
}) {
  const { jeton } = await params;
  return <PageObligataire jeton={jeton} />;
}
