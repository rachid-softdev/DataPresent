// @vitest-environment node
// ==========================================
// Admin API — /api/admin/plans unit tests
// ==========================================
//
// Covers the plans endpoints:
// - GET  returns the 4 plans (FREE/STARTER/PRO/ULTRA) with their features
// - POST validates planKey/featureKey and upserts a plan feature mapping
// - 400/404 on invalid inputs
// - 401/403 authorization via withAdmin (guarded by lib/admin tests)

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------
const mockAuth = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockExtractClientIP = vi.hoisted(() => vi.fn());
const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaFeatureFindMany = vi.hoisted(() => vi.fn());
const mockPrismaFeatureFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaPlanFeatureUpsert = vi.hoisted(() => vi.fn());
const mockGetPlanFeatures = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/client-ip", () => ({
  extractClientIP: mockExtractClientIP,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockPrismaUserFindUnique,
    },
    feature: {
      findMany: mockPrismaFeatureFindMany,
      findUnique: mockPrismaFeatureFindUnique,
    },
    planFeature: {
      upsert: mockPrismaPlanFeatureUpsert,
    },
  },
}));

vi.mock("@/lib/entitlements/repository", () => ({
  entitlementRepository: {
    getPlanFeatures: mockGetPlanFeatures,
  },
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

import { GET, POST } from "@/app/api/admin/plans/route";

function makeRequest(method: "GET" | "POST", body?: unknown): Request {
  return new Request("http://localhost:3000/api/admin/plans", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("Admin API — /api/admin/plans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus = undefined;
    lastBody = undefined;

    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mockPrismaUserFindUnique.mockResolvedValue({ role: "ADMIN" });
    mockCheckRateLimit.mockResolvedValue(true);
    mockExtractClientIP.mockReturnValue("1.2.3.4");

    mockPrismaFeatureFindMany.mockResolvedValue([
      { id: "f1", key: "reportsPerMonth", isActive: true, type: "LIMIT" },
      { id: "f2", key: "watermark", isActive: true, type: "BOOLEAN" },
    ]);

    mockPrismaFeatureFindUnique.mockResolvedValue({ id: "f1", key: "reportsPerMonth" });

    mockGetPlanFeatures.mockResolvedValue([
      {
        featureId: "f1",
        enabled: true,
        limitValue: 3,
        configJson: null,
        downgradeStrategy: "GRACEFUL",
      },
    ]);

    mockPrismaPlanFeatureUpsert.mockResolvedValue({
      id: "pf-1",
      plan: "FREE",
      featureId: "f1",
      enabled: true,
      limitValue: 3,
      configJson: null,
      downgradeStrategy: "GRACEFUL",
    });
  });

  // -----------------------------------------------------------------------
  // GET
  // -----------------------------------------------------------------------
  it("GET returns the 4 plan keys in the correct order", async () => {
    await GET(makeRequest("GET"));

    expect(lastStatus).toBe(200);
    const data = (lastBody as { data: { plan: string }[] }).data;
    expect(data.map((p) => p.plan)).toEqual(["FREE", "STARTER", "PRO", "ULTRA"]);
  });

  it("GET maps each feature with enabled/limitValue/downgradeStrategy", async () => {
    await GET(makeRequest("GET"));

    expect(lastStatus).toBe(200);
    const data = (lastBody as { data: { plan: string; features: unknown[] }[] }).data;

    for (const plan of data) {
      expect(plan.features.length).toBe(2);
      const reports = plan.features[0] as {
        featureKey: string;
        enabled: boolean;
        limitValue: number | null;
        downgradeStrategy: string;
      };
      expect(reports.featureKey).toBe("reportsPerMonth");
      expect(reports.downgradeStrategy).toBe("GRACEFUL");
      expect(reports).toHaveProperty("limitValue");
      expect(reports).toHaveProperty("configJson");
    }
  });

  it("GET defaults to disabled features for plans without a mapping", async () => {
    await GET(makeRequest("GET"));

    const data = (lastBody as { data: { features: { featureKey: string; enabled: boolean }[] }[] })
      .data;
    const free = data.find((p) => p.plan === "FREE")!;
    const watermark = free.features.find((f) => f.featureKey === "watermark")!;
    expect(watermark.enabled).toBe(false);
    expect(watermark.limitValue).toBeNull();
  });

  // -----------------------------------------------------------------------
  // POST
  // -----------------------------------------------------------------------
  it("POST upserts a plan feature mapping for a valid plan + feature", async () => {
    await POST(
      makeRequest("POST", { planKey: "FREE", featureKey: "reportsPerMonth", enabled: true }),
    );

    expect(lastStatus).toBe(200);
    expect(mockPrismaPlanFeatureUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          plan_featureId: { plan: "FREE", featureId: "f1" },
        },
      }),
    );
  });

  it("POST returns 400 when planKey or featureKey are missing", async () => {
    await POST(makeRequest("POST", { planKey: "FREE" }));

    expect(lastStatus).toBe(400);
    expect(mockPrismaPlanFeatureUpsert).not.toHaveBeenCalled();
  });

  it("POST returns 400 for an invalid plan", async () => {
    await POST(makeRequest("POST", { planKey: "TRIAL", featureKey: "watermark" }));

    expect(lastStatus).toBe(400);
    expect(mockPrismaPlanFeatureUpsert).not.toHaveBeenCalled();
  });

  it("POST returns 404 when the feature key does not exist", async () => {
    mockPrismaFeatureFindUnique.mockResolvedValue(null);

    await POST(makeRequest("POST", { planKey: "FREE", featureKey: "ghost_feature" }));

    expect(lastStatus).toBe(404);
    expect(mockPrismaPlanFeatureUpsert).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Authorization (through withAdmin)
  // -----------------------------------------------------------------------
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await GET(makeRequest("GET"));

    expect(lastStatus).toBe(401);
    expect(mockPrismaFeatureFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin user", async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ role: "MEMBER" });

    await POST(makeRequest("POST", { planKey: "FREE", featureKey: "watermark" }));

    expect(lastStatus).toBe(403);
    expect(mockPrismaPlanFeatureUpsert).not.toHaveBeenCalled();
  });
});
