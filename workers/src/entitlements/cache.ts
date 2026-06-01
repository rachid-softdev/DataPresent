// ==========================================
// Cache Service - Redis + Memory LRU Fallback
// ==========================================

import IORedis from 'ioredis'
import { LRUCache } from 'lru-cache'
import { getRedisConnectionAsync, createSubscriberConnection, connection } from '../redis.js'
import type { EntitlementMap } from './types'

// ==========================================
// Configuration
// ==========================================

const ENTITLEMENTS_TTL_SECONDS = 300 // 5 minutes
const MEMORY_CACHE_TTL_MS = 30 * 1000 // 30 seconds
const MAX_MEMORY_CACHE_SIZE = 100 // Max orgs in memory cache

// ==========================================
// Redis Client (lazy async initialization)
// ==========================================

let subscriberInstance: IORedis | null = null

// ==========================================
// Memory LRU Cache (fallback when Redis unavailable)
// ==========================================

const memoryCache = new LRUCache<string, { data: EntitlementMap; timestamp: number }>({
  max: MAX_MEMORY_CACHE_SIZE,
  ttl: MEMORY_CACHE_TTL_MS,
})

// ==========================================
// Cache Key Helpers
// ==========================================

function getCacheKey(orgId: string): string {
  return `entitlements:${orgId}`
}

function getInvalidationChannel(): string {
  return 'entitlements-invalidate'
}

// ==========================================
// Cache Service Class
// ==========================================

export class EntitlementsCacheService {
  /** Track whether Redis Pub/Sub channel has been subscribed to */
  private subscribedToChannel: boolean = false

  /**
   * Get entitlements from cache (Redis first, then memory)
   */
  async get(orgId: string): Promise<EntitlementMap | null> {
    const key = getCacheKey(orgId)

    // Try Redis first
    const redis = await getRedisConnectionAsync()
    if (redis) {
      try {
        const cached = await redis.get(key)
        if (cached) {
          return JSON.parse(cached) as EntitlementMap
        }
      } catch (error) {
        console.warn('[EntitlementsCache] Redis get failed, falling back to memory', error)
      }
    }

    // Fallback to memory cache
    const memoryEntry = memoryCache.get(key)
    if (memoryEntry && Date.now() - memoryEntry.timestamp < MEMORY_CACHE_TTL_MS) {
      return memoryEntry.data
    }

    return null
  }

  /**
   * Set entitlements in cache (Redis + memory)
   */
  async set(orgId: string, entitlements: EntitlementMap): Promise<void> {
    const key = getCacheKey(orgId)
    const serialized = JSON.stringify(entitlements)

    // Set in Redis with TTL
    const redis = await getRedisConnectionAsync()
    if (redis) {
      try {
        await redis.setex(key, ENTITLEMENTS_TTL_SECONDS, serialized)
      } catch (error) {
        console.warn('[EntitlementsCache] Redis set failed, using memory only', error)
      }
    }

    // Always set in memory cache as well
    memoryCache.set(key, {
      data: entitlements,
      timestamp: Date.now(),
    })
  }

  /**
   * Invalidate cache for a specific org
   */
  async invalidate(orgId: string): Promise<void> {
    const key = getCacheKey(orgId)

    // Delete from Redis
    const redis = await getRedisConnectionAsync()
    if (redis) {
      try {
        await redis.del(key)
      } catch (error) {
        console.warn('[EntitlementsCache] Redis delete failed', error)
      }
    }

    // Delete from memory cache
    memoryCache.delete(key)

    // Publish invalidation event for multi-instance fan-out
    await this.publishInvalidation(orgId)
  }

  /**
   * Publish invalidation event to other instances
   */
  private async publishInvalidation(orgId: string): Promise<void> {
    const redis = await getRedisConnectionAsync()
    if (!redis) return

    try {
      await redis.publish(getInvalidationChannel(), orgId)
    } catch (error) {
      console.warn('[EntitlementsCache] Failed to publish invalidation', error)
    }
  }

  /**
   * Subscribe to invalidation events (for multi-instance)
   */
  async subscribeToInvalidations(callback: (orgId: string) => void): Promise<() => void> {
    const redis = await getRedisConnectionAsync()
    if (!redis) {
      console.warn('[EntitlementsCache] Redis not available, cannot subscribe to invalidations')
      return () => {}
    }

    if (!subscriberInstance) {
      subscriberInstance = createSubscriberConnection()
    }
    const subscriber = subscriberInstance

    // Only subscribe to the Redis channel and register listener once
    if (!this.subscribedToChannel) {
      await subscriber.connect()
      await subscriber.subscribe(getInvalidationChannel())
      this.subscribedToChannel = true

      subscriber.on('message', (_channel, message) => {
        callback(message)
      })
    }

    // Return a no-op unsubscribe (subscriber is managed globally for the app lifecycle)
    return () => {}
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return connection?.status === 'ready'
  }
}

// ==========================================
// Singleton Instance
// ==========================================

export const entitlementsCache = new EntitlementsCacheService()

// ==========================================
// Helper Functions (for direct usage)
// ==========================================

export async function getCachedEntitlements(orgId: string): Promise<EntitlementMap | null> {
  return entitlementsCache.get(orgId)
}

export async function setCachedEntitlements(
  orgId: string,
  entitlements: EntitlementMap
): Promise<void> {
  return entitlementsCache.set(orgId, entitlements)
}

export async function invalidateEntitlementsCache(orgId: string): Promise<void> {
  return entitlementsCache.invalidate(orgId)
}
