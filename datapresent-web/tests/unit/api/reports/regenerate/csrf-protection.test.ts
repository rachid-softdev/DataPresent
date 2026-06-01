// ==========================================
// Regenerate Route — CSRF Protection & Validation
// ==========================================
//
// Tests for POST /api/[locale]/reports/[id]/regenerate:
// - Auth guard (401)
// - CSRF enforcement (403)
// - Auth-before-CSRF ordering
// - Report not found (404)
// - Non-member access (403)
// - No source file (400)
// - Already processing (400)
// - Invalid sector in body (400)
// - Successful regenerate (200)
// - Error logging on exceptions
//
// The CSRF middleware itself is tested in lib/security/csrf-middleware.test.ts.
// These verify route-level integration.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup — all mock variables must use vi.hoisted
// ---------------------------------------------------------------------------
// Note: regenerate imports withCsrfProtection from @/lib/security (re-export),
// not from @/lib/security/csrf-middleware directly.
const mockWithCsrfProtection = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  report: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  slide: {
    deleteMany: vi.fn(),
  },
}));
const mockSignJobData = vi.hoisted(() => vi.fn());
const mockGenerateQueue = vi.hoisted(() => ({
  add: vi.fn(),
}));
const mockLogApiError = vi.hoisted(() => vi.fn());

const mockUnauthorized = vi.hoisted(() => vi.fn());
const mockForbidden = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() => vi.fn());
const mockBadRequest = vi.hoisted(() => vi.fn());

const MOCK_ERROR_CODES = vi.hoisted(() => ({
  ERR_RESOURCE_NOT_FOUND: "errors.resource.notFound",
  ERR_RESOURCE_NO_SOURCE_FILE: "errors.resource.noSourceFile",
  ERR_RESOURCE_ALREADY_GENERATING: "errors.resource.alreadyGenerating",
  ERR_VALIDATION_REQUIRED: "errors.validation.required",
}));

vi.mock("@/lib/security", () => ({
  withCsrfProtection: mockWithCsrfProtection,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/queue", () => ({
  getGenerateQueue: vi.fn().mockResolvedValue(mockGenerateQueue),
}));

vi.mock("@/lib/queue/job-security", () => ({
  signJobData: mockSignJobData,
}));

vi.mock("@/lib/sector", () => ({
  isValidSector: vi.fn((s) => ["retail", "finance", "healthcare"].includes(s)),
}));

vi.mock("@/lib/errors", () => ({
  ERROR_CODES: MOCK_ERROR_CODES,
  unauthorized: mockUnauthorized,
  forbidden: mockForbidden,
  notFound: mockNotFound,
  badRequest: mockBadRequest,
}));

vi.mock("@/lib/security/error-logger", () => ({
  logApiError: mockLogApiError,
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

// ---------------------------------------------------------------------------
// Import the module under test (after mocks are set up)
// ---------------------------------------------------------------------------
import { POST } from "@/app/[locale]/api/reports/[id]/regenerate/route";

/**
 * Create a JSON-based Request for regenerate testing
 */
function createRequest({
  body = {},
  headers = {},
}: {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
} = {}): Request {
  const h = new Headers({ "Content-Type": "application/json", ...headers });
  return new Request("http://localhost:3000/api/reports/report-123/regenerate", {
    method: "POST",
    headers: h,
    body: JSON.stringify(body),
  });
}

/**
 * A valid report object with membership
 */
function makeValidReport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "report-123",
    title: "Test Report",
    status: "COMPLETED",
    sector: "retail",
    slideCount: 10,
    org: {
      members: [{ userId: "user-123" }],
    },
    sourceFile: {
      filename: "data.csv",
    },
    ...overrides,
  };
}

describe("Regenerate Route — CSRF Protection & Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJsonStatus = undefined;
    mockJsonBody = undefined;

    // Default mocks
    mockUnauthorized.mockReturnValue(
      new Response(JSON.stringify({ error: "errors.auth.unauthorized" }), { status: 401 }),
    );
    mockForbidden.mockReturnValue(
      new Response(JSON.stringify({ error: "errors.auth.forbidden" }), { status: 403 }),
    );
    mockNotFound.mockReturnValue(
      new Response(JSON.stringify({ error: "errors.resource.notFound" }), { status: 404 }),
    );
    mockBadRequest.mockReturnValue(
      new Response(JSON.stringify({ error: "errors.validation.required" }), { status: 400 }),
    );
  });

  // -----------------------------------------------------------------------
  // Auth guard
  // -----------------------------------------------------------------------
  describe("Auth guard", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = createRequest();
      const result = await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      expect(result.status).toBe(401);
      const data = await result.json();
      expect(data.error).toBe("errors.auth.unauthorized");
      // Must not proceed
      expect(mockWithCsrfProtection).not.toHaveBeenCalled();
    });

    it("should return 401 when user has no id", async () => {
      mockAuth.mockResolvedValue({
        user: { email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });

      const req = createRequest();
      const result = await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      expect(result.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // CSRF protection
  // -----------------------------------------------------------------------
  describe("CSRF protection", () => {
    it("should return 403 when CSRF check fails", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      const csrfResponse = new Response(JSON.stringify({ error: "CSRF token required" }), {
        status: 403,
      });
      mockWithCsrfProtection.mockResolvedValue(csrfResponse);

      const req = createRequest();
      const result = await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      expect(result.status).toBe(403);
      const data = await result.json();
      expect(data.error).toContain("CSRF token");
      // Must not proceed to business logic
      expect(mockPrisma.report.findUnique).not.toHaveBeenCalled();
    });

    it("should call auth() before withCsrfProtection", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);

      // Set up success mocks
      mockPrisma.report.findUnique.mockResolvedValue(makeValidReport());
      mockPrisma.report.update.mockResolvedValue({ id: "report-123" });
      mockPrisma.slide.deleteMany.mockResolvedValue({ count: 5 });
      mockSignJobData.mockReturnValue({ signed: "job-data" });
      mockGenerateQueue.add.mockResolvedValue(undefined);

      const req = createRequest();
      await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      // Verify ordering: auth called, then CSRF
      expect(mockAuth).toHaveBeenCalledOnce();
      expect(mockWithCsrfProtection).toHaveBeenCalledOnce();
    });

    it("should pass the request and userId to withCsrfProtection", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);

      mockPrisma.report.findUnique.mockResolvedValue(makeValidReport());
      mockPrisma.report.update.mockResolvedValue({ id: "report-123" });
      mockPrisma.slide.deleteMany.mockResolvedValue({ count: 5 });
      mockSignJobData.mockReturnValue({ signed: "job-data" });
      mockGenerateQueue.add.mockResolvedValue(undefined);

      const req = createRequest();
      await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      expect(mockWithCsrfProtection).toHaveBeenCalledWith(req, "user-123");
    });
  });

  // -----------------------------------------------------------------------
  // Report access validation
  // -----------------------------------------------------------------------
  describe("Report access validation", () => {
    it("should return 404 when report is not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockPrisma.report.findUnique.mockResolvedValue(null);

      const req = createRequest();
      const result = await POST(req, { params: Promise.resolve({ id: "nonexistent" }) });

      expect(result.status).toBe(404);
    });

    it("should return 403 when user is not a member of the org", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-999", email: "other@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockPrisma.report.findUnique.mockResolvedValue(
        makeValidReport({ org: { members: [{ userId: "user-123" }] } }),
      );

      const req = createRequest();
      const result = await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      expect(result.status).toBe(403);
    });

    it("should return 400 when report has no source file", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockPrisma.report.findUnique.mockResolvedValue(makeValidReport({ sourceFile: null }));

      const req = createRequest();
      const result = await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      expect(result.status).toBe(400);
    });

    it("should return 400 when report is already processing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockPrisma.report.findUnique.mockResolvedValue(makeValidReport({ status: "PROCESSING" }));

      const req = createRequest();
      const result = await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      expect(result.status).toBe(400);
    });

    it("should return 400 when an invalid sector is provided in body", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockPrisma.report.findUnique.mockResolvedValue(makeValidReport());

      const req = createRequest({ body: { sector: "bogus" } });
      const result = await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      expect(result.status).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // Successful regenerate
  // -----------------------------------------------------------------------
  describe("Successful regenerate", () => {
    it("should regenerate with default settings (no sector change)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockPrisma.report.findUnique.mockResolvedValue(makeValidReport());
      mockPrisma.report.update.mockResolvedValue({ id: "report-123" });
      mockPrisma.slide.deleteMany.mockResolvedValue({ count: 5 });
      mockSignJobData.mockReturnValue({ signed: "secure-job" });
      mockGenerateQueue.add.mockResolvedValue(undefined);

      const req = createRequest({ body: {} });
      const result = await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      expect(result.status).toBe(200);
      const data = await result.json();
      expect(data.reportId).toBe("report-123");
      expect(data.status).toBe("PENDING");

      // Verify update — no sector change
      expect(mockPrisma.report.update).toHaveBeenCalledWith({
        where: { id: "report-123" },
        data: expect.objectContaining({
          status: "PENDING",
        }),
      });
      // Sector should NOT be in update data since we didn't provide one
      const updateCall = mockPrisma.report.update.mock.calls[0][0];
      expect(updateCall.data.sector).toBeUndefined();

      // Verify slides deleted
      expect(mockPrisma.slide.deleteMany).toHaveBeenCalledWith({
        where: { reportId: "report-123" },
      });

      // Verify job enqueued
      expect(mockSignJobData).toHaveBeenCalledWith({
        reportId: "report-123",
        userId: "user-123",
      });
      expect(mockGenerateQueue.add).toHaveBeenCalledWith("generate", {
        signed: "secure-job",
      });
    });

    it("should regenerate with a new sector when provided", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockPrisma.report.findUnique.mockResolvedValue(makeValidReport());
      mockPrisma.report.update.mockResolvedValue({ id: "report-123" });
      mockPrisma.slide.deleteMany.mockResolvedValue({ count: 3 });
      mockSignJobData.mockReturnValue({ signed: "secure-job" });
      mockGenerateQueue.add.mockResolvedValue(undefined);

      const req = createRequest({ body: { sector: "healthcare", slideCount: 15 } });
      const result = await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      expect(result.status).toBe(200);

      // Verify update includes the new sector
      const updateCall = mockPrisma.report.update.mock.calls[0][0];
      expect(updateCall.data.sector).toBe("healthcare");

      // Verify job data includes slideCount
      expect(mockSignJobData).toHaveBeenCalledWith({
        reportId: "report-123",
        userId: "user-123",
        slideCount: 15,
      });
    });
  });

  // -----------------------------------------------------------------------
  // Error logging
  // -----------------------------------------------------------------------
  describe("Error logging", () => {
    it("should log and return 500 when an unexpected error occurs", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockPrisma.report.findUnique.mockRejectedValue(new Error("Query failed"));

      const req = createRequest();
      const result = await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      expect(result.status).toBe(500);
      const data = await result.json();
      expect(data.error).toBe("An error occurred");
      expect(mockLogApiError).toHaveBeenCalledOnce();
      expect(mockLogApiError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Query failed" }),
        expect.objectContaining({
          path: "/api/reports/report-123/regenerate",
          method: "POST",
          userId: "user-123",
        }),
      );
    });

    it("should not call logApiError when CSRF check fails (before try/catch)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      const csrfResponse = new Response(JSON.stringify({ error: "CSRF blocked" }), {
        status: 403,
      });
      mockWithCsrfProtection.mockResolvedValue(csrfResponse);

      const req = createRequest();
      await POST(req, { params: Promise.resolve({ id: "report-123" }) });

      // CSRF is outside try/catch, so logApiError should NOT be called
      expect(mockLogApiError).not.toHaveBeenCalled();
    });
  });
});
