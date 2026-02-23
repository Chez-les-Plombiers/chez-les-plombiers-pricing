import { NextResponse } from "next/server";

const PIPEDRIVE_API = "https://api.pipedrive.com/v1";
const PIPELINE_ID = 1;
const STAGE_VISITE = 2; // "Visite Planifiée"

// Pipedrive custom field keys
const FIELD_SOURCE = "71ec4d9da53a2578ac16a356018cddf3cf823a24";

/**
 * Fetch scheduled event details from Calendly API to get the visit date/time.
 */
async function fetchCalendlyEvent(eventUri: string, token: string) {
  const res = await fetch(eventUri, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.resource;
}

/**
 * Extract phone number from Calendly questions_and_answers.
 */
function extractPhone(qna: Array<{ question: string; answer: string }>): string {
  if (!qna) return "";
  const phoneQ = qna.find(
    (q) =>
      q.question.toLowerCase().includes("phone") ||
      q.question.toLowerCase().includes("téléphone") ||
      q.question.toLowerCase().includes("numero")
  );
  return phoneQ?.answer ?? "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Only process invitee.created events
    if (body.event !== "invitee.created") {
      return NextResponse.json({ received: true, action: "ignored", event: body.event });
    }

    const calendlyToken = process.env.CALENDLY_API_TOKEN;
    const pipedriveToken = process.env.PIPEDRIVE_API_TOKEN;

    if (!pipedriveToken) {
      console.error("[Calendly Webhook] PIPEDRIVE_API_TOKEN not set");
      return NextResponse.json({ received: true, error: "no_pipedrive_token" }, { status: 200 });
    }

    const payload = body.payload;
    const name = payload.name || "Inconnu";
    const email = payload.email || "";
    const phone = extractPhone(payload.questions_and_answers || []);
    const eventUri = payload.event; // URI to fetch scheduled event details

    // Fetch visit date/time from Calendly API
    let visitDate = "";
    let visitTime = "";
    let eventName = "Visite";
    if (calendlyToken && eventUri) {
      const event = await fetchCalendlyEvent(eventUri, calendlyToken);
      if (event) {
        const start = new Date(event.start_time);
        visitDate = start.toISOString().split("T")[0]; // YYYY-MM-DD
        visitTime = start.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Paris",
        });
        eventName = event.name || "Visite";
      }
    }

    const authParam = `api_token=${pipedriveToken}`;
    const headers = { "Content-Type": "application/json" };

    // 1. Create Person
    const nameParts = name.split(" ");
    const personRes = await fetch(`${PIPEDRIVE_API}/persons?${authParam}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name,
        email: email ? [{ value: email, primary: true, label: "work" }] : undefined,
        phone: phone ? [{ value: phone, primary: true, label: "work" }] : undefined,
      }),
    });

    let personId: number | undefined;
    if (personRes.ok) {
      const personData = await personRes.json();
      personId = personData.data?.id;
    }

    // 2. Format for deal title
    let dateFr = "";
    if (visitDate) {
      const [y, m, d] = visitDate.split("-");
      dateFr = `${d}/${m}/${y}`;
    }

    // 3. Create Deal in stage 2 "Visite Planifiée"
    const dealTitle = dateFr
      ? `CLP — ${dateFr} — ${name} — ${eventName}`
      : `CLP — ${name} — ${eventName}`;

    const dealBody: Record<string, unknown> = {
      title: dealTitle,
      person_id: personId,
      pipeline_id: PIPELINE_ID,
      stage_id: STAGE_VISITE,
      [FIELD_SOURCE]: "Calendly",
    };

    const dealRes = await fetch(`${PIPEDRIVE_API}/deals?${authParam}`, {
      method: "POST",
      headers,
      body: JSON.stringify(dealBody),
    });

    if (!dealRes.ok) {
      const err = await dealRes.text();
      console.error(`[Calendly Webhook] Deal creation failed: ${err}`);
      return NextResponse.json({ received: true, error: "deal_failed" }, { status: 200 });
    }

    const dealData = await dealRes.json();
    const dealId = dealData.data?.id;

    // 4. Add note with details
    const noteLines = [
      `<b>Visite réservée via Calendly</b>`,
      ``,
      visitDate ? `<b>Date :</b> ${dateFr} à ${visitTime}` : "",
      `<b>Nom :</b> ${name}`,
      email ? `<b>Email :</b> ${email}` : "",
      phone ? `<b>Téléphone :</b> ${phone}` : "",
      `<b>Type :</b> ${eventName}`,
    ]
      .filter(Boolean)
      .join("<br>");

    await fetch(`${PIPEDRIVE_API}/notes?${authParam}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        deal_id: dealId,
        content: noteLines,
        pinned_to_deal_flag: 1,
      }),
    });

    console.log(
      `[Calendly Webhook] Deal #${dealId} created for ${name}${dateFr ? ` — visite ${dateFr}` : ""}`
    );

    return NextResponse.json({ received: true, action: "deal_created", dealId });
  } catch (err) {
    console.error("[Calendly Webhook] Error:", err);
    return NextResponse.json({ received: true, error: "parse_error" }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "calendly-webhook" });
}
