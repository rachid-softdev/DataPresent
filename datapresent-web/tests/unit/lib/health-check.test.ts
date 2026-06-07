// ==========================================
// Health Check Registry Tests (Sprint 6, Item 4)
// ==========================================
//
// Tests for lib/health-check.ts:
// - HealthCheckRegistry default provider registration
// - runAll() aggregation logic (ok/degraded/down)
// - Provider error handling
// - Custom provider support
// - Response shape and timestamp

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma and redis BEFORE importing the module under test
// NOTE: vi.mock factory functions are hoisted, so any variables referenced must use vi.hoisted()
const mockQueryRaw = vi.hoisted(() => vi.fn());
const mockGetRedisConnectionAsync = vi.hoisted(() => vi.fn());
const mockIsFeatureEnabled = vi.hoisted(() =>
  vi.fn().mockImplementation((feature: string) => {
    if (feature === "redis") return true;
    return false;
  }),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

vi.mock("@/lib/redis", () => ({
  getRedisConnectionAsync: mockGetRedisConnectionAsync,
}));

vi.mock("@/env", () => ({
  isFeatureEnabled: mockIsFeatureEnabled,
  env: {
    REDIS_URL: "redis://localhost:6379",
  },
}));

import { healthCheckRegistry, runHealthChecks } from "@/lib/health-check";

describe("HealthCheckRegistry (lib/health-check.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ======================================================================
  // Default providers
  // ======================================================================

  it("should include default database and redis providers", async () => {
    // Arrange: database check returns ok, redis check returns ok (with null connection = fail)
    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: vi.fn().mockResolvedValue("PONG"),
    });

    const result = await healthCheckRegistry.runAll();

    expect(result.checks).toHaveProperty("database");
    expect(result.checks).toHaveProperty("redis");
  });

  // ======================================================================
  // Status aggregation: all ok
  // ======================================================================

  it("should return status 'ok' when all checks pass", async () => {
    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: vi.fn().mockResolvedValue("PONG"),
    });

    const result = await healthCheckRegistry.runAll();

    expect(result.status).toBe("ok");
    expect(result.checks.database.status).toBe("ok");
    expect(result.checks.redis.status).toBe("ok");
  });

  // ======================================================================
  // Status aggregation: degraded (some fail)
  // ======================================================================

  it("should return status 'degraded' when database fails", async () => {
    mockQueryRaw.mockRejectedValue(new Error("DB connection refused"));
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: vi.fn().mockResolvedValue("PONG"),
    });

    const result = await healthCheckRegistry.runAll();

    expect(result.status).toBe("degraded");
    expect(result.checks.database.status).toBe("fail");
    expect(result.checks.database.error).toBe("Database connection failed");
    expect(result.checks.redis.status).toBe("ok");
  });

  it("should return status 'degraded' when redis fails", async () => {
    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: vi.fn().mockRejectedValue(new Error("Redis connection refused")),
    });

    const result = await healthCheckRegistry.runAll();

    expect(result.status).toBe("degraded");
    expect(result.checks.database.status).toBe("ok");
    expect(result.checks.redis.status).toBe("fail");
    expect(result.checks.redis.error).toBe("Redis connection failed");
  });

  it("should return status 'degraded' when redis is unavailable (null connection)", async () => {
    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);
    mockGetRedisConnectionAsync.mockResolvedValue(null);

    const result = await healthCheckRegistry.runAll();

    expect(result.status).toBe("degraded");
    expect(result.checks.database.status).toBe("ok");
    expect(result.checks.redis.status).toBe("fail");
    expect(result.checks.redis.error).toBe("connection not available");
  });

  // ======================================================================
  // Status aggregation: down (all fail)
  // ======================================================================

  it("should return status 'down' when all checks fail", async () => {
    mockQueryRaw.mockRejectedValue(new Error("DB down"));
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: vi.fn().mockRejectedValue(new Error("Redis down")),
    });

    const result = await healthCheckRegistry.runAll();

    expect(result.status).toBe("down");
    expect(result.checks.database.status).toBe("fail");
    expect(result.checks.redis.status).toBe("fail");
  });

  // ======================================================================
  // Redis not configured (isFeatureEnabled returns false)
  // ======================================================================

  it("should treat redis as ok when not configured (graceful degradation)", async () => {
    mockIsFeatureEnabled.mockImplementation((feature: string) => {
      if (feature === "redis") return false;
      return true;
    });

    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);

    const result = await healthCheckRegistry.runAll();

    expect(result.status).toBe("ok");
    expect(result.checks.redis.status).toBe("ok");
    expect(result.checks.redis.error).toBe("not configured");
  });

  // ======================================================================
  // Custom provider registration
  // ======================================================================

  it("should include custom provider results", async () => {
    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: vi.fn().mockResolvedValue("PONG"),
    });

    const customProvider = {
      name: "custom-check",
      check: vi.fn().mockResolvedValue({ status: "ok" as const }),
    };

    try {
      healthCheckRegistry.register(customProvider);

      const result = await healthCheckRegistry.runAll();

      expect(result.checks).toHaveProperty("custom-check");
      expect(result.checks["custom-check"].status).toBe("ok");
    } finally {
      // No cleanup needed as test registry is singleton
    }
  });

  // ======================================================================
  // Response shape
  // ======================================================================

  it("should return the correct response shape", async () => {
    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: vi.fn().mockResolvedValue("PONG"),
    });

    const result = await healthCheckRegistry.runAll();

    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("checks");
    expect(result).toHaveProperty("timestamp");
  });

  it("should return an ISO timestamp", async () => {
    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: vi.fn().mockResolvedValue("PONG"),
    });

    const result = await healthCheckRegistry.runAll();

    expect(typeof result.timestamp).toBe("string");
    expect(() => new Date(result.timestamp)).not.toThrow();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  // ======================================================================
  // runHealthChecks convenience function
  // ======================================================================

  it("runHealthChecks() should return a valid response", async () => {
    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: vi.fn().mockResolvedValue("PONG"),
    });

    const result = await runHealthChecks();

    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("checks");
    expect(result).toHaveProperty("timestamp");
  });
});
