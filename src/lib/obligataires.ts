import { randomBytes } from "node:crypto";
import { getRedis } from "@/lib/kv";

/**
 * Accès nominatif des porteurs d'OCA à la page de suivi.
 *
 * ── 🔴 AUCUN NOM, AUCUN MONTANT DANS CE FICHIER. C'EST LA RÈGLE. ────────────
 *
 * `Chez-les-Plombiers/chez-les-plombiers-pricing` est un dépôt **PUBLIC**
 * (vérifié le 30/09/2026). Inscrire ici la liste des porteurs publierait sur
 * Internet qui a prêté combien à la société — des personnes privées, dont
 * certaines en discussion avec elle. Ce serait irréversible : GitHub conserve
 * l'historique même après suppression du fichier.
 *
 * → La liste vit donc **uniquement en KV**, saisie depuis l'écran admin.
 *   Ce module ne porte que la mécanique. Si un jour quelqu'un est tenté d'y
 *   « juste ajouter la liste pour aller plus vite » : non. Rendre le dépôt
 *   privé ne suffirait pas non plus, l'historique public est déjà indexé.
 *
 * ── CE QUE LA PAGE MONTRE ───────────────────────────────────────────────────
 *
 * Les comptes de la société, **et la position du porteur** : ce qui lui est dû,
 * ce qu'il a reçu, ce qui reste — intérêts de retard compris.
 *
 * 🔴 CE CHIFFRE ENGAGE LA SOCIÉTÉ, ET C'EST VOULU. Étienne, 30/09/2026 :
 * « oui, et ça me va, je leur dois de l'argent ». La question avait été posée
 * en sens inverse — la page valant reconnaissance de dette — et tranchée ainsi.
 * Ne pas « protéger » la société en retirant ce bloc sans le lui redemander.
 *
 * Trois précautions restent nécessaires, et elles sont tenues par le calcul
 * (`@/lib/oca`), pas par l'omission :
 *   · le **brut et le net** sont affichés séparément, parce qu'une personne
 *     physique subit 30 % de retenue à la source ;
 *   · les **intérêts de retard** (10 %, art. 4.5) sont comptés, en faveur du
 *     porteur — les taire donnerait un chiffre faux à la baisse ;
 *   · une **ligne cédée** s'arrête à la date de cession, et la quote-part reçue
 *     démarre le même jour. Sans ça, le cédant serait sous-payé et le
 *     cessionnaire surpayé du même montant.
 *
 * ⚠️ `conteste` coupe l'affichage de la position pour un porteur donné. À
 * réserver aux cas où la **qualité de créancier** est en discussion — pas aux
 * cas où c'est seulement le montant qui l'est.
 */

// ── Le registre des porteurs, en KV ─────────────────────────────────────────

export type { TypePorteur, LigneOca, Versement } from "@/lib/oca";
import type { TypePorteur, LigneOca, Versement } from "@/lib/oca";

export interface Porteur {
  /** Identifiant stable, choisi à la saisie. Sert de clé — ne pas le changer. */
  id: string;
  nom: string;
  /**
   * Décide de la retenue à la source de 30 %.
   *
   * ⚠️ À VÉRIFIER SUR LE BULLETIN, PAS À DEVINER. Le tableur de mai porte
   * « personne physique (à confirmer) » sur au moins un porteur. Se tromper
   * fait afficher 30 % de trop — ou fait manquer un reversement au Trésor.
   */
  type: TypePorteur;
  /**
   * Les lignes d'obligations du porteur.
   *
   * ⚠️ PLUSIEURS LIGNES SONT LA NORME, PAS L'EXCEPTION, depuis les cessions du
   * 04/02/2026 : un porteur peut cumuler sa souscription d'origine et une
   * quote-part reçue, avec deux points de départ d'intérêts différents.
   */
  lignes: LigneOca[];
  /** Les virements reçus par ce porteur. Imputés du plus ancien au plus récent. */
  versements: Versement[];
  /** Coupe l'affichage de la position : la qualité de porteur est en discussion. */
  conteste?: boolean;
}

/**
 * Le nominal total d'un porteur — la somme de ses lignes.
 *
 * ⚠️ Une ligne CÉDÉE garde son nominal ici alors que le porteur ne la détient
 * plus : c'est volontaire, elle a produit des intérêts qu'on lui doit encore.
 * Ne pas s'en servir pour totaliser l'émission, on compterait deux fois.
 */
export function nominalDe(p: Porteur): number {
  return (p.lignes ?? []).reduce((s, l) => s + (l.nominal || 0), 0);
}

const CLE_PORTEURS = "oblig:porteurs";

export async function listerPorteurs(): Promise<Porteur[]> {
  const redis = getRedis();
  if (!redis) return [];
  return (await redis.get<Porteur[]>(CLE_PORTEURS)) ?? [];
}

export async function enregistrerPorteurs(porteurs: Porteur[]): Promise<void> {
  const redis = getRedis();
  if (redis) await redis.set(CLE_PORTEURS, porteurs);
}

export async function porteurParId(id: string): Promise<Porteur | null> {
  return (await listerPorteurs()).find((p) => p.id === id) ?? null;
}

// ── Accès nominatifs ────────────────────────────────────────────────────────
//
// Un jeton par personne. Deux raisons de ne PAS passer par une variable
// d'environnement : en révoquer un seul imposerait de redéployer, et on ne
// saurait pas qui a ouvert la page. Ici, révoquer = supprimer une clé.
//
// ⚠️ Le jeton vit dans l'URL qu'Étienne envoie : qui a le lien a l'accès. C'est
// assumé, parce que la page ne montre que les comptes de la société — rien sur
// les autres porteurs, et aucune donnée personnelle de tiers.

const cleAcces = (jeton: string) => `oblig:acces:${jeton}`;
const CLE_INDEX = "oblig:index";

export interface Acces {
  id: string;
  creeLe: string;
  /** Dernière ouverture — c'est ce qui dit à Étienne qui a lu. */
  vuLe?: string;
  ouvertures: number;
}

/** Crée (ou retrouve) le jeton d'un porteur. Idempotent par `id`. */
export async function ouvrirAcces(id: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const index = (await redis.get<Record<string, string>>(CLE_INDEX)) ?? {};
  const existant = index[id];
  if (existant) return existant;

  // 18 octets = 24 caractères base64url. Assez long pour n'être pas devinable,
  // assez court pour tenir dans un lien qu'on envoie par WhatsApp.
  const jeton = randomBytes(18).toString("base64url");
  const acces: Acces = { id, creeLe: new Date().toISOString(), ouvertures: 0 };
  await redis.set(cleAcces(jeton), acces);
  index[id] = jeton;
  await redis.set(CLE_INDEX, index);
  return jeton;
}

/** L'index complet : `id` → jeton. Sert à réafficher les liens à Étienne. */
export async function listerAcces(): Promise<Record<string, string>> {
  const redis = getRedis();
  if (!redis) return {};
  return (await redis.get<Record<string, string>>(CLE_INDEX)) ?? {};
}

/** Lit l'état d'un accès sans le compter comme une ouverture. */
export async function lireAcces(jeton: string): Promise<Acces | null> {
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get<Acces>(cleAcces(jeton))) ?? null;
}

/** Révoque UN porteur. Son lien meurt, les autres continuent de vivre. */
export async function revoquerAcces(id: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const index = (await redis.get<Record<string, string>>(CLE_INDEX)) ?? {};
  const jeton = index[id];
  if (!jeton) return false;
  await redis.del(cleAcces(jeton));
  delete index[id];
  await redis.set(CLE_INDEX, index);
  return true;
}

/**
 * Résout un jeton, et note le passage.
 *
 * ⚠️ On n'attend pas l'écriture de la trace : une panne de KV ne doit jamais
 * empêcher quelqu'un de lire la page. La trace est un confort, l'accès est la
 * fonction.
 */
export async function resoudreJeton(
  jeton: string
): Promise<{ porteur: Porteur; acces: Acces } | null> {
  const redis = getRedis();
  if (!redis) return null;
  const acces = await redis.get<Acces>(cleAcces(jeton));
  if (!acces) return null;
  const porteur = await porteurParId(acces.id);
  if (!porteur) return null;

  const maj: Acces = {
    ...acces,
    vuLe: new Date().toISOString(),
    ouvertures: (acces.ouvertures ?? 0) + 1,
  };
  void redis.set(cleAcces(jeton), maj).catch(() => {});
  return { porteur, acces: maj };
}
