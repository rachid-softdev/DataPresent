// @vitest-environment node
// ==========================================
// Admin API — /api/admin/overrides unit tests
// ==========================================

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockExtractClientIP = vi.hoisted(() => vi.fn());
const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaFeatureFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaOverrideFindMany = vi.hoisted(() => vi.fn());
const mockPrismaOverrideCount = vi.hoisted(() => vi.fn());
const mockPrismaOverrideFindUnique = vi.hoisted(() => vi.fn());
const mockCreateOverride = vi.hoisted(() => vi.fn());
const mockDeleteOverride = vi.hoisted(() => vi.fn());
const mockInvalidateCache = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock("@/lib/client-ip", () => ({ extractClientIP: mockExtractClientIP }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockPrismaUserFindUnique },
    feature: { findUnique: mockPrismaFeatureFindUnique },
    entitlementOverride: {
      findMany: mockPrismaOverrideFindMany,
      count: mockPrismaOverrideCount,
      findUnique: mockPrismaOverrideFindUnique,
    },
  },
}));
vi.mock("@/lib/entitlements/repository", () => ({
  entitlementRepository: {
    createOverride: mockCreateOverride,
    deleteOverride: mockDeleteOverride,
  },
}));
vi.mock("@/lib/entitlements/feature-gate", () => ({
  invalidateCache: mockInvalidateCache,
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

import { DELETE, GET, POST } from "@/app/api/admin/overrides/route";

function makeRequest(
  method: "GET" | "POST" | "DELETE",
  url = "http://localhost:3000/api/admin/overrides",
  body?: unknown,
): Request {
  return new Request(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("Admin API — /api/admin/overrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus = undefined;
    lastBody = undefined;

    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mockPrismaUserFindUnique.mockResolvedValue({ role: "ADMIN" });
    mockCheckRateLimit.mockResolvedValue(true);
    mockExtractClientIP.mockReturnValue("1.2.3.4");

    mockPrismaOverrideFindMany.mockResolvedValue([
      {
        id: "ov-1",
        scope: "ORG",
        scopeId: "org-1",
        featureKey: "watermark",
        enabled: true,
        reason: "r",
      },
    ]);
    mockPrismaOverrideCount.mockResolvedValue(1);
    mockPrismaFeatureFindUnique.mockResolvedValue({ id: "f1", key: "watermark" });
    mockCreateOverride.mockImplementation((args: { featureKey: string }) =>
      Promise.resolve({ id: "ov-new", ...args }),
    );
    mockPrismaOverrideFindUnique.mockResolvedValue({ id: "ov-1", scope: "ORG", scopeId: "org-1" });
    mockDeleteOverride.mockResolvedValue({ id: "ov-1" });
    mockInvalidateCache.mockResolvedValue(undefined);
  });

  // -----------------------------------------------------------------------
  // GET
  // -----------------------------------------------------------------------
  it("GET returns paginated overrides", async () => {
    await GET(makeRequest("GET"));

    expect(lastStatus).toBe(200);
    const body = lastBody as { data: unknown[]; pagination: { total: number; totalPages: number } };
    expect(body.data.length).toBe(1);
    expect(body.pagination.total).toBe(1);
  });

  it("GET returns 400 for an invalid scope filter", async () => {
    await GET(makeRequest("GET", "http://localhost:3000/api/admin/overrides?scope=INVALID"));

    expect(lastStatus).toBe(400);
    expect(mockPrismaOverrideFindMany).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // POST
  // -----------------------------------------------------------------------
  it("POST creates an ORG override and invalidates the org cache", async () => {
    await POST(
      makeRequest("POST", undefined, {
        scope: "ORG",
        scopeId: "org-1",
        featureKey: "watermark",
        enabled: true,
        reason: "test",
      }),
    );

    expect(lastStatus).toBe(201);
    expect(mockCreateOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "ORG",
        scopeId: "org-1",
        featureKey: "watermark",
        createdById: "admin-1",
      }),
    );
    expect(mockInvalidateCache).toHaveBeenCalledWith("org-1");
  });

  it("POST returns 400 when required fields are missing", async () => {
    await POST(makeRequest("POST", undefined, { scope: "ORG" }));

    expect(lastStatus).toBe(400);
    expect(mockCreateOverride).not.toHaveBeenCalled();
  });

  it("POST returns 400 for an invalid scope", async () => {
    await POST(
      makeRequest("POST", undefined, {
        scope: "PLAN",
        scopeId: "x",
        featureKey: "watermark",
        reason: "r",
      }),
    );

    expect(lastStatus).toBe(400);
  });

  it("POST returns 404 when the feature does not exist", async () => {
    mockPrismaFeatureFindUnique.mockResolvedValue(null);

    await POST(
      makeRequest("POST", undefined, {
        scope: "ORG",
        scopeId: "org-1",
        featureKey: "ghost",
        reason: "r",
      }),
    );

    expect(lastStatus).toBe(404);
    expect(mockCreateOverride).not.toHaveBeenCalled();
  });

  it("POST does not invalidate cache for USER-scoped overrides", async () => {
    await POST(
      makeRequest("POST", undefined, {
        scope: "USER",
        scopeId: "user-1",
        featureKey: "watermark",
        enabled: true,
        reason: "test",
      }),
    );

    expect(lastStatus).toBe(201);
    expect(mockInvalidateCache).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // DELETE
  // -----------------------------------------------------------------------
  it("DELETE removes an override and invalidates the org cache", async () => {
    await DELETE(makeRequest("DELETE", "http://localhost:3000/api/admin/overrides/ov-1"));

    expect(lastStatus).toBe(200);
    expect(mockDeleteOverride).toHaveBeenCalledWith("ov-1");
    expect(mockInvalidateCache).toHaveBeenCalledWith("org-1");
  });

  it("DELETE returns 404 when the override does not exist", async () => {
    mockPrismaOverrideFindUnique.mockResolvedValue(null);

    await DELETE(makeRequest("DELETE", "http://localhost:3000/api/admin/overrides/missing"));

    expect(lastStatus).toBe(404);
    expect(mockDeleteOverride).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Authorization
  // -----------------------------------------------------------------------
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await GET(makeRequest("GET"));

    expect(lastStatus).toBe(401);
    expect(mockPrismaOverrideFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin user", async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ role: "MEMBER" });

    await POST(
      makeRequest("POST", undefined, {
        scope: "ORG",
        scopeId: "org-1",
        featureKey: "watermark",
        reason: "r",
      }),
    );

    expect(lastStatus).toBe(403);
    expect(mockCreateOverride).not.toHaveBeenCalled();
  });
});
