import { isInRange } from "./date-utils";

/**
 * Calendar reference data, organised by year for maintainability.
 * To support a new year, add an entry to each *_BY_YEAR map below.
 *
 * The lookup helpers operate on flat collections (built by flattening every
 * year), so date ranges that straddle a year boundary (e.g. Noël déc→jan)
 * keep matching correctly regardless of which year the date falls in.
 */

type DateRange = [start: string, end: string, label: string];

/** Fashion Week Paris — date ranges by year */
const FASHION_WEEK_BY_YEAR: Record<number, DateRange[]> = {
  2026: [
    ["2026-01-20", "2026-01-25", "Fashion Week Homme"],
    ["2026-01-26", "2026-01-29", "Haute Couture"],
    ["2026-03-02", "2026-03-10", "Fashion Week Femme PAP"],
    ["2026-06-23", "2026-06-28", "Fashion Week Homme"],
    ["2026-07-06", "2026-07-09", "Haute Couture"],
    ["2026-09-28", "2026-10-06", "Fashion Week Femme PAP"],
  ],
  // TODO confirmer dates FHCM 2027 — estimées sur le calendrier habituel
  2027: [
    ["2027-01-19", "2027-01-24", "Fashion Week Homme"],
    ["2027-01-25", "2027-01-28", "Haute Couture"],
    ["2027-03-01", "2027-03-09", "Fashion Week Femme PAP"],
    ["2027-06-22", "2027-06-27", "Fashion Week Homme"],
    ["2027-07-05", "2027-07-08", "Haute Couture"],
    ["2027-09-27", "2027-10-05", "Fashion Week Femme PAP"],
  ],
};

/** Jours fériés par année */
const JOURS_FERIES_BY_YEAR: Record<number, Record<string, string>> = {
  2026: {
    "2026-01-01": "Jour de l'An",
    "2026-04-06": "Lundi de Pâques",
    "2026-05-01": "Fête du Travail",
    "2026-05-08": "Victoire 1945",
    "2026-05-14": "Ascension",
    "2026-05-25": "Lundi de Pentecôte",
    "2026-07-14": "Fête nationale",
    "2026-08-15": "Assomption",
    "2026-11-01": "Toussaint",
    "2026-11-11": "Armistice",
    "2026-12-25": "Noël",
  },
  2027: {
    "2027-01-01": "Jour de l'An",
    "2027-03-29": "Lundi de Pâques",
    "2027-05-01": "Fête du Travail",
    "2027-05-06": "Ascension",
    "2027-05-08": "Victoire 1945",
    "2027-05-17": "Lundi de Pentecôte",
    "2027-07-14": "Fête nationale",
    "2027-08-15": "Assomption",
    "2027-11-01": "Toussaint",
    "2027-11-11": "Armistice",
    "2027-12-25": "Noël",
  },
};

/** Ponts par année */
const PONTS_BY_YEAR: Record<number, DateRange[]> = {
  2026: [
    ["2026-05-01", "2026-05-03", "Pont 1er Mai"],
    ["2026-05-08", "2026-05-10", "Pont 8 Mai"],
    ["2026-05-14", "2026-05-18", "Pont Ascension"],
    ["2026-05-23", "2026-05-26", "Pont Pentecôte"],
    ["2026-12-25", "2026-12-27", "Pont Noël"],
  ],
  2027: [
    ["2027-05-06", "2027-05-09", "Pont Ascension"],
    ["2027-05-15", "2027-05-17", "Pont Pentecôte"],
    ["2027-12-25", "2027-12-27", "Pont Noël"],
  ],
};

/** Vacances scolaires Zone C (Paris) — dates officielles par année */
const VACANCES_BY_YEAR: Record<number, DateRange[]> = {
  2026: [
    ["2025-12-20", "2026-01-05", "Vacances de Noël"],
    ["2026-02-21", "2026-03-09", "Vacances d'hiver"],
    ["2026-04-18", "2026-05-04", "Vacances de printemps"],
    ["2026-07-04", "2026-09-01", "Vacances d'été"],
    ["2026-10-17", "2026-11-02", "Vacances de la Toussaint"],
    ["2026-12-19", "2027-01-04", "Vacances de Noël"],
  ],
  2027: [
    ["2027-02-06", "2027-02-22", "Vacances d'hiver"],
    ["2027-04-03", "2027-04-19", "Vacances de printemps"],
    ["2027-07-03", "2027-09-01", "Vacances d'été"],
  ],
};

/** Flattened lookups (preserve cross-year range matching) */
const FASHION_WEEK_RANGES: DateRange[] = Object.values(FASHION_WEEK_BY_YEAR).flat();
const PONTS_RANGES: DateRange[] = Object.values(PONTS_BY_YEAR).flat();
const VACANCES_RANGES: DateRange[] = Object.values(VACANCES_BY_YEAR).flat();
const JOURS_FERIES: Record<string, string> = Object.assign(
  {},
  ...Object.values(JOURS_FERIES_BY_YEAR)
);

export function isFashionWeek(dateStr: string): { match: boolean; label: string } {
  for (const [start, end, label] of FASHION_WEEK_RANGES) {
    if (isInRange(dateStr, start, end)) {
      return { match: true, label };
    }
  }
  return { match: false, label: "" };
}

export function isJourFerie(dateStr: string): { match: boolean; label: string } {
  const label = JOURS_FERIES[dateStr];
  return label ? { match: true, label } : { match: false, label: "" };
}

export function isPont(dateStr: string): { match: boolean; label: string } {
  for (const [start, end, label] of PONTS_RANGES) {
    if (isInRange(dateStr, start, end)) {
      return { match: true, label };
    }
  }
  return { match: false, label: "" };
}

export function isVacances(dateStr: string): { match: boolean; label: string } {
  for (const [start, end, label] of VACANCES_RANGES) {
    if (isInRange(dateStr, start, end)) {
      return { match: true, label };
    }
  }
  return { match: false, label: "" };
}
