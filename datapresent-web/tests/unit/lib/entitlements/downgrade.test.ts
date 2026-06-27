// ==========================================
// Downgrade Service Tests
// ==========================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the dependencies
vi.mock("@/lib/entitlements/feature-gate", () => ({
  getAllEntitlements: vi.fn().mockResolvedValue({
    plan: "PRO",
    features: {},
    limits: {},
    usage: {},
    resetAt: {},
  }),
  invalidateCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/entitlements/repository", () => ({
  entitlementRepository: {
    getActiveSubscription: vi.fn(),
    getPlanFeatures: vi.fn(),
    updateSubscription: vi.fn(),
  },
}));

vi.mock("@/lib/sentry", () => ({
  captureMessage: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe("downgrade service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export downgradeService", async () => {
    const mod = await import("@/lib/entitlements/downgrade");
    expect(module.downgradeService).toBeDefined();
  });

  it("should export convenience functions", async () => {
    const mod = await import("@/lib/entitlements/downgrade");
    expect(module.getDowngradePreview).toBeDefined();
    expect(module.getDowngradeInfo).toBeDefined();
    expect(module.applyDowngrade).toBeDefined();
  });

  it("should return empty array for same plan", async () => {
    const { getDowngradePreview } = await import("@/lib/entitlements/downgrade");
    const { entitlementRepository } = await import("@/lib/entitlements/repository");

    (entitlementRepository.getActiveSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
      plan: "PRO",
      status: "ACTIVE",
    });

    const result = await getDowngradePreview("org-1", "PRO");

    expect(result).toEqual([]);
  });

  it("should return null for same plan in getDowngradeInfo", async () => {
    const { getDowngradeInfo } = await import("@/lib/entitlements/downgrade");
    const { entitlementRepository } = await import("@/lib/entitlements/repository");

    (entitlementRepository.getActiveSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
      plan: "PRO",
      status: "ACTIVE",
    });

    const result = await getDowngradeInfo("org-1", "PRO");
    expect(result).toBeNull();
  });

  it("should not apply for same plan in applyDowngrade", async () => {
    const { applyDowngrade } = await import("@/lib/entitlements/downgrade");
    const { entitlementRepository } = await import("@/lib/entitlements/repository");

    (entitlementRepository.getActiveSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
      plan: "PRO",
    });

    await applyDowngrade("org-1", "PRO");

    expect(entitlementRepository.updateSubscription).not.toHaveBeenCalled();
  });
});
