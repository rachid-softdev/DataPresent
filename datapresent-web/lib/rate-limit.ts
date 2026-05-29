import { prisma } from '@/lib/prisma'
import { env } from '@/env'

const rateLimitMap = {
  relaxed: { limit: 100, windowMs: 60 * 1000 },    // 100/minute for dev
  strict:  { limit: 30,  windowMs: 60 * 60 * 1000 }, // 30/hour for prod
}

const strategy = env.RATE_LIMIT_STRATEGY
export const DEFAULT_LIMIT = rateLimitMap[strategy].limit
export const DEFAULT_WINDOW = rateLimitMap[strategy].windowMs

export interface RateLimitOptions {
  limit?: number
  windowMs?: number
}

/**
 * Check if a key has exceeded its rate limit.
 * Returns true if the request is allowed, false if rate limited.
 * Uses an atomic UPSERT to eliminate TOCTOU race conditions.
 */
export async function checkRateLimit(key: string, options?: RateLimitOptions): Promise<boolean> {
  const limit = options?.limit ?? DEFAULT_LIMIT
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW

  // Use COALESCE for defaults (PostgreSQL || is string concat, not null-coalescing)
  const intervalMs = windowMs * 2 > 0 ? windowMs * 2 : 120000
  const windowIntervalMs = windowMs > 0 ? windowMs : 60000

  const result = await prisma.$queryRaw<Array<{ allowed: boolean }>>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart", "expires")
    VALUES (${key}, 1, NOW(), NOW() + (${intervalMs}::double precision * interval '1 millisecond'))
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
  `

  return result[0]?.allowed ?? true
}
