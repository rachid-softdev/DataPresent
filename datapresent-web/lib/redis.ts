import IORedis from 'ioredis'
import { env } from '@/env'

let connection: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (!connection) {
    if (!env.REDIS_URL) throw new Error('REDIS_URL is required for Redis operations')
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        if (times > 3) return null
        return Math.min(times * 200, 2000)
      },
      lazyConnect: true,
    })
  }
  return connection
}

export function createSubscriberConnection(): IORedis {
  const redisUrl = env.REDIS_URL
  if (!redisUrl) throw new Error('REDIS_URL is required for Redis subscriber')
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      if (times > 3) return null
      return Math.min(times * 200, 2000)
    },
    lazyConnect: true,
  })
}