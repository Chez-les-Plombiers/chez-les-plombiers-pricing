import type { PennylaneMonthData } from "@/types";
import { getInvoiceNatures, setInvoiceNatures, type InvoiceNature } from "@/lib/kv";

const API_BASE = "https://app.pennylane.com/api/external/v2";

// Raw Pennylane API response types
interface RawPennylaneInvoice {
  id: number;
  date: string | null;
  status: string;
  paid: boolean;
  currency_amount_before_tax: string | null;
  /** TVA de la facture. Un depot de garantie n'y est jamais soumis. */
  currency_tax: string | null;
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
 * Lignes d'article d'une facture.
 *
 * ⚠️ `invoice_lines` n'est pas inclus dans la reponse de la liste : c'est une
 * sous-ressource qu'il faut aller chercher. On ne le fait que pour les
 * factures sans TVA, et le resultat est mis en cache — la nature d'une facture
 * emise ne change plus.
 */
async function fetchInvoiceLines(invoiceId: number): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/customer_invoices/${invoiceId}/invoice_lines`, {
      headers: { Authorization: `Bearer ${getApiKey()}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return "";
    const data = await res.json();
    return (data.items ?? [])
      .map((l: { label?: string; description?: string }) =>
        `${l.label ?? ""} ${l.description ?? ""}`)
      .join(" ");
  } catch {
    return "";
  }
}

const DEPOT = /d[ée]p[oô]t\s+de\s+garantie|caution/i;
const LOCATION = /location|mise\s+[aà]\s+dispo|forfait|prestation|m[ée]nage|s[ée]curit[ée]|r[ée]gie|manutention/i;

/**
 * Une facture est-elle du chiffre d'affaires, ou un depot de garantie ?
 *
 * ⚠️ REGLE ETABLIE LE 14/09/2026, APRES ERREUR. Ne pas la simplifier.
 *
 * Quatre discriminants ont ete essayes et ont tous echoue :
 *   - le MONTANT (5 000 / 3 000 €) : des locations tombent sur ces ronds ;
 *   - le MOT-CLE dans le libelle : Pennylane genere des libelles automatiques
 *     (« Facture SNAPEVENT - F-2026-09-17-114 ») ou le mot « caution »
 *     n'apparait pas. C'est ce filtre qui faisait entrer 16 000 € de cautions
 *     dans le CA de septembre 2026 ;
 *   - la TVA NULLE seule : une location exoneree (client etranger) a la meme
 *     signature qu'une caution ;
 *   - l'OBJET de la facture : une location et sa caution portent LE MEME, car
 *     il decrit l'evenement et non la piece.
 *
 * Seule la LIGNE D'ARTICLE fait preuve. La TVA sert de filtre prealable : un
 * depot de garantie n'y est jamais soumis, donc TVA presente ⇒ chiffre
 * d'affaires, sans appel supplementaire.
 */
async function natureDeLaFacture(
  inv: RawPennylaneInvoice,
  cache: Record<number, InvoiceNature>
): Promise<InvoiceNature> {
  if (cache[inv.id]) return cache[inv.id];

  const tva = parseFloat(inv.currency_tax || "0");
  if (Math.abs(tva) >= 0.01) {
    cache[inv.id] = "revenue";
    return "revenue";
  }

  const lignes = await fetchInvoiceLines(inv.id);
  let nature: InvoiceNature;
  if (DEPOT.test(lignes)) nature = "deposit";
  else if (LOCATION.test(lignes)) nature = "revenue";
  else if (DEPOT.test(`${inv.label} ${inv.pdf_invoice_subject}`)) nature = "deposit";
  else nature = "revenue"; // a defaut, on garde la facture : mieux vaut un CA
                           // a verifier qu'un CA silencieusement ampute.
  cache[inv.id] = nature;
  return nature;
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

  // Annee + statut : le reste se decide sur la nature de la piece.
  const duMillesime = all.filter(
    (inv) =>
      inv.date?.startsWith(`${year}-`) &&
      !["cancelled", "archived", "incomplete"].includes(inv.status)
  );

  // Les depots de garantie ne sont pas du produit : ils sont dus au client.
  const cache = await getInvoiceNatures();
  const avant = JSON.stringify(cache);
  const natures = await Promise.all(
    duMillesime.map((inv) => natureDeLaFacture(inv, cache))
  );
  if (JSON.stringify(cache) !== avant) await setInvoiceNatures(cache);

  const active = duMillesime.filter((_, i) => natures[i] === "revenue");

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
