// @vitest-environment node
// ==========================================
// Regression — POST /api/upload (F1)
// ==========================================
// Verifies:
// - consume("reportsPerMonth") is called AFTER all validations (no quota burn on bad uploads)
// - quota exhausted -> 403 with upgrade:true + limit/used/resetAt
// - maxSlides enforced via getLimit
// - successful upload -> queue add + report created

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockConsume = vi.hoisted(() => vi.fn());
const mockGetLimit = vi.hoisted(() => vi.fn());
const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaReportCreate = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockWithCsrf = vi.hoisted(() => vi.fn());
const mockUploadToR2 = vi.hoisted(() => vi.fn());
const mockSignJobData = vi.hoisted(() => vi.fn());
const mockQueueAdd = vi.hoisted(() => vi.fn());
const mockGetGenerateQueue = vi.hoisted(() => vi.fn());
const mockValidateMagicBytes = vi.hoisted(() => vi.fn());
const mockLogApiError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/entitlements/feature-gate", () => ({
  consume: mockConsume,
  getLimit: mockGetLimit,
}));
vi.mock("@/lib/errors", () => ({
  badRequest: vi.fn((code: string) => ({ status: 400, body: { error: code } })),
  unauthorized: vi.fn(() => ({ status: 401, body: { error: "Unauthorized" } })),
  ERROR_CODES: {
    ERR_VALIDATION_FILE_REQUIRED: "FILE_REQUIRED",
    ERR_VALIDATION_RATE_LIMIT: "RATE_LIMIT",
    ERR_RESOURCE_NO_ORGANIZATION: "NO_ORG",
    ERR_RESOURCE_NOT_FOUND: "NOT_FOUND",
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockPrismaUserFindUnique },
    report: { create: mockPrismaReportCreate },
  },
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock("@/lib/security/csrf-middleware", () => ({ withCsrfProtection: mockWithCsrf }));
vi.mock("@/lib/r2", () => ({ uploadToR2: mockUploadToR2 }));
vi.mock("@/lib/queue/job-security", () => ({ signJobData: mockSignJobData }));
vi.mock("@/lib/queue", () => ({ getGenerateQueue: mockGetGenerateQueue }));
vi.mock("@/lib/upload-validation", () => ({ validateMagicBytes: mockValidateMagicBytes }));
vi.mock("@/lib/security/error-logger", () => ({ logApiError: mockLogApiError }));
vi.mock("@/lib/sector", () => ({
  isValidSector: vi.fn(() => true),
  VALID_SECTORS: ["retail"],
}));

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

import { POST } from "@/app/[locale]/api/upload/route";

function makeUploadRequest(fileName: string, fileType: string, fileSize: number): Request {
  const form = new FormData();
  form.append(
    "file",
    new File([new Uint8Array(fileSize > 0 ? Math.min(fileSize, 16) : 0)], fileName, {
      type: fileType,
    }),
  );
  form.append("sector", "retail");
  form.append("slideCount", "10");
  form.append("language", "fr");
  return new Request("http://localhost:3000/api/upload", { method: "POST", body: form });
}

const sessionUser = { user: { id: "user-1" } };
const dbUser = {
  id: "user-1",
  membership: [{ org: { id: "org-1", name: "Acme" } }],
};

describe("POST /api/upload — F1 quota consumption regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus = undefined;
    lastBody = undefined;

    mockAuth.mockResolvedValue(sessionUser);
    mockWithCsrf.mockResolvedValue(null);
    mockCheckRateLimit.mockResolvedValue(true);
    mockPrismaUserFindUnique.mockResolvedValue(dbUser);
    mockConsume.mockResolvedValue({
      success: true,
      limit: 3,
      used: 1,
      resetAt: new Date("2026-09-01T00:00:00Z"),
    });
    mockGetLimit.mockResolvedValue(30);
    mockValidateMagicBytes.mockReturnValue(true);
    mockUploadToR2.mockResolvedValue(undefined);
    mockPrismaReportCreate.mockImplementation((args: { data: { title: string } }) =>
      Promise.resolve({ id: "report-1", ...args.data }),
    );
    mockSignJobData.mockImplementation((data: unknown) => ({ ...data, signature: "sig" }));
    mockGetGenerateQueue.mockResolvedValue({ add: mockQueueAdd });
    mockQueueAdd.mockResolvedValue(undefined);
  });

  it("consumes reportsPerMonth quota and returns reportId on success", async () => {
    await POST(makeUploadRequest("sales.csv", "text/csv", 1024) as never);

    expect(mockConsume).toHaveBeenCalledWith("org-1", "reportsPerMonth", 1);
    expect(lastStatus).toBe(200);
    expect(lastBody).toEqual({ reportId: "report-1" });
    expect(mockQueueAdd).toHaveBeenCalledWith(
      "generate",
      expect.objectContaining({ reportId: "report-1" }),
    );
  });

  it("returns 403 upgrade:true with limit/used/resetAt when quota is exhausted", async () => {
    mockConsume.mockResolvedValue({
      success: false,
      limit: 3,
      used: 3,
      resetAt: new Date("2026-08-19T00:00:00Z"),
    });

    await POST(makeUploadRequest("sales.csv", "text/csv", 1024) as never);

    expect(lastStatus).toBe(403);
    expect(lastBody).toEqual(
      expect.objectContaining({
        upgrade: true,
        feature: "reportsPerMonth",
        limit: 3,
        used: 3,
        resetAt: new Date("2026-08-19T00:00:00Z"),
      }),
    );
    expect(mockPrismaReportCreate).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("does NOT consume quota when the file fails magic-byte validation", async () => {
    mockValidateMagicBytes.mockReturnValue(false);

    const res = (await POST(makeUploadRequest("fake.csv", "text/csv", 1024) as never)) as {
      status: number;
    };

    expect(res.status).toBe(400);
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockPrismaReportCreate).not.toHaveBeenCalled();
  });

  it("does NOT consume quota when the user has no org", async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ id: "user-1", membership: [] });

    const res = (await POST(makeUploadRequest("sales.csv", "text/csv", 1024) as never)) as {
      status: number;
    };

    expect(res.status).toBe(400);
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it("does NOT consume quota when the MIME type is not allowed", async () => {
    await POST(makeUploadRequest("evil.exe", "application/x-msdownload", 1024) as never);

    expect(lastStatus).toBe(400);
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it("enforces maxSlides via getLimit", async () => {
    mockGetLimit.mockResolvedValue(10);
    const form = new FormData();
    form.append("file", new File([new Uint8Array(8)], "sales.csv", { type: "text/csv" }));
    form.append("sector", "retail");
    form.append("slideCount", "15");

    await POST(
      new Request("http://localhost:3000/api/upload", { method: "POST", body: form }) as never,
    );

    expect(lastStatus).toBe(403);
    expect(mockPrismaReportCreate).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limit is hit (before consume)", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    await POST(makeUploadRequest("sales.csv", "text/csv", 1024) as never);

    expect(lastStatus).toBe(429);
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = (await POST(makeUploadRequest("sales.csv", "text/csv", 1024) as never)) as {
      status: number;
    };

    expect(res.status).toBe(401);
    expect(mockConsume).not.toHaveBeenCalled();
  });
});
