import { NextResponse } from "next/server";
import { estAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BASE = "https://app.pennylane.com/api/external/v2";

/**
 * Santé de l'intégration Pennylane — les deux clés, et ce qu'elles ouvrent.
 *
 * ── POURQUOI CETTE ROUTE EXISTE ──────────────────────────────────────────
 *
 * Deux clés vivent côte à côte : `PENNYLANE_API_KEY` en lecture, qui alimente
 * le tableau de bord depuis avril, et `PENNYLANE_API_KEY_ECRITURE` posée le
 * 28/09/2026 pour la chaîne devis.
 *
 * ⚠️ LA SECONDE EST DE TYPE « SECRET » DANS VERCEL : sa valeur ne peut plus
 * être relue, même par `vercel env pull`. On ne peut donc pas l'essayer
 * depuis un poste de travail — seule une fonction déployée y a accès. D'où
 * cette route.
 *
 * ⚠️ ET SURTOUT : ELLE EXPIRE LE 27 OCTOBRE 2026. Pennylane ne prévient pas.
 * Le jour venu, la chaîne de devis s'arrêtera avec des 401 que personne ne
 * reliera à une date d'expiration choisie un mois plus tôt. Cette route le
 * dit en clair, et compte les jours.
 *
 * 🔴 AUCUNE ÉCRITURE ICI. On vérifie les droits en LISANT chaque ressource :
 * un scope d'écriture inclut toujours la lecture, donc une lecture qui passe
 * prouve l'accès sans rien créer. Tester en créant laisserait des brouillons
 * dans la comptabilité d'Étienne.
 */

/** Date d'expiration choisie à la création du jeton, le 28/09/2026. */
const EXPIRATION_ECRITURE = "2026-10-27";

async function sonde(cle: string | undefined, chemin: string) {
  if (!cle) return { ok: false, detail: "clé absente" };
  try {
    const r = await fetch(`${BASE}${chemin}`, {
      headers: { Authorization: `Bearer ${cle}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (r.ok) return { ok: true };
    // Pennylane nomme le scope manquant dans le corps : c'est l'information utile.
    const corps = await r.text();
    const scope = corps.match(/scope "([^"]+)"/)?.[1];
    return { ok: false, detail: scope ? `scope manquant : ${scope}` : `HTTP ${r.status}` };
  } catch {
    return { ok: false, detail: "injoignable" };
  }
}

export async function GET(request: Request) {
  if (!(await estAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const lecture = process.env.PENNYLANE_API_KEY;
  const ecriture = process.env.PENNYLANE_API_KEY_ECRITURE;

  const ressources = [
    ["clients", "/customers?page_size=1"],
    ["devis", "/quotes?page_size=1"],
    ["factures", "/customer_invoices?page_size=1"],
    ["produits", "/products?page_size=1"],
  ] as const;

  const [resLecture, resEcriture] = await Promise.all([
    Promise.all(ressources.map(async ([nom, c]) => [nom, await sonde(lecture, c)] as const)),
    Promise.all(ressources.map(async ([nom, c]) => [nom, await sonde(ecriture, c)] as const)),
  ]);

  const jours = Math.ceil(
    (new Date(`${EXPIRATION_ECRITURE}T00:00:00Z`).getTime() - Date.now()) / 86_400_000
  );

  const manquants = resEcriture.filter(([, r]) => !r.ok).map(([n]) => n);

  return NextResponse.json({
    lecture: {
      presente: Boolean(lecture),
      ressources: Object.fromEntries(resLecture),
    },
    ecriture: {
      presente: Boolean(ecriture),
      ressources: Object.fromEntries(resEcriture),
      expireLe: EXPIRATION_ECRITURE,
      joursRestants: jours,
      /* Le message est rédigé ici plutôt que dans l'interface : cette route
         est aussi lue à la main, et par d'autres fils. */
      alerte:
        jours <= 0
          ? "🔴 La clé d'écriture a EXPIRÉ. La chaîne de devis ne peut plus rien créer."
          : jours <= 10
            ? `⚠️ La clé d'écriture expire dans ${jours} jours. À renouveler dans Pennylane → Paramètres → Connectivité → Développeurs.`
            : null,
    },
    pret: Boolean(ecriture) && manquants.length === 0 && jours > 0,
    manquants,
  });
}
