import type { PennylaneMonthData } from "@/types";
import {
  getInvoiceNatures,
  setInvoiceNatures,
  getInvoicePayments,
  setInvoicePayments,
  type InvoiceNature,
} from "@/lib/kv";

const API_BASE = "https://app.pennylane.com/api/external/v2";

// Raw Pennylane API response types
interface RawPennylaneInvoice {
  id: number;
  date: string | null;
  status: string;
  paid: boolean;
  currency_amount_before_tax: string | null;
  /** TTC — sert a verifier qu'un rapprochement bancaire tient debout. */
  currency_amount: string | null;
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
  /** Date du virement recu, lue sur la transaction bancaire rapprochee. */
  datePaiement: string | null;
  /** true = facture payee dont la date de paiement est inconnue ou refusee :
   *  on a repli sur la date de facture. A afficher comme approximatif. */
  paiementEstime: boolean;
  /** Anomalie a montrer telle quelle, ou null. Pennylane est notre source ;
   *  quand elle se contredit, on le dit au lieu de choisir a sa place. */
  alerte: string | null;
  /** Month this invoice counts toward (1-12). Mois du PAIEMENT. Can be overridden. */
  attributedMonth: number;
}

function getApiKey(): string {
  const key = process.env.PENNYLANE_API_KEY;
  if (!key) throw new Error("PENNYLANE_API_KEY not configured");
  return key;
}

/**
 * Appel API avec reprise sur 429.
 *
 * ⚠️ Pennylane limite le debit et le fait sentir des la vingtaine d'appels
 * rapprochee : le tableau de bord en emet un par facture sans TVA (nature) et
 * un par facture payee (date de paiement). Sans reprise, un rechargement a
 * froid renvoie une annee trouee, sans la moindre erreur visible.
 */
async function apiGet<T>(chemin: string): Promise<T | null> {
  for (let essai = 0; essai < 4; essai++) {
    try {
      const res = await fetch(`${API_BASE}${chemin}`, {
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 800 * (essai + 1)));
        continue;
      }
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }
  return null;
}

/** Execute des taches par petits paquets — voir la note de debit sur apiGet. */
async function parPaquets<T, R>(
  items: T[],
  taille: number,
  tache: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += taille) {
    out.push(...(await Promise.all(items.slice(i, i + taille).map(tache))));
  }
  return out;
}

async function fetchPage(cursor?: string): Promise<PennylaneResponse> {
  const q = new URLSearchParams({ page_size: "100" });
  if (cursor) q.set("cursor", cursor);
  const data = await apiGet<PennylaneResponse>(`/customer_invoices?${q}`);
  if (!data) throw new Error("Pennylane API error");
  return data;
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
  const data = await apiGet<{ items?: { label?: string; description?: string }[] }>(
    `/customer_invoices/${invoiceId}/invoice_lines`
  );
  return (data?.items ?? [])
    .map((l) => `${l.label ?? ""} ${l.description ?? ""}`)
    .join(" ");
}

/**
 * Date a laquelle l'argent est reellement arrive.
 *
 * ⚠️ Pennylane ne porte AUCUNE date de paiement sur la facture : `paid` est un
 * booleen, et la sous-ressource `payments` est vide sur toutes les factures de
 * CLP (releve le 26/09/2026). La seule trace datee est la TRANSACTION BANCAIRE
 * rapprochee — `matched_transactions`. On retient la plus tardive : un solde
 * verse en deux fois n'est encaisse qu'au dernier virement.
 *
 * 81 % des factures payees en portent une. Les autres ont ete pointees a la
 * main dans Pennylane, sans rapprochement bancaire : pour celles-la on se
 * rabat sur la date de facture, et on le DIT (`paiementEstime`).
 */
async function fetchDatePaiement(
  inv: RawPennylaneInvoice
): Promise<{ date: string | null; alerte: string | null }> {
  const data = await apiGet<{ items?: { date?: string; amount?: string }[] }>(
    `/customer_invoices/${inv.id}/matched_transactions`
  );
  const tx = (data?.items ?? []).filter(
    (t): t is { date: string; amount?: string } =>
      typeof t.date === "string" && t.date.length >= 10
  );

  if (!tx.length) {
    return {
      date: null,
      alerte: "payée sans rapprochement bancaire — soit le virement n'est pas lettré, soit la facture a été pointée trop tôt",
    };
  }

  // ⚠️ UN RAPPROCHEMENT PEUT ETRE FAUX, et un faux rapprochement deplace du
  // CA d'un mois a l'autre en silence. Releve le 26/09/2026 : F-2026-09-15-109
  // (960 € TTC) etait lettree a un virement de 900 € portant le numero d'une
  // AUTRE facture, et date du 2 avril. Sans ce controle, 800 € de septembre
  // partaient en avril sans que rien ne le signale.
  const encaisse = tx.reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
  const ttc = parseFloat(inv.currency_amount || "0");
  const ecart = encaisse - ttc;
  const tolerance = Math.max(1, ttc * 0.005);

  if (ttc > 0 && Math.abs(ecart) > tolerance) {
    const signe = ecart > 0 ? "+" : "";
    return {
      date: null,
      alerte: `rapprochement bancaire incohérent : ${Math.round(encaisse)} € lettrés pour ${Math.round(ttc)} € dus (${signe}${Math.round(ecart)} €) — à corriger dans Pennylane`,
    };
  }

  const dates = tx.map((t) => t.date).sort();
  return { date: dates[dates.length - 1], alerte: null };
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
 * Factures d'un exercice, attribuees au MOIS DU PAIEMENT.
 *
 * ⚠️ L'exercice se decide sur la date de PAIEMENT, pas sur celle de la
 * facture : une facture de decembre reglee en janvier est du chiffre
 * d'affaires de janvier. On ratisse donc les factures des annees voisines
 * avant de filtrer. Sur 2026, ce seul changement deplace jusqu'a 28 500 €
 * d'un mois a l'autre — le total annuel, lui, ne bouge pas.
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

  // Fenetre large : l'annee d'imputation est celle du paiement.
  const annees = [year - 1, year, year + 1].map((y) => `${y}-`);
  const candidates = all.filter(
    (inv) =>
      inv.date &&
      annees.some((a) => inv.date!.startsWith(a)) &&
      !["cancelled", "archived", "incomplete"].includes(inv.status)
  );

  // Les depots de garantie ne sont pas du produit : ils sont dus au client.
  const cacheNatures = await getInvoiceNatures();
  const avantNatures = JSON.stringify(cacheNatures);
  const natures = await parPaquets(candidates, 3, (inv) =>
    natureDeLaFacture(inv, cacheNatures)
  );
  if (JSON.stringify(cacheNatures) !== avantNatures) {
    await setInvoiceNatures(cacheNatures);
  }

  const active = candidates.filter((_, i) => natures[i] === "revenue");

  // Dates de paiement : cache d'abord, appels ensuite, et seulement pour les
  // factures payees dont on ne sait pas encore quand.
  const cachePaiements = await getInvoicePayments();
  const aResoudre = active.filter((inv) => inv.paid && !cachePaiements[inv.id]);
  const alertes: Record<number, string> = {};
  let ajouts = 0;
  const resolues = await parPaquets(aResoudre, 3, (inv) => fetchDatePaiement(inv));
  aResoudre.forEach((inv, i) => {
    const { date, alerte } = resolues[i];
    // On ne met en cache qu'une date SAINE. Une anomalie n'est pas gravee :
    // elle doit disparaitre d'elle-meme le jour ou Pennylane est corrige.
    if (date) {
      cachePaiements[inv.id] = date;
      ajouts++;
    }
    if (alerte) alertes[inv.id] = alerte;
  });
  if (ajouts > 0) await setInvoicePayments(cachePaiements);

  // Build clean invoice list
  const invoices: InvoiceItem[] = [];
  for (const inv of active) {
    const datePaiement = inv.paid ? (cachePaiements[inv.id] ?? null) : null;
    const reference = datePaiement ?? inv.date!;
    const override = monthOverrides?.[inv.id];

    // Hors exercice : une facture payee l'an dernier ou l'an prochain ne
    // compte pas ici. Un reglage manuel, lui, prime toujours.
    if (override === undefined && !reference.startsWith(`${year}-`)) continue;

    invoices.push({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      clientName: extractClientName(inv.label),
      subject: inv.pdf_invoice_subject || "",
      date: inv.date!,
      status: inv.status,
      paid: inv.paid,
      amountHT: parseFloat(inv.currency_amount_before_tax || "0"),
      datePaiement,
      paiementEstime: inv.paid && !datePaiement,
      alerte: alertes[inv.id] ?? null,
      attributedMonth: override ?? parseInt(reference.slice(5, 7), 10),
    });
  }

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
