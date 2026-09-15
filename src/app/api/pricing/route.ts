import { NextResponse } from "next/server";
import { computeYearPricing } from "@/lib/pricing-engine";
import { getAllOverrides, setOverride } from "@/lib/kv";
import { getCalendarBookings } from "@/lib/google-calendar";
import type { PricingOverride } from "@/types";

export async function GET(request: Request) {
  try {
    // L'année n'est plus figée : au 01/01/2027 un `2026` en dur aurait renvoyé
    // zéro réservation et affiché l'année entière comme disponible.
    const { searchParams } = new URL(request.url);
    const parsed = parseInt(searchParams.get("year") ?? "", 10);
    const year =
      Number.isInteger(parsed) && parsed >= 2024 && parsed <= 2100
        ? parsed
        : new Date().getUTCFullYear();

    const [overrides, gcal] = await Promise.all([
      getAllOverrides(),
      getCalendarBookings(year),
    ]);

    // Merge Google Calendar bookings (source of truth for availability)
    for (const [date, booking] of Object.entries(gcal.bookings)) {
      const existing = overrides[date] || { date };
      overrides[date] = {
        ...existing,
        date,
        isBooked: booking.isBooked || false,
        isBookedMorning: booking.isBookedMorning || false,
        isBookedAfternoon: booking.isBookedAfternoon || false,
      };
    }

    const days = computeYearPricing(year, overrides);
    // `calendarUnavailable` : Google n'a pas répondu. Le client doit signaler
    // l'incertitude plutôt que présenter les dates comme libres.
    return NextResponse.json({ year, days, calendarUnavailable: !gcal.ok });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get("Authorization");
    if (auth !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body: PricingOverride = await request.json();

    if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json(
        { error: "Date invalide (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    await setOverride(body);
    return NextResponse.json({ success: true, override: body });
  } catch {
    return NextResponse.json(
      { error: "Requête invalide" },
      { status: 400 }
    );
  }
}
