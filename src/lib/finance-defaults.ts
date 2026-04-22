import type { FinanceMonth, ChargePoste } from "@/types";

// ── Charges fixes réelles par mois (brief Etienne 21/04/2026) ──
// Toutes en HT. EDF varie par mois, le reste est constant.

const EDF_BY_MONTH: Record<number, number> = {
  1: 302, 2: 235, 3: 207, 4: 191, 5: 176, 6: 286,
  7: 340, 8: 187, 9: 201, 10: 223, 11: 360, 12: 389,
};

function chargesFixesMois(month: number): number {
  return (
    5_000 +  // Loyer
    5_833 +  // Crédit travaux
    (EDF_BY_MONTH[month] ?? 300) +
    228 +    // Assurance
    742 +    // Copro / Foncier
    2_000 +  // Expert-comptable
    450 +    // Fibre
    300 +    // Logiciels
    132 +    // Frais bancaires
    135      // Divers (CB)
  );
}

// Charges variables exceptionnelles (sept: intérêts obligataires 14 700€)
const CHARGES_VAR_BY_MONTH: Record<number, number> = {
  9: 14_700,
};

export function totalChargesMois(month: number): number {
  return chargesFixesMois(month) + (CHARGES_VAR_BY_MONTH[month] ?? 0);
}

// ── Default postes for the ChargesFixesEditor ──

export const DEFAULT_CHARGES_POSTES: ChargePoste[] = [
  { id: "loyer",      label: "Loyer",              tvaRate: 0.20, inputMode: "ht", amounts: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1, 5_000])) },
  { id: "credit",     label: "Crédit travaux",     tvaRate: 0,    inputMode: "ht", amounts: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1, 5_833])) },
  { id: "edf",        label: "EDF",                tvaRate: 0.20, inputMode: "ht", amounts: { ...EDF_BY_MONTH } },
  { id: "assurance",  label: "Assurance",           tvaRate: 0,    inputMode: "ht", amounts: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1, 228])) },
  { id: "copro",      label: "Copro / Foncier",    tvaRate: 0,    inputMode: "ht", amounts: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1, 742])) },
  { id: "comptable",  label: "Expert-comptable",   tvaRate: 0.20, inputMode: "ht", amounts: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1, 2_000])) },
  { id: "fibre",      label: "Fibre",              tvaRate: 0.20, inputMode: "ht", amounts: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1, 450])) },
  { id: "logiciels",  label: "Logiciels",           tvaRate: 0.20, inputMode: "ht", amounts: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1, 300])) },
  { id: "banque",     label: "Frais bancaires",    tvaRate: 0,    inputMode: "ht", amounts: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1, 132])) },
  { id: "divers",     label: "Divers (CB)",        tvaRate: 0.20, inputMode: "ht", amounts: Object.fromEntries(Array.from({length:12},(_,i)=>[i+1, 135])) },
  { id: "obligataire", label: "Intérêts obligataires", tvaRate: 0, inputMode: "ht", amounts: { 9: 14_700 } },
];

// ── Finance month defaults ──

export const FINANCE_DEFAULTS_2026: Omit<FinanceMonth, "year">[] = [
  { month: 1,  status: "realized",    chargesFixes: totalChargesMois(1),  caPrevisionnel: 0 },
  { month: 2,  status: "realized",    chargesFixes: totalChargesMois(2),  caPrevisionnel: 8_000 },
  { month: 3,  status: "realized",    chargesFixes: totalChargesMois(3),  caPrevisionnel: 8_000 },
  { month: 4,  status: "in-progress", chargesFixes: totalChargesMois(4),  caPrevisionnel: 8_000 },
  { month: 5,  status: "planned",     chargesFixes: totalChargesMois(5),  caPrevisionnel: 8_000 },
  { month: 6,  status: "planned",     chargesFixes: totalChargesMois(6),  caPrevisionnel: 35_000 },
  { month: 7,  status: "planned",     chargesFixes: totalChargesMois(7),  caPrevisionnel: 8_000 },
  { month: 8,  status: "planned",     chargesFixes: totalChargesMois(8),  caPrevisionnel: 2_000 },
  { month: 9,  status: "planned",     chargesFixes: totalChargesMois(9) + 14_700, caPrevisionnel: 10_000 },
  { month: 10, status: "planned",     chargesFixes: totalChargesMois(10), caPrevisionnel: 11_000 },
  { month: 11, status: "planned",     chargesFixes: totalChargesMois(11), caPrevisionnel: 25_000 },
  { month: 12, status: "planned",     chargesFixes: totalChargesMois(12), caPrevisionnel: 20_000 },
];

// 2025 — all months default to planned, no Pennylane data
const FINANCE_DEFAULTS_2025: Omit<FinanceMonth, "year">[] = Array.from(
  { length: 12 },
  (_, i) => ({
    month: i + 1,
    status: "planned" as const,
    chargesFixes: totalChargesMois(i + 1),
    caPrevisionnel: 0,
  })
);

const DEFAULTS_BY_YEAR: Record<number, Omit<FinanceMonth, "year">[]> = {
  2025: FINANCE_DEFAULTS_2025,
  2026: FINANCE_DEFAULTS_2026,
};

export function buildDefaultYear(year: number): FinanceMonth[] {
  const defaults = DEFAULTS_BY_YEAR[year] ?? FINANCE_DEFAULTS_2025;
  return defaults.map((d) => ({ ...d, year }));
}
