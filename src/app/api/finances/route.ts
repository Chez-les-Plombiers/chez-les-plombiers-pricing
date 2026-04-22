import { NextResponse } from "next/server";
import { getFinances, getInvoiceOverrides } from "@/lib/kv";
import { getPennylaneData } from "@/lib/pennylane";
import type { FinanceMonthWithPennylane } from "@/types";

export const dynamic = "force-dynamic";

// Legacy manual CA for months before Pennylane was connected (jan/fév 2026)
// These were previously in the "CA Manuel" column, now hardcoded.
const LEGACY_CA_MANUEL: Record<number, Record<number, number>> = {
  2026: { 1: 39_795 },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || "2026", 10);

  try {
    const [months, overrides] = await Promise.all([
      getFinances(year),
      getInvoiceOverrides(year),
    ]);

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
      // Inject legacy manual CA into Pennylane data for pre-Pennylane months
      const legacy = legacyYear[m.month] ?? 0;
      if (legacy > 0) {
        pennylane.caFacture += legacy;
        pennylane.caEncaisse += legacy;
      }
      return {
        ...m,
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
