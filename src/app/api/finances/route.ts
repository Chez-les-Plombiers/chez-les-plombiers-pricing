import { NextResponse } from "next/server";
import { getFinances, getInvoiceOverrides } from "@/lib/kv";
import { getPennylaneData } from "@/lib/pennylane";
import type { FinanceMonthWithPennylane } from "@/types";

export const dynamic = "force-dynamic";

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

    const result: FinanceMonthWithPennylane[] = months.map((m) => ({
      ...m,
      pennylane: monthlyData?.[m.month] ?? {
        caFacture: 0,
        caEncaisse: 0,
        invoiceCount: 0,
      },
      invoices: allInvoices.filter((inv) => inv.attributedMonth === m.month),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/finances error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des données" },
      { status: 500 }
    );
  }
}
