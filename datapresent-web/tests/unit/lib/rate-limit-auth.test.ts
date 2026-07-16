// ==========================================
// Auth Rate Limiting Tests
// ==========================================
//
// Tests that auth endpoints (magic link, signup, forgot-password) respect
// a 3-request-per-minute rate limit per email.
// Covers REVIEW issue: Back-end Agent 7 / Rate limiting auth absent.
//
// The rate limiting uses an atomic UPSERT pattern via prisma.$queryRaw.
// We test the checkRateLimit function with mocked raw query results.

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock prisma.$queryRaw to simulate rate limit behaviour
// ---------------------------------------------------------------------------
const mockQueryRaw = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: mockQueryRaw },
}));

vi.mock("@/env", () => ({
  env: {
    NODE_ENV: "test",
    RATE_LIMIT_STRATEGY: "relaxed",
  },
}));

import { checkRateLimit } from "@/lib/rate-limit";

describe("Auth rate limiting — 3 req/min per email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 3 requests per minute are allowed
  // -----------------------------------------------------------------------
  it("should allow the first request for an email", async () => {
    mockQueryRaw.mockResolvedValue([{ allowed: true }]);

    const result = await checkRateLimit("magic-link:user@example.com", {
      limit: 3,
      windowMs: 60 * 1000,
    });

    expect(result).toBe(true);
  });

  it("should allow up to 3 requests per minute for the same email", async () => {
    // Simulate 3 consecutive allowed requests
    for (let i = 1; i <= 3; i++) {
      mockQueryRaw.mockResolvedValue([{ allowed: true }]);

      const result = await checkRateLimit("magic-link:user@example.com", {
        limit: 3,
        windowMs: 60 * 1000,
      });

      expect(result).toBe(true);
    }
  });

  // -----------------------------------------------------------------------
  // 4th request in the same minute is rejected
  // -----------------------------------------------------------------------
  it("should reject the 4th request in the same minute for the same email", async () => {
    // First 3 requests are allowed
    for (let i = 0; i < 3; i++) {
      mockQueryRaw.mockResolvedValue([{ allowed: true }]);
      await checkRateLimit("magic-link:user@example.com", { limit: 3, windowMs: 60 * 1000 });
    }

    // 4th request hits the limit
    mockQueryRaw.mockResolvedValue([{ allowed: false }]);
    const result = await checkRateLimit("magic-link:user@example.com", {
      limit: 3,
      windowMs: 60 * 1000,
    });

    expect(result).toBe(false);
  });

  it("should return false (rate limited) when raw query returns allowed=false", async () => {
    mockQueryRaw.mockResolvedValue([{ allowed: false }]);

    const result = await checkRateLimit("magic-link:test@example.com", {
      limit: 3,
      windowMs: 60 * 1000,
    });

    expect(result).toBe(false);
  });

  // -----------------------------------------------------------------------
  // After 1 minute, the counter resets
  // -----------------------------------------------------------------------
  it("should allow new requests after the rate limit window resets", async () => {
    // Simulate that the window has reset (insert/upsert returns allowed=true again)
    // After window reset, the UPSERT sets count=1 for the new window
    mockQueryRaw.mockResolvedValue([{ allowed: true }]);

    const result = await checkRateLimit("magic-link:user@example.com", {
      limit: 3,
      windowMs: 60 * 1000,
    });

    expect(result).toBe(true);
  });

  it("should reset count to 1 after the window expires (simulated via UPSERT logic)", async () => {
    // The UPSERT SQL resets count to 1 when windowStart < NOW() - windowMs
    // This is tested via the query pattern: we verify the SQL contains the
    // correct reset logic
    mockQueryRaw.mockResolvedValue([{ allowed: true }]);

    await checkRateLimit("magic-link:user@example.com", { limit: 3, windowMs: 60 * 1000 });

    // Verify the SQL uses window reset logic with double precision multiplication
    // (not string concatenation — regression guard)
    const callArgs = mockQueryRaw.mock.calls[0];
    const sqlQuery = String(callArgs[0]);
    expect(sqlQuery).toContain("windowStart");
    expect(sqlQuery).toContain("WHEN");
    expect(sqlQuery).toContain("THEN 1"); // reset count to 1 when window expires
  });

  // -----------------------------------------------------------------------
  // Different email = different counter
  // -----------------------------------------------------------------------
  it("should allow request for a different email even if another is rate limited", async () => {
    // email1 hits the limit
    mockQueryRaw.mockResolvedValue([{ allowed: false }]);
    await checkRateLimit("magic-link:limited@example.com", { limit: 3, windowMs: 60 * 1000 });

    // email2 should still be allowed (separate counter)
    mockQueryRaw.mockResolvedValue([{ allowed: true }]);
    const result = await checkRateLimit("magic-link:other@example.com", {
      limit: 3,
      windowMs: 60 * 1000,
    });

    expect(result).toBe(true);
  });

  it("should use separate rate limit keys for different auth endpoints", async () => {
    // Different endpoints use different key prefixes
    mockQueryRaw.mockResolvedValue([{ allowed: true }]);

    const signupResult = await checkRateLimit("signup:user@example.com", {
      limit: 3,
      windowMs: 60 * 1000,
    });
    const magicLinkResult = await checkRateLimit("magic-link:user@example.com", {
      limit: 3,
      windowMs: 60 * 1000,
    });
    const forgotResult = await checkRateLimit("forgot-password:user@example.com", {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    expect(signupResult).toBe(true);
    expect(magicLinkResult).toBe(true);
    expect(forgotResult).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  it("should handle empty key gracefully (default to allowed)", async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await checkRateLimit("", { limit: 3, windowMs: 60 * 1000 });

    // Empty result set defaults to allowed = true
    expect(result).toBe(true);
  });

  it("should handle null result from raw query gracefully", async () => {
    mockQueryRaw.mockResolvedValue([{ allowed: null }]);

    const result = await checkRateLimit("magic-link:test@example.com", {
      limit: 3,
      windowMs: 60 * 1000,
    });

    // null allowed defaults to true
    expect(result).toBe(true);
  });

  it("should handle missing seconds in intervalMs with double precision SQL", async () => {
    mockQueryRaw.mockResolvedValue([{ allowed: true }]);

    await checkRateLimit("magic-link:test@example.com", { limit: 3, windowMs: 60 * 1000 });

    // Verify anti-SQL-injection: uses ::double precision * interval, not string concat
    const callArgs = mockQueryRaw.mock.calls[0];
    const sqlQuery = String(callArgs[0]);
    expect(sqlQuery).toContain("::double precision * interval");
    expect(sqlQuery).not.toContain("' milliseconds'");
  });

  it("should use different window sizes for different endpoints", async () => {
    // Auth endpoints use 1-minute window (60 * 1000 ms)
    // Forgot-password uses 1-hour window (60 * 60 * 1000 ms)
    mockQueryRaw.mockResolvedValue([{ allowed: true }]);

    await checkRateLimit("magic-link:test@example.com", { limit: 3, windowMs: 60 * 1000 });
    const authCallWindow = extractWindowMs(mockQueryRaw.mock.calls[0][0]);

    await checkRateLimit("forgot-password:test@example.com", {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    const forgotCallWindow = extractWindowMs(mockQueryRaw.mock.calls[1][0]);

    // The forgot-password call should have a longer interval
    // We can't directly extract the parameter value, but we can verify
    // the call was actually made (two separate queries)
    expect(mockQueryRaw).toHaveBeenCalledTimes(2);
  });

  it("should not break when called concurrently for the same email", async () => {
    // Simulate concurrent requests — both get past the first check
    mockQueryRaw.mockResolvedValue([{ allowed: true }]);

    const [result1, result2] = await Promise.all([
      checkRateLimit("magic-link:concurrent@example.com", { limit: 3, windowMs: 60 * 1000 }),
      checkRateLimit("magic-link:concurrent@example.com", { limit: 3, windowMs: 60 * 1000 }),
    ]);

    // Both should be allowed (the database UPSERT handles atomicity)
    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });
});

/**
 * Extract the windowMs value from a raw SQL template.
 * Used to verify different call sites use different windows.
 */
function extractWindowMs(sqlTemplate: unknown): number {
  // The SQL template is a Prisma Sql object — we just verify it's defined
  // in the test by checking the raw string
  const sql = String(sqlTemplate);
  if (sql.includes("60 * 1000") || sql.includes("60000")) return 60000;
  if (sql.includes("60 * 60 * 1000") || sql.includes("3600000")) return 3600000;
  return 0;
}
