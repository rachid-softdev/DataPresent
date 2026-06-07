// ==========================================
// Health API Route Tests (Sprint 6, Item 4)
// ==========================================
//
// Tests for app/api/health/route.ts:
// - GET returns NextResponse.json with runHealthChecks result
// - Status code is 200 when all checks ok, 503 otherwise

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQueryRaw = vi.hoisted(() => vi.fn());
const mockRedisPing = vi.hoisted(() => vi.fn());
const mockGetRedisConnectionAsync = vi.hoisted(() => vi.fn());
const mockIsFeatureEnabled = vi.hoisted(() =>
  vi.fn().mockImplementation((feature: string) => {
    if (feature === "redis") return true;
    return false;
  }),
);

const mockJson = vi.hoisted(() => vi.fn());

vi.mock("next/server", () => ({
  NextResponse: {
    json: mockJson,
  },
}));

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

import { GET } from "@/app/api/health/route";

describe("Health API route (/api/health)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFeatureEnabled.mockImplementation((feature: string) => {
      if (feature === "redis") return true;
      return false;
    });
    mockJson.mockImplementation((body: object, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
      });
    });
  });

  it("should call NextResponse.json with health check result", async () => {
    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: mockRedisPing.mockResolvedValue("PONG"),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.checks).toHaveProperty("database");
    expect(data.checks).toHaveProperty("redis");
  });

  it("should return 503 when health check is not ok", async () => {
    mockQueryRaw.mockRejectedValue(new Error("failure"));
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: mockRedisPing.mockResolvedValue("PONG"),
    });

    const response = await GET();
    expect(response.status).toBe(503);
  });

  it("should return the raw health check response body", async () => {
    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: mockRedisPing.mockResolvedValue("PONG"),
    });

    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("checks");
  });
});
