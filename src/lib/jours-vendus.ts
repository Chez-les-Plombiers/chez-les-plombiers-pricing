/**
 * Jours vendus et prix moyen par jour — série livrée par le fil AUDIT.
 *
 * Source : `clp-finance/reports/serie-mensuelle-jours-ca.tsv`, livrée le 27/09/2026,
 * régénérable par `scripts/34_serie_mensuelle.py`. Recopiée ici en constante :
 * le tableau de bord tourne sur Vercel et ne lira jamais le SQLite du référentiel.
 *
 * ── TROIS PIÈGES, SIGNALÉS PAR LE FIL AUDIT ─────────────────────────────────
 *
 * ⚠️ 1. LE PRIX MOYEN SE DIVISE PAR `joursFactures`, JAMAIS PAR `joursVendus`.
 *    Sur 2026, 114 jours sont vendus mais 58 seulement portent une facture.
 *    Diviser par 114 donnerait 1 144 €/jour au lieu de 2 249 € — un chiffre qui
 *    ne correspond à rien, et c'est celui qu'on obtient par défaut. On reprend
 *    donc `prixMoyenJour` tel quel plutôt que de le recalculer.
 *
 * ⚠️ 2. `joursFactures` N'EST PAS UN SOUS-ENSEMBLE DE `joursVendus`. Une facture
 *    de 2,5 jours couvre trois journées là où le calendrier n'en porte qu'une.
 *    Sur 2025 : 37 contre 36. C'est un signal, pas une incohérence.
 *
 * ⚠️ 3. UN MOIS PEUT AFFICHER DES JOURS FACTURÉS ET 0 €. Le CA va au mois du
 *    PREMIER jour, les journées vont chacune à leur mois. Mai 2026 est ce cas.
 *    Répartir au prorata serait une convention de plus — non tranchée.
 *
 * ── ET LE PLUS IMPORTANT ────────────────────────────────────────────────────
 *
 * 🔴 `couverture` EST LA PART DU CA DU MOIS RATTACHÉE À UN JOUR. Sans elle, un
 *    mois à 10 % de rattachement s'affiche comme un mois creux. Juin 2026 n'est
 *    pas un mois faible : c'est un mois non rattaché. **Ne jamais afficher les
 *    jours sans afficher la couverture.**
 *
 * ⚠️ ÉCART RELEVÉ LE 27/09/2026 : la note d'accompagnement du fil AUDIT annonce
 *    55 jours facturés, 126 920 € et 2 308 €/jour pour 2026. Le TSV et le
 *    rapport détaillé disent tous deux 58, 130 420 € et 2 248,62 €. Les deux
 *    sources générées par le script concordent ; c'est la note qui diverge.
 *    On suit le TSV. À faire confirmer.
 */

export interface MoisJours {
  annee: number;
  mois: number;
  joursVendus: number;
  joursFactures: number;
  caHt: number;
  /** Déjà calculé par le référentiel — ne pas recalculer. Voir piège n° 1. */
  prixMoyenJour: number | null;
  /** 0 à 1, ou null quand le mois ne porte aucune facture. */
  couverture: number | null;
}

const SERIE: MoisJours[] = [
  { annee: 2025, mois: 3, joursVendus: 2, joursFactures: 2, caHt: 15384, prixMoyenJour: 7692, couverture: 1.0 },
  { annee: 2025, mois: 4, joursVendus: 1, joursFactures: 3, caHt: 12540, prixMoyenJour: 4180, couverture: 1.0 },
  { annee: 2025, mois: 6, joursVendus: 9, joursFactures: 9, caHt: 48543, prixMoyenJour: 5394, couverture: 1.0 },
  { annee: 2025, mois: 7, joursVendus: 1, joursFactures: 1, caHt: 4550, prixMoyenJour: 4550, couverture: 1.0 },
  { annee: 2025, mois: 9, joursVendus: 1, joursFactures: 1, caHt: 4700, prixMoyenJour: 4700, couverture: 1.0 },
  { annee: 2025, mois: 10, joursVendus: 7, joursFactures: 6, caHt: 16750, prixMoyenJour: 2792, couverture: 1.0 },
  { annee: 2025, mois: 11, joursVendus: 10, joursFactures: 10, caHt: 34566, prixMoyenJour: 3457, couverture: 0.93 },
  { annee: 2025, mois: 12, joursVendus: 5, joursFactures: 5, caHt: 15750, prixMoyenJour: 3150, couverture: 1.0 },
  { annee: 2026, mois: 1, joursVendus: 8, joursFactures: 8, caHt: 40295, prixMoyenJour: 5037, couverture: 1.0 },
  { annee: 2026, mois: 2, joursVendus: 1, joursFactures: 0, caHt: 0, prixMoyenJour: null, couverture: null },
  { annee: 2026, mois: 3, joursVendus: 8, joursFactures: 3, caHt: 4500, prixMoyenJour: 1500, couverture: 0.6 },
  { annee: 2026, mois: 4, joursVendus: 14, joursFactures: 9, caHt: 35500, prixMoyenJour: 3944, couverture: 0.53 },
  { annee: 2026, mois: 5, joursVendus: 6, joursFactures: 4, caHt: 0, prixMoyenJour: 0, couverture: 0.0 },
  { annee: 2026, mois: 6, joursVendus: 14, joursFactures: 1, caHt: 1000, prixMoyenJour: 1000, couverture: 0.1 },
  { annee: 2026, mois: 7, joursVendus: 22, joursFactures: 20, caHt: 25000, prixMoyenJour: 1250, couverture: 0.84 },
  { annee: 2026, mois: 9, joursVendus: 13, joursFactures: 9, caHt: 19375, prixMoyenJour: 2153, couverture: 0.44 },
  { annee: 2026, mois: 10, joursVendus: 23, joursFactures: 4, caHt: 4750, prixMoyenJour: 1188, couverture: 1.0 },
  { annee: 2026, mois: 11, joursVendus: 5, joursFactures: 0, caHt: 0, prixMoyenJour: null, couverture: null },
];

/** La série d'une année, ou un tableau vide si on n'en a pas. */
export function joursDeLAnnee(annee: number): MoisJours[] {
  return SERIE.filter((m) => m.annee === annee);
}

/**
 * Le cumul d'une année.
 *
 * ⚠️ La couverture d'ensemble se calcule sur les MONTANTS, pas en moyennant les
 * pourcentages mensuels : un mois à 100 % qui pèse 4 750 € ne compense pas un
 * mois à 10 % qui en pèse 10 435.
 */
export function cumulJours(annee: number, caMoisTotal: number[]): {
  joursVendus: number;
  joursFactures: number;
  caHt: number;
  prixMoyenJour: number | null;
  couverture: number | null;
} | null {
  const s = joursDeLAnnee(annee);
  if (!s.length) return null;
  const joursVendus = s.reduce((t, m) => t + m.joursVendus, 0);
  const joursFactures = s.reduce((t, m) => t + m.joursFactures, 0);
  const caHt = s.reduce((t, m) => t + m.caHt, 0);
  const total = caMoisTotal.reduce((t, v) => t + v, 0);
  return {
    joursVendus,
    joursFactures,
    caHt,
    prixMoyenJour: joursFactures ? Math.round(caHt / joursFactures) : null,
    couverture: total > 0 ? caHt / total : null,
  };
}

/** Le CA total du mois selon le référentiel — sert de dénominateur à la couverture. */
export const CA_MOIS_TOTAL: Record<number, number[]> = {
  2025: [0, 0, 15384, 12540, 0, 48543, 4550, 0, 4700, 16750, 37233, 15750],
  2026: [40295, 0, 7500, 67500, 6500, 10435, 29750, 0, 43875, 4750, 0, 0],
};
