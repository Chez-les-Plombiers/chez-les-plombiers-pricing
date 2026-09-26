import { Redis } from "@upstash/redis";
import type { PricingOverride, QuoteRequest, AnalyticsEvent, FinanceMonth, ChargePoste } from "@/types";
import type { VenueSlug } from "./venues";
import { buildDefaultYear } from "./finance-defaults";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/**
 * Clé des overrides d'un lieu.
 *
 * ⚠️ L'ATELIER conserve la clé historique `pricing:overrides` : elle contient
 * plusieurs centaines de décisions tarifaires accumulées depuis 2026, qui sont
 * un actif commercial. Ne jamais la renommer ni la migrer sans sauvegarde.
 */
function overridesKey(venue: VenueSlug): string {
  return venue === "atelier" ? "pricing:overrides" : `pricing:overrides:${venue}`;
}

const QUOTES_KEY = "pricing:quotes";
const ANALYTICS_KEY = "pricing:analytics";
const BOOKED_KEY = "pricing:booked";
const CALENDAR_PASSWORD_KEY = "pricing:calendar-password";

// --- Overrides ---

export async function getAllOverrides(
  venue: VenueSlug
): Promise<Record<string, PricingOverride>> {
  const redis = getRedis();
  if (!redis) return {};
  const data = await redis.get<Record<string, PricingOverride>>(overridesKey(venue));
  return data || {};
}

export async function setOverride(
  venue: VenueSlug,
  override: PricingOverride
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const overrides = await getAllOverrides(venue);
  overrides[override.date] = override;
  await redis.set(overridesKey(venue), overrides);
}

export async function deleteOverride(venue: VenueSlug, date: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const overrides = await getAllOverrides(venue);
  delete overrides[date];
  await redis.set(overridesKey(venue), overrides);
}

// --- Booked dates ---

export async function getBookedDates(): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];
  const data = await redis.get<string[]>(BOOKED_KEY);
  return data || [];
}

export async function setBookedDates(dates: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(BOOKED_KEY, dates);
}

// --- Quotes ---

export async function addQuote(quote: QuoteRequest): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const quotes = await getAllQuotes();
  quotes.unshift(quote);
  await redis.set(QUOTES_KEY, quotes);
}

export async function getAllQuotes(): Promise<QuoteRequest[]> {
  const redis = getRedis();
  if (!redis) return [];
  const data = await redis.get<QuoteRequest[]>(QUOTES_KEY);
  return data || [];
}

// --- Calendar Password ---

export async function getCalendarPassword(): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const data = await redis.get<string>(CALENDAR_PASSWORD_KEY);
  return data || null;
}

export async function setCalendarPassword(password: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(CALENDAR_PASSWORD_KEY, password);
}

// --- Invoice month overrides ---

const INVOICE_OVERRIDES_KEY = (year: number) => `finances:invoice-overrides:${year}`;

export async function getInvoiceOverrides(
  year: number
): Promise<Record<number, number>> {
  const redis = getRedis();
  if (!redis) return {};
  const data = await redis.get<Record<number, number>>(
    INVOICE_OVERRIDES_KEY(year)
  );
  return data || {};
}

export async function setInvoiceOverride(
  year: number,
  invoiceId: number,
  month: number
): Promise<Record<number, number>> {
  const redis = getRedis();
  const overrides = await getInvoiceOverrides(year);
  overrides[invoiceId] = month;
  if (redis) await redis.set(INVOICE_OVERRIDES_KEY(year), overrides);
  return overrides;
}

// --- Invoice natures (cache) ---
// La nature d'une facture ne change jamais une fois emise : on la determine
// une seule fois, puis on la garde. Sans ce cache il faudrait relire les
// lignes d'article de chaque facture sans TVA a chaque chargement du tableau
// de bord — plus de la moitie d'entre elles.

const INVOICE_NATURES_KEY = "finances:invoice-natures";

export type InvoiceNature = "revenue" | "deposit";

export async function getInvoiceNatures(): Promise<Record<number, InvoiceNature>> {
  const redis = getRedis();
  if (!redis) return {};
  const data = await redis.get<Record<number, InvoiceNature>>(INVOICE_NATURES_KEY);
  return data || {};
}

export async function setInvoiceNatures(
  natures: Record<number, InvoiceNature>
): Promise<void> {
  const redis = getRedis();
  if (redis) await redis.set(INVOICE_NATURES_KEY, natures);
}

// --- Dates de paiement (cache) ---
// Le tableau de bord attribue une facture au MOIS DE SON PAIEMENT (spec du
// 26/09/2026). Pennylane ne porte pas cette date sur la facture : il faut la
// lire sur la transaction bancaire rapprochee, une sous-ressource, donc un
// appel par facture. On garde le resultat.
//
// ⚠️ A la difference de la nature, une date de paiement APPARAIT avec le temps :
// une facture aujourd'hui impayee sera payee demain. On ne met donc en cache
// que les dates RESOLUES. Une facture payee sans date connue est reinterrogee
// a chaque chargement — elles sont peu nombreuses, et c'est le seul moyen de
// voir arriver un rapprochement fait entre-temps.

const INVOICE_PAYMENTS_KEY = "finances:invoice-payments";

export async function getInvoicePayments(): Promise<Record<number, string>> {
  const redis = getRedis();
  if (!redis) return {};
  const data = await redis.get<Record<number, string>>(INVOICE_PAYMENTS_KEY);
  return data || {};
}

export async function setInvoicePayments(
  paiements: Record<number, string>
): Promise<void> {
  const redis = getRedis();
  if (redis) await redis.set(INVOICE_PAYMENTS_KEY, paiements);
}

// --- Finances ---

const FINANCES_KEY = (year: number) => `finances:${year}`;

export async function getFinances(year: number): Promise<FinanceMonth[]> {
  const redis = getRedis();
  if (!redis) return buildDefaultYear(year);
  const data = await redis.get<FinanceMonth[]>(FINANCES_KEY(year));
  if (!data || data.length !== 12) return buildDefaultYear(year);
  return data;
}

export async function updateFinanceMonth(
  year: number,
  month: number,
  updates: Partial<FinanceMonth>
): Promise<FinanceMonth[]> {
  const redis = getRedis();
  const months = await getFinances(year);
  const idx = months.findIndex((m) => m.month === month);
  if (idx === -1) return months;
  months[idx] = {
    ...months[idx],
    ...updates,
    year,
    month,
    updatedAt: new Date().toISOString(),
  };
  if (redis) await redis.set(FINANCES_KEY(year), months);
  return months;
}

export async function resetFinances(year: number): Promise<FinanceMonth[]> {
  const redis = getRedis();
  const defaults = buildDefaultYear(year);
  if (redis) await redis.set(FINANCES_KEY(year), defaults);
  return defaults;
}

// --- Charges Fixes (spreadsheet) ---

const CHARGES_POSTES_KEY = (year: number) => `finances:charges-postes:${year}`;

export async function getChargesPostes(year: number): Promise<ChargePoste[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get<ChargePoste[]>(CHARGES_POSTES_KEY(year));
}

export async function setChargesPostes(year: number, postes: ChargePoste[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(CHARGES_POSTES_KEY(year), postes);
}

// --- Analytics ---

export async function trackView(date: string, venue: VenueSlug): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const events = await getAnalytics();
  events.push({ date, venue, viewedAt: new Date().toISOString() });
  // Keep last 10000 events
  if (events.length > 10000) events.splice(0, events.length - 10000);
  await redis.set(ANALYTICS_KEY, events);
}

export async function getAnalytics(): Promise<AnalyticsEvent[]> {
  const redis = getRedis();
  if (!redis) return [];
  const data = await redis.get<AnalyticsEvent[]>(ANALYTICS_KEY);
  return data || [];
}
