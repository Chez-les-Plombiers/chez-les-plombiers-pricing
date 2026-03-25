import { NextResponse } from "next/server";

/**
 * Pipedrive webhook endpoint — kept alive to avoid 404 if Pipedrive still sends events.
 * Availability is now managed exclusively via Google Calendar (source of truth).
 */
export async function POST() {
  return NextResponse.json({ received: true, action: "noop" });
}

// Pipedrive sends GET to verify the URL
export async function GET() {
  return NextResponse.json({ status: "ok", service: "chez-les-plombiers-pricing" });
}
