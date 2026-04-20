import { NextResponse } from "next/server";
import { setInvoiceOverride } from "@/lib/kv";

export async function POST(request: Request) {
  const token = request.headers.get("Authorization");
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { year, invoiceId, month } = await request.json();

    if (!year || !invoiceId || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Paramètres invalides" },
        { status: 400 }
      );
    }

    const overrides = await setInvoiceOverride(year, invoiceId, month);
    return NextResponse.json({ ok: true, overrides });
  } catch (error) {
    console.error("POST /api/finances/invoice-override error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réattribution" },
      { status: 500 }
    );
  }
}
