import { NextResponse } from "next/server";
import { getCalendarPassword, setCalendarPassword } from "@/lib/kv";

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const password = await getCalendarPassword();
  return NextResponse.json({
    password: password || process.env.CALENDAR_PASSWORD || "(non configuré)",
  });
}

export async function PUT(request: Request) {
  const auth = request.headers.get("Authorization");
  if (auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { password } = await request.json();
  if (!password || typeof password !== "string" || password.length < 1) {
    return NextResponse.json({ error: "Mot de passe invalide" }, { status: 400 });
  }

  await setCalendarPassword(password);
  return NextResponse.json({ success: true });
}
