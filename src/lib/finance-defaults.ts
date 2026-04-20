import type { FinanceMonth } from "@/types";

const CHARGES_FIXES_DEFAULT = 15_122;
const CHARGES_FIXES_FEV = 15_055;

const ZERO_VAR = { menage: 0, fb: 0, frais: 0, autres: 0 };

export const FINANCE_DEFAULTS_2026: Omit<FinanceMonth, "year">[] = [
  { month: 1,  status: "realized",    chargesFixes: CHARGES_FIXES_DEFAULT, caManuel: 39_795, caPrevisionnel: 0,      chargesVar: { ...ZERO_VAR } },
  { month: 2,  status: "realized",    chargesFixes: CHARGES_FIXES_FEV,     caManuel: 0,      caPrevisionnel: 8_000,  chargesVar: { ...ZERO_VAR } },
  { month: 3,  status: "in-progress", chargesFixes: CHARGES_FIXES_DEFAULT, caManuel: 0,      caPrevisionnel: 8_000,  chargesVar: { ...ZERO_VAR } },
  { month: 4,  status: "in-progress", chargesFixes: CHARGES_FIXES_DEFAULT, caManuel: 0,      caPrevisionnel: 8_000,  chargesVar: { ...ZERO_VAR } },
  { month: 5,  status: "planned",     chargesFixes: CHARGES_FIXES_DEFAULT, caManuel: 0,      caPrevisionnel: 8_000,  chargesVar: { ...ZERO_VAR } },
  { month: 6,  status: "planned",     chargesFixes: CHARGES_FIXES_DEFAULT, caManuel: 0,      caPrevisionnel: 35_000, chargesVar: { ...ZERO_VAR } },
  { month: 7,  status: "planned",     chargesFixes: CHARGES_FIXES_DEFAULT, caManuel: 0,      caPrevisionnel: 8_000,  chargesVar: { ...ZERO_VAR } },
  { month: 8,  status: "planned",     chargesFixes: CHARGES_FIXES_DEFAULT, caManuel: 0,      caPrevisionnel: 2_000,  chargesVar: { ...ZERO_VAR } },
  { month: 9,  status: "planned",     chargesFixes: CHARGES_FIXES_DEFAULT, caManuel: 0,      caPrevisionnel: 10_000, chargesVar: { ...ZERO_VAR } },
  { month: 10, status: "planned",     chargesFixes: CHARGES_FIXES_DEFAULT, caManuel: 0,      caPrevisionnel: 11_000, chargesVar: { ...ZERO_VAR } },
  { month: 11, status: "planned",     chargesFixes: CHARGES_FIXES_DEFAULT, caManuel: 0,      caPrevisionnel: 25_000, chargesVar: { ...ZERO_VAR } },
  { month: 12, status: "planned",     chargesFixes: CHARGES_FIXES_DEFAULT, caManuel: 0,      caPrevisionnel: 20_000, chargesVar: { ...ZERO_VAR } },
];

// 2025 — all months default to planned, no Pennylane data
const FINANCE_DEFAULTS_2025: Omit<FinanceMonth, "year">[] = Array.from(
  { length: 12 },
  (_, i) => ({
    month: i + 1,
    status: "planned" as const,
    chargesFixes: i === 1 ? CHARGES_FIXES_FEV : CHARGES_FIXES_DEFAULT,
    caManuel: 0,
    caPrevisionnel: 0,
    chargesVar: { ...ZERO_VAR },
  })
);

const DEFAULTS_BY_YEAR: Record<number, Omit<FinanceMonth, "year">[]> = {
  2025: FINANCE_DEFAULTS_2025,
  2026: FINANCE_DEFAULTS_2026,
};

export function buildDefaultYear(year: number): FinanceMonth[] {
  const defaults = DEFAULTS_BY_YEAR[year] ?? FINANCE_DEFAULTS_2025;
  return defaults.map((d) => ({
    ...d,
    year,
    chargesVar: { ...d.chargesVar },
  }));
}
