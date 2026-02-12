import { NextResponse } from "next/server";
import { setOverride, deleteOverride } from "@/lib/kv";
import type { PricingOverride } from "@/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const auth = request.headers.get("Authorization");
    if (auth !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { date } = await params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Date invalide" },
        { status: 400 }
      );
    }

    const body: Partial<PricingOverride> = await request.json();
    await setOverride({ ...body, date });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Requête invalide" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const auth = request.headers.get("Authorization");
    if (auth !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { date } = await params;
    await deleteOverride(date);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
