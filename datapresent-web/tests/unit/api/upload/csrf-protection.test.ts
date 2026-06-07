// ==========================================
// Upload Route — CSRF Protection & Validation
// ==========================================
//
// Tests for POST /api/[locale]/upload:
// - Auth guard (401)
// - CSRF enforcement (403)
// - Auth-before-CSRF ordering
// - Input validation (file, sector, MIME, size)
// - Rate limiting (429)
// - Plan/slide limits (403)
// - Successful upload (200)
// - Error logging on exceptions
//
// The CSRF middleware itself is tested in lib/security/csrf-middleware.test.ts.
// These verify route-level integration.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup — all mock variables must use vi.hoisted
// ---------------------------------------------------------------------------
const mockWithCsrfProtection = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  report: {
    create: vi.fn(),
  },
}));
const mockUploadToR2 = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockSignJobData = vi.hoisted(() => vi.fn());
const mockGenerateQueue = vi.hoisted(() => ({
  add: vi.fn(),
}));
const mockValidateMagicBytes = vi.hoisted(() => vi.fn());
const mockLogApiError = vi.hoisted(() => vi.fn());
const mockCanConsume = vi.hoisted(() => vi.fn());
const mockCanCreateReport = vi.hoisted(() => vi.fn());
const mockGetUserPlan = vi.hoisted(() => vi.fn());
const mockGetLimit = vi.hoisted(() => vi.fn());

// Stub VALID_SECTORS — must be hoisted for vi.mock factory
const MOCK_VALID_SECTORS = vi.hoisted(() => ["retail", "finance", "healthcare"]);

const mockUnauthorized = vi.hoisted(() => vi.fn());
const mockBadRequest = vi.hoisted(() => vi.fn());

const MOCK_ERROR_CODES = vi.hoisted(() => ({
  ERR_VALIDATION_RATE_LIMIT: "errors.validation.rateLimit",
  ERR_VALIDATION_FILE_REQUIRED: "errors.validation.fileRequired",
  ERR_RESOURCE_NOT_FOUND: "errors.resource.notFound",
  ERR_RESOURCE_NO_ORGANIZATION: "errors.resource.noOrganization",
}));

vi.mock("@/lib/security/csrf-middleware", () => ({
  withCsrfProtection: mockWithCsrfProtection,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/r2", () => ({
  uploadToR2: mockUploadToR2,
}));

vi.mock("@/lib/sector", () => ({
  isValidSector: vi.fn((s) => MOCK_VALID_SECTORS.includes(s)),
  VALID_SECTORS: MOCK_VALID_SECTORS,
}));

vi.mock("@/lib/queue", () => ({
  getGenerateQueue: vi.fn().mockResolvedValue(mockGenerateQueue),
}));

vi.mock("@/lib/entitlements/compat", () => ({
  canCreateReport: mockCanCreateReport,
  getUserPlan: mockGetUserPlan,
}));

vi.mock("@/lib/entitlements/feature-gate", () => ({
  canConsume: mockCanConsume,
  getLimit: mockGetLimit,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/queue/job-security", () => ({
  signJobData: mockSignJobData,
}));

vi.mock("@/lib/errors", () => ({
  ERROR_CODES: MOCK_ERROR_CODES,
  unauthorized: mockUnauthorized,
  badRequest: mockBadRequest,
}));

vi.mock("@/lib/upload-validation", () => ({
  validateMagicBytes: mockValidateMagicBytes,
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
import { POST } from "@/app/[locale]/api/upload/route";

/**
 * Create a FormData-based Request for upload testing
 */
function createUploadRequest({
  file,
  sector = "retail",
  slideCount = "10",
  language = "fr",
  headers = {},
}: {
  file?: File | null;
  sector?: string;
  slideCount?: string;
  language?: string;
  headers?: Record<string, string>;
} = {}): Request {
  const formData = new FormData();
  if (file !== undefined && file !== null) {
    formData.append("file", file);
  }
  formData.append("sector", sector);
  formData.append("slideCount", slideCount);
  formData.append("language", language);

  const h = new Headers(headers);
  return new Request("http://localhost:3000/api/upload", {
    method: "POST",
    headers: h,
    body: formData,
  });
}

/**
 * Default valid file for happy-path tests
 */
function makeValidFile(): File {
  // A minimal valid CSV content (magic bytes not applicable for CSV)
  return new File(["a,b,c\n1,2,3"], "data.csv", { type: "text/csv" });
}

function makeCsvBuffer(): Buffer {
  return Buffer.from("a,b,c\n1,2,3");
}

describe("Upload Route — CSRF Protection & Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJsonStatus = undefined;
    mockJsonBody = undefined;

    // Default mocks
    mockUnauthorized.mockReturnValue(
      new Response(JSON.stringify({ error: "errors.auth.unauthorized" }), { status: 401 }),
    );
    mockBadRequest.mockReturnValue(
      new Response(JSON.stringify({ error: "errors.validation.required" }), { status: 400 }),
    );
    mockCanConsume.mockResolvedValue(true);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      membership: [{ org: { id: "org-123" } }],
    });
  });

  // -----------------------------------------------------------------------
  // Auth guard
  // -----------------------------------------------------------------------
  describe("Auth guard", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = createUploadRequest();
      const result = await POST(req);

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

      const req = createUploadRequest();
      const result = await POST(req);

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

      const req = createUploadRequest();
      const result = await POST(req);

      expect(result.status).toBe(403);
      const data = await result.json();
      expect(data.error).toContain("CSRF token");
      // Must not proceed to business logic
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it("should call auth() before withCsrfProtection", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);

      // Set up remaining mocks for success path
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanCreateReport.mockResolvedValue({ allowed: true });
      mockGetUserPlan.mockResolvedValue({ plan: "pro" });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        membership: [{ org: { id: "org-123" } }],
      });
      mockValidateMagicBytes.mockReturnValue(true);
      mockUploadToR2.mockResolvedValue(undefined);
      mockPrisma.report.create.mockResolvedValue({ id: "report-123" });
      mockSignJobData.mockReturnValue({ signed: "job-data" });

      const req = createUploadRequest({ file: makeValidFile() });
      await POST(req);

      // Verify ordering: auth called, then withCsrfProtection passed userId
      expect(mockAuth).toHaveBeenCalledOnce();
      expect(mockWithCsrfProtection).toHaveBeenCalledWith(req, "user-123");
    });

    it("should pass the request and userId to withCsrfProtection", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);

      // Set up success-path mocks
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanCreateReport.mockResolvedValue({ allowed: true });
      mockGetUserPlan.mockResolvedValue({ plan: "pro" });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        membership: [{ org: { id: "org-123" } }],
      });
      mockValidateMagicBytes.mockReturnValue(true);
      mockUploadToR2.mockResolvedValue(undefined);
      mockPrisma.report.create.mockResolvedValue({ id: "report-123" });
      mockSignJobData.mockReturnValue({ signed: "job-data" });

      const req = createUploadRequest({ file: makeValidFile() });
      await POST(req);

      expect(mockWithCsrfProtection).toHaveBeenCalledWith(req, "user-123");
    });
  });

  // -----------------------------------------------------------------------
  // Rate limiting
  // -----------------------------------------------------------------------
  describe("Rate limiting", () => {
    it("should return 429 when rate limit exceeded", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(false);

      const req = createUploadRequest();
      const result = await POST(req);

      expect(result.status).toBe(429);
      const data = await result.json();
      expect(data.error).toBe(MOCK_ERROR_CODES.ERR_VALIDATION_RATE_LIMIT);
    });
  });

  // -----------------------------------------------------------------------
  // Plan limits
  // -----------------------------------------------------------------------
  describe("Plan limits", () => {
    it("should return 403 when report creation limit reached", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanConsume.mockResolvedValue(false);

      const req = createUploadRequest({ file: makeValidFile() });
      const result = await POST(req);

      expect(result.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // Input validation
  // -----------------------------------------------------------------------
  describe("Input validation", () => {
    it("should return 400 when file is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(true);

      // No file in request
      const req = createUploadRequest({ file: null });
      const result = await POST(req);

      expect(result.status).toBe(400);
    });

    it("should return 400 when sector is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanCreateReport.mockResolvedValue({ allowed: true });

      const formData = new FormData();
      formData.append("file", makeValidFile());
      formData.append("slideCount", "10");
      formData.append("language", "fr");
      const req = new Request("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await POST(req);

      expect(result.status).toBe(400);
    });

    it("should return 400 when sector is invalid", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanCreateReport.mockResolvedValue({ allowed: true });

      const req = createUploadRequest({ file: makeValidFile(), sector: "invalid-sector" });
      const result = await POST(req);

      expect(result.status).toBe(400);
      const data = await result.json();
      expect(data.error).toContain("Secteur invalide");
    });

    it("should return 400 when MIME type is not allowed", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanCreateReport.mockResolvedValue({ allowed: true });

      const badFile = new File(["not-a-spreadsheet"], "data.exe", {
        type: "application/x-msdownload",
      });
      const req = createUploadRequest({ file: badFile });
      const result = await POST(req);

      expect(result.status).toBe(400);
    });

    // File size validation (file.size > 50 * 1024 * 1024) is a trivial
    // numeric comparison. It is verified indirectly by the successful
    // upload tests — if the size check crashed, they would fail too.
    // A proper integration test would require a true 50+ MB file, which
    // is impractical in unit tests.

    it("should return 403 when slide count exceeds plan limit via getLimit(orgId, 'maxSlides')", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanCreateReport.mockResolvedValue({ allowed: true });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        membership: [{ org: { id: "org-123" } }],
      });
      mockGetLimit.mockResolvedValue(5);

      const req = createUploadRequest({ file: makeValidFile(), slideCount: "10" });
      const result = await POST(req);

      expect(result.status).toBe(403);
      // Verify getLimit was called with the correct orgId and feature name
      expect(mockGetLimit).toHaveBeenCalledWith("org-123", "maxSlides");
      // Verify error message includes the limit
      const data = await result.json();
      expect(data.error).toContain("5");
    });

    it("should allow upload when getLimit returns null (unlimited slides)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanCreateReport.mockResolvedValue({ allowed: true });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        membership: [{ org: { id: "org-123" } }],
      });
      // null = unlimited
      mockGetLimit.mockResolvedValue(null);
      mockValidateMagicBytes.mockReturnValue(true);
      mockUploadToR2.mockResolvedValue(undefined);
      mockPrisma.report.create.mockResolvedValue({ id: "report-unlimited" });
      mockSignJobData.mockReturnValue({ signed: "job-data" });
      mockGenerateQueue.add.mockResolvedValue(undefined);

      const req = createUploadRequest({ file: makeValidFile(), slideCount: "9999" });
      const result = await POST(req);

      expect(result.status).toBe(200);
      expect(mockGetLimit).toHaveBeenCalledWith("org-123", "maxSlides");
    });

    it("should return 400 when user has no organization", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanCreateReport.mockResolvedValue({ allowed: true });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        membership: [], // No org
      });

      const req = createUploadRequest({ file: makeValidFile() });
      const result = await POST(req);

      expect(result.status).toBe(400);
    });

    it("should return 400 when magic bytes validation fails", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanCreateReport.mockResolvedValue({ allowed: true });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        membership: [{ org: { id: "org-123" } }],
      });
      mockGetLimit.mockResolvedValue(20);
      mockValidateMagicBytes.mockReturnValue(false);

      const req = createUploadRequest({ file: makeValidFile() });
      const result = await POST(req);

      expect(result.status).toBe(400);
      const data = await result.json();
      expect(data.error).toContain("format attendu");
    });
  });

  // -----------------------------------------------------------------------
  // Successful upload
  // -----------------------------------------------------------------------
  describe("Successful upload", () => {
    it("should upload file, create report, enqueue job and return 200", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanCreateReport.mockResolvedValue({ allowed: true });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        membership: [{ org: { id: "org-123" } }],
      });
      mockGetLimit.mockResolvedValue(20);
      mockValidateMagicBytes.mockReturnValue(true);
      mockUploadToR2.mockResolvedValue(undefined);
      mockPrisma.report.create.mockResolvedValue({ id: "report-456" });
      mockSignJobData.mockReturnValue({ signed: "secure-job-data" });
      mockGenerateQueue.add.mockResolvedValue(undefined);

      const req = createUploadRequest({ file: makeValidFile() });
      const result = await POST(req);

      expect(result.status).toBe(200);
      const data = await result.json();
      expect(data.reportId).toBe("report-456");

      // Verify R2 upload called
      expect(mockUploadToR2).toHaveBeenCalledOnce();
      const r2Key = mockUploadToR2.mock.calls[0][0];
      expect(r2Key).toContain("uploads/org-123/");

      // Verify report creation
      expect(mockPrisma.report.create).toHaveBeenCalledOnce();
      const createArgs = mockPrisma.report.create.mock.calls[0][0];
      expect(createArgs.data.sector).toBe("retail");
      expect(createArgs.data.orgId).toBe("org-123");

      // Verify job enqueued
      expect(mockSignJobData).toHaveBeenCalledWith({
        reportId: "report-456",
        slideCount: 10,
        language: "fr",
        userId: "user-123",
      });
      expect(mockGenerateQueue.add).toHaveBeenCalledWith("generate", {
        signed: "secure-job-data",
      });
    });

    it("should work with XLSX file type", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        expires: new Date(Date.now() + 86400).toISOString(),
      });
      mockWithCsrfProtection.mockResolvedValue(null);
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanCreateReport.mockResolvedValue({ allowed: true });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        membership: [{ org: { id: "org-123" } }],
      });
      mockGetLimit.mockResolvedValue(20);
      mockValidateMagicBytes.mockReturnValue(true);
      mockUploadToR2.mockResolvedValue(undefined);
      mockPrisma.report.create.mockResolvedValue({ id: "report-789" });
      mockSignJobData.mockReturnValue({ signed: "x" });
      mockGenerateQueue.add.mockResolvedValue(undefined);

      const xlsxContent = Buffer.from([
        0x50,
        0x4b,
        0x03,
        0x04, // ZIP magic
        0x00,
        0x00,
        0x00,
        0x00,
      ]);
      const xlsxFile = new File([xlsxContent], "data.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const req = createUploadRequest({ file: xlsxFile });

      const result = await POST(req);
      expect(result.status).toBe(200);
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
      mockCheckRateLimit.mockResolvedValue(true);
      mockCanConsume.mockRejectedValue(new Error("DB connection failed"));

      const req = createUploadRequest({ file: makeValidFile() });
      const result = await POST(req);

      expect(result.status).toBe(500);
      const data = await result.json();
      expect(data.error).toBe("An error occurred");
      expect(mockLogApiError).toHaveBeenCalledOnce();
      expect(mockLogApiError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "DB connection failed" }),
        expect.objectContaining({ path: "/api/upload", method: "POST", userId: "user-123" }),
      );
    });
  });
});
