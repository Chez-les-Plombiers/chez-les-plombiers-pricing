import { Resend } from "resend";
import type { QuoteRequest } from "@/types";
import { TIME_SLOT_LABELS } from "@/types";

const NOTIFICATION_RECIPIENTS = [
  "etienne@chezlesplombiers.fr",
  "celine@chezlesplombiers.fr",
  "frederic@chezlesplombiers.fr",
];

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Send email notification to the team when a new quote request is submitted.
 */
const FR_DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const FR_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDateWithDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dayName = FR_DAYS[d.getDay()];
  const day = d.getDate();
  const month = FR_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName} ${day === 1 ? "1er" : day} ${month} ${year}`;
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export async function sendQuoteNotification(quote: QuoteRequest & { totalPrice?: number }): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping notification");
    return;
  }

  const dateFr = formatDateWithDay(quote.date);
  const numDays = quote.numberOfDays || 1;

  // Build multi-day date range with day names
  let dateRange = dateFr;
  if (numDays > 1) {
    const [qy, qm, qd] = quote.date.split("-").map(Number);
    const endDateStr = new Date(Date.UTC(qy, qm - 1, qd + numDays - 1)).toISOString().split("T")[0];
    dateRange = `${dateFr} → ${formatDateWithDay(endDateStr)} (${numDays} jours)`;
  }

  const slotLabel = TIME_SLOT_LABELS[quote.timeSlot];
  const createdAt = new Date(quote.createdAt).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "long",
    timeStyle: "short",
  });

  const priceDisplay = quote.totalPrice ? ` — ${formatPrice(quote.totalPrice)} HT` : "";
  const subject = `Nouvelle demande de devis — ${quote.firstName} ${quote.lastName}${quote.company ? ` (${quote.company})` : ""} — ${dateFr}${priceDisplay}`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
  <div style="background: #1A1A1A; padding: 20px 24px;">
    <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #C8A96E; font-family: 'Space Mono', monospace, sans-serif; letter-spacing: 2px; text-transform: uppercase;">
      Nouvelle demande de devis
    </h1>
  </div>

  <div style="padding: 24px; background: #f9f9f9;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: 600; width: 160px; vertical-align: top;">Contact</td>
        <td style="padding: 8px 0;">${quote.firstName} ${quote.lastName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Email</td>
        <td style="padding: 8px 0;"><a href="mailto:${quote.email}" style="color: #C8A96E;">${quote.email}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Téléphone</td>
        <td style="padding: 8px 0;"><a href="tel:${quote.phone}" style="color: #C8A96E;">${quote.phone}</a></td>
      </tr>
      ${quote.company ? `<tr>
        <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Entreprise</td>
        <td style="padding: 8px 0;">${quote.company}${quote.siret ? ` (SIRET: ${quote.siret})` : ""}</td>
      </tr>` : ""}
      ${quote.endClient ? `<tr>
        <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Client final</td>
        <td style="padding: 8px 0;">${quote.endClient}</td>
      </tr>` : ""}
      <tr>
        <td colspan="2" style="padding: 12px 0 4px 0; border-top: 1px solid #ddd;"></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Date${numDays > 1 ? "s" : ""}</td>
        <td style="padding: 8px 0;">${dateRange}</td>
      </tr>
      ${quote.totalPrice ? `<tr>
        <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Prix indicatif</td>
        <td style="padding: 8px 0; color: #C8A96E; font-weight: 700;">${formatPrice(quote.totalPrice)} HT</td>
      </tr>` : ""}
      <tr>
        <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Créneau</td>
        <td style="padding: 8px 0;">${slotLabel}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Type d'évènement</td>
        <td style="padding: 8px 0;">${quote.eventType}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Nombre d'invités</td>
        <td style="padding: 8px 0;">${quote.guestCount}</td>
      </tr>
      ${quote.message ? `<tr>
        <td colspan="2" style="padding: 12px 0 4px 0; border-top: 1px solid #ddd;"></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 600; vertical-align: top;">Message</td>
        <td style="padding: 8px 0;">${quote.message}</td>
      </tr>` : ""}
    </table>
  </div>

  <div style="padding: 16px 24px; background: #1A1A1A; color: #888; font-size: 12px;">
    Reçu le ${createdAt} via le calendrier tarifaire — <a href="https://pricing.chezlesplombiers.fr/admin" style="color: #C8A96E;">Voir dans l'admin</a>
  </div>
</div>`;

  const fromAddress = process.env.RESEND_FROM_EMAIL || "Calendrier CLP <notifications@chezlesplombiers.fr>";

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: NOTIFICATION_RECIPIENTS,
    subject,
    html,
  });

  if (error) {
    console.error("[Email] Failed to send notification:", error);
    throw error;
  }

  console.log(`[Email] Quote notification sent to ${NOTIFICATION_RECIPIENTS.join(", ")}`);
}
