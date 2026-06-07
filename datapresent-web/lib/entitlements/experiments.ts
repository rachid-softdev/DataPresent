// ==========================================
// A/B Testing Experiments - Stable Hashing & Bucketing
// ==========================================

import type { ExperimentConfig } from "./types";
import { entitlementRepository } from "./repository";
import { featureGateService } from "./feature-gate";

// ==========================================
// MurmurHash3 Implementation (for stable bucketing)
// ==========================================

/**
 * MurmurHash3 implementation for 32-bit hash
 * Used for stable user bucketing in experiments
 */
function murmurhash3(key: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  const len = key.length;
  const nblocks = Math.floor(len / 4);

  // Body
  for (let i = 0; i < nblocks; i++) {
    const offset = i * 4;
    let k1 =
      (key.charCodeAt(offset) & 0xff) |
      ((key.charCodeAt(offset + 1) & 0xff) << 8) |
      ((key.charCodeAt(offset + 2) & 0xff) << 16) |
      ((key.charCodeAt(offset + 3) & 0xff) << 24);

    k1 = Math.imul(k1, 0xcc9e2d51);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, 0x1b873593);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = (h1 * 5 + 0xe6546b64) | 0;

    let k2 =
      (key.charCodeAt(offset + 1) & 0xff) |
      ((key.charCodeAt(offset + 2) & 0xff) << 8) |
      ((key.charCodeAt(offset + 3) & 0xff) << 16) |
      ((key.charCodeAt(offset + 4) & 0xff) << 24);

    k2 = Math.imul(k2, 0xcc9e2d51);
    k2 = (k2 << 15) | (k2 >>> 17);
    k2 = Math.imul(k2, 0x1b873593);

    h2 ^= k2;
    h2 = (h2 << 13) | (h2 >>> 19);
    h2 = (h2 * 5 + 0xe6546b64) | 0;
  }

  // Tail
  const tail = key.substring(nblocks * 4);
  let k1 = 0;
  let k2 = 0;

  for (let i = tail.length - 1; i >= 0; i--) {
    const char = tail.charCodeAt(i);
    if (i >= tail.length - 1) {
      k1 ^= char << 16;
    }
    if (i >= tail.length - 2) {
      k1 ^= char << 8;
    }
    if (i >= tail.length - 3) {
      k1 ^= char;
    }
    if (i >= tail.length - 3) {
      k2 ^= char << 24;
    }
    if (i >= tail.length - 4) {
      k2 ^= char << 16;
    }
    if (i >= tail.length - 5) {
      k2 ^= char << 8;
    }
    if (i >= tail.length - 6) {
      k2 ^= char;
    }
  }

  if (tail.length >= 3) {
    k1 = Math.imul(k1, 0xcc9e2d51);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, 0x1b873593);
    h1 ^= k1;
  }

  if (tail.length >= 4) {
    k2 = Math.imul(k2, 0xcc9e2d51);
    k2 = (k2 << 15) | (k2 >>> 17);
    k2 = Math.imul(k2, 0x1b873593);
    h2 ^= k2;
  }

  // Finalization
  h1 ^= len;
  h2 ^= len;

  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b);
  h1 = Math.imul(h1 ^ (h1 >>> 13), 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  h2 = Math.imul(h2 ^ (h2 >>> 16), 0x85ebca6b);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35);
  h2 ^= h2 >>> 16;

  // Convert to unsigned 32-bit integer to avoid negative values
  return ((h1 << 16) | (h2 >>> 16)) >>> 0;
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

  // If user has override enabling this experiment, return true
  if (debugTrace.resolvedVia === "user_override" && debugTrace.value === true) {
    return true;
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
  const actualPercentage = (distribution.treatment / distribution.total) * 100;

  return {
    expected: expectedPercentage,
    actual: Math.round(actualPercentage * 10) / 10,
    difference: Math.round((actualPercentage - expectedPercentage) * 10) / 10,
    sampleSize: distribution.total,
  };
}
