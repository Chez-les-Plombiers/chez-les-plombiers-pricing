import { randomBytes } from "node:crypto";
import { getRedis } from "@/lib/kv";

/**
 * Authentification de l'admin.
 *
 * ⚠️ CE QU'IL Y AVAIT AVANT, ET POURQUOI ON EN SORT. `/api/admin/auth`
 * renvoyait au navigateur **le mot de passe lui-meme** comme jeton, garde en
 * `sessionStorage` et rejoue en en-tete `Authorization` sur chaque appel. Pour
 * une personne seule, ca tient. Mais :
 *   - le secret maitre se promene dans le navigateur, donc lisible par
 *     n'importe quel script tiers qui passerait la CSP ;
 *   - il n'expire pas : une session ouverte l'est pour toujours ;
 *   - il est unique, donc **on ne peut en revoquer aucun sans les revoquer
 *     tous**, et on ne sait jamais qui s'est connecte.
 *
 * On introduit donc une vraie session : un jeton aleatoire, opaque, range en
 * KV avec un role et une echeance. Le mot de passe reste accepte en secours
 * (Celine, un depannage) — il ouvre desormais une session au lieu d'etre le
 * jeton. C'est aussi la fondation des acces en lecture seule a venir pour les
 * obligataires, la banque et le cabinet : il suffira d'un autre `role`.
 */

export type RoleSession = "admin" | "lecture";

export interface Session {
  role: RoleSession;
  /** Comment la session a ete ouverte — « mot de passe », « Face ID »… */
  origine: string;
  creeeLe: string;
  expireLe: string;
}

/** 12 h : assez pour une journee de travail, trop peu pour trainer. */
const DUREE_SECONDES = 12 * 3600;

const cleSession = (jeton: string) => `auth:session:${jeton}`;

export async function creerSession(
  role: RoleSession,
  origine: string
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const jeton = randomBytes(32).toString("base64url");
  const maintenant = Date.now();
  const session: Session = {
    role,
    origine,
    creeeLe: new Date(maintenant).toISOString(),
    expireLe: new Date(maintenant + DUREE_SECONDES * 1000).toISOString(),
  };
  await redis.set(cleSession(jeton), session, { ex: DUREE_SECONDES });
  return jeton;
}

export async function lireSession(jeton: string): Promise<Session | null> {
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get<Session>(cleSession(jeton))) ?? null;
}

export async function fermerSession(jeton: string): Promise<void> {
  const redis = getRedis();
  if (redis) await redis.del(cleSession(jeton));
}

/**
 * Le controle que fait chaque route. Accepte une session valide OU le mot de
 * passe d'administration.
 *
 * ⚠️ Comparaison a temps constant sur le mot de passe : un `!==` fuit sa
 * longueur et son prefixe par le temps de reponse. Le risque est theorique
 * ici, le cout est nul.
 */
export async function verifierJeton(
  jeton: string | null
): Promise<Session | null> {
  if (!jeton) return null;

  const motDePasse = process.env.ADMIN_PASSWORD;
  if (motDePasse && egalite(jeton, motDePasse)) {
    return {
      role: "admin",
      origine: "mot de passe (jeton hérité)",
      creeeLe: new Date().toISOString(),
      expireLe: new Date().toISOString(),
    };
  }

  return lireSession(jeton);
}

/** Vrai si la requete est celle d'un administrateur. */
export async function estAdmin(request: Request): Promise<boolean> {
  const session = await verifierJeton(request.headers.get("Authorization"));
  return session?.role === "admin";
}

function egalite(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
