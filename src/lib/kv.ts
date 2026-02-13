import { Redis } from "@upstash/redis";
import type { PricingOverride, QuoteRequest, AnalyticsEvent } from "@/types";

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
