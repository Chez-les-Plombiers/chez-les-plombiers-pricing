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
 * Matches DD/MM/YYYY anywhere in the title.
 * Returns YYYY-MM-DD or null.
 */
function extractDateFromTitle(title: string): string | null {
  const match = title.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Detect time slot from deal title keywords.
 * Title format: "Company — DD/MM/YYYY Matin — EventType"
 * Returns which booking flags to set.
 */
function extractTimeSlotFromTitle(title: string): {
  isBooked: boolean;
  isBookedMorning: boolean;
  isBookedAfternoon: boolean;
} {
  const lower = title.toLowerCase();
  if (lower.includes("matin") && !lower.includes("après-midi")) {
    return { isBooked: false, isBookedMorning: true, isBookedAfternoon: false };
  }
  if (lower.includes("après-midi") || lower.includes("apres-midi")) {
    return { isBooked: false, isBookedMorning: false, isBookedAfternoon: true };
  }
  // "Journée" or no slot keyword → full day
  return { isBooked: true, isBookedMorning: false, isBookedAfternoon: false };
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

    const slotFlags = extractTimeSlotFromTitle(title);

    // Deal marked as lost → free the date/slot
    if (status === LOST_STATUS) {
      const overrides = await getAllOverrides();
      const existing = overrides[date];
      if (existing && !slotFlags.isBooked) {
        // Half-day deal lost: only free that specific slot, keep other bookings
        const updated = { ...existing };
        if (slotFlags.isBookedMorning) updated.isBookedMorning = false;
        if (slotFlags.isBookedAfternoon) updated.isBookedAfternoon = false;
        // If nothing left booked, delete the override entirely
        if (!updated.isBooked && !updated.isBookedMorning && !updated.isBookedAfternoon) {
          await deleteOverride(date);
        } else {
          await setOverride({ ...updated, date });
        }
      } else {
        await deleteOverride(date);
      }
      console.log(`[Pipedrive Webhook] Deal lost → freed date: ${date} (${slotFlags.isBooked ? "full" : "half-day"})`);
      return NextResponse.json({ received: true, action: "freed", date });
    }

    // Deal moved to a "booked" stage → mark date/slot as booked
    if (BOOKED_STAGES.has(stageId) && stageId !== previousStageId) {
      const overrides = await getAllOverrides();
      const existing = overrides[date];
      await setOverride({
        ...existing,
        date,
        isBooked: slotFlags.isBooked || (existing?.isBooked ?? false),
        isBookedMorning: slotFlags.isBookedMorning || (existing?.isBookedMorning ?? false),
        isBookedAfternoon: slotFlags.isBookedAfternoon || (existing?.isBookedAfternoon ?? false),
        reason: "Réservé (Pipedrive)",
      });
      console.log(`[Pipedrive Webhook] Stage ${stageId} → booked date: ${date} (${slotFlags.isBooked ? "full" : "half-day"})`);
      return NextResponse.json({ received: true, action: "booked", date });
    }

    // Deal moved back from booked stage → free the date/slot
    if (previousStageId && BOOKED_STAGES.has(previousStageId) && !BOOKED_STAGES.has(stageId)) {
      const overrides = await getAllOverrides();
      const existing = overrides[date];
      if (existing && !slotFlags.isBooked) {
        const updated = { ...existing };
        if (slotFlags.isBookedMorning) updated.isBookedMorning = false;
        if (slotFlags.isBookedAfternoon) updated.isBookedAfternoon = false;
        if (!updated.isBooked && !updated.isBookedMorning && !updated.isBookedAfternoon) {
          await deleteOverride(date);
        } else {
          await setOverride({ ...updated, date });
        }
      } else {
        await deleteOverride(date);
      }
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
