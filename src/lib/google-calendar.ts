const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID?.trim();
const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY?.trim();

interface GCalEvent {
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export interface BookingSlot {
  isBooked: boolean;
  isBookedMorning: boolean;
  isBookedAfternoon: boolean;
}

export interface CalendarBookings {
  bookings: Record<string, BookingSlot>;
  /**
   * `false` si Google Calendar n'a pas pu être interrogé.
   * L'appelant NE DOIT PAS afficher « tout est disponible » dans ce cas :
   * une liste vide signifie « on ne sait pas », pas « rien n'est réservé ».
   * (Incident du 26/08/2026 : clé API cassée → calendrier public entièrement
   * libre pendant 5 jours, risque de double-booking.)
   */
  ok: boolean;
}

// ── Règles métier : évènement qui franchit minuit ──
// Le lendemain, le client peut débarrasser son matériel sans être facturé
// jusqu'à 10h. Entre 10h et midi, une demi-journée est due. Après midi,
// une seconde journée complète est due.
const OVERFLOW_FREE_UNTIL_HOUR = 10;
const OVERFLOW_HALF_DAY_UNTIL_HOUR = 12;

// Au-delà de cette heure, l'évènement bloque la journée entière.
const EVENING_BLOCKS_FULL_DAY_HOUR = 19;

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
 * Décale une date "YYYY-MM-DD" de n jours.
 * Passe par Date.UTC pour ne jamais dépendre du fuseau du serveur : un
 * `new Date("2026-10-14T00:00:00")` est interprété en heure locale, et un
 * runtime en Europe/Paris décalerait alors toutes les dates d'un jour.
 */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dayOnly(dateStr).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().split("T")[0];
}

/** Normalise en "YYYY-MM-DD" : l'API renvoie `date: "2026-09-07"`, mais
 *  certains clients renvoient `"2026-09-07T00:00:00Z"`. */
function dayOnly(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function emptySlot(): BookingSlot {
  return { isBooked: false, isBookedMorning: false, isBookedAfternoon: false };
}

/** Marque la journée entière comme réservée, sans effacer les demi-journées déjà posées. */
function markFullDay(bookings: Record<string, BookingSlot>, date: string): void {
  const slot = bookings[date] ?? emptySlot();
  slot.isBooked = true;
  bookings[date] = slot;
}

/** Applique un créneau [startHour, endHour] sur une journée donnée. */
function markHours(
  bookings: Record<string, BookingSlot>,
  date: string,
  startHour: number,
  endHour: number
): void {
  // Règle Étienne (15/09/2026) : un évènement qui se prolonge au-delà de 19h
  // mobilise le lieu pour la soirée → journée entière bloquée, même s'il n'a
  // commencé qu'à 15h. Couvre aussi les soirées démarrant après 19h, que le
  // modèle matin/après-midi ignorait totalement.
  if (endHour > EVENING_BLOCKS_FULL_DAY_HOUR) {
    markFullDay(bookings, date);
    return;
  }

  const overlapsMorning = startHour < 13 && endHour > 7;
  const overlapsAfternoon = startHour < 19 && endHour > 13;

  // Aucun chevauchement : ne rien écrire. Une entrée « vide » serait mergée
  // dans les overrides KV et effacerait une réservation posée à la main.
  if (!overlapsMorning && !overlapsAfternoon) return;

  const slot = bookings[date] ?? emptySlot();

  if (overlapsMorning && overlapsAfternoon) {
    slot.isBooked = true;
  } else if (overlapsMorning) {
    slot.isBookedMorning = true;
  } else {
    slot.isBookedAfternoon = true;
  }

  // Deux demi-journées distinctes → journée complète
  if (slot.isBookedMorning && slot.isBookedAfternoon) {
    slot.isBooked = true;
  }

  bookings[date] = slot;
}

/**
 * Fetch all events from Google Calendar for a given year and return
 * booking slots per date (morning/afternoon/full day).
 */
export async function getCalendarBookings(
  year: number
): Promise<CalendarBookings> {
  if (!CALENDAR_ID || !API_KEY) {
    console.warn("[Google Calendar] Missing GOOGLE_CALENDAR_ID or GOOGLE_CALENDAR_API_KEY");
    return { bookings: {}, ok: false };
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
      return { bookings: {}, ok: false };
    }

    const data = await res.json();
    return { bookings: buildBookings(data.items || []), ok: true };
  } catch (err) {
    console.error("[Google Calendar] Fetch error:", err);
    return { bookings: {}, ok: false };
  }
}

/**
 * Transforme une liste d'évènements Google en occupation jour par jour.
 * Fonction pure, exportée pour être testable sans appel réseau.
 */
export function buildBookings(events: GCalEvent[]): Record<string, BookingSlot> {
  const bookings: Record<string, BookingSlot> = {};

  for (const event of events) {
    // Évènement journée entière → chaque jour de la plage est réservé.
    // `end.date` est exclusif côté Google.
    if (event.start.date) {
      const endDate = dayOnly(event.end.date!);
      let current = dayOnly(event.start.date);
      while (current < endDate) {
        markFullDay(bookings, current);
        current = addDays(current, 1);
      }
      continue;
    }

    // Évènement horaire
    if (event.start.dateTime && event.end.dateTime) {
      const start = parseLocalDateTime(event.start.dateTime);
      const end = parseLocalDateTime(event.end.dateTime);

      if (end.date === start.date) {
        markHours(bookings, start.date, start.hour, end.hour);
        continue;
      }

      // L'évènement franchit minuit.
      // 1. Jour de début : occupé jusqu'à minuit (et non jusqu'à `end.hour`,
      //    qui vaut par ex. 1 pour une soirée finissant à 01h00 — c'était le
      //    bug : ni `1 > 7` ni `1 > 13`, donc la journée ressortait libre).
      markHours(bookings, start.date, start.hour, 24);

      // 2. Journées intermédiaires : entièrement occupées.
      let current = addDays(start.date, 1);
      while (current < end.date) {
        markFullDay(bookings, current);
        current = addDays(current, 1);
      }

      // 3. Dernier jour : règle de débordement (cf. constantes en tête).
      if (end.hour > OVERFLOW_HALF_DAY_UNTIL_HOUR) {
        markFullDay(bookings, end.date);
      } else if (end.hour > OVERFLOW_FREE_UNTIL_HOUR) {
        markHours(bookings, end.date, 7, 12);
      }
      // sinon (≤ 10h) : rien — temps de débarrassage offert
    }
  }

  return bookings;
}
