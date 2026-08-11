// ==========================================
// Feature Gate Service - Central Entitlement Engine
// ==========================================

import type {
  EntitlementOverride,
  Feature,
  FeatureType,
  Plan,
  SubscriptionStatus,
  UsageTracking,
} from "@prisma/client";
import { entitlementsCache } from "./cache";
import { getExperimentConfig, isInExperiment } from "./experiments";
import type { PlanFeatureWithFeature } from "./repository";
import { entitlementRepository } from "./repository";
import type {
  ConsumeResult,
  DebugTrace,
  EntitlementMap,
  ExperimentConfig,
  FeatureKey,
  ResolutionSource,
} from "./types";

// ==========================================
// Feature Gate Service Class
// ==========================================

export class FeatureGateService {
  private invalidationTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private debouncedInvalidate(orgId: string): void {
    const existing = this.invalidationTimers.get(orgId);
    if (existing) clearTimeout(existing);
    this.invalidationTimers.set(
      orgId,
      setTimeout(() => {
        this.invalidateCache(orgId);
        this.invalidationTimers.delete(orgId);
      }, 500),
    );
  }

  /**
   * Check if a feature is enabled for an organization
   * Resolution order: user_override → org_override → plan → fallback
   */
  async hasFeature(orgId: string, featureKey: string, userId?: string): Promise<boolean> {
    const resolved = await this.resolveFeature(orgId, featureKey, userId);
    // LIMIT features are available regardless of limit value
    // (0 = exhausted but feature exists, null = unlimited)
    if (resolved.featureType === "LIMIT") return true;
    return Boolean(resolved.value);
  }

  /**
   * Get the numeric limit for a limit-type feature
   * Returns null for unlimited (Enterprise)
   */
  async getLimit(orgId: string, limitKey: string, userId?: string): Promise<number | null> {
    const resolved = await this.resolveFeature(orgId, limitKey, userId);
    if (resolved.featureType !== "LIMIT") return null;
    return typeof resolved.value === "number" ? resolved.value : null;
  }

  /**
   * Assert that a feature is available, throws 403 if not
   */
  async assertFeature(orgId: string, featureKey: string, userId?: string): Promise<void> {
    const hasAccess = await this.hasFeature(orgId, featureKey, userId);
    if (!hasAccess) {
      const trace = await this.getDebugTrace(orgId, featureKey, userId);
      throw new FeatureNotAvailableError(featureKey, trace.planKey ?? "FREE");
    }
  }

  /**
   * Check if consumption is allowed (for quota-based features)
   */
  async canConsume(
    orgId: string,
    featureKey: string,
    amount: number = 1,
    userId?: string,
  ): Promise<boolean> {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    // First check if feature is enabled
    const hasAccess = await this.hasFeature(orgId, featureKey, userId);
    if (!hasAccess) return false;

    // Get the limit
    const limit = await this.getLimit(orgId, featureKey, userId);

    // null limit means unlimited
    if (limit === null) return true;

    // Get current usage
    const usage = await entitlementRepository.getUsage(orgId, featureKey);
    const currentUsage = usage?.usageCount ?? 0;

    return currentUsage + amount <= limit;
  }

  /**
   * Consume usage quota (atomic operation)
   */
  async consume(
    orgId: string,
    featureKey: string,
    amount: number = 1,
    userId?: string,
  ): Promise<ConsumeResult> {
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        error: "INVALID_AMOUNT",
        featureKey,
        limit: null,
        used: 0,
        resetAt: null,
      };
    }
    // First check if feature is enabled
    const hasAccess = await this.hasFeature(orgId, featureKey, userId);
    if (!hasAccess) {
      const trace = await this.getDebugTrace(orgId, featureKey, userId);
      return {
        success: false,
        error: "FEATURE_NOT_AVAILABLE",
        featureKey,
        limit: null,
        used: 0,
        resetAt: null,
      };
    }

    // Get the limit
    const limit = await this.getLimit(orgId, featureKey, userId);

    // Perform atomic consume
    const result = await entitlementRepository.consumeUsage(orgId, featureKey, amount, limit);

    // Invalidate cache after consumption (debounced)
    if (result.success) {
      this.debouncedInvalidate(orgId);
    }

    return result;
  }

  /**
   * Get all entitlements for an organization (full map)
   */
  async getAllEntitlements(orgId: string, userId?: string): Promise<EntitlementMap> {
    // Check cache first
    const cached = await entitlementsCache.get(orgId);
    if (cached) {
      return cached;
    }

    // Get subscription
    const subscription = await entitlementRepository.getActiveSubscription(orgId);
    const plan = subscription?.plan ?? "FREE";
    const status = subscription?.status ?? "ACTIVE";

    // Get all features
    const features = await entitlementRepository.getAllPlanFeatures();

    // Get overrides
    const overrides = await entitlementRepository.getAllOverrides(orgId, userId);

    // Get usage
    const usageRecords = await entitlementRepository.getAllUsage(orgId);

    // Build maps
    const featuresMap: Record<string, boolean> = {};
    const limitsMap: Record<string, number | null> = {};
    const usageMap: Record<string, number> = {};
    const resetAtMap: Record<string, Date | null> = {};

    // Get all feature keys from plan_features
    const featureKeys = new Set(features.map((f) => f.feature.key));

    for (const featureKey of featureKeys) {
      // Resolve each feature using priority system
      const resolved = await this.resolveFeatureWithOverrides(
        orgId,
        featureKey,
        userId,
        overrides,
        plan,
        features,
      );

      featuresMap[featureKey] = resolved.value as boolean;
      limitsMap[featureKey] =
        resolved.featureType === "LIMIT" ? (resolved.value as number | null) : null;

      // Get usage for this feature
      const usage = usageRecords.find((u) => u.featureKey === featureKey);
      usageMap[featureKey] = usage?.usageCount ?? 0;
      resetAtMap[featureKey] = usage?.periodEnd ?? null;
    }

    const entitlementMap: EntitlementMap = {
      plan,
      status,
      features: featuresMap,
      limits: limitsMap,
      usage: usageMap,
      resetAt: resetAtMap,
    };

    // Cache the result
    await entitlementsCache.set(orgId, entitlementMap);

    return entitlementMap;
  }

  /**
   * Get debug trace for a feature (for troubleshooting)
   */
  async getDebugTrace(orgId: string, featureKey: string, userId?: string): Promise<DebugTrace> {
    const resolved = await this.resolveFeature(orgId, featureKey, userId);

    return {
      featureKey,
      resolvedVia: resolved.resolvedVia,
      value: resolved.value,
      overrideId: resolved.overrideId,
      expiresAt: resolved.expiresAt,
      planKey: resolved.planKey,
      experimentConfig: resolved.experimentConfig,
    };
  }

  /**
   * Invalidate cache for an organization
   */
  async invalidateCache(orgId: string): Promise<void> {
    await entitlementsCache.invalidate(orgId);
  }

  // ==========================================
  // Private Resolution Methods
  // ==========================================

  /**
   * Internal feature resolution with full context
   */
  private async resolveFeature(
    orgId: string,
    featureKey: string,
    userId?: string,
  ): Promise<{
    value: boolean | number | null;
    resolvedVia: ResolutionSource;
    overrideId?: string;
    expiresAt?: Date | null;
    planKey?: Plan | null;
    featureType?: FeatureType;
    experimentConfig?: ExperimentConfig | null;
  }> {
    // Get overrides if not provided
    const overrides = await entitlementRepository.getAllOverrides(orgId, userId);

    // Get subscription for plan
    const subscription = await entitlementRepository.getActiveSubscription(orgId);
    const plan = subscription?.plan ?? "FREE";

    return this.resolveFeatureWithOverrides(orgId, featureKey, userId, overrides, plan);
  }

  /**
   * Resolve feature with pre-fetched overrides
   */
  private async resolveFeatureWithOverrides(
    orgId: string,
    featureKey: string,
    userId: string | undefined,
    overrides: EntitlementOverride[] | undefined,
    plan: Plan | undefined,
    preloadedFeatures?: PlanFeatureWithFeature[],
  ): Promise<{
    value: boolean | number | null;
    resolvedVia: ResolutionSource;
    overrideId?: string;
    expiresAt?: Date | null;
    planKey?: Plan | null;
    featureType?: FeatureType;
    experimentConfig?: ExperimentConfig | null;
  }> {
    // 1. Check user override (highest priority)
    if (userId) {
      const userOverride = overrides?.find(
        (o) => o.scope === "USER" && o.scopeId === userId && o.featureKey === featureKey,
      );

      if (userOverride && this.isOverrideValid(userOverride)) {
        const isLimit = userOverride.limitValue != null;
        const overrideValue = isLimit
          ? userOverride.limitValue === -1
            ? null
            : userOverride.limitValue
          : userOverride.enabled;
        return {
          value: overrideValue,
          resolvedVia: "user_override",
          overrideId: userOverride.id,
          expiresAt: userOverride.expiresAt,
          featureType: isLimit ? "LIMIT" : undefined,
        };
      }
    }

    // 2. Check org override
    const orgOverride = overrides?.find(
      (o) => o.scope === "ORG" && o.scopeId === orgId && o.featureKey === featureKey,
    );

    if (orgOverride && this.isOverrideValid(orgOverride)) {
      const isLimit = orgOverride.limitValue != null;
      const overrideValue = isLimit
        ? orgOverride.limitValue === -1
          ? null
          : orgOverride.limitValue
        : orgOverride.enabled;
      return {
        value: overrideValue,
        resolvedVia: "org_override",
        overrideId: orgOverride.id,
        expiresAt: orgOverride.expiresAt,
        featureType: isLimit ? "LIMIT" : undefined,
      };
    }

    // 3. Check plan features
    const planFeatures =
      preloadedFeatures ?? (await entitlementRepository.getPlanFeatures(plan ?? "FREE"));
    const planFeature = planFeatures.find((pf) => pf.feature.key === featureKey);

    if (planFeature && planFeature.enabled) {
      // Handle experiments differently
      if (planFeature.feature.type === "EXPERIMENT" && planFeature.configJson) {
        // If no userId, return based on config percentage (org-level)
        const experimentConfig = planFeature.configJson as unknown as ExperimentConfig;

        // For limit type, return the limit value
        if (planFeature.limitValue !== null) {
          return {
            value: planFeature.limitValue === -1 ? null : planFeature.limitValue,
            resolvedVia: "plan",
            planKey: plan ?? "FREE",
            featureType: planFeature.feature.type,
            experimentConfig,
          };
        }

        // For boolean experiments, we need userId for bucketing
        return {
          value: true, // Default to enabled, actual bucketing done separately
          resolvedVia: "plan",
          planKey: plan ?? "FREE",
          featureType: planFeature.feature.type,
          experimentConfig,
        };
      }

      // Regular boolean or limit feature
      if (planFeature.feature.type === "LIMIT") {
        return {
          value: planFeature.limitValue === -1 ? null : planFeature.limitValue,
          resolvedVia: "plan",
          planKey: plan ?? "FREE",
          featureType: planFeature.feature.type,
        };
      }

      return {
        value: planFeature.enabled,
        resolvedVia: "plan",
        planKey: plan ?? "FREE",
        featureType: planFeature.feature.type,
      };
    }

    // 4. Fallback - feature disabled, limit = 0
    return {
      value: false,
      resolvedVia: "fallback",
    };
  }

  /**
   * Check if an override is still valid (not expired)
   */
  private isOverrideValid(override: EntitlementOverride): boolean {
    if (!override.expiresAt) return true;
    return new Date(override.expiresAt) > new Date();
  }
}

// ==========================================
// Error Classes
// ==========================================

export class FeatureNotAvailableError extends Error {
  constructor(
    public featureKey: string,
    public currentPlan: Plan,
  ) {
    super(`Feature ${featureKey} is not available on plan ${currentPlan}`);
    this.name = "FeatureNotAvailableError";
  }
}

export class LimitReachedError extends Error {
  constructor(
    public featureKey: string,
    public limit: number,
    public used: number,
    public resetAt: Date | null,
  ) {
    super(`Limit reached for ${featureKey}: ${used}/${limit}`);
    this.name = "LimitReachedError";
  }
}

export class SubscriptionExpiredError extends Error {
  constructor() {
    super("Subscription has expired");
    this.name = "SubscriptionExpiredError";
  }
}

// ==========================================
// Singleton Instance
// ==========================================

export const featureGateService = new FeatureGateService();

// ==========================================
// Convenience Functions
// ==========================================

export async function hasFeature(
  orgId: string,
  featureKey: string,
  userId?: string,
): Promise<boolean> {
  return featureGateService.hasFeature(orgId, featureKey, userId);
}

export async function getLimit(
  orgId: string,
  limitKey: string,
  userId?: string,
): Promise<number | null> {
  return featureGateService.getLimit(orgId, limitKey, userId);
}

export async function assertFeature(
  orgId: string,
  featureKey: string,
  userId?: string,
): Promise<void> {
  return featureGateService.assertFeature(orgId, featureKey, userId);
}

export async function canConsume(
  orgId: string,
  featureKey: string,
  amount?: number,
  userId?: string,
): Promise<boolean> {
  return featureGateService.canConsume(orgId, featureKey, amount, userId);
}

export async function consume(
  orgId: string,
  featureKey: string,
  amount?: number,
  userId?: string,
): Promise<ConsumeResult> {
  return featureGateService.consume(orgId, featureKey, amount, userId);
}

export async function getAllEntitlements(orgId: string, userId?: string): Promise<EntitlementMap> {
  return featureGateService.getAllEntitlements(orgId, userId);
}

export async function getDebugTrace(
  orgId: string,
  featureKey: string,
  userId?: string,
): Promise<DebugTrace> {
  return featureGateService.getDebugTrace(orgId, featureKey, userId);
}

export async function invalidateCache(orgId: string): Promise<void> {
  return featureGateService.invalidateCache(orgId);
}
