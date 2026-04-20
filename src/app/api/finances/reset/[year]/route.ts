import { NextResponse } from "next/server";
import { resetFinances } from "@/lib/kv";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const token = request.headers.get("Authorization");
  if (token !== process.env.ADMIN_PASSWORD) {
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
