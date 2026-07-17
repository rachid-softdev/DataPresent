import { isFeatureEnabled } from "@/env";
import { prisma } from "@/lib/prisma";
import { getRedisConnectionAsync } from "@/lib/redis";

// ==========================================
// Health Check Types
// ==========================================

export interface HealthCheckProvider {
  name: string;
  check(): Promise<HealthCheckResultItem>;
}

export interface HealthCheckResultItem {
  status: "ok" | "fail";
  error?: string;
}

export interface HealthCheckResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  checks: Record<string, HealthCheckResultItem>;
}

// ==========================================
// Default health check providers
// ==========================================

const databaseCheck: HealthCheckProvider = {
  name: "database",
  check: async (): Promise<HealthCheckResultItem> => {
    try {
      await prisma.$queryRaw<unknown>`SELECT 1`;
      return { status: "ok" };
    } catch {
      return { status: "fail", error: "Database connection failed" };
    }
  },
};

const redisCheck: HealthCheckProvider = {
  name: "redis",
  check: async (): Promise<HealthCheckResultItem> => {
    if (!isFeatureEnabled("redis")) {
      return { status: "ok", error: "not configured" };
    }
    try {
      const redis = await getRedisConnectionAsync();
      if (redis) {
        await redis.ping();
        return { status: "ok" };
      }
      return { status: "fail", error: "connection not available" };
    } catch {
      return { status: "fail", error: "Redis connection failed" };
    }
  },
};

// ==========================================
// HealthCheckRegistry
// ==========================================

class HealthCheckRegistryImpl {
  private providers: HealthCheckProvider[] = [];

  constructor() {
    // Register default providers
    this.register(databaseCheck);
    this.register(redisCheck);
  }

  register(provider: HealthCheckProvider): void {
    // Replace existing provider with same name
    const index = this.providers.findIndex((p) => p.name === provider.name);
    if (index >= 0) {
      this.providers[index] = provider;
    } else {
      this.providers.push(provider);
    }
  }

  async runAll(): Promise<HealthCheckResponse> {
    const results = await Promise.all(
      this.providers.map(async (provider) => {
        const result = await provider.check();
        return [provider.name, result] as const;
      }),
    );

    const checks: Record<string, HealthCheckResultItem> = {};
    let hasFailure = false;
    let allFailures = true;

    for (const [name, result] of results) {
      checks[name] = result;
      if (result.status === "fail") {
        hasFailure = true;
      } else {
        allFailures = false;
      }
    }

    let status: "ok" | "degraded" | "down";
    if (allFailures) {
      status = "down";
    } else if (hasFailure) {
      status = "degraded";
    } else {
      status = "ok";
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}

export const healthCheckRegistry = new HealthCheckRegistryImpl();

/**
 * Convenience function to run all health checks and return the response.
 */
export async function runHealthChecks(): Promise<HealthCheckResponse> {
  return healthCheckRegistry.runAll();
}
