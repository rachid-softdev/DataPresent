// ==========================================
// Entitlements — Consumption Regression Tests
// ==========================================
//
// Tests the atomic consumption semantics of:
//   - PrismaEntitlementRepository.consumeUsage(orgId, featureKey, amount, limit)
//   - FeatureGateService.canConsume / consume / getLimit (the -1 -> null normalization)
//
// The `@/lib/prisma` module is mocked with an in-memory fake `UsageTracking`
// table that replicates the SQL semantics of the real query:
//
//   INSERT INTO "UsageTracking" (...) VALUES (...)
//   ON CONFLICT ("orgId", "featureKey", "periodEnd")
//   DO UPDATE SET "usageCount" = "UsageTracking"."usageCount" + ${amount}, ...
//     WHERE "UsageTracking"."usageCount" + ${amount} <= ${limit}
//   RETURNING "usageCount"
//
// i.e. on INSERT (no existing row) the full amount is stored; on CONFLICT (row
// exists) usageCount is incremented ONLY IF usageCount + amount <= limit. When
// the WHERE clause blocks the UPDATE, no row is returned -> LIMIT_REACHED.
//
// NO real database is used. The repo under test is the REAL implementation;
// only the prisma client is replaced by the in-memory fake.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UsageTracking } from "@prisma/client";

// ---------------------------------------------------------------------------
// In-memory fake UsageTracking table
// ---------------------------------------------------------------------------

interface UsageRow {
  orgId: string;
  featureKey: string;
  usageCount: number;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

const store = {
  rows: new Map<string, UsageRow>(),

  reset(): void {
    this.rows.clear();
  },

  privateKey(orgId: string, featureKey: string, periodEndMs: number): string {
    return `${orgId}|${featureKey}|${periodEndMs}`;
  },

  /**
   * Mirror of repository.getUsage: find the active usage row for
   * (orgId, featureKey) whose periodEnd is still in the future.
   */
  findFirst(where: {
    orgId: string;
    featureKey: string;
    periodEnd: { gt: Date };
  }): UsageRow | undefined {
    for (const row of this.rows.values()) {
      if (
        row.orgId === where.orgId &&
        row.featureKey === where.featureKey &&
        row.periodEnd > where.periodEnd.gt
      ) {
        return row;
      }
    }
    return undefined;
  },

  /**
   * Mirror of the atomic INSERT ... ON CONFLICT DO UPDATE statement.
   * Returns [{ usageCount }] on success or [] when the WHERE clause blocks.
   */
  rawConsume(
    orgId: string,
    featureKey: string,
    amount: number,
    limit: number | null,
    periodStart: Date,
    periodEnd: Date,
  ): Array<{ usageCount: number }> {
    const key = this.privateKey(orgId, featureKey, periodEnd.getTime());
    const existing = this.rows.get(key);

    // No existing row -> INSERT (succeeds with the full amount).
    if (!existing) {
      const row: UsageRow = {
        orgId,
        featureKey,
        usageCount: amount,
        periodStart,
        periodEnd,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.rows.set(key, row);
      return [{ usageCount: amount }];
    }

    // Existing row -> DO UPDATE, WHERE clause enforces the limit.
    if (limit !== null && existing.usageCount + amount > limit) {
      return []; // blocked by WHERE -> no row returned
    }

    existing.usageCount += amount;
    existing.updatedAt = new Date();
    return [{ usageCount: existing.usageCount }];
  },
};

// ---------------------------------------------------------------------------
// Mock factory functions (hoisted so they can be referenced in vi.mock)
// ---------------------------------------------------------------------------

const mockFindFirst = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn());
const mockSubscriptionFindUnique = vi.hoisted(() => vi.fn());
const mockOverrideFindMany = vi.hoisted(() => vi.fn());
const mockPlanFeatureFindMany = vi.hoisted(() => vi.fn());

// Mock the prisma client with the in-memory fake for all relevant tables.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findUnique: mockSubscriptionFindUnique },
    entitlementOverride: { findMany: mockOverrideFindMany },
    planFeature: { findMany: mockPlanFeatureFindMany },
    usageTracking: { findFirst: mockFindFirst },
    $queryRaw: mockQueryRaw,
  },
}));

// Mock @prisma/client so Prisma.sql / Prisma.empty (used to build the SQL
// template) behave predictably; we inspect the produced values to recover the
// limit that the real query would enforce.
vi.mock("@prisma/client", () => ({
  Prisma: {
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
    empty: vi.fn(),
  },
}));

// Mock the cache so the consume() debounce path is a deterministic no-op.
vi.mock("@/lib/entitlements/cache", () => ({
  entitlementsCache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    invalidate: vi.fn().mockResolvedValue(undefined),
    isRedisAvailable: vi.fn().mockReturnValue(false),
  },
}));

// Imports must happen after the mocks are declared.
import { PrismaEntitlementRepository } from "@/lib/entitlements/repository";
import { FeatureGateService } from "@/lib/entitlements/feature-gate";

const repo = new PrismaEntitlementRepository();
const service = new FeatureGateService();

const ORG_ID = "org-consumption-tests";
const FEATURE_KEY = "exportsPerMonth";

// Find the (single) row for an org/feature in the in-memory store.
function getUsageRow(orgId: string, featureKey: string): UsageRow | undefined {
  for (const row of store.rows.values()) {
    if (row.orgId === orgId && row.featureKey === featureKey) return row;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Shared mock wiring
// ---------------------------------------------------------------------------

beforeEach(() => {
  store.reset();
  vi.clearAllMocks();

  // The $queryRaw mock reproduces the SQL semantics using the fake table.
  // The tagged-template call passes interpolated values in this order:
  //   [orgId, featureKey, amount(insert), periodStart, periodEnd, amount(update), limitCondition]
  // limitCondition is `Prisma.empty` (undefined) when limit is null, or a
  // Prisma.sql result object { strings, values: [amount, limit] } otherwise.
  mockQueryRaw.mockImplementation(async (_strings: TemplateStringsArray, ...values: unknown[]) => {
    const orgId = values[0] as string;
    const featureKey = values[1] as string;
    const amount = values[2] as number;
    const periodStart = values[3] as Date;
    const periodEnd = values[4] as Date;
    const limitCondition = values[6];

    let limit: number | null = null;
    if (limitCondition && typeof limitCondition === "object" && "values" in limitCondition) {
      limit = (limitCondition as { values: unknown[] }).values[1] as number;
    }

    return store.rawConsume(orgId, featureKey, amount, limit, periodStart, periodEnd);
  });

  // getUsage -> read from the fake table. repository.getUsage passes a single
  // object argument: { where: { orgId, featureKey, periodEnd: { gt } }, orderBy }.
  mockFindFirst.mockImplementation(async (args: unknown) =>
    store.findFirst((args as { where: Parameters<typeof store.findFirst>[0] }).where),
  );

  // Sane defaults for the feature-gate resolve path (overridden per-test).
  mockSubscriptionFindUnique.mockResolvedValue(null);
  mockOverrideFindMany.mockResolvedValue([]);
  mockPlanFeatureFindMany.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// 1. Limit enforcement
// ---------------------------------------------------------------------------

describe("1. limit enforcement (limit = 10)", () => {
  it("rejects when a consumption would exceed the limit and allows up to the limit", async () => {
    // First consume: 5 of 10.
    const r1 = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 5, 10);
    expect(r1.success).toBe(true);
    if (r1.success) {
      expect(r1.newUsage).toBe(5);
      expect(r1.previousUsage).toBe(0);
      expect(r1.remaining).toBe(5);
      expect(r1.limit).toBe(10);
    }

    // 5 + 6 = 11 > 10 -> blocked.
    const r2 = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 6, 10);
    expect(r2.success).toBe(false);
    if (!r2.success) {
      expect(r2.error).toBe("LIMIT_REACHED");
      expect(r2.used).toBe(5);
      expect(r2.limit).toBe(10);
    }

    // Usage is still 5; 5 + 5 = 10 <= 10 -> allowed (hits the limit exactly).
    const r3 = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 5, 10);
    expect(r3.success).toBe(true);
    if (r3.success) {
      expect(r3.newUsage).toBe(10);
      expect(r3.previousUsage).toBe(5);
      expect(r3.remaining).toBe(0);
    }

    // 10 + 1 = 11 > 10 -> blocked.
    const r4 = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 1, 10);
    expect(r4.success).toBe(false);
    if (!r4.success) {
      expect(r4.error).toBe("LIMIT_REACHED");
      expect(r4.used).toBe(10);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Unlimited (limit === null) is never blocked
// ---------------------------------------------------------------------------

describe("2. unlimited (limit === null)", () => {
  it("always succeeds regardless of amount", async () => {
    const r = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 1000, null);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.newUsage).toBe(1000);
      expect(r.limit).toBeNull();
      expect(r.remaining).toBeNull();
    }
  });

  it("never blocks a second large consumption", async () => {
    await repo.consumeUsage(ORG_ID, FEATURE_KEY, 1000, null);
    const r = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 5000, null);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.newUsage).toBe(6000);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. -1 sentinel normalized to unlimited in feature-gate resolution
// ---------------------------------------------------------------------------

describe("3. -1 sentinel normalized to unlimited", () => {
  const LIMIT_FEATURE = "reportsPerMonth";

  beforeEach(() => {
    // Plan feature whose limitValue is -1 (sentinel for unlimited).
    mockSubscriptionFindUnique.mockResolvedValue({
      plan: "ENTERPRISE",
      status: "ACTIVE",
    });
    mockOverrideFindMany.mockResolvedValue([]);
    mockPlanFeatureFindMany.mockResolvedValue([
      {
        feature: { key: LIMIT_FEATURE, type: "LIMIT" },
        enabled: true,
        limitValue: -1,
      },
    ]);
  });

  it("getLimit returns null for a plan feature with limitValue === -1", async () => {
    const limit = await service.getLimit(ORG_ID, LIMIT_FEATURE);
    expect(limit).toBeNull();
  });

  it("canConsume returns true (unlimited) for a -1 plan feature", async () => {
    const can = await service.canConsume(ORG_ID, LIMIT_FEATURE, 1000);
    expect(can).toBe(true);
  });

  it("consume succeeds end-to-end through the unlimited path", async () => {
    const result = await service.consume(ORG_ID, LIMIT_FEATURE, 1000);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.limit).toBeNull();
      expect(result.newUsage).toBe(1000);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. periodEnd millisecond precision (must be .999, not .000)
// ---------------------------------------------------------------------------

describe("4. periodEnd millisecond precision", () => {
  it("stores a periodEnd with milliseconds === 999 (last day of month, 23:59:59.999)", async () => {
    await repo.consumeUsage(ORG_ID, FEATURE_KEY, 1, 10);
    const row = getUsageRow(ORG_ID, FEATURE_KEY);
    expect(row).toBeDefined();
    const periodEnd = row!.periodEnd;

    // The bug was using 0 ms, leaving a 1-second gap before the next period.
    expect(periodEnd.getMilliseconds()).toBe(999);

    // Sanity: it is the last day of the month at 23:59:59.
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    expect(periodEnd.getDate()).toBe(lastDay);
    expect(periodEnd.getHours()).toBe(23);
    expect(periodEnd.getMinutes()).toBe(59);
    expect(periodEnd.getSeconds()).toBe(59);
  });
});

// ---------------------------------------------------------------------------
// 5. invalid amount handling
// ---------------------------------------------------------------------------

describe("5. invalid amount handling", () => {
  it("consume returns INVALID_AMOUNT for amount = 0", async () => {
    const r = await service.consume(ORG_ID, FEATURE_KEY, 0);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toBe("INVALID_AMOUNT");
    }
  });

  it("consume returns INVALID_AMOUNT for a negative amount", async () => {
    const r = await service.consume(ORG_ID, FEATURE_KEY, -5);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toBe("INVALID_AMOUNT");
    }
  });

  it("consume returns INVALID_AMOUNT for NaN", async () => {
    const r = await service.consume(ORG_ID, FEATURE_KEY, NaN);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toBe("INVALID_AMOUNT");
    }
  });

  it("canConsume returns false for amount = 0", async () => {
    expect(await service.canConsume(ORG_ID, FEATURE_KEY, 0)).toBe(false);
  });

  it("canConsume returns false for a negative amount", async () => {
    expect(await service.canConsume(ORG_ID, FEATURE_KEY, -5)).toBe(false);
  });

  it("canConsume returns false for NaN", async () => {
    expect(await service.canConsume(ORG_ID, FEATURE_KEY, NaN)).toBe(false);
  });

  it("repository consumeUsage is not invoked for an invalid amount", async () => {
    await service.consume(ORG_ID, FEATURE_KEY, -5);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. edge cases (concurrent-safe semantics, fresh-org over-limit)
// ---------------------------------------------------------------------------

describe("6. edge cases", () => {
  it("first call succeeds, second call blocked when together they exceed the limit (sequential)", async () => {
    const first = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 6, 10);
    expect(first.success).toBe(true);
    if (first.success) expect(first.newUsage).toBe(6);

    const second = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 6, 10);
    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toBe("LIMIT_REACHED");
      expect(second.used).toBe(6);
    }
  });

  it("fresh org with no usage row and amount > limit is rejected immediately (pre-check)", async () => {
    const r = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 11, 10);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toBe("LIMIT_REACHED");
      expect(r.used).toBe(0);
    }
    // The pre-check should short-circuit before attempting the INSERT.
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("two sequential calls respect the WHERE enforcement like the SQL would", async () => {
    // Build up to exactly the limit across multiple small consumes.
    const a = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 4, 10);
    expect(a.success).toBe(true);
    const b = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 4, 10);
    expect(b.success).toBe(true);
    if (b.success) expect(b.newUsage).toBe(8);

    // One more small consume pushes exactly to the limit.
    const c = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 2, 10);
    expect(c.success).toBe(true);
    if (c.success) expect(c.newUsage).toBe(10);

    // Anything beyond the limit is blocked.
    const d = await repo.consumeUsage(ORG_ID, FEATURE_KEY, 1, 10);
    expect(d.success).toBe(false);
  });
});

// Silence unused-import lint for the UsageTracking type used only for typing.
export type { UsageTracking };
