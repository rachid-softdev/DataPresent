// @vitest-environment node
// ==========================================
// Debug Entitlements — Rate Limit Tests
// ==========================================
//
// Tests rate limiting on GET /api/debug/entitlements:
// - Allows requests within 10 req/hour limit
// - Rejects requests exceeding the limit
// - Uses per-admin rate limit key (userId + IP)

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup — all mock variables must use vi.hoisted
// ---------------------------------------------------------------------------
const mockAuth = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockGetDebugTrace = vi.hoisted(() => vi.fn());
const mockPrismaFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/entitlements", () => ({
  getDebugTrace: mockGetDebugTrace,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockPrismaFindUnique,
    },
  },
}));

// Mock NextResponse
let lastStatus: number | undefined;
let lastBody: unknown;

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      lastBody = body;
      lastStatus = (init as { status?: number })?.status ?? 200;
      return { status: lastStatus, body };
    }),
  },
  NextRequest: vi.fn(),
}));

import { GET } from "@/app/api/debug/entitlements/route";

function createRequest(ip?: string): Request {
  const headers = new Headers();
  if (ip) headers.set("x-forwarded-for", ip);
  return new Request(
    "http://localhost:3000/api/debug/entitlements?orgId=org-1&feature=some-feature",
    {
      method: "GET",
      headers,
    },
  );
}

describe("Debug Entitlements — Rate Limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus = undefined;
    lastBody = undefined;

    // Default: user is authenticated as admin
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
    });

    // Default: user is an admin
    mockPrismaFindUnique.mockResolvedValue({ role: "ADMIN" });

    // Default: rate limit allows
    mockCheckRateLimit.mockResolvedValue(true);

    // Default: trace returns data
    mockGetDebugTrace.mockResolvedValue({ orgId: "org-1", feature: "some-feature", trace: [] });
  });

  // -----------------------------------------------------------------------
  // Within limit
  // -----------------------------------------------------------------------
  it("should allow requests within limit", async () => {
    mockCheckRateLimit.mockResolvedValue(true);

    await GET(createRequest("1.2.3.4"));

    expect(lastStatus).toBe(200);
    expect(mockGetDebugTrace).toHaveBeenCalled();
  });

  it("should use the correct rate limit key with user ID and IP", async () => {
    await GET(createRequest("5.6.7.8"));

    expect(mockCheckRateLimit).toHaveBeenCalledWith("debug-entitlements:admin-1:5.6.7.8", {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
  });

  it('should use "unknown" for IP if x-forwarded-for is not set', async () => {
    await GET(createRequest());

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "debug-entitlements:admin-1:unknown",
      expect.any(Object),
    );
  });

  it("should use first IP from x-forwarded-for chain", async () => {
    const headers = new Headers();
    headers.set("x-forwarded-for", "192.168.1.1, 10.0.0.1, proxy");

    const req = new Request(
      "http://localhost:3000/api/debug/entitlements?orgId=org-1&feature=some-feature",
      { method: "GET", headers },
    );

    await GET(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "debug-entitlements:admin-1:192.168.1.1",
      expect.any(Object),
    );
  });

  // -----------------------------------------------------------------------
  // Exceeding limit
  // -----------------------------------------------------------------------
  it("should reject requests exceeding limit", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    await GET(createRequest("1.2.3.4"));

    expect(lastStatus).toBe(429);
    expect(lastBody).toEqual({ error: "Too many requests" });
    expect(mockGetDebugTrace).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Per-admin rate limit key (different admins = different keys)
  // -----------------------------------------------------------------------
  it("should use per-admin rate limit key", async () => {
    // First admin
    await GET(createRequest("1.2.3.4"));

    expect(mockCheckRateLimit).toHaveBeenLastCalledWith(
      "debug-entitlements:admin-1:1.2.3.4",
      expect.any(Object),
    );

    // Second admin
    mockAuth.mockResolvedValue({
      user: { id: "admin-2", email: "admin2@example.com" },
    });

    await GET(createRequest("1.2.3.4"));

    expect(mockCheckRateLimit).toHaveBeenLastCalledWith(
      "debug-entitlements:admin-2:1.2.3.4",
      expect.any(Object),
    );
  });

  // -----------------------------------------------------------------------
  // Authentication and authorization still apply
  // -----------------------------------------------------------------------
  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await GET(createRequest("1.2.3.4"));

    expect(lastStatus).toBe(401);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("should return 403 when user is not admin", async () => {
    mockPrismaFindUnique.mockResolvedValue({ role: "MEMBER" });

    await GET(createRequest("1.2.3.4"));

    expect(lastStatus).toBe(403);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});
