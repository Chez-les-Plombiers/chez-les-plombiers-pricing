import { MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            {/*
              Lien vers la FICHE Google Maps « Chez Les Plombiers », et non vers
              l'adresse seule : le visiteur tombait sur un point sans nom. Le
              format `search/?api=1` est l'URL documentée par Google — elle
              ouvre l'application native sur iOS et Android quand elle est
              installée, et le web sinon.
            */}
            <a
              href="https://www.google.com/maps/search/?api=1&query=Chez+Les+Plombiers%2C+39+rue+des+Bourdonnais%2C+75001+Paris"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-accent"
            >
              <MapPin className="h-4 w-4 text-accent" />
              39 rue des Bourdonnais, 75001 Paris
            </a>
            <p className="text-xs text-muted">
              L&apos;Atelier · La Boutique · L&apos;Appartement Rose
            </p>
          </div>
          <p className="text-xs text-muted">
            Prix HT — Location seule
          </p>
        </div>
      </div>
    </footer>
  );
}
