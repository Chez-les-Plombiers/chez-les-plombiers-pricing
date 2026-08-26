import { NextResponse } from "next/server";
import { addQuote, getAllQuotes } from "@/lib/kv";
import { sendToPipedrive } from "@/lib/pipedrive";
import { sendQuoteNotification } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import type { QuoteRequest } from "@/types";

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("Authorization");
    if (auth !== process.env.ADMIN_PASSWORD) {
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

    // Send to Pipedrive CRM
    try {
      await sendToPipedrive(quote);
    } catch (err) {
      console.error("[Pipedrive] Failed to create deal:", err instanceof Error ? err.message : err);
    }

    // Send email notification to team (with price for context)
    try {
      await sendQuoteNotification({ ...quote, totalPrice: parseFloat(body.totalPrice) || undefined });
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
