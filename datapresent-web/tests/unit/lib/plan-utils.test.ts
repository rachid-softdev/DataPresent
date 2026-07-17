// ==========================================
// Plan Utils Tests
// ==========================================

import { describe, expect, it, vi } from "vitest";

// Mock env to prevent module-level schema validation at import time
vi.mock("@/env", () => ({
  env: {
    NODE_ENV: "test",
    STRIPE_SECRET_KEY: undefined,
    STRIPE_PRICE_PRO_MONTHLY: undefined,
    STRIPE_PRICE_TEAM_MONTHLY: undefined,
    STRIPE_PRICE_STARTER_MONTHLY: undefined,
  },
  isFeatureEnabled: vi.fn().mockReturnValue(false),
}));

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  report: {
    count: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
  },
  entitlementOverride: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  usageTracking: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    upsert: vi.fn(),
  },
  planFeature: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("plan-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks for feature-gate dependencies
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: "PRO",
      status: "ACTIVE",
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
    });
    mockPrisma.entitlementOverride.findMany.mockResolvedValue([]);
    mockPrisma.usageTracking.findMany.mockResolvedValue([]);
    mockPrisma.usageTracking.findUnique.mockResolvedValue(null);
    // Return plan features for reportsPerMonth (LIMIT type)
    mockPrisma.planFeature.findMany.mockImplementation((args: { where: { plan?: string } }) => {
      const plan = args?.where?.plan ?? "FREE";
      const limits: Record<string, number | null> = {
        FREE: 3,
        STARTER: 30,
        PRO: -1,
        ULTRA: null,
      };
      return Promise.resolve([
        {
          feature: { key: "reportsPerMonth", type: "LIMIT" },
          limitValue: limits[plan] !== undefined ? limits[plan] : 0,
          enabled: true,
        },
      ]);
    });
  });
  it("should export canUseFormat function", async () => {
    const { canUseFormat } = await import("@/lib/entitlements/compat");
    expect(canUseFormat).toBeDefined();
  });

  it("should check format permissions correctly", async () => {
    const { canUseFormat } = await import("@/lib/entitlements/compat");

    expect(canUseFormat("FREE", "PPTX")).toBe(true);
    expect(canUseFormat("FREE", "PDF")).toBe(false);
    expect(canUseFormat("FREE", "DOCX")).toBe(false);
    expect(canUseFormat("PRO", "PDF")).toBe(true);
    expect(canUseFormat("PRO", "DOCX")).toBe(true);
    expect(canUseFormat("PRO", "PPTX")).toBe(true);
  });

  it("should export canHaveSlideCount function", async () => {
    const { canHaveSlideCount } = await import("@/lib/entitlements/compat");
    expect(canHaveSlideCount).toBeDefined();
  });

  it("should check slide count limits", async () => {
    const { canHaveSlideCount } = await import("@/lib/entitlements/compat");

    // FREE: maxSlides = 8
    expect(canHaveSlideCount("FREE", 5).allowed).toBe(true);
    expect(canHaveSlideCount("FREE", 8).allowed).toBe(true);
    expect(canHaveSlideCount("FREE", 9).allowed).toBe(false);
    expect(canHaveSlideCount("FREE", 9).maxSlides).toBe(8);

    // STARTER: maxSlides = 20
    expect(canHaveSlideCount("STARTER", 20).allowed).toBe(true);
    expect(canHaveSlideCount("STARTER", 21).allowed).toBe(false);

    // PRO: maxSlides = 30
    expect(canHaveSlideCount("PRO", 30).allowed).toBe(true);

    // ULTRA: unlimited (-1)
    const agency = canHaveSlideCount("ULTRA", 999999);
    expect(agency.allowed).toBe(true);
    expect(agency.maxSlides).toBe(-1);
  });

  it("should export getUserPlan function", async () => {
    const { getUserPlan } = await import("@/lib/entitlements/compat");
    expect(getUserPlan).toBeDefined();
  });

  it("should return FREE plan when user has no membership", async () => {
    const { getUserPlan } = await import("@/lib/entitlements/compat");

    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await getUserPlan("user-123");

    expect(result.plan).toBe("FREE");
    expect(result.orgId).toBe("");
  });

  it("should return plan from subscription", async () => {
    const { getUserPlan } = await import("@/lib/entitlements/compat");

    mockPrisma.user.findUnique.mockResolvedValue({
      membership: [
        {
          orgId: "org-1",
          org: {
            subscription: { plan: "PRO" },
          },
        },
      ],
    });

    const result = await getUserPlan("user-123");

    expect(result.plan).toBe("PRO");
    expect(result.orgId).toBe("org-1");
  });

  it("should export canCreateReport function", async () => {
    const { canCreateReport } = await import("@/lib/entitlements/compat");
    expect(canCreateReport).toBeDefined();
  });

  it("should allow report creation when under limit", async () => {
    const { canCreateReport } = await import("@/lib/entitlements/compat");

    mockPrisma.user.findUnique.mockResolvedValue({
      membership: [
        {
          orgId: "org-1",
          org: {
            subscription: { plan: "PRO" },
          },
        },
      ],
    });
    mockPrisma.usageTracking.findFirst.mockResolvedValue({
      usageCount: 5,
      periodEnd: new Date("2099-12-31"),
    });

    const result = await canCreateReport("user-123");

    expect(result.allowed).toBe(true);
  });

  it("should deny report creation when at limit", async () => {
    const { canCreateReport } = await import("@/lib/entitlements/compat");

    mockPrisma.user.findUnique.mockResolvedValue({
      membership: [
        {
          orgId: "org-1",
          org: {
            subscription: { plan: "FREE" },
          },
        },
      ],
    });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: "FREE",
      status: "ACTIVE",
    });
    mockPrisma.usageTracking.findFirst.mockResolvedValue({
      usageCount: 3,
      periodEnd: new Date("2099-12-31"),
    });

    const result = await canCreateReport("user-123");

    expect(result.allowed).toBe(false);
    expect(result.upgrade).toBe(true);
    expect(result.reason).toContain("3");
  });

  it("should allow unlimited reports for -1 limit plans", async () => {
    const { canCreateReport } = await import("@/lib/entitlements/compat");

    mockPrisma.user.findUnique.mockResolvedValue({
      membership: [
        {
          orgId: "org-1",
          org: {
            subscription: { plan: "ULTRA" },
          },
        },
      ],
    });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: "ULTRA",
      status: "ACTIVE",
    });

    const result = await canCreateReport("user-123");

    expect(result.allowed).toBe(true);
  });

  it("should export getRemainingReports function", async () => {
    const { getRemainingReports } = await import("@/lib/entitlements/compat");
    expect(getRemainingReports).toBeDefined();
  });

  it("should return -1 for unlimited plans", async () => {
    const { getRemainingReports } = await import("@/lib/entitlements/compat");

    mockPrisma.user.findUnique.mockResolvedValue({
      membership: [
        {
          orgId: "org-1",
          org: {
            subscription: { plan: "ULTRA" },
          },
        },
      ],
    });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: "ULTRA",
      status: "ACTIVE",
    });

    const result = await getRemainingReports("user-123");

    expect(result.remaining).toBe(-1);
    expect(result.total).toBe(-1);
  });
});
