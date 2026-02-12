import { isInRange } from "./date-utils";

/** Fashion Week Paris 2026 date ranges */
const FASHION_WEEK_RANGES: Array<[string, string, string]> = [
  ["2026-01-20", "2026-01-25", "Fashion Week Homme"],
  ["2026-01-26", "2026-01-29", "Haute Couture"],
  ["2026-03-02", "2026-03-10", "Fashion Week Femme PAP"],
  ["2026-06-23", "2026-06-28", "Fashion Week Homme"],
  ["2026-07-06", "2026-07-09", "Haute Couture"],
  ["2026-09-28", "2026-10-06", "Fashion Week Femme PAP"],
];

/** Jours fériés 2026 */
const JOURS_FERIES: Record<string, string> = {
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
};

/** Ponts 2026 */
const PONTS_RANGES: Array<[string, string, string]> = [
  ["2026-05-01", "2026-05-03", "Pont 1er Mai"],
  ["2026-05-08", "2026-05-10", "Pont 8 Mai"],
  ["2026-05-14", "2026-05-18", "Pont Ascension"],
  ["2026-05-23", "2026-05-26", "Pont Pentecôte"],
  ["2026-12-25", "2026-12-27", "Pont Noël"],
];

/** Vacances scolaires Zone C 2026 */
const VACANCES_RANGES: Array<[string, string, string]> = [
  ["2025-12-20", "2026-01-05", "Vacances de Noël"],
  ["2026-02-21", "2026-03-09", "Vacances d'hiver"],
  ["2026-04-18", "2026-05-04", "Vacances de printemps"],
  ["2026-07-04", "2026-09-01", "Vacances d'été"],
];

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
