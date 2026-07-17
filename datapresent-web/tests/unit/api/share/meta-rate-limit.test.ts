// ==========================================
// Share Meta Rate Limiting Test (Fix #8)
// ==========================================
//
// Tests that the /api/share/meta route enforces rate limiting:
// - 20 requests per minute per IP
// - Rate limit key includes IP from x-forwarded-for or x-real-ip
// - Returns 429 when rate limited
// - CheckRateLimit is called with correct identifier

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — all mock variables must use vi.hoisted
// ---------------------------------------------------------------------------
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  report: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/errors", () => ({
  notFound: vi.fn(
    () => new Response(JSON.stringify({ error: "errors.resource.notFound" }), { status: 404 }),
  ),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

import { NextRequest } from "next/server";
// ---------------------------------------------------------------------------
// Import the module under test
// ---------------------------------------------------------------------------
import { GET } from "@/app/[locale]/api/share/meta/route";

describe("Share Meta Rate Limiting (Fix #8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Create a mock NextRequest for share/meta testing
   */
  function createMockRequest({
    token = "valid-token",
    forwardedFor,
    realIp,
  }: {
    token?: string;
    forwardedFor?: string;
    realIp?: string;
  } = {}): NextRequest {
    const headers = new Headers();
    if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
    if (realIp) headers.set("x-real-ip", realIp);
    return {
      url: `http://localhost:3000/api/share/meta?token=${token}`,
      headers,
    } as unknown as NextRequest;
  }

  it("should call checkRateLimit with the correct rate limit key (x-forwarded-for)", async () => {
    // Arrange
    mockCheckRateLimit.mockResolvedValue(true);
    mockPrisma.report.findUnique.mockResolvedValue({
      id: "report-1",
      title: "Test Report",
      sector: "FINANCE",
      sharePassword: null,
      shareExpiresAt: null,
    });

    const req = createMockRequest({ forwardedFor: "203.0.113.42, 10.0.0.1" });

    // Act
    await GET(req);

    // Assert
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "share-meta:203.0.113.42",
      expect.objectContaining({ limit: 20 }),
    );
  });

  it("should call checkRateLimit with x-real-ip when x-forwarded-for is not available", async () => {
    // Arrange
    mockCheckRateLimit.mockResolvedValue(true);
    mockPrisma.report.findUnique.mockResolvedValue({
      id: "report-1",
      title: "Test Report",
      sector: "FINANCE",
      sharePassword: null,
      shareExpiresAt: null,
    });

    const req = createMockRequest({ realIp: "198.51.100.7" });

    // Act
    await GET(req);

    // Assert
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "share-meta:198.51.100.7",
      expect.objectContaining({ limit: 20 }),
    );
  });

  it('should use "unknown" when no IP headers are present', async () => {
    // Arrange
    mockCheckRateLimit.mockResolvedValue(true);
    mockPrisma.report.findUnique.mockResolvedValue({
      id: "report-1",
      title: "Test Report",
      sector: "FINANCE",
      sharePassword: null,
      shareExpiresAt: null,
    });

    const req = createMockRequest(); // no IP headers

    // Act
    await GET(req);

    // Assert
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "share-meta:unknown",
      expect.objectContaining({ limit: 20 }),
    );
  });

  it("should return 429 when rate limited", async () => {
    // Arrange
    mockCheckRateLimit.mockResolvedValue(false);

    const req = createMockRequest({ forwardedFor: "10.0.0.1" });

    // Act
    const response = await GET(req);

    // Assert
    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toBe("Too many requests");
  });

  it("should pass through to the handler when rate limit allows", async () => {
    // Arrange
    mockCheckRateLimit.mockResolvedValue(true);
    mockPrisma.report.findUnique.mockResolvedValue({
      id: "report-1",
      title: "Test Report",
      sector: "FINANCE",
      sharePassword: null,
      shareExpiresAt: null,
    });

    const req = createMockRequest({ forwardedFor: "10.0.0.1" });

    // Act
    const response = await GET(req);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.title).toBe("Test Report");
    expect(data.hasPassword).toBe(false);
  });

  it("should return 400 when token is missing", async () => {
    // Arrange - create request without token
    const req = {
      url: "http://localhost:3000/api/share/meta",
      headers: new Headers(),
    } as unknown as NextRequest;

    // Act
    const response = await GET(req);

    // Assert
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Token is required");
  });

  it("should use 1-minute window for rate limiting", async () => {
    // Arrange
    mockCheckRateLimit.mockResolvedValue(true);
    mockPrisma.report.findUnique.mockResolvedValue({
      id: "report-1",
      title: "Test Report",
      sector: "FINANCE",
      sharePassword: null,
      shareExpiresAt: null,
    });

    const req = createMockRequest({ forwardedFor: "10.0.0.1" });

    // Act
    await GET(req);

    // Assert: windowMs should be 60 seconds (60000 ms)
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        windowMs: 60 * 1000, // 1 minute
      }),
    );
  });
});
