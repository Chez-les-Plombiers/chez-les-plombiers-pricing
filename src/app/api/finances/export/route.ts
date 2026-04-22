import { NextResponse } from "next/server";
import { getFinances } from "@/lib/kv";
import { getPennylaneMonthlyData } from "@/lib/pennylane";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function autoStatus(month: number, year: number): string {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  if (year < cy) return "Réalisé";
  if (year > cy) return "Prévisionnel";
  if (month < cm) return "Réalisé";
  if (month === cm) return "En cours";
  return "Prévisionnel";
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = request.headers.get("Authorization");
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || "2026", 10);

  try {
    const [months, pennylane] = await Promise.all([
      getFinances(year),
      getPennylaneMonthlyData(year).catch(() => null),
    ]);

    const header =
      "Mois,Statut,Charges,CA (Pennylane),CA Prévisionnel,Résultat,Cumul Résultat\n";

    let cumul = 0;
    const rows = months
      .map((m) => {
        const p = pennylane?.[m.month] ?? { caFacture: 0, caEncaisse: 0 };
        const status = autoStatus(m.month, year);

        let ca = m.caPrevisionnel;
        if (status === "Réalisé") ca = p.caEncaisse;
        else if (status === "En cours") ca = p.caFacture > 0 ? p.caFacture : m.caPrevisionnel;

        const resultat = ca - m.chargesFixes;
        cumul += resultat;

        return [
          MONTH_NAMES[m.month - 1],
          status,
          m.chargesFixes,
          status === "Réalisé" ? p.caEncaisse : p.caFacture,
          m.caPrevisionnel,
          resultat,
          cumul,
        ].join(",");
      })
      .join("\n");

    return new Response(header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="finances-${year}-clp.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/finances/export error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    );
  }
}
