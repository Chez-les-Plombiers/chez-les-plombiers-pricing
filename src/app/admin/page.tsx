import type { Metadata } from "next";
import { AdminFinancesClient } from "./client";

export const metadata: Metadata = {
  title: "Finances — Chez Les Plombiers",
  robots: { index: false, follow: false },
};

/**
 * ⚠️ `/admin` ouvre sur les FINANCES depuis le 26/09/2026, plus sur le
 * calendrier tarifaire. Etienne : « il faut qu'on arrive directement sur la
 * page finances ». Le calendrier n'est pas supprime — voir `AdminShell`.
 */
export default function Page() {
  return <AdminFinancesClient />;
}
