// ==========================================
// FeatureGateService - Regression Tests for Fixed Bugs
// In-memory fake repository. No database required.
// ==========================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory store shared between the test helpers and the mocked repository.
// vi.hoisted guarantees it is created BEFORE the vi.mock factory runs.
const store = vi.hoisted(() => ({
  subscription: null as any,
  planFeatures: [] as any[],
  overrides: [] as any[],
  usage: [] as any[],
}));

const mockCache = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  invalidate: vi.fn().mockResolvedValue(undefined),
  isRedisAvailable: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/entitlements/cache", () => ({
  entitlementsCache: mockCache,
}));

vi.mock("@/lib/entitlements/repository", () => {
  const repository = {
    getActiveSubscription: vi.fn(async (_orgId: string) => store.subscription),
    getFeature: vi.fn(async () => null),
    getPlanFeatures: vi.fn(async (plan: any) =>
      store.planFeatures.filter((pf: any) => pf.plan === plan),
    ),
    getAllPlanFeatures: vi.fn(async () => store.planFeatures),
    getUserOverride: vi.fn(async () => null),
    getOrgOverrides: vi.fn(async () => []),
    // Return matching scope overrides WITHOUT expiry filtering — the service
    // applies its own `isOverrideValid` check, which is what we want to test.
    getAllOverrides: vi.fn(async (orgId: string, userId?: string) =>
      store.overrides.filter(
        (o: any) =>
          (o.scope === "ORG" && o.scopeId === orgId) ||
          (o.scope === "USER" && userId != null && o.scopeId === userId),
      ),
    ),
    getUsage: vi.fn(async (orgId: string, featureKey: string) => {
      const rec = store.usage.find((u: any) => u.orgId === orgId && u.featureKey === featureKey);
      return rec ?? null;
    }),
    getAllUsage: vi.fn(async (orgId: string) => store.usage.filter((u: any) => u.orgId === orgId)),
    // Functional in-memory atomic consume so `consume` behaves deterministically.
    consumeUsage: vi.fn(
      async (orgId: string, featureKey: string, amount: number, limit: number | null) => {
        const now = new Date();
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        let rec = store.usage.find((u: any) => u.orgId === orgId && u.featureKey === featureKey);
        if (!rec) {
          if (limit !== null && amount > limit) {
            return {
              success: false,
              error: "LIMIT_REACHED",
              featureKey,
              limit,
              used: 0,
              resetAt: periodEnd,
            };
          }
          rec = { orgId, featureKey, usageCount: 0, periodStart: now, periodEnd };
          store.usage.push(rec);
        }
        const newUsage = rec.usageCount + amount;
        if (limit !== null && newUsage > limit) {
          return {
            success: false,
            error: "LIMIT_REACHED",
            featureKey,
            limit,
            used: rec.usageCount,
            resetAt: rec.periodEnd,
          };
        }
        rec.usageCount = newUsage;
        return {
          success: true,
          featureKey,
          previousUsage: newUsage - amount,
          newUsage,
          limit,
          remaining: limit !== null ? limit - newUsage : null,
        };
      },
    ),
    isEventProcessed: vi.fn(async () => false),
    markEventProcessed: vi.fn(async () => undefined),
    createOverride: vi.fn(async () => ({})),
    deleteOverride: vi.fn(async () => undefined),
    updateSubscription: vi.fn(async () => ({})),
  };
  return { entitlementRepository: repository };
});

// Import the convenience functions + singleton under test (after mocks are registered).
import {
  featureGateService,
  hasFeature,
  getLimit,
  canConsume,
  consume,
  getDebugTrace,
} from "@/lib/entitlements/feature-gate";

// ==========================================
// Test helpers
// ==========================================

const ORG = "org-1";
const USER = "user-1";

function setSubscription(plan: string, status = "ACTIVE") {
  store.subscription = { plan, status };
}

function addPlanFeature(
  plan: string,
  key: string,
  type: "BOOLEAN" | "LIMIT" | "EXPERIMENT",
  enabled: boolean,
  limitValue: number | null = null,
) {
  store.planFeatures.push({ plan, feature: { key, type }, enabled, limitValue, configJson: null });
}

function addOverride(override: any) {
  store.overrides.push({ id: `ov-${store.overrides.length}`, ...override });
}

function setUsage(orgId: string, featureKey: string, usageCount: number) {
  store.usage.push({
    orgId,
    featureKey,
    usageCount,
    periodStart: new Date(),
    periodEnd: new Date("2099-12-31"),
  });
}

// ==========================================
// Tests
// ==========================================

describe("feature-gate.bugs (regression for fixed bugs)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.subscription = null;
    store.planFeatures = [];
    store.overrides = [];
    store.usage = [];
  });

  // ----------------------------------------------------------
  // 1. getDebugTrace uses the org's REAL plan/overrides
  // ----------------------------------------------------------
  describe("getDebugTrace uses real plan/overrides", () => {
    it("resolves EXPORT_PDF against PRO plan, not FREE (bug fix)", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "EXPORT_PDF", "BOOLEAN", true);

      const trace = await getDebugTrace(ORG, "EXPORT_PDF");

      expect(trace.planKey).toBe("PRO");
      expect(trace.resolvedVia).toBe("plan");
    });

    it("reflects a USER override in the debug trace", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "EXPORT_PDF", "BOOLEAN", true);
      addOverride({
        scope: "USER",
        scopeId: USER,
        featureKey: "EXPORT_PDF",
        enabled: true,
        limitValue: null,
        expiresAt: null,
      });

      const trace = await getDebugTrace(ORG, "EXPORT_PDF", USER);

      expect(trace.resolvedVia).toBe("user_override");
    });
  });

  // ----------------------------------------------------------
  // 2. getLimit returns null for non-LIMIT features
  // ----------------------------------------------------------
  describe("getLimit returns null for non-LIMIT features", () => {
    it("returns null for a BOOLEAN feature", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "EXPORT_PDF", "BOOLEAN", true);

      const limit = await getLimit(ORG, "EXPORT_PDF");

      expect(limit).toBeNull();
    });

    it("returns the numeric value for a LIMIT feature", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "REPORTS_PER_MONTH", "LIMIT", true, 30);

      const limit = await getLimit(ORG, "REPORTS_PER_MONTH");

      expect(limit).toBe(30);
    });

    it("returns null for an unlimited LIMIT feature (limitValue null)", async () => {
      setSubscription("ULTRA");
      addPlanFeature("ULTRA", "REPORTS_PER_MONTH", "LIMIT", true, null);

      const limit = await getLimit(ORG, "REPORTS_PER_MONTH");

      expect(limit).toBeNull();
    });

    it("returns null for an unlimited LIMIT feature (limitValue -1 normalized)", async () => {
      setSubscription("ULTRA");
      addPlanFeature("ULTRA", "REPORTS_PER_MONTH", "LIMIT", true, -1);

      const limit = await getLimit(ORG, "REPORTS_PER_MONTH");

      expect(limit).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // 3. Override limitValue is applied
  // ----------------------------------------------------------
  describe("override limitValue is applied", () => {
    it("USER override limitValue: getLimit returns 100 and hasFeature treats it as LIMIT", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "REPORTS_PER_MONTH", "LIMIT", true, 30);
      addOverride({
        scope: "USER",
        scopeId: USER,
        featureKey: "REPORTS_PER_MONTH",
        enabled: true,
        limitValue: 100,
        expiresAt: null,
      });

      const limit = await getLimit(ORG, "REPORTS_PER_MONTH", USER);
      const enabled = await hasFeature(ORG, "REPORTS_PER_MONTH", USER);

      expect(limit).toBe(100);
      expect(enabled).toBe(true); // LIMIT features are always "available"
    });

    it("USER override enabled:false forces the feature off", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "EXPORT_PDF", "BOOLEAN", true); // plan enables it
      addOverride({
        scope: "USER",
        scopeId: USER,
        featureKey: "EXPORT_PDF",
        enabled: false,
        limitValue: null,
        expiresAt: null,
      });

      const enabled = await hasFeature(ORG, "EXPORT_PDF", USER);
      const limit = await getLimit(ORG, "EXPORT_PDF", USER);

      expect(enabled).toBe(false);
      expect(limit).toBeNull();
    });

    it("ORG override limitValue is applied to getLimit", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "REPORTS_PER_MONTH", "LIMIT", true, 30);
      addOverride({
        scope: "ORG",
        scopeId: ORG,
        featureKey: "REPORTS_PER_MONTH",
        enabled: true,
        limitValue: 50,
        expiresAt: null,
      });

      const limit = await getLimit(ORG, "REPORTS_PER_MONTH");

      expect(limit).toBe(50);
    });
  });

  // ----------------------------------------------------------
  // 4. canConsume / consume reject invalid amounts
  // ----------------------------------------------------------
  describe("canConsume/consume reject invalid amounts", () => {
    it("canConsume returns false for amount 0", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "REPORTS_PER_MONTH", "LIMIT", true, 30);

      expect(await canConsume(ORG, "REPORTS_PER_MONTH", 0)).toBe(false);
    });

    it("canConsume returns false for negative amount", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "REPORTS_PER_MONTH", "LIMIT", true, 30);

      expect(await canConsume(ORG, "REPORTS_PER_MONTH", -5)).toBe(false);
    });

    it("canConsume returns false for NaN amount", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "REPORTS_PER_MONTH", "LIMIT", true, 30);

      expect(await canConsume(ORG, "REPORTS_PER_MONTH", NaN)).toBe(false);
    });

    it("consume returns INVALID_AMOUNT for amount 0", async () => {
      const result = await consume(ORG, "REPORTS_PER_MONTH", 0);

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe("INVALID_AMOUNT");
    });

    it("consume returns INVALID_AMOUNT for negative amount", async () => {
      const result = await consume(ORG, "REPORTS_PER_MONTH", -5);

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe("INVALID_AMOUNT");
    });

    it("consume returns INVALID_AMOUNT for NaN amount", async () => {
      const result = await consume(ORG, "REPORTS_PER_MONTH", NaN);

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe("INVALID_AMOUNT");
    });

    it("consume proceeds normally for a valid positive amount", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "REPORTS_PER_MONTH", "LIMIT", true, 30);

      const result = await consume(ORG, "REPORTS_PER_MONTH", 5);

      expect(result.success).toBe(true);
      if (result.success) expect(result.newUsage).toBe(5);
    });
  });

  // ----------------------------------------------------------
  // 5. Override priority + expiry
  // ----------------------------------------------------------
  describe("override priority and expiry", () => {
    it("USER override beats ORG override beats plan feature", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "EXPORT_PDF", "BOOLEAN", true); // plan: enabled
      addOverride({
        scope: "ORG",
        scopeId: ORG,
        featureKey: "EXPORT_PDF",
        enabled: false, // org says off
        limitValue: null,
        expiresAt: null,
      });
      addOverride({
        scope: "USER",
        scopeId: USER,
        featureKey: "EXPORT_PDF",
        enabled: true, // user says on
        limitValue: null,
        expiresAt: null,
      });

      // User wins over ORG
      expect(await hasFeature(ORG, "EXPORT_PDF", USER)).toBe(true);
      // ORG wins over plan
      expect(await hasFeature(ORG, "EXPORT_PDF")).toBe(false);
    });

    it("ORG override beats the plan feature", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "EXPORT_PDF", "BOOLEAN", false); // plan: disabled
      addOverride({
        scope: "ORG",
        scopeId: ORG,
        featureKey: "EXPORT_PDF",
        enabled: true, // org enables it
        limitValue: null,
        expiresAt: null,
      });

      expect(await hasFeature(ORG, "EXPORT_PDF")).toBe(true);
    });

    it("expired override is ignored and falls through to plan", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "EXPORT_PDF", "BOOLEAN", true); // plan: enabled
      addOverride({
        scope: "USER",
        scopeId: USER,
        featureKey: "EXPORT_PDF",
        enabled: false, // would disable, but expired
        limitValue: null,
        expiresAt: new Date("2020-01-01"),
      });

      expect(await hasFeature(ORG, "EXPORT_PDF", USER)).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // 6. Edge cases
  // ----------------------------------------------------------
  describe("edge cases", () => {
    it("fallback (feature in no plan): hasFeature false, getLimit null", async () => {
      setSubscription("PRO");
      // No plan features registered for EXPORT_PDF

      const enabled = await hasFeature(ORG, "EXPORT_PDF");
      const limit = await getLimit(ORG, "EXPORT_PDF");

      expect(enabled).toBe(false);
      expect(limit).toBeNull();
    });

    it("LIMIT feature with limitValue 0: hasFeature true (feature exists)", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "REPORTS_PER_MONTH", "LIMIT", true, 0);

      const enabled = await hasFeature(ORG, "REPORTS_PER_MONTH");

      expect(enabled).toBe(true);
    });

    it("LIMIT feature with limitValue 0: canConsume false for positive amount", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "REPORTS_PER_MONTH", "LIMIT", true, 0);

      const allowed = await canConsume(ORG, "REPORTS_PER_MONTH", 1);

      expect(allowed).toBe(false);
    });

    it("canConsume false when usage already at limit", async () => {
      setSubscription("PRO");
      addPlanFeature("PRO", "REPORTS_PER_MONTH", "LIMIT", true, 10);
      setUsage(ORG, "REPORTS_PER_MONTH", 10); // already at limit

      const allowed = await canConsume(ORG, "REPORTS_PER_MONTH", 1);

      expect(allowed).toBe(false);
    });
  });
});
