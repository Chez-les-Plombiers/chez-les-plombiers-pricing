import { NextResponse } from "next/server";
import { getFinances } from "@/lib/kv";
import { getPennylaneMonthlyData } from "@/lib/pennylane";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const STATUS_LABELS: Record<string, string> = {
  realized: "Réalisé",
  "in-progress": "En cours",
  planned: "Prévisionnel",
};

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
      "Mois,Statut,Charges fixes,Charges variables,CA Manuel,CA Facturé (Pennylane),CA Encaissé (Pennylane),CA Prévisionnel,Résultat,Cumul Résultat\n";

    let cumul = 0;
    const rows = months
      .map((m) => {
        const p = pennylane?.[m.month] ?? { caFacture: 0, caEncaisse: 0 };
        const varTotal =
          m.chargesVar.menage +
          m.chargesVar.fb +
          m.chargesVar.frais +
          m.chargesVar.autres;
        const totalCharges = m.chargesFixes + varTotal;

        const caManuel = m.caManuel ?? 0;
        let caEffectif = m.caPrevisionnel;
        if (m.status === "realized") caEffectif = p.caEncaisse + caManuel;
        else if (m.status === "in-progress") caEffectif = (p.caFacture || 0) + caManuel || m.caPrevisionnel;

        const hasData = m.status === "realized" || caEffectif > 0;
        const resultat = hasData ? caEffectif - totalCharges : 0;
        cumul += hasData ? resultat : 0;

        return [
          MONTH_NAMES[m.month - 1],
          STATUS_LABELS[m.status] || m.status,
          m.chargesFixes,
          varTotal,
          caManuel,
          p.caFacture,
          p.caEncaisse,
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
