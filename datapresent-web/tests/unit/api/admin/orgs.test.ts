// @vitest-environment node
// ==========================================
// Admin API — /api/admin/orgs/[orgId] unit tests
// ==========================================
//
// Covers:
// - GET /api/admin/orgs/:orgId/entitlements
// - GET /api/admin/orgs/:orgId/downgrade-preview
// - POST /api/admin/cache/invalidate/:orgId

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockExtractClientIP = vi.hoisted(() => vi.fn());
const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaOrgFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaOrgFindMany = vi.hoisted(() => vi.fn());
const mockPrismaOrgCount = vi.hoisted(() => vi.fn());
const mockGetAllEntitlements = vi.hoisted(() => vi.fn());
const mockGetDowngradeInfo = vi.hoisted(() => vi.fn());
const mockInvalidateCache = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock("@/lib/client-ip", () => ({ extractClientIP: mockExtractClientIP }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockPrismaUserFindUnique },
    organization: {
      findUnique: mockPrismaOrgFindUnique,
      findMany: mockPrismaOrgFindMany,
      count: mockPrismaOrgCount,
    },
  },
}));
vi.mock("@/lib/entitlements", () => ({
  getAllEntitlements: mockGetAllEntitlements,
  getDowngradeInfo: mockGetDowngradeInfo,
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

import { POST as CachePOST } from "@/app/api/admin/cache/invalidate/[orgId]/route";
import { GET as DowngradeGET } from "@/app/api/admin/orgs/[orgId]/downgrade-preview/route";
import { GET as EntitlementsGET } from "@/app/api/admin/orgs/[orgId]/entitlements/route";
import { GET as OrgsListGET } from "@/app/api/admin/orgs/route";

function makeRequest(method: "GET" | "POST", url: string): Request {
  return new Request(url, { method });
}

const entitlementsPayload = {
  plan: "FREE",
  status: "ACTIVE",
  features: { watermark: true },
  limits: { reportsPerMonth: 3 },
  usage: { reportsPerMonth: 1 },
  resetAt: { reportsPerMonth: new Date("2026-09-01T00:00:00Z") },
};

describe("Admin API — orgs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus = undefined;
    lastBody = undefined;

    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mockPrismaUserFindUnique.mockResolvedValue({ role: "ADMIN" });
    mockCheckRateLimit.mockResolvedValue(true);
    mockExtractClientIP.mockReturnValue("1.2.3.4");

    mockPrismaOrgFindUnique.mockResolvedValue({ name: "Acme" });
    mockPrismaOrgFindMany.mockResolvedValue([
      {
        id: "org-1",
        name: "Acme",
        slug: "acme",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        subscription: { plan: "PRO", status: "ACTIVE" },
        _count: { members: 3, reports: 12 },
      },
    ]);
    mockPrismaOrgCount.mockResolvedValue(1);
    mockGetAllEntitlements.mockResolvedValue(entitlementsPayload);
    mockGetDowngradeInfo.mockResolvedValue({
      orgId: "org-1",
      targetPlan: "FREE",
      affectedFeatures: [{ featureKey: "exportsPerMonth", change: { from: 30, to: 3 } }],
    });
    mockInvalidateCache.mockResolvedValue(undefined);
  });

  // -----------------------------------------------------------------------
  // GET orgs list
  // -----------------------------------------------------------------------
  it("GET orgs list returns paginated orgs with plan and counts", async () => {
    await OrgsListGET(makeRequest("GET", "http://localhost:3000/api/admin/orgs"));

    expect(lastStatus).toBe(200);
    const body = lastBody as {
      data: Array<{ id: string; plan: string; memberCount: number }>;
      pagination: { page: number; total: number };
    };
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        id: "org-1",
        name: "Acme",
        plan: "PRO",
        memberCount: 3,
        reportCount: 12,
      }),
    );
    expect(body.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it("GET orgs list forwards the search query to the DB", async () => {
    await OrgsListGET(makeRequest("GET", "http://localhost:3000/api/admin/orgs?search=acme"));

    expect(mockPrismaOrgFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: expect.any(Array) } }),
    );
  });

  // -----------------------------------------------------------------------
  // GET entitlements
  // -----------------------------------------------------------------------
  it("GET entitlements returns org info merged with entitlements", async () => {
    await EntitlementsGET(
      makeRequest("GET", "http://localhost:3000/api/admin/orgs/org-1/entitlements"),
      {
        params: Promise.resolve({ orgId: "org-1" }),
      } as never,
    );

    expect(lastStatus).toBe(200);
    const body = lastBody as { orgId: string; orgName: string; plan: string };
    expect(body.orgId).toBe("org-1");
    expect(body.orgName).toBe("Acme");
    expect(body.plan).toBe("FREE");
    expect(mockGetAllEntitlements).toHaveBeenCalledWith("org-1");
  });

  it("GET entitlements returns 404 for an unknown org", async () => {
    mockPrismaOrgFindUnique.mockResolvedValue(null);

    await EntitlementsGET(
      makeRequest("GET", "http://localhost:3000/api/admin/orgs/nope/entitlements"),
      {
        params: Promise.resolve({ orgId: "nope" }),
      } as never,
    );

    expect(lastStatus).toBe(404);
    expect(mockGetAllEntitlements).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // GET downgrade-preview
  // -----------------------------------------------------------------------
  it("GET downgrade-preview returns affected features for a valid targetPlan", async () => {
    await DowngradeGET(
      makeRequest(
        "GET",
        "http://localhost:3000/api/admin/orgs/org-1/downgrade-preview?targetPlan=FREE",
      ),
      { params: Promise.resolve({ orgId: "org-1" }) },
    );

    expect(lastStatus).toBe(200);
    const body = lastBody as { affectedFeatures: unknown[] };
    expect(body.affectedFeatures.length).toBe(1);
    expect(mockGetDowngradeInfo).toHaveBeenCalledWith("org-1", "FREE");
  });

  it("GET downgrade-preview returns 400 when targetPlan is missing", async () => {
    await DowngradeGET(
      makeRequest("GET", "http://localhost:3000/api/admin/orgs/org-1/downgrade-preview"),
      { params: Promise.resolve({ orgId: "org-1" }) },
    );

    expect(lastStatus).toBe(400);
    expect(mockGetDowngradeInfo).not.toHaveBeenCalled();
  });

  it("GET downgrade-preview returns 400 for an invalid targetPlan", async () => {
    await DowngradeGET(
      makeRequest(
        "GET",
        "http://localhost:3000/api/admin/orgs/org-1/downgrade-preview?targetPlan=TRIAL",
      ),
      { params: Promise.resolve({ orgId: "org-1" }) },
    );

    expect(lastStatus).toBe(400);
  });

  it("GET downgrade-preview returns a friendly message when no downgrade is needed", async () => {
    mockGetDowngradeInfo.mockResolvedValue(null);

    await DowngradeGET(
      makeRequest(
        "GET",
        "http://localhost:3000/api/admin/orgs/org-1/downgrade-preview?targetPlan=ULTRA",
      ),
      { params: Promise.resolve({ orgId: "org-1" }) },
    );

    expect(lastStatus).toBe(200);
    const body = lastBody as { message: string };
    expect(body.message).toContain("No downgrade needed");
  });

  // -----------------------------------------------------------------------
  // POST cache/invalidate
  // -----------------------------------------------------------------------
  it("POST cache/invalidate invalidates the org cache", async () => {
    await CachePOST(makeRequest("POST", "http://localhost:3000/api/admin/cache/invalidate/org-1"), {
      params: Promise.resolve({ orgId: "org-1" }),
    });

    expect(lastStatus).toBe(200);
    const body = lastBody as { success: boolean; message: string };
    expect(body.success).toBe(true);
    expect(body.message).toBe("Cache invalidated");
    expect(mockInvalidateCache).toHaveBeenCalledWith("org-1");
  });

  it("POST cache/invalidate returns 404 for an unknown org", async () => {
    mockPrismaOrgFindUnique.mockResolvedValue(null);

    await CachePOST(makeRequest("POST", "http://localhost:3000/api/admin/cache/invalidate/nope"), {
      params: Promise.resolve({ orgId: "nope" }),
    });

    expect(lastStatus).toBe(404);
    expect(mockInvalidateCache).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Authorization
  // -----------------------------------------------------------------------
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await EntitlementsGET(
      makeRequest("GET", "http://localhost:3000/api/admin/orgs/org-1/entitlements"),
      {
        params: Promise.resolve({ orgId: "org-1" }),
      } as never,
    );

    expect(lastStatus).toBe(401);
    expect(mockPrismaOrgFindUnique).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin user", async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ role: "MEMBER" });

    await CachePOST(makeRequest("POST", "http://localhost:3000/api/admin/cache/invalidate/org-1"), {
      params: Promise.resolve({ orgId: "org-1" }),
    });

    expect(lastStatus).toBe(403);
    expect(mockInvalidateCache).not.toHaveBeenCalled();
  });
});
