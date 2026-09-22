import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export function Navbar() {
  return (
    <nav className="border-b border-border px-4 py-4 sm:px-6">
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
      <div className="mx-auto flex max-w-[1180px] items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="https://www.chezlesplombiers.fr"
            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
            title="Retour au site"
          >
            <ArrowLeft className="h-4 w-4" />
            <Image
              src="/logo.png"
              alt="Chez Les Plombiers"
              width={160}
              height={48}
              className="h-8 w-auto sm:h-10"
              priority
            />
          </a>
        </div>
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          Calendrier tarifaire
        </span>
      </div>
    </nav>
  );
}
