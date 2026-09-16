import { NextResponse } from "next/server";
import { trackView, getAnalytics, getAllQuotes } from "@/lib/kv";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isVenueSlug, DEFAULT_VENUE, type VenueSlug } from "@/lib/venues";
import { getISODayOfWeek, getMonthNameShortFR } from "@/lib/date-utils";

export async function POST(request: Request) {
  try {
    if (!(await rateLimit("analytics", clientIp(request), 30))) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
    }
    const { date, venue } = await request.json();
    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Date requise" }, { status: 400 });
    }
    // Le lieu était reçu puis jeté : toutes les vues étaient indistinctes,
    // et l'admin affichait le même total quel que soit le lieu sélectionné.
    await trackView(date, isVenueSlug(venue) ? venue : DEFAULT_VENUE);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};

/**
 * Intérêt mesuré sur un lieu.
 *
 * Le tableau « dates les plus vues » ne répondait à aucune question utile.
 * Ce qui décide d'une grille tarifaire, c'est l'agrégat par JOUR DE LA SEMAINE
 * — « est-ce qu'on nous demande vraiment les lundis ? » — et surtout la
 * comparaison entre les dates regardées et celles qui donnent lieu à un devis.
 * Un jour très consulté mais jamais devisé signale un prix mal placé ; un jour
 * jamais consulté signale une absence de demande, ce qu'aucune baisse de prix
 * ne corrigera.
 */
export async function GET(request: Request) {
  try {
    const auth = request.headers.get("Authorization");
    if (auth !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const raw = new URL(request.url).searchParams.get("venue");
    const venue: VenueSlug = isVenueSlug(raw ?? "") ? (raw as VenueSlug) : DEFAULT_VENUE;

    const [events, quotes] = await Promise.all([getAnalytics(), getAllQuotes()]);

    // Un évènement sans `venue` date d'avant le multi-lieux : à l'époque le
    // calendrier ne montrait que L'ATELIER, l'attribution est donc exacte.
    const venueEvents = events.filter((e) => (e.venue ?? DEFAULT_VENUE) === venue);
    const venueQuotes = quotes.filter((q) => (q.venue ?? DEFAULT_VENUE) === venue);
    const legacyCount = events.filter((e) => !e.venue).length;

    const viewsByWeekday: Record<number, number> = {};
    const viewsByMonth: Record<string, number> = {};
    const viewsByDate: Record<string, number> = {};

    for (const e of venueEvents) {
      // Le jour de la semaine de la DATE CONSULTÉE, pas de l'horodatage :
      // c'est la demande qu'on mesure, pas l'heure de navigation.
      const iso = getISODayOfWeek(e.date);
      viewsByWeekday[iso] = (viewsByWeekday[iso] ?? 0) + 1;
      const monthKey = e.date.slice(0, 7);
      viewsByMonth[monthKey] = (viewsByMonth[monthKey] ?? 0) + 1;
      viewsByDate[e.date] = (viewsByDate[e.date] ?? 0) + 1;
    }

    const quotesByWeekday: Record<number, number> = {};
    for (const q of venueQuotes) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(q.date)) continue;
      const iso = getISODayOfWeek(q.date);
      quotesByWeekday[iso] = (quotesByWeekday[iso] ?? 0) + 1;
    }

    const byWeekday = [1, 2, 3, 4, 5, 6, 7].map((iso) => ({
      iso,
      label: WEEKDAY_LABELS[iso],
      views: viewsByWeekday[iso] ?? 0,
      quotes: quotesByWeekday[iso] ?? 0,
    }));

    const byMonth = Object.entries(viewsByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, views]) => {
        const [y, m] = key.split("-");
        return { key, label: `${getMonthNameShortFR(Number(m) - 1)} ${y.slice(2)}`, views };
      });

    const topDates = Object.entries(viewsByDate)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([date, count]) => ({ date, count }));

    const timestamps = venueEvents.map((e) => e.viewedAt).filter(Boolean).sort();

    return NextResponse.json({
      venue,
      totalViews: venueEvents.length,
      totalQuotes: venueQuotes.length,
      measuredSince: timestamps[0] ?? null,
      legacyCount,
      byWeekday,
      byMonth,
      topDates,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
