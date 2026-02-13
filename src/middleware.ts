import { NextResponse, type NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function getCalendarPassword(): Promise<string | null> {
  // Check KV first (set via admin panel)
  const redis = getRedis();
  if (redis) {
    const kvPassword = await redis.get<string>("pricing:calendar-password");
    if (kvPassword) return kvPassword;
  }
  // Fallback to env var
  return process.env.CALENDAR_PASSWORD || null;
}

/**
 * Basic auth middleware protecting ALL public pages.
 * Password stored in KV (editable from admin) with env var fallback.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for API routes, admin, static assets
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  const password = await getCalendarPassword();
  if (!password) return NextResponse.next();

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [, pwd] = decoded.split(":");
      if (pwd === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Accès restreint", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Calendrier Tarifaire"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
