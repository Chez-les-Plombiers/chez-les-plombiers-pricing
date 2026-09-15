import Link from "next/link";
import { listVenues, type VenueSlug } from "@/lib/venues";
import { cn } from "@/lib/utils";

interface VenueSelectorProps {
  current: VenueSlug;
}

/**
 * Sélecteur de lieu — sélection unique.
 *
 * Un seul lieu à la fois : le cumul de lieux et le prix combiné ont été
 * écartés (décision Étienne, 15/09/2026), une demande multi-lieux se négocie
 * de vive voix. Un simple lien par lieu suffit donc : pas d'état client, URL
 * partageable, et un seul clic pour changer de lieu.
 */
export function VenueSelector({ current }: VenueSelectorProps) {
  return (
    <nav
      aria-label="Choix du lieu"
      className="mb-6 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3"
    >
      {listVenues().map((venue, index) => {
        const active = venue.slug === current;
        // Le premier lieu de l'ordre d'affichage est le vaisseau amiral :
        // sur mobile il occupe toute la largeur, les deux autres se partagent
        // la ligne du dessous. Sur écran large, les trois sont à égalité.
        const flagship = index === 0;
        return (
          <Link
            key={venue.slug}
            href={`/${venue.slug}`}
            data-venue-tab={venue.slug}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col gap-0.5 px-4 py-3 transition-colors",
              flagship && "col-span-2 sm:col-span-1",
              active
                ? "bg-card text-foreground"
                : "bg-background text-muted hover:bg-card hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "font-mono text-xs font-bold uppercase tracking-widest",
                active ? "text-venue" : "text-inherit"
              )}
            >
              {venue.name}
            </span>
            <span className="text-[10px] leading-tight text-muted">
              {venue.tagline}
            </span>
            {active && <span className="mt-1 h-0.5 w-8 bg-venue" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}
