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
 * ── CE QUE LA PAGE MONTRE, ET CE QU'ELLE NE MONTRE PAS ──────────────────────
 *
 * Elle montre les comptes de la société. Elle ne montre **aucune créance
 * individuelle**, et ce n'est pas une omission technique : afficher un montant
 * dû reviendrait à le reconnaître, alors que quatre points sont ouverts au
 * 30/09/2026 (source : `ADMIN/COMPTABLES/OCA/CALCUL_OCA_2026_05.xlsx`) :
 *
 * 1. **Une cession n'est pas tranchée.** Un souscripteur a cédé la totalité de
 *    sa ligne à trois tiers en février 2026 ; la société envisage de refuser
 *    la cession au titre de l'article 12. Qui porte cette ligne est indécis.
 * 2. **Le brut n'est pas le net.** Les personnes physiques subissent 30 % de
 *    retenue (PFU 12,8 % + prélèvements sociaux 17,2 %) que la société doit
 *    reverser. Annoncer un brut, c'est annoncer 30 % de trop.
 * 3. **Les intérêts de retard courent à 10 %** (art. 4.5), en faveur du
 *    porteur. Un montant affiché sans eux est faux, et faux à la baisse.
 * 4. **Un montant est contesté**, à quelques centaines d'euros près.
 *
 * Le jour où ces quatre points seront tranchés, la position individuelle
 * pourra s'ajouter. Pas avant, et pas par défaut.
 */

// ── Le registre des porteurs, en KV ─────────────────────────────────────────

export type TypePorteur = "physique" | "morale";

export interface Porteur {
  /** Identifiant stable, choisi à la saisie. Sert de clé — ne pas le changer. */
  id: string;
  nom: string;
  /**
   * Décide de la retenue à la source de 30 %. Non utilisé pour l'affichage
   * aujourd'hui (voir plus haut), mais saisi dès maintenant : c'est une donnée
   * de fait, et la redemander plus tard coûterait un aller-retour.
   */
  type: TypePorteur;
  /** Nominal souscrit, en euros. */
  montant: number;
  /** Vrai quand la qualité même de porteur est en discussion. */
  conteste?: boolean;
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
