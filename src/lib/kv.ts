import { Redis } from "@upstash/redis";
import type { PricingOverride, QuoteRequest, AnalyticsEvent, FinanceMonth } from "@/types";
import { buildDefaultYear } from "./finance-defaults";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const OVERRIDES_KEY = "pricing:overrides";
const QUOTES_KEY = "pricing:quotes";
const ANALYTICS_KEY = "pricing:analytics";
const BOOKED_KEY = "pricing:booked";
const CALENDAR_PASSWORD_KEY = "pricing:calendar-password";

// --- Overrides ---

export async function getAllOverrides(): Promise<Record<string, PricingOverride>> {
  const redis = getRedis();
  if (!redis) return {};
  const data = await redis.get<Record<string, PricingOverride>>(OVERRIDES_KEY);
  return data || {};
}

export async function setOverride(override: PricingOverride): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const overrides = await getAllOverrides();
  overrides[override.date] = override;
  await redis.set(OVERRIDES_KEY, overrides);
}

export async function deleteOverride(date: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const overrides = await getAllOverrides();
  delete overrides[date];
  await redis.set(OVERRIDES_KEY, overrides);
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

// --- Finances ---

const FINANCES_KEY = (year: number) => `finances:${year}`;

export async function getFinances(year: number): Promise<FinanceMonth[]> {
  const redis = getRedis();
  if (!redis) return buildDefaultYear(year);
  const data = await redis.get<FinanceMonth[]>(FINANCES_KEY(year));
  if (!data || data.length !== 12) return buildDefaultYear(year);
  // Migrate: add caManuel if missing (backward compat with pre-caManuel records)
  return data.map((m) => ({ ...m, caManuel: m.caManuel ?? 0 }));
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

// --- Analytics ---

export async function trackView(date: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const events = await getAnalytics();
  events.push({ date, viewedAt: new Date().toISOString() });
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
