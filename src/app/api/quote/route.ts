import { NextResponse } from "next/server";
import { addQuote, getAllQuotes } from "@/lib/kv";
import { sendQuoteNotification } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import type { QuoteRequest } from "@/types";
import { getVenue, isVenueSlug, DEFAULT_VENUE } from "@/lib/venues";
import { estAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    if (!(await estAdmin(request))) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const quotes = await getAllQuotes();
    return NextResponse.json({ quotes });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await rateLimit("quote", clientIp(request), 5))) {
      return NextResponse.json(
        { error: "Trop de demandes, réessayez dans une minute" },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validation
    const venueSlug =
      typeof body.venue === "string" && isVenueSlug(body.venue)
        ? body.venue
        : DEFAULT_VENUE;
    const venue = getVenue(venueSlug);

    const required = ["date", "timeSlot", "firstName", "lastName", "email", "phone", "guestCount", "eventType"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Champ requis manquant : ${field}` },
          { status: 400 }
        );
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Adresse email invalide" },
        { status: 400 }
      );
    }

    const quote: QuoteRequest = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      venue: venueSlug,
      date: body.date,
      timeSlot: body.timeSlot,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      company: body.company || undefined,
      siret: body.siret || undefined,
      endClient: body.endClient || undefined,
      numberOfDays: parseInt(body.numberOfDays, 10) || 1,
      guestCount: parseInt(body.guestCount, 10),
      eventType: body.eventType,
      message: body.message || undefined,
      createdAt: new Date().toISOString(),
    };

    // Store in KV
    await addQuote(quote);

    // Pipedrive : abandonné le 15/09/2026, plus aucun deal n'est créé depuis
    // le calendrier. Les leads vivent en KV et partent par email.

    // Send email notification to team (with price for context)
    try {
      await sendQuoteNotification({
        ...quote,
        venueName: venue.name,
        totalPrice: parseFloat(body.totalPrice) || undefined,
      });
    } catch (err) {
      console.error("[Email] Failed to send notification:", err instanceof Error ? err.message : err);
    }

    return NextResponse.json({ success: true, id: quote.id });
  } catch {
    return NextResponse.json(
      { error: "Requête invalide" },
      { status: 400 }
    );
  }
}
