import type { QuoteRequest } from "@/types";
import { TIME_SLOT_LABELS } from "@/types";
import { computeDayPricing } from "./pricing-engine";
import { getAllOverrides } from "./kv";

const API_BASE = "https://api.pipedrive.com/v1";
const PIPELINE_ID = 1; // "Pipeline Principal"
const STAGE_NEW = 1; // "Nouvelle demande"

// Custom deal field keys (created in Pipedrive)
const FIELD_GUESTS = "05834ee04351a62a91908c3b409ed21b388cf09e";
const FIELD_EVENT_TYPE = "b077edaa62f510022521226b4a9631e90f1b04c4";
const FIELD_SOURCE = "71ec4d9da53a2578ac16a356018cddf3cf823a24";

/**
 * Send a quote request to Pipedrive CRM.
 * Creates: Person → (optional) Organization → Deal (with price) + Note.
 * Fails silently — the quote is always saved locally in KV as backup.
 */
export async function sendToPipedrive(quote: QuoteRequest): Promise<void> {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  if (!apiToken) return;

  const headers = { "Content-Type": "application/json" };
  const authParam = `api_token=${apiToken}`;

  // 1. Create Person (contact)
  const personRes = await fetch(`${API_BASE}/persons?${authParam}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `${quote.firstName} ${quote.lastName}`,
      email: [{ value: quote.email, primary: true, label: "work" }],
      phone: [{ value: quote.phone, primary: true, label: "work" }],
    }),
  });

  if (!personRes.ok) {
    const err = await personRes.text();
    console.error(`[Pipedrive] Person creation failed ${personRes.status}: ${err}`);
    throw new Error(`Pipedrive Person error: ${personRes.status}`);
  }

  const personData = await personRes.json();
  const personId = personData.data?.id;

  // 2. Create Organization (if company provided)
  let orgId: number | undefined;
  if (quote.company) {
    const orgRes = await fetch(`${API_BASE}/organizations?${authParam}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: quote.company }),
    });
    if (orgRes.ok) {
      const orgData = await orgRes.json();
      orgId = orgData.data?.id;
    }
  }

  // 3. Compute price for this date + time slot
  const today = new Date().toISOString().split("T")[0];
  const overrides = await getAllOverrides();
  const override = overrides[quote.date];
  const pricing = computeDayPricing(quote.date, today, override ?? undefined);
  const price = pricing.prices[quote.timeSlot];

  // 4. Format date for title: YYYY-MM-DD → DD/MM/YYYY
  const [year, month, day] = quote.date.split("-");
  const dateFr = `${day}/${month}/${year}`;

  // 5. Create Deal with price + custom fields
  const dealTitle = quote.company
    ? `${quote.company} — ${dateFr} — ${quote.eventType}`
    : `${dateFr} — ${quote.eventType}`;
  const dealBody: Record<string, unknown> = {
    title: dealTitle,
    value: price,
    currency: "EUR",
    person_id: personId,
    pipeline_id: PIPELINE_ID,
    stage_id: STAGE_NEW,
    [FIELD_GUESTS]: quote.guestCount,
    [FIELD_EVENT_TYPE]: quote.eventType,
    [FIELD_SOURCE]: "Calendrier tarifaire",
  };
  if (orgId) dealBody.org_id = orgId;

  const dealRes = await fetch(`${API_BASE}/deals?${authParam}`, {
    method: "POST",
    headers,
    body: JSON.stringify(dealBody),
  });

  if (!dealRes.ok) {
    const err = await dealRes.text();
    console.error(`[Pipedrive] Deal creation failed ${dealRes.status}: ${err}`);
    throw new Error(`Pipedrive Deal error: ${dealRes.status}`);
  }

  const dealData = await dealRes.json();
  const dealId = dealData.data?.id;

  // 6. Add detailed note to the deal
  const priceFormatted = new Intl.NumberFormat("fr-FR").format(price);
  const noteContent = [
    `<b>Demande de devis — Calendrier tarifaire</b>`,
    ``,
    `<b>Date :</b> ${dateFr}`,
    `<b>Créneau :</b> ${TIME_SLOT_LABELS[quote.timeSlot]}`,
    `<b>Prix HT :</b> ${priceFormatted} €`,
    `<b>Fenêtre :</b> ${pricing.bookingWindowLabel}`,
    `<b>Type d'évènement :</b> ${quote.eventType}`,
    `<b>Nombre d'invités :</b> ${quote.guestCount}`,
    quote.company ? `<b>Entreprise :</b> ${quote.company}` : "",
    quote.message ? `<b>Message :</b> ${quote.message}` : "",
    ``,
    `<i>Source : Calendrier tarifaire en ligne (${quote.id})</i>`,
  ]
    .filter(Boolean)
    .join("<br>");

  await fetch(`${API_BASE}/notes?${authParam}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      deal_id: dealId,
      content: noteContent,
      pinned_to_deal_flag: 1,
    }),
  });

  console.log(`[Pipedrive] Deal #${dealId} created for ${quote.firstName} ${quote.lastName} on ${dateFr}`);
}
