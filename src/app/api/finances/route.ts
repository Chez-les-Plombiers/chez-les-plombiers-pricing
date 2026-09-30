import { NextResponse } from "next/server";
import { chargerAnnee } from "@/lib/bilan";
import { estAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Le tableau de bord d'Étienne.
 *
 * ⚠️ LE CHARGEMENT A ÉTÉ SORTI D'ICI le 30/09/2026, dans `@/lib/bilan`, parce
 * que la page des obligataires doit lire exactement les mêmes chiffres. Deux
 * implémentations auraient fini par diverger — et c'est un porteur d'OCA qui
 * s'en serait aperçu. Ne pas réintroduire de calcul local dans cette route.
 */
export async function GET(request: Request) {
  if (!(await estAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || "2026", 10);

  try {
    return NextResponse.json(await chargerAnnee(year));
  } catch (error) {
    console.error("GET /api/finances error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des données" },
      { status: 500 }
    );
  }
}
