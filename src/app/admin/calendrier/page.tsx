import type { Metadata } from "next";
import { AdminCalendrierClient } from "./client";

export const metadata: Metadata = {
  title: "Calendrier tarifaire — Chez Les Plombiers",
  robots: { index: false, follow: false },
};

/**
 * ⚠️ PAGE VOLONTAIREMENT ABSENTE DU MENU (26/09/2026).
 *
 * Etienne regle les prix en conversation et ne veut plus atterrir ici. Mais
 * c'est la SEULE interface vers `pricing:overrides`, qui porte plusieurs
 * centaines de decisions tarifaires accumulees depuis 2026 : on a retire le
 * lien, pas le code. L'adresse repond toujours.
 */
export default function Page() {
  return <AdminCalendrierClient />;
}
