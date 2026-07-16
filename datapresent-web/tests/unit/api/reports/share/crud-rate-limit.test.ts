// ==========================================
// Share CRUD Route — Rate Limiting Tests
// ==========================================
//
// Tests for POST / PATCH /api/[locale]/reports/[id]/share:
// - Rate limit enforcement (429) on POST
// - Rate limit enforcement (429) on PATCH
// - Rate limit key includes user+IP
// - Different users have independent rate limits
// - Rate limit passes when under limit

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup — all mock variables must use vi.hoisted
// ---------------------------------------------------------------------------
const mockAuth = vi.hoisted(() => vi.fn());
const mockWithCsrfProtection = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockExtractClientIP = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockUnauthorized = vi.hoisted(() => vi.fn());
const mockForbidden = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  report: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  comment: {
    count: vi.fn(),
  },
}));

// Mock Share validation schemas to accept valid input
const mockShareCreateParse = vi.hoisted(() => vi.fn());
const mockShareUpdateParse = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/security", () => ({
  withCsrfProtection: mockWithCsrfProtection,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/client-ip", () => ({
  extractClientIP: mockExtractClientIP,
}));

vi.mock("@/lib/password", () => ({
  hashPassword: mockHashPassword,
}));

vi.mock("@/lib/errors", () => ({
  unauthorized: mockUnauthorized,
  forbidden: mockForbidden,
  notFound: mockNotFound,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/validation-schemas", () => ({
  ShareCreateSchema: {
    safeParse: mockShareCreateParse,
  },
  ShareUpdateSchema: {
    safeParse: mockShareUpdateParse,
  },
}));

// State holders for NextResponse.json
let mockJsonStatus: number | undefined;
let mockJsonBody: unknown;

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      mockJsonBody = body;
      mockJsonStatus = (init as { status?: number })?.status ?? 200;
      return {
        status: mockJsonStatus,
        body,
        json: async () => body,
      };
    }),
  },
  NextRequest: vi.fn(),
}));

// Mock @/env
vi.mock("@/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
  },
}));

// ---------------------------------------------------------------------------
// Import the module under test (after mocks are set up)
// ---------------------------------------------------------------------------
import { PATCH, POST } from "@/app/[locale]/api/reports/[id]/share/route";

/**
 * Create a mock params object for the share route
 */
function createMockParams(id: string = "report-123"): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/**
 * Create a mock NextRequest for share testing
 */
function createShareRequest({
  method = "POST",
  body = {},
  headers = {},
}: {
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
} = {}): Request {
  const h = new Headers({ "Content-Type": "application/json", ...headers });
  return new Request(`http://localhost:3000/api/reports/report-123/share`, {
    method,
    headers: h,
    body: JSON.stringify(body),
  });
}

describe("Share CRUD Route — Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJsonStatus = undefined;
    mockJsonBody = undefined;

    // Default success mocks for auth and CSRF
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
      expires: new Date(Date.now() + 86400).toISOString(),
    });
    mockWithCsrfProtection.mockResolvedValue(null);
    mockExtractClientIP.mockReturnValue("203.0.113.42");

    // Default unauthorized/forbidden/notFound helpers
    mockUnauthorized.mockReturnValue(
      new Response(JSON.stringify({ error: "errors.auth.unauthorized" }), { status: 401 }),
    );
    mockForbidden.mockReturnValue(
      new Response(JSON.stringify({ error: "errors.resource.forbidden" }), { status: 403 }),
    );
    mockNotFound.mockReturnValue(
      new Response(JSON.stringify({ error: "errors.resource.notFound" }), { status: 404 }),
    );

    // Default: report exists with user as member
    mockPrisma.report.findUnique.mockResolvedValue({
      id: "report-123",
      shareToken: null,
      isPublic: false,
      title: "Test Report",
      allowComments: true,
      allowEmbed: false,
      shareExpiresAt: null,
      sharePassword: null,
      org: {
        members: [{ userId: "user-123" }],
      },
    });

    // Default: validation passes
    mockShareCreateParse.mockReturnValue({
      success: true,
      data: { isPublic: true },
    });
    mockShareUpdateParse.mockReturnValue({
      success: true,
      data: { allowComments: true, allowEmbed: false },
    });

    // Default: prisma.report.update succeeds
    mockPrisma.report.update.mockResolvedValue({
      shareToken: "new-token",
      isPublic: true,
      allowComments: true,
      allowEmbed: false,
      shareExpiresAt: null,
      sharePassword: null,
    });
  });

  // -----------------------------------------------------------------------
  // POST rate limiting
  // -----------------------------------------------------------------------
  describe("POST rate limiting", () => {
    it("should allow POST when rate limit is under threshold", async () => {
      mockCheckRateLimit.mockResolvedValue(true);

      const req = createShareRequest({ method: "POST", body: { isPublic: true } });
      const result = await POST(req, createMockParams());

      expect(result.status).toBe(200);
    });

    it("should return 429 on POST when rate limit exceeded", async () => {
      mockCheckRateLimit.mockResolvedValue(false);

      const req = createShareRequest({ method: "POST", body: { isPublic: true } });
      const result = await POST(req, createMockParams());

      expect(result.status).toBe(429);
      const data = await result.json();
      expect(data.error).toBe("Too many requests");
    });

    it("should call checkRateLimit with correct rate limit key for POST", async () => {
      mockCheckRateLimit.mockResolvedValue(true);

      const req = createShareRequest({ method: "POST", body: { isPublic: true } });
      await POST(req, createMockParams());

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "share-crud:user-123",
        expect.objectContaining({ limit: 20, windowMs: 60000 }),
      );
    });

    it("should use user ID as rate limit key (no IP in key)", async () => {
      mockCheckRateLimit.mockResolvedValue(true);
      mockExtractClientIP.mockReturnValue("198.51.100.7");

      const req = createShareRequest({ method: "POST", body: { isPublic: true } });
      await POST(req, createMockParams());

      expect(mockCheckRateLimit).toHaveBeenCalledWith("share-crud:user-123", expect.any(Object));
    });
  });

  // -----------------------------------------------------------------------
  // PATCH rate limiting
  // -----------------------------------------------------------------------
  describe("PATCH rate limiting", () => {
    it("should allow PATCH when rate limit is under threshold", async () => {
      mockCheckRateLimit.mockResolvedValue(true);

      const req = createShareRequest({ method: "PATCH", body: { allowComments: false } });
      const result = await PATCH(req, createMockParams());

      expect(result.status).toBe(200);
    });

    it("should return 429 on PATCH when rate limit exceeded", async () => {
      mockCheckRateLimit.mockResolvedValue(false);

      const req = createShareRequest({ method: "PATCH", body: { allowComments: false } });
      const result = await PATCH(req, createMockParams());

      expect(result.status).toBe(429);
      const data = await result.json();
      expect(data.error).toBe("Too many requests");
    });

    it("should call checkRateLimit with correct rate limit key for PATCH", async () => {
      mockCheckRateLimit.mockResolvedValue(true);

      const req = createShareRequest({ method: "PATCH", body: { allowComments: false } });
      await PATCH(req, createMockParams());

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "share-crud:user-123",
        expect.objectContaining({ limit: 20, windowMs: 60000 }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Different users have independent rate limits
  // -----------------------------------------------------------------------
  describe("Per-user rate limit independence", () => {
    it("should use different rate limit keys for different users on POST", async () => {
      mockCheckRateLimit.mockResolvedValue(true);

      // Simulate user-123
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "a@test.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      const req1 = createShareRequest({ method: "POST", body: { isPublic: true } });
      await POST(req1, createMockParams());

      // Simulate user-456
      mockAuth.mockResolvedValue({
        user: { id: "user-456", email: "b@test.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      // Also need to update the prisma mock for the different user
      mockPrisma.report.findUnique.mockResolvedValue({
        id: "report-123",
        shareToken: null,
        isPublic: false,
        title: "Test Report",
        allowComments: true,
        allowEmbed: false,
        shareExpiresAt: null,
        sharePassword: null,
        org: {
          members: [{ userId: "user-456" }],
        },
      });
      const req2 = createShareRequest({ method: "POST", body: { isPublic: true } });
      await POST(req2, createMockParams());

      // Verify two different rate limit keys were used
      const keys = mockCheckRateLimit.mock.calls.map((c) => c[0]);
      expect(keys).toContain("share-crud:user-123");
      expect(keys).toContain("share-crud:user-456");
    });

    it("should use different rate limit keys for different users on PATCH", async () => {
      mockCheckRateLimit.mockResolvedValue(true);

      // Simulate user-123
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "a@test.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockPrisma.report.findUnique.mockResolvedValue({
        id: "report-123",
        shareToken: "tok-1",
        isPublic: true,
        title: "Test Report",
        allowComments: true,
        allowEmbed: false,
        shareExpiresAt: null,
        sharePassword: null,
        org: {
          members: [{ userId: "user-123" }],
        },
      });
      const req1 = createShareRequest({ method: "PATCH", body: { allowComments: false } });
      await PATCH(req1, createMockParams());

      // Simulate user-456
      mockAuth.mockResolvedValue({
        user: { id: "user-456", email: "b@test.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockPrisma.report.findUnique.mockResolvedValue({
        id: "report-123",
        shareToken: "tok-1",
        isPublic: true,
        title: "Test Report",
        allowComments: true,
        allowEmbed: false,
        shareExpiresAt: null,
        sharePassword: null,
        org: {
          members: [{ userId: "user-456" }],
        },
      });
      const req2 = createShareRequest({ method: "PATCH", body: { allowComments: false } });
      await PATCH(req2, createMockParams());

      const keys = mockCheckRateLimit.mock.calls.map((c) => c[0]);
      expect(keys).toContain("share-crud:user-123");
      expect(keys).toContain("share-crud:user-456");
    });
  });

  // -----------------------------------------------------------------------
  // Rate limiting does not interfere with other checks
  // -----------------------------------------------------------------------
  describe("Rate limit ordering", () => {
    it("should check auth before rate limiting on POST", async () => {
      mockAuth.mockResolvedValue(null); // Not authenticated

      const req = createShareRequest({ method: "POST", body: { isPublic: true } });
      await POST(req, createMockParams());

      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it("should check CSRF before rate limiting on POST", async () => {
      const csrfResponse = new Response(JSON.stringify({ error: "CSRF required" }), {
        status: 403,
      });
      mockWithCsrfProtection.mockResolvedValue(csrfResponse);

      const req = createShareRequest({ method: "POST", body: { isPublic: true } });
      await POST(req, createMockParams());

      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it("should check auth before rate limiting on PATCH", async () => {
      mockAuth.mockResolvedValue(null); // Not authenticated

      const req = createShareRequest({ method: "PATCH", body: { allowComments: false } });
      await PATCH(req, createMockParams());

      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it("should check CSRF before rate limiting on PATCH", async () => {
      const csrfResponse = new Response(JSON.stringify({ error: "CSRF required" }), {
        status: 403,
      });
      mockWithCsrfProtection.mockResolvedValue(csrfResponse);

      const req = createShareRequest({ method: "PATCH", body: { allowComments: false } });
      await PATCH(req, createMockParams());

      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });
  });
});
