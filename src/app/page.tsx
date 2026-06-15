import type { BookingSlot } from "@/lib/google-calendar";
import { computeWindowPricing } from "@/lib/pricing-engine";
import { getAllOverrides } from "@/lib/kv";
import { getCalendarBookings } from "@/lib/google-calendar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";

export const dynamic = "force-dynamic";

const WINDOW_MONTHS = 12;

export default async function HomePage() {
  // Rolling 12-month window starting at the current month.
  const now = new Date();
  const startYear = now.getUTCFullYear();
  const startMonth = now.getUTCMonth(); // 0-11

  const months = Array.from({ length: WINDOW_MONTHS }, (_, i) => {
    const absoluteMonth = startMonth + i;
    return {
      year: startYear + Math.floor(absoluteMonth / 12),
      month: absoluteMonth % 12,
    };
  });

  // Years spanned by the window (1 or 2) — fetch GCal bookings for each.
  const coveredYears = [...new Set(months.map((m) => m.year))];

  const [overrides, ...gcalByYear] = await Promise.all([
    getAllOverrides(),
    ...coveredYears.map((year) => getCalendarBookings(year)),
  ]);

  // Merge Google Calendar bookings into overrides (GCal = source of truth for availability)
  const gcalBookings: Record<string, BookingSlot> = Object.assign({}, ...gcalByYear);
  for (const [date, booking] of Object.entries(gcalBookings)) {
    const existing = overrides[date] || { date };
    overrides[date] = {
      ...existing,
      date,
      isBooked: booking.isBooked || false,
      isBookedMorning: booking.isBookedMorning || false,
      isBookedAfternoon: booking.isBookedAfternoon || false,
    };
  }

  const days = computeWindowPricing(startYear, startMonth, overrides, undefined, WINDOW_MONTHS);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-4 border border-border bg-surface px-4 py-3 text-xs text-muted">
          Les tarifs affichés sont fournis à titre indicatif et sont susceptibles
          d&apos;évoluer selon la demande. Merci de nous contacter via WhatsApp pour
          confirmation.
        </div>
        <div className="mb-8">
          <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-foreground sm:text-2xl">
            Calendrier Tarifaire
          </h1>
          <p className="mt-2 text-sm text-muted">
            Cliquez sur un jour pour voir les tarifs détaillés et demander un devis.
          </p>
        </div>
        <CalendarHeatmap days={days} months={months} />
      </main>
      <Footer />
    </div>
  );
}
