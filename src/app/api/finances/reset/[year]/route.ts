import { NextResponse } from "next/server";
import { resetFinances } from "@/lib/kv";
import { estAdmin } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  if (!(await estAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (isNaN(year)) {
    return NextResponse.json({ error: "Année invalide" }, { status: 400 });
  }

  try {
    const months = await resetFinances(year);
    return NextResponse.json(months);
  } catch (error) {
    console.error("POST /api/finances/reset error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation" },
      { status: 500 }
    );
  }
}
