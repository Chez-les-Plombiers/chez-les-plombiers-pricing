/**
 * Les conditions du contrat d'émission d'OCA, et le calcul d'une position.
 *
 * ── SOURCE ─────────────────────────────────────────────────────────────────
 * `CHEZ LES PLOMBIERS/ADMIN/COMPTABLES/OCA/` — contrat d'émission (AGE du
 * 19/07/2024), bulletins signés, et `CALCUL_OCA_2026_05.xlsx` qui fait foi sur
 * l'interprétation retenue par la société.
 *
 * ⚠️ AUCUN NOM, AUCUN MONTANT INDIVIDUEL DANS CE FICHIER — le dépôt est public.
 * Ici, les règles ; en KV, les personnes. Voir `@/lib/obligataires`.
 *
 * ── CE QUE CE MODULE ASSUME ────────────────────────────────────────────────
 * Il calcule ce que la société doit **selon sa propre lecture du contrat**, et
 * ce chiffre est montré au porteur. Décision d'Étienne, 30/09/2026 : « oui, et
 * ça me va, je leur dois de l'argent ». Le montant affiché engage donc la
 * société — ce n'est pas un effet de bord, c'est l'intention.
 */

/**
 * Date de souscription au sens du contrat (art. 3.4) : la constatation du
 * versement effectif par le Président, le **24/09/2024**.
 *
 * ⚠️ CE N'EST NI « FIN SEPTEMBRE » NI LA DATE DU BULLETIN. Les bulletins
 * s'échelonnent du 5 août au 6 septembre 2024 ; le contrat retient un point de
 * départ unique. Justin Personnaz conteste précisément ce point et calcule
 * depuis le 06/08/2024 — d'où les ~470 € d'écart entre sa réclamation
 * (5 226,03 €) et la position de la société (4 736,99 €).
 */
export const DATE_SOUSCRIPTION = "2024-09-24";

/** Art. 4.1 — 7 % l'an, base 365, intérêts NON capitalisés. */
export const TAUX_ANNUEL = 0.07;
export const BASE_JOURS = 365;

/** Art. 4.5 — intérêts de retard, en faveur du porteur. */
export const TAUX_RETARD = 0.1;

/**
 * Art. 125 A CGI + CSG/CRDS : 12,8 % + 17,2 % = 30 %, dus par les seules
 * personnes physiques. La société **retient à la source et reverse au Trésor**
 * (formulaire 2777, déclaration IFU 2561).
 *
 * ⚠️ Annoncer un brut à une personne physique, c'est annoncer 30 % de plus que
 * ce qu'elle touchera. On calcule les deux, et la page affiche les deux.
 */
export const TAUX_PFU = 0.128;
export const TAUX_PS = 0.172;
export const TAUX_RETENUE = TAUX_PFU + TAUX_PS;

export type TypePorteur = "physique" | "morale";

/**
 * Une ligne d'obligations.
 *
 * 🔴 POURQUOI UNE LIGNE ET PAS UN PORTEUR. Les cessions du 04/02/2026, prenant
 * effet au 31/01/2026, ont coupé la ligne de 50 000 € de Côté Maison en deux
 * dans le temps : le cédant reste créancier des intérêts courus AVANT, les
 * cessionnaires le deviennent APRÈS. Et un même porteur peut cumuler une ligne
 * d'origine et une quote-part reçue — avec deux points de départ différents.
 * Un modèle « un nominal par personne » ne sait pas représenter ça.
 */
export interface LigneOca {
  /** Nominal de la ligne, en euros. */
  nominal: number;
  /** Départ des intérêts. Défaut : la souscription d'origine. */
  depuis?: string;
  /** Fin des intérêts pour ce porteur — une ligne cédée s'arrête ici. */
  jusqua?: string;
}

export interface Versement {
  /** AAAA-MM-JJ */
  date: string;
  montant: number;
  libelle?: string;
}

export interface Echeance {
  /** AAAA-MM-JJ — anniversaire, ou date de cession pour un reliquat. */
  date: string;
  /** Ce que couvre l'échéance, en clair. */
  periode: string;
  /** Nombre de jours courus — 365 pour une année pleine, moins pour un prorata. */
  jours: number;
  brut: number;
  retenue: number;
  /** Ce que le porteur doit toucher : brut − retenue. */
  net: number;
  /** Ce qui a été imputé dessus. */
  regle: number;
  /** `net − regle`, jamais négatif. */
  restant: number;
  joursDeRetard: number;
  /** Art. 4.5, sur la part restante. */
  interetsDeRetard: number;
}

export interface Position {
  nominalTotal: number;
  type: TypePorteur;
  taux: number;
  /** Les échéances ÉCHUES seulement — on n'appelle pas une dette non exigible. */
  echeances: Echeance[];
  totalBrut: number;
  totalRetenue: number;
  totalNet: number;
  totalVerse: number;
  /** `totalNet − totalVerse`. Négatif = le porteur a reçu plus que dû. */
  resteDu: number;
  totalInteretsDeRetard: number;
  /** Ce qu'il faudrait virer aujourd'hui pour être à jour. */
  resteDuAvecRetard: number;
  /** Quand `resteDu` est négatif : le trop-versé, imputé sur la suite. */
  tropVerse: number;
  /** La prochaine échéance non encore échue, s'il y en a une. */
  prochaineEcheance: string | null;
}

function jours(de: string, a: string): number {
  const d = Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10));
  const f = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  return Math.round((f - d) / 86_400_000);
}

function anniversaire(n: number): string {
  const [a, m, j] = DATE_SOUSCRIPTION.split("-");
  return `${+a + n}-${m}-${j}`;
}

const fr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/**
 * Découpe une ligne en périodes d'intérêts, bornées par les anniversaires.
 *
 * ⚠️ UNE LIGNE CÉDÉE PRODUIT UN RELIQUAT exigible à la date de cession, pas à
 * l'anniversaire suivant : la créance est arrêtée ce jour-là. C'est ce qui
 * donne les « 129 jours » du reliquat de Côté Maison (24/09/2025 → 31/01/2026).
 *
 * ⚠️ UNE LIGNE REÇUE PAR CESSION démarre en cours d'année : sa première
 * échéance ne couvre pas douze mois. Calculer 7 % pleins la première année
 * surpaierait le cessionnaire, et sous-paierait le cédant du même montant.
 */
function periodes(ligne: LigneOca, aujourdhui: string) {
  const debut = ligne.depuis ?? DATE_SOUSCRIPTION;
  const fin = ligne.jusqua ?? null;

  // Les anniversaires strictement postérieurs au début de la ligne.
  const bornes: string[] = [];
  for (let n = 1; n <= 7; n++) {
    const a = anniversaire(n);
    if (jours(debut, a) > 0 && (!fin || jours(a, fin) > 0)) bornes.push(a);
  }
  // Une ligne arrêtée porte un reliquat exigible le jour de l'arrêt.
  if (fin) bornes.push(fin);

  const out: { date: string; depuis: string; jusqua: string }[] = [];
  let curseur = debut;
  for (const b of bornes) {
    out.push({ date: b, depuis: curseur, jusqua: b });
    curseur = b;
  }
  // On ne retient que ce qui est exigible aujourd'hui.
  return out.filter((p) => jours(p.date, aujourdhui) >= 0);
}

/**
 * La position d'un porteur au jour dit, toutes lignes confondues.
 *
 * ⚠️ IMPUTATION DU PLUS ANCIEN AU PLUS RÉCENT — c'est le droit commun : un
 * paiement éteint d'abord la dette la plus ancienne. Conséquence pratique, un
 * virement fait « au titre de 2026 » solde d'abord 2025 s'il restait dû, et
 * arrête les intérêts de retard sur la bonne échéance.
 *
 * ⚠️ UN TROP-VERSÉ SE REPORTE, IL NE SE RÉCLAME PAS. C'est la stratégie du
 * tableur pour une personne physique payée en brut au lieu du net : on impute
 * sur l'échéance suivante plutôt que de demander un remboursement.
 */
export function calculerPosition(
  lignes: LigneOca[],
  type: TypePorteur,
  versements: Versement[],
  aujourdhui = new Date().toISOString().slice(0, 10)
): Position {
  const tauxRetenue = type === "physique" ? TAUX_RETENUE : 0;

  // Toutes les périodes de toutes les lignes, fusionnées par date d'exigibilité.
  const parDate = new Map<string, { jours: number; brut: number; libelles: string[] }>();
  for (const ligne of lignes) {
    for (const p of periodes(ligne, aujourdhui)) {
      const n = jours(p.depuis, p.jusqua);
      if (n <= 0) continue;
      const brut = (ligne.nominal * TAUX_ANNUEL * n) / BASE_JOURS;
      const e = parDate.get(p.date) ?? { jours: 0, brut: 0, libelles: [] };
      e.jours = Math.max(e.jours, n);
      e.brut += brut;
      e.libelles.push(`${fr(p.depuis)} → ${fr(p.jusqua)}`);
      parDate.set(p.date, e);
    }
  }

  const dates = [...parDate.keys()].sort();
  let disponible = versements.reduce((s, v) => s + (v.montant || 0), 0);
  const totalVerse = disponible;

  const echeances: Echeance[] = dates.map((date) => {
    const { jours: n, brut, libelles } = parDate.get(date)!;
    const retenue = brut * tauxRetenue;
    const net = brut - retenue;
    const regle = Math.min(disponible, net);
    disponible -= regle;
    const restant = Math.max(0, net - regle);
    const joursDeRetard = restant > 0 ? Math.max(0, jours(date, aujourdhui)) : 0;
    return {
      date,
      periode: [...new Set(libelles)].join(" · "),
      jours: n,
      brut,
      retenue,
      net,
      regle,
      restant,
      joursDeRetard,
      interetsDeRetard: (restant * TAUX_RETARD * joursDeRetard) / BASE_JOURS,
    };
  });

  const totalBrut = echeances.reduce((s, e) => s + e.brut, 0);
  const totalRetenue = echeances.reduce((s, e) => s + e.retenue, 0);
  const totalNet = totalBrut - totalRetenue;
  const resteDu = totalNet - totalVerse;
  const totalInteretsDeRetard = echeances.reduce((s, e) => s + e.interetsDeRetard, 0);

  // La prochaine date d'exigibilité, pour une ligne encore vivante.
  let prochaine: string | null = null;
  for (const ligne of lignes) {
    if (ligne.jusqua) continue;
    for (let n = 1; n <= 7; n++) {
      const a = anniversaire(n);
      if (jours(a, aujourdhui) < 0 && (!prochaine || a < prochaine)) {
        prochaine = a;
        break;
      }
    }
  }

  return {
    nominalTotal: lignes.reduce((s, l) => s + l.nominal, 0),
    type,
    taux: TAUX_ANNUEL,
    echeances,
    totalBrut,
    totalRetenue,
    totalNet,
    totalVerse,
    resteDu,
    totalInteretsDeRetard,
    resteDuAvecRetard: Math.max(0, resteDu) + totalInteretsDeRetard,
    tropVerse: resteDu < 0 ? -resteDu : 0,
    prochaineEcheance: prochaine,
  };
}
