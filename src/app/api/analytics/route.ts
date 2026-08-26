import { NextResponse } from "next/server";
import { trackView, getAnalytics } from "@/lib/kv";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    if (!(await rateLimit("analytics", clientIp(request), 30))) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
    }
    const { date } = await request.json();
    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Date requise" }, { status: 400 });
    }
    await trackView(date);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Requête invalide" },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("Authorization");
    if (auth !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const events = await getAnalytics();

    // Aggregate by date
    const byDate: Record<string, number> = {};
    for (const event of events) {
      byDate[event.date] = (byDate[event.date] || 0) + 1;
    }

    // Sort by count descending
    const topDates = Object.entries(byDate)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      totalViews: events.length,
      topDates,
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
