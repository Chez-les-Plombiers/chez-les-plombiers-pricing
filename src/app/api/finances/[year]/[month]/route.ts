import { NextResponse } from "next/server";
import { updateFinanceMonth } from "@/lib/kv";

interface PatchBody {
  caPrevisionnel?: number;
  chargesFixes?: number;
  updatedBy?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const token = request.headers.get("Authorization");
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { year: yearStr, month: monthStr } = await params;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Année ou mois invalide" },
      { status: 400 }
    );
  }

  try {
    const body: PatchBody = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.caPrevisionnel !== undefined)
      updates.caPrevisionnel = body.caPrevisionnel;
    if (body.chargesFixes !== undefined)
      updates.chargesFixes = body.chargesFixes;
    if (body.updatedBy) updates.updatedBy = body.updatedBy;

    const months = await updateFinanceMonth(year, month, updates);
    return NextResponse.json(months);
  } catch (error) {
    console.error("PATCH /api/finances error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}
