import { NextResponse } from "next/server";
import { getChargesPostes, setChargesPostes } from "@/lib/kv";
import { DEFAULT_CHARGES_POSTES } from "@/lib/finance-defaults";
import { estAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await estAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || "2026", 10);

  const postes = await getChargesPostes(year);
  return NextResponse.json(postes ?? DEFAULT_CHARGES_POSTES);
}

export async function POST(request: Request) {
  if (!(await estAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { year, postes } = await request.json();
  if (!year || !Array.isArray(postes)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await setChargesPostes(year, postes);
  return NextResponse.json({ ok: true });
}
