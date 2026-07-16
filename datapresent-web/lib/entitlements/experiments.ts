// ==========================================
// A/B Testing Experiments - Stable Hashing & Bucketing
// ==========================================

import { featureGateService } from "./feature-gate";
import { entitlementRepository } from "./repository";
import type { ExperimentConfig } from "./types";

// ==========================================
// MurmurHash3 Implementation (for stable bucketing)
// ==========================================

/**
 * MurmurHash3 implementation for 32-bit hash
 * Used for stable user bucketing in experiments
 */
function murmurhash3(key: string): number {
  let h = 0;
  const len = key.length;
  const nblocks = Math.floor(len / 4);

  for (let i = 0; i < nblocks; i++) {
    const offset = i * 4;
    let k =
      (key.charCodeAt(offset) & 0xff) |
      ((key.charCodeAt(offset + 1) & 0xff) << 8) |
      ((key.charCodeAt(offset + 2) & 0xff) << 16) |
      ((key.charCodeAt(offset + 3) & 0xff) << 24);
    k = k >>> 0;

    k = Math.imul(k, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);

    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) >>> 0;
  }

  // Tail
  let k1 = 0;
  const tailStart = nblocks * 4;
  const tailLen = len - tailStart;
  if (tailLen >= 3) k1 ^= (key.charCodeAt(tailStart + 2) & 0xff) << 16;
  if (tailLen >= 2) k1 ^= (key.charCodeAt(tailStart + 1) & 0xff) << 8;
  if (tailLen >= 1) k1 ^= key.charCodeAt(tailStart) & 0xff;

  if (tailLen > 0) {
    k1 = Math.imul(k1, 0xcc9e2d51);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, 0x1b873593);
    h ^= k1;
  }

  h ^= len;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  return h >>> 0;
}

// ==========================================
// Bucketing Functions
// ==========================================

/**
 * Get the bucket for a user in an experiment
 * Returns a number between 0-99 based on stable hashing
 */
export function getExperimentBucket(seed: string, userId: string): number {
  const hashInput = `${seed}:${userId}`;
  const hash = murmurhash3(hashInput);
  return hash % 100;
}

/**
 * Check if a user is in an experiment based on percentage
 * Uses stable hashing so same user always gets same bucket
 */
export function isInExperimentBucket(seed: string, userId: string, percentage: number): boolean {
  const bucket = getExperimentBucket(seed, userId);
  return bucket < percentage;
}

// ==========================================
// Experiment Service
// ==========================================

/**
 * Check if a user is in an experiment
 * Returns true if:
 * 1. The feature is an experiment type
 * 2. User is in the percentage bucket
 * 3. Has feature access via plan
 *
 * Note: Also checks for user override which can force enrollment
 */
export async function isInExperiment(
  orgId: string,
  experimentKey: string,
  userId: string,
): Promise<boolean> {
  // First check if user has override forcing the experiment
  const debugTrace = await featureGateService.getDebugTrace(orgId, experimentKey, userId);

  // If an override (user or org) forces enrollment, respect it for both
  // enable and disable so org-level rollout controls are honored.
  if (
    (debugTrace.resolvedVia === "user_override" || debugTrace.resolvedVia === "org_override") &&
    typeof debugTrace.value === "boolean"
  ) {
    return debugTrace.value;
  }

  // Get experiment config from plan
  const config = await getExperimentConfig(orgId, experimentKey);
  if (!config) {
    return false;
  }

  // Check if user has access to the feature at all
  const hasAccess = await featureGateService.hasFeature(orgId, experimentKey, userId);
  if (!hasAccess) {
    return false;
  }

  // Perform bucketing
  return isInExperimentBucket(config.seed, userId, config.percentage);
}

/**
 * Get experiment configuration for a feature
 */
export async function getExperimentConfig(
  orgId: string,
  experimentKey: string,
): Promise<ExperimentConfig | null> {
  // Get from feature plan config
  const subscription = await entitlementRepository.getActiveSubscription(orgId);
  const plan = subscription?.plan ?? "FREE";
  const planFeatures = await entitlementRepository.getPlanFeatures(plan);

  const planFeature = planFeatures.find((pf) => pf.feature.key === experimentKey);

  if (!planFeature || planFeature.feature.type !== "EXPERIMENT") {
    return null;
  }

  if (!planFeature.configJson) {
    // Return default config if none defined
    return { percentage: 50, seed: experimentKey };
  }

  return planFeature.configJson as unknown as ExperimentConfig;
}

/**
 * Get experiment override (for QA/testing)
 * Returns override if exists and is not expired
 */
export async function getExperimentOverride(
  orgId: string,
  experimentKey: string,
  userId: string,
): Promise<{ enabled: boolean; forceGroup?: "treatment" | "control" } | null> {
  const override = await entitlementRepository.getUserOverride(userId, experimentKey);

  if (!override || !override.enabled) {
    return null;
  }

  if (override.expiresAt && new Date(override.expiresAt) < new Date()) {
    return null;
  }

  return {
    enabled: override.enabled,
  };
}

// ==========================================
// Distribution Analysis (for testing/debugging)
// ==========================================

/**
 * Calculate experiment distribution for a set of users
 * Returns breakdown of treatment vs control
 */
export function calculateExperimentDistribution(
  seed: string,
  userIds: string[],
  percentage: number,
): { treatment: number; control: number; total: number } {
  let treatment = 0;
  let control = 0;

  for (const userId of userIds) {
    if (isInExperimentBucket(seed, userId, percentage)) {
      treatment++;
    } else {
      control++;
    }
  }

  return {
    treatment,
    control,
    total: userIds.length,
  };
}

/**
 * Get expected vs actual distribution for validation
 */
export function getDistributionStats(
  seed: string,
  userIds: string[],
  expectedPercentage: number,
): {
  expected: number;
  actual: number;
  difference: number;
  sampleSize: number;
} {
  const distribution = calculateExperimentDistribution(seed, userIds, expectedPercentage);
  if (distribution.total === 0) {
    return { expected: expectedPercentage, actual: 0, difference: 0, sampleSize: 0 };
  }
  const actualPercentage = (distribution.treatment / distribution.total) * 100;

  return {
    expected: expectedPercentage,
    actual: Math.round(actualPercentage * 10) / 10,
    difference: Math.round((actualPercentage - expectedPercentage) * 10) / 10,
    sampleSize: distribution.total,
  };
}
