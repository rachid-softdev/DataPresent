import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { getRedisConnectionAsync } from "@/lib/redis";

const rateLimitMap = {
  relaxed: { limit: 100, windowMs: 60 * 1000 }, // 100/minute for dev
  strict: { limit: 30, windowMs: 60 * 60 * 1000 }, // 30/hour for prod
};

const strategy = env.RATE_LIMIT_STRATEGY;
export const DEFAULT_LIMIT = rateLimitMap[strategy].limit;
export const DEFAULT_WINDOW = rateLimitMap[strategy].windowMs;

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

/**
 * Check if a key has exceeded its rate limit.
 * Returns true if the request is allowed, false if rate limited.
 * Uses an atomic UPSERT to eliminate TOCTOU race conditions.
 */
export async function checkRateLimit(key: string, options?: RateLimitOptions): Promise<boolean> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW;

  // Use COALESCE for defaults (PostgreSQL || is string concat, not null-coalescing)
  const intervalMs = windowMs * 2;
  const windowIntervalMs = windowMs;

  const result = await prisma.$queryRaw<Array<{ allowed: boolean }>>`
    INSERT INTO "RateLimit" ("id", "key", "count", "windowStart", "expires")
    VALUES (gen_random_uuid()::text, ${key}, 1, NOW(), NOW() + (${intervalMs}::double precision * interval '1 millisecond'))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" < NOW() - (${windowIntervalMs}::double precision * interval '1 millisecond') THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" < NOW() - (${windowIntervalMs}::double precision * interval '1 millisecond') THEN NOW()
        ELSE "RateLimit"."windowStart"
      END,
      "expires" = NOW() + (${intervalMs}::double precision * interval '1 millisecond')
    RETURNING
      CASE
        WHEN "count" <= ${limit} THEN true
        ELSE false
      END as allowed
  `;

  return result[0]?.allowed ?? true;
}

/**
 * Redis-based rate limiter for auth endpoints (email + IP).
 * Limits to 3 requests per minute per email.
 * Falls back gracefully to PostgreSQL checkRateLimit if Redis is unavailable.
 *
 * @param email - The normalized email address to rate limit
 * @param ip - Optional client IP for additional rate limiting
 * @returns true if request is allowed, false if rate limited
 */
export async function authRateLimit(email: string, ip?: string): Promise<boolean> {
  const LIMIT = 3;
  const WINDOW_SECONDS = 60;

  const key = `auth:${email}`;

  try {
    const redis = await getRedisConnectionAsync();
    if (!redis) {
      // Fallback to PostgreSQL rate limiting when Redis is unavailable
      return checkRateLimit(`auth:${email}`, { limit: LIMIT, windowMs: WINDOW_SECONDS * 1000 });
    }

    const count = await redis.incr(key);
    if (count === 1) {
      // First request in this window — set expiry
      await redis.expire(key, WINDOW_SECONDS);
    }

    // Also rate limit by IP if provided (stricter: 10/min)
    if (ip) {
      const ipKey = `auth-ip:${ip}`;
      const ipCount = await redis.incr(ipKey);
      if (ipCount === 1) {
        await redis.expire(ipKey, WINDOW_SECONDS);
      }
      if (ipCount > 10) {
        return false;
      }
    }

    return count <= LIMIT;
  } catch {
    // Final fallback: allow through if Redis check fails entirely
    return true;
  }
}
