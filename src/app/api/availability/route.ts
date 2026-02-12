import { NextResponse } from "next/server";
import { getBookedDates, setBookedDates } from "@/lib/kv";

export async function GET() {
  try {
    const dates = await getBookedDates();
    return NextResponse.json({ dates });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = request.headers.get("Authorization");
    if (auth !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { dates }: { dates: string[] } = await request.json();

    if (!Array.isArray(dates)) {
      return NextResponse.json(
        { error: "Format invalide: dates doit être un tableau" },
        { status: 400 }
      );
    }

    await setBookedDates(dates);
    return NextResponse.json({ success: true, count: dates.length });
  } catch {
    return NextResponse.json(
      { error: "Requête invalide" },
      { status: 400 }
    );
  }
}
