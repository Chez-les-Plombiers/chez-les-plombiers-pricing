import { NextResponse } from "next/server";
import { getFinances, getInvoiceOverrides, getChargesPostes } from "@/lib/kv";
import { getPennylaneData } from "@/lib/pennylane";
import type { FinanceMonthWithPennylane, ChargePoste } from "@/types";

export const dynamic = "force-dynamic";

// Legacy manual CA for months before Pennylane was connected (jan/fév 2026)
const LEGACY_CA_MANUEL: Record<number, Record<number, number>> = {
  2026: { 1: 39_795 },
};

/** Compute total charges per month from the charges postes spreadsheet */
function chargesFromPostes(postes: ChargePoste[]): Record<number, number> {
  const totals: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    totals[m] = postes.reduce((sum, p) => sum + (p.amounts[m] ?? 0), 0);
  }
  return totals;
}

export async function GET(request: Request) {
  const token = request.headers.get("Authorization");
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || "2026", 10);

  try {
    const [months, overrides, chargesPostes] = await Promise.all([
      getFinances(year),
      getInvoiceOverrides(year),
      getChargesPostes(year),
    ]);

    // If charges postes exist in KV, use them as source of truth for chargesFixes
    const chargesOverrides = chargesPostes
      ? chargesFromPostes(chargesPostes)
      : null;

    const pennylaneResult = await getPennylaneData(year, overrides).catch(
      () => null
    );

    const allInvoices = pennylaneResult?.invoices ?? [];
    const monthlyData = pennylaneResult?.monthly;
    const legacyYear = LEGACY_CA_MANUEL[year] ?? {};

    const result: FinanceMonthWithPennylane[] = months.map((m) => {
      const pennylane = monthlyData?.[m.month] ?? {
        caFacture: 0,
        caEncaisse: 0,
        invoiceCount: 0,
      };
      const legacy = legacyYear[m.month] ?? 0;
      if (legacy > 0) {
        pennylane.caFacture += legacy;
        pennylane.caEncaisse += legacy;
      }
      return {
        ...m,
        // Charges from spreadsheet override the defaults
        chargesFixes: chargesOverrides?.[m.month] ?? m.chargesFixes,
        pennylane,
        invoices: allInvoices.filter((inv) => inv.attributedMonth === m.month),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/finances error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des données" },
      { status: 500 }
    );
  }
}
