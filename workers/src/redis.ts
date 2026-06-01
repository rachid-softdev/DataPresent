import IORedis from "ioredis";
import { env } from "./env.js";

/**
 * Build TLS options for IORedis when REDIS_TLS_ENABLED is 'true'.
 * Returns undefined when TLS is not enabled, which is a no-op when spread.
 */
function buildRedisTlsOptions(): { rejectUnauthorized: boolean; ca?: string } | undefined {
  if (env.REDIS_TLS_ENABLED !== "true") return undefined;
  return {
    rejectUnauthorized: env.REDIS_TLS_REJECT_UNAUTHORIZED === "true",
    ...(env.REDIS_TLS_CA ? { ca: env.REDIS_TLS_CA } : {}),
  };
}

export let connection: IORedis | null = null;
let connectionPromise: Promise<IORedis | null> | null = null;
let lastConnectAttempt = 0;
const RECONNECT_COOLDOWN_MS = 10_000;

/**
 * Get Redis connection with explicit async connect.
 * Returns null if Redis is unavailable (graceful degradation).
 * Implements reconnect cooldown and connection deduplication.
 */
export async function getRedisConnectionAsync(): Promise<IORedis | null> {
  // Fast path: connection is ready
  if (connection?.status === "ready") {
    return connection;
  }

  // Cooldown: don't hammer Redis if it's down
  const now = Date.now();
  if (now - lastConnectAttempt < RECONNECT_COOLDOWN_MS) {
    return null;
  }

  // Deduplicate concurrent connection attempts
  if (connectionPromise) {
    return connectionPromise;
  }

  if (!env.REDIS_URL) {
    console.warn("[Redis] REDIS_URL not defined");
    return null;
  }

  // Increase retry strategy for better resilience
  lastConnectAttempt = now;
  connectionPromise = (async () => {
    const conn = new IORedis(env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        if (times > 10) return null;
        return Math.min(times * 1000, 30_000);
      },
      lazyConnect: true,
      tls: buildRedisTlsOptions(),
    });

    try {
      await conn.connect();
      connection = conn;
      return conn;
    } catch (err) {
      console.warn("[Redis] Connection failed, will retry", err);
      conn.disconnect();
      connection = null;
      return null;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

// Keep existing sync function for backward compatibility
export function getRedisConnection(): IORedis {
  if (!connection) {
    if (!env.REDIS_URL) throw new Error("REDIS_URL is required for Redis operations");
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      tls: buildRedisTlsOptions(),
    });
  }
  return connection;
}

export function createSubscriberConnection(): IORedis {
  const redisUrl = env.REDIS_URL;
  if (!redisUrl) throw new Error("REDIS_URL is required for Redis subscriber");
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
    tls: buildRedisTlsOptions(),
  });
}
