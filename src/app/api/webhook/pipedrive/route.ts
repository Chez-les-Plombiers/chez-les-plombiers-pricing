import { NextResponse } from "next/server";
import { setOverride, deleteOverride, getAllOverrides } from "@/lib/kv";

// Pipedrive stage IDs (Pipeline Principal)
const BOOKED_STAGES = new Set([
  7, // Demande Confirmée
  6, // Paiement reçu
]);

const LOST_STATUS = "lost";

/**
 * Extract the event date from a deal title.
 * Expected format: "CLP — DD/MM/YYYY — Name — Type"
 * Returns YYYY-MM-DD or null.
 */
function extractDateFromTitle(title: string): string | null {
  const match = title.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("[Pipedrive Webhook] Received:", JSON.stringify(body).slice(0, 500));

    // Pipedrive webhook payload: { current, previous, event, meta }
    const current = body.current;
    const previous = body.previous;

    if (!current) {
      return NextResponse.json({ received: true, action: "no_data" });
    }

    const title = current.title || "";
    const date = extractDateFromTitle(title);

    if (!date) {
      console.log("[Pipedrive Webhook] No date found in deal title:", title);
      return NextResponse.json({ received: true, action: "no_date" });
    }

    const stageId = current.stage_id;
    const status = current.status;
    const previousStageId = previous?.stage_id;

    // Deal marked as lost → free the date
    if (status === LOST_STATUS) {
      await deleteOverride(date);
      console.log(`[Pipedrive Webhook] Deal lost → freed date: ${date}`);
      return NextResponse.json({ received: true, action: "freed", date });
    }

    // Deal moved to a "booked" stage → mark date as booked
    if (BOOKED_STAGES.has(stageId) && stageId !== previousStageId) {
      const overrides = await getAllOverrides();
      const existing = overrides[date];
      await setOverride({ ...existing, date, isBooked: true, reason: "Réservé (Pipedrive)" });
      console.log(`[Pipedrive Webhook] Stage ${stageId} → booked date: ${date}`);
      return NextResponse.json({ received: true, action: "booked", date });
    }

    // Deal moved back from booked stage → free the date
    if (previousStageId && BOOKED_STAGES.has(previousStageId) && !BOOKED_STAGES.has(stageId)) {
      await deleteOverride(date);
      console.log(`[Pipedrive Webhook] Moved from booked stage → freed date: ${date}`);
      return NextResponse.json({ received: true, action: "freed", date });
    }

    console.log(`[Pipedrive Webhook] Stage ${stageId}, status ${status} — no action`);
    return NextResponse.json({ received: true, action: "ignored", stageId, status });
  } catch (err) {
    console.error("[Pipedrive Webhook] Error:", err);
    return NextResponse.json({ received: true, error: "parse_error" }, { status: 200 });
  }
}

// Pipedrive sends GET to verify the URL
export async function GET() {
  return NextResponse.json({ status: "ok", service: "chez-les-plombiers-pricing" });
}
