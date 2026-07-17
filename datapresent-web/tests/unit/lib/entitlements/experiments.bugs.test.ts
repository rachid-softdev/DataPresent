// ==========================================
// Experiments - Regression Tests (Bug Fixes)
// ==========================================
//
// These tests lock in fixes for historical bugs in the experiments module:
//   1. murmurhash3 was a broken/faux MurmurHash3 (garbled body/tail) producing
//      biased buckets. Now it is a correct, well-distributed 32-bit hash.
//   2. isInExperiment only honored user_override, ignoring org_override — so an
//      org-level rollout on/off was bypassed. Now org_override is honored.
//   3. getDistributionStats divided by zero on an empty list -> NaN. Now safe.
//
// NOTE: `murmurhash3` is a private (non-exported) function. Its correctness is
// validated transitively through the public `getExperimentBucket` /
// `isInExperimentBucket` wrappers, which call it directly.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DebugTrace, ResolutionSource } from "@/lib/entitlements/types";

// Mock the repository so experiments.ts never touches prisma.
vi.mock("@/lib/entitlements/repository", () => ({
  entitlementRepository: {
    getActiveSubscription: vi.fn(),
    getPlanFeatures: vi.fn(),
    getUserOverride: vi.fn(),
  },
}));

// Mock feature-gate so experiments.ts never loads cache/prisma (and to control
// getDebugTrace / hasFeature behavior for the override regression tests).
vi.mock("@/lib/entitlements/feature-gate", () => ({
  featureGateService: {
    getDebugTrace: vi.fn(),
    hasFeature: vi.fn(),
  },
}));

import {
  calculateExperimentDistribution,
  getDistributionStats,
  getExperimentBucket,
  getExperimentConfig,
  isInExperiment,
  isInExperimentBucket,
} from "@/lib/entitlements/experiments";
import { featureGateService } from "@/lib/entitlements/feature-gate";
import { entitlementRepository } from "@/lib/entitlements/repository";

const mockedFeatureGate = vi.mocked(featureGateService);
const mockedRepo = vi.mocked(entitlementRepository);

// Helper to build a DebugTrace with a given resolution source and value.
function trace(resolvedVia: ResolutionSource, value: boolean | number | null): DebugTrace {
  return { featureKey: "EXP_KEY", resolvedVia, value };
}

// An experiment plan feature used by getExperimentConfig for the "no override" path.
const EXPERIMENT_PLAN_FEATURE = [
  {
    feature: { key: "EXP_KEY", type: "EXPERIMENT" as const },
    configJson: { percentage: 50, seed: "EXP_SEED" },
    enabled: true,
  },
];

// A userId that bucketing (percentage 50, seed EXP_SEED) would place in treatment.
function findTreatmentUser(percentage = 50, seed = "EXP_SEED"): string {
  for (let i = 0; i < 5000; i++) {
    const u = `user-${i}`;
    if (isInExperimentBucket(seed, u, percentage)) return u;
  }
  throw new Error("Could not find a treatment user in 5000 samples");
}

// A userId that bucketing (percentage 50, seed EXP_SEED) would place in control.
function findControlUser(percentage = 50, seed = "EXP_SEED"): string {
  for (let i = 0; i < 5000; i++) {
    const u = `user-${i}`;
    if (!isInExperimentBucket(seed, u, percentage)) return u;
  }
  throw new Error("Could not find a control user in 5000 samples");
}

describe("experiments.bugs - murmurhash3 is a correct, well-distributed hash", () => {
  // 1a. Determinism. The private murmurhash3 is deterministic; verified via the
  // public getExperimentBucket wrapper (which calls murmurhash3 directly).
  it("murmurhash3 produces deterministic output for identical input", () => {
    const cases = [
      "abc",
      "",
      "hello world",
      "user_123",
      "a-very-long-input-string-with-symbols-!@#$",
    ];
    for (const input of cases) {
      const b1 = getExperimentBucket(input, input);
      const b2 = getExperimentBucket(input, input);
      expect(b1).toBe(b2);
    }
  });

  // 1b. Uniform distribution: ~5000 synthetic users, fixed seed, percentage 50.
  // A correct hash puts ~50% in treatment (bucket 0..49). Within 45%-55%.
  it("murmurhash3 yields ~50% treatment with no gross bias", () => {
    const seed = "NEW_DASHBOARD_v1";
    const n = 5000;
    const userIds = Array.from({ length: n }, (_, i) => `user_${i}`);

    let treatment = 0;
    for (const userId of userIds) {
      if (isInExperimentBucket(seed, userId, 50)) treatment++;
    }

    const ratio = treatment / n;
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);
  });

  // 1c. Seed independence: two different seeds assign treatment to substantially
  // different sets of users (not identical).
  it("murmurhash3 differs across seeds (seed independence)", () => {
    const seedA = "SEED_A_alpha";
    const seedB = "SEED_B_beta_completely_different";
    const n = 5000;
    const userIds = Array.from({ length: n }, (_, i) => `user_${i}`);

    let different = 0;
    for (const userId of userIds) {
      const inA = isInExperimentBucket(seedA, userId, 50);
      const inB = isInExperimentBucket(seedB, userId, 50);
      if (inA !== inB) different++;
    }

    const fractionDifferent = different / n;
    expect(fractionDifferent).toBeGreaterThan(0.3);
  });

  // 1d. No trivial collision: consecutive userIds must not all map to one bucket.
  it("murmurhash3 does not trivially collide consecutive userIds", () => {
    const seed = "COLLISION_SEED";
    const consecutive = ["user_0", "user_1", "user_2", "user_3", "user_4", "user_5"];
    const buckets = consecutive.map((u) => getExperimentBucket(seed, u));

    const allSame = buckets.every((b) => b === buckets[0]);
    expect(allSame).toBe(false);

    // And buckets should be well spread (more than one distinct value).
    const distinct = new Set(buckets);
    expect(distinct.size).toBeGreaterThan(1);
  });
});

describe("experiments.bugs - isInExperiment respects ORG overrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default repository behavior: a paid plan that exposes the experiment.
    mockedRepo.getActiveSubscription.mockResolvedValue({ plan: "PRO" } as never);
    mockedRepo.getPlanFeatures.mockResolvedValue(EXPERIMENT_PLAN_FEATURE as never);
  });

  it("org_override=true forces the user IN (forced enrollment)", async () => {
    mockedFeatureGate.getDebugTrace.mockResolvedValue(trace("org_override", true));

    const result = await isInExperiment("org-1", "EXP_KEY", "user-1");
    expect(result).toBe(true);
  });

  it("org_override=false forces the user OUT, even when bucketing would include them", async () => {
    const treatmentUser = findTreatmentUser();

    // Sanity: without the override this user WOULD be in treatment.
    mockedFeatureGate.getDebugTrace.mockResolvedValue(trace("plan", true));
    mockedFeatureGate.hasFeature.mockResolvedValue(true);
    const wouldBeIn = await isInExperiment("org-1", "EXP_KEY", treatmentUser);
    expect(wouldBeIn).toBe(true);

    // With org_override=false the user is forced out regardless.
    mockedFeatureGate.getDebugTrace.mockResolvedValue(trace("org_override", false));
    const result = await isInExperiment("org-1", "EXP_KEY", treatmentUser);
    expect(result).toBe(false);
  });

  it("user_override=true forces IN and user_override=false forces OUT", async () => {
    mockedFeatureGate.getDebugTrace.mockResolvedValue(trace("user_override", true));
    expect(await isInExperiment("org-1", "EXP_KEY", "user-2")).toBe(true);

    mockedFeatureGate.getDebugTrace.mockResolvedValue(trace("user_override", false));
    expect(await isInExperiment("org-1", "EXP_KEY", "user-2")).toBe(false);
  });

  it("no override (resolvedVia plan) with hasFeature=true follows bucketing", async () => {
    const treatmentUser = findTreatmentUser();
    const controlUser = findControlUser();

    mockedFeatureGate.getDebugTrace.mockResolvedValue(trace("plan", true));
    mockedFeatureGate.hasFeature.mockResolvedValue(true);

    expect(await isInExperiment("org-1", "EXP_KEY", treatmentUser)).toBe(true);
    expect(await isInExperiment("org-1", "EXP_KEY", controlUser)).toBe(false);
  });

  it("no override with hasFeature=false excludes the user despite bucketing", async () => {
    const treatmentUser = findTreatmentUser();

    mockedFeatureGate.getDebugTrace.mockResolvedValue(trace("plan", true));
    mockedFeatureGate.hasFeature.mockResolvedValue(false);

    expect(await isInExperiment("org-1", "EXP_KEY", treatmentUser)).toBe(false);
  });
});

describe("experiments.bugs - getDistributionStats handles empty and non-empty lists", () => {
  it("empty userIds returns finite zeros (no divide-by-zero / NaN)", () => {
    const stats = getDistributionStats("seed", [], 50);
    expect(stats).toEqual({ expected: 50, actual: 0, difference: 0, sampleSize: 0 });
    expect(Number.isNaN(stats.actual)).toBe(false);
    expect(Number.isNaN(stats.difference)).toBe(false);
    expect(Number.isFinite(stats.actual)).toBe(true);
  });

  it("non-empty userIds returns finite numbers and sampleSize === length", () => {
    const userIds = Array.from({ length: 1000 }, (_, i) => `user_${i}`);
    const stats = getDistributionStats("seed", userIds, 50);

    expect(Number.isFinite(stats.actual)).toBe(true);
    expect(Number.isFinite(stats.difference)).toBe(true);
    expect(stats.sampleSize).toBe(userIds.length);
    expect(stats.expected).toBe(50);
  });
});

describe("experiments.bugs - calculateExperimentDistribution accounting", () => {
  it("treatment + control === total for a sample", () => {
    const userIds = Array.from({ length: 500 }, (_, i) => `user_${i}`);
    const dist = calculateExperimentDistribution("seed", userIds, 50);

    expect(dist.treatment + dist.control).toBe(dist.total);
    expect(dist.total).toBe(userIds.length);
    // With a correct hash, treatment should be in a sensible range for 50%.
    expect(dist.treatment).toBeGreaterThan(150);
    expect(dist.treatment).toBeLessThan(350);
  });
});

// Ensure getExperimentConfig surfaces the plan's experiment configuration
// (used by the isInExperiment "no override" path).
describe("experiments.bugs - getExperimentConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRepo.getActiveSubscription.mockResolvedValue({ plan: "PRO" } as never);
    mockedRepo.getPlanFeatures.mockResolvedValue(EXPERIMENT_PLAN_FEATURE as never);
  });

  it("returns the experiment config from the plan", async () => {
    const config = await getExperimentConfig("org-1", "EXP_KEY");
    expect(config).not.toBeNull();
    expect(config).toEqual({ percentage: 50, seed: "EXP_SEED" });
  });

  it("returns null for a non-experiment feature", async () => {
    mockedRepo.getPlanFeatures.mockResolvedValue([
      { feature: { key: "EXP_KEY", type: "BOOLEAN" as const }, configJson: null, enabled: true },
    ] as never);

    const config = await getExperimentConfig("org-1", "EXP_KEY");
    expect(config).toBeNull();
  });
});
