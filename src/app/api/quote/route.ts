import { NextResponse } from "next/server";
import { addQuote, getAllQuotes } from "@/lib/kv";
import { sendToPipedrive } from "@/lib/pipedrive";
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
      guestCount: parseInt(body.guestCount, 10),
      eventType: body.eventType,
      message: body.message || undefined,
      createdAt: new Date().toISOString(),
    };

    // Store in KV
    await addQuote(quote);

    // Send to Pipedrive CRM (non-blocking)
    sendToPipedrive(quote).catch(() => {
      // Silently fail — quote is already saved in KV
    });

    return NextResponse.json({ success: true, id: quote.id });
  } catch {
    return NextResponse.json(
      { error: "Requête invalide" },
      { status: 400 }
    );
  }
}
