import { Redis } from "@upstash/redis";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const WINDOW_SECONDS = 60;

/**
 * Rate limit à fenêtre fixe (par minute), stocké dans Redis.
 * Fail-open : si Redis est indisponible, on laisse passer plutôt que de
 * casser le site — le rate limiting est une défense, pas une dépendance.
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  const key = `rl:${bucket}:${identifier}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    return count <= limit;
  } catch {
    return true;
  }
}

/** IP du client derrière le proxy Vercel. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
