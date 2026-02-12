import { MapPin, Calendar } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-muted">
              <MapPin className="h-4 w-4 text-accent" />
              39 rue des Bourdonnais, 75001 Paris
            </div>
            <p className="text-xs text-muted">
              200m² — Lieu événementiel brutaliste
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <a
              href="/api/ical"
              className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Calendar className="h-3 w-3" />
              Exporter iCal
            </a>
            <p className="text-xs text-muted">
              Prix HT — Location seule
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
