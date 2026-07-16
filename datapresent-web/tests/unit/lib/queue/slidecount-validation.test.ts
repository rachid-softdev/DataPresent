// ==========================================
// Slide Count Validation Tests
// ==========================================
//
// Tests slideCount validation in report generation:
// - canHaveSlideCount from compat.ts validates plan limits
// - FREE plan: max 8 slides
// - PRO plan: max 20 slides
// - PRO plan: max 30 slides
// - ULTRA plan: unlimited (-1)
// - slideCount defaults to 10 when not provided in job data
// - generate worker passes slideCount to analyzeWithClaude

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock dependencies for generate worker tests
// ---------------------------------------------------------------------------
const mockPrismaReportUpdate = vi.hoisted(() => vi.fn());
const mockPrismaReportFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockPrismaSlideDeleteMany = vi.hoisted(() => vi.fn());
const mockPrismaSlideCreateMany = vi.hoisted(() => vi.fn());
const mockPrismaReportVersionFindFirst = vi.hoisted(() => vi.fn());
const mockPrismaReportVersionCreate = vi.hoisted(() => vi.fn());
const mockPrismaTransaction = vi.hoisted(() => vi.fn());
const mockPrismaFindMany = vi.hoisted(() => vi.fn());
const mockPrismaSubscriptionFindUnique = vi.hoisted(() => vi.fn());
const mockParseFile = vi.hoisted(() => vi.fn());
const mockAnalyzeWithClaude = vi.hoisted(() => vi.fn());
const mockGetSignedDownloadUrl = vi.hoisted(() => vi.fn());
const mockExtractSignedJobData = vi.hoisted(() => vi.fn());
const mockGetRedisConnectionAsync = vi.hoisted(() => vi.fn());
const mockCaptureException = vi.hoisted(() => vi.fn());
const mockCaptureMessage = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());
const mockGetLimit = vi.hoisted(() => vi.fn());

let mockWorkerProcessFn: ((job: any) => Promise<void>) | null = null;

// ---------------------------------------------------------------------------
// Mock bullmq — use a class so `new Worker(...)` works
// ---------------------------------------------------------------------------
vi.mock("bullmq", () => {
  class MockWorker {
    constructor(_name: string, processFn: (job: unknown) => Promise<void>, _opts: unknown) {
      mockWorkerProcessFn = processFn;
    }
    on = vi.fn();
    close = vi.fn();
  }
  return { Worker: MockWorker };
});

// ---------------------------------------------------------------------------
// Mock prisma — include models used by entitlement system
// ---------------------------------------------------------------------------
vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      update: mockPrismaReportUpdate,
      findUniqueOrThrow: mockPrismaReportFindUniqueOrThrow,
    },
    slide: {
      deleteMany: mockPrismaSlideDeleteMany,
      createMany: mockPrismaSlideCreateMany,
    },
    reportVersion: {
      findFirst: mockPrismaReportVersionFindFirst,
      create: mockPrismaReportVersionCreate,
    },
    entitlementOverride: {
      findMany: mockPrismaFindMany,
      findFirst: vi.fn().mockResolvedValue(null),
    },
    planFeature: {
      findMany: mockPrismaFindMany,
    },
    feature: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    subscription: {
      findUnique: mockPrismaSubscriptionFindUnique,
    },
    usageTracking: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $transaction: mockPrismaTransaction,
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/parsers", () => ({
  parseFile: mockParseFile,
}));

vi.mock("@/lib/ai/analyze", () => ({
  analyzeWithClaude: mockAnalyzeWithClaude,
}));

vi.mock("@/lib/r2", () => ({
  getSignedDownloadUrl: mockGetSignedDownloadUrl,
}));

vi.mock("@/lib/queue/job-security", () => ({
  extractSignedJobData: mockExtractSignedJobData,
}));

vi.mock("@/lib/redis", () => ({
  getRedisConnectionAsync: mockGetRedisConnectionAsync,
}));

vi.mock("@/lib/sentry", () => ({
  captureException: mockCaptureException,
  captureMessage: mockCaptureMessage,
}));

vi.mock("@/lib/entitlements/feature-gate", () => ({
  getLimit: mockGetLimit,
}));

vi.mock("@/env", () => ({
  env: {
    REDIS_URL: "redis://localhost:6379",
    REDIS_TLS_ENABLED: "false",
    REDIS_TLS_REJECT_UNAUTHORIZED: "false",
    STRIPE_SECRET_KEY: "sk_test_mock",
  },
}));

// ---------------------------------------------------------------------------
// Import modules
// ---------------------------------------------------------------------------
import { canHaveSlideCount } from "@/lib/entitlements/compat";
import { getGenerateWorker } from "@/lib/queue/workers/generate.worker";

// ---------------------------------------------------------------------------
// Plan-based slide count validation
// ---------------------------------------------------------------------------
describe("canHaveSlideCount (plan validation)", () => {
  // -----------------------------------------------------------------------
  // FREE plan — max 8 slides
  // -----------------------------------------------------------------------
  describe("FREE plan", () => {
    it("should allow up to 8 slides", () => {
      const result = canHaveSlideCount("FREE", 8);
      expect(result.allowed).toBe(true);
      expect(result.maxSlides).toBe(8);
    });

    it("should reject more than 8 slides", () => {
      const result = canHaveSlideCount("FREE", 9);
      expect(result.allowed).toBe(false);
      expect(result.maxSlides).toBe(8);
    });

    it("should allow 1 slide (minimum)", () => {
      const result = canHaveSlideCount("FREE", 1);
      expect(result.allowed).toBe(true);
      expect(result.maxSlides).toBe(8);
    });

    it("should allow 0 slides", () => {
      const result = canHaveSlideCount("FREE", 0);
      expect(result.allowed).toBe(true);
      expect(result.maxSlides).toBe(8);
    });
  });

  // -----------------------------------------------------------------------
  // STARTER plan — max 20 slides
  // -----------------------------------------------------------------------
  describe("STARTER plan", () => {
    it("should allow up to 20 slides", () => {
      const result = canHaveSlideCount("STARTER", 20);
      expect(result.allowed).toBe(true);
      expect(result.maxSlides).toBe(20);
    });

    it("should reject more than 20 slides", () => {
      const result = canHaveSlideCount("STARTER", 21);
      expect(result.allowed).toBe(false);
      expect(result.maxSlides).toBe(20);
    });

    it("should allow 8 slides (within STARTER limit)", () => {
      const result = canHaveSlideCount("STARTER", 8);
      expect(result.allowed).toBe(true);
      expect(result.maxSlides).toBe(20);
    });
  });

  // -----------------------------------------------------------------------
  // PRO plan — max 30 slides
  // -----------------------------------------------------------------------
  describe("PRO plan", () => {
    it("should allow up to 30 slides", () => {
      const result = canHaveSlideCount("PRO", 30);
      expect(result.allowed).toBe(true);
      expect(result.maxSlides).toBe(30);
    });

    it("should reject more than 30 slides", () => {
      const result = canHaveSlideCount("PRO", 31);
      expect(result.allowed).toBe(false);
      expect(result.maxSlides).toBe(30);
    });
  });

  // -----------------------------------------------------------------------
  // ULTRA plan — unlimited (-1 means no limit)
  // -----------------------------------------------------------------------
  describe("ULTRA plan", () => {
    it("should allow any slide count (unlimited)", () => {
      const result = canHaveSlideCount("ULTRA", 100);
      expect(result.allowed).toBe(true);
      expect(result.maxSlides).toBe(-1);
    });

    it("should allow 0 slides (unlimited)", () => {
      const result = canHaveSlideCount("ULTRA", 0);
      expect(result.allowed).toBe(true);
      expect(result.maxSlides).toBe(-1);
    });
  });
});

// ---------------------------------------------------------------------------
// Generate worker slideCount handling
// ---------------------------------------------------------------------------
describe("Generate worker slideCount handling", () => {
  const mockReport = {
    id: "report-456",
    title: "Test Report",
    sector: "MARKETING",
    language: "fr",
    org: {
      id: "org-789",
      members: [{ userId: "user-1" }],
    },
    sourceFile: {
      r2Key: "uploads/test.xlsx",
      filename: "test.xlsx",
      fileType: "XLSX",
    },
    slides: [
      {
        id: "slide-1",
        position: 1,
        title: "Slide 1",
        layout: "TITLE_SLIDE",
        contentJson: "{}",
        speakerNotes: null,
      },
    ],
  };

  const mockParsedData = { rows: [{ name: "Test", value: 100 }] };

  const mockAnalyzeResult = {
    title: "Generated Report",
    slides: [
      {
        position: 1,
        title: "AI Slide 1",
        layout: "TITLE_SLIDE",
        content: { text: "Content" },
        speakerNotes: null,
      },
      {
        position: 2,
        title: "AI Slide 2",
        layout: "BAR_CHART",
        content: { data: [] },
        speakerNotes: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { reportId: "report-456", slideCount: 10, language: "fr", userId: "user-1" },
    });
    mockPrismaReportUpdate.mockResolvedValue({ id: "report-456", status: "PROCESSING" });
    mockPrismaReportFindUniqueOrThrow.mockResolvedValue(mockReport);
    mockParseFile.mockResolvedValue(mockParsedData);
    mockGetSignedDownloadUrl.mockResolvedValue("https://signed-url.example.com/test.xlsx");
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    mockAnalyzeWithClaude.mockResolvedValue(mockAnalyzeResult);
    mockPrismaReportVersionFindFirst.mockResolvedValue(null);
    mockPrismaTransaction.mockResolvedValue([
      { id: "version-1" },
      { count: 2 },
      { id: "report-456" },
    ]);
    mockCaptureMessage.mockReturnValue(undefined);
    mockGetRedisConnectionAsync.mockResolvedValue({ status: "ready" });
    mockGetLimit.mockResolvedValue(null);
    mockPrismaFindMany.mockResolvedValue([]);
    mockPrismaSubscriptionFindUnique.mockResolvedValue(null);
  });

  // -----------------------------------------------------------------------
  // slideCount is passed to analyzeWithClaude
  // -----------------------------------------------------------------------
  it("should pass slideCount from job data to analyzeWithClaude", async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { reportId: "report-456", slideCount: 15, language: "fr", userId: "user-1" },
    });
    await getGenerateWorker();

    // Act
    await mockWorkerProcessFn!({
      id: "job-1",
      data: {
        reportId: "report-456",
        slideCount: 15,
        language: "fr",
        userId: "user-1",
        signature: "valid-sig",
      },
      attemptsMade: 0,
    });

    // Assert
    expect(mockAnalyzeWithClaude).toHaveBeenCalledWith(expect.objectContaining({ slideCount: 15 }));
  });

  // -----------------------------------------------------------------------
  // slideCount defaults to 10 when not provided
  // -----------------------------------------------------------------------
  it("should default slideCount to 10 when not provided in job data", async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { reportId: "report-456", language: "fr", userId: "user-1" },
    });
    await getGenerateWorker();

    // Act
    await mockWorkerProcessFn!({
      id: "job-2",
      data: { reportId: "report-456", language: "fr", userId: "user-1", signature: "valid-sig" },
      attemptsMade: 0,
    });

    // Assert — slideCount || 10 evaluates to 10 when undefined
    expect(mockAnalyzeWithClaude).toHaveBeenCalledWith(expect.objectContaining({ slideCount: 10 }));
  });

  // -----------------------------------------------------------------------
  // slideCount of 0 defaults to 10 (0 || 10 = 10)
  // -----------------------------------------------------------------------
  it("should default slideCount to 10 when 0 is provided (0 is falsy)", async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { reportId: "report-456", slideCount: 0, language: "fr", userId: "user-1" },
    });
    await getGenerateWorker();

    // Act
    await mockWorkerProcessFn!({
      id: "job-3",
      data: {
        reportId: "report-456",
        slideCount: 0,
        language: "fr",
        userId: "user-1",
        signature: "valid-sig",
      },
      attemptsMade: 0,
    });

    // Assert — `slideCount || 10` treats 0 as falsy so defaults to 10
    expect(mockAnalyzeWithClaude).toHaveBeenCalledWith(expect.objectContaining({ slideCount: 10 }));
  });

  // -----------------------------------------------------------------------
  // slideCount defaults to 10 when explicitly undefined
  // -----------------------------------------------------------------------
  it("should default slideCount to 10 when explicitly undefined", async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: {
        reportId: "report-456",
        slideCount: undefined,
        language: "fr",
        userId: "user-1",
      },
    });
    await getGenerateWorker();

    // Act
    await mockWorkerProcessFn!({
      id: "job-4",
      data: { reportId: "report-456", language: "fr", userId: "user-1", signature: "valid-sig" },
      attemptsMade: 0,
    });

    // Assert — slideCount || 10 evaluates to 10 when undefined
    expect(mockAnalyzeWithClaude).toHaveBeenCalledWith(expect.objectContaining({ slideCount: 10 }));
  });

  // -----------------------------------------------------------------------
  // Language defaults to 'fr'
  // -----------------------------------------------------------------------
  it('should default language to "fr" when not provided', async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { reportId: "report-456", slideCount: 10, userId: "user-1" },
    });
    await getGenerateWorker();

    // Act
    await mockWorkerProcessFn!({
      id: "job-5",
      data: { reportId: "report-456", slideCount: 10, userId: "user-1", signature: "valid-sig" },
      attemptsMade: 0,
    });

    // Assert
    expect(mockAnalyzeWithClaude).toHaveBeenCalledWith(expect.objectContaining({ language: "fr" }));
  });

  // -----------------------------------------------------------------------
  // Security validation rejects invalid signatures
  // -----------------------------------------------------------------------
  it("should reject job with invalid signature before slideCount validation", async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: false,
      cleanData: { reportId: "report-456", slideCount: 10, language: "fr", userId: "user-1" },
    });
    await getGenerateWorker();

    // Act & Assert
    await expect(
      mockWorkerProcessFn!({
        id: "job-6",
        data: {
          reportId: "report-456",
          slideCount: 10,
          language: "fr",
          userId: "user-1",
          signature: "bad-sig",
        },
        attemptsMade: 0,
      }),
    ).rejects.toThrow("Invalid job signature");

    expect(mockAnalyzeWithClaude).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Missing reportId is rejected
  // -----------------------------------------------------------------------
  it("should reject job with missing reportId", async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { slideCount: 10, language: "fr", userId: "user-1" },
    });
    await getGenerateWorker();

    // Act & Assert
    await expect(
      mockWorkerProcessFn!({
        id: "job-7",
        data: { slideCount: 10, language: "fr", userId: "user-1", signature: "valid-sig" },
        attemptsMade: 0,
      }),
    ).rejects.toThrow("missing reportId or userId");

    expect(mockAnalyzeWithClaude).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Unauthorized user is rejected
  // -----------------------------------------------------------------------
  it("should reject job when user is not an org member", async () => {
    // Arrange
    mockPrismaReportFindUniqueOrThrow.mockResolvedValue({
      ...mockReport,
      org: { id: "org-789", members: [] },
    });
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { reportId: "report-456", slideCount: 10, language: "fr", userId: "unauthorized" },
    });
    await getGenerateWorker();

    // Act & Assert
    await expect(
      mockWorkerProcessFn!({
        id: "job-8",
        data: {
          reportId: "report-456",
          slideCount: 10,
          language: "fr",
          userId: "unauthorized",
          signature: "valid-sig",
        },
        attemptsMade: 0,
      }),
    ).rejects.toThrow("not authorized");

    expect(mockAnalyzeWithClaude).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Error handling sets status to ERROR
  // -----------------------------------------------------------------------
  it("should set report status to ERROR when processing fails", async () => {
    // Arrange
    mockAnalyzeWithClaude.mockRejectedValue(new Error("AI analysis failed"));
    await getGenerateWorker();

    // Act & Assert
    await expect(
      mockWorkerProcessFn!({
        id: "job-9",
        data: {
          reportId: "report-456",
          slideCount: 10,
          language: "fr",
          userId: "user-1",
          signature: "valid-sig",
        },
        attemptsMade: 0,
      }),
    ).rejects.toThrow("AI analysis failed");

    expect(mockPrismaReportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "report-456" },
        data: expect.objectContaining({ status: "ERROR" }),
      }),
    );
    expect(mockCaptureException).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // getLimit is called with orgId and 'maxSlides'
  // -----------------------------------------------------------------------
  it("should call getLimit with correct orgId and maxSlides key", async () => {
    // Arrange
    mockGetLimit.mockResolvedValue(20);
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { reportId: "report-456", slideCount: 10, language: "fr", userId: "user-1" },
    });
    await getGenerateWorker();

    // Act
    await mockWorkerProcessFn!({
      id: "job-limit-call",
      data: {
        reportId: "report-456",
        slideCount: 10,
        language: "fr",
        userId: "user-1",
        signature: "valid-sig",
      },
      attemptsMade: 0,
    });

    // Assert
    expect(mockGetLimit).toHaveBeenCalledWith("org-789", "maxSlides");
  });

  // -----------------------------------------------------------------------
  // slideCount ≤ maxSlides passes
  // -----------------------------------------------------------------------
  it("should pass when slideCount does not exceed maxSlides", async () => {
    // Arrange — limit is 20, slideCount is 15 (under limit)
    mockGetLimit.mockResolvedValue(20);
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { reportId: "report-456", slideCount: 15, language: "fr", userId: "user-1" },
    });
    await getGenerateWorker();

    // Act — should not throw
    await expect(
      mockWorkerProcessFn!({
        id: "job-under-limit",
        data: {
          reportId: "report-456",
          slideCount: 15,
          language: "fr",
          userId: "user-1",
          signature: "valid-sig",
        },
        attemptsMade: 0,
      }),
    ).resolves.toBeUndefined();

    // Assert — analyzeWithClaude was called (processing continued)
    expect(mockAnalyzeWithClaude).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // slideCount > maxSlides fails
  // -----------------------------------------------------------------------
  it("should throw when slideCount exceeds maxSlides", async () => {
    // Arrange — limit is 10, slideCount is 15 (over limit)
    mockGetLimit.mockResolvedValue(10);
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { reportId: "report-456", slideCount: 15, language: "fr", userId: "user-1" },
    });
    await getGenerateWorker();

    // Act & Assert
    await expect(
      mockWorkerProcessFn!({
        id: "job-over-limit",
        data: {
          reportId: "report-456",
          slideCount: 15,
          language: "fr",
          userId: "user-1",
          signature: "valid-sig",
        },
        attemptsMade: 0,
      }),
    ).rejects.toThrow("Slide count 15 exceeds plan limit of 10 for organization org-789");

    // Assert — analyzeWithClaude was NOT called (validation stopped processing)
    expect(mockAnalyzeWithClaude).not.toHaveBeenCalled();
    // Report should still be set to ERROR
    expect(mockPrismaReportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "report-456" },
        data: expect.objectContaining({ status: "ERROR" }),
      }),
    );
  });

  // -----------------------------------------------------------------------
  // getLimit returns null → no limit, passes
  // -----------------------------------------------------------------------
  it("should pass when getLimit returns null (unlimited)", async () => {
    // Arrange — getLimit returns null (no limit)
    mockGetLimit.mockResolvedValue(null);
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { reportId: "report-456", slideCount: 999, language: "fr", userId: "user-1" },
    });
    await getGenerateWorker();

    // Act — should not throw even with very high slideCount
    await expect(
      mockWorkerProcessFn!({
        id: "job-no-limit",
        data: {
          reportId: "report-456",
          slideCount: 999,
          language: "fr",
          userId: "user-1",
          signature: "valid-sig",
        },
        attemptsMade: 0,
      }),
    ).resolves.toBeUndefined();

    expect(mockAnalyzeWithClaude).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // slideCount equal to maxSlides passes
  // -----------------------------------------------------------------------
  it("should pass when slideCount equals maxSlides", async () => {
    // Arrange — limit is 15, slideCount is 15 (exactly at limit)
    mockGetLimit.mockResolvedValue(15);
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { reportId: "report-456", slideCount: 15, language: "fr", userId: "user-1" },
    });
    await getGenerateWorker();

    // Act — should not throw
    await expect(
      mockWorkerProcessFn!({
        id: "job-at-limit",
        data: {
          reportId: "report-456",
          slideCount: 15,
          language: "fr",
          userId: "user-1",
          signature: "valid-sig",
        },
        attemptsMade: 0,
      }),
    ).resolves.toBeUndefined();

    expect(mockAnalyzeWithClaude).toHaveBeenCalled();
  });
});
