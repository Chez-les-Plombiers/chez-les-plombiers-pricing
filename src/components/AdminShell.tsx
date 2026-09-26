"use client";
import { apiUrl } from "@/lib/base-path";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { AdminLogin } from "./AdminLogin";
import { deconnexion } from "@/lib/deconnexion";

/**
 * L'enveloppe commune de l'administration : connexion, menu, deconnexion.
 *
 * ── POURQUOI ELLE EXISTE (26/09/2026) ────────────────────────────────────
 *
 * Chaque page refaisait sa propre lecture du jeton et son propre bouton de
 * deconnexion, et la navigation vivait dans une barre d'outils a l'interieur
 * du CALENDRIER — donc atteindre les devis supposait de passer par une page
 * qu'Etienne ne veut plus voir. Le menu est desormais au-dessus des pages,
 * pas dans l'une d'elles.
 *
 * ⚠️ LE CALENDRIER N'EST PAS SUPPRIME, IL EST DELIE. Etienne regle les prix
 * en conversation et ne veut plus y atterrir. Mais cette page est la SEULE
 * interface vers `pricing:overrides`, qui porte plusieurs centaines de
 * decisions tarifaires accumulees depuis 2026. On retire donc le lien, pas le
 * code : `/admin/calendrier` repond toujours, a qui connait l'adresse.
 */
/**
 * ⚠️ DES `<a>` NUS, JAMAIS `next/link` — meme raison que dans `Navbar`, et
 * une de plus. Cette application declare `basePath: "/tarifs"` : `next/link`
 * enverrait sur `/tarifs/admin/...`. Or l'administration est servie a la
 * RACINE du domaine depuis le 26/09/2026 (`chezlesplombiers.fr/admin`), par
 * une reecriture declaree cote site vitrine. Le routeur client de la zone,
 * lui, croit toujours vivre sous `/tarifs` : une navigation cote client
 * reecrirait la barre d'adresse et ferait ressortir le prefixe qu'on vient
 * d'enlever. Un `<a>` recharge la page — c'est le prix, et il est modeste
 * pour une administration.
 */
const ENTREES = [
  { href: "/admin", libelle: "Finances" },
  { href: "/admin/analytics", libelle: "Analytics" },
  { href: "/admin/devis", libelle: "Devis" },
  { href: "/admin/projections", libelle: "Projections" },
];

export function AdminShell({
  titre,
  children,
}: {
  titre: string;
  children: (token: string, sessionPerimee: () => void) => React.ReactNode;
}) {
  // ⚠️ Le jeton se lit dans un effet, PAS dans l'initialiseur de `useState`.
  // Le serveur ne voit pas `sessionStorage` : l'initialiser la faisait rendre
  // l'ecran de connexion au serveur et le tableau de bord au client, donc une
  // erreur d'hydratation a chaque chargement. React s'en remettait, en
  // rejetant tout l'arbre — c'est-a-dire en payant deux rendus a chaque fois.
  const [token, setToken] = useState<string | null>(null);
  const [pret, setPret] = useState(false);
  const chemin = usePathname();

  useEffect(() => {
    setToken(sessionStorage.getItem("admin-token"));
    setPret(true);
  }, []);

  function connexion(t: string) {
    sessionStorage.setItem("admin-token", t);
    setToken(t);
  }

  function sortie() {
    if (token) deconnexion(token);
    sessionStorage.removeItem("admin-token");
    setToken(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-[1300px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {!pret ? null : !token ? (
          <AdminLogin onLogin={connexion} />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-mono text-lg font-bold uppercase tracking-widest text-foreground sm:text-xl">
                {titre}
              </h1>
              <button
                onClick={sortie}
                className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-[#d95f5f] hover:text-[#d95f5f]"
              >
                Déconnexion
              </button>
            </div>

            {/* Le menu defile horizontalement sur telephone plutot que de se
                replier sur deux lignes : Etienne consulte surtout au mobile. */}
            <nav className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div className="flex w-max gap-px border border-border bg-border sm:w-full">
                {ENTREES.map((e) => {
                  // ⚠️ `usePathname` rend le chemin SANS le `basePath` — donc
                  // « /admin/devis » aussi bien depuis la racine que depuis
                  // « /tarifs/admin/devis ». Les deux adresses marchent, une
                  // seule est affichee.
                  const actif =
                    e.href === "/admin" ? chemin === "/admin" : chemin.startsWith(e.href);
                  return (
                    <a
                      key={e.href}
                      href={e.href}
                      aria-current={actif ? "page" : undefined}
                      className={`px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors sm:flex-1 sm:text-center ${
                        actif
                          ? "bg-card text-accent"
                          : "bg-background text-muted hover:bg-card hover:text-foreground"
                      }`}
                    >
                      {e.libelle}
                    </a>
                  );
                })}
              </div>
            </nav>

            {children(token, sortie)}
          </>
        )}
      </main>
    </div>
  );
}

/** Le chemin d'une API de l'administration, pour les pages qui en ont besoin. */
export { apiUrl };
