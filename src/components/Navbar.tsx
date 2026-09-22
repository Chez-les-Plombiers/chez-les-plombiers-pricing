import Image from "next/image";

/**
 * La barre du haut — la MÊME que celle du site, au pixel près.
 *
 * ── POURQUOI ─────────────────────────────────────────────────────────────
 *
 * Étienne, 22/09/2026 : « quand on clique sur Tarifs, on arrive sur un autre
 * header avec une ancienne flèche et tout ». Il avait raison : les tarifs sont
 * une application Next distincte, mais depuis qu'ils sont servis sous le
 * domaine principal par la réécriture multi-zones, ce n'est plus un autre site
 * — c'est une autre page du même. Un changement de barre s'y lit comme une
 * sortie du site, pas comme une navigation.
 *
 * Les jetons de couleur des deux projets sont identiques (#1A1A1A, #E8E4DC,
 * #242424, #C8A96E, #3A3A3A) et le logo est le même fichier, au même octet
 * près. La barre se reproduit donc sans rien importer.
 *
 * ── TROIS DÉCISIONS ──────────────────────────────────────────────────────
 *
 * ⚠️ 1. PAS DE BOUTON « TARIFS ». On y est. Un bouton vers la page où l'on se
 *    trouve est du bruit — et c'est « Calendrier tarifaire », à sa place, qui
 *    dit où on est.
 *
 * ⚠️ 2. LE LOGO RAMÈNE AU SITE. Il remplace la flèche « ← » d'avant, qui ne
 *    disait pas où elle allait. C'est la convention, elle n'a pas besoin
 *    d'être expliquée.
 *
 * ⚠️ 3. DES `<a>` NUS, JAMAIS `next/link`. Cette application déclare
 *    `basePath: "/tarifs"` : `next/link` préfixerait `/` en `/tarifs/` et le
 *    logo tournerait en rond. Un `<a>` ordinaire sort de la zone, ce qu'on
 *    veut ici. Même raison pour `/visiter`.
 */
const TELEPHONE = "+33 7 61 47 10 73";
const TEL_BRUT = "+33761471073";
const WHATSAPP = "https://wa.me/33761471073";

export function Navbar() {
  return (
    <header className="mx-auto max-w-[1180px] px-4 pt-5 sm:px-6">
      <div className="flex items-center justify-between gap-4 border border-border bg-card px-4 py-4 sm:px-5">
        <a href="/" aria-label="Chez les Plombiers, accueil" className="shrink-0">
          <Image
            src="/logo.png"
            alt="Chez Les Plombiers"
            width={160}
            height={48}
            className="h-[22px] w-auto sm:h-[34px]"
            priority
          />
        </a>

        {/* Sur téléphone, le numéro plutôt que des boutons : c'est la seule
            action qu'on cherche vraiment depuis un écran de poche. */}
        <a
          href={`tel:${TEL_BRUT}`}
          className="whitespace-nowrap border border-border px-3 py-2.5 font-mono text-[12px] transition-colors hover:border-accent hover:text-accent sm:hidden"
        >
          {TELEPHONE}
        </a>

        <nav className="hidden items-center gap-2 sm:flex">
          <span className="mr-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            Calendrier tarifaire
          </span>
          <a
            href="/visiter"
            className="border border-border px-4 py-2.5 font-display text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-accent hover:text-accent"
          >
            Visites
          </a>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-border px-4 py-2.5 font-display text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-accent hover:text-accent"
          >
            WhatsApp
          </a>
        </nav>
      </div>
    </header>
  );
}
