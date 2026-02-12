import { computeYearPricing } from "@/lib/pricing-engine";
import { getAllOverrides } from "@/lib/kv";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";

export const dynamic = "force-dynamic";

const YEAR = 2026;

export default async function HomePage() {
  const overrides = await getAllOverrides();
  const days = computeYearPricing(YEAR, overrides);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-foreground sm:text-2xl">
            Calendrier Tarifaire
          </h1>
          <p className="mt-2 text-sm text-muted">
            Cliquez sur un jour pour voir les tarifs détaillés et demander un devis.
          </p>
        </div>
        <CalendarHeatmap days={days} year={YEAR} />
      </main>
      <Footer />
    </div>
  );
}
