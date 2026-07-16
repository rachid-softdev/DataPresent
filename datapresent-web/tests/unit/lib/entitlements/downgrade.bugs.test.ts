// ==========================================
// Downgrade Service - Regression / Bug Tests
// ==========================================
//
// Deterministic, in-memory tests for DowngradeService. No database.
// Mocks: @/lib/entitlements/repository, @/lib/entitlements/feature-gate,
//        @/lib/sentry, @/lib/prisma.

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (hoisted above imports by vitest) -------------------------

vi.mock("@/lib/entitlements/repository", () => ({
  entitlementRepository: {
    getActiveSubscription: vi.fn(),
    getPlanFeatures: vi.fn(),
    updateSubscription: vi.fn(),
  },
}));

vi.mock("@/lib/entitlements/feature-gate", () => ({
  getAllEntitlements: vi.fn(),
  invalidateCache: vi.fn(),
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

// --- Imports (after mocks are installed) -----------------------------

import { downgradeService } from "@/lib/entitlements/downgrade";
import { entitlementRepository } from "@/lib/entitlements/repository";
import { getAllEntitlements, invalidateCache } from "@/lib/entitlements/feature-gate";
import { captureMessage } from "@/lib/sentry";

// --- Fixture builders -------------------------------------------------

type Strategy = "IMMEDIATE" | "GRACEFUL" | "FREEZE";
type FeatureType = "BOOLEAN" | "LIMIT";

interface FeatureConfig {
  key: string;
  enabled: boolean;
  limitValue: number | null;
  type: FeatureType;
  downgradeStrategy: Strategy;
}

// PRO plan: EXPORT_PDF enabled, REPORTS_PER_MONTH limit 30, COLLABORATION enabled,
//          AI_CREDITS limit 100.
const PRO_CONFIGS: FeatureConfig[] = [
  {
    key: "EXPORT_PDF",
    enabled: true,
    limitValue: null,
    type: "BOOLEAN",
    downgradeStrategy: "IMMEDIATE",
  },
  {
    key: "REPORTS_PER_MONTH",
    enabled: true,
    limitValue: 30,
    type: "LIMIT",
    downgradeStrategy: "IMMEDIATE",
  },
  {
    key: "COLLABORATION",
    enabled: true,
    limitValue: null,
    type: "BOOLEAN",
    downgradeStrategy: "IMMEDIATE",
  },
  {
    key: "AI_CREDITS",
    enabled: true,
    limitValue: 100,
    type: "LIMIT",
    downgradeStrategy: "IMMEDIATE",
  },
];

// STARTER plan: EXPORT_PDF enabled, REPORTS_PER_MONTH limit 10, COLLABORATION DISABLED,
//              AI_CREDITS DISABLED.
const STARTER_CONFIGS: FeatureConfig[] = [
  {
    key: "EXPORT_PDF",
    enabled: true,
    limitValue: null,
    type: "BOOLEAN",
    downgradeStrategy: "IMMEDIATE",
  },
  {
    key: "REPORTS_PER_MONTH",
    enabled: true,
    limitValue: 10,
    type: "LIMIT",
    downgradeStrategy: "IMMEDIATE",
  },
  {
    key: "COLLABORATION",
    enabled: false,
    limitValue: null,
    type: "BOOLEAN",
    downgradeStrategy: "IMMEDIATE",
  },
  {
    key: "AI_CREDITS",
    enabled: false,
    limitValue: null,
    type: "LIMIT",
    downgradeStrategy: "IMMEDIATE",
  },
];

// ULTRA plan: everything enabled, WHITE_LABEL + API_ACCESS enabled, limits null (unlimited).
const ULTRA_CONFIGS: FeatureConfig[] = [
  {
    key: "EXPORT_PDF",
    enabled: true,
    limitValue: null,
    type: "BOOLEAN",
    downgradeStrategy: "IMMEDIATE",
  },
  {
    key: "REPORTS_PER_MONTH",
    enabled: true,
    limitValue: null,
    type: "LIMIT",
    downgradeStrategy: "IMMEDIATE",
  },
  {
    key: "COLLABORATION",
    enabled: true,
    limitValue: null,
    type: "BOOLEAN",
    downgradeStrategy: "IMMEDIATE",
  },
  {
    key: "AI_CREDITS",
    enabled: true,
    limitValue: null,
    type: "LIMIT",
    downgradeStrategy: "IMMEDIATE",
  },
  {
    key: "WHITE_LABEL",
    enabled: true,
    limitValue: null,
    type: "BOOLEAN",
    downgradeStrategy: "IMMEDIATE",
  },
  {
    key: "API_ACCESS",
    enabled: true,
    limitValue: null,
    type: "BOOLEAN",
    downgradeStrategy: "IMMEDIATE",
  },
];

const PLAN_CONFIGS: Record<string, FeatureConfig[]> = {
  FREE: [],
  STARTER: STARTER_CONFIGS,
  PRO: PRO_CONFIGS,
  ULTRA: ULTRA_CONFIGS,
};

function buildPlanFeatures(plan: string, configs: FeatureConfig[]): any[] {
  return configs.map((c) => ({
    id: `${plan}-${c.key}`,
    plan,
    featureId: `feat-${c.key}`,
    enabled: c.enabled,
    limitValue: c.limitValue,
    configJson: null,
    downgradeStrategy: c.downgradeStrategy,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    feature: {
      id: `feat-${c.key}`,
      key: c.key,
      name: c.key,
      description: null,
      type: c.type,
      isActive: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
  }));
}

// Returns fresh feature objects for a plan, optionally overriding the
// downgradeStrategy of specific features (used to simulate GRACEFUL/FREEZE).
function featuresForPlan(plan: string, strategyOverrides: Record<string, Strategy> = {}): any[] {
  const configs = (PLAN_CONFIGS[plan] ?? []).map((c) =>
    strategyOverrides[c.key] ? { ...c, downgradeStrategy: strategyOverrides[c.key] } : c,
  );
  return buildPlanFeatures(plan, configs);
}

// In-memory state (no DB). Reset per test.
const store: {
  subscription: any;
  usage: Record<string, number>;
} = {
  subscription: { plan: "PRO", status: "ACTIVE", currentPeriodEnd: null },
  usage: {},
};

const DAY_MS = 1000 * 60 * 60 * 24;

// --- Global mock setup -------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  store.subscription = { plan: "PRO", status: "ACTIVE", currentPeriodEnd: null };
  store.usage = {};

  (entitlementRepository.getActiveSubscription as any).mockImplementation(
    async () => store.subscription,
  );

  (entitlementRepository.getPlanFeatures as any).mockImplementation(async (plan: string) =>
    featuresForPlan(plan),
  );

  (entitlementRepository.updateSubscription as any).mockResolvedValue(undefined);

  (getAllEntitlements as any).mockResolvedValue({
    plan: "PRO",
    status: "ACTIVE",
    features: {},
    limits: {},
    usage: store.usage,
    resetAt: {},
  });

  (invalidateCache as any).mockResolvedValue(undefined);
  (captureMessage as any).mockResolvedValue(undefined);
});

// ======================================================================
// 1. Plan priority ordering
// ======================================================================

describe("plan priority ordering", () => {
  it("PRO -> STARTER is a downgrade: non-empty preview and non-null info", async () => {
    const preview = await downgradeService.getDowngradePreview("org-1", "STARTER");
    expect(preview.length).toBeGreaterThan(0);

    const info = await downgradeService.getDowngradeInfo("org-1", "STARTER");
    expect(info).not.toBeNull();
    expect(info!.currentPlan).toBe("PRO");
    expect(info!.targetPlan).toBe("STARTER");
  });

  it("STARTER -> PRO is NOT a downgrade: [] preview and null info", async () => {
    store.subscription = { plan: "STARTER", status: "ACTIVE", currentPeriodEnd: null };

    const preview = await downgradeService.getDowngradePreview("org-1", "PRO");
    expect(preview).toEqual([]);

    const info = await downgradeService.getDowngradeInfo("org-1", "PRO");
    expect(info).toBeNull();
  });

  it("same plan (PRO -> PRO) returns [] preview and null info", async () => {
    const preview = await downgradeService.getDowngradePreview("org-1", "PRO");
    expect(preview).toEqual([]);

    const info = await downgradeService.getDowngradeInfo("org-1", "PRO");
    expect(info).toBeNull();
  });

  it("PRO -> ULTRA (higher plan) returns [] preview and null info", async () => {
    const preview = await downgradeService.getDowngradePreview("org-1", "ULTRA");
    expect(preview).toEqual([]);

    const info = await downgradeService.getDowngradeInfo("org-1", "ULTRA");
    expect(info).toBeNull();
  });
});

// ======================================================================
// 2. Preview lists lost features
// ======================================================================

describe("preview lists lost features", () => {
  beforeEach(() => {
    store.subscription = { plan: "PRO", status: "ACTIVE", currentPeriodEnd: null };
  });

  it("PRO -> STARTER: COLLABORATION willBeEnabled=false reason=plan_downgrade; EXPORT_PDF stays enabled", async () => {
    const preview = await downgradeService.getDowngradePreview("org-1", "STARTER");

    const collab = preview.find((p) => p.featureKey === "COLLABORATION");
    expect(collab).toBeDefined();
    expect(collab!.currentlyEnabled).toBe(true);
    expect(collab!.willBeEnabled).toBe(false);
    expect(collab!.reason).toBe("plan_downgrade");

    const pdf = preview.find((p) => p.featureKey === "EXPORT_PDF");
    expect(pdf).toBeDefined();
    expect(pdf!.willBeEnabled).toBe(true);
  });
});

// ======================================================================
// 3. limit_exceeded reason
// ======================================================================

describe("limit_exceeded reason", () => {
  beforeEach(() => {
    store.subscription = { plan: "PRO", status: "ACTIVE", currentPeriodEnd: null };
    store.usage = { REPORTS_PER_MONTH: 25 };
  });

  it("PRO -> STARTER: REPORTS_PER_MONTH reason=limit_exceeded when usage 25 exceeds target limit 10", async () => {
    (getAllEntitlements as any).mockResolvedValue({
      plan: "PRO",
      status: "ACTIVE",
      features: {},
      limits: {},
      usage: { REPORTS_PER_MONTH: 25 },
      resetAt: {},
    });

    const preview = await downgradeService.getDowngradePreview("org-1", "STARTER");

    const rep = preview.find((p) => p.featureKey === "REPORTS_PER_MONTH");
    expect(rep).toBeDefined();
    expect(rep!.currentlyEnabled).toBe(true);
    // Feature stays enabled in STARTER but is now over its tighter limit.
    expect(rep!.willBeEnabled).toBe(true);
    expect(rep!.reason).toBe("limit_exceeded");
  });

  it("PRO -> STARTER: usage of 5 (under limit 10) yields plan_downgrade, not limit_exceeded", async () => {
    (getAllEntitlements as any).mockResolvedValue({
      plan: "PRO",
      status: "ACTIVE",
      features: {},
      limits: {},
      usage: { REPORTS_PER_MONTH: 5 },
      resetAt: {},
    });

    const preview = await downgradeService.getDowngradePreview("org-1", "STARTER");
    const rep = preview.find((p) => p.featureKey === "REPORTS_PER_MONTH");
    expect(rep!.reason).toBe("plan_downgrade");
  });
});

// ======================================================================
// 4. getDowngradeInfo effectiveDate
// ======================================================================

describe("getDowngradeInfo effectiveDate", () => {
  it("no GRACEFUL feature -> effectiveDate null even when currentPeriodEnd is set", async () => {
    store.subscription = {
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2030-01-01T00:00:00Z"),
    };

    const info = await downgradeService.getDowngradeInfo("org-1", "STARTER");
    expect(info).not.toBeNull();
    expect(info!.effectiveDate).toBeNull();
  });

  it("GRACEFUL target feature + currentPeriodEnd set -> effectiveDate equals currentPeriodEnd", async () => {
    store.subscription = {
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2030-01-01T00:00:00Z"),
    };
    (entitlementRepository.getPlanFeatures as any).mockImplementation(async (plan: string) =>
      plan === "STARTER"
        ? featuresForPlan("STARTER", { COLLABORATION: "GRACEFUL" })
        : featuresForPlan(plan),
    );

    const info = await downgradeService.getDowngradeInfo("org-1", "STARTER");
    expect(info).not.toBeNull();
    expect(info!.effectiveDate).toEqual(new Date("2030-01-01T00:00:00Z"));
  });

  it("GRACEFUL target feature but currentPeriodEnd null -> effectiveDate null", async () => {
    store.subscription = { plan: "PRO", status: "ACTIVE", currentPeriodEnd: null };
    (entitlementRepository.getPlanFeatures as any).mockImplementation(async (plan: string) =>
      plan === "STARTER"
        ? featuresForPlan("STARTER", { COLLABORATION: "GRACEFUL" })
        : featuresForPlan(plan),
    );

    const info = await downgradeService.getDowngradeInfo("org-1", "STARTER");
    expect(info).not.toBeNull();
    expect(info!.effectiveDate).toBeNull();
  });

  it("only FREEZE target features -> effectiveDate null even when currentPeriodEnd set", async () => {
    store.subscription = {
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2030-01-01T00:00:00Z"),
    };
    (entitlementRepository.getPlanFeatures as any).mockImplementation(async (plan: string) =>
      plan === "STARTER"
        ? featuresForPlan("STARTER", { COLLABORATION: "FREEZE" })
        : featuresForPlan(plan),
    );

    const info = await downgradeService.getDowngradeInfo("org-1", "STARTER");
    expect(info).not.toBeNull();
    expect(info!.effectiveDate).toBeNull();
  });
});

// ======================================================================
// 5. applyDowngrade strategies
// ======================================================================

describe("applyDowngrade strategies", () => {
  beforeEach(() => {
    store.subscription = { plan: "PRO", status: "ACTIVE", currentPeriodEnd: null };
  });

  it("IMMEDIATE: updateSubscription called with { plan: target } and invalidateCache called", async () => {
    await downgradeService.applyDowngrade("org-1", "STARTER");

    expect(entitlementRepository.updateSubscription).toHaveBeenCalledTimes(1);
    expect(entitlementRepository.updateSubscription).toHaveBeenCalledWith("org-1", {
      plan: "STARTER",
    });
    expect(invalidateCache).toHaveBeenCalledWith("org-1");
    expect(captureMessage).toHaveBeenCalled();
  });

  it("GRACEFUL: updateSubscription NOT called; only captureMessage logged", async () => {
    (entitlementRepository.getPlanFeatures as any).mockImplementation(async (plan: string) =>
      plan === "STARTER"
        ? featuresForPlan("STARTER", { COLLABORATION: "GRACEFUL" })
        : featuresForPlan(plan),
    );

    await downgradeService.applyDowngrade("org-1", "STARTER");

    expect(entitlementRepository.updateSubscription).not.toHaveBeenCalled();
    expect(invalidateCache).not.toHaveBeenCalled();
    expect(captureMessage).toHaveBeenCalled();
  });

  it("FREEZE: updateSubscription NOT called; only captureMessage logged", async () => {
    (entitlementRepository.getPlanFeatures as any).mockImplementation(async (plan: string) =>
      plan === "STARTER"
        ? featuresForPlan("STARTER", { COLLABORATION: "FREEZE" })
        : featuresForPlan(plan),
    );

    await downgradeService.applyDowngrade("org-1", "STARTER");

    expect(entitlementRepository.updateSubscription).not.toHaveBeenCalled();
    expect(invalidateCache).not.toHaveBeenCalled();
    expect(captureMessage).toHaveBeenCalled();
  });

  it("no-op when target >= current: updateSubscription NOT called (same plan)", async () => {
    await downgradeService.applyDowngrade("org-1", "PRO");
    expect(entitlementRepository.updateSubscription).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("no-op when target > current: updateSubscription NOT called (PRO -> ULTRA)", async () => {
    await downgradeService.applyDowngrade("org-1", "ULTRA");
    expect(entitlementRepository.updateSubscription).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("overrideStrategy FREEZE forces freeze regardless of feature strategies", async () => {
    await downgradeService.applyDowngrade("org-1", "STARTER", "FREEZE");

    expect(entitlementRepository.updateSubscription).not.toHaveBeenCalled();
    expect(invalidateCache).not.toHaveBeenCalled();
    expect(captureMessage).toHaveBeenCalled();
  });
});

// ======================================================================
// 6. isInGracePeriod
// ======================================================================

describe("isInGracePeriod", () => {
  beforeEach(() => {
    store.subscription = { plan: "PRO", status: "ACTIVE", currentPeriodEnd: null };
  });

  it("returns true when currentPeriodEnd is within the next 7 days", async () => {
    store.subscription = {
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 3 * DAY_MS),
    };
    expect(await downgradeService.isInGracePeriod("org-1")).toBe(true);
  });

  it("returns true at exactly 7 days remaining", async () => {
    store.subscription = {
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 7 * DAY_MS),
    };
    expect(await downgradeService.isInGracePeriod("org-1")).toBe(true);
  });

  it("returns false when currentPeriodEnd is more than 7 days away", async () => {
    store.subscription = {
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 10 * DAY_MS),
    };
    expect(await downgradeService.isInGracePeriod("org-1")).toBe(false);
  });

  it("returns false when currentPeriodEnd is null", async () => {
    store.subscription = { plan: "PRO", status: "ACTIVE", currentPeriodEnd: null };
    expect(await downgradeService.isInGracePeriod("org-1")).toBe(false);
  });

  it("returns false when no subscription exists", async () => {
    (entitlementRepository.getActiveSubscription as any).mockResolvedValue(null);
    expect(await downgradeService.isInGracePeriod("org-1")).toBe(false);
  });

  it("returns false when currentPeriodEnd is in the past", async () => {
    store.subscription = {
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() - 1 * DAY_MS),
    };
    expect(await downgradeService.isInGracePeriod("org-1")).toBe(false);
  });
});
