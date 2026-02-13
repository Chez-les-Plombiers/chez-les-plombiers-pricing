import { NextResponse } from "next/server";
import { getCalendarPassword } from "@/lib/kv";

export async function POST(request: Request) {
  const { code } = await request.json();
  const password =
    (await getCalendarPassword()) || process.env.CALENDAR_PASSWORD;

  if (!password || code !== password) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("clp-access", password, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90, // 90 jours
    path: "/",
  });
  return response;
}
