import type { QuoteRequest, TimeSlot } from "@/types";
import { TIME_SLOT_LABELS } from "@/types";

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

  // This will be called via the MCP BookingShake tool in production
  // For now, we store the formatted data for manual sync
  console.log("[BookingShake] Would send:", {
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
    source_slug: "website",
  });
}
