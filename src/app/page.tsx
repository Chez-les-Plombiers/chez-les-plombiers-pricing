import { redirect } from "next/navigation";
import { DEFAULT_VENUE } from "@/lib/venues";

/**
 * La racine de pricing.chezlesplombiers.fr redirige vers le lieu par défaut
 * (L'ATELIER). Les liens historiques vers la racine continuent donc de
 * fonctionner sans changement côté site vitrine.
 */
export default function RootPage() {
  redirect(`/${DEFAULT_VENUE}`);
}
