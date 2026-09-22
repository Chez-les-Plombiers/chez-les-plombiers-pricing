import Image from "next/image";
import { ArrowLeft } from "lucide-react";

/*
 * ⚠️ 1180 px, LA MÊME LARGEUR QUE LE SITE — pas `max-w-7xl` (1280 px).
 * Étienne, 22/09/2026, les deux pages côte à côte : « la marge de la page
 * tarifs est plus petite […] c'est pas le même format ». Cent pixels d'écart,
 * invisibles page par page, criants au changement d'onglet.
 *
 * ⚠️ NE PAS REMETTRE CE COMMENTAIRE DANS LE JSX. Il y a été inséré le
 * 22/09/2026 sous la forme `/* … *\/` au milieu des enfants d'un élément :
 * en JSX, ce n'est pas un commentaire mais du TEXTE, et il s'est affiché en
 * haut de la page des tarifs, en production. Un commentaire JSX s'écrit
 * `{/* … *\/}` — ou, mieux, se place hors du rendu, comme ici.
 */
export function Navbar() {
  return (
    <nav className="border-b border-border px-4 py-4 sm:px-6">
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
