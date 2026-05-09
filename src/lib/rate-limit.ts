import { prisma } from '@/lib/prisma'

const isDev = process.env.NODE_ENV === 'development'
const DEFAULT_LIMIT = isDev ? 100 : 30
const DEFAULT_WINDOW = isDev ? 60 * 1000 : 60 * 60 * 1000 // dev: 1 min, prod: 1 hour

export interface RateLimitOptions {
  limit?: number
  windowMs?: number
}

/**
 * Check if a key has exceeded its rate limit.
 * Returns true if the request is allowed, false if rate limited.
 */
export async function checkRateLimit(
  key: string,
  options?: RateLimitOptions
): Promise<boolean> {
  const limit = options?.limit ?? DEFAULT_LIMIT
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW
  const windowStart = new Date(Date.now() - windowMs)

  const rateLimit = await prisma.rateLimit.findUnique({
    where: { key }
  })

  if (!rateLimit) {
    await prisma.rateLimit.create({
      data: {
        key,
        count: 1,
        windowStart: new Date(),
        expires: new Date(Date.now() + windowMs * 2)
      }
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
        expires: new Date(Date.now() + windowMs * 2)
      }
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
      expires: new Date(rateLimit.windowStart.getTime() + windowMs * 2)
    }
  })
  return true
}
