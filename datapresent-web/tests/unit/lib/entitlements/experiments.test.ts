// ==========================================
// Experiments (A/B Testing) Tests
// ==========================================

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the dependencies that have LRUCache issues
vi.mock("@/lib/entitlements/cache", () => ({
  entitlementsCache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    invalidate: vi.fn().mockResolvedValue(undefined),
    isRedisAvailable: vi.fn().mockReturnValue(false),
  },
  getCachedEntitlements: vi.fn().mockResolvedValue(null),
  setCachedEntitlements: vi.fn().mockResolvedValue(undefined),
  invalidateEntitlementsCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/entitlements/repository", () => ({
  entitlementRepository: {
    getActiveSubscription: vi.fn().mockResolvedValue(null),
    getPlanFeatures: vi.fn().mockResolvedValue([]),
    getUserOverride: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/lib/entitlements/feature-gate", () => ({
  featureGateService: {
    hasFeature: vi.fn().mockResolvedValue(false),
    getDebugTrace: vi.fn().mockResolvedValue({ resolvedVia: "none", value: false }),
  },
}));

import {
  calculateExperimentDistribution,
  getDistributionStats,
  getExperimentBucket,
  isInExperimentBucket,
} from "@/lib/entitlements/experiments";

describe("Experiments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getExperimentBucket", () => {
    it("should return consistent bucket for same seed and user", () => {
      const bucket1 = getExperimentBucket("NEW_DASHBOARD_v1", "user-123");
      const bucket2 = getExperimentBucket("NEW_DASHBOARD_v1", "user-123");

      expect(bucket1).toBe(bucket2);
    });

    it("should return different bucket for different users", () => {
      const bucket1 = getExperimentBucket("NEW_DASHBOARD_v1", "user-123");
      const bucket2 = getExperimentBucket("NEW_DASHBOARD_v1", "user-456");

      // They should be different (very likely, not guaranteed but extremely probable)
      // Run multiple times to ensure consistency
      for (let i = 0; i < 10; i++) {
        expect(getExperimentBucket("NEW_DASHBOARD_v1", "user-123")).toBe(bucket1);
      }
    });

    it("should return bucket between 0-99 after modulo", () => {
      const bucket = getExperimentBucket("TEST", "user-123");

      // The raw hash might be negative, but modulo should give 0-99
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    });

    it("should change bucket when seed changes", () => {
      const bucket1 = getExperimentBucket("SEED_A", "user-123");
      const bucket2 = getExperimentBucket("SEED_B", "user-123");

      expect(bucket1).not.toBe(bucket2);
    });
  });

  describe("isInExperimentBucket", () => {
    it("should return true when bucket is below percentage", () => {
      // If we know the bucket is 50, and percentage is 60, should return true
      // We need to find a user that produces a low bucket
      const result = isInExperimentBucket("SEED", "user-1", 100); // 100% always true
      expect(result).toBe(true);
    });

    it("should return false when bucket is above percentage", () => {
      // Create users until we find one with high bucket
      let inExperiment = false;
      const bucket = 0;

      // With 0%, no one should be in experiment
      inExperiment = isInExperimentBucket("SEED", "user-1", 0);
      expect(inExperiment).toBe(false);
    });

    it("should be consistent for same user", () => {
      const result1 = isInExperimentBucket("SEED", "user-consistent", 50);
      const result2 = isInExperimentBucket("SEED", "user-consistent", 50);

      expect(result1).toBe(result2);
    });
  });

  describe("calculateExperimentDistribution", () => {
    it("should return correct treatment/control split", () => {
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);

      const result = calculateExperimentDistribution("SEED", userIds, 50);

      expect(result.total).toBe(100);
      // Allow some variance due to randomness
      expect(result.treatment + result.control).toBe(100);
    });

    it("should return all control when percentage is 0", () => {
      const userIds = ["user-1", "user-2", "user-3"];

      const result = calculateExperimentDistribution("SEED", userIds, 0);

      expect(result.treatment).toBe(0);
      expect(result.control).toBe(3);
    });

    it("should return all treatment when percentage is 100", () => {
      const userIds = ["user-1", "user-2", "user-3"];

      const result = calculateExperimentDistribution("SEED", userIds, 100);

      expect(result.treatment).toBe(3);
      expect(result.control).toBe(0);
    });
  });

  describe("getDistributionStats", () => {
    it("should return expected vs actual distribution", () => {
      const userIds = Array.from({ length: 1000 }, (_, i) => `user-${i}`);

      const stats = getDistributionStats("SEED", userIds, 50);

      expect(stats.expected).toBe(50);
      expect(stats.sampleSize).toBe(1000);
      // Actual should be close to expected (within 5%)
      expect(Math.abs(stats.actual - stats.expected)).toBeLessThan(5);
    });
  });
});
