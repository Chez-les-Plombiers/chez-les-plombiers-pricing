import { NextResponse } from "next/server";
import { getChargesPostes, setChargesPostes } from "@/lib/kv";
import { DEFAULT_CHARGES_POSTES } from "@/lib/finance-defaults";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || "2026", 10);

  const postes = await getChargesPostes(year);
  return NextResponse.json(postes ?? DEFAULT_CHARGES_POSTES);
}

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { year, postes } = await request.json();
  if (!year || !Array.isArray(postes)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await setChargesPostes(year, postes);
  return NextResponse.json({ ok: true });
}
