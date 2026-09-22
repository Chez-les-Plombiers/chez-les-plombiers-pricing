import { MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 sm:px-6">
      /*
       * ⚠️ 1180 px, LA MÊME LARGEUR QUE LE SITE — pas `max-w-7xl` (1280 px).
       *
       * Étienne, 22/09/2026, les deux pages côte à côte : « la marge de la page
       * tarifs est plus petite […] c'est pas le même format ». Cent pixels d'écart,
       * invisibles page par page, criants au changement d'onglet — et depuis que
       * `/tarifs` est servi sous le domaine principal, ce n'est plus un autre site
       * mais une autre page du même.
       *
       * ⚠️ Ne concerne QUE les pages publiques. L'administration et les tableaux de
       * bord gardent `max-w-7xl` : ce sont des outils, pas des pages qu'on lit.
       */
      <div className="mx-auto max-w-[1180px]">
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
