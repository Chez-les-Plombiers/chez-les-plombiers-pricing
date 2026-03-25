const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;

interface GCalEvent {
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface BookingSlot {
  isBooked: boolean;
  isBookedMorning: boolean;
  isBookedAfternoon: boolean;
}

/**
 * Parse a dateTime string and extract the local date and hour.
 * We request timeZone=Europe/Paris from the API, so the local part is Paris time.
 * Format: "2026-03-25T07:00:00+01:00"
 */
function parseLocalDateTime(dt: string): { date: string; hour: number } {
  const match = dt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!match) return { date: dt.split("T")[0], hour: 0 };
  return {
    date: match[1],
    hour: parseInt(match[2]) + parseInt(match[3]) / 60,
  };
}

/**
 * Fetch all events from Google Calendar for a given year and return
 * booking slots per date (morning/afternoon/full day).
 */
export async function getCalendarBookings(
  year: number
): Promise<Record<string, BookingSlot>> {
  if (!CALENDAR_ID || !API_KEY) {
    console.warn("[Google Calendar] Missing GOOGLE_CALENDAR_ID or GOOGLE_CALENDAR_API_KEY");
    return {};
  }

  const timeMin = `${year}-01-01T00:00:00Z`;
  const timeMax = `${year}-12-31T23:59:59Z`;

  const params = new URLSearchParams({
    key: API_KEY,
    timeMin,
    timeMax,
    timeZone: "Europe/Paris",
    singleEvents: "true",
    maxResults: "2500",
    fields: "items(start,end)",
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`;

  try {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      console.error("[Google Calendar] API error:", res.status, await res.text());
      return {};
    }

    const data = await res.json();
    const events: GCalEvent[] = data.items || [];
    const bookings: Record<string, BookingSlot> = {};

    for (const event of events) {
      // All-day event → full day booked for each day
      if (event.start.date) {
        const endDate = event.end.date!;
        const current = new Date(event.start.date + "T00:00:00");
        const end = new Date(endDate + "T00:00:00"); // exclusive
        while (current < end) {
          const dateStr = current.toISOString().split("T")[0];
          bookings[dateStr] = {
            isBooked: true,
            isBookedMorning: false,
            isBookedAfternoon: false,
          };
          current.setDate(current.getDate() + 1);
        }
        continue;
      }

      // Timed event
      if (event.start.dateTime && event.end.dateTime) {
        const start = parseLocalDateTime(event.start.dateTime);
        const end = parseLocalDateTime(event.end.dateTime);

        const overlapsMorning = start.hour < 13 && end.hour > 7;
        const overlapsAfternoon = start.hour < 19 && end.hour > 13;

        const existing = bookings[start.date] || {
          isBooked: false,
          isBookedMorning: false,
          isBookedAfternoon: false,
        };

        if (overlapsMorning && overlapsAfternoon) {
          existing.isBooked = true;
        } else if (overlapsMorning) {
          existing.isBookedMorning = true;
        } else if (overlapsAfternoon) {
          existing.isBookedAfternoon = true;
        }

        // Two separate half-day bookings → full day
        if (existing.isBookedMorning && existing.isBookedAfternoon) {
          existing.isBooked = true;
        }

        bookings[start.date] = existing;
      }
    }

    return bookings;
  } catch (err) {
    console.error("[Google Calendar] Fetch error:", err);
    return {};
  }
}
