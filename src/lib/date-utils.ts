const FR_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const FR_MONTHS_SHORT = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc",
];

const FR_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const FR_DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const FR_DAYS_LETTER = ["L", "M", "M", "J", "V", "S", "D"];

export function formatDateFR(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDate();
  const month = FR_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day === 1 ? "1er" : day} ${month} ${year}`;
}

export function formatDayOfWeekFR(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  return FR_DAYS[dow === 0 ? 6 : dow - 1];
}

export function getMonthNameFR(month: number): string {
  return FR_MONTHS[month];
}

export function getMonthNameShortFR(month: number): string {
  return FR_MONTHS_SHORT[month];
}

export function getDayLetters(): string[] {
  return FR_DAYS_LETTER;
}

export function getDayNamesShort(): string[] {
  return FR_DAYS_SHORT;
}

/** Get ISO day of week: 1=Monday ... 7=Sunday */
export function getISODayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  return dow === 0 ? 7 : dow;
}

/** Format price in EUR */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/** Get all dates in a month as YYYY-MM-DD strings */
export function getDatesInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    dates.push(`${year}-${m}-${d}`);
  }
  return dates;
}

/** Get the day of the month from a YYYY-MM-DD string */
export function getDayOfMonth(dateStr: string): number {
  return parseInt(dateStr.split("-")[2], 10);
}

/** Create YYYY-MM-DD from components */
export function toDateStr(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** Check if date is within range (inclusive) */
export function isInRange(dateStr: string, startStr: string, endStr: string): boolean {
  return dateStr >= startStr && dateStr <= endStr;
}
