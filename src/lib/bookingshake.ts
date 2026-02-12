import type { QuoteRequest, TimeSlot } from "@/types";
import { TIME_SLOT_LABELS } from "@/types";

const API_BASE_URL = "https://api.bookingshake.io/api";

const TIME_SLOT_TO_HOURS: Record<TimeSlot, { start: string; end: string }> = {
  journee: { start: "09:00", end: "18:00" },
  soiree: { start: "19:00", end: "23:00" },
  "journee-soiree": { start: "09:00", end: "23:00" },
};

/**
 * Send a quote request to BookingShake CRM.
 * Fails silently — the quote is always saved locally in KV as backup.
 */
export async function sendToBookingShake(quote: QuoteRequest): Promise<void> {
  const apiKey = process.env.BOOKINGSHAKE_API_KEY;
  if (!apiKey) return;

  // Format date for BookingShake: DD-MM-YYYY
  const [year, month, day] = quote.date.split("-");
  const bsDate = `${day}-${month}-${year}`;
  const hours = TIME_SLOT_TO_HOURS[quote.timeSlot];

  const comment = [
    `Créneau: ${TIME_SLOT_LABELS[quote.timeSlot]}`,
    `Type: ${quote.eventType}`,
    `Invités: ${quote.guestCount}`,
    quote.company ? `Entreprise: ${quote.company}` : "",
    quote.message ? `Message: ${quote.message}` : "",
    `Source: Calendrier tarifaire en ligne`,
  ]
    .filter(Boolean)
    .join("\n");

  const payload = {
    bookings: [
      {
        date: bsDate,
        start_time: hours.start,
        end_time: hours.end,
        pax: String(quote.guestCount),
        event_type: quote.eventType,
        comments: comment,
      },
    ],
    contact: {
      first_name: quote.firstName,
      last_name: quote.lastName,
      email: quote.email,
      phone: quote.phone,
    },
    company: quote.company ? { name: quote.company } : undefined,
    source_id: "D1uUppihf0ACPSs6o9pV", // "Site internet"
  };

  const response = await fetch(`${API_BASE_URL}/events/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[BookingShake] API error ${response.status}: ${error}`);
    throw new Error(`BookingShake API error: ${response.status}`);
  }

  console.log(`[BookingShake] Event created for ${quote.firstName} ${quote.lastName} on ${bsDate}`);
}
