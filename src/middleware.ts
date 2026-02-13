import { NextResponse, type NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function getCalendarPassword(): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    const kvPassword = await redis.get<string>("pricing:calendar-password");
    if (kvPassword) return kvPassword;
  }
  return process.env.CALENDAR_PASSWORD || null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for API routes, admin, static assets, gate page
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/gate") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  const password = await getCalendarPassword();
  if (!password) return NextResponse.next();

  // Check cookie
  const cookie = request.cookies.get("clp-access")?.value;
  if (cookie === password) {
    return NextResponse.next();
  }

  // Redirect to gate page
  const gateUrl = new URL("/gate", request.url);
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
