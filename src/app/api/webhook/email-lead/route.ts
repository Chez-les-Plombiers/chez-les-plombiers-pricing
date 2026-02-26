import { NextResponse } from "next/server";

const PIPEDRIVE_API = "https://api.pipedrive.com/v1";
const PIPELINE_ID = 1;
const STAGE_NEW = 1; // "Nouvelle demande"

// Pipedrive custom field keys
const FIELD_GUESTS = "05834ee04351a62a91908c3b409ed21b388cf09e";
const FIELD_EVENT_TYPE = "b077edaa62f510022521226b4a9631e90f1b04c4";
const FIELD_SOURCE = "71ec4d9da53a2578ac16a356018cddf3cf823a24";
const FIELD_CANAL = "93cd462c774cf9c948185b75cdc08c40ea32f7e0"; // Canal d'origine (enum)

// Canal d'origine option IDs
const CANAL_OPTIONS: Record<string, number> = {
  "Réseau Perso": 27,
  "Instagram": 28,
  "WhatsApp": 29,
  "Calendrier tarifaire": 30,
  "Calendly": 31,
  "Plateforme": 32,
  "Email": 33,
  "Homemade": 34,
  "Space to Pop": 35,
  "Snap Event": 36,
  "Kactus": 37,
  "Office Rider": 38,
  "Peerspace": 39,
  "Xnomad": 40,
};

interface EmailLeadPayload {
  source: string; // "Kactus", "Preference Events", etc.
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  date?: string; // DD/MM/YYYY or YYYY-MM-DD
  eventType?: string;
  guestCount?: number;
  message?: string; // Raw email body or extracted details
}

/**
 * Parse date from various formats to DD/MM/YYYY for title and YYYY-MM-DD for internal use.
 */
function parseDate(dateStr: string): { dateFr: string; dateIso: string } | null {
  if (!dateStr) return null;

  // YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return { dateIso: dateStr, dateFr: `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}` };
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const frMatch = dateStr.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (frMatch) {
    return { dateIso: `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`, dateFr: `${frMatch[1]}/${frMatch[2]}/${frMatch[3]}` };
  }

  return null;
}

/**
 * Webhook endpoint for email-parsed leads (called by n8n).
 * Creates a Person + Deal in Pipedrive with source tracking.
 *
 * Expected payload: { source, name, email, phone, company, date, eventType, guestCount, message }
 * Auth: requires X-Webhook-Secret header matching ADMIN_PASSWORD.
 */
export async function POST(request: Request) {
  try {
    // Simple auth to prevent spam
    const secret = request.headers.get("X-Webhook-Secret");
    if (secret !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body: EmailLeadPayload = await request.json();
    const pipedriveToken = process.env.PIPEDRIVE_API_TOKEN;

    if (!pipedriveToken) {
      console.error("[Email Lead] PIPEDRIVE_API_TOKEN not set");
      return NextResponse.json({ error: "no_pipedrive_token" }, { status: 500 });
    }

    if (!body.source) {
      return NextResponse.json({ error: "source is required" }, { status: 400 });
    }

    const authParam = `api_token=${pipedriveToken}`;
    const headers = { "Content-Type": "application/json" };
    const name = body.name || "Inconnu";

    // 1. Create Person
    let personId: number | undefined;
    const personBody: Record<string, unknown> = { name };
    if (body.email) personBody.email = [{ value: body.email, primary: true, label: "work" }];
    if (body.phone) personBody.phone = [{ value: body.phone, primary: true, label: "work" }];

    const personRes = await fetch(`${PIPEDRIVE_API}/persons?${authParam}`, {
      method: "POST",
      headers,
      body: JSON.stringify(personBody),
    });
    if (personRes.ok) {
      personId = (await personRes.json()).data?.id;
    }

    // 2. Create Organization (if company provided)
    let orgId: number | undefined;
    if (body.company) {
      const orgRes = await fetch(`${PIPEDRIVE_API}/organizations?${authParam}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: body.company }),
      });
      if (orgRes.ok) {
        orgId = (await orgRes.json()).data?.id;
      }
    }

    // 3. Build deal title
    const parsed = body.date ? parseDate(body.date) : null;
    const dateFr = parsed?.dateFr;
    const eventType = body.eventType || "Évènement";

    const titleParts: string[] = [];
    if (body.company) titleParts.push(body.company);
    if (dateFr) titleParts.push(dateFr);
    titleParts.push(eventType);
    const dealTitle = titleParts.join(" — ");

    // 4. Create Deal
    const dealBody: Record<string, unknown> = {
      title: dealTitle,
      person_id: personId,
      pipeline_id: PIPELINE_ID,
      stage_id: STAGE_NEW,
      [FIELD_SOURCE]: body.source,
      [FIELD_CANAL]: CANAL_OPTIONS[body.source] ?? 33, // fallback: Email
      [FIELD_EVENT_TYPE]: eventType,
    };
    if (orgId) dealBody.org_id = orgId;
    if (body.guestCount) dealBody[FIELD_GUESTS] = body.guestCount;

    const dealRes = await fetch(`${PIPEDRIVE_API}/deals?${authParam}`, {
      method: "POST",
      headers,
      body: JSON.stringify(dealBody),
    });

    if (!dealRes.ok) {
      const err = await dealRes.text();
      console.error(`[Email Lead] Deal creation failed: ${err}`);
      return NextResponse.json({ error: "deal_failed" }, { status: 500 });
    }

    const dealId = (await dealRes.json()).data?.id;

    // 5. Add note with full details
    const noteLines = [
      `<b>Lead via ${body.source}</b>`,
      ``,
      body.company ? `<b>Entreprise :</b> ${body.company}` : "",
      dateFr ? `<b>Date :</b> ${dateFr}` : "",
      `<b>Type :</b> ${eventType}`,
      body.guestCount ? `<b>Invités :</b> ${body.guestCount}` : "",
      body.email ? `<b>Email :</b> ${body.email}` : "",
      body.phone ? `<b>Téléphone :</b> ${body.phone}` : "",
      body.message ? `<br><b>Message / détails :</b><br>${body.message.replace(/\n/g, "<br>")}` : "",
    ]
      .filter(Boolean)
      .join("<br>");

    await fetch(`${PIPEDRIVE_API}/notes?${authParam}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ deal_id: dealId, content: noteLines, pinned_to_deal_flag: 1 }),
    });

    console.log(`[Email Lead] Deal #${dealId} created from ${body.source} for ${name}`);
    return NextResponse.json({ received: true, action: "deal_created", dealId });
  } catch (err) {
    console.error("[Email Lead] Error:", err);
    return NextResponse.json({ error: "parse_error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "email-lead-webhook" });
}
