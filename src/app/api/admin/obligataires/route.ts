import { NextResponse } from "next/server";
import { estAdmin } from "@/lib/auth";
import { calculerPosition } from "@/lib/oca";
import {
  listerPorteurs,
  enregistrerPorteurs,
  listerAcces,
  lireAcces,
  ouvrirAcces,
  revoquerAcces,
  type Porteur,
} from "@/lib/obligataires";

export const dynamic = "force-dynamic";

/**
 * L'administration des accès obligataires — réservée à Étienne.
 *
 * ⚠️ C'EST ICI QUE VIVENT LES NOMS, ET NULLE PART AILLEURS. Le dépôt est
 * public : la liste des porteurs et leurs montants n'existent qu'en KV, saisis
 * par cette route. Voir l'en-tête de `@/lib/obligataires`.
 */

/** `2026-01-31` et rien d'autre — une date molle fausserait tout le prorata. */
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const dateOuRien = (v: unknown) =>
  typeof v === "string" && DATE_ISO.test(v) ? v : undefined;

function nettoyer(p: unknown): Porteur | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const nom = typeof o.nom === "string" ? o.nom.trim() : "";
  if (!id || !nom) return null;

  const lignes = (Array.isArray(o.lignes) ? o.lignes : [])
    .map((l) => {
      const x = (l ?? {}) as Record<string, unknown>;
      const nominal = Number(x.nominal);
      if (!Number.isFinite(nominal) || nominal <= 0) return null;
      return {
        nominal: Math.round(nominal),
        depuis: dateOuRien(x.depuis),
        jusqua: dateOuRien(x.jusqua),
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  if (!lignes.length) return null;

  const versements = (Array.isArray(o.versements) ? o.versements : [])
    .map((v) => {
      const x = (v ?? {}) as Record<string, unknown>;
      const montant = Number(x.montant);
      const date = dateOuRien(x.date);
      if (!date || !Number.isFinite(montant) || montant <= 0) return null;
      return {
        date,
        montant: Math.round(montant * 100) / 100,
        libelle: typeof x.libelle === "string" ? x.libelle.trim() : undefined,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    id,
    nom,
    type: o.type === "physique" ? "physique" : "morale",
    lignes,
    versements,
    conteste: o.conteste === true,
  };
}

/** La liste des porteurs, avec le lien de chacun quand il en a un. */
export async function GET(request: Request) {
  if (!(await estAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [porteurs, index] = await Promise.all([listerPorteurs(), listerAcces()]);
  const avecAcces = await Promise.all(
    porteurs.map(async (p) => {
      const jeton = index[p.id];
      const acces = jeton ? await lireAcces(jeton) : null;
      return {
        ...p,
        jeton: jeton ?? null,
        vuLe: acces?.vuLe ?? null,
        ouvertures: acces?.ouvertures ?? 0,
        // La position telle que le porteur la verra — Étienne doit pouvoir la
        // relire avant d'envoyer le lien, pas la découvrir en même temps que lui.
        position: calculerPosition(p.lignes ?? [], p.type, p.versements ?? []),
      };
    })
  );
  return NextResponse.json({ porteurs: avecAcces });
}

/**
 * Enregistre la liste des porteurs.
 *
 * ⚠️ REMPLACEMENT INTÉGRAL, PAS FUSION. C'est le comportement attendu d'un
 * éditeur de liste : retirer une ligne à l'écran doit la retirer pour de bon.
 * En revanche on ne touche à AUCUN accès existant — un porteur momentanément
 * absent de la liste garde son jeton, qui cessera simplement de résoudre. Le
 * révoquer est une action distincte, explicite.
 */
export async function PUT(request: Request) {
  if (!(await estAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const corps = await request.json();
    const brut = Array.isArray(corps?.porteurs) ? corps.porteurs : null;
    if (!brut) {
      return NextResponse.json({ error: "Liste attendue" }, { status: 400 });
    }
    const porteurs = brut.map(nettoyer).filter((p: Porteur | null): p is Porteur => p !== null);
    if (porteurs.length !== brut.length) {
      return NextResponse.json(
        { error: "Chaque porteur doit avoir un identifiant, un nom et au moins une ligne d'obligations avec un nominal" },
        { status: 400 }
      );
    }
    const ids = new Set(porteurs.map((p: Porteur) => p.id));
    if (ids.size !== porteurs.length) {
      return NextResponse.json(
        { error: "Deux porteurs portent le même identifiant" },
        { status: 400 }
      );
    }
    await enregistrerPorteurs(porteurs);
    return NextResponse.json({ ok: true, porteurs });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

/** Ouvre l'accès d'un porteur et renvoie son lien. Idempotent. */
export async function POST(request: Request) {
  if (!(await estAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const { id } = await request.json();
    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ error: "Identifiant attendu" }, { status: 400 });
    }
    const jeton = await ouvrirAcces(id.trim());
    if (!jeton) {
      return NextResponse.json(
        { error: "Stockage indisponible — accès non créé" },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, id: id.trim(), jeton });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}

/** Révoque l'accès d'un seul porteur. */
export async function DELETE(request: Request) {
  if (!(await estAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Identifiant attendu" }, { status: 400 });
  }
  const fait = await revoquerAcces(id);
  return NextResponse.json({ ok: fait });
}
