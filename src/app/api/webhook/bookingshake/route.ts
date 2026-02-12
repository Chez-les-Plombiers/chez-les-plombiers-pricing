import { NextResponse } from "next/server";
import { setOverride, deleteOverride, getAllOverrides } from "@/lib/kv";

// BookingShake status IDs that mean the venue is booked
const BOOKED_STATUSES = new Set([
  "9chlvRoMQjYYIXpLS0vk", // Validé - Paiement reçu
  "RrvQmlrXC06rh4SMeQOg", // En cours
  "6zG1vAs4aPTHAMR37Ugk", // Option posée
  "52o2aUQhh7UM02gKeYi7", // Derniers détails
  "xZFybj0cdXpluxtnjnqj", // Attente paiement
]);

// Statuses that mean the day is free again
const CANCELLED_STATUSES = new Set([
  "TCK2csN3NQDXmN7F8zip", // Perdu - dispo
  "WvUeDe0HuIEajVnwCTiy", // Refusé
  "cOb6rEbn4inPJhPpZrGa", // Perdu - Autre
  "cP9w6l23EDzX14HjNBbA", // Perdu - budget
  "roLNy49YHgOki68zhcjX", // Perdu - concurrence
  "wXv3oZBnPBmuCU65veHe", // Clôturé
]);

/**
 * Convert DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // DD-MM-YYYY or DD/MM/YYYY
  const match = dateStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;

  // Unix timestamp (seconds)
  const num = Number(dateStr);
  if (!isNaN(num) && num > 1000000000) {
    return new Date(num * 1000).toISOString().split("T")[0];
  }

  return null;
}

/**
 * Extract dates and status from various possible payload shapes
 */
function extractData(body: Record<string, unknown>): {
  dates: string[];
  statusId: string | null;
} {
  const dates: string[] = [];
  let statusId: string | null = null;

  // Try to find statusId at various levels
  statusId =
    (body.statusId as string) ??
    (body.status_id as string) ??
    ((body.data as Record<string, unknown>)?.statusId as string) ??
    ((body.request as Record<string, unknown>)?.statusId as string) ??
    null;

  // Try to find dates from bookings/reservations array
  const bookings =
    (body.bookings as Record<string, unknown>[]) ??
    (body.reservations as Record<string, unknown>[]) ??
    ((body.data as Record<string, unknown>)?.bookings as Record<string, unknown>[]) ??
    ((body.data as Record<string, unknown>)?.reservations as Record<string, unknown>[]) ??
    [];

  if (Array.isArray(bookings)) {
    for (const b of bookings) {
      const d = parseDate((b.date as string) ?? "");
      if (d) dates.push(d);
    }
  }

  // Single date at top level
  if (dates.length === 0) {
    const d = parseDate((body.date as string) ?? ((body.data as Record<string, unknown>)?.date as string) ?? "");
    if (d) dates.push(d);
  }

  return { dates, statusId };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Log full payload for debugging
    console.log("[BookingShake Webhook] Received:", JSON.stringify(body));

    const { dates, statusId } = extractData(body);

    if (dates.length === 0) {
      console.log("[BookingShake Webhook] No dates found in payload");
      return NextResponse.json({ received: true, action: "no_dates" });
    }

    if (!statusId) {
      console.log("[BookingShake Webhook] No statusId found, marking as booked by default");
      for (const date of dates) {
        const overrides = await getAllOverrides();
        const existing = overrides[date];
        await setOverride({ ...existing, date, isBooked: true, reason: "Réservé (BookingShake)" });
      }
      return NextResponse.json({ received: true, action: "booked", dates });
    }

    if (BOOKED_STATUSES.has(statusId)) {
      for (const date of dates) {
        const overrides = await getAllOverrides();
        const existing = overrides[date];
        await setOverride({ ...existing, date, isBooked: true, reason: "Réservé (BookingShake)" });
      }
      console.log(`[BookingShake Webhook] Marked as booked: ${dates.join(", ")}`);
      return NextResponse.json({ received: true, action: "booked", dates });
    }

    if (CANCELLED_STATUSES.has(statusId)) {
      for (const date of dates) {
        await deleteOverride(date);
      }
      console.log(`[BookingShake Webhook] Freed dates: ${dates.join(", ")}`);
      return NextResponse.json({ received: true, action: "freed", dates });
    }

    console.log(`[BookingShake Webhook] Unknown status: ${statusId}`);
    return NextResponse.json({ received: true, action: "ignored", statusId });
  } catch (err) {
    console.error("[BookingShake Webhook] Error:", err);
    return NextResponse.json({ received: true, error: "parse_error" }, { status: 200 });
  }
}

// BookingShake might send GET to verify the URL
export async function GET() {
  return NextResponse.json({ status: "ok", service: "chez-les-plombiers-pricing" });
}
