import type { PennylaneMonthData } from "@/types";

const API_BASE = "https://app.pennylane.com/api/external/v2";

// Raw Pennylane API response types
interface RawPennylaneInvoice {
  id: number;
  date: string | null;
  status: string;
  paid: boolean;
  currency_amount_before_tax: string | null;
  amount: string | null;
  label: string;
  invoice_number: string;
  pdf_invoice_subject: string;
  customer: { id: number; url: string };
}

interface PennylaneResponse {
  items: RawPennylaneInvoice[];
  has_more: boolean;
  next_cursor?: string;
}

// Cleaned invoice for the frontend
export interface InvoiceItem {
  id: number;
  invoiceNumber: string;
  clientName: string;
  subject: string;
  date: string; // YYYY-MM-DD (invoice date)
  status: string;
  paid: boolean;
  amountHT: number;
  /** Month this invoice counts toward (1-12). Default = invoice date month. Can be overridden. */
  attributedMonth: number;
}

function getApiKey(): string {
  const key = process.env.PENNYLANE_API_KEY;
  if (!key) throw new Error("PENNYLANE_API_KEY not configured");
  return key;
}

async function fetchPage(cursor?: string): Promise<PennylaneResponse> {
  const url = new URL(`${API_BASE}/customer_invoices`);
  url.searchParams.set("page_size", "100");
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    const retry = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!retry.ok) throw new Error(`Pennylane API error: ${retry.status}`);
    return retry.json();
  }

  if (!res.ok) throw new Error(`Pennylane API error: ${res.status}`);
  return res.json();
}

/**
 * Extract a clean client name from the Pennylane label.
 * "Facture JACKY PRODUCTION - F-2026-04-19-36 (label généré)" → "JACKY PRODUCTION"
 */
function extractClientName(label: string): string {
  const match = label.match(/^(?:Facture|Avoir)\s+(.+?)\s*-\s*F-/);
  return match ? match[1] : label;
}

/**
 * Fetch all active invoices for a year, apply month overrides, and return
 * both individual invoices and monthly aggregates.
 */
export async function getPennylaneData(
  year: number,
  monthOverrides?: Record<number, number> // invoiceId → month
): Promise<{
  invoices: InvoiceItem[];
  monthly: Record<number, PennylaneMonthData>;
}> {
  const all: RawPennylaneInvoice[] = [];
  let cursor: string | undefined;
  let pages = 0;

  do {
    const data = await fetchPage(cursor);
    all.push(...data.items);
    cursor = data.has_more ? data.next_cursor : undefined;
    pages++;
  } while (cursor && pages < 20);

  // Filter to year, skip cancelled/archived/incomplete
  const active = all.filter((inv) => {
    if (!inv.date || !inv.date.startsWith(`${year}-`)) return false;
    return !["cancelled", "archived", "incomplete"].includes(inv.status);
  });

  // Build clean invoice list
  const invoices: InvoiceItem[] = active.map((inv) => {
    const defaultMonth = parseInt(inv.date!.slice(5, 7), 10);
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      clientName: extractClientName(inv.label),
      subject: inv.pdf_invoice_subject || "",
      date: inv.date!,
      status: inv.status,
      paid: inv.paid,
      amountHT: parseFloat(inv.currency_amount_before_tax || "0"),
      attributedMonth: monthOverrides?.[inv.id] ?? defaultMonth,
    };
  });

  // Aggregate by attributed month
  const monthly: Record<number, PennylaneMonthData> = {};
  for (let m = 1; m <= 12; m++) {
    monthly[m] = { caFacture: 0, caEncaisse: 0, invoiceCount: 0 };
  }

  for (const inv of invoices) {
    const m = inv.attributedMonth;
    if (m < 1 || m > 12) continue;
    monthly[m].caFacture += inv.amountHT;
    if (inv.paid) monthly[m].caEncaisse += inv.amountHT;
    monthly[m].invoiceCount++;
  }

  for (let m = 1; m <= 12; m++) {
    monthly[m].caFacture = Math.round(monthly[m].caFacture);
    monthly[m].caEncaisse = Math.round(monthly[m].caEncaisse);
  }

  return { invoices, monthly };
}

/** @deprecated Use getPennylaneData instead */
export async function getPennylaneMonthlyData(
  year: number
): Promise<Record<number, PennylaneMonthData>> {
  const { monthly } = await getPennylaneData(year);
  return monthly;
}
