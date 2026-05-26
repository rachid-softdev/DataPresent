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
 */
export async function checkRateLimit(key: string, options?: RateLimitOptions): Promise<boolean> {
  const limit = options?.limit ?? DEFAULT_LIMIT
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW
  const windowStart = new Date(Date.now() - windowMs)

  const rateLimit = await prisma.rateLimit.findUnique({
    where: { key },
  })

  if (!rateLimit) {
    await prisma.rateLimit.create({
      data: {
        key,
        count: 1,
        windowStart: new Date(),
        expires: new Date(Date.now() + windowMs * 2),
      },
    })
    return true
  }

  // Window expired, reset
  if (rateLimit.windowStart.getTime() < windowStart.getTime()) {
    await prisma.rateLimit.update({
      where: { key },
      data: {
        count: 1,
        windowStart: new Date(),
        expires: new Date(Date.now() + windowMs * 2),
      },
    })
    return true
  }

  if (rateLimit.count >= limit) {
    return false
  }

  await prisma.rateLimit.update({
    where: { key },
    data: {
      count: rateLimit.count + 1,
      windowStart: rateLimit.windowStart,
      expires: new Date(rateLimit.windowStart.getTime() + windowMs * 2),
    },
  })
  return true
}
