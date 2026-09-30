import { getFinances, getInvoiceOverrides, getChargesPostes } from "@/lib/kv";
import { getPennylaneData } from "@/lib/pennylane";
import { joursDeLAnnee } from "@/lib/jours-vendus";
import type {
  FinanceMonthWithPennylane,
  FinanceStatus,
  ChargePoste,
} from "@/types";

/**
 * Le chargement d'une année, partagé par le tableau de bord d'Étienne et par
 * la page des obligataires.
 *
 * 🔴 RAISON D'ÊTRE : IL NE DOIT EXISTER QU'UNE SEULE VÉRITÉ. Une page destinée
 * aux porteurs d'OCA qui recalculerait le chiffre d'affaires de son côté
 * finirait, un jour, par afficher autre chose que l'écran d'Étienne. Le jour où
 * ça arriverait, c'est un obligataire qui le découvrirait. D'où cette fonction
 * unique, appelée par les deux.
 */

// CA saisi à la main pour les mois antérieurs au branchement de Pennylane.
const CA_MANUEL_HISTORIQUE: Record<number, Record<number, number>> = {
  2026: { 1: 39_795 },
};

function chargesDepuisPostes(postes: ChargePoste[]): Record<number, number> {
  const totaux: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    totaux[m] = postes.reduce((s, p) => s + (p.amounts[m] ?? 0), 0);
  }
  return totaux;
}

/**
 * Le statut d'un mois, DÉDUIT DE LA DATE.
 *
 * ⚠️ CE QU'IL Y AVAIT AVANT, ET POURQUOI C'ÉTAIT FAUX. Le statut était écrit en
 * dur dans `finance-defaults.ts`, figé au 22/04/2026 : avril restait
 * « en cours » et mai à décembre « prévu ». Le 30/09/2026, le tableau annonçait
 * donc septembre comme une PRÉVISION alors qu'il était encaissé. Inoffensif
 * pour Étienne, qui sait lire son propre tableau ; trompeur pour un tiers.
 *
 * Le statut en KV n'est plus qu'un secours : un mois explicitement marqué
 * « réalisé » le reste, mais on ne laisse plus le temps rendre l'étiquette
 * fausse toute seule.
 */
export function statutDuMois(
  annee: number,
  mois: number,
  maintenant = new Date()
): FinanceStatus {
  const anneeCourante = maintenant.getFullYear();
  const moisCourant = maintenant.getMonth() + 1;
  if (annee < anneeCourante) return "realized";
  if (annee > anneeCourante) return "planned";
  if (mois < moisCourant) return "realized";
  if (mois === moisCourant) return "in-progress";
  return "planned";
}

/** Charge une année complète : KV, charges, et Pennylane. */
export async function chargerAnnee(
  annee: number
): Promise<FinanceMonthWithPennylane[]> {
  const [mois, overrides, postes] = await Promise.all([
    getFinances(annee),
    getInvoiceOverrides(annee),
    getChargesPostes(annee),
  ]);

  const chargesKV = postes ? chargesDepuisPostes(postes) : null;
  const pennylane = await getPennylaneData(annee, overrides).catch(() => null);
  const toutesFactures = pennylane?.invoices ?? [];
  const parMois = pennylane?.monthly;
  const manuel = CA_MANUEL_HISTORIQUE[annee] ?? {};

  return mois.map((m) => {
    const p = parMois?.[m.month] ?? {
      caFacture: 0,
      caEncaisse: 0,
      invoiceCount: 0,
    };
    const ancien = manuel[m.month] ?? 0;
    if (ancien > 0) {
      p.caFacture += ancien;
      p.caEncaisse += ancien;
    }
    return {
      ...m,
      status: statutDuMois(annee, m.month),
      chargesFixes: chargesKV?.[m.month] ?? m.chargesFixes,
      pennylane: p,
      invoices: toutesFactures.filter((f) => f.attributedMonth === m.month),
    };
  });
}

// ── Prévisionnel des mois à venir ───────────────────────────────────────────

/** La hausse appliquée à l'an passé. Choix d'Étienne, 30/09/2026. */
export const CROISSANCE = 0.1;

export interface MoisPrevu {
  mois: number;
  /** Le réalisé de l'an passé, qui sert de base. */
  reference: number;
  /** `reference × (1 + CROISSANCE)`, arrondi à l'euro. */
  prevu: number;
}

/**
 * Le prévisionnel des mois non échus, bâti sur le même mois de l'an passé + 10 %.
 *
 * ⚠️ POURQUOI PAS LE `caPrevisionnel` DÉJÀ SAISI. Il existe en KV (11 000 €,
 * 25 000 €, 20 000 € pour le Q4 2026) mais il a été saisi en avril et n'a pas
 * bougé depuis. Une base explicite et datable — le réalisé de l'an passé — se
 * défend devant un tiers ; un chiffre saisi à la main il y a cinq mois, non.
 *
 * ⚠️ CE PRÉVISIONNEL N'EST PAS UN CARNET DE COMMANDES. Il ne lit pas le
 * calendrier des réservations : c'est une extrapolation, et rien d'autre. Ne
 * jamais l'additionner au réalisé sans le dire — d'où `MoisPrevu` distinct.
 *
 * ⚠️ LA SÉRIE DE RÉFÉRENCE EST INCOMPLÈTE. `jours-vendus.ts` ne porte que les
 * mois où quelque chose a été facturé : 2025 commence en mars. Un mois absent
 * vaut 0, ce qui sous-estime plutôt que d'inventer. C'est le bon sens du risque.
 */
export function previsionnel(
  annee: number,
  maintenant = new Date()
): MoisPrevu[] {
  const anPasse = joursDeLAnnee(annee - 1);
  const reference = new Map(anPasse.map((m) => [m.mois, m.caHt]));

  const prevus: MoisPrevu[] = [];
  for (let m = 1; m <= 12; m++) {
    if (statutDuMois(annee, m, maintenant) !== "planned") continue;
    const base = reference.get(m) ?? 0;
    prevus.push({ mois: m, reference: base, prevu: Math.round(base * (1 + CROISSANCE)) });
  }
  return prevus;
}

// ── Le résumé destiné aux porteurs d'OCA ────────────────────────────────────

export interface LigneMois {
  mois: number;
  statut: FinanceStatus;
  caEncaisse: number;
  charges: number;
  /** Encaissé moins charges. Négatif = le mois a coûté plus qu'il n'a rapporté. */
  solde: number;
}

export interface Bilan {
  annee: number;
  arreteLe: string;
  mois: LigneMois[];
  realise: {
    caEncaisse: number;
    charges: number;
    solde: number;
    /** Nombre de mois échus ou en cours — le dénominateur honnête. */
    moisCouverts: number;
  };
  previsionnel: {
    croissance: number;
    anneeReference: number;
    mois: MoisPrevu[];
    total: number;
  };
  /** Réalisé encaissé + prévisionnel des mois restants. */
  projectionAnnuelle: number;
}

/**
 * Ce que voit un porteur d'OCA.
 *
 * ⚠️ ON PUBLIE L'ENCAISSÉ, PAS LE FACTURÉ. Les deux diffèrent (203 780 € contre
 * 212 105 € au 30/09/2026) et le facturé est le plus flatteur des deux. Face à
 * quelqu'un qui attend un virement, la seule mesure honnête est l'argent
 * réellement entré.
 */
export async function bilanPourPorteurs(annee: number): Promise<Bilan> {
  const mois = await chargerAnnee(annee);
  const maintenant = new Date();

  const lignes: LigneMois[] = mois.map((m) => {
    const caEncaisse = m.pennylane.caEncaisse;
    const charges = m.chargesFixes;
    return {
      mois: m.month,
      statut: m.status,
      caEncaisse,
      charges,
      solde: caEncaisse - charges,
    };
  });

  const echus = lignes.filter((l) => l.statut !== "planned");
  const caEncaisse = echus.reduce((s, l) => s + l.caEncaisse, 0);
  const charges = echus.reduce((s, l) => s + l.charges, 0);

  const prevus = previsionnel(annee, maintenant);
  const totalPrevu = prevus.reduce((s, p) => s + p.prevu, 0);

  return {
    annee,
    arreteLe: maintenant.toISOString(),
    mois: lignes,
    realise: {
      caEncaisse,
      charges,
      solde: caEncaisse - charges,
      moisCouverts: echus.length,
    },
    previsionnel: {
      croissance: CROISSANCE,
      anneeReference: annee - 1,
      mois: prevus,
      total: totalPrevu,
    },
    projectionAnnuelle: caEncaisse + totalPrevu,
  };
}
